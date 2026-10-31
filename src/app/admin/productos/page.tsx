import Link from "next/link";
import { Suspense } from "react";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminTopbar } from "../AdminTopbar";
import { ProductsTable, type AdminProductRow } from "./ProductsTable";

export const metadata = { title: "Productos" };

export default function ProductsPage() {
  return (
    <main className="shell">
      <AdminTopbar />
      <div className="page-head">
        <div>
          <h1>Productos</h1>
          <p className="muted lead">Motobombas, motores y repuestos. Lo que marques como Disponible o Vendido aparece en el sitio al instante.</p>
        </div>
        <Link href="/admin/productos/nuevo" className="btn-primary">
          + Nuevo producto
        </Link>
      </div>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <Products />
      </Suspense>
    </main>
  );
}

async function Products() {
  const session = await getSession();
  if (!session || !session.role.isInternal || !can(session, "catalogo.ver")) {
    return <div className="notice err">No tienes permiso para ver el catálogo.</div>;
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, catalog, ref, slug, name, price_cop, status, is_demo, published_at, updated_at, categories ( name ), product_images ( path, sort )")
    .order("updated_at", { ascending: false });
  if (error) return <div className="notice err">No se pudo leer el catálogo: {error.message}</div>;

  const rows: AdminProductRow[] = (data ?? []).map((p) => ({
    id: p.id,
    catalog: p.catalog,
    ref: p.ref,
    slug: p.slug,
    name: (p.name as Record<string, string>)?.es ?? p.ref,
    category: (p.categories?.name as Record<string, string> | undefined)?.es ?? null,
    priceCop: p.price_cop == null ? null : Number(p.price_cop),
    status: p.status,
    isDemo: p.is_demo,
    publishedAt: p.published_at,
    updatedAt: p.updated_at,
    thumb: [...(p.product_images ?? [])].sort((a, b) => a.sort - b.sort)[0]?.path ?? null,
  }));

  return <ProductsTable rows={rows} canEdit={can(session, "catalogo.editar")} supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""} />;
}
