import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StaffSession = {
  userId: string;
  email: string;
  fullName: string | null;
  role: { key: string; name: string; isInternal: boolean };
  /** Propietario: único que otorga roles y edita permisos. */
  isOwner: boolean;
  permissions: string[];
  /** Formas de entrar de la cuenta: "email", "google"… */
  providers: string[];
};

/**
 * Usuario actual con su rol y permisos (leídos de la base de datos, no del navegador).
 * Devuelve null si no hay sesión.
 */
export async function getSession(): Promise<StaffSession | null> {
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  const appMeta = (claims?.claims?.app_metadata ?? {}) as { providers?: unknown };
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role_id, is_owner, roles ( key, name, is_internal )")
    .eq("id", userId)
    .single();
  if (!profile || !profile.roles) return null;

  const { data: perms } = await supabase
    .from("role_permissions")
    .select("permission_key")
    .eq("role_id", profile.role_id);

  return {
    userId,
    email: profile.email,
    fullName: profile.full_name,
    role: { key: profile.roles.key, name: profile.roles.name, isInternal: profile.roles.is_internal },
    isOwner: profile.is_owner,
    permissions: (perms ?? []).map((p) => p.permission_key).sort(),
    providers: Array.isArray(appMeta.providers) ? appMeta.providers.map(String) : [],
  };
}

export function can(session: StaffSession, permission: string): boolean {
  return session.permissions.includes(permission);
}
