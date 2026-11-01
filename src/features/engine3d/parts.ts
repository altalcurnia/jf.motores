/** Piezas del motor 3D. Cada una abre su categoría de repuestos: /[lang]/repuestos/[pieza]. */
export const partKeys = [
  "radiador",
  "culata",
  "pistones",
  "camisas",
  "bloque",
  "escape",
  "tanque",
  "ventilador",
  "volante",
  "bomba",
  "tablero",
  "chasis",
  "luz",
] as const;

export type PartKey = (typeof partKeys)[number];

export function isPartKey(value: string): value is PartKey {
  return (partKeys as readonly string[]).includes(value);
}

/** Etiquetas flotantes del despiece (ids heredados del sitio original → pieza). */
export const engineLabels = [
  { id: "lbl-escape", part: "escape" },
  { id: "lbl-valvulas", part: "culata" },
  { id: "lbl-pistones", part: "pistones" },
  { id: "lbl-tanque", part: "tanque" },
  { id: "lbl-tablero", part: "tablero" },
] as const satisfies readonly { id: string; part: PartKey }[];
