"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const time = new Intl.DateTimeFormat("es-CO", { timeStyle: "short" });

/**
 * Confirmación con la contraseña del propietario. La base de datos la verifica y
 * habilita cambios de roles y permisos durante 10 minutos.
 */
export function OwnerUnlock({ expiresAt }: { expiresAt: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Al vencer, vuelve a bloquear la pantalla
  useEffect(() => {
    if (!expiresAt) return;
    const ms = new Date(expiresAt).getTime() - Date.now();
    const id = setTimeout(() => router.refresh(), Math.max(ms, 0) + 500);
    return () => clearTimeout(id);
  }, [expiresAt, router]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { data, error } = await createSupabaseBrowserClient().rpc("owner_unlock", { password });
    setBusy(false);
    setPassword("");
    if (error) return setMsg(error.message);
    const res = data as { ok: boolean; reason?: string; attempts_left?: number };
    if (res.ok) return router.refresh();
    setMsg(
      {
        wrong: `Contraseña incorrecta. Te quedan ${res.attempts_left ?? 0} intentos antes de esperar 15 minutos.`,
        locked: "Demasiados intentos. Espera 15 minutos.",
        no_password: "Tu cuenta aún no tiene contraseña. Créala en Inicio → Tu contraseña y vuelve aquí.",
        not_owner: "Solo el propietario puede hacer estos cambios.",
      }[res.reason ?? ""] ?? "No se pudo confirmar.",
    );
  }

  async function lock() {
    await createSupabaseBrowserClient().rpc("owner_lock");
    router.refresh();
  }

  if (expiresAt) {
    return (
      <div className="notice ok unlock">
        <span>
          🔓 Cambios habilitados hasta las <b>{time.format(new Date(expiresAt))}</b>
        </span>
        <button className="btn-ghost" onClick={lock}>
          Bloquear ahora
        </button>
      </div>
    );
  }
  return (
    <form className="notice unlock" onSubmit={unlock}>
      <span>
        🔒 Para cambiar roles o permisos, confirma <b>tu contraseña</b>. Queda habilitado 10 minutos.
      </span>
      <div className="unlock-row">
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Tu contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          aria-label="Contraseña del propietario"
        />
        <button className="btn-primary" disabled={busy || !password}>
          {busy ? "Verificando…" : "Confirmar"}
        </button>
      </div>
      {msg && <span className="err-text">{msg}</span>}
    </form>
  );
}

/** Mensaje claro cuando la base de datos pide confirmar la contraseña. */
export function rpcError(err: { message: string; hint?: string | null }): string {
  return err.hint === "unlock_required" ? "Confirma tu contraseña arriba para hacer cambios." : err.message;
}
