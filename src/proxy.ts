import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { LOCALE_COOKIE, hasLocale, matchLocale } from "@/i18n/config";

/** Rutas del panel que no requieren sesión. */
const PUBLIC_ADMIN_PATHS = ["/admin/login"];

/**
 * 1. Panel (/admin) y autenticación (/auth): renueva la sesión de Supabase y
 *    exige sesión iniciada en /admin (el rol se verifica en el servidor).
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

  if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) {
    return handleAuthRoutes(request);
  }

  const first = pathname.split("/")[1];
  if (hasLocale(first)) return;

  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = hasLocale(cookie) ? cookie : matchLocale(request.headers.get("accept-language"));

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

async function handleAuthRoutes(request: NextRequest) {
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
  const isProtected = pathname.startsWith("/admin") && !PUBLIC_ADMIN_PATHS.includes(pathname);
  if (isProtected && !signedIn) {
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login";
    login.search = "";
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  if (pathname === "/admin/login" && signedIn) {
    const home = request.nextUrl.clone();
    home.pathname = "/admin";
    home.search = "";
    return NextResponse.redirect(home);
  }
  return response;
}

export const config = {
  // Excluye internos de Next, API y archivos con extensión (imágenes, icon.png, etc.)
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
