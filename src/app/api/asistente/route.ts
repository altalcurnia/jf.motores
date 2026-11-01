import { NextResponse, type NextRequest } from "next/server";
import { askAssistant } from "@/features/assistant/deepseek";
import { getAssistantContext, rateLimited } from "@/features/assistant/context";
import { sanitizeHistory, type AssistantLocale } from "@/features/assistant/harness";

/**
 * Chat público del asistente. Responde { reply } o { code } (disabled | limit | no_info | unavailable).
 * No guarda las conversaciones.
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

  const r = await askAssistant({ docs: ctx.docs, model: ctx.model, history, locale });
  if (!r.ok) {
    console.error("Asistente IA:", r.reason, r.detail ?? "");
    return NextResponse.json({ code: "unavailable" }, { status: 503 });
  }
  if (r.noInfo) return NextResponse.json({ code: "no_info" });
  return NextResponse.json({ reply: r.reply });
}
