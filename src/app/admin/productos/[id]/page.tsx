import { Suspense } from "react";
import { AdminTopbar } from "../../AdminTopbar";
import { loadEditor, loadProduct } from "../load";
import { ProductForm } from "../ProductForm";

export const metadata = { title: "Editar producto" };

export default function EditProductPage({ params, searchParams }: PageProps<"/admin/productos/[id]">) {
  return (
    <main className="shell">
      <AdminTopbar />
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <Editor params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Editor({ params, searchParams }: Pick<PageProps<"/admin/productos/[id]">, "params" | "searchParams">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const ctx = await loadEditor();
  if (!ctx) return <div className="notice err">No tienes permiso para ver el catálogo.</div>;
  const product = /^[0-9a-f-]{36}$/i.test(id) ? await loadProduct(ctx.supabase, id) : null;
  if (!product) return <div className="notice err">Ese producto no existe o fue borrado.</div>;
  return (
    <>
      <h1>{product.name.es || product.ref}</h1>
      <p className="muted lead">
        {product.ref}
        {product.status === "borrador" ? " · Borrador: no se ve en el sitio" : ""}
      </p>
      {sp.nuevo === "1" && <div className="notice ok">Producto creado.</div>}
      <ProductForm key={id} initial={product} options={ctx.options} supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""} canEdit={ctx.canEdit} />
    </>
  );
}
