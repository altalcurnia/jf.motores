"use server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

/**
 * Acciones del panel de productos. La base de datos vuelve a verificar el permiso
 * (RLS "catalogo.editar"); aquí se revisa antes para dar un mensaje claro.
 * Después de cada cambio, updateTag("catalog") actualiza el sitio público al instante.
 */
export type ActionResult = { ok: true; id?: string; message?: string } | { ok: false; error: string };

async function editor() {
  const session = await getSession();
  if (!session || !session.role.isInternal || !can(session, "catalogo.editar")) return null;
  return { session, supabase: await createSupabaseServerClient() };
}
const DENIED: ActionResult = { ok: false, error: "No tienes permiso para editar el catálogo." };

/** Archivos propios en Storage (no las imágenes de ejemplo /demo ni enlaces externos). */
const isStoragePath = (p: string | null | undefined): p is string => !!p && !p.startsWith("/") && !/^https?:\/\//.test(p);

async function removeFiles(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  paths: (string | null | undefined)[],
  bucket: "catalogo" | "manuales" = "catalogo",
) {
  const own = paths.filter(isStoragePath);
  if (own.length) await supabase.storage.from(bucket).remove(own);
}

/** Motobombas y motores solo pasan a Vendido registrando la venta a una cuenta de cliente. */
async function needsSale(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, id: string) {
  const { data: p } = await supabase.from("products").select("catalog, status").eq("id", id).single();
  if (!p || p.status === "vendido" || p.catalog === "repuesto") return false;
  const { count } = await supabase.from("units").select("id", { count: "exact", head: true }).eq("product_id", id);
  return !count;
}
const NEEDS_SALE = "needs_sale";

export async function setProductStatus(id: string, status: "borrador" | "disponible" | "vendido"): Promise<ActionResult> {
  const ctx = await editor();
  if (!ctx) return DENIED;
  if (status === "vendido" && (await needsSale(ctx.supabase, id))) return { ok: false, error: NEEDS_SALE };
  const patch: { status: typeof status; sold_at?: string | null; published_at?: string } = { status };
  patch.sold_at = status === "vendido" ? new Date().toISOString() : null;
  const { data: current } = await ctx.supabase.from("products").select("published_at").eq("id", id).single();
  if (status !== "borrador" && !current?.published_at) patch.published_at = new Date().toISOString();
  const { error } = await ctx.supabase.from("products").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  updateTag("catalog");
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const ctx = await editor();
  if (!ctx) return DENIED;
  const { count } = await ctx.supabase.from("units").select("id", { count: "exact", head: true }).eq("product_id", id);
  if (count) return { ok: false, error: `Este producto tiene ${count} venta(s) registrada(s). Márcalo como Vendido en lugar de borrarlo.` };
  const { data: p } = await ctx.supabase.from("products").select("model_glb_path, manual_path, product_images(path)").eq("id", id).single();
  const { error } = await ctx.supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await removeFiles(ctx.supabase, [p?.model_glb_path, ...(p?.product_images ?? []).map((i) => i.path)]);
  await removeFiles(ctx.supabase, [p?.manual_path], "manuales");
  updateTag("catalog");
  return { ok: true };
}

/** Borra todos los productos y motores marcados como "Ejemplo". */
export async function deleteDemoData(): Promise<ActionResult> {
  const ctx = await editor();
  if (!ctx) return DENIED;
  const { data: demo } = await ctx.supabase.from("products").select("id, model_glb_path, product_images(path)").eq("is_demo", true);
  const { error } = await ctx.supabase.from("products").delete().eq("is_demo", true);
  if (error) return { ok: false, error: error.message };
  const models = await ctx.supabase.from("engine_models").delete().eq("is_demo", true);
  if (models.error) return { ok: false, error: models.error.message };
  await removeFiles(ctx.supabase, (demo ?? []).flatMap((p) => [p.model_glb_path, ...p.product_images.map((i) => i.path)]));
  updateTag("catalog");
  return { ok: true, message: `Se borraron ${demo?.length ?? 0} productos de ejemplo.` };
}

// ------------------------------------------------------------ Crear / editar

const text = z.object({ es: z.string().trim().max(4000), en: z.string().trim().max(4000), pt: z.string().trim().max(4000) });
const productInput = z.object({
  id: z.uuid().nullable(),
  catalog: z.enum(["motobomba", "motor", "repuesto"]),
  categoryId: z.uuid().nullable(),
  ref: z.string().trim().min(2, "Escribe la referencia").max(40),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "La dirección solo admite minúsculas, números y guiones"),
  name: text.refine((t) => t.es.length > 0, "El nombre en español es obligatorio"),
  summary: text,
  description: text,
  priceCop: z.number().int().nonnegative().max(1e12).nullable(),
  status: z.enum(["borrador", "disponible", "vendido"]),
  publishedAt: z.string().nullable(),
  featured: z.boolean(),
  specs: z.array(z.object({ key: z.string().trim().max(40), value: z.string().trim().max(120) })).max(30),
  engineModelId: z.uuid().nullable(),
  glbPath: z.string().max(300).nullable(),
  manualPath: z.string().max(300).nullable(),
  manualPublic: z.boolean(),
  images: z
    .array(z.object({ path: z.string().min(1).max(500), isReference: z.boolean() }))
    .max(20),
  compatModels: z.array(z.uuid()).max(100),
  compatProducts: z.array(z.uuid()).max(200),
});
export type ProductInput = z.infer<typeof productInput>;

function toSpecs(rows: ProductInput["specs"]): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const { key, value } of rows) {
    const k = key
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    if (!k || !value) continue;
    const n = Number(value.replace(",", "."));
    out[k] = value !== "" && Number.isFinite(n) && /^-?[\d.,]+$/.test(value) ? n : value;
  }
  return out;
}

const clean = (t: { es: string; en: string; pt: string }) =>
  Object.fromEntries(Object.entries(t).filter(([, v]) => v)) as Json;

export async function saveProduct(raw: ProductInput): Promise<ActionResult> {
  const ctx = await editor();
  if (!ctx) return DENIED;
  const parsed = productInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const p = parsed.data;
  const { supabase } = ctx;

  const publishedAt = p.status === "borrador" ? p.publishedAt : (p.publishedAt ?? new Date().toISOString());
  const row = {
    catalog: p.catalog,
    category_id: p.categoryId,
    ref: p.ref.toUpperCase(),
    slug: p.slug,
    name: clean(p.name),
    summary: clean(p.summary),
    description: clean(p.description),
    price_cop: p.priceCop,
    status: p.status,
    published_at: publishedAt,
    featured: p.featured,
    specs: toSpecs(p.specs),
    engine_model_id: p.catalog === "repuesto" ? null : p.engineModelId,
    model_glb_path: p.glbPath,
    manual_path: p.manualPath,
    manual_public: p.manualPublic,
  };

  let id = p.id;
  let oldFiles: (string | null)[] = [];
  let oldManual: string | null = null;
  if (id && p.status === "vendido" && (await needsSale(supabase, id))) return { ok: false, error: NEEDS_SALE };
  if (!id && p.status === "vendido" && p.catalog !== "repuesto") return { ok: false, error: NEEDS_SALE };
  if (id) {
    const { data: before } = await supabase.from("products").select("status, model_glb_path, manual_path, product_images(path)").eq("id", id).single();
    oldFiles = [before?.model_glb_path ?? null, ...(before?.product_images ?? []).map((i) => i.path)];
    oldManual = before?.manual_path ?? null;
    const soldAt = p.status === "vendido" ? (before?.status === "vendido" ? undefined : new Date().toISOString()) : null;
    // Editar un producto de ejemplo lo convierte en real (ya no se borra con "Borrar datos de ejemplo")
    const { error } = await supabase
      .from("products")
      .update({ ...row, is_demo: false, ...(soldAt !== undefined && { sold_at: soldAt }) })
      .eq("id", id);
    if (error) return { ok: false, error: friendly(error.message) };
  } else {
    const { data, error } = await supabase
      .from("products")
      .insert({ ...row, created_by: ctx.session.userId, sold_at: p.status === "vendido" ? new Date().toISOString() : null })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: friendly(error?.message ?? "No se pudo crear") };
    id = data.id;
  }

  // Imágenes: se reemplaza la lista completa (orden = posición)
  const del = await supabase.from("product_images").delete().eq("product_id", id);
  if (del.error) return { ok: false, error: del.error.message };
  if (p.images.length) {
    const alt = clean(p.name);
    const { error } = await supabase
      .from("product_images")
      .insert(p.images.map((img, sort) => ({ product_id: id, path: img.path, is_reference: img.isReference, sort, alt })));
    if (error) return { ok: false, error: error.message };
  }

  // Compatibilidad (solo repuestos)
  await supabase.from("part_compatibility").delete().eq("part_id", id);
  if (p.catalog === "repuesto") {
    const rows = [
      ...p.compatModels.map((m) => ({ part_id: id, engine_model_id: m })),
      ...p.compatProducts.map((x) => ({ part_id: id, product_id: x })),
    ];
    if (rows.length) {
      const { error } = await supabase.from("part_compatibility").insert(rows);
      if (error) return { ok: false, error: error.message };
    }
  }

  // Archivos que ya no se usan
  const keep = new Set([p.glbPath, ...p.images.map((i) => i.path)]);
  await removeFiles(supabase, oldFiles.filter((f) => f && !keep.has(f)));
  if (oldManual && oldManual !== p.manualPath) await removeFiles(supabase, [oldManual], "manuales");

  updateTag("catalog");
  return { ok: true, id };
}

function friendly(message: string): string {
  if (message.includes("products_ref_key")) return "Ya existe un producto con esa referencia.";
  if (message.includes("products_catalog_slug_key")) return "Ya existe un producto con esa dirección (slug) en este catálogo.";
  return message;
}

/** Nuevo modelo de motor para la compatibilidad de repuestos. */
export async function createEngineModel(brand: string, model: string): Promise<ActionResult> {
  const ctx = await editor();
  if (!ctx) return DENIED;
  const b = brand.trim().slice(0, 60);
  const m = model.trim().slice(0, 60);
  if (!b || !m) return { ok: false, error: "Escribe la marca y el modelo." };
  const { data, error } = await ctx.supabase.from("engine_models").insert({ brand: b, model: m }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message.includes("unique") ? "Ese motor ya existe." : (error?.message ?? "Error") };
  updateTag("catalog");
  return { ok: true, id: data.id };
}
