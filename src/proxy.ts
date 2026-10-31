import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { LOCALE_COOKIE, hasLocale, matchLocale } from "@/i18n/config";

/** Rutas del panel que no requieren sesión. */
const PUBLIC_ADMIN_PATHS = ["/admin/login"];
/** Páginas de cuenta para visitantes sin sesión (con sesión, redirigen a /cuenta). */
const GUEST_ACCOUNT_PAGES = ["entrar", "registro", "recuperar"];
const ACCOUNT_RE = /^\/(es|en|pt)\/cuenta(?:\/([^/]+))?\/?$/;

/**
 * 1. Panel (/admin), cuenta de cliente (/[lang]/cuenta) y /auth: renueva la sesión de
 *    Supabase y protege las páginas que la requieren (el rol se verifica en el servidor).
 * 2. Sitio público: redirige las rutas sin idioma a /es, /en o /pt.
 */
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Enlace de acceso que cayó en la raíz (si Supabase usó la URL del sitio por defecto)
  if (pathname === "/" && searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    if (!url.searchParams.has("next")) url.searchParams.set("next", "/admin");
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/auth") || ACCOUNT_RE.test(pathname)) {
    return handleSessionRoutes(request);
  }

  const first = pathname.split("/")[1];
  if (hasLocale(first)) return;

  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = hasLocale(cookie) ? cookie : matchLocale(request.headers.get("accept-language"));

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

function redirectTo(request: NextRequest, pathname: string, next?: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (next) url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

async function handleSessionRoutes(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet, headers) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Valida el token con Supabase (no confiar solo en la cookie)
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims?.sub;
  const { pathname } = request.nextUrl;

  // Panel
  if (pathname.startsWith("/admin")) {
    const isPublic = PUBLIC_ADMIN_PATHS.includes(pathname);
    if (!isPublic && !signedIn) return redirectTo(request, "/admin/login", pathname);
    if (pathname === "/admin/login" && signedIn) return redirectTo(request, "/admin");
    return response;
  }

  // Cuenta de cliente
  const account = pathname.match(ACCOUNT_RE);
  if (account) {
    const [, locale, sub] = account;
    const guestPage = !!sub && GUEST_ACCOUNT_PAGES.includes(sub);
    if (guestPage && signedIn) return redirectTo(request, `/${locale}/cuenta`);
    if (!guestPage && !signedIn) return redirectTo(request, `/${locale}/cuenta/entrar`, pathname);
  }
  return response;
}

export const config = {
  // Excluye internos de Next, API y archivos con extensión (imágenes, icon.png, etc.)
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
