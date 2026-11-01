import "server-only";
import { getCatalogData, compatibleParts, compatibleWith } from "@/features/catalog/data";
import { formatPrice, productHref, tr, type CatalogProduct } from "@/features/catalog/shared";
import type { AssistantLocale } from "./harness";
import { site } from "@/lib/site";

const LABEL: Record<string, [string, string]> = {
  hp: ["Potencia", " HP"],
  succion_in: ["Succión", "″"],
  descarga_in: ["Descarga", "″"],
  caudal_lpm: ["Caudal máx.", " L/min"],
  cabeza_m: ["Altura máx.", " m"],
  rpm: ["Régimen", " rpm"],
  arranque: ["Arranque", ""],
  peso_kg: ["Peso", " kg"],
  cilindros: ["Cilindros", ""],
  refrigeracion: ["Refrigeración", ""],
  material: ["Material", ""],
  diametro_mm: ["Diámetro", " mm"],
  diametro_in: ["Diámetro", "″"],
  capacidad_l: ["Capacidad", " L"],
  voltaje_v: ["Voltaje", " V"],
};
const KIND = { motobomba: "Motobomba", motor: "Motor", repuesto: "Repuesto" } as const;

function specs(p: CatalogProduct): string {
  return Object.entries(p.specs)
    .map(([k, v]) => (LABEL[k] ? `${LABEL[k][0]} ${v}${LABEL[k][1]}` : `${k} ${v}`))
    .join("; ");
}

/** Catálogo publicado como texto para el asistente: una línea por producto, con precio, estado, enlace y compatibilidad. */
export async function catalogForAssistant(locale: AssistantLocale): Promise<string> {
  const data = await getCatalogData();
  const base = site.url.replace(/\/$/, "");
  const byId = new Map(data.products.map((p) => [p.id, p]));
  const catById = new Map(data.categories.map((c) => [c.id, c]));
  const lines = data.products
    .map((p) => {
      const price = formatPrice(p.priceCop, locale);
      const parts = [
        `${KIND[p.catalog]} ${p.ref}`,
        tr(p.name, locale),
        p.status === "vendido" ? "VENDIDO" : "Disponible",
        price ? `Precio ${price} COP (envío aparte)` : "Precio a consultar",
        p.warrantyMonths ? `Garantía ${p.warrantyMonths} meses` : "",
        specs(p),
        tr(p.summary, locale),
        `Ficha: ${base}${productHref(locale, p)}`,
      ];
      const cat = p.categoryId ? catById.get(p.categoryId) : undefined;
      if (cat) parts.push(`Categoría: ${tr(cat.name, locale)}${cat.partKey ? ` (${base}/${locale}/repuestos/${cat.partKey})` : ""}`);
      if (p.catalog === "repuesto") {
        const c = compatibleWith(data, p);
        const list = [...c.models.map((m) => `${m.brand} ${m.model}`), ...c.products.map((x) => x.ref)];
        if (list.length) parts.push(`Compatible con: ${list.join(", ")}`);
      } else {
        const refs = compatibleParts(data, p).map((x) => byId.get(x.id)?.ref).filter(Boolean);
        if (refs.length) parts.push(`Repuestos compatibles: ${refs.join(", ")}`);
      }
      return "- " + parts.filter(Boolean).join(" · ");
    });

  // Índice por modelo de motor: qué repuestos le sirven (para preguntas como "pistón para JF D25-4C")
  const index = data.engineModels
    .map((m) => {
      const parts = data.compat
        .filter((c) => c.engineModelId === m.id)
        .map((c) => byId.get(c.partId))
        .filter((x): x is CatalogProduct => !!x)
        .map((x) => `${x.ref} ${tr(x.name, locale)} (${base}${productHref(locale, x)})`);
      const units = data.products.filter((x) => x.engineModelId === m.id).map((x) => x.ref);
      if (!parts.length && !units.length) return "";
      return `- Motor ${m.brand} ${m.model}${units.length ? ` (lo llevan: ${units.join(", ")})` : ""}: ${parts.length ? parts.join("; ") : "sin repuestos publicados"}`;
    })
    .filter(Boolean);

  return [
    `Páginas de repuestos por pieza: ${base}/${locale}/repuestos/<pieza> (radiador, culata, pistones, camisas, bloque, escape, tanque, ventilador, volante, bomba, tablero, chasis).`,
    "PRODUCTOS:",
    ...lines,
    index.length ? "REPUESTOS POR MODELO DE MOTOR:" : "",
    ...index,
  ]
    .filter(Boolean)
    .join("\n");
}
