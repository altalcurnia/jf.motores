import { Suspense } from "react";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminTopbar } from "../AdminTopbar";
import { OwnerUnlock } from "../OwnerUnlock";
import { UsersTable, type UserRow } from "./UsersTable";

export const metadata = { title: "Usuarios" };

export default function UsersPage() {
  return (
    <main className="shell">
      <AdminTopbar />
      <h1>Usuarios</h1>
      <p className="muted lead">
        Toda cuenta nueva es <b>Cliente</b>. Solo el propietario puede dar un rol del equipo (Editor, Asesor o Administrador).
      </p>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <Users />
      </Suspense>
    </main>
  );
}

async function Users() {
  const session = await getSession();
  if (!session || !session.role.isInternal || !(session.isOwner || can(session, "usuarios.ver"))) {
    return <div className="notice err">No tienes permiso para ver los usuarios.</div>;
  }
  const supabase = await createSupabaseServerClient();
  const [{ data: profiles }, { data: roles }, unlock, { data: units }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, is_owner, created_at, privacy_accepted_at, roles ( key )")
      .order("created_at", { ascending: false }),
    supabase.from("roles").select("key, name, is_internal").order("id"),
    session.isOwner ? supabase.rpc("owner_unlock_status") : Promise.resolve({ data: null }),
    supabase.from("units").select("owner_id"),
  ]);
  const purchases = new Map<string, number>();
  for (const u of units ?? []) if (u.owner_id) purchases.set(u.owner_id, (purchases.get(u.owner_id) ?? 0) + 1);

  const users: UserRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    roleKey: p.roles?.key ?? "cliente",
    isOwner: p.is_owner,
    createdAt: p.created_at,
    consent: !!p.privacy_accepted_at,
    purchases: purchases.get(p.id) ?? 0,
  }));

  return (
    <>
      {session.isOwner ? (
        <OwnerUnlock expiresAt={unlock.data ?? null} />
      ) : (
        <div className="notice">Puedes ver los usuarios, pero solo el propietario cambia roles.</div>
      )}
      <UsersTable
        users={users}
        roles={(roles ?? []).map((r) => ({ key: r.key, name: r.name, isInternal: r.is_internal }))}
        canEdit={session.isOwner && !!unlock.data}
        me={session.userId}
      />
    </>
  );
}
