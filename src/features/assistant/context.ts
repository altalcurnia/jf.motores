import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { KnowledgeDoc } from "./harness";

export type AssistantContext = { enabled: boolean; model: string; docs: KnowledgeDoc[] };

/** Ajustes y documentos del asistente (cacheado; el panel lo refresca al guardar). */
export async function getAssistantContext(): Promise<AssistantContext> {
  "use cache";
  cacheLife("minutes");
  cacheTag("assistant");
  try {
    const { data, error } = await createSupabasePublicClient().rpc("assistant_context");
    if (error || !data || typeof data !== "object") return { enabled: false, model: "", docs: [] };
    const d = data as { enabled?: boolean; model?: string; docs?: KnowledgeDoc[] };
    return { enabled: !!d.enabled, model: d.model ?? "", docs: Array.isArray(d.docs) ? d.docs : [] };
  } catch {
    return { enabled: false, model: "", docs: [] };
  }
}

/** Límite simple de mensajes por persona (por instancia del servidor). */
const hits = new Map<string, number[]>();
export function rateLimited(id: string, max = 20, windowMs = 10 * 60_000): boolean {
  const now = Date.now();
  const list = (hits.get(id) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(id, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}
