import { Suspense } from "react";
import { AdminTopbar } from "../../AdminTopbar";
import { loadEditor } from "../load";
import { ProductForm } from "../ProductForm";
import { emptyProduct } from "../form-model";

export const metadata = { title: "Nuevo producto" };

export default function NewProductPage() {
  return (
    <main className="shell">
      <AdminTopbar />
      <h1>Nuevo producto</h1>
      <p className="muted lead">Guárdalo como borrador mientras completas fotos y datos; publícalo cambiando el estado a Disponible.</p>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <Editor />
      </Suspense>
    </main>
  );
}

async function Editor() {
  const ctx = await loadEditor();
  if (!ctx?.canEdit) return <div className="notice err">No tienes permiso para crear productos.</div>;
  const initial = emptyProduct();
  initial.categoryId = ctx.options.categories.find((c) => c.catalog === "motobomba")?.id ?? null;
  return <ProductForm initial={initial} options={ctx.options} supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""} canEdit />;
}
