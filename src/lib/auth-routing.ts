import type { SupabaseClient } from "@supabase/supabase-js";
import { LOCALE_COOKIE, hasLocale, matchLocale, type Locale } from "@/i18n/config";
import { safeNextPath } from "./safe-redirect";
import type { Database } from "./supabase/types";

/**
 * A dónde llevar a alguien después de entrar.
 * Regla: el panel (/admin) es solo para personal interno. Un cliente SIEMPRE termina en el sitio
 * público (su cuenta), aunque el enlace pidiera /admin o no dijera nada.
 */
export function resolveDestination(opts: { requested: string | null | undefined; isStaff: boolean; locale: Locale }): string {
  const account = `/${opts.locale}/cuenta`;
  const requested = opts.requested ? safeNextPath(opts.requested, "") : "";
  if (!requested) return opts.isStaff ? "/admin" : account;
  if (requested.startsWith("/admin") && !opts.isStaff) return account;
  return requested;
}

/** Idioma del visitante: el que eligió (cookie), el de una ruta /es|/en|/pt, o el del navegador. */
export function visitorLocale(cookieValue: string | undefined, acceptLanguage: string | null, path?: string | null): Locale {
  const fromPath = path?.match(/^\/(es|en|pt)(\/|$)/)?.[1];
  if (hasLocale(fromPath)) return fromPath;
  if (hasLocale(cookieValue)) return cookieValue;
  return matchLocale(acceptLanguage);
}

export function localeFromRequest(request: { cookies: { get(name: string): { value: string } | undefined }; headers: Headers }, path?: string | null): Locale {
  return visitorLocale(request.cookies.get(LOCALE_COOKIE)?.value, request.headers.get("accept-language"), path);
}

/** País aproximado de la conexión (cabecera que agrega Vercel). Null si no viene o no es válido. */
export function countryFromRequest(request: { headers: Headers }): string | null {
  const code = request.headers.get("x-vercel-ip-country")?.trim().toUpperCase() ?? "";
  return /^[A-Z]{2}$/.test(code) && code !== "XX" ? code : null;
}

/** ¿El usuario tiene un rol interno (Administrador, Editor, Asesor)? Se lee de la base de datos, nunca del navegador. */
export async function isStaffUser(supabase: SupabaseClient<Database>, userId: string): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("roles ( is_internal )").eq("id", userId).maybeSingle();
  return !!data?.roles?.is_internal;
}
