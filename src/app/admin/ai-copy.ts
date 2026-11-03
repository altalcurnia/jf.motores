"use server";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEEPSEEK_URL, DEFAULT_MODEL, usageCost } from "@/features/assistant/deepseek";
import { cleanBranchCopy } from "@/features/branches/clean-copy";

export type TranslateResult =
  | { ok: true; en: Record<string, string>; pt: Record<string, string> }
  | { ok: false; error: string };

export type GenerateCopyResult =
  | {
      ok: true;
      needsInfo: false;
      es: string;
      en: string;
      pt: string;
      summaryEs?: string;
      summaryEn?: string;
      summaryPt?: string;
    }
  | {
      ok: true;
      needsInfo: true;
      questions: string[];
      missingHint: string;
    }
  | { ok: false; error: string };

async function requireStaff() {
  const session = await getSession();
  if (!session || !session.role.isInternal) return null;
  if (
    !can(session, "catalogo.editar") &&
    !can(session, "empresa.editar") &&
    !can(session, "asesores.gestionar") &&
    !can(session, "asistente.gestionar")
  ) {
    return null;
  }
  const supabase = await createSupabaseServerClient();
  return { session, supabase };
}

async function callDeepSeekJson(
  system: string,
  user: string,
  maxTokens = 900,
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  const staff = await requireStaff();
  if (!staff) return { ok: false, error: "No tienes permiso para usar el asistente de IA." };

  const key = (process.env.DEEPSEEK_API_KEY ?? "").trim();
  if (!key) {
    return {
      ok: false,
      error: "Falta configurar DEEPSEEK_API_KEY en las variables de entorno (Vercel / .env.local).",
    };
  }

  const { data: settings } = await staff.supabase.from("ai_settings").select("model").maybeSingle();
  const model = settings?.model || DEFAULT_MODEL;

  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        thinking: { type: "disabled" },
        temperature: 0.15,
        max_tokens: maxTokens,
        stream: false,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(35_000),
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, error: `DeepSeek respondió con error (${res.status}): ${txt.slice(0, 160)}` };
    }

    const payload = (await res.json()) as {
      choices?: { message?: { content?: string | null } }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        prompt_cache_hit_tokens?: number;
        prompt_cache_miss_tokens?: number;
      };
    };

    const c = usageCost(model, payload.usage);
    if (c.cost > 0) {
      await staff.supabase.rpc("ai_charge", {
        cost: Math.min(1, Number(c.cost.toFixed(6))),
        tokens_in: c.tin,
        tokens_out: c.tout,
      });
    }

    const raw = (payload.choices?.[0]?.message?.content ?? "").trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    return { ok: true, data: parsed };
  } catch (err) {
    return {
      ok: false,
      error: `No se pudo completar la consulta a DeepSeek: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Traduce un conjunto de campos desde Español a Inglés (en) y Portugués brasileño (pt)
 * usando la misma API de DeepSeek, conservando referencias, medidas, números y nombres propios.
 */
export async function translateFieldsWithAi(fields: Record<string, string>, contextLabel?: string): Promise<TranslateResult> {
  const entries = Object.entries(fields)
    .map(([k, v]) => [k, (v ?? "").trim()] as const)
    .filter(([, v]) => v.length > 0);

  if (!entries.length) {
    return { ok: false, error: "Escribe primero el texto en español para poder traducirlo." };
  }

  const inputObj = Object.fromEntries(entries);
  const system = [
    "Eres el traductor técnico oficial de JF Motores (empresa colombiana de motobombas, motores diésel y repuestos para minería, agro e industria).",
    "Tu única tarea es traducir fielmente los textos dados en español hacia inglés (`en`) y portugués de Brasil (`pt`).",
    "REGLAS ESTRICTAS:",
    "1. NO agregues, inventes ni quites datos, cifras, referencias, direcciones ni horarios.",
    "2. Conserva intactos los códigos de referencia (ej. JF-M25), marcas, unidades técnicas (HP, L/min, m, RPM, pulg) y nombres de ciudades.",
    "3. Usa terminología técnica natural del sector de bombeo y motores diésel (p. ej. motobomba -> motor pump / motobomba; repuestos -> spare parts / peças de reposição; culata -> cylinder head / cabeçote).",
    '4. Responde ÚNICAMENTE con un objeto JSON válido con la forma exacta: {"en": {"clave": "..."}, "pt": {"clave": "..."}} con las mismas claves de entrada.',
  ].join("\n");

  const user = JSON.stringify({
    contexto: contextLabel ?? "Formulario del panel de administración de JF Motores",
    textos_es: inputObj,
  });

  const res = await callDeepSeekJson(system, user, 900);
  if (!res.ok) return res;

  const enRaw = (res.data.en ?? {}) as Record<string, unknown>;
  const ptRaw = (res.data.pt ?? {}) as Record<string, unknown>;
  const en: Record<string, string> = {};
  const pt: Record<string, string> = {};
  for (const [k] of entries) {
    if (typeof enRaw[k] === "string" && enRaw[k].trim()) en[k] = enRaw[k].trim();
    if (typeof ptRaw[k] === "string" && ptRaw[k].trim()) pt[k] = ptRaw[k].trim();
  }
  return { ok: true, en, pt };
}

export type BranchCopyContext = {
  kind: "sede";
  city: string;
  name: string;
  address?: string;
  phone?: string;
  hoursEs?: string;
  currentDescEs?: string;
  extraFacts?: string;
};

export type ProductCopyContext = {
  kind: "producto";
  catalog: "motobomba" | "motor" | "repuesto";
  ref: string;
  nameEs: string;
  categoryLabel?: string;
  engineModelLabel?: string;
  compatLabels?: string[];
  specs?: { key: string; label?: string; value: string }[];
  warrantyMonths?: number | null;
  currentSummaryEs?: string;
  currentDescEs?: string;
  extraFacts?: string;
};

/**
 * Genera descripciones (y traducciones en/pt) usando ÚNICAMENTE datos reales y verificables.
 * Si faltan datos esenciales para redactar sin inventar, devuelve `needsInfo: true` con preguntas concretas.
 */
export async function generateDescriptionWithAi(
  input: BranchCopyContext | ProductCopyContext,
): Promise<GenerateCopyResult> {
  const staff = await requireStaff();
  if (!staff) return { ok: false, error: "No tienes permiso para usar el asistente de IA." };

  // Validaciones previas rápidas antes de llamar al modelo: si faltan datos básicos, preguntar de inmediato
  if (input.kind === "sede") {
    const city = input.city.trim();
    const extra = (input.extraFacts ?? "").trim();
    if (!city) {
      return {
        ok: true,
        needsInfo: true,
        missingHint: "Para redactar la descripción con datos reales necesito saber al menos en qué ciudad está la sede y qué servicios u operaciones realiza.",
        questions: [
          "¿En qué ciudad o municipio está ubicada esta sede?",
          "¿Qué servicios u operaciones reales realiza? (ej.: ensamble y pruebas, venta directa, entrega inmediata de repuestos, despacho a minas)",
          "¿Tiene stock permanente para entrega inmediata o es punto de despacho regional?",
        ],
      };
    }
    if (!extra && !input.currentDescEs?.trim()) {
      return {
        ok: true,
        needsInfo: true,
        missingHint: `Para la sede de ${city}, confirma su especialidad o servicios reales (la dirección, teléfono y horario NO van aquí porque ya aparecen en campos dedicados al lado).`,
        questions: [
          `¿Qué actividades reales se realizan en la sede de ${city}? (ej.: ensamble de motobombas, banco de pruebas hidráulicas, bodega de repuestos de alta rotación, despacho directo)`,
          "¿Qué líneas o repuestos tienen disponibilidad permanente en este punto?",
          "¿Qué zonas o sectores productivos atiende prioritariamente (ej. minería del Bajo Cauca, proyectos agrícolas, etc.)?",
        ],
      };
    }
  } else {
    const nameEs = input.nameEs.trim();
    const filledSpecs = (input.specs ?? []).filter((s) => s.key.trim() && s.value.trim());
    const hasCompat = (input.compatLabels?.length ?? 0) > 0 || !!input.engineModelLabel?.trim();
    const extra = (input.extraFacts ?? "").trim();

    if (!nameEs && !input.ref.trim()) {
      return {
        ok: true,
        needsInfo: true,
        missingHint: "Para generar la descripción sin inventar datos, primero indica el nombre o la referencia real del producto.",
        questions: [
          "¿Cuál es el nombre y la referencia real del equipo o repuesto?",
          "¿Para qué aplicación real se utiliza (minería, riego agrícola, construcción, drenaje) o con qué motor es compatible?",
          "¿Cuáles son sus datos técnicos verificables principales (potencia, caudal, material, medidas)?",
        ],
      };
    }

    if (filledSpecs.length === 0 && !hasCompat && !extra && !input.currentDescEs?.trim()) {
      return {
        ok: true,
        needsInfo: true,
        missingHint: `Solo tengo el nombre «${nameEs || input.ref}» sin especificaciones técnicas ni compatibilidades cargadas. Para cumplir la regla de usar solo datos reales y verificables, confírmame estos datos antes de redactar:`,
        questions: [
          input.catalog === "repuesto"
            ? "¿Con qué motores o equipos es compatible este repuesto y cuál es su función o material real?"
            : "¿Cuáles son los datos técnicos reales de este equipo (potencia HP, caudal, altura de bombeo, tipo de combustible o arranque)?",
          "¿Para qué tipo de trabajo real está recomendado (ej. minería de aluvión, tajo abierto, riego, bombeo de caudal)?",
          "¿Qué incluye realmente la entrega (ej. chasis, tablero, acople, garantía)?",
        ],
      };
    }
  }

  // Consultamos documentos activos de conocimiento por si contienen datos verificables de ese modelo/sede
  const { data: docs } = await staff.supabase
    .from("ai_documents")
    .select("title, content")
    .eq("active", true)
    .limit(4);

  const docSnippets = (docs ?? [])
    .map((d) => `Documento «${d.title}»:\n${d.content.slice(0, 1500)}`)
    .join("\n\n");

  const system = [
    "Eres el redactor técnico verificador de JF Motores (Colombia).",
    "REGLA DE ORO INQUEBRANTABLE (Ley 1480 de Colombia — Estatuto del Consumidor):",
    "1. SOLO puedes usar hechos, cifras, especificaciones y servicios que aparezcan explícitamente en los DATOS VERIFICADOS entregados por el usuario o en los documentos internos adjuntos.",
    "2. PROHIBIDO inventar potencias, caudales, alturas, materiales, años de experiencia, certificaciones o servicios que no estén en los datos.",
    "3. REGLA ESTRICTA DE CERO REDUNDANCIA PARA SEDES:",
    "   - En la página pública de la sede, la DIRECCIÓN FÍSICA, el NÚMERO DE TELÉFONO y el HORARIO DE ATENCIÓN ya se muestran en campos dedicados destacados justo al lado de la descripción.",
    "   - Por lo tanto, ESTÁ TOTALMENTE PROHIBIDO incluir o repetir en la descripción:",
    "     * La dirección física, calles, carreras, números o puntos de referencia de llegada.",
    "     * El número de teléfono, celular o WhatsApp.",
    "     * Los horarios, días de atención o frases como 'Atendemos de lunes a...', 'Abierto de...'.",
    "     * Clichés como 'Visítanos en...', 'Comunícate al...', 'Te esperamos en...'.",
    "   - La descripción de una sede debe centrarse EXCLUSIVAMENTE en:",
    "     * El rol operativo de la sede (ej. centro de ensamble, banco de pruebas hidráulicas, bodega de repuestos de alta rotación, despacho directo a mina).",
    "     * Disponibilidad real de equipos y repuestos en ese punto.",
    "     * Zonas o sectores productivos atendidos (ej. minería del Bajo Cauca, proyectos agrícolas, Antioquia y despacho nacional).",
    "   - Extensión para sedes: 1 o máximo 2 frases directas, técnicas y concisas (máximo 200 caracteres en total).",
    "4. Si los datos entregados todavía son ambiguos o insuficientes para redactar un texto veraz, devuelve:",
    '   {"needsInfo": true, "missingHint": "Explicación breve en español de qué dato falta", "questions": ["Pregunta 1", "Pregunta 2"]}',
    "5. Si los datos son suficientes y verificables, redacta un copy claro, directo, profesional y persuasivo basado 100% en esos hechos reales, y tradúcelo también a inglés (`en`) y portugués (`pt`). Devuelve:",
    '   {"needsInfo": false, "es": "...", "en": "...", "pt": "...", "summaryEs": "...", "summaryEn": "...", "summaryPt": "..."}',
    "   - Para un producto: `es`, `en`, `pt` deben ser una descripción comercial y técnica clara (2 a 4 frases, sin inventar nada) y `summaryEs`, `summaryEn`, `summaryPt` un resumen corto para la tarjeta (máximo 110 caracteres).",
    "6. Responde ÚNICAMENTE con un objeto JSON válido.",
  ].join("\n");

  const user = JSON.stringify({
    tipo_de_contenido: input.kind,
    datos_verificados:
      input.kind === "sede"
        ? {
            sede: input.name || `Sede ${input.city}`,
            ciudad: input.city,
            servicios_y_operaciones_reales: input.extraFacts || "Venta de motobombas, motores diésel y repuestos",
            descripcion_anterior_a_mejorar: input.currentDescEs || undefined,
            instruccion_antirredundancia:
              "PROHIBIDO escribir la dirección, teléfono u horarios; esos datos ya están en los bloques vecinos. Enfócate solo en la función operativa, equipos disponibles y zonas atendidas.",
          }
        : input,
    documentos_internos_verificados: docSnippets || "Sin documentos adicionales",
  });

  const res = await callDeepSeekJson(system, user, 1000);
  if (!res.ok) return res;

  if (res.data.needsInfo === true) {
    const questions = Array.isArray(res.data.questions)
      ? res.data.questions.map((q) => String(q).trim()).filter(Boolean)
      : ["¿Qué datos reales o servicios específicos quieres incluir en la descripción?"];
    const missingHint =
      typeof res.data.missingHint === "string" && res.data.missingHint.trim()
        ? res.data.missingHint.trim()
        : "Necesito confirmar algunos datos reales antes de generar el texto.";
    return { ok: true, needsInfo: true, questions, missingHint };
  }

  let es = typeof res.data.es === "string" ? res.data.es.trim() : "";
  let en = typeof res.data.en === "string" ? res.data.en.trim() : "";
  let pt = typeof res.data.pt === "string" ? res.data.pt.trim() : "";
  if (!es) {
    return { ok: false, error: "La IA no devolvió un texto válido. Intenta de nuevo." };
  }

  if (input.kind === "sede") {
    es = cleanBranchCopy(es);
    en = cleanBranchCopy(en);
    pt = cleanBranchCopy(pt);
  }

  return {
    ok: true,
    needsInfo: false,
    es,
    en,
    pt,
    summaryEs: typeof res.data.summaryEs === "string" ? res.data.summaryEs.trim() : undefined,
    summaryEn: typeof res.data.summaryEn === "string" ? res.data.summaryEn.trim() : undefined,
    summaryPt: typeof res.data.summaryPt === "string" ? res.data.summaryPt.trim() : undefined,
  };
}

