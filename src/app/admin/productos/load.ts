import "server-only";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FormOptions, ProductFormValue } from "./form-model";

type T = Record<string, string> | null | undefined;
const es = (t: unknown) => (t as T)?.es ?? "";
const three = (t: unknown) => ({ es: (t as T)?.es ?? "", en: (t as T)?.en ?? "", pt: (t as T)?.pt ?? "" });

export async function loadEditor() {
  const session = await getSession();
  if (!session || !session.role.isInternal || !can(session, "catalogo.ver")) return null;
  const supabase = await createSupabaseServerClient();
  const [cats, models, equipment] = await Promise.all([
    supabase.from("categories").select("id, catalog, name, sort").order("catalog").order("sort"),
    supabase.from("engine_models").select("id, brand, model").order("brand").order("model"),
    supabase.from("products").select("id, catalog, ref, name").in("catalog", ["motobomba", "motor"]).order("ref"),
  ]);
  const options: FormOptions = {
    categories: (cats.data ?? []).map((c) => ({ id: c.id, catalog: c.catalog, label: es(c.name) })),
    engineModels: (models.data ?? []).map((m) => ({ id: m.id, label: `${m.brand} ${m.model}` })),
    equipment: (equipment.data ?? []).map((p) => ({ id: p.id, catalog: p.catalog, label: `${p.ref} · ${es(p.name)}` })),
  };
  return { session, supabase, options, canEdit: can(session, "catalogo.editar") };
}

export async function loadProduct(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, id: string): Promise<ProductFormValue | null> {
  const { data: p } = await supabase
    .from("products")
    .select("*, product_images ( path, is_reference, sort ), part_compatibility!part_compatibility_part_id_fkey ( engine_model_id, product_id )")
    .eq("id", id)
    .maybeSingle();
  if (!p) return null;
  return {
    id: p.id,
    catalog: p.catalog,
    categoryId: p.category_id,
    ref: p.ref,
    slug: p.slug,
    name: three(p.name),
    summary: three(p.summary),
    description: three(p.description),
    priceCop: p.price_cop == null ? null : Number(p.price_cop),
    status: p.status,
    condition: p.condition,
    publishedAt: p.published_at,
    featured: p.featured,
    specs: Object.entries((p.specs ?? {}) as Record<string, unknown>).map(([key, value]) => ({ key, value: String(value ?? "") })),
    engineModelId: p.engine_model_id,
    glbPath: p.model_glb_path,
    manualPath: p.manual_path,
    manualPublic: p.manual_public,
    warrantyMonths: p.warranty_months,
    images: [...(p.product_images ?? [])].sort((a, b) => a.sort - b.sort).map((i) => ({ path: i.path, isReference: i.is_reference })),
    compatModels: (p.part_compatibility ?? []).map((c) => c.engine_model_id).filter((x): x is string => !!x),
    compatProducts: (p.part_compatibility ?? []).map((c) => c.product_id).filter((x): x is string => !!x),
    isDemo: p.is_demo,
  };
}
