"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { rpcError } from "../OwnerUnlock";

type Role = { key: string; name: string; locked: boolean };
type Permission = { key: string; description: string };

/** Matriz rol × permiso. Administrador (todo) y Cliente (nada) son fijos; los demás se editan. */
export function PermissionMatrix({
  roles,
  permissions,
  granted,
  canEdit,
}: {
  roles: Role[];
  permissions: Permission[];
  granted: string[]; // "rol:permiso"
  canEdit: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState(() => new Set(granted));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const grantedKey = granted.join("|");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con el servidor tras router.refresh()
  useEffect(() => setState(new Set(grantedKey ? grantedKey.split("|") : [])), [grantedKey]);

  async function toggle(role: Role, perm: Permission) {
    const id = `${role.key}:${perm.key}`;
    const next = !state.has(id);
    setBusy(id);
    setError(null);
    const { error: err } = await createSupabaseBrowserClient().rpc("set_role_permission", {
      role_key: role.key,
      permission_key: perm.key,
      granted: next,
    });
    setBusy(null);
    if (err) return setError(rpcError(err));
    setState((s) => {
      const copy = new Set(s);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
    router.refresh();
  }

  async function setAll(role: Role, grantedAll: boolean) {
    const verb = grantedAll ? "dar TODOS los permisos a" : "quitar TODOS los permisos a";
    if (!confirm(`¿Seguro que quieres ${verb} ${role.name}?`)) return;
    setBusy(`${role.key}:*`);
    setError(null);
    const { error: err } = await createSupabaseBrowserClient().rpc("set_role_all_permissions", { role_key: role.key, granted: grantedAll });
    setBusy(null);
    if (err) return setError(rpcError(err));
    setState((s) => {
      const copy = new Set([...s].filter((x) => !x.startsWith(`${role.key}:`)));
      if (grantedAll) permissions.forEach((p) => copy.add(`${role.key}:${p.key}`));
      return copy;
    });
    router.refresh();
  }

  return (
    <div className="panel">
      <h2>Permisos</h2>
      {error && <div className="notice err">{error}</div>}
      <div className="table-wrap">
        <table className="table matrix">
          <thead>
            <tr>
              <th>Permiso</th>
              {roles.map((r) => {
                const count = permissions.filter((p) => state.has(`${r.key}:${p.key}`)).length;
                return (
                  <th key={r.key} className="center">
                    {r.name}
                    {r.locked ? (
                      <span className="muted block small">fijo</span>
                    ) : (
                      <span className="all">
                        <button type="button" disabled={!canEdit || !!busy || count === permissions.length} onClick={() => setAll(r, true)}>
                          Todos
                        </button>
                        <button type="button" disabled={!canEdit || !!busy || count === 0} onClick={() => setAll(r, false)}>
                          Ninguno
                        </button>
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {permissions.map((p) => (
              <tr key={p.key}>
                <td>
                  <b>{p.description}</b>
                  <code className="muted block small">{p.key}</code>
                </td>
                {roles.map((r) => {
                  const id = `${r.key}:${p.key}`;
                  return (
                    <td key={r.key} className="center">
                      <input
                        type="checkbox"
                        aria-label={`${r.name}: ${p.description}`}
                        checked={state.has(id)}
                        disabled={!canEdit || r.locked || !!busy}
                        onChange={() => toggle(r, p)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
