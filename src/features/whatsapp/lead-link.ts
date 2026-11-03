/**
 * Enlace a WhatsApp que primero registra el lead y asigna el asesor (RF-06/RF-07).
 * /api/wa guarda producto, fuente, país, idioma, campaña y dispositivo, y redirige al
 * WhatsApp del asesor con el mensaje y un código de cotización. Se puede usar en
 * componentes de servidor y de cliente.
 */
export type LeadSource =
  | "ficha"
  | "cabecera"
  | "inicio"
  | "flotante"
  | "asistente"
  | "soporte"
  | "guia"
  | "repuestos"
  | "mis-equipos"
  | "contacto"
  | "sedes";

export function waLead(opts: {
  message: string;
  source: LeadSource;
  locale?: string;
  productId?: string;
  catalog?: string;
  partKey?: string;
  advisorId?: string;
}): string {
  const q = new URLSearchParams();
  if (opts.advisorId) q.set("a", opts.advisorId);
  q.set("m", opts.message.slice(0, 700));
  q.set("s", opts.source);
  if (opts.locale) q.set("l", opts.locale);
  if (opts.productId) q.set("p", opts.productId);
  if (opts.catalog) q.set("c", opts.catalog);
  if (opts.partKey) q.set("k", opts.partKey);
  return `/api/wa?${q.toString()}`;
}
