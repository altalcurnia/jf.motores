"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { catalogPaths, storageUrl, type CatalogType, type ProductStatus } from "@/features/catalog/shared";
import { deleteDemoData, deleteProduct, setProductStatus } from "./actions";

export type AdminProductRow = {
  id: string;
  catalog: CatalogType;
  ref: string;
  slug: string;
  name: string;
  category: string | null;
  priceCop: number | null;
  status: ProductStatus;
  isDemo: boolean;
  publishedAt: string | null;
  updatedAt: string;
  thumb: string | null;
};

const tabs: { key: "todos" | CatalogType; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "motobomba", label: "Motobombas" },
  { key: "motor", label: "Motores" },
  { key: "repuesto", label: "Repuestos" },
];
const catalogSingular: Record<CatalogType, string> = { motobomba: "Motobomba", motor: "Motor", repuesto: "Repuesto" };
const statusLabel: Record<ProductStatus, string> = { borrador: "Borrador", disponible: "Disponible", vendido: "Vendido" };
/** Los repuestos se manejan por existencias */
const partStatusLabel: Record<ProductStatus, string> = { borrador: "Borrador", disponible: "En stock", vendido: "Sin stock" };
const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export function ProductsTable({ rows, canEdit, supabaseUrl }: { rows: AdminProductRow[]; canEdit: boolean; supabaseUrl: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("todos");
  const [status, setStatus] = useState<"todos" | ProductStatus>("todos");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [, startTransition] = useTransition();
  const demoCount = rows.filter((r) => r.isDemo).length;

  const shown = rows.filter((r) => {
    if (tab !== "todos" && r.catalog !== tab) return false;
    if (status !== "todos" && r.status !== status) return false;
    if (q && !`${r.ref} ${r.name} ${r.category ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  async function run(key: string, fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, okText?: string) {
    setBusy(key);
    setMsg(null);
    const res = await fn();
    setBusy(null);
    if (!res.ok && res.error === "needs_sale") {
      if (confirm("Las motobombas y motores pasan a Vendido registrando la venta a la cuenta del cliente. ¿Ir a registrar la venta?"))
        router.push(`/admin/ventas?producto=${key}`);
      return;
    }
    if (!res.ok) setMsg({ ok: false, text: res.error ?? "Error" });
    else if (res.message || okText) setMsg({ ok: true, text: res.message ?? okText! });
    startTransition(() => router.refresh());
  }

  return (
    <>
      {canEdit && demoCount > 0 && (
        <div className="notice demo-notice">
          <span>
            Hay <b>{demoCount}</b> {demoCount === 1 ? "producto" : "productos"} de <b>ejemplo</b> (imágenes ilustrativas y precios ficticios). Bórralos cuando cargues los reales.
            Si editas uno, deja de ser ejemplo y se conserva.
          </span>
          <button
            className="btn-danger"
            disabled={busy === "demo"}
            onClick={() =>
              confirm(`¿Borrar los ${demoCount} productos de ejemplo y sus motores de ejemplo? No se puede deshacer.`) &&
              run("demo", deleteDemoData)
            }
          >
            {busy === "demo" ? "Borrando…" : "Borrar datos de ejemplo"}
          </button>
        </div>
      )}
      {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}

      <div className="toolbar">
        <div className="seg">
          {tabs.map((t) => (
            <button key={t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>
              {t.label} <small>{t.key === "todos" ? rows.length : rows.filter((r) => r.catalog === t.key).length}</small>
            </button>
          ))}
        </div>
        <input className="search" placeholder="Buscar por nombre, referencia o categoría" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Estado">
          <option value="todos">Todos los estados</option>
          <option value="disponible">Disponibles / en stock</option>
          <option value="vendido">Vendidos / sin stock</option>
          <option value="borrador">Borradores</option>
        </select>
      </div>

      <div className="table-wrap">
        <table className="table products">
          <thead>
            <tr>
              <th />
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td className="thumb">
                  {r.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura del panel, sin optimizar
                    <img src={storageUrl(r.thumb, supabaseUrl)} alt="" loading="lazy" />
                  ) : (
                    <span className="no-img">Sin foto</span>
                  )}
                </td>
                <td>
                  <Link href={`/admin/productos/${r.id}`} className="pname">
                    {r.name}
                  </Link>
                  <span className="muted small block">
                    {r.ref} · {catalogSingular[r.catalog]}
                    {r.isDemo && <span className="pill demo">Ejemplo</span>}
                  </span>
                </td>
                <td className="muted">{r.category ?? "—"}</td>
                <td>{r.priceCop == null ? <span className="muted">Consultar</span> : money.format(r.priceCop)}</td>
                <td>
                  <select
                    className={`status-select ${r.status}`}
                    value={r.status}
                    disabled={!canEdit || busy === r.id}
                    onChange={(e) => run(r.id, () => setProductStatus(r.id, e.target.value as ProductStatus))}
                    aria-label={`Estado de ${r.name}`}
                  >
                    {(Object.keys(statusLabel) as ProductStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {(r.catalog === "repuesto" ? partStatusLabel : statusLabel)[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="actions">
                  {r.status !== "borrador" && (
                    <a href={`/es/${catalogPaths[r.catalog]}/${r.slug}`} target="_blank" rel="noopener" title="Ver en el sitio">
                      Ver
                    </a>
                  )}
                  {canEdit && (
                    <>
                      <Link href={`/admin/productos/${r.id}`}>Editar</Link>
                      <button
                        className="link-danger"
                        disabled={busy === r.id}
                        onClick={() =>
                          confirm(`¿Borrar "${r.name}" (${r.ref})? Se borran también sus fotos. No se puede deshacer.`) &&
                          run(r.id, () => deleteProduct(r.id), "Producto borrado.")
                        }
                      >
                        Borrar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="muted center">
                  No hay productos con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
