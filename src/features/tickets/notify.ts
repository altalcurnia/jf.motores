import "server-only";
import { escapeHtml, sendEmail } from "@/lib/email";
import { getContact } from "@/lib/supabase/public";
import { site } from "@/lib/site";

const base = () => site.url.replace(/\/$/, "");

function layout(title: string, lines: string[], cta: { href: string; label: string }) {
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#111">
  <h2 style="margin:0 0 12px">${escapeHtml(title)}</h2>
  ${lines.map((l) => `<p style="margin:0 0 10px;line-height:1.5">${escapeHtml(l)}</p>`).join("")}
  <p style="margin:18px 0"><a href="${cta.href}" style="background:#f7c600;color:#0b0d10;padding:11px 18px;border-radius:999px;text-decoration:none;font-weight:bold">${escapeHtml(cta.label)}</a></p>
  <p style="color:#777;font-size:12px">JF Motores · Tranquilidad y confianza</p></div>`;
  return { html, text: [title, ...lines, `${cta.label}: ${cta.href}`].join("\n\n") };
}

/** Aviso al equipo (correo de soporte de /admin/empresa) cuando llega un ticket o el cliente responde. */
export async function notifyStaff(ticketId: string, subject: string, preview: string, kind: "new" | "reply") {
  const to = (await getContact()).email;
  if (!to) return;
  const title = kind === "new" ? `Nuevo ticket: ${subject}` : `El cliente respondió: ${subject}`;
  const msg = layout(title, [preview.slice(0, 600) || "(solo fotos)"], {
    href: `${base()}/admin/tickets?t=${ticketId}`,
    label: "Abrir en el panel",
  });
  await sendEmail({ to, subject: title, ...msg }).catch(() => undefined);
}

const CUSTOMER = {
  es: { title: "Respondimos tu ticket", cta: "Ver la respuesta", hint: "Abre el botón Soporte → Mis tickets en la página." },
  en: { title: "We answered your ticket", cta: "See the answer", hint: "Open the Support button → My tickets on the site." },
  pt: { title: "Respondemos seu ticket", cta: "Ver a resposta", hint: "Abra o botão Suporte → Meus tickets no site." },
} as const;

/** Aviso al cliente cuando el equipo responde (solo el primero sin leer, para no llenar su correo). */
export async function notifyCustomer(email: string, locale: string | null, ticketId: string, subject: string) {
  const l = locale === "en" || locale === "pt" ? locale : "es";
  const c = CUSTOMER[l];
  const msg = layout(`${c.title}: ${subject}`, [c.hint], { href: `${base()}/${l}?ticket=${ticketId}`, label: c.cta });
  await sendEmail({ to: email, subject: `${c.title}: ${subject}`, ...msg }).catch(() => undefined);
}
