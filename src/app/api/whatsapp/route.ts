import { after, NextResponse, type NextRequest } from "next/server";
import { botAnswer } from "@/features/assistant/bot";
import { parseIncoming, verifySignature, waSend, whatsappConfig, whatsappReady } from "@/features/whatsapp/cloud";
import { tgSend, telegramToken } from "@/features/telegram/api";
import { getTelegramSettings } from "@/features/telegram/settings";
import { reportError } from "@/lib/report-error";

/**
 * Webhook del bot de WhatsApp (WhatsApp Cloud API de Meta). Apagado mientras falten las variables WHATSAPP_*.
 * GET: verificación que hace Meta al registrar el webhook. POST: mensajes de clientes, firmados por Meta.
 * Por ahora responde solo a los números de prueba (WHATSAPP_ALLOWED_NUMBERS); abrirlo al público con tope de
 * gasto requiere una migración pequeña, que se aprueba al conectar el número.
 */
export function GET(request: NextRequest) {
  const c = whatsappConfig();
  const sp = request.nextUrl.searchParams;
  if (c.verifyToken && sp.get("hub.mode") === "subscribe" && sp.get("hub.verify_token") === c.verifyToken) {
    return new NextResponse(sp.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new NextResponse("forbidden", { status: 403 });
}

// Meta puede reenviar el mismo mensaje: se recuerdan los últimos para no responder dos veces
const seen = new Set<string>();
function firstTime(id: string) {
  if (seen.has(id)) return false;
  seen.add(id);
  if (seen.size > 2000) seen.clear();
  return true;
}

export async function POST(request: NextRequest) {
  const c = whatsappConfig();
  if (!whatsappReady(c)) return new NextResponse("not configured", { status: 404 });
  const raw = await request.text();
  if (!verifySignature(raw, request.headers.get("x-hub-signature-256"), c.appSecret!)) {
    return new NextResponse("forbidden", { status: 403 });
  }
  let payload: unknown = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true });
  }
  const messages = parseIncoming(payload).filter((m) => (!m.phoneNumberId || m.phoneNumberId === c.phoneNumberId) && firstTime(m.id));

  // Meta espera la respuesta rápido: la IA contesta después de confirmar la recepción
  after(async () => {
    for (const m of messages) {
      if (!c.allowed.includes(m.from)) continue; // modo de prueba: el resto lo atiende el equipo
      try {
        const answer = await botAnswer({ channel: "whatsapp", chatKey: m.from, text: m.text, locale: localeFromNumber(m.from), budget: null });
        await waSend(m.from, answer.text, c);
        if (answer.handoff !== null) await notifyHandoff(m.from, m.name, answer.handoff);
      } catch (e) {
        reportError("Bot de WhatsApp", e);
      }
    }
  });
  return NextResponse.json({ ok: true });
}

/** Idioma por el indicativo del número: Brasil y Portugal en portugués; EE. UU., Canadá, Reino Unido y Australia en inglés. */
function localeFromNumber(n: string): "es" | "en" | "pt" {
  if (/^(55|351)/.test(n)) return "pt";
  if (/^(1|44|61)/.test(n)) return "en";
  return "es";
}

/** El cliente pidió un asesor: aviso al equipo por Telegram con su número para escribirle. */
async function notifyHandoff(from: string, name: string | null, summary: string) {
  if (!telegramToken()) return;
  const s = await getTelegramSettings();
  if (s.teamChats.length === 0) return;
  const text = `🙋 Cliente pide asesor en WhatsApp: ${name ? `${name} · ` : ""}+${from}\nResumen: ${summary.slice(0, 600)}\nhttps://wa.me/${from}`;
  await Promise.all(s.teamChats.map((chat) => tgSend(chat, text)));
}
