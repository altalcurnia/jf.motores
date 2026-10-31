import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";

/**
 * Destino de los enlaces enviados por correo (entrar, confirmar cuenta, recuperar contraseña):
 * crea la sesión y lleva a la página indicada en "next".
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), "/admin");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  // Volver a la pantalla de entrada correspondiente con aviso de enlace vencido
  const locale = next.match(/^\/(es|en|pt)\//)?.[1];
  const failUrl = locale ? `/${locale}/cuenta/entrar?error=enlace` : "/admin/login?error=enlace";
  return NextResponse.redirect(new URL(failUrl, origin));
}
