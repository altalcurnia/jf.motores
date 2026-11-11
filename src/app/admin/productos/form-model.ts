import type { CatalogType } from "@/features/catalog/shared";
import type { ProductInput } from "./actions";

/** Modelo del formulario de producto (compartido entre servidor y cliente). */
export type Lang = "es" | "en" | "pt";
export type Option = { id: string; label: string };
export type FormOptions = {
  categories: (Option & { catalog: CatalogType })[];
  engineModels: Option[];
  equipment: (Option & { catalog: CatalogType })[];
};
export type ProductFormValue = ProductInput & { isDemo: boolean };

/** Especificaciones sugeridas (la clave es la que traduce el sitio a cada idioma). */
export const SPEC_KEYS: Record<CatalogType, [string, string][]> = {
  motobomba: [["hp", "Potencia (HP)"], ["succion_in", "Succión (pulgadas)"], ["descarga_in", "Descarga (pulgadas)"], ["caudal_lpm", "Caudal máximo (L/min)"], ["cabeza_m", "Cabeza máxima (m)"], ["solidos_mm", "Paso de sólidos (mm)"], ["rpm", "Régimen (rpm)"], ["arranque", "Arranque"], ["consumo_lh", "Consumo al 75 % (L/h)"], ["peso_kg", "Peso (kg)"]],
  motor: [["hp", "Potencia (HP)"], ["cilindros", "Cilindros"], ["cilindrada_l", "Cilindrada (L)"], ["rpm", "Régimen (rpm)"], ["aspiracion", "Aspiración"], ["refrigeracion", "Refrigeración"], ["arranque", "Arranque"], ["consumo_lh", "Consumo al 75 % (L/h)"], ["peso_kg", "Peso (kg)"]],
  repuesto: [["material", "Material"], ["diametro_mm", "Diámetro (mm)"], ["diametro_in", "Diámetro (pulgadas)"], ["unidades", "Unidades"], ["capacidad_l", "Capacidad (L)"], ["voltaje_v", "Voltaje (V)"], ["filas", "Filas"], ["aspas", "Aspas"], ["dientes", "Dientes"], ["caras", "Caras del sello"]],
};

export const emptyProduct = (): ProductFormValue => ({
  id: null,
  catalog: "motobomba",
  categoryId: null,
  ref: "",
  slug: "",
  name: { es: "", en: "", pt: "" },
  summary: { es: "", en: "", pt: "" },
  description: { es: "", en: "", pt: "" },
  priceCop: null,
  status: "borrador",
  condition: "nuevo",
  publishedAt: null,
  featured: false,
  specs: SPEC_KEYS.motobomba.slice(0, 5).map(([key]) => ({ key, value: "" })),
  engineModelId: null,
  glbPath: null,
  manualPath: null,
  manualPublic: false,
  warrantyMonths: null,
  images: [],
  compatModels: [],
  compatProducts: [],
  isDemo: false,
});

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

