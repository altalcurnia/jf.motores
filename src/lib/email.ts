import "server-only";
import { reportError } from "@/lib/report-error";

/**
 * Envío de correos transaccionales con Resend (el mismo proveedor que ya envía los
 * correos de la cuenta). Necesita RESEND_API_KEY en Vercel; si no está, no se envía
 * nada y se informa en el panel.
 *
 * Remitente: EMAIL_FROM (por defecto notificaciones@jfmotoresmedellin.com, dominio verificado en Resend).
 * Respuestas: EMAIL_REPLY_TO (por defecto jfmotoresm@gmail.com): si el cliente responde, le llega a la empresa.
 */
export const DEFAULT_FROM = "JF Motores <notificaciones@jfmotoresmedellin.com>";
export const DEFAULT_REPLY_TO = "jfmotoresm@gmail.com";
export type EmailResult = { ok: true; id: string } | { ok: false; reason: "not_configured" | "failed"; detail?: string };

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, reason: "not_configured" };
  const from = process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
  const replyTo = (process.env.EMAIL_REPLY_TO ?? DEFAULT_REPLY_TO).trim();
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok || !body.id) {
      const detail = body.message ?? `HTTP ${res.status}`;
      reportError("Correo no enviado", new Error(detail));
      return { ok: false, reason: "failed", detail };
    }
    return { ok: true, id: body.id };
  } catch (e) {
    reportError("Correo no enviado", e);
    return { ok: false, reason: "failed", detail: e instanceof Error ? e.message : "error" };
  }
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
