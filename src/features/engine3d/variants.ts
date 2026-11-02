/** Versiones del modelo 3D del inicio. La geometría vive en models/; aquí van los datos para el admin. */
export const engineVariants = [
  {
    key: "v1",
    name: "Versión 1 · Primera aproximación",
    desc: "Formas simples y livianas. Carga más rápido en celulares básicos.",
    thumb: "/admin/motor-v1.jpg",
  },
  {
    key: "v2",
    name: "Versión 2 · Plano CAD",
    desc: "Medidas tomadas de las vistas del plano, colores planos y bordes negros como el render CAD.",
    thumb: "/admin/motor-v2.jpg",
  },
  {
    key: "v3",
    name: "Versión 3 · Foto real",
    desc: "Mismas medidas, con pintura gastada, metal sucio y aristas redondeadas como la foto.",
    thumb: "/admin/motor-v3.jpg",
  },
] as const;

export type EngineVariant = (typeof engineVariants)[number]["key"];

export function isEngineVariant(v: unknown): v is EngineVariant {
  return engineVariants.some((x) => x.key === v);
}
