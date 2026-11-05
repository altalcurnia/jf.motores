import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";
import { isStaffUser, localeFromRequest, resolveDestination } from "@/lib/auth-routing";

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
  const requested = requestedPath(searchParams.get("redirect_to"), origin);
  const locale = localeFromRequest(request, requested);

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error && data.user) {
      const isStaff = await isStaffUser(supabase, data.user.id);
      // Recuperar contraseña siempre termina en la pantalla para crear la nueva
      const wanted = type === "recovery" && !requested?.includes("nueva-clave") && !isStaff ? `/${locale}/cuenta/nueva-clave` : requested;
      return NextResponse.redirect(new URL(resolveDestination({ requested: wanted, isStaff, locale }), origin));
    }
  }

  const failUrl = requested?.startsWith("/admin") ? "/admin/login?error=enlace" : `/${locale}/cuenta/entrar?error=enlace`;
  return NextResponse.redirect(new URL(failUrl, origin));
}

/** Ruta interna pedida en redirect_to (que suele apuntar a /auth/callback?next=…). Null si no hay. */
function requestedPath(redirectTo: string | null, origin: string): string | null {
  if (!redirectTo) return null;
  try {
    const url = new URL(redirectTo, origin);
    const path = url.pathname === "/auth/callback" ? url.searchParams.get("next") : url.pathname === "/" ? null : url.pathname;
    return path ? safeNextPath(path, "") || null : null;
  } catch {
    return null;
  }
}
