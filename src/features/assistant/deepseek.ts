import "server-only";
import { handoffSummary, isNoInfo, isOfficialUrl, systemPrompt, type AssistantLocale, type ChatTurn, type KnowledgeDoc } from "./harness";

export const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
export const DEFAULT_MODEL = "deepseek-flash";
const TAVILY_URL = "https://api.tavily.com/search";

export type AskResult =
  | { ok: true; reply: string; noInfo: boolean; handoff: string | null; sources: string[] }
  | { ok: false; reason: "no_key" | "no_docs" | "api_error"; detail?: string };

/** ¿Está configurada la clave en el servidor? (nunca se expone su valor) */
export function hasDeepSeekKey(): boolean {
  return (process.env.DEEPSEEK_API_KEY ?? "").trim().length > 10;
}
export function hasSearchKey(): boolean {
  return (process.env.TAVILY_API_KEY ?? "").trim().length > 10;
}

type Msg =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };
type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

const SEARCH_TOOL = {
  type: "function",
  function: {
    name: "buscar_fuente_oficial",
    description:
      "Busca en los sitios web OFICIALES de fabricantes de motores, bombas y repuestos (solo dominios permitidos). Úsala para verificar un dato técnico de una marca. Devuelve título, enlace y fragmento.",
    parameters: {
      type: "object",
      properties: { consulta: { type: "string", description: "Qué verificar, con marca y modelo si los hay" } },
      required: ["consulta"],
    },
  },
};

/** Búsqueda limitada a dominios oficiales; descarta cualquier resultado fuera de la lista. */
async function officialSearch(query: string, domains: string[]): Promise<{ title: string; url: string; content: string }[]> {
  const key = (process.env.TAVILY_API_KEY ?? "").trim();
  if (!key || !domains.length) return [];
  try {
    const res = await fetch(TAVILY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query: query.slice(0, 300), include_domains: domains, max_results: 5, search_depth: "basic" }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] };
    return (data.results ?? [])
      .filter((r) => r.url && isOfficialUrl(r.url, domains))
      .map((r) => ({ title: (r.title ?? "").slice(0, 160), url: r.url!, content: (r.content ?? "").slice(0, 700) }));
  } catch {
    return [];
  }
}

/** Pregunta al modelo con el arnés estricto (y, si está activa, verificación en fuentes oficiales). Solo servidor. */
export async function askAssistant(input: {
  docs: KnowledgeDoc[];
  model?: string;
  history: ChatTurn[];
  locale: AssistantLocale;
  catalog?: string;
  webVerify?: boolean;
  officialDomains?: string[];
}): Promise<AskResult> {
  const key = (process.env.DEEPSEEK_API_KEY ?? "").trim();
  if (!key) return { ok: false, reason: "no_key" };
  if (!input.docs.length && !input.catalog) return { ok: false, reason: "no_docs" };
  const web = !!input.webVerify && hasSearchKey() && !!input.officialDomains?.length;
  const messages: Msg[] = [
    { role: "system", content: systemPrompt(input.docs, input.locale, { catalog: input.catalog, webVerify: web, officialDomains: input.officialDomains }) },
    ...input.history,
  ];
  const sources: string[] = [];
  try {
    for (let round = 0; round < 3; round++) {
      const res = await fetch(DEEPSEEK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: input.model || DEFAULT_MODEL,
          temperature: 0.1,
          max_tokens: 600,
          stream: false,
          messages,
          ...(web && round < 2 ? { tools: [SEARCH_TOOL], tool_choice: "auto" } : {}),
        }),
        signal: AbortSignal.timeout(40_000),
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, reason: "api_error", detail: `${res.status} ${text.slice(0, 200)}` };
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[] };
      const msg = data.choices?.[0]?.message;
      const calls = msg?.tool_calls ?? [];
      if (calls.length && web && round < 2) {
        messages.push({ role: "assistant", content: msg?.content ?? null, tool_calls: calls });
        for (const call of calls.slice(0, 3)) {
          let q = "";
          try {
            q = String((JSON.parse(call.function.arguments) as { consulta?: string }).consulta ?? "");
          } catch {}
          const results = call.function.name === "buscar_fuente_oficial" && q ? await officialSearch(q, input.officialDomains!) : [];
          sources.push(...results.map((r) => r.url));
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: results.length ? JSON.stringify(results) : "Sin resultados en sitios oficiales. No uses otra fuente.",
          });
        }
        continue;
      }
      const reply = (msg?.content ?? "").trim();
      const handoff = handoffSummary(reply);
      return { ok: true, reply, noInfo: handoff === null && isNoInfo(reply), handoff, sources };
    }
    return { ok: true, reply: "", noInfo: false, handoff: "No se pudo verificar la información a tiempo.", sources };
  } catch (err) {
    return { ok: false, reason: "api_error", detail: err instanceof Error ? err.message : String(err) };
  }
}
