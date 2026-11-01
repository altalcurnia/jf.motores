import "server-only";
import { isNoInfo, systemPrompt, type AssistantLocale, type ChatTurn, type KnowledgeDoc } from "./harness";

export const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
export const DEFAULT_MODEL = "deepseek-flash";

export type AskResult =
  | { ok: true; reply: string; noInfo: boolean }
  | { ok: false; reason: "no_key" | "no_docs" | "api_error"; detail?: string };

/** ¿Está configurada la clave en el servidor? (nunca se expone su valor) */
export function hasDeepSeekKey(): boolean {
  return (process.env.DEEPSEEK_API_KEY ?? "").trim().length > 10;
}

/** Pregunta al modelo con el arnés estricto. Solo servidor. */
export async function askAssistant(input: {
  docs: KnowledgeDoc[];
  model?: string;
  history: ChatTurn[];
  locale: AssistantLocale;
}): Promise<AskResult> {
  const key = (process.env.DEEPSEEK_API_KEY ?? "").trim();
  if (!key) return { ok: false, reason: "no_key" };
  if (!input.docs.length) return { ok: false, reason: "no_docs" };
  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: input.model || DEFAULT_MODEL,
        temperature: 0.1,
        max_tokens: 500,
        stream: false,
        messages: [{ role: "system", content: systemPrompt(input.docs, input.locale) }, ...input.history],
      }),
      signal: AbortSignal.timeout(40_000),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, reason: "api_error", detail: `${res.status} ${text.slice(0, 200)}` };
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = (data.choices?.[0]?.message?.content ?? "").trim();
    return { ok: true, reply, noInfo: isNoInfo(reply) };
  } catch (err) {
    return { ok: false, reason: "api_error", detail: err instanceof Error ? err.message : String(err) };
  }
}
