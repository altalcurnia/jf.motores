"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateLead, type LeadStatus } from "./actions";

export type LeadRow = {
  id: string;
  code: string;
  createdAt: string;
  status: LeadStatus;
  notes: string | null;
  source: string;
  country: string | null;
  device: string | null;
  campaign: string | null;
  medium: string | null;
  product: string | null;
  productHref: string | null;
  advisor: string;
};

const LABEL: Record<LeadStatus, string> = { nuevo: "Nuevo", contactado: "Contactado", cotizado: "Cotizado", vendido: "Vendido", perdido: "Perdido" };
const fmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short", timeZone: "America/Bogota" });
const DEVICE: Record<string, string> = { mobile: "Celular", desktop: "PC", tablet: "Tableta" };

function toCsv(rows: LeadRow[]) {
  const head = ["Fecha", "Código", "Producto", "Fuente", "Campaña", "Origen", "País", "Dispositivo", "Asesor", "Estado", "Notas"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [fmt.format(new Date(r.createdAt)), r.code, r.product, r.source, r.campaign, r.medium, r.country, r.device, r.advisor, LABEL[r.status], r.notes]
      .map(esc)
      .join(","),
  );
  return "﻿" + [head.map(esc).join(","), ...lines].join("\r\n");
}

/** Lista de leads con cambio de estado y notas en línea; se descarga en Excel (CSV). */
export function LeadsTable({ rows }: { rows: LeadRow[]; canManage: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  async function save(id: string, patch: { status?: LeadStatus; notes?: string }) {
    setBusy(id);
    setErr(null);
    const r = await updateLead(id, patch);
    setBusy(null);
    if (!r.ok) return setErr(r.error ?? "No se pudo guardar.");
    router.refresh();
  }

  function download() {
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `leads-jf-motores-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Leads</h2>
        <button className="btn-ghost" onClick={download} disabled={!rows.length}>
          Descargar Excel (CSV)
        </button>
      </div>
      {err && <div className="notice err">{err}</div>}
      {rows.length === 0 ? (
        <p className="muted small">Aún no hay leads en este periodo. Aparecen cuando alguien toca un botón de WhatsApp del sitio.</p>
      ) : (
        <div className="table-wrap">
          <table className="table leads-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Código</th>
                <th>Producto</th>
                <th>Fuente / campaña</th>
                <th>País</th>
                <th>Asesor</th>
                <th>Estado</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`lead-${r.status}`}>
                  <td>{fmt.format(new Date(r.createdAt))}</td>
                  <td>
                    <code>{r.code}</code>
                  </td>
                  <td>
                    {r.productHref ? (
                      <a href={r.productHref} target="_blank" rel="noopener">
                        {r.product}
                      </a>
                    ) : (
                      (r.product ?? "General")
                    )}
                  </td>
                  <td>
                    {r.source}
                    {r.campaign && <small className="muted"> · {r.campaign}</small>}
                    {r.device && <small className="muted"> · {DEVICE[r.device] ?? r.device}</small>}
                  </td>
                  <td>{r.country ?? "—"}</td>
                  <td>{r.advisor}</td>
                  <td>
                    <select value={r.status} disabled={busy === r.id} onChange={(e) => save(r.id, { status: e.target.value as LeadStatus })} aria-label={`Estado de ${r.code}`}>
                      {(Object.keys(LABEL) as LeadStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="lead-notes">
                    {open === r.id ? (
                      <div className="lead-note-edit">
                        <textarea
                          rows={3}
                          maxLength={2000}
                          value={notes[r.id] ?? r.notes ?? ""}
                          onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                          placeholder="Qué pidió, cotización enviada, próximos pasos…"
                        />
                        <button
                          className="btn-primary"
                          disabled={busy === r.id}
                          onClick={async () => {
                            await save(r.id, { notes: notes[r.id] ?? r.notes ?? "" });
                            setOpen(null);
                          }}
                        >
                          Guardar
                        </button>
                      </div>
                    ) : (
                      <button className="link-btn" onClick={() => setOpen(r.id)}>
                        {r.notes ? r.notes.slice(0, 60) + (r.notes.length > 60 ? "…" : "") : "+ nota"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
