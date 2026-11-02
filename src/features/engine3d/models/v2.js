import { buildDetailed } from "./detailed.js";

/** Versión 2 · «Plano CAD»: medidas de los planos, colores planos y bordes negros. */
export const buildV2 = (ctx) => buildDetailed(ctx, "cad");
