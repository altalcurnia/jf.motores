import { site } from "@/lib/site";
import { NextResponse, type NextRequest } from "next/server";
import { askAssistant } from "@/features/assistant/deepseek";
import { getAssistantContext, rateLimited } from "@/features/assistant/context";
import { sanitizeHistory, type AssistantLocale } from "@/features/assistant/harness";
import { catalogForAssistant } from "@/features/assistant/catalog-text";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Budget = { ok: boolean; reason?: string; limit_usd?: number; used_usd?: number };

/** Cupo del mes del usuario con sesión (o null si no inició sesión). */
async function budgetOf(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.rpc("ai_budget");
  const b = (data ?? { ok: false }) as Budget;
  const limit = Number(b.limit_usd ?? 0);
  const used = Number(b.used_usd ?? 0);
  return { userId: auth.user.id, limit, used, left: Math.max(0, limit - used) };
}

/** Estado para abrir el chat: si hay sesión y cuánto cupo queda (porcentaje). */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const b = await budgetOf(supabase);
  if (!b) return NextResponse.json({ login: false });
  return NextResponse.json({ login: true, leftPct: b.limit > 0 ? Math.round((b.left / b.limit) * 100) : 0 });
}

/**
 * Chat del asistente (solo con cuenta). Responde { reply }, { code: "handoff", summary } o
 * { code } (login | quota | disabled | limit | no_info | unavailable). No guarda las conversaciones;
 * solo suma el costo de cada respuesta al cupo mensual del usuario.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(`web:${ip}`)) return NextResponse.json({ code: "limit" }, { status: 429 });

  let body: { messages?: unknown; locale?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "bad_request" }, { status: 400 });
  }
  const history = sanitizeHistory(body.messages);
  if (!history.length) return NextResponse.json({ code: "bad_request" }, { status: 400 });
  const locale: AssistantLocale = body.locale === "en" || body.locale === "pt" ? body.locale : "es";

  const ctx = await getAssistantContext();
  if (!ctx.enabled) return NextResponse.json({ code: "disabled" }, { status: 403 });

  const supabase = await createSupabaseServerClient();
  const budget = await budgetOf(supabase);
  if (!budget) return NextResponse.json({ code: "login" }, { status: 401 });
  if (rateLimited(`user:${budget.userId}`, 30)) return NextResponse.json({ code: "limit" }, { status: 429 });
  if (budget.left <= 0.0005) return NextResponse.json({ code: "quota" }, { status: 402 });

  const r = await askAssistant({
    siteUrl: site.url,
    docs: ctx.docs,
    model: ctx.model,
    history,
    locale,
    catalog: await catalogForAssistant(locale),
    webVerify: ctx.webVerify,
    officialDomains: ctx.officialDomains,
  });
  if (r.usage && r.usage.costUsd > 0) {
    const { error } = await supabase.rpc("ai_charge", {
      cost: Math.min(1, Number(r.usage.costUsd.toFixed(6))),
      tokens_in: r.usage.tokensIn,
      tokens_out: r.usage.tokensOut,
    });
    if (error) console.error("Asistente IA: no se pudo registrar el consumo", error.message);
  }
  if (!r.ok) {
    console.error("Asistente IA:", r.reason, r.detail ?? "");
    return NextResponse.json({ code: "unavailable" }, { status: 503 });
  }
  // Traspaso a un asesor: se muestra la respuesta útil (si la hay) con el botón de WhatsApp
  if (r.handoff !== null) return NextResponse.json({ code: "handoff", summary: r.handoff, reply: r.reply || undefined });
  if (r.noInfo) return NextResponse.json({ code: "no_info" });
  return NextResponse.json({ reply: r.reply });
}
