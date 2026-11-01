"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type SaleRow = {
  id: string;
  date: string | null;
  serial: string | null;
  price: number | null;
  channel: "presencial" | "whatsapp" | "web" | "otro";
  notes: string | null;
  product: string;
  customerName: string | null;
  customerEmail: string;
  customerPhone: string | null;
  customerCountry: string | null;
  seller: string | null;
};

const channelLabel = { presencial: "En persona", whatsapp: "WhatsApp", web: "Página web", otro: "Otro" } as const;
const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const fmtDate = (d: string | null) => (d ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(`${d}T12:00:00`)) : "—");

/** Celular colombiano de 10 dígitos (3xx…) → con indicativo 57; otros se usan tal cual. */
const waNumber = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 && d.startsWith("3") ? `57${d}` : d;
};

function toCsv(rows: SaleRow[]): string {
  const head = ["Fecha", "Producto", "Serie", "Cliente", "Correo", "Teléfono", "País", "Canal", "Precio COP", "Registró", "Notas"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [r.date, r.product, r.serial, r.customerName, r.customerEmail, r.customerPhone, r.customerCountry, channelLabel[r.channel], r.price, r.seller, r.notes]
      .map(esc)
      .join(","),
  );
  return "﻿" + [head.map(esc).join(","), ...lines].join("\r\n");
}

/** Historial de ventas = base de clientes y compras. Se puede buscar y descargar en Excel (CSV). */
export function SalesTable({ rows, canEdit }: { rows: SaleRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState<"todos" | SaleRow["channel"]>("todos");
  const [error, setError] = useState<string | null>(null);
  const shown = rows.filter((r) => {
    if (channel !== "todos" && r.channel !== channel) return false;
    const text = `${r.product} ${r.serial ?? ""} ${r.customerName ?? ""} ${r.customerEmail} ${r.customerPhone ?? ""}`.toLowerCase();
    return !q || text.includes(q.toLowerCase());
  });
  const total = shown.reduce((s, r) => s + (r.price ?? 0), 0);
  const customers = new Set(shown.map((r) => r.customerEmail)).size;

  function download() {
    const url = URL.createObjectURL(new Blob([toCsv(shown)], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `ventas-jf-motores-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  async function voidSale(r: SaleRow) {
    if (!confirm(`¿Anular la venta de ${r.product}${r.serial ? ` (serie ${r.serial})` : ""} a ${r.customerEmail}? El equipo deja de aparecer en su cuenta. Queda en el historial.`)) return;
    setError(null);
    const { error: err } = await createSupabaseBrowserClient().rpc("delete_sale", { unit: r.id });
    if (err) return setError(err.message);
    router.refresh();
  }

  return (
    <div className="panel">
      <h2>Historial</h2>
      <section className="stats compact">
        <div className="stat">
          <b>{shown.length}</b>
          <span>Ventas</span>
        </div>
        <div className="stat">
          <b>{customers}</b>
          <span>Clientes</span>
        </div>
        <div className="stat">
          <b>{money.format(total)}</b>
          <span>Total registrado</span>
        </div>
      </section>
      <div className="toolbar">
        <input className="search" placeholder="Buscar por cliente, correo, teléfono, producto o serie" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)} aria-label="Canal">
          <option value="todos">Todos los canales</option>
          {Object.entries(channelLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button type="button" className="btn-ghost" onClick={download} disabled={!shown.length}>
          Descargar Excel (CSV)
        </button>
      </div>
      {error && <div className="notice err">{error}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Cliente</th>
              <th>Canal</th>
              <th>Precio</th>
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td className="muted">{fmtDate(r.date)}</td>
                <td>
                  <b>{r.product}</b>
                  {r.serial && <span className="muted block small">Serie {r.serial}</span>}
                  {r.notes && <span className="muted block small">{r.notes}</span>}
                </td>
                <td>
                  <b>{r.customerName || "—"}</b>
                  <span className="muted block small">{r.customerEmail}</span>
                  {r.customerPhone && (
                    <a className="small" href={`https://wa.me/${waNumber(r.customerPhone)}`} target="_blank" rel="noopener">
                      {r.customerPhone}
                    </a>
                  )}
                </td>
                <td>
                  {channelLabel[r.channel]}
                  {r.seller && <span className="muted block small">por {r.seller}</span>}
                </td>
                <td>{r.price == null ? <span className="muted">—</span> : money.format(r.price)}</td>
                {canEdit && (
                  <td className="actions">
                    <button className="link-danger" onClick={() => voidSale(r)}>
                      Anular
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 6 : 5} className="muted center">
                  Aún no hay ventas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
