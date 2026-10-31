import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, hasLocale, matchLocale } from "@/i18n/config";

/**
 * Redirige las rutas sin idioma a /es, /en o /pt.
 * Prioridad: cookie elegida por el visitante → idioma del navegador → español.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];
  if (hasLocale(first)) return;

  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = hasLocale(cookie) ? cookie : matchLocale(request.headers.get("accept-language"));

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Excluye internos de Next, API, panel admin y archivos con extensión (imágenes, icon.png, etc.)
  matcher: ["/((?!_next|api|admin|.*\\..*).*)"],
};
