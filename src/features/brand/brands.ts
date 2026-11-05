/**
 * Versiones de marca del sitio (textos + paleta). Se eligen en /admin/empresa.
 *  - nueva:   textos nuevos y portada optimizada, paleta amarilla y negra.
 *  - roja:    los mismos textos nuevos, con rojo como color de acento.
 *  - clasica: la versión anterior, sin cambios.
 */
export const brandVersions = [
  {
    key: "nueva",
    name: "Nueva · Amarillo y negro",
    desc: "Textos nuevos más directos y portada optimizada: en celular la motobomba se ve completa y el texto va abajo.",
    swatches: ["#0b0d10", "#f7c600", "#eef1f4"],
  },
  {
    key: "roja",
    name: "Nueva · Con rojo",
    desc: "Los mismos textos nuevos, con rojo industrial como acento (franja, palabras clave, títulos y luz del 3D).",
    swatches: ["#0b0d10", "#f7c600", "#e1251b"],
  },
  {
    key: "clasica",
    name: "Clásica · La anterior",
    desc: "La versión de siempre, sin cambios en textos ni en la portada.",
    swatches: ["#0b0d10", "#f7c600", "#98a2ad"],
  },
] as const;

export type BrandKey = (typeof brandVersions)[number]["key"];
export const DEFAULT_BRAND: BrandKey = "nueva";

export function isBrand(v: unknown): v is BrandKey {
  return brandVersions.some((b) => b.key === v);
}

/** ¿La versión usa los textos nuevos? */
export const usesNewCopy = (b: BrandKey) => b !== "clasica";
