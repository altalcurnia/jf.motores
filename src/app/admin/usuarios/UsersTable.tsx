"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { rpcError } from "../OwnerUnlock";

export type UserRow = {
  id: string;
  email: string;
  fullName: string | null;
  roleKey: string;
  isOwner: boolean;
  createdAt: string;
  consent: boolean;
};
type Role = { key: string; name: string; isInternal: boolean };

/** Lista de usuarios. Solo el propietario puede cambiar roles (la base de datos también lo exige). */
export function UsersTable({ users, roles, canEdit, me }: { users: UserRow[]; roles: Role[]; canEdit: boolean; me: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"todos" | "internos" | "clientes">("todos");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const internal = useMemo(() => new Set(roles.filter((r) => r.isInternal).map((r) => r.key)), [roles]);
  const fmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });

  const shown = users.filter((u) => {
    const text = `${u.email} ${u.fullName ?? ""}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;
    if (filter === "internos") return internal.has(u.roleKey);
    if (filter === "clientes") return !internal.has(u.roleKey);
    return true;
  });

  async function changeRole(user: UserRow, roleKey: string) {
    const role = roles.find((r) => r.key === roleKey);
    if (!role) return;
    const warning = role.isInternal
      ? `¿Dar a ${user.email} el rol ${role.name}? Podrá entrar al panel con los permisos de ese rol.`
      : `¿Cambiar a ${user.email} a ${role.name}? Perderá el acceso al panel.`;
    if (!window.confirm(warning)) return;
    setBusy(user.id);
    setError(null);
    const { error: err } = await createSupabaseBrowserClient().rpc("set_user_role", { target: user.id, role_key: roleKey });
    setBusy(null);
    if (err) return setError(rpcError(err));
    router.refresh();
  }

  return (
    <div className="panel">
      <div className="toolbar">
        <input className="search" placeholder="Buscar por correo o nombre" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg">
          {(["todos", "internos", "clientes"] as const).map((f) => (
            <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
              {f === "todos" ? "Todos" : f === "internos" ? "Equipo" : "Clientes"}
            </button>
          ))}
        </div>
      </div>
      {error && <div className="notice err">{error}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Registro</th>
              <th>Datos</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((u) => (
              <tr key={u.id}>
                <td>
                  <b>{u.fullName || "—"}</b>
                  <span className="muted block">{u.email}</span>
                </td>
                <td>
                  {u.isOwner ? (
                    <span className="pill owner">Propietario · Administrador</span>
                  ) : (
                    <select
                      value={u.roleKey}
                      disabled={!canEdit || busy === u.id || u.id === me}
                      onChange={(e) => changeRole(u, e.target.value)}
                    >
                      {roles.map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="muted">{fmt.format(new Date(u.createdAt))}</td>
                <td>{u.consent ? <span className="pill ok">Autorizó</span> : <span className="pill">Pendiente</span>}</td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
