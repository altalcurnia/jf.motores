import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";

const TYPES: EmailOtpType[] = ["email", "signup", "magiclink", "recovery", "invite", "email_change"];

/**
 * Destino de los botones de los correos (confirmar cuenta, enlace de acceso, recuperar contraseña).
 * Usa token_hash: funciona aunque el correo se abra en otro navegador o en el celular.
 * El correo envía: /auth/confirm?token_hash=…&type=…&redirect_to={{ .RedirectTo }}
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = nextFromRedirect(searchParams.get("redirect_to"), origin, type);

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  const locale = next.match(/^\/(es|en|pt)\//)?.[1];
  const failUrl = locale || !next.startsWith("/admin") ? `/${locale ?? "es"}/cuenta/entrar?error=enlace` : "/admin/login?error=enlace";
  return NextResponse.redirect(new URL(failUrl, origin));
}

/** Toma la página final de redirect_to (que apunta a /auth/callback?next=…) sin salir del sitio. */
function nextFromRedirect(redirectTo: string | null, origin: string, type: EmailOtpType | null): string {
  const fallback = type === "recovery" ? "/es/cuenta/nueva-clave" : "/es/cuenta";
  if (!redirectTo) return fallback;
  try {
    const url = new URL(redirectTo, origin);
    if (url.origin !== origin) {
      // Enlace pedido desde otra dirección del mismo sitio (p. ej. jf-motores.vercel.app): usar solo la ruta
      return safeNextPath(url.searchParams.get("next") ?? url.pathname, fallback);
    }
    if (url.pathname === "/auth/callback") return safeNextPath(url.searchParams.get("next"), fallback);
    return safeNextPath(url.pathname + url.search, fallback);
  } catch {
    return fallback;
  }
}
