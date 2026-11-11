import "server-only";
import { site } from "@/lib/site";
import { askAssistant } from "./deepseek";
import { getAssistantContext, rateLimited } from "./context";
import { catalogForAssistant } from "./catalog-text";
import { plainLinks } from "./links";
import type { AssistantLocale } from "./harness";
import { buildWhatsAppUrl } from "@/features/whatsapp/link";
import { dictionaryFor } from "@/i18n/dictionaries";
import { getContact } from "@/lib/supabase/public";
import { reportError } from "@/lib/report-error";

export type BotChannel = "telegram" | "whatsapp";

/** Tope de gasto mensual del bot (null = sin control de gasto disponible). */
export type BotBudget = { spent: () => Promise<number>; cap: number; charge: (usd: number) => Promise<void> };

export type BotAnswer = {
  text: string;
  /** Resumen para el asesor cuando el cliente pide hablar con una persona (o la IA no puede confirmar algo). */
  handoff: string | null;
};

/** Idioma del cliente a partir del código de su app (es, en, pt…). */
export function botLocale(code: string | null | undefined): AssistantLocale {
  const c = (code ?? "es").toLowerCase();
  return c.startsWith("pt") ? "pt" : c.startsWith("en") ? "en" : "es";
}

/**
 * Asistente de ventas y técnico para bots (Telegram y WhatsApp). Usa los mismos documentos, catálogo y reglas
 * que el chat de la página. Nunca deja al cliente sin salida: ante límite, tope de gasto o fallo, ofrece WhatsApp.
 * No guarda conversaciones.
 */
export async function botAnswer(opts: {
  channel: BotChannel;
  chatKey: string;
  text: string;
  locale: AssistantLocale;
  budget: BotBudget | null;
}): Promise<BotAnswer> {
  const { channel, locale } = opts;
  const t = (await dictionaryFor(locale)).assistant;
  const line = (await getContact()).whatsapp;
  const wa = buildWhatsAppUrl(line, t.waMessage);
  const out = (text: string, handoff: string | null = null): BotAnswer => ({ text, handoff });

  if (rateLimited(`${channel}:${opts.chatKey}`)) return out(`${t.limit}\n${wa}`);
  const ctx = await getAssistantContext();
  if (!ctx.enabled) return out(`${t.disabled}\n${wa}`);
  if (opts.budget && opts.budget.cap > 0 && (await opts.budget.spent()) >= opts.budget.cap) return out(`${t.botBudget}\n${wa}`);
  if (opts.budget && opts.budget.cap <= 0) return out(`${t.botBudget}\n${wa}`);

  const r = await askAssistant({
    siteUrl: site.url,
    docs: ctx.docs,
    model: ctx.model,
    history: [{ role: "user", content: opts.text.slice(0, 800) }],
    locale,
    catalog: await catalogForAssistant(locale),
    webVerify: ctx.webVerify,
    officialDomains: ctx.officialDomains,
  });
  if (r.usage && r.usage.costUsd > 0 && opts.budget) {
    await opts.budget.charge(r.usage.costUsd).catch((e) => reportError(`Bot ${channel}: no se pudo sumar el gasto`, e));
  }
  if (!r.ok) {
    reportError(`Asistente IA (${channel})`, r.reason, { detail: r.detail });
    return out(`${t.unavailable}\n${wa}`);
  }
  if (r.handoff !== null) {
    const reply = r.reply ? plainLinks(r.reply) : t.handoff;
    // En WhatsApp el cliente ya está en WhatsApp: el equipo recibe el aviso y le escribe
    if (channel === "whatsapp") return out(`${reply}\n\n${t.handoffWa.replace("{wa}", wa)}`, r.handoff);
    return out(`${reply}\n\n${buildWhatsAppUrl(line, `${t.waMessage}\n${t.waSummary}${r.handoff}`)}`, r.handoff);
  }
  return out(r.noInfo ? `${t.noInfo}\n${wa}` : plainLinks(r.reply));
}
