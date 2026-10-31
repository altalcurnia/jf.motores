import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminTopbar } from "../AdminTopbar";
import { PermissionMatrix } from "./PermissionMatrix";

export const metadata = { title: "Permisos" };

const LOCKED = new Set(["admin", "cliente"]);

export default function PermissionsPage() {
  return (
    <main className="shell">
      <AdminTopbar />
      <h1>Permisos por rol</h1>
      <p className="muted lead">
        Marca qué puede hacer cada rol del equipo. <b>Administrador</b> siempre tiene todo y <b>Cliente</b> nunca entra al
        panel. Solo el propietario puede cambiar esto, y cada cambio queda registrado.
      </p>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <Matrix />
      </Suspense>
    </main>
  );
}

async function Matrix() {
  const session = await getSession();
  if (!session || !session.role.isInternal) {
    return <div className="notice err">No tienes acceso a esta sección.</div>;
  }
  const supabase = await createSupabaseServerClient();
  const [{ data: roles }, { data: permissions }, { data: grants }] = await Promise.all([
    supabase.from("roles").select("id, key, name").order("id"),
    supabase.from("permissions").select("key, description").order("key"),
    supabase.from("role_permissions").select("role_id, permission_key"),
  ]);
  const keyById = new Map((roles ?? []).map((r) => [r.id, r.key]));

  return (
    <>
      {!session.isOwner && <div className="notice">Solo el propietario puede cambiar permisos.</div>}
      <PermissionMatrix
        roles={(roles ?? []).map((r) => ({ key: r.key, name: r.name, locked: LOCKED.has(r.key) }))}
        permissions={(permissions ?? []).map((p) => ({ key: p.key, description: p.description }))}
        granted={(grants ?? []).map((g) => `${keyById.get(g.role_id)}:${g.permission_key}`)}
        canEdit={session.isOwner}
      />
    </>
  );
}
