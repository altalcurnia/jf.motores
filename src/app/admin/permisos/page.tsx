import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminTopbar } from "../AdminTopbar";
import { OwnerUnlock } from "../OwnerUnlock";
import { PermissionMatrix } from "./PermissionMatrix";
import { RolesManager } from "./RolesManager";

export const metadata = { title: "Roles y permisos" };

const FIXED = new Set(["admin", "cliente"]);

export default function PermissionsPage() {
  return (
    <main className="shell">
      <AdminTopbar />
      <h1>Roles y permisos</h1>
      <p className="muted lead">
        Crea roles para tu equipo y marca qué puede hacer cada uno. <b>Administrador</b> siempre tiene todo y{" "}
        <b>Cliente</b> nunca entra al panel. Solo el propietario hace cambios, confirmando su contraseña, y cada cambio
        queda registrado.
      </p>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  const session = await getSession();
  if (!session || !session.role.isInternal) {
    return <div className="notice err">No tienes acceso a esta sección.</div>;
  }
  const supabase = await createSupabaseServerClient();
  const [{ data: roles }, { data: permissions }, { data: grants }, { data: profiles }, unlock] = await Promise.all([
    supabase.from("roles").select("id, key, name, description, is_internal").order("id"),
    supabase.from("permissions").select("key, description").order("key"),
    supabase.from("role_permissions").select("role_id, permission_key"),
    supabase.from("profiles").select("role_id"),
    session.isOwner ? supabase.rpc("owner_unlock_status") : Promise.resolve({ data: null }),
  ]);
  const keyById = new Map((roles ?? []).map((r) => [r.id, r.key]));
  const usersByRole = new Map<number, number>();
  for (const p of profiles ?? []) usersByRole.set(p.role_id, (usersByRole.get(p.role_id) ?? 0) + 1);
  const unlocked = session.isOwner && !!unlock.data;

  const roleList = (roles ?? []).map((r) => ({
    key: r.key,
    name: r.name,
    description: r.description,
    internal: r.is_internal,
    fixed: FIXED.has(r.key),
    users: usersByRole.get(r.id) ?? 0,
  }));

  return (
    <>
      {session.isOwner ? (
        <OwnerUnlock expiresAt={unlock.data ?? null} />
      ) : (
        <div className="notice">Solo el propietario puede cambiar roles y permisos.</div>
      )}
      <PermissionMatrix
        roles={roleList.filter((r) => r.internal || r.fixed).map((r) => ({ key: r.key, name: r.name, locked: r.fixed }))}
        permissions={(permissions ?? []).map((p) => ({ key: p.key, description: p.description }))}
        granted={(grants ?? []).map((g) => `${keyById.get(g.role_id)}:${g.permission_key}`)}
        canEdit={unlocked}
      />
      <RolesManager roles={roleList} canEdit={unlocked} />
    </>
  );
}
