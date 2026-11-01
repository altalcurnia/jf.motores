"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { rpcError } from "../OwnerUnlock";

type Role = { key: string; name: string; description: string | null; internal: boolean; fixed: boolean; users: number };

/** Crear, renombrar y borrar roles (solo el propietario, con la contraseña confirmada). */
export function RolesManager({ roles, canEdit }: { roles: Role[]; canEdit: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", description: "", copyFrom: "", internal: true });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const supabase = () => createSupabaseBrowserClient();

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy("new");
    setMsg(null);
    const { error } = await supabase().rpc("create_role", {
      role_name: form.name,
      role_description: form.description || null,
      internal: form.internal,
      copy_from: form.copyFrom || null,
    });
    setBusy(null);
    if (error) return setMsg({ ok: false, text: rpcError(error) });
    setMsg({ ok: true, text: `Rol "${form.name}" creado. Marca sus permisos arriba y asígnalo en Usuarios.` });
    setForm({ name: "", description: "", copyFrom: "", internal: true });
    router.refresh();
  }

  async function rename(r: Role) {
    const name = prompt("Nuevo nombre del rol", r.name);
    if (!name || name === r.name) return;
    setBusy(r.key);
    const { error } = await supabase().rpc("update_role", { role_key: r.key, role_name: name, role_description: r.description });
    setBusy(null);
    if (error) return setMsg({ ok: false, text: rpcError(error) });
    router.refresh();
  }

  async function remove(r: Role) {
    if (!confirm(`¿Borrar el rol "${r.name}"? No se puede deshacer.`)) return;
    setBusy(r.key);
    const { error } = await supabase().rpc("delete_role", { role_key: r.key });
    setBusy(null);
    if (error) return setMsg({ ok: false, text: rpcError(error) });
    setMsg({ ok: true, text: `Rol "${r.name}" borrado.` });
    router.refresh();
  }

  return (
    <div className="panel">
      <h2>Roles</h2>
      {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
      <div className="roles-grid">
        {roles.map((r) => (
          <div key={r.key} className="role-card">
            <b>{r.name}</b>
            <span className="muted small">
              {r.fixed ? "Fijo" : r.internal ? "Entra al panel" : "Sin acceso al panel"} · {r.users} {r.users === 1 ? "usuario" : "usuarios"}
            </span>
            {r.description && <span className="muted small">{r.description}</span>}
            {!r.fixed && (
              <div className="row-actions">
                <button type="button" disabled={!canEdit || !!busy} onClick={() => rename(r)}>
                  Renombrar
                </button>
                <button
                  type="button"
                  className="link-danger"
                  disabled={!canEdit || !!busy || r.users > 0}
                  title={r.users > 0 ? "Cambia el rol de sus usuarios antes de borrarlo" : undefined}
                  onClick={() => remove(r)}
                >
                  Borrar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <form className="role-form" onSubmit={create}>
        <label>
          Nombre del nuevo rol
          <input required minLength={2} maxLength={60} placeholder="Ej. Técnico de campo" value={form.name} disabled={!canEdit} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label>
          Descripción (opcional)
          <input maxLength={200} placeholder="Qué hace este rol" value={form.description} disabled={!canEdit} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <label>
          Copiar permisos de
          <select value={form.copyFrom} disabled={!canEdit || !form.internal} onChange={(e) => setForm({ ...form, copyFrom: e.target.value })}>
            <option value="">Ninguno (empieza vacío)</option>
            {roles
              .filter((r) => r.internal)
              .map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                </option>
              ))}
          </select>
        </label>
        <button className="btn-primary" disabled={!canEdit || busy === "new"}>
          {busy === "new" ? "Creando…" : "+ Crear rol"}
        </button>
        <label className="check">
          <input type="checkbox" checked={form.internal} disabled={!canEdit} onChange={(e) => setForm({ ...form, internal: e.target.checked, copyFrom: e.target.checked ? form.copyFrom : "" })} />
          Puede entrar al panel (rol del equipo). Desmárcalo para un tipo de cliente especial, por ejemplo “Distribuidor”.
        </label>
      </form>
    </div>
  );
}
