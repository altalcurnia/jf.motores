"use server";
import { randomBytes } from "node:crypto";
import { updateTag } from "next/cache";
import { extractText, getDocumentProxy } from "unpdf";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { site } from "@/lib/site";
import { askAssistant } from "@/features/assistant/deepseek";
import { cleanDomains, sanitizeHistory } from "@/features/assistant/harness";
import { catalogForAssistant } from "@/features/assistant/catalog-text";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

async function manager() {
  const session = await getSession();
  if (!session || !session.role.isInternal || !can(session, "asistente.gestionar")) return null;
  return { session, supabase: await createSupabaseServerClient() };
}

export async function saveSettings(input: {
  enabled: boolean;
  model: string;
  webVerify: boolean;
  domains: string;
}): Promise<ActionResult> {
  const m = await manager();
  if (!m) return { ok: false, error: "No tienes permiso para configurar el asistente." };
  const model = input.model.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9.-]{2,39}$/.test(model)) return { ok: false, error: "Nombre de modelo inválido." };
  const { error } = await m.supabase
    .from("ai_settings")
    .update({
      enabled: input.enabled,
      model,
      web_verify: input.webVerify,
      official_domains: cleanDomains(input.domains.split(/[\s,;]+/)),
      updated_at: new Date().toISOString(),
      updated_by: m.session.userId,
    })
    .eq("id", true);
  if (error) return { ok: false, error: error.message };
  updateTag("assistant");
  return { ok: true };
}

const lockedMsg = (e: { message: string; hint?: string | null }) =>
  e.hint === "unlock_required" ? "Este bloque está bloqueado: confirma tu contraseña en su candado." : e.message;

/** Cupo de clientes. La base de datos exige que el propietario haya abierto el candado “ia_clientes”. */
export async function saveCustomerBudget(input: { base: number; perMillion: number; max: number }): Promise<ActionResult> {
  const m = await manager();
  if (!m || !m.session.isOwner) return { ok: false, error: "Solo el propietario puede cambiar los cupos." };
  const v = [input.base, input.perMillion, input.max];
  if (v.some((x) => !Number.isFinite(x) || x < 0) || input.base > 10 || input.perMillion > 10 || input.max > 50) {
    return { ok: false, error: "Revisa los valores: base y valor por millón entre 0 y 10 dólares; tope entre 0 y 50." };
  }
  const { error } = await m.supabase
    .from("ai_settings")
    .update({ budget_base_usd: input.base, budget_per_million_cop_usd: input.perMillion, budget_max_usd: input.max })
    .eq("id", true);
  if (error) return { ok: false, error: lockedMsg(error) };
  return { ok: true, message: "Cupos de clientes guardados." };
}

/** Cupo mensual de cada rol interno. La base de datos exige el candado “ia_personal”. */
export async function saveStaffBudgets(list: { key: string; usd: number }[]): Promise<ActionResult> {
  const m = await manager();
  if (!m || !m.session.isOwner) return { ok: false, error: "Solo el propietario puede cambiar los cupos." };
  if (list.some((r) => !Number.isFinite(r.usd) || r.usd < 0 || r.usd > 50)) return { ok: false, error: "Cada cupo debe estar entre 0 y 50 dólares." };
  for (const r of list) {
    const { error } = await m.supabase.rpc("set_role_ai_budget", { role_key: r.key, usd: r.usd });
    if (error) return { ok: false, error: lockedMsg(error) };
  }
  return { ok: true, message: "Cupos del personal guardados." };
}

/** Lee el PDF ya subido al bucket privado, extrae su texto y lo guarda como fuente del asistente. */
export async function addDocument(input: { title: string; path: string }): Promise<ActionResult> {
  const m = await manager();
  if (!m) return { ok: false, error: "No tienes permiso para cargar documentos." };
  const title = input.title.trim().slice(0, 120);
  if (title.length < 2) return { ok: false, error: "Escribe un título para el documento." };
  if (!/^[a-z0-9-]+\.pdf$/.test(input.path)) return { ok: false, error: "Archivo inválido." };

  const { data: file, error: e1 } = await m.supabase.storage.from("conocimiento").download(input.path);
  if (e1 || !file) return { ok: false, error: `No se pudo leer el PDF: ${e1?.message ?? "sin datos"}` };
  let content = "";
  try {
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const { text } = await extractText(pdf, { mergePages: true });
    content = (Array.isArray(text) ? text.join("\n") : text).replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    return { ok: false, error: "No se pudo leer el texto del PDF. Si es un escaneo (imagen), súbelo con texto seleccionable." };
  }
  if (content.length < 50) return { ok: false, error: "El PDF casi no tiene texto seleccionable (¿es un escaneo?)." };
  if (content.length > 400_000) content = content.slice(0, 400_000);

  const { error } = await m.supabase
    .from("ai_documents")
    .insert({ title, file_path: input.path, content, created_by: m.session.userId });
  if (error) return { ok: false, error: error.message };
  updateTag("assistant");
  return { ok: true, message: `Documento cargado (${content.length.toLocaleString("es-CO")} caracteres de texto).` };
}

export async function setDocumentActive(id: string, active: boolean): Promise<ActionResult> {
  const m = await manager();
  if (!m) return { ok: false, error: "No tienes permiso." };
  const { error } = await m.supabase.from("ai_documents").update({ active }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  updateTag("assistant");
  return { ok: true };
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  const m = await manager();
  if (!m) return { ok: false, error: "No tienes permiso." };
  const { data: doc } = await m.supabase.from("ai_documents").select("file_path").eq("id", id).maybeSingle();
  const { error } = await m.supabase.from("ai_documents").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (doc?.file_path) await m.supabase.storage.from("conocimiento").remove([doc.file_path]);
  updateTag("assistant");
  return { ok: true };
}

/** Prueba el asistente con los documentos activos, aunque esté apagado para el público. */
export async function testAssistant(
  question: string,
): Promise<{ ok: true; reply: string; noInfo: boolean; handoff: string | null; sources: string[] } | { ok: false; error: string }> {
  const m = await manager();
  if (!m) return { ok: false, error: "No tienes permiso." };
  const history = sanitizeHistory([{ role: "user", content: question }]);
  if (!history.length) return { ok: false, error: "Escribe una pregunta." };
  const [{ data: docs }, { data: settings }] = await Promise.all([
    m.supabase.from("ai_documents").select("title, content").eq("active", true).order("created_at"),
    m.supabase.from("ai_settings").select("model, web_verify, official_domains").maybeSingle(),
  ]);
  const r = await askAssistant({
    siteUrl: site.url,
    docs: docs ?? [],
    model: settings?.model,
    history,
    locale: "es",
    catalog: await catalogForAssistant("es"),
    webVerify: settings?.web_verify,
    officialDomains: settings?.official_domains,
  });
  if (!r.ok) {
    const why = { no_key: "Falta la clave DEEPSEEK_API_KEY en Vercel.", no_docs: "No hay documentos activos.", api_error: `DeepSeek respondió con error: ${r.detail ?? ""}` };
    return { ok: false, error: why[r.reason] };
  }
  return { ok: true, reply: r.reply, noInfo: r.noInfo, handoff: r.handoff, sources: r.sources };
}

/** Registra el webhook del bot de Telegram (usa TELEGRAM_BOT_TOKEN y TELEGRAM_WEBHOOK_SECRET de Vercel). */
export async function connectTelegram(): Promise<ActionResult> {
  const m = await manager();
  if (!m) return { ok: false, error: "No tienes permiso." };
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !secret) return { ok: false, error: "Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_WEBHOOK_SECRET en Vercel." };
  if (!/^[A-Za-z0-9_-]{16,256}$/.test(secret)) return { ok: false, error: "TELEGRAM_WEBHOOK_SECRET solo puede tener letras, números, _ y - (16 a 256)." };
  const url = `${site.url}/api/telegram`;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, secret_token: secret, allowed_updates: ["message"], drop_pending_updates: true }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json()) as { ok?: boolean; description?: string };
    if (!data.ok) return { ok: false, error: `Telegram: ${data.description ?? res.status}` };
    return { ok: true, message: `Bot conectado a ${url}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Nombre aleatorio para el PDF en el bucket. */
export async function newDocumentPath(): Promise<string> {
  return `${randomBytes(12).toString("hex")}.pdf`;
}
