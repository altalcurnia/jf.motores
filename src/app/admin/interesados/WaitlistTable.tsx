"use client";
import { useState } from "react";

export type WaitlistRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  country: string | null;
  company: string | null;
  role: string | null;
  units_count: string | null;
  site_type: string[];
  signal: string | null;
  plan: string | null;
  priorities: string[];
  site_visits: string | null;
  budget: string | null;
  comments: string | null;
  contact_ok: boolean;
  locale: string;
  created_at: string;
};

const L: Record<string, Record<string, string>> = {
  role: { dueno: "Dueño", administrador: "Administrador de mina", operador: "Operador", tecnico: "Técnico", otro: "Otro" },
  site: { tajo: "Tajo abierto", socavon: "Socavón", draga: "Draga o río", otro: "Otro" },
  signal: { buena: "Señal buena", debil: "Señal débil", ninguna: "Sin señal", no_se: "No sabe" },
  plan: { esencial: "Esencial", vision: "Visión", vision_pro: "Visión Pro", no_se: "No sabe" },
  prio: { video: "Video en vivo", alertas: "Alertas", control: "Control remoto", combustible: "Combustible", mantenimiento: "Mantenimiento", termica: "Térmica", seguridad: "Seguridad" },
  budget: { lt100: "< $100 mil", "100-250": "$100–250 mil", "250-500": "$250–500 mil", gt500: "> $500 mil", no_se: "No sabe" },
};
const lab = (group: string, v: string | null) => (v ? (L[group][v] ?? v) : "—");
const fmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });
const waNumber = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 && d.startsWith("3") ? `57${d}` : d;
};

function count(rows: WaitlistRow[], pick: (r: WaitlistRow) => (string | null)[] | string | null) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const v = pick(r);
    for (const x of Array.isArray(v) ? v : [v]) if (x) m.set(x, (m.get(x) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function toCsv(rows: WaitlistRow[]) {
  const head = ["Fecha", "Nombre", "Correo", "Celular", "País", "Empresa", "Rol", "Motobombas", "Sitios", "Señal", "Plan", "Prioridades", "Visitas/mes", "Pagaría/mes", "Comentarios", "Acepta contacto", "Idioma"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [
      r.created_at.slice(0, 10), r.full_name, r.email, r.phone, r.country, r.company, lab("role", r.role), r.units_count,
      r.site_type.map((x) => lab("site", x)).join(" | "), lab("signal", r.signal), lab("plan", r.plan),
      r.priorities.map((x) => lab("prio", x)).join(" | "), r.site_visits, lab("budget", r.budget), r.comments, r.contact_ok ? "Sí" : "No", r.locale,
    ].map(esc).join(","),
  );
  return "﻿" + [head.map(esc).join(","), ...lines].join("\r\n");
}

/** Lista de interesados con resumen para validar planes y precios, búsqueda y descarga. */
export function WaitlistTable({ rows }: { rows: WaitlistRow[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const shown = rows.filter((r) => !q || `${r.full_name} ${r.email} ${r.phone} ${r.company ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  function download() {
    const url = URL.createObjectURL(new Blob([toCsv(shown)], { type: "text/csv;charset=utf-8" }));
    Object.assign(document.createElement("a"), { href: url, download: `interesados-jf-monitor-${new Date().toISOString().slice(0, 10)}.csv` }).click();
    URL.revokeObjectURL(url);
  }

  const summary: [string, string, [string, number][]][] = [
    ["Plan que les interesa", "plan", count(rows, (r) => r.plan)],
    ["Cuánto pagarían al mes", "budget", count(rows, (r) => r.budget)],
    ["Qué quieren primero", "prio", count(rows, (r) => r.priorities)],
    ["Señal en el sitio", "signal", count(rows, (r) => r.signal)],
  ];

  return (
    <>
      <section className="stats">
        <div className="stat">
          <b>{rows.length}</b>
          <span>Interesados</span>
        </div>
        <div className="stat">
          <b>{rows.filter((r) => r.contact_ok).length}</b>
          <span>Aceptan contacto</span>
        </div>
      </section>
      {rows.length > 0 && (
        <section className="grid wl-summary">
          {summary.map(([title, group, items]) => (
            <div key={title} className="card">
              <h3>{title}</h3>
              {items.length ? (
                <ul className="bars">
                  {items.map(([k, n]) => (
                    <li key={k}>
                      <span>{lab(group, k)}</span>
                      <i style={{ width: `${(n / rows.length) * 100}%` }} />
                      <b>{n}</b>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Sin respuestas.</p>
              )}
            </div>
          ))}
        </section>
      )}

      <div className="panel">
        <div className="toolbar">
          <input className="search" placeholder="Buscar por nombre, correo, celular o empresa" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="button" className="btn-ghost" onClick={download} disabled={!shown.length}>
            Descargar Excel (CSV)
          </button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Contacto</th>
                <th>Operación</th>
                <th>Interés</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="wl-row-item" onClick={() => setOpen(open === r.id ? null : r.id)}>
                  <td>
                    <b>{r.full_name}</b>
                    <span className="muted block small">
                      {lab("role", r.role)}
                      {r.company ? ` · ${r.company}` : ""}
                    </span>
                    {open === r.id && (
                      <div className="wl-detail small">
                        {r.priorities.length > 0 && (
                          <p>
                            <b>Quiere primero:</b> {r.priorities.map((x) => lab("prio", x)).join(", ")}
                          </p>
                        )}
                        <p>
                          <b>Visitas al sitio/mes:</b> {r.site_visits ?? "—"}
                        </p>
                        {r.comments && (
                          <p>
                            <b>Comentarios:</b> {r.comments}
                          </p>
                        )}
                        <p className="muted">Idioma: {r.locale.toUpperCase()}</p>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="block">{r.email}</span>
                    <a className="small" href={`https://wa.me/${waNumber(r.phone)}`} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>
                      {r.phone}
                    </a>
                    <span className="muted block small">
                      {r.country ?? "—"} · {r.contact_ok ? "Acepta contacto" : "No contactar"}
                    </span>
                  </td>
                  <td className="small">
                    <span className="block">{r.units_count ? `${r.units_count} motobomba(s)` : "—"}</span>
                    <span className="muted block">{r.site_type.map((x) => lab("site", x)).join(", ") || "—"}</span>
                    <span className="muted block">{lab("signal", r.signal)}</span>
                  </td>
                  <td className="small">
                    <b className="block">{lab("plan", r.plan)}</b>
                    <span className="muted block">{lab("budget", r.budget)}</span>
                  </td>
                  <td className="muted small">{fmt.format(new Date(r.created_at))}</td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted center">
                    Aún no hay interesados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="hint">Toca una fila para ver prioridades, visitas al sitio y comentarios.</p>
      </div>
    </>
  );
}
