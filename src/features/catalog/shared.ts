import type { Locale } from "@/i18n/config";
import { localeTags } from "@/i18n/config";

/** Valor del enum en la base de datos ↔ segmento de la URL pública. */
export type CatalogType = "motobomba" | "motor" | "repuesto";
export type CatalogPath = "motobombas" | "motores" | "repuestos";
export type ProductStatus = "borrador" | "disponible" | "vendido";
/** Condición del producto (columna products.condition). */
export const productConditions = ["nuevo", "usado", "reconstruido"] as const;
export type ProductCondition = (typeof productConditions)[number];
export const isProductCondition = (v: unknown): v is ProductCondition => (productConditions as readonly unknown[]).includes(v);
/** Valor de schema.org para Google según la condición. */
export const conditionSchema: Record<ProductCondition, string> = {
  nuevo: "https://schema.org/NewCondition",
  usado: "https://schema.org/UsedCondition",
  reconstruido: "https://schema.org/RefurbishedCondition",
};
export type I18nText = Partial<Record<Locale, string>>;

export const catalogPaths: Record<CatalogType, CatalogPath> = {
  motobomba: "motobombas",
  motor: "motores",
  repuesto: "repuestos",
};
export const catalogTypes = Object.keys(catalogPaths) as CatalogType[];

export type CatalogImage = { url: string; alt: string; isReference: boolean };

export type CatalogProduct = {
  id: string;
  catalog: CatalogType;
  ref: string;
  slug: string;
  name: I18nText;
  summary: I18nText;
  description: I18nText;
  priceCop: number | null;
  status: Exclude<ProductStatus, "borrador">;
  condition: ProductCondition;
  specs: Record<string, string | number>;
  featured: boolean;
  publishedAt: string;
  categoryId: string | null;
  engineModelId: string | null;
  images: { path: string; alt: I18nText; isReference: boolean }[];
  glbPath: string | null;
  /** La guía de usuario (PDF) se puede descargar desde la ficha. */
  hasPublicManual?: boolean;
  warrantyMonths?: number | null;
};

export type CatalogCategory = { id: string; catalog: CatalogType; slug: string; name: I18nText; partKey: string | null; sort: number };
export type EngineModel = { id: string; brand: string; model: string };
export type Compatibility = { partId: string; engineModelId: string | null; productId: string | null };

/** Texto en el idioma pedido, con respaldo en español y luego en cualquier otro. */
export function tr(text: I18nText | null | undefined, locale: Locale): string {
  if (!text) return "";
  return text[locale] || text.es || Object.values(text).find(Boolean) || "";
}

const DEFAULT_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://lsrjrwpxxqlgobablyyc.supabase.co";

/** Ruta en un bucket público de Storage, ruta local (/demo/...) o URL absoluta → URL servible. */
export function bucketUrl(bucket: string, path: string, supabaseUrl?: string | null): string {
  if (!path) return "";
  if (path.startsWith("/") || /^https?:\/\//.test(path)) return path;
  const base = (supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${path.replace(/^\//, "")}`;
}

/** Ruta en Storage (bucket catalogo), ruta local (/demo/...) o URL absoluta → URL servible. */
export function storageUrl(path: string, supabaseUrl?: string | null): string {
  return bucketUrl("catalogo", path, supabaseUrl);
}

/** Ruta en el bucket público «sedes» (fotos de sedes y asesores) → URL servible. */
export function sedesUrl(path: string, supabaseUrl?: string | null): string {
  return bucketUrl("sedes", path, supabaseUrl);
}

/** Slug de una sede a partir de la ciudad (sin tildes, minúsculas, guiones; único en la lista). */
export function branchSlug(city: string, used?: Set<string>): string {
  const base =
    city
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "sede";
  if (!used) return base;
  let slug = base;
  let n = 2;
  while (used.has(slug)) slug = `${base}-${n++}`;
  used.add(slug);
  return slug;
}

export function productHref(locale: Locale, p: Pick<CatalogProduct, "catalog" | "slug">): string {
  return `/${locale}/${catalogPaths[p.catalog]}/${p.slug}`;
}

export function formatPrice(cop: number | null, locale: Locale): string | null {
  if (cop == null) return null;
  return new Intl.NumberFormat(localeTags[locale], { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(cop);
}

/** Rellena "{n}", "{name}"… en los textos del diccionario. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

// ------------------------------------------------------------ Filtros

export const sortKeys = ["new", "price-asc", "price-desc", "hp"] as const;
export type SortKey = (typeof sortKeys)[number];
export const statusFilters = ["all", "disponible", "vendido"] as const;
export type StatusFilter = (typeof statusFilters)[number];

export type CatalogQuery = {
  status: StatusFilter;
  /** Nuevo, usado o reconstruido (?condicion=). */
  condition: ProductCondition | null;
  category: string | null;
  model: string | null;
  q: string;
  sort: SortKey;
  /** Repuestos compatibles con un equipo concreto (id del producto). */
  equipment: string | null;
};

type RawParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseCatalogQuery(params: RawParams): CatalogQuery {
  const status = first(params.estado);
  const sort = first(params.orden);
  return {
    status: (statusFilters as readonly string[]).includes(status) ? (status as StatusFilter) : "all",
    condition: isProductCondition(first(params.condicion)) ? (first(params.condicion) as ProductCondition) : null,
    category: first(params.categoria) || null,
    model: first(params.motor) || null,
    q: first(params.q).trim().slice(0, 80),
    sort: (sortKeys as readonly string[]).includes(sort) ? (sort as SortKey) : "new",
    equipment: /^[0-9a-f-]{36}$/i.test(first(params.equipo)) ? first(params.equipo) : null,
  };
}

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const hp = (p: CatalogProduct) => Number(p.specs.hp) || 0;

export function filterProducts(
  products: CatalogProduct[],
  query: CatalogQuery,
  ctx: {
    locale: Locale;
    categories: CatalogCategory[];
    compat: Compatibility[];
    /** Motor del equipo elegido en ?equipo= (para incluir repuestos compatibles por motor). */
    equipmentEngine?: string | null;
  },
): CatalogProduct[] {
  const categoryId = query.category ? ctx.categories.find((c) => c.slug === query.category)?.id : null;
  const needle = normalize(query.q);
  const list = products.filter((p) => {
    if (query.status !== "all" && p.status !== query.status) return false;
    if (query.condition && p.condition !== query.condition) return false;
    if (query.category && p.categoryId !== categoryId) return false;
    if (query.model) {
      const direct = p.engineModelId === query.model;
      const viaCompat = ctx.compat.some((c) => c.partId === p.id && c.engineModelId === query.model);
      if (!direct && !viaCompat) return false;
    }
    if (query.equipment) {
      const fits = ctx.compat.some(
        (c) =>
          c.partId === p.id &&
          (c.productId === query.equipment || (!!ctx.equipmentEngine && c.engineModelId === ctx.equipmentEngine)),
      );
      if (!fits) return false;
    }
    if (needle) {
      const hay = normalize([p.ref, tr(p.name, ctx.locale), tr(p.summary, ctx.locale)].join(" "));
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
  const byDate = (a: CatalogProduct, b: CatalogProduct) => b.publishedAt.localeCompare(a.publishedAt);
  // Sin precio ("Consultar precio") va al final cuando se ordena por precio.
  const price = (p: CatalogProduct, dir: 1 | -1) => (p.priceCop == null ? Infinity : p.priceCop * dir);
  const sorters: Record<SortKey, (a: CatalogProduct, b: CatalogProduct) => number> = {
    new: byDate,
    "price-asc": (a, b) => price(a, 1) - price(b, 1) || byDate(a, b),
    "price-desc": (a, b) => price(a, -1) - price(b, -1) || byDate(a, b),
    hp: (a, b) => hp(b) - hp(a) || byDate(a, b),
  };
  return list.sort(sorters[query.sort]);
}

// ------------------------------------------------------------ Especificaciones

const specUnits: Record<string, string> = {
  hp: " HP",
  succion_in: '"',
  descarga_in: '"',
  diametro_in: '"',
  caudal_lpm: " L/min",
  cabeza_m: " m",
  rpm: " rpm",
  peso_kg: " kg",
  diametro_mm: " mm",
  capacidad_l: " L",
  voltaje_v: " V",
  solidos_mm: " mm",
  cilindrada_l: " L",
  consumo_lh: " L/h",
};

export function specValue(key: string, value: string | number | undefined, locale: Locale = "es"): string {
  if (value == null || value === "") return "";
  const v = typeof value === "number" ? value.toLocaleString(localeTags[locale]) : value;
  return `${v}${specUnits[key] ?? ""}`;
}

/** Etiquetas de estado: los repuestos se manejan por existencias (En stock / Sin stock); los equipos, Disponible / Vendido. */
export function statusLabels(
  t: { statusAvailable: string; statusSold: string; statusInStock: string; statusOutOfStock: string },
  catalog: CatalogType,
): { available: string; sold: string } {
  return catalog === "repuesto"
    ? { available: t.statusInStock, sold: t.statusOutOfStock }
    : { available: t.statusAvailable, sold: t.statusSold };
}

/**
 * Título para Google y al compartir: nombre + referencia (si el nombre no la trae ya) + potencia y succión.
 * Ej.: «Motobomba Cummins 4BT · 120 HP · 4"» en vez de «Motobomba Cummins 4BT · CUMMINS 4BT».
 */
export function productSeoTitle(name: string, ref: string, specs: Record<string, string | number>): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const parts = [name];
  if (ref && !norm(name).includes(norm(ref))) parts.push(ref);
  const hp = Number(specs.hp);
  if (hp > 0) parts.push(`${hp} HP`);
  const suction = Number(specs.succion_in);
  if (suction > 0) parts.push(`${suction}"`);
  return parts.join(" · ");
}

/** Datos que más ayudan a comparar desde Google, en orden de importancia. */
const SEO_SPEC_ORDER = [
  "hp", "caudal_lpm", "cabeza_m", "solidos_mm", "succion_in", "descarga_in", "cilindros", "cilindrada_l",
  "diametro_mm", "diametro_in", "filas", "capacidad_l", "aspas", "dientes", "voltaje_v", "material", "peso_kg",
];
const SEO_DESC_MAX = 160;

/**
 * Descripción para Google y al compartir. Si el resumen del producto ya es completo, se usa tal cual.
 * Si es corto (p. ej. «Minera · tajo abierto»), se arma con el nombre y las especificaciones de la ficha:
 * «Motobomba JF Jaguar 25: Minera · tajo abierto. Potencia 25 HP, caudal máximo 3.000 L/min… Cotiza por WhatsApp.»
 * Solo usa datos que ya están cargados en el producto.
 */
export function productSeoDescription(opts: {
  name: string;
  summary: string;
  description: string;
  specs: Record<string, string | number>;
  labels: Record<string, string>;
  cta: string;
  locale: Locale;
}): string {
  const summary = opts.summary.trim();
  if (summary.length >= 70) return summary.slice(0, SEO_DESC_MAX);
  const facts = SEO_SPEC_ORDER.flatMap((k) => {
    const value = specValue(k, opts.specs[k], opts.locale);
    return value && opts.labels[k] ? [`${opts.labels[k]} ${value}`] : [];
  });
  if (!facts.length) return summary || opts.description.trim().slice(0, SEO_DESC_MAX);
  const intro = summary ? `${opts.name}: ${summary.replace(/[.\s]+$/, "")}.` : `${opts.name}.`;
  const tag = localeTags[opts.locale];
  let list = "";
  for (const [i, fact] of facts.entries()) {
    const piece = i === 0 ? fact : `, ${fact.charAt(0).toLocaleLowerCase(tag)}${fact.slice(1)}`;
    if (`${intro} ${list}${piece}. ${opts.cta}`.length > SEO_DESC_MAX) break;
    list += piece;
  }
  return list ? `${intro} ${list}. ${opts.cta}` : `${intro} ${opts.cta}`.slice(0, SEO_DESC_MAX);
}

/** Piezas del despiece que tienen al menos un repuesto publicado (las demás aún no van a Google). */
export function partKeysWithProducts(
  categories: { id: string; partKey: string | null }[],
  products: { categoryId: string | null }[],
): Set<string> {
  const used = new Set(products.map((p) => p.categoryId));
  return new Set(categories.flatMap((c) => (c.partKey && used.has(c.id) ? [c.partKey] : [])));
}
