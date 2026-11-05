import type { Locale } from "@/i18n/config";
import { localeTags } from "@/i18n/config";
import { escapeHtml } from "@/lib/email";

type Input = {
  locale: Locale;
  name: string | null;
  product: string;
  ref: string;
  serial: string | null;
  soldOn: string | null; // AAAA-MM-DD
  warrantyEnd?: string | null;
  accountUrl: string;
  manualUrl: string | null;
  whatsappUrl: string;
};

const T = {
  es: {
    subject: (p: string) => `Tu compra quedó registrada: ${p}`,
    hello: (n: string | null) => (n ? `Hola, ${n}:` : "Hola:"),
    intro: "Registramos esta compra a tu cuenta de JF Motores. Desde tu cuenta puedes ver tus equipos y descargar sus guías.",
    product: "Producto",
    serial: "Serie",
    date: "Fecha de compra",
    warranty: "Garantía hasta",
    account: "Ver mis equipos",
    manual: "Descargar la guía de usuario (PDF)",
    manualNote: "Debes iniciar sesión con este correo para descargarla.",
    help: "¿Dudas o soporte? Escríbenos por WhatsApp",
    notInvoice: "Este correo confirma el registro de tu equipo; no es una factura.",
    notYou: "Si no reconoces esta compra, respóndenos por WhatsApp.",
  },
  en: {
    subject: (p: string) => `Your purchase has been registered: ${p}`,
    hello: (n: string | null) => (n ? `Hello ${n},` : "Hello,"),
    intro: "We registered this purchase to your JF Motores account. From your account you can see your equipment and download its guides.",
    product: "Product",
    serial: "Serial",
    date: "Purchase date",
    warranty: "Warranty until",
    account: "See my equipment",
    manual: "Download the user guide (PDF)",
    manualNote: "Sign in with this email to download it.",
    help: "Questions or support? Message us on WhatsApp",
    notInvoice: "This email confirms your equipment registration; it is not an invoice.",
    notYou: "If you don't recognise this purchase, let us know on WhatsApp.",
  },
  pt: {
    subject: (p: string) => `Sua compra foi registrada: ${p}`,
    hello: (n: string | null) => (n ? `Olá, ${n}:` : "Olá:"),
    intro: "Registramos esta compra na sua conta JF Motores. Na sua conta você vê seus equipamentos e baixa os guias.",
    product: "Produto",
    serial: "Série",
    date: "Data da compra",
    warranty: "Garantia até",
    account: "Ver meus equipamentos",
    manual: "Baixar o guia do usuário (PDF)",
    manualNote: "Entre com este e-mail para baixá-lo.",
    help: "Dúvidas ou suporte? Fale conosco pelo WhatsApp",
    notInvoice: "Este e-mail confirma o registro do seu equipamento; não é uma nota fiscal.",
    notYou: "Se você não reconhece esta compra, avise-nos pelo WhatsApp.",
  },
} as const;

/** Correo al cliente cuando se registra una compra a su cuenta (es/en/pt). */
export function purchaseEmail(i: Input) {
  const t = T[i.locale];
  const date = i.soldOn
    ? new Intl.DateTimeFormat(localeTags[i.locale], { dateStyle: "long" }).format(new Date(`${i.soldOn}T12:00:00`))
    : null;
  const firstName = i.name?.split(" ")[0] ?? null;
  const rows: [string, string][] = [[t.product, `${i.product} (${i.ref})`]];
  if (i.serial) rows.push([t.serial, i.serial]);
  if (date) rows.push([t.date, date]);
  if (i.warrantyEnd)
    rows.push([t.warranty, new Intl.DateTimeFormat(localeTags[i.locale], { dateStyle: "long" }).format(new Date(`${i.warrantyEnd}T12:00:00`))]);

  const e = escapeHtml;
  const btn = (href: string, label: string, primary: boolean) =>
    `<a href="${e(href)}" style="display:inline-block;padding:13px 22px;border-radius:999px;text-decoration:none;font-weight:700;font-size:14px;${
      primary ? "background:#f7c600;color:#0b0d10;" : "border:1px solid #d0d5db;color:#0b0d10;"
    }">${e(label)}</a>`;

  const html = `<!doctype html><html lang="${i.locale}"><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#0b0d10">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0b0d10;padding:20px 28px;font-weight:900;letter-spacing:3px;color:#ffffff;font-size:15px">JF <span style="color:#f7c600">MOTORES</span></td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 12px;font-size:16px">${e(t.hello(firstName))}</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#374151">${e(t.intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;margin-bottom:22px">
${rows.map(([k, v]) => `<tr><td style="padding:10px 14px;color:#6b7280;font-size:13px;width:40%">${e(k)}</td><td style="padding:10px 14px;font-weight:700;font-size:14px">${e(v)}</td></tr>`).join("")}
</table>
<p style="margin:0 0 12px">${btn(i.accountUrl, t.account, true)}</p>
${i.manualUrl ? `<p style="margin:0 0 4px">${btn(i.manualUrl, t.manual, false)}</p><p style="margin:0 0 18px;font-size:12px;color:#6b7280">${e(t.manualNote)}</p>` : ""}
<p style="margin:18px 0 0;font-size:14px"><a href="${e(i.whatsappUrl)}" style="color:#0b0d10">${e(t.help)}</a></p>
</td></tr>
<tr><td style="padding:16px 28px;background:#f9fafb;font-size:12px;color:#6b7280;line-height:1.5">${e(t.notInvoice)}<br>${e(t.notYou)}</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    t.hello(firstName),
    "",
    t.intro,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    `${t.account}: ${i.accountUrl}`,
    i.manualUrl ? `${t.manual}: ${i.manualUrl} (${t.manualNote})` : "",
    `${t.help}: ${i.whatsappUrl}`,
    "",
    t.notInvoice,
    t.notYou,
  ]
    .filter((l) => l !== null)
    .join("\n");

  return { subject: t.subject(i.product), html, text };
}
