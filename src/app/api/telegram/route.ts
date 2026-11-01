import { NextResponse, type NextRequest } from "next/server";
import { askAssistant } from "@/features/assistant/deepseek";
import { getAssistantContext, rateLimited } from "@/features/assistant/context";
import { buildWhatsAppUrl } from "@/features/whatsapp/link";
import { dictionaryFor } from "@/i18n/dictionaries";
import { getContact } from "@/lib/supabase/public";

/**
 * Webhook del bot de Telegram (pruebas del asistente fuera de la página).
 * Telegram firma cada llamada con el encabezado secreto que se registró en setWebhook.
 */
export async function POST(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return new NextResponse("forbidden", { status: 403 });
  }
  const update = (await request.json().catch(() => null)) as {
    message?: { chat?: { id?: number }; text?: string; from?: { language_code?: string } };
  } | null;
  const chatId = update?.message?.chat?.id;
  const text = update?.message?.text?.trim();
  if (!chatId || !text) return NextResponse.json({ ok: true });

  const lc = update?.message?.from?.language_code ?? "es";
  const locale = lc.startsWith("pt") ? "pt" : lc.startsWith("en") ? "en" : "es";
  const t = (await dictionaryFor(locale)).assistant;
  const send = (body: string) =>
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: body, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);

  if (text.startsWith("/start")) {
    await send(t.welcome);
    return NextResponse.json({ ok: true });
  }
  const wa = buildWhatsAppUrl((await getContact()).whatsapp, t.waMessage);
  if (rateLimited(`tg:${chatId}`)) {
    await send(`${t.limit}\n${wa}`);
    return NextResponse.json({ ok: true });
  }
  const ctx = await getAssistantContext();
  if (!ctx.enabled) {
    await send(`${t.disabled}\n${wa}`);
    return NextResponse.json({ ok: true });
  }
  const r = await askAssistant({ docs: ctx.docs, model: ctx.model, history: [{ role: "user", content: text.slice(0, 800) }], locale });
  if (!r.ok) {
    console.error("Asistente IA (Telegram):", r.reason, r.detail ?? "");
    await send(`${t.unavailable}\n${wa}`);
  } else {
    await send(r.noInfo ? `${t.noInfo}\n${wa}` : r.reply);
  }
  return NextResponse.json({ ok: true });
}
