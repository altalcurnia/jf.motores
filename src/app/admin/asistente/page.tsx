import { Suspense } from "react";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasDeepSeekKey, hasSearchKey } from "@/features/assistant/deepseek";
import { AdminTopbar } from "../AdminTopbar";
import { AssistantAdmin, type DocRow } from "./AssistantAdmin";

export const metadata = { title: "Asistente de IA" };

export default function AssistantAdminPage() {
  return (
    <main className="shell">
      <AdminTopbar />
      <h1>Asistente de ventas con IA</h1>
      <p className="muted lead">
        Responde las 24 horas en el botón “Soporte” del sitio, usando <b>solo</b> los PDF que cargues aquí. Si la respuesta no está
        en los documentos, dice que no la tiene y ofrece WhatsApp. No guarda las conversaciones.
      </p>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <Body />
      </Suspense>
    </main>
  );
}

async function Body() {
  const session = await getSession();
  if (!session || !session.role.isInternal || !can(session, "asistente.gestionar")) {
    return <div className="notice err">No tienes permiso para configurar el asistente.</div>;
  }
  const supabase = await createSupabaseServerClient();
  const [{ data: settings }, { data: docs, error }] = await Promise.all([
    supabase.from("ai_settings").select("enabled, model, web_verify, official_domains").maybeSingle(),
    supabase.from("ai_documents").select("id, title, content, active, is_test, created_at").order("created_at"),
  ]);
  if (error) return <div className="notice err">No se pudieron leer los documentos: {error.message}</div>;
  const rows: DocRow[] = (docs ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    chars: d.content.length,
    active: d.active,
    isTest: d.is_test,
    createdAt: d.created_at.slice(0, 10),
  }));
  return (
    <AssistantAdmin
      enabled={settings?.enabled ?? false}
      model={settings?.model ?? "deepseek-flash"}
      docs={rows}
      keyConfigured={hasDeepSeekKey()}
      searchConfigured={hasSearchKey()}
      webVerify={settings?.web_verify ?? false}
      domains={settings?.official_domains ?? []}
      telegramConfigured={!!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_WEBHOOK_SECRET}
    />
  );
}
