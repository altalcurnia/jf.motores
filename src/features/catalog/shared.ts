import type { Locale } from "@/i18n/config";
import { localeTags } from "@/i18n/config";

/** Valor del enum en la base de datos ↔ segmento de la URL pública. */
export type CatalogType = "motobomba" | "motor" | "repuesto";
export type CatalogPath = "motobombas" | "motores" | "repuestos";
export type ProductStatus = "borrador" | "disponible" | "vendido";
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

/** Ruta en Storage, ruta local (/demo/...) o URL absoluta → URL servible. */
export function storageUrl(path: string, supabaseUrl: string | undefined): string {
  if (path.startsWith("/") || /^https?:\/\//.test(path)) return path;
  const base = (supabaseUrl ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/catalogo/${path.replace(/^\//, "")}`;
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
