"use client";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Crear o cambiar la contraseña de la cuenta actual. */
export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 10) return setMsg({ ok: false, text: "Usa al menos 10 caracteres." });
    if (password !== confirm) return setMsg({ ok: false, text: "Las contraseñas no coinciden." });
    setBusy(true);
    const { error } = await createSupabaseBrowserClient().auth.updateUser({ password });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: "No se pudo guardar. Intenta de nuevo." });
    setPassword("");
    setConfirm("");
    setMsg({ ok: true, text: "Contraseña guardada. Ya puedes entrar con correo y contraseña." });
  }

  return (
    <form onSubmit={onSubmit} className="form compact">
      <label>
        Nueva contraseña
        <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <label>
        Repetir contraseña
        <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </label>
      {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
      <button className="btn-secondary" disabled={busy}>{busy ? "Guardando…" : "Guardar contraseña"}</button>
    </form>
  );
}
