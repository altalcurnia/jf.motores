import type { Locale } from "@/i18n/config";
import { escapeHtml } from "@/lib/email";

/**
 * Correo de bienvenida cuando el cliente confirma su cuenta (Supabase no envía uno propio).
 * Lo envía el sitio desde /auth/confirm justo después de la primera confirmación del correo.
 */
const T = {
  es: {
    subject: "Tu cuenta de JF Motores está lista",
    title: "¡Bienvenido a JF Motores!",
    intro: "Confirmaste tu correo y tu cuenta quedó activa. Desde ella puedes:",
    items: [
      "Ver tus equipos comprados, su serie y su garantía.",
      "Descargar las guías de uso y mantenimiento.",
      "Pedir repuestos y abrir tickets de soporte con fotos.",
    ],
    account: "Ir a mi cuenta",
    catalog: "Ver el catálogo",
    help: "¿Necesitas ayuda? Responde este correo o escríbenos por WhatsApp desde la página.",
    notYou: "Si no creaste esta cuenta, ignora este correo.",
  },
  en: {
    subject: "Your JF Motores account is ready",
    title: "Welcome to JF Motores!",
    intro: "You confirmed your email and your account is active. From it you can:",
    items: [
      "See the equipment you bought, its serial number and warranty.",
      "Download the user and maintenance guides.",
      "Order spare parts and open support tickets with photos.",
    ],
    account: "Go to my account",
    catalog: "Browse the catalog",
    help: "Need help? Reply to this email or message us on WhatsApp from the website.",
    notYou: "If you didn't create this account, ignore this email.",
  },
  pt: {
    subject: "Sua conta JF Motores está pronta",
    title: "Bem-vindo à JF Motores!",
    intro: "Você confirmou seu e-mail e sua conta está ativa. Nela você pode:",
    items: [
      "Ver os equipamentos comprados, a série e a garantia.",
      "Baixar os guias de uso e manutenção.",
      "Pedir peças e abrir chamados de suporte com fotos.",
    ],
    account: "Ir para minha conta",
    catalog: "Ver o catálogo",
    help: "Precisa de ajuda? Responda este e-mail ou fale conosco pelo WhatsApp no site.",
    notYou: "Se você não criou esta conta, ignore este e-mail.",
  },
} as const;

export function welcomeEmail(o: { locale: Locale; siteUrl: string }) {
  const t = T[o.locale] ?? T.es;
  const base = o.siteUrl.replace(/\/$/, "");
  const account = `${base}/${o.locale}/cuenta`;
  const catalog = `${base}/${o.locale}/catalogo`;
  const host = base.replace(/^https?:\/\//, "");
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f4f6;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#0b0d10;padding:22px 28px;">
<img src="${escapeHtml(base)}/logo.png" width="40" height="40" alt="JF Motores" style="vertical-align:middle;border:0;">
<span style="vertical-align:middle;margin-left:10px;font-size:16px;font-weight:900;letter-spacing:2px;color:#ffffff;">JF <span style="color:#f7c600;">MOTORES</span></span>
</td></tr>
<tr><td style="padding:32px 28px;">
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#0b0d10;">${escapeHtml(t.title)}</h1>
<p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:#3a3f45;">${escapeHtml(t.intro)}</p>
<ul style="margin:0 0 24px;padding-left:20px;font-size:15px;line-height:1.7;color:#3a3f45;">${t.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
<td style="border-radius:999px;background:#f7c600;"><a href="${escapeHtml(account)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#0b0d10;text-decoration:none;border-radius:999px;">${escapeHtml(t.account)}</a></td>
<td style="width:12px;"></td>
<td><a href="${escapeHtml(catalog)}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:700;color:#0b0d10;text-decoration:none;border:1px solid #d1d5db;border-radius:999px;">${escapeHtml(t.catalog)}</a></td>
</tr></table>
<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">${escapeHtml(t.help)}<br>${escapeHtml(t.notYou)}</p>
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">JF Motores · Medellín, Colombia · <a href="${escapeHtml(base)}" style="color:#9ca3af;">${escapeHtml(host)}</a></td></tr>
</table></td></tr></table></body></html>`;
  const text = [t.title, "", t.intro, ...t.items.map((i) => `- ${i}`), "", `${t.account}: ${account}`, `${t.catalog}: ${catalog}`, "", t.help, t.notYou].join("\n");
  return { subject: t.subject, html, text };
}

/** ¿Esta verificación es la primera confirmación del correo (cuenta nueva) y no un enlace de acceso? */
export function isFirstConfirmation(emailConfirmedAt: string | null | undefined, now = Date.now()): boolean {
  if (!emailConfirmedAt) return false;
  const t = new Date(emailConfirmedAt).getTime();
  return Number.isFinite(t) && now - t >= 0 && now - t < 120_000;
}
