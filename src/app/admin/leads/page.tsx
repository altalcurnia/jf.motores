import Link from "next/link";
import { Suspense } from "react";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminTopbar } from "../AdminTopbar";
import { LeadsTable, type LeadRow } from "./LeadsTable";

export const metadata = { title: "Cotizaciones (leads)" };

const STATUS = ["nuevo", "contactado", "cotizado", "vendido", "perdido"] as const;
const STATUS_LABEL = { nuevo: "Nuevo", contactado: "Contactado", cotizado: "Cotizado", vendido: "Vendido", perdido: "Perdido" } as const;
const SOURCE_LABEL: Record<string, string> = {
  ficha: "Ficha de producto",
  cabecera: "Botón de la cabecera",
  inicio: "Inicio",
  flotante: "Botón Soporte",
  asistente: "Chat con IA",
  soporte: "Soporte técnico",
  guia: "Guías",
  repuestos: "Repuestos por pieza",
  "mis-equipos": "Mis equipos",
  sedes: "Sedes",
  contacto: "Contacto",
  web: "Página web",
};

/** Fecha ISO de hace n días (fuera del render para la regla de pureza). */
function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

export default function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  return (
    <main className="shell">
      <AdminTopbar />
      <h1>Cotizaciones (leads)</h1>
      <p className="muted lead">
        Cada clic a WhatsApp del sitio queda aquí antes de abrir el chat, con el asesor asignado y el <b>código</b> que aparece en
        el mensaje del cliente. Cambia el estado a medida que avanzas: así se sabe qué anuncio, producto y asesor venden.
      </p>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <Body searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Body({ searchParams }: Pick<PageProps<"/admin/leads">, "searchParams">) {
  const session = await getSession();
  if (!session || !session.role.isInternal) return <div className="notice err">No tienes permiso para ver las cotizaciones.</div>;
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const estado = pick("estado");
  const asesor = pick("asesor");
  const fuente = pick("fuente");
  const campana = pick("campana");
  const dias = Number(pick("dias")) || 30;

  const supabase = await createSupabaseServerClient();
  const since = daysAgo(dias);
  let q = supabase
    .from("leads")
    .select("id, code, created_at, status, notes, source, country, device, locale, utm, catalog, part_key, advisor_id, products ( ref, slug, catalog, name ), advisors ( name )")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);
  if (STATUS.includes(estado as (typeof STATUS)[number])) q = q.eq("status", estado as (typeof STATUS)[number]);
  if (/^[0-9a-f-]{36}$/.test(asesor)) q = q.eq("advisor_id", asesor);
  if (fuente) q = q.eq("source", fuente);
  if (campana) q = q.eq("utm->>utm_campaign", campana);
  const [{ data, error }, { data: advisors }] = await Promise.all([
    q,
    supabase.from("advisors").select("id, name").order("sort"),
  ]);
  if (error) return <div className="notice err">No se pudieron leer las cotizaciones: {error.message}</div>;

  const rows: LeadRow[] = (data ?? []).map((l) => {
    const utm = (l.utm ?? {}) as Record<string, string>;
    const p = l.products as { ref: string; slug: string; catalog: string; name: Record<string, string> } | null;
    return {
      id: l.id,
      code: l.code,
      createdAt: l.created_at,
      status: l.status,
      notes: l.notes,
      source: SOURCE_LABEL[l.source ?? "web"] ?? l.source ?? "—",
      country: l.country,
      device: l.device,
      campaign: utm.utm_campaign ?? (utm.fbclid ? "Meta (sin campaña)" : utm.gclid ? "Google Ads" : null),
      medium: utm.utm_source ?? null,
      product: p ? `${p.ref} · ${p.name?.es ?? ""}` : l.part_key ? `Repuestos: ${l.part_key}` : l.catalog ? `Catálogo ${l.catalog}` : null,
      productHref: p ? `/es/${p.catalog === "motobomba" ? "motobombas" : p.catalog === "motor" ? "motores" : "repuestos"}/${p.slug}` : null,
      advisor: (l.advisors as { name: string } | null)?.name ?? "—",
    };
  });

  // Resumen por estado y por asesor (base para comisiones)
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const byAdvisor = new Map<string, { total: number; cotizados: number; vendidos: number }>();
  for (const r of rows) {
    const a = byAdvisor.get(r.advisor) ?? { total: 0, cotizados: 0, vendidos: 0 };
    a.total++;
    if (r.status === "cotizado" || r.status === "vendido") a.cotizados++;
    if (r.status === "vendido") a.vendidos++;
    byAdvisor.set(r.advisor, a);
  }
  const bySource = new Map<string, number>();
  for (const r of rows) bySource.set(r.campaign ?? r.source, (bySource.get(r.campaign ?? r.source) ?? 0) + 1);
  const qs = (patch: Record<string, string>) => {
    const u = new URLSearchParams({ ...(estado && { estado }), ...(asesor && { asesor }), ...(fuente && { fuente }), ...(campana && { campana }), dias: String(dias), ...patch });
    for (const [k, v] of [...u.entries()]) if (!v) u.delete(k);
    return `/admin/leads?${u.toString()}`;
  };

  return (
    <>
      <div className="stats">
        <div className="stat">
          <b>{rows.length}</b>
          <span>Leads ({dias} días)</span>
        </div>
        {STATUS.map((s) => (
          <Link key={s} href={qs({ estado: estado === s ? "" : s })} className={`stat link${estado === s ? " on" : ""}`}>
            <b>{count(s)}</b>
            <span>{STATUS_LABEL[s]}</span>
          </Link>
        ))}
      </div>

      <form className="lead-filters" action="/admin/leads">
        <select name="dias" defaultValue={String(dias)} aria-label="Periodo">
          <option value="7">Últimos 7 días</option>
          <option value="30">Últimos 30 días</option>
          <option value="90">Últimos 90 días</option>
          <option value="365">Último año</option>
        </select>
        <select name="estado" defaultValue={estado} aria-label="Estado">
          <option value="">Todos los estados</option>
          {STATUS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select name="asesor" defaultValue={asesor} aria-label="Asesor">
          <option value="">Todos los asesores</option>
          {(advisors ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select name="fuente" defaultValue={fuente} aria-label="Fuente">
          <option value="">Todas las fuentes</option>
          {Object.entries(SOURCE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input name="campana" defaultValue={campana} placeholder="Campaña (utm_campaign)" />
        <button className="btn-primary">Filtrar</button>
      </form>

      <div className="lead-summary">
        <section className="panel">
          <h2>Por asesor</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Asesor</th>
                <th>Leads</th>
                <th>Cotizados</th>
                <th>Vendidos</th>
                <th>Conversión</th>
              </tr>
            </thead>
            <tbody>
              {[...byAdvisor.entries()].map(([name, a]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{a.total}</td>
                  <td>{a.cotizados}</td>
                  <td>{a.vendidos}</td>
                  <td>{a.total ? `${Math.round((a.vendidos / a.total) * 100)} %` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h2>Por campaña o fuente</h2>
          <table className="table">
            <tbody>
              {[...bySource.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 12)
                .map(([k, n]) => (
                  <tr key={k}>
                    <td>{k}</td>
                    <td>{n}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      </div>

      <LeadsTable rows={rows} canManage={can(session, "leads.gestionar")} />
    </>
  );
}
