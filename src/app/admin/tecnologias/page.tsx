import { Suspense } from "react";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAnalyticsIds } from "@/lib/supabase/public";
import { AdminTopbar } from "../AdminTopbar";
import { SERVICES, ciStatus, deepseekStatus, type Service, type ServiceKey, type Status } from "./services";

export const metadata = { title: "Tecnologías" };

const LEVEL_LABEL = { ok: "Bien", warn: "Revisar", error: "Error", info: "Info" } as const;

export default function TechPage() {
  return (
    <main className="shell">
      <AdminTopbar />
      <h1>Tecnologías</h1>
      <p className="muted lead">
        Todas las plataformas que usa JF Motores: para qué sirve cada una, enlace a su panel y su estado. Donde se puede, el
        estado se revisa en vivo al abrir esta página; en las demás, revísalo en su panel.
      </p>
      <Suspense fallback={<p className="muted">Revisando el estado de cada plataforma…</p>}>
        <Body />
      </Suspense>
    </main>
  );
}

const timeout = (ms: number) => AbortSignal.timeout(ms);

async function deepseek(): Promise<Status> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return { level: "error", text: "Falta DEEPSEEK_API_KEY en Vercel: el asistente de IA no funciona." };
  try {
    const res = await fetch("https://api.deepseek.com/user/balance", { headers: { authorization: `Bearer ${key}` }, cache: "no-store", signal: timeout(5000) });
    return deepseekStatus(res.ok ? await res.json() : null);
  } catch {
    return deepseekStatus(null);
  }
}

async function github(): Promise<Status> {
  try {
    const res = await fetch("https://api.github.com/repos/altalcurnia/jf.motores/actions/runs?branch=migracion-next&per_page=1", {
      headers: { accept: "application/vnd.github+json", "user-agent": "jf-motores-admin" },
      cache: "no-store",
      signal: timeout(5000),
    });
    if (!res.ok) return ciStatus(null);
    const data = (await res.json()) as { workflow_runs?: { conclusion: string | null; status: string; head_sha: string; created_at: string }[] };
    return ciStatus(data.workflow_runs?.[0] ?? null);
  } catch {
    return ciStatus(null);
  }
}

async function Body() {
  const session = await getSession();
  if (!session || !session.role.isInternal || !(session.isOwner || can(session, "empresa.editar"))) {
    return <div className="notice err">Necesitas el permiso «Editar datos de la empresa» para ver esta página.</div>;
  }

  const supabase = await createSupabaseServerClient();
  const [db, pending, ds, ci, analytics] = await Promise.all([
    supabase.from("company_settings").select("email", { head: true, count: "exact" }),
    supabase.from("leads").select("id", { head: true, count: "exact" }).eq("status", "nuevo"),
    deepseek(),
    github(),
    getAnalyticsIds(),
  ]);

  const env = process.env;
  const sha = env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  const msg = env.VERCEL_GIT_COMMIT_MESSAGE?.split("\n")[0];
  const nuevos = pending.count ?? 0;

  const status: Partial<Record<ServiceKey, Status[]>> = {
    sitio: [{ level: "ok", text: "Respondiendo (estás viendo esta página)." }],
    vercel: [
      env.VERCEL_ENV
        ? { level: env.VERCEL_ENV === "production" ? "ok" : "info", text: `Versión ${env.VERCEL_ENV === "production" ? "en producción" : `de ${env.VERCEL_ENV}`}: ${sha ?? "—"}${msg ? ` · ${msg}` : ""}` }
        : { level: "info", text: "Ejecutando fuera de Vercel (local)." },
      { level: "warn", text: "Plan Hobby: es para uso no comercial. Plan 2.3: pasar a Vercel Pro." },
    ],
    supabase: [
      db.error ? { level: "error", text: `La base de datos no responde: ${db.error.message}` } : { level: "ok", text: "Base de datos respondiendo." },
      nuevos > 0
        ? { level: nuevos > 10 ? "warn" : "info", text: `${nuevos} cotización${nuevos === 1 ? "" : "es"} en «Nuevo» (generan avisos por correo).` }
        : { level: "ok", text: "Sin cotizaciones pendientes en «Nuevo»." },
      { level: "warn", text: "Sin respaldos automáticos en el plan gratis. Plan 2.1: Supabase Pro." },
    ],
    github: [ci],
    resend: [
      env.RESEND_API_KEY ? { level: "ok", text: `Clave configurada. Remitente: ${env.EMAIL_FROM || "notificaciones@jfmotoresmedellin.com"}` } : { level: "error", text: "Falta RESEND_API_KEY: no se envían correos del sitio." },
    ],
    deepseek: [ds],
    tavily: [env.TAVILY_API_KEY ? { level: "ok", text: "Clave configurada." } : { level: "warn", text: "Falta TAVILY_API_KEY: el asistente no busca en internet." }],
    telegram: [env.TELEGRAM_BOT_TOKEN ? { level: "ok", text: "Bot configurado." } : { level: "info", text: "No configurado (opcional)." }],
    sentry: [
      env.NEXT_PUBLIC_SENTRY_DSN
        ? { level: "ok", text: env.SENTRY_AUTH_TOKEN ? "Activo, con mapas de código." : "Activo. Falta SENTRY_AUTH_TOKEN para ver la línea exacta del error." }
        : { level: "info", text: "Sin DSN: no se envían avisos de errores (plan 1.7)." },
    ],
    analytics: [
      analytics.ga4 || analytics.pixel || analytics.gads || analytics.tiktok
        ? {
            level: "ok",
            text: [
              analytics.pixel && `Meta ${analytics.pixel}`,
              analytics.ga4 && `GA4 ${analytics.ga4}`,
              analytics.gads && `Google Ads ${analytics.gads}${analytics.gadsLabel ? "" : " (falta la etiqueta de conversión)"}`,
              analytics.tiktok && `TikTok ${analytics.tiktok}`,
            ]
              .filter(Boolean)
              .join(" · "),
          }
        : { level: "info", text: "Sin IDs configurados: no se mide el tráfico. Se llenan en Empresa → Medición de anuncios." },
    ],
  };

  const all = SERVICES.flatMap((s) => status[s.key] ?? []);
  const errors = all.filter((x) => x.level === "error").length;
  const warns = all.filter((x) => x.level === "warn").length;
  const groups = [...new Set(SERVICES.map((s) => s.group))];

  return (
    <>
      <div className="stats">
        <div className="stat">
          <b>{SERVICES.length}</b>
          <span>Plataformas</span>
        </div>
        <div className="stat">
          <b className={errors ? "lvl-error" : ""}>{errors}</b>
          <span>Con error</span>
        </div>
        <div className="stat">
          <b className={warns ? "lvl-warn" : ""}>{warns}</b>
          <span>Para revisar</span>
        </div>
      </div>
      {groups.map((g) => (
        <section key={g} className="panel">
          <h2>{g}</h2>
          <div className="tech-grid">
            {SERVICES.filter((s) => s.group === g).map((s) => (
              <TechCard key={s.key} s={s} status={status[s.key]} />
            ))}
          </div>
        </section>
      ))}
      <p className="muted small" style={{ marginTop: 24 }}>
        Plan de operación completo: <code>docs/05_PLAN_OPERACION.md</code> en el repositorio. Nunca compartas claves de estas
        plataformas por chat: guárdalas en un gestor de contraseñas.
      </p>
    </>
  );
}

function TechCard({ s, status }: { s: Service; status?: Status[] }) {
  const list: Status[] = status ?? [s.planned ? { level: "info", text: "Pendiente de configurar (ver plan)." } : { level: "info", text: "Sin revisión automática: revisa su panel." }];
  return (
    <article className="tech-card">
      <header>
        <h3>{s.name}</h3>
        {s.planned && <span className="tech-tag">Planificado</span>}
      </header>
      <p className="muted">{s.what}</p>
      <ul className="tech-status">
        {list.map((x) => (
          <li key={x.text} className={`lvl-${x.level}`}>
            <b>{LEVEL_LABEL[x.level]}</b> {x.text}
          </li>
        ))}
      </ul>
      <div className="tech-links">
        {s.links.map((l) => (
          <a key={l.href} href={l.href} target={l.href.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer">
            {l.label} ↗
          </a>
        ))}
      </div>
    </article>
  );
}
