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
  "acople",
  "admision",
  "mangueras",
  "arranque",
  "inyeccion",
  "carter",
  "soportes",
  "ciguenal",
] as const;

export type PartKey = (typeof partKeys)[number];

export function isPartKey(value: string): value is PartKey {
  return (partKeys as readonly string[]).includes(value);
}

/**
 * Piezas del despiece, en el orden de la fila de botones (de la bomba al radiador).
 * Cada una tiene su etiqueta flotante (#lbl-<pieza>); las "main" se ven siempre en el despiece,
 * las demás al pasar por su botón.
 */
export const engineLabels = [
  { id: "lbl-bomba", part: "bomba", main: true },
  { id: "lbl-acople", part: "acople", main: false },
  { id: "lbl-volante", part: "volante", main: false },
  { id: "lbl-bloque", part: "bloque", main: false },
  { id: "lbl-camisas", part: "camisas", main: false },
  { id: "lbl-pistones", part: "pistones", main: true },
  { id: "lbl-ciguenal", part: "ciguenal", main: false },
  { id: "lbl-culata", part: "culata", main: true },
  { id: "lbl-inyeccion", part: "inyeccion", main: false },
  { id: "lbl-admision", part: "admision", main: false },
  { id: "lbl-escape", part: "escape", main: false },
  { id: "lbl-carter", part: "carter", main: false },
  { id: "lbl-arranque", part: "arranque", main: false },
  { id: "lbl-soportes", part: "soportes", main: false },
  { id: "lbl-tanque", part: "tanque", main: false },
  { id: "lbl-mangueras", part: "mangueras", main: false },
  { id: "lbl-ventilador", part: "ventilador", main: false },
  { id: "lbl-radiador", part: "radiador", main: true },
  { id: "lbl-tablero", part: "tablero", main: false },
  { id: "lbl-chasis", part: "chasis", main: false },
] as const satisfies readonly { id: string; part: PartKey; main: boolean }[];
