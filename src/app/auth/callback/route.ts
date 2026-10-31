import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isStaffUser, localeFromRequest, resolveDestination } from "@/lib/auth-routing";

/**
 * Regreso de Google y de enlaces con ?code=: crea la sesión y lleva a cada quien a su lugar
 * (clientes → su cuenta en el sitio; personal interno → lo que pidió o el panel).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const requested = searchParams.get("next");
  const locale = localeFromRequest(request, requested);

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Entró con Google aceptando el texto legal junto al botón (Ley 1581)
      if (searchParams.get("consent") === "1") await supabase.rpc("accept_privacy");
      const isStaff = await isStaffUser(supabase, data.user.id);
      return NextResponse.redirect(new URL(resolveDestination({ requested, isStaff, locale }), origin));
    }
  }

  const failUrl = requested?.startsWith("/admin") ? "/admin/login?error=enlace" : `/${locale}/cuenta/entrar?error=enlace`;
  return NextResponse.redirect(new URL(failUrl, origin));
}
