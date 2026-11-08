import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * WhatsApp Cloud API (plataforma oficial de Meta) para el bot de WhatsApp.
 * Variables en Vercel:
 *   WHATSAPP_TOKEN            secreto: token permanente de un usuario del sistema (Meta Business)
 *   WHATSAPP_APP_SECRET       secreto: «clave secreta de la app» de Meta, para verificar la firma de cada llamada
 *   WHATSAPP_VERIFY_TOKEN     secreto: texto inventado que se escribe también en Meta al registrar el webhook
 *   WHATSAPP_PHONE_NUMBER_ID  no secreto: identificador del número en Meta
 *   WHATSAPP_ALLOWED_NUMBERS  números de prueba (solo dígitos con indicativo, p. ej. 573001112233), separados por coma
 *   WHATSAPP_GRAPH_VERSION    opcional (por defecto v23.0)
 */
export function whatsappConfig() {
  const e = process.env;
  return {
    token: e.WHATSAPP_TOKEN || null,
    appSecret: e.WHATSAPP_APP_SECRET || null,
    verifyToken: e.WHATSAPP_VERIFY_TOKEN || null,
    phoneNumberId: e.WHATSAPP_PHONE_NUMBER_ID || null,
    allowed: (e.WHATSAPP_ALLOWED_NUMBERS ?? "").split(/[\s,;]+/).map((s) => s.replace(/\D/g, "")).filter((s) => s.length >= 8),
    graph: /^v\d{2}\.\d$/.test(e.WHATSAPP_GRAPH_VERSION ?? "") ? e.WHATSAPP_GRAPH_VERSION! : "v23.0",
  };
}

/** ¿Está todo lo necesario para recibir y responder? */
export function whatsappReady(c = whatsappConfig()): boolean {
  return Boolean(c.token && c.appSecret && c.verifyToken && c.phoneNumberId);
}

/** Verifica la firma `X-Hub-Signature-256` (HMAC SHA-256 del cuerpo con la clave secreta de la app). */
export function verifySignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const got = header.slice(7);
  if (got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got, "hex"), Buffer.from(expected, "hex"));
}

export type IncomingText = { id: string; from: string; text: string; name: string | null; phoneNumberId: string | null };

type Payload = {
  entry?: {
    changes?: {
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        messages?: { id?: string; from?: string; type?: string; text?: { body?: string } }[];
      };
    }[];
  }[];
};

/** Mensajes de texto entrantes del aviso de Meta (ignora estados de entrega, audios, fotos, etc.). */
export function parseIncoming(payload: unknown): IncomingText[] {
  const out: IncomingText[] = [];
  for (const entry of (payload as Payload)?.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value;
      for (const m of v?.messages ?? []) {
        const body = m.text?.body?.trim();
        if (m.type !== "text" || !m.id || !m.from || !body) continue;
        const contact = v?.contacts?.find((c) => c.wa_id === m.from);
        out.push({ id: m.id, from: m.from, text: body, name: contact?.profile?.name ?? null, phoneNumberId: v?.metadata?.phone_number_id ?? null });
      }
    }
  }
  return out;
}

/** Responde por texto (dentro de la ventana de 24 h que abre el cliente al escribir: sin costo de plantilla). */
export async function waSend(to: string, text: string, c = whatsappConfig()): Promise<boolean> {
  if (!c.token || !c.phoneNumberId) return false;
  try {
    const res = await fetch(`https://graph.facebook.com/${c.graph}/${c.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text.slice(0, 4000), preview_url: false } }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
