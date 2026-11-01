import "server-only";
import { handoffSummary, isNoInfo, isOfficialUrl, siteMap, systemPrompt, visibleReply, type AssistantLocale, type ChatTurn, type KnowledgeDoc } from "./harness";

export const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
export const DEFAULT_MODEL = "deepseek-flash";
const TAVILY_URL = "https://api.tavily.com/search";

export type Usage = { costUsd: number; tokensIn: number; tokensOut: number; searches: number };
export type AskResult =
  | { ok: true; reply: string; noInfo: boolean; handoff: string | null; sources: string[]; usage: Usage }
  | { ok: false; reason: "no_key" | "no_docs" | "api_error"; detail?: string; usage?: Usage };

/**
 * Precios por millón de tokens (US$), tarifa de hora pico para ir a la segura.
 * Fuente: https://api-docs.deepseek.com/quick_start/pricing (noviembre de 2026).
 */
const PRICES: Record<string, { hit: number; miss: number; out: number }> = {
  "deepseek-flash": { hit: 0.006, miss: 0.3, out: 1.2 },
  "deepseek-v4-pro": { hit: 0.044, miss: 1.32, out: 3.96 },
};
/** Costo aproximado de una búsqueda en fuentes oficiales (Tavily, 1 crédito). */
export const SEARCH_COST_USD = 0.008;

type ApiUsage = { prompt_tokens?: number; completion_tokens?: number; prompt_cache_hit_tokens?: number; prompt_cache_miss_tokens?: number };
export function usageCost(model: string, u: ApiUsage | undefined): { cost: number; tin: number; tout: number } {
  const p = PRICES[model] ?? PRICES["deepseek-v4-pro"];
  const tin = u?.prompt_tokens ?? 0;
  const hit = u?.prompt_cache_hit_tokens ?? 0;
  const miss = u?.prompt_cache_miss_tokens ?? Math.max(0, tin - hit);
  const tout = u?.completion_tokens ?? 0;
  return { cost: (hit * p.hit + miss * p.miss + tout * p.out) / 1_000_000, tin, tout };
}

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
  /** URL pública del sitio para armar los enlaces del mapa. */
  siteUrl?: string;
}): Promise<AskResult> {
  const key = (process.env.DEEPSEEK_API_KEY ?? "").trim();
  if (!key) return { ok: false, reason: "no_key" };
  if (!input.docs.length && !input.catalog) return { ok: false, reason: "no_docs" };
  const web = !!input.webVerify && hasSearchKey() && !!input.officialDomains?.length;
  const messages: Msg[] = [
    {
      role: "system",
      content: systemPrompt(input.docs, input.locale, {
        catalog: input.catalog,
        webVerify: web,
        officialDomains: input.officialDomains,
        siteMap: siteMap(input.siteUrl ?? "", input.locale),
      }),
    },
    ...input.history,
  ];
  const sources: string[] = [];
  const model = input.model || DEFAULT_MODEL;
  const usage: Usage = { costUsd: 0, tokensIn: 0, tokensOut: 0, searches: 0 };
  try {
    for (let round = 0; round < 3; round++) {
      const res = await fetch(DEEPSEEK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          // Sin modo de razonamiento: si no, el razonamiento se come el límite y la respuesta sale cortada
          thinking: { type: "disabled" },
          temperature: 0.2,
          max_tokens: 900,
          stream: false,
          messages,
          ...(web && round < 2 ? { tools: [SEARCH_TOOL], tool_choice: "auto" } : {}),
        }),
        signal: AbortSignal.timeout(40_000),
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, reason: "api_error", detail: `${res.status} ${text.slice(0, 200)}`, usage };
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] }; finish_reason?: string }[];
        usage?: ApiUsage;
      };
      const c = usageCost(model, data.usage);
      usage.costUsd += c.cost;
      usage.tokensIn += c.tin;
      usage.tokensOut += c.tout;
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
          if (q) {
            usage.searches += 1;
            usage.costUsd += SEARCH_COST_USD;
          }
          sources.push(...results.map((r) => r.url));
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: results.length ? JSON.stringify(results) : "Sin resultados en sitios oficiales. No uses otra fuente.",
          });
        }
        continue;
      }
      const raw = (msg?.content ?? "").trim();
      const handoff = handoffSummary(raw);
      const reply = visibleReply(raw);
      return { ok: true, reply, noInfo: handoff === null && isNoInfo(raw) && !reply, handoff, sources, usage };
    }
    return { ok: true, reply: "", noInfo: false, handoff: "No se pudo verificar la información a tiempo.", sources, usage };
  } catch (err) {
    return { ok: false, reason: "api_error", detail: err instanceof Error ? err.message : String(err), usage };
  }
}
