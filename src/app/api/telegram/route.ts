import { NextResponse, type NextRequest } from "next/server";
import { botAnswer, botLocale } from "@/features/assistant/bot";
import { dictionaryFor } from "@/i18n/dictionaries";
import { tgSend } from "@/features/telegram/api";
import { botSpentThisMonth, chargeBot, getTelegramSettings } from "@/features/telegram/settings";

/**
 * Webhook del bot de Telegram: asistente de ventas y técnico (mismos documentos que el chat de la página).
 * Telegram firma cada llamada con el encabezado secreto registrado en setWebhook (Admin → Asistente → Registrar).
 * Modo de prueba: solo responde a los chats autorizados. Abierto al público: responde a todos, con tope de gasto mensual.
 * `/id` siempre responde el ID del chat (para autorizar chats de prueba o del equipo).
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

  const locale = botLocale(update?.message?.from?.language_code);
  const t = (await dictionaryFor(locale)).assistant;
  const send = (body: string) => tgSend(chatId, body, token);
  const id = String(chatId);

  if (/^\/id(@\w+)?$/i.test(text)) {
    await send(t.telegramId.replace("{id}", id));
    return NextResponse.json({ ok: true });
  }

  const settings = await getTelegramSettings();
  const isTest = settings.testChats.includes(id);
  if (!isTest && !settings.publicEnabled) {
    await send(t.telegramPrivate.replace("{id}", id));
    return NextResponse.json({ ok: true });
  }
  if (text.startsWith("/start")) {
    await send(t.welcome);
    return NextResponse.json({ ok: true });
  }

  const answer = await botAnswer({
    channel: "telegram",
    chatKey: id,
    text,
    locale,
    // Los chats de prueba no se frenan por el tope del público, pero su consumo se suma igual
    budget: settings.fromDb ? { cap: isTest ? Number.POSITIVE_INFINITY : settings.capUsd, spent: botSpentThisMonth, charge: chargeBot } : null,
  });
  await send(answer.text);
  return NextResponse.json({ ok: true });
}
