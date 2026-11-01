import { Suspense } from "react";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { site } from "@/lib/site";
import { AdminTopbar } from "../AdminTopbar";
import { SaleForm } from "./SaleForm";
import { SalesTable, type SaleRow } from "./SalesTable";

export const metadata = { title: "Ventas" };

type T = Record<string, string> | null | undefined;
const es = (t: unknown) => (t as T)?.es ?? "";

export default function SalesPage({ searchParams }: PageProps<"/admin/ventas">) {
  return (
    <main className="shell">
      <AdminTopbar />
      <h1>Ventas y clientes</h1>
      <p className="muted lead">
        Toda venta, en persona, por WhatsApp o por la página, se registra aquí a la <b>cuenta del cliente</b>. El equipo
        queda a su nombre: lo ve en “Mi cuenta” con su guía de usuario, y tú tienes la base de clientes y compras.
      </p>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <Sales searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Sales({ searchParams }: Pick<PageProps<"/admin/ventas">, "searchParams">) {
  const session = await getSession();
  if (!session || !session.role.isInternal || !can(session, "equipos.ver")) {
    return <div className="notice err">No tienes permiso para ver las ventas.</div>;
  }
  const canEdit = can(session, "equipos.gestionar");
  const supabase = await createSupabaseServerClient();
  const [sp, sales, products] = await Promise.all([
    searchParams,
    supabase
      .from("units")
      .select(
        "id, serial, sold_at, price_cop, channel, notes, created_at, products ( id, ref, name, catalog ), owner:profiles!units_owner_id_fkey ( full_name, email, phone, country ), seller:profiles!units_sold_by_fkey ( full_name, email )",
      )
      .order("sold_at", { ascending: false })
      .order("created_at", { ascending: false }),
    canEdit
      ? supabase.from("products").select("id, ref, name, catalog, price_cop, status").neq("status", "borrador").order("ref")
      : Promise.resolve({ data: [] }),
  ]);
  if (sales.error) return <div className="notice err">No se pudieron leer las ventas: {sales.error.message}</div>;

  const rows: SaleRow[] = (sales.data ?? []).map((u) => ({
    id: u.id,
    date: u.sold_at,
    serial: u.serial,
    price: u.price_cop == null ? null : Number(u.price_cop),
    channel: u.channel,
    notes: u.notes,
    product: u.products ? `${u.products.ref} · ${es(u.products.name)}` : "—",
    customerName: u.owner?.full_name ?? null,
    customerEmail: u.owner?.email ?? "—",
    customerPhone: u.owner?.phone ?? null,
    customerCountry: u.owner?.country ?? null,
    seller: u.seller?.full_name || u.seller?.email || null,
  }));
  const preselect = typeof sp.producto === "string" ? sp.producto : null;

  return (
    <>
      {canEdit && (
        <SaleForm
          products={(products.data ?? []).map((p) => ({
            id: p.id,
            label: `${p.ref} · ${es(p.name)}${p.status === "vendido" ? " (vendido)" : ""}`,
            catalog: p.catalog,
            price: p.price_cop == null ? null : Number(p.price_cop),
          }))}
          initialProductId={preselect}
          registerUrl={`${site.url}/es/cuenta/registro`}
        />
      )}
      <SalesTable rows={rows} canEdit={canEdit} />
    </>
  );
}
