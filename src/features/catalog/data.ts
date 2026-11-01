import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type {
  CatalogCategory,
  CatalogProduct,
  CatalogType,
  Compatibility,
  EngineModel,
  I18nText,
} from "./shared";

/**
 * Catálogo público. Todo se cachea con la etiqueta "catalog": cuando alguien guarda
 * un producto en el panel, la acción del servidor llama updateTag("catalog") y el
 * sitio se actualiza al instante. Si la base de datos falla, se muestra vacío.
 */
export type CatalogData = {
  products: CatalogProduct[];
  categories: CatalogCategory[];
  engineModels: EngineModel[];
  compat: Compatibility[];
};

const empty: CatalogData = { products: [], categories: [], engineModels: [], compat: [] };

export async function getCatalogData(): Promise<CatalogData> {
  "use cache";
  cacheTag("catalog");
  try {
    const supabase = createSupabasePublicClient();
    const [products, categories, models, compat] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id, catalog, ref, slug, name, summary, description, price_cop, status, specs, featured, published_at, category_id, engine_model_id, model_glb_path, manual_path, manual_public, product_images(path, alt, is_reference, sort)",
        )
        .neq("status", "borrador")
        .order("published_at", { ascending: false }),
      supabase.from("categories").select("id, catalog, slug, name, engine_part_key, sort").eq("active", true).order("sort"),
      supabase.from("engine_models").select("id, brand, model").order("model"),
      supabase.from("part_compatibility").select("part_id, engine_model_id, product_id"),
    ]);
    if (products.error) throw products.error;
    cacheLife("hours");

    return {
      products: (products.data ?? []).map((p) => ({
        id: p.id,
        catalog: p.catalog,
        ref: p.ref,
        slug: p.slug,
        name: p.name as I18nText,
        summary: p.summary as I18nText,
        description: p.description as I18nText,
        priceCop: p.price_cop == null ? null : Number(p.price_cop),
        status: p.status === "vendido" ? "vendido" : "disponible",
        specs: (p.specs ?? {}) as Record<string, string | number>,
        featured: p.featured,
        publishedAt: p.published_at ?? "",
        categoryId: p.category_id,
        engineModelId: p.engine_model_id,
        glbPath: p.model_glb_path,
        hasPublicManual: !!p.manual_path && p.manual_public,
        images: [...(p.product_images ?? [])]
          .sort((a, b) => a.sort - b.sort)
          .map((i) => ({ path: i.path, alt: i.alt as I18nText, isReference: i.is_reference })),
      })),
      categories: (categories.data ?? []).map((c) => ({
        id: c.id,
        catalog: c.catalog,
        slug: c.slug,
        name: c.name as I18nText,
        partKey: c.engine_part_key,
        sort: c.sort,
      })),
      engineModels: models.data ?? [],
      compat: (compat.data ?? []).map((c) => ({ partId: c.part_id, engineModelId: c.engine_model_id, productId: c.product_id })),
    };
  } catch (error) {
    // Falla temporal: se muestra vacío, pero se reintenta al minuto para reintentar pronto.
    console.error("[catalog] no se pudo leer el catálogo", error);
    cacheLife("minutes");
    return empty;
  }
}

export async function getCatalog(catalog: CatalogType) {
  const data = await getCatalogData();
  const categories = data.categories.filter((c) => c.catalog === catalog);
  return { ...data, products: data.products.filter((p) => p.catalog === catalog), categories };
}

/** Repuestos compatibles con un equipo (por su motor o por el producto mismo). */
export function compatibleParts(data: CatalogData, product: CatalogProduct): CatalogProduct[] {
  const ids = new Set(
    data.compat
      .filter((c) => c.productId === product.id || (product.engineModelId && c.engineModelId === product.engineModelId))
      .map((c) => c.partId),
  );
  return data.products.filter((p) => ids.has(p.id));
}

/** Para un repuesto: motores y equipos con los que es compatible. */
export function compatibleWith(data: CatalogData, part: CatalogProduct) {
  const rows = data.compat.filter((c) => c.partId === part.id);
  return {
    models: data.engineModels.filter((m) => rows.some((r) => r.engineModelId === m.id)),
    products: data.products.filter((p) => rows.some((r) => r.productId === p.id)),
  };
}
