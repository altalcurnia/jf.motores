/** Normaliza un número a formato internacional sin signos (E.164 sin "+"), como lo exige wa.me. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    throw new Error(`Número de WhatsApp inválido: "${raw}"`);
  }
  return digits;
}

/** Construye el enlace de WhatsApp con el mensaje ya escrito. */
export function buildWhatsAppUrl(phone: string, message?: string): string {
  const base = `https://wa.me/${normalizePhone(phone)}`;
  const text = message?.trim();
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
