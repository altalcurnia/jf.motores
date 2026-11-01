// Etapas del recorrido del motor (progreso del scroll de #journey, 0 → 1).
// Las comparten la animación 3D (engine.js) y las tarjetas (EngineExperience.tsx).
// x = despiece libre: sin tarjeta, con la fila de piezas a un lado.
export const STAGES = [
  { key: "a", from: 0, to: 0.15 },
  { key: "b", from: 0.15, to: 0.33 },
  { key: "c", from: 0.33, to: 0.42 },
  { key: "x", from: 0.42, to: 0.63 },
  { key: "d", from: 0.63, to: 0.76 },
  { key: "e", from: 0.76, to: 1.01 },
];
// En la tarjeta de la app, el dedo toca "Apagar" aquí y el motor se detiene hasta STOP_END
export const STOP_AT = 0.8;
export const STOP_END = 0.88;

export function stageAt(p) {
  return STAGES.find((s) => p >= s.from && p < s.to) ?? STAGES[STAGES.length - 1];
}
