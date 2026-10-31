"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Role = { key: string; name: string; locked: boolean };
type Permission = { key: string; description: string };

/** Matriz rol × permiso. Administrador (todo) y Cliente (nada) son fijos; Editor y Asesor se editan. */
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
    if (err) return setError(err.message);
    setState((s) => {
      const copy = new Set(s);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
    router.refresh();
  }

  return (
    <div className="panel">
      {error && <div className="notice err">{error}</div>}
      <div className="table-wrap">
        <table className="table matrix">
          <thead>
            <tr>
              <th>Permiso</th>
              {roles.map((r) => (
                <th key={r.key} className="center">
                  {r.name}
                  {r.locked && <span className="muted block small">fijo</span>}
                </th>
              ))}
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
                        disabled={!canEdit || r.locked || busy === id}
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
