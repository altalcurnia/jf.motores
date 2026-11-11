/** Llamadas a la API de bots de Telegram. El token vive solo en Vercel (TELEGRAM_BOT_TOKEN). */
export function telegramToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

/** Envía un mensaje de texto (sin vista previa de enlaces). Nunca lanza error. */
export async function tgSend(chatId: string | number, text: string, token = telegramToken()): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** IDs de chat escritos en el panel (separados por coma, espacio o salto de línea). */
export function parseChatIds(input: string): string[] {
  return [...new Set(input.split(/[\s,;]+/).map((s) => s.trim()).filter((s) => /^-?\d{3,20}$/.test(s)))];
}
