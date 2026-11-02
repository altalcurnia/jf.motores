/**
 * Guarda del acople tipo escalera de tijera (como en los planos): los dos costados bajan en
 * diagonal, más abiertos abajo, y se apoyan sobre los rieles del chasis con su pie de anclaje.
 * Arriba lleva una parrilla plana.
 *
 * @param {{ box: Function, mat: any, footMat?: any, x0: number, x1: number, yBot: number, yTop: number,
 *   zBot: number, zTop: number, rungs?: number, bar?: number }} o
 * @param {import("three").Group} g grupo donde se agregan las barras
 */
export function ladderGuard(g, o) {
  const { box, mat, x0, x1, yBot, yTop, zBot, zTop } = o;
  const rungs = o.rungs ?? 7;
  const bar = o.bar ?? 0.07;
  const L = x1 - x0;
  const xm = (x0 + x1) / 2;
  const dy = yTop - yBot;
  const dz = zBot - zTop;
  const len = Math.hypot(dy, dz);
  [-1, 1].forEach((s) => {
    // inclinación: el extremo de arriba se acerca al centro
    const ang = Math.atan2(-s * dz, dy);
    const at = (t) => [yBot + dy * t, s * (zBot - dz * t)];
    // largueros (las «patas» de la escalera)
    [x0 + bar / 2, x1 - bar / 2].forEach((x) => {
      const [y, z] = at(0.5);
      const p = box(bar, len + 0.04, bar, mat, x, y, z);
      p.rotation.x = ang;
      g.add(p);
    });
    // peldaños: pletinas a lo largo del equipo, siguiendo la diagonal
    for (let i = 0; i < rungs; i++) {
      const [y, z] = at((i + 0.7) / (rungs + 0.4));
      const r = box(L, bar * 1.3, 0.035, mat, xm, y, z);
      r.rotation.x = ang;
      g.add(r);
    }
    // pie de anclaje sobre el riel, con pernos
    g.add(box(L + 0.12, 0.04, 0.22, o.footMat || mat, xm, yBot + 0.02, s * zBot));
    // borde superior
    g.add(box(L, bar * 0.8, bar * 1.2, mat, xm, yTop, s * zTop));
  });
  // parrilla superior
  const n = Math.max(3, Math.round(L / 0.2));
  for (let i = 0; i <= n; i++) g.add(box(bar * 0.9, 0.045, zTop * 2, mat, x0 + bar / 2 + (i * (L - bar)) / n, yTop, 0));
}
