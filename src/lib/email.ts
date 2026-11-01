import "server-only";

/**
 * Envío de correos transaccionales con Resend (el mismo proveedor que ya envía los
 * correos de la cuenta). Necesita RESEND_API_KEY en Vercel; si no está, no se envía
 * nada y se informa en el panel.
 */
export type EmailResult = { ok: true; id: string } | { ok: false; reason: "not_configured" | "failed"; detail?: string };

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string }): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, reason: "not_configured" };
  const from = process.env.EMAIL_FROM || "JF Motores <no-reply@altalcurnia.com>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok || !body.id) return { ok: false, reason: "failed", detail: body.message ?? `HTTP ${res.status}` };
    return { ok: true, id: body.id };
  } catch (e) {
    return { ok: false, reason: "failed", detail: e instanceof Error ? e.message : "error" };
  }
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
