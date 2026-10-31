"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeAdminPath } from "@/lib/safe-redirect";

type Mode = "link" | "password";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(
    searchParams.get("error") === "enlace" ? "El enlace venció o ya se usó. Pide uno nuevo." : null,
  );

  function nextPath() {
    return safeAdminPath(searchParams.get("next"));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);
    const supabase = createSupabaseBrowserClient();

    if (mode === "link") {
      const redirect = new URL("/auth/callback", window.location.origin);
      redirect.searchParams.set("next", nextPath());
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirect.toString() },
      });
      if (error) {
        setStatus("error");
        setMessage(error.status === 429 ? "Demasiados intentos. Espera unos minutos." : "No se pudo enviar el enlace. Revisa el correo.");
        return;
      }
      setStatus("sent");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setStatus("error");
      setMessage("Correo o contraseña incorrectos.");
      return;
    }
    router.replace(nextPath());
    router.refresh();
  }

  if (status === "sent") {
    return (
      <div className="notice ok" role="status">
        <b>Revisa tu correo.</b> Te enviamos un enlace a <b>{email}</b> para entrar al panel. Puede tardar un minuto;
        revisa también la carpeta de spam.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="form">
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "link"} className={mode === "link" ? "on" : ""} onClick={() => setMode("link")}>
          Enlace al correo
        </button>
        <button type="button" role="tab" aria-selected={mode === "password"} className={mode === "password" ? "on" : ""} onClick={() => setMode("password")}>
          Contraseña
        </button>
      </div>

      <label>
        Correo
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>

      {mode === "password" && (
        <label>
          Contraseña
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
      )}

      {message && <div className="notice err" role="alert">{message}</div>}

      <button className="btn-primary" disabled={status === "sending"}>
        {status === "sending" ? "Enviando…" : mode === "link" ? "Enviarme el enlace" : "Entrar"}
      </button>

      {mode === "link" && <p className="hint">Primera vez: entra con el enlace y luego crea tu contraseña dentro del panel.</p>}
    </form>
  );
}
