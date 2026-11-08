import { Suspense } from "react";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasDeepSeekKey, hasSearchKey } from "@/features/assistant/deepseek";
import { AdminTopbar } from "../AdminTopbar";
import { AssistantAdmin, type DocRow } from "./AssistantAdmin";
import { BotsPanel, type BotsProps } from "./BotsPanel";
import { whatsappConfig } from "@/features/whatsapp/cloud";
import { site } from "@/lib/site";

export const metadata = { title: "Asistente de IA" };

export default function AssistantAdminPage() {
  return (
    <main className="shell">
      <AdminTopbar />
      <h1>Asistente de ventas con IA</h1>
      <p className="muted lead">
        Responde las 24 horas en el botón “Soporte” del sitio, usando{" "}
        <b>solo</b> los PDF que cargues aquí. Si la respuesta no está en los
        documentos, dice que no la tiene y ofrece WhatsApp. No guarda las
        conversaciones.
      </p>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <Body />
      </Suspense>
    </main>
  );
}

async function Body() {
  const session = await getSession();
  if (
    !session ||
    !session.role.isInternal ||
    !can(session, "asistente.gestionar")
  ) {
    return (
      <div className="notice err">
        No tienes permiso para configurar el asistente.
      </div>
    );
  }
  const supabase = await createSupabaseServerClient();
  const [{ data: settings }, { data: docs, error }] = await Promise.all([
    supabase
      .from("ai_settings")
      .select(
        "enabled, model, web_verify, official_domains, budget_base_usd, budget_per_million_cop_usd, budget_max_usd",
      )
      .maybeSingle(),
    supabase
      .from("ai_documents")
      .select("id, title, content, active, is_test, created_at")
      .order("created_at"),
  ]);
  if (error)
    return (
      <div className="notice err">
        No se pudieron leer los documentos: {error.message}
      </div>
    );
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }),
  );
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const [{ data: staffRoles }, locks] = await Promise.all([
    supabase
      .from("roles")
      .select("key, name, ai_budget_usd")
      .eq("is_internal", true)
      .order("id"),
    session.isOwner
      ? supabase.rpc("owner_scope_status")
      : Promise.resolve({ data: null }),
  ]);
  const lockMap = (locks.data ?? {}) as Record<string, string>;
  const { data: usage } = await supabase
    .from("ai_usage")
    .select("cost_usd, requests, profiles ( email )")
    .eq("month", month)
    .order("cost_usd", { ascending: false })
    .limit(50);
  const rows: DocRow[] = (docs ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    chars: d.content.length,
    active: d.active,
    isTest: d.is_test,
    createdAt: d.created_at.slice(0, 10),
  }));
  const bots = await botsProps(supabase, month);
  return (
    <>
      <AssistantAdmin
        enabled={settings?.enabled ?? false}
        model={settings?.model ?? "deepseek-flash"}
        docs={rows}
        keyConfigured={hasDeepSeekKey()}
        searchConfigured={hasSearchKey()}
        webVerify={settings?.web_verify ?? false}
        domains={settings?.official_domains ?? []}
        budget={{
          base: Number(settings?.budget_base_usd ?? 0.1),
          perMillion: Number(settings?.budget_per_million_cop_usd ?? 0.08),
          max: Number(settings?.budget_max_usd ?? 2),
        }}
        isOwner={session.isOwner}
        locks={{
          personal: lockMap.ia_personal ?? null,
          clientes: lockMap.ia_clientes ?? null,
        }}
        staff={(staffRoles ?? []).map((r) => ({
          key: r.key,
          name: r.name,
          usd: r.ai_budget_usd == null ? null : Number(r.ai_budget_usd),
        }))}
        usage={(usage ?? []).map((u) => ({
          email: u.profiles?.email ?? "—",
          cost: Number(u.cost_usd),
          requests: u.requests,
        }))}
      />
      <h2>Bots en Telegram y WhatsApp</h2>
      <BotsPanel {...bots} />
    </>
  );
}

/** Estado y ajustes de los bots (el panel lee con la sesión del usuario; RLS exige asistente.gestionar). */
async function botsProps(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  month: string,
): Promise<BotsProps> {
  const env = process.env;
  const [{ data: tg }, { data: tgUsage }] = await Promise.all([
    supabase
      .from("telegram_settings")
      .select(
        "public_enabled, test_chats, team_chats, notify_leads, monthly_cap_usd",
      )
      .maybeSingle(),
    supabase
      .from("telegram_usage")
      .select("cost_usd, messages")
      .eq("month", month)
      .maybeSingle(),
  ]);
  const wa = whatsappConfig();
  const yes = (ok: boolean, good: string, bad: string) => ({
    ok,
    text: ok ? good : bad,
  });
  return {
    canSave: !!tg,
    telegram: {
      publicEnabled: tg?.public_enabled ?? false,
      testChats: (tg?.test_chats ?? []).join(", "),
      teamChats: (tg?.team_chats ?? []).join(", "),
      notifyLeads: tg?.notify_leads ?? true,
      capUsd: Number(tg?.monthly_cap_usd ?? 2),
      spentUsd: Number(tgUsage?.cost_usd ?? 0),
      messages: tgUsage?.messages ?? 0,
      webhookUrl: `${site.url}/api/telegram`,
      connectable: !!env.TELEGRAM_BOT_TOKEN && !!env.TELEGRAM_WEBHOOK_SECRET,
      status: [
        yes(
          !!env.TELEGRAM_BOT_TOKEN,
          "Token del bot configurado.",
          "Falta TELEGRAM_BOT_TOKEN en Vercel (se pide a @BotFather).",
        ),
        yes(
          !!env.TELEGRAM_WEBHOOK_SECRET,
          "Secreto del webhook configurado.",
          "Falta TELEGRAM_WEBHOOK_SECRET en Vercel (texto inventado, 16+ letras o números).",
        ),
        yes(
          !!env.SUPABASE_SECRET_KEY,
          "El servidor puede leer estos ajustes.",
          "Falta SUPABASE_SECRET_KEY en Vercel: el bot ignora estos ajustes (solo prueba con TELEGRAM_ALLOWED_CHATS) y no avisa al equipo.",
        ),
      ],
    },
    whatsapp: {
      webhookUrl: `${site.url}/api/whatsapp`,
      status: [
        yes(
          !!wa.token,
          "Token de Meta configurado.",
          "Falta WHATSAPP_TOKEN (token permanente de un usuario del sistema).",
        ),
        yes(
          !!wa.appSecret,
          "Clave secreta de la app configurada.",
          "Falta WHATSAPP_APP_SECRET (Meta → la app → Configuración → Básica).",
        ),
        yes(
          !!wa.verifyToken,
          "Token de verificación configurado.",
          "Falta WHATSAPP_VERIFY_TOKEN (texto inventado; se escribe igual en Meta).",
        ),
        yes(
          !!wa.phoneNumberId,
          `Número conectado (ID ${wa.phoneNumberId}).`,
          "Falta WHATSAPP_PHONE_NUMBER_ID (Meta → WhatsApp → Configuración de la API).",
        ),
        yes(
          wa.allowed.length > 0,
          `${wa.allowed.length} número(s) de prueba.`,
          "Sin números de prueba (WHATSAPP_ALLOWED_NUMBERS).",
        ),
      ],
    },
  };
}
