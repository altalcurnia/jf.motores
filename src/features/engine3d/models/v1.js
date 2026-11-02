import * as THREE from "three";
import { ladderGuard } from "./guard.js";
import { buildCrankTrain } from "./crank.js";
import { buildValvetrain } from "./valvetrain.js";

/**
 * Versión 1 del modelo 3D (la primera aproximación a los planos).
 * Recibe el grupo del equipo, materiales base y la función para registrar piezas del despiece.
 * Devuelve las piezas (PART_GROUPS) y las partes que anima el motor (pistones, volante, ventilador…).
 */
export function buildV1({ engine, regPart, MAT, mk }) {
  /* ===== Motobomba diésel (según los planos de JF Motores) =====
     Eje X = largo del equipo (bomba en −X, radiador en +X). Eje del cigüeñal a Y = AX. */
  const AX = 1.25;
  const M2 = {
    blue: new THREE.MeshStandardMaterial({ color: 0x1f63c4, metalness: 0.35, roughness: 0.45 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xc8743a, metalness: 0.8, roughness: 0.32 }),
    red: new THREE.MeshStandardMaterial({ color: 0xd0231b, metalness: 0.2, roughness: 0.5 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc9a24e, metalness: 0.9, roughness: 0.28 }),
    frame: new THREE.MeshStandardMaterial({ color: 0x202327, metalness: 0.55, roughness: 0.55 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x141618, metalness: 0.1, roughness: 0.85 }),
    yellowDk: new THREE.MeshStandardMaterial({ color: 0xd3a400, metalness: 0.35, roughness: 0.5 }),
    gray: new THREE.MeshStandardMaterial({ color: 0xb9bec4, metalness: 0.75, roughness: 0.35 }),
  };
  function box(w, h, d, mat, x, y, z) {
    return mk(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  }
  /** Cilindro con su eje a lo largo de X, Y o Z */
  function cyl(r1, r2, len, mat, x, y, z, axis, seg) {
    const m = mk(new THREE.CylinderGeometry(r1, r2, len, seg || 24), mat, x, y, z);
    if (axis === "x") m.rotation.z = Math.PI / 2;
    else if (axis === "z") m.rotation.x = Math.PI / 2;
    return m;
  }
  /** Tubo por puntos (mangueras, escape, cañerías) */
  function tube(pts, r, mat, seg) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    return mk(new THREE.TubeGeometry(curve, seg || 40, r, 12, false), mat, 0, 0, 0);
  }
  /** Manguera corrugada: tubo + anillos a lo largo */
  function corrugated(pts, r, mat, rings) {
    const g = new THREE.Group();
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    g.add(mk(new THREE.TubeGeometry(curve, 48, r, 12, false), mat, 0, 0, 0));
    const ringGeo = new THREE.TorusGeometry(r * 1.02, r * 0.16, 6, 16);
    const up = new THREE.Vector3(0, 0, 1);
    for (let i = 1; i < rings; i++) {
      const t = i / rings;
      const ring = mk(ringGeo, mat, 0, 0, 0);
      ring.position.copy(curve.getPointAt(t));
      ring.quaternion.setFromUnitVectors(up, curve.getTangentAt(t));
      g.add(ring);
    }
    return g;
  }
  /** Oreja de izaje: placa con agujero */
  function liftEye(x, y, z, alongX) {
    const g = new THREE.Group();
    g.add(box(alongX ? 0.32 : 0.1, 0.3, alongX ? 0.1 : 0.32, M2.frame, 0, 0.12, 0));
    const ring = mk(new THREE.TorusGeometry(0.12, 0.05, 10, 24), M2.frame, 0, 0.34, 0);
    if (!alongX) ring.rotation.y = Math.PI / 2;
    g.add(ring);
    g.position.set(x, y, z);
    return g;
  }

  // --- Base de canal (chasis) ---
  const skid = new THREE.Group();
  [-1.05, 1.05].forEach((z) => {
    skid.add(box(6.5, 0.3, 0.16, M2.frame, -0.5, 0.15, z));
    skid.add(box(6.5, 0.04, 0.3, M2.frame, -0.5, 0.02, z - Math.sign(z) * 0.07));
    skid.add(box(6.5, 0.04, 0.3, M2.frame, -0.5, 0.28, z - Math.sign(z) * 0.07));
  });
  [-3.6, -2.45, -1.25, 0.3, 1.55, 2.6].forEach((x) => skid.add(box(0.16, 0.22, 2.0, M2.frame, x, 0.15, 0)));
  // Pedestal de la bomba
  skid.add(box(0.95, 0.12, 1.0, M2.frame, -3.0, 0.36, 0));
  // Pernos de anclaje
  [-3.55, -1.3, 0.25, 2.55].forEach((x) =>
    [-1.05, 1.05].forEach((z) => skid.add(cyl(0.035, 0.035, 0.08, MAT.chrome, x, 0.33, z, null, 8))),
  );
  engine.add(skid);

  // --- Marco de protección con oreja de izaje (parte del chasis) ---
  const cageG = new THREE.Group();
  const PX = -0.9;
  [-1.0, 1.0].forEach((z) => {
    cageG.add(box(0.24, 2.75, 0.2, M2.frame, PX, 1.68, z));
    const ch = box(0.24, 0.46, 0.2, M2.frame, PX, 3.2, z - Math.sign(z) * 0.16);
    ch.rotation.x = -Math.sign(z) * 0.74;
    cageG.add(ch);
    // Tirante diagonal hacia el radiador
    const br = box(0.12, 1.4, 0.12, M2.frame, PX + 0.45, 0.85, z);
    br.rotation.z = 0.62; // refuerzo: del poste (arriba) al chasis (abajo)
    cageG.add(br);
  });
  cageG.add(box(0.24, 0.2, 1.42, M2.frame, PX, 3.38, 0));
  cageG.add(liftEye(PX, 3.48, 0, false));
  engine.add(cageG);
  regPart(cageG, 0, 0.9, -2.7);

  const luzG = new THREE.Group();
  luzG.add(box(6.0, 0.05, 1.9, MAT.glow, -0.5, 0.035, 0));
  engine.add(luzG);
  // La luz ambiental es solo ambientación: no se separa en el despiece ni es una pieza
  regPart(luzG, 0, 0, 0);

  // --- Bloque (con carcasa del volante, tapa frontal, filtro de aceite) ---
  const CYL_X = [-0.93, -0.31, 0.31, 0.93];
  const blockG = new THREE.Group();
  blockG.add(box(2.6, 1.25, 1.1, MAT.yellow, 0, 1.375, 0));
  // Nervaduras y tapones laterales
  CYL_X.forEach((cx) =>
    [-0.56, 0.56].forEach((z) => {
      blockG.add(box(0.1, 1.0, 0.04, M2.yellowDk, cx + 0.31, 1.4, z));
      blockG.add(cyl(0.07, 0.07, 0.03, MAT.dark, cx, 1.55, z * 1.02, "z", 12));
    }),
  );
  // Carcasa del volante (anillo abierto: deja ver el volante)
  blockG.add(cyl(0.7, 0.7, 0.3, MAT.yellow, -1.45, AX, 0, "x", 36));
  blockG.children[blockG.children.length - 1].geometry = new THREE.CylinderGeometry(0.7, 0.7, 0.3, 36, 1, true);
  blockG.add(cyl(0.72, 0.72, 0.05, M2.yellowDk, -1.32, AX, 0, "x", 36));
  // Tapa de distribución y bomba de agua
  blockG.add(box(0.14, 1.0, 0.9, M2.yellowDk, 1.37, 1.45, 0));
  blockG.add(cyl(0.12, 0.12, 0.25, MAT.yellow, 1.45, 1.9, -0.25, "x", 16));
  // Filtro de aceite
  blockG.add(cyl(0.13, 0.13, 0.32, MAT.dark, -0.35, 1.0, 0.7, "z", 18));
  engine.add(blockG);

  // --- Cárter ---
  const carterG = new THREE.Group();
  carterG.add(box(2.3, 0.22, 0.9, M2.yellowDk, -0.05, 0.64, 0));
  carterG.add(box(1.1, 0.2, 0.7, M2.yellowDk, 0.4, 0.45, 0));
  carterG.add(cyl(0.05, 0.05, 0.06, MAT.chrome, 0.4, 0.33, 0, null, 10));
  engine.add(carterG);
  regPart(carterG, 0, -0.15, -2.2);

  // --- Camisas ---
  const linerG = new THREE.Group();
  CYL_X.forEach((cx) => {
    linerG.add(mk(new THREE.CylinderGeometry(0.25, 0.25, 0.75, 24, 1, true), MAT.glass, cx, 1.62, 0));
    const rt = mk(new THREE.TorusGeometry(0.25, 0.025, 10, 24), MAT.steel, cx, 2.0, 0);
    rt.rotation.x = Math.PI / 2;
    linerG.add(rt);
  });
  engine.add(linerG);
  regPart(linerG, 0, 1.6, 2.0);

  // --- Cigüeñal, bielas y pistones (cinemática real, ver crank.js) ---
  const crank = buildCrankTrain({ mk, MAT, cylX: CYL_X, y0: AX, r: 0.14, l: 0.47, bore: 0.22, crown: 0.14 });
  const pistonG = crank.pistonG;
  engine.add(pistonG);
  regPart(pistonG, 0, 1.5, 0);
  engine.add(crank.crankG);
  regPart(crank.crankG, 0, -0.1, 3.6);

  // --- Culata y tapas de válvulas ---
  const headG = new THREE.Group();
  headG.add(box(2.55, 0.3, 1.04, MAT.yellow, 0, 2.15, 0));
  headG.add(box(1.2, 0.24, 0.8, MAT.yellow, -0.62, 2.42, 0));
  headG.add(box(1.2, 0.24, 0.8, MAT.yellow, 0.62, 2.42, 0));
  [-0.62, 0.62].forEach((x) => {
    headG.add(box(1.24, 0.05, 0.84, M2.yellowDk, x, 2.32, 0));
    [-0.4, 0.4].forEach((dx) => headG.add(cyl(0.035, 0.035, 0.06, MAT.chrome, x + dx, 2.56, 0, null, 8)));
  });
  headG.add(cyl(0.08, 0.08, 0.08, MAT.dark, 0.2, 2.58, 0.18, null, 14));
  // Caja del termostato (recibe la manguera roja)
  headG.add(box(0.22, 0.18, 0.26, M2.yellowDk, 1.25, 2.38, -0.2));
  engine.add(headG);
  regPart(headG, 0, 3.0, 0);

  // --- Distribución, válvulas y balancines, correa y alternador (ver valvetrain.js) ---
  const vt = buildValvetrain({
    mk, MAT, cylX: CYL_X, ax: AX, crank, bore: 0.22, scale: 0.85,
    camY: 1.45, camZ: -0.32, pushZ: -0.32, deckY: 2.0, rockerY: 2.42, valveZ: 0.08, valveDx: 0.11,
    gearX: 1.37, beltX: 1.58,
    injGear: { y: 1.295, z: -0.798, x0: 0.53 },
    belt: { rCrank: 0.14, fanY: AX + 0.3, fanZ: 0, rFan: 0.112, altY: 1.78, altZ: 0.46, rAlt: 0.08 },
  });
  engine.add(vt.distG);
  regPart(vt.distG, 1.3, -0.1, -2.0);
  engine.add(vt.valvG);
  regPart(vt.valvG, 0, 1.9, 0);
  engine.add(vt.altG);
  regPart(vt.altG, 1.0, 0.6, 2.0);

  // --- Inyección: bomba, 4 tubos a los inyectores y acelerador ---
  const injG = new THREE.Group();
  injG.add(box(0.95, 0.38, 0.3, MAT.yellow, 0.05, 1.32, -0.72));
  injG.add(box(0.95, 0.06, 0.32, M2.yellowDk, 0.05, 1.53, -0.72));
  CYL_X.forEach((cx, i) => {
    const sx = -0.3 + i * 0.2;
    injG.add(cyl(0.035, 0.035, 0.12, MAT.chrome, sx, 1.6, -0.72, null, 8));
    injG.add(tube([[sx, 1.62, -0.72], [sx + (cx - sx) * 0.4, 1.95, -0.7], [cx, 2.25, -0.56], [cx, 2.42, -0.44]], 0.022, MAT.yellow, 20));
    injG.add(cyl(0.045, 0.045, 0.14, MAT.chrome, cx, 2.38, -0.44, null, 10));
  });
  // Acelerador (palanca con perilla negra)
  const lever = new THREE.Group();
  lever.position.set(-0.45, 1.4, -0.88);
  lever.add(cyl(0.025, 0.025, 0.55, MAT.steel, 0, 0.25, 0, null, 8));
  lever.add(mk(new THREE.SphereGeometry(0.075, 16, 12), M2.rubber, 0, 0.53, 0));
  lever.rotation.z = 0.35;
  injG.add(lever);
  injG.add(cyl(0.08, 0.08, 0.1, MAT.dark, -0.45, 1.4, -0.85, "z", 14));
  engine.add(injG);
  regPart(injG, 0, 1.3, -2.1);

  // --- Escape: múltiple, silenciador y cuello de ganso ---
  const escG = new THREE.Group();
  CYL_X.forEach((cx) => escG.add(cyl(0.06, 0.06, 0.2, MAT.dark, cx, 2.12, 0.62, "z", 10)));
  escG.add(cyl(0.09, 0.09, 2.0, MAT.dark, 0, 2.12, 0.74, "x", 14));
  escG.add(
    tube(
      [[-0.15, 2.12, 0.78], [-0.38, 2.4, 0.95], [-0.48, 2.9, 1.0], [-0.48, 3.6, 1.0], [-0.44, 3.95, 1.0], [-0.26, 4.1, 1.0], [-0.08, 3.98, 1.0], [-0.04, 3.7, 1.0], [-0.04, 3.55, 1.0]],
      0.1,
      M2.rubber,
      60,
    ),
  );
  escG.add(cyl(0.18, 0.18, 0.75, M2.frame, -0.48, 3.0, 1.0, null, 20));
  escG.add(cyl(0.19, 0.19, 0.05, MAT.dark, -0.48, 3.38, 1.0, null, 20));
  escG.add(cyl(0.19, 0.19, 0.05, MAT.dark, -0.48, 2.62, 1.0, null, 20));
  const smokeAnchor = new THREE.Object3D();
  smokeAnchor.position.set(-0.04, 3.5, 1.0);
  escG.add(smokeAnchor);
  engine.add(escG);
  regPart(escG, -0.3, 0.9, 2.6);

  // --- Admisión: filtro de aire y manguera corrugada ---
  const admG = new THREE.Group();
  admG.add(box(1.2, 0.12, 0.14, MAT.yellow, 0.0, 2.3, 0.6));
  admG.add(corrugated([[0.55, 2.32, 0.66], [0.75, 2.75, 0.78], [1.1, 3.0, 0.7], [1.45, 2.95, 0.55], [1.6, 2.85, 0.45]], 0.12, M2.rubber, 16));
  admG.add(cyl(0.24, 0.24, 0.62, M2.frame, 1.68, 2.85, 0.42, null, 24));
  admG.add(cyl(0.25, 0.25, 0.06, MAT.dark, 1.68, 3.17, 0.42, null, 24));
  admG.add(cyl(0.06, 0.06, 0.08, MAT.chrome, 1.68, 3.22, 0.42, null, 10));
  engine.add(admG);
  regPart(admG, 1.1, 1.2, 2.4);

  // --- Mangueras de refrigeración ---
  const hoseG = new THREE.Group();
  hoseG.add(tube([[2.12, 2.95, -0.35], [1.85, 3.05, -0.32], [1.6, 2.85, -0.25], [1.42, 2.5, -0.2], [1.3, 2.4, -0.2]], 0.1, M2.red, 32));
  [[2.05, 2.97, -0.34], [1.36, 2.42, -0.2]].forEach((p) => {
    const c = cyl(0.115, 0.115, 0.06, MAT.chrome, p[0], p[1], p[2], "x", 16);
    hoseG.add(c);
  });
  hoseG.add(tube([[2.12, 0.75, -0.45], [1.85, 0.72, -0.4], [1.6, 0.95, -0.3], [1.45, 1.1, -0.25]], 0.09, M2.rubber, 24));
  engine.add(hoseG);
  regPart(hoseG, 1.0, 1.6, -0.9);

  // --- Motor de arranque ---
  const startG = new THREE.Group();
  startG.add(cyl(0.17, 0.17, 0.55, M2.gray, 0.55, 0.95, 0.74, "x", 22));
  startG.add(cyl(0.1, 0.1, 0.36, M2.gray, 0.5, 1.2, 0.74, "x", 16));
  startG.add(cyl(0.12, 0.12, 0.06, MAT.dark, 0.25, 0.95, 0.74, "x", 16));
  engine.add(startG);
  regPart(startG, 0.2, 0.5, 2.3);

  // --- Soportes del motor (dos grupos: lado frontal y lado trasero) ---
  const mountGroups = [-1, 1].map((side) => {
    const g = new THREE.Group();
    [-0.95, 0.95].forEach((x) => {
      g.add(box(0.3, 0.52, 0.16, M2.frame, x, 0.58, side * 0.66));
      g.add(box(0.36, 0.06, 0.3, M2.frame, x, 0.33, side * 0.66));
      g.add(box(0.3, 0.06, 0.24, M2.frame, x, 0.86, side * 0.62));
      [-0.1, 0.1].forEach((dx) => g.add(cyl(0.03, 0.03, 0.07, MAT.chrome, x + dx, 0.38, side * 0.74, null, 8)));
    });
    engine.add(g);
    regPart(g, 0, 0, side * 1.6);
    return g;
  });

  // --- Tanque diésel en la base ---
  const tankG = new THREE.Group();
  tankG.add(box(2.6, 0.24, 1.5, M2.frame, 0.1, 0.17, 0));
  tankG.add(box(2.64, 0.03, 1.54, MAT.yellow, 0.1, 0.3, 0));
  tankG.add(cyl(0.1, 0.1, 0.1, MAT.yellow, 1.1, 0.35, 0.55, null, 16));
  tankG.add(cyl(0.11, 0.11, 0.03, M2.brass, 1.1, 0.41, 0.55, null, 16));
  engine.add(tankG);
  regPart(tankG, 0, 0, 2.5);

  // --- Radiador con tanque de expansión, carcasa del ventilador y oreja de izaje ---
  const radG = new THREE.Group();
  const RX = 2.35;
  radG.add(box(0.26, 2.2, 1.66, MAT.dark, RX, 1.6, 0));
  for (let i = 0; i < 16; i++) radG.add(box(0.02, 0.025, 1.6, MAT.iron, RX + 0.14, 0.6 + i * 0.13, 0));
  [-0.88, 0.88].forEach((z) => radG.add(box(0.34, 2.6, 0.1, M2.frame, RX, 1.45, z)));
  [-0.95, 0.95].forEach((z) => radG.add(box(0.2, 0.5, 0.2, M2.frame, RX, 0.45, z * 0.95)));
  // Carcasa del ventilador
  radG.add(mk(new THREE.CylinderGeometry(0.7, 0.7, 0.3, 36, 1, true), M2.frame, RX - 0.3, AX + 0.3, 0));
  radG.children[radG.children.length - 1].rotation.z = Math.PI / 2;
  radG.add(box(0.05, 1.7, 0.1, M2.frame, RX - 0.16, AX + 0.3, 0.8));
  radG.add(box(0.05, 1.7, 0.1, M2.frame, RX - 0.16, AX + 0.3, -0.8));
  // Tanque de expansión y tapa de bronce
  radG.add(box(0.52, 0.48, 1.6, M2.frame, RX - 0.08, 2.95, 0));
  radG.add(box(0.56, 0.04, 1.64, MAT.dark, RX - 0.08, 2.72, 0));
  radG.add(cyl(0.09, 0.09, 0.08, M2.brass, RX - 0.08, 3.23, 0.45, null, 18));
  radG.add(cyl(0.12, 0.12, 0.03, M2.brass, RX - 0.08, 3.28, 0.45, null, 18));
  radG.add(liftEye(RX - 0.08, 3.19, -0.35, true));
  // Salidas de agua
  radG.add(cyl(0.11, 0.11, 0.18, MAT.dark, RX - 0.25, 2.95, -0.35, "x", 14));
  radG.add(cyl(0.1, 0.1, 0.18, MAT.dark, RX - 0.22, 0.75, -0.45, "x", 14));
  engine.add(radG);
  regPart(radG, 2.2, 0.3, 0);

  // --- Ventilador (gira sobre el eje X) ---
  const fanG = new THREE.Group();
  fanG.position.set(RX - 0.32, AX + 0.3, 0);
  fanG.add(cyl(0.12, 0.12, 0.1, MAT.dark, 0, 0, 0, "x", 16));
  for (let i = 0; i < 6; i++) {
    const pv = new THREE.Group();
    pv.rotation.x = (i / 6) * Math.PI * 2;
    const blade = box(0.02, 0.5, 0.17, MAT.steel, 0, 0.36, 0);
    blade.rotation.y = 0.5;
    pv.add(blade);
    fanG.add(pv);
  }
  fanG.add(cyl(0.05, 0.05, 0.5, MAT.steel, -0.3, -0.3, 0, "x", 10));
  engine.add(fanG);
  regPart(fanG, 1.3, 0, 0);

  // --- Volante (dentro de su carcasa) ---
  const flyG = new THREE.Group();
  flyG.position.set(-1.45, AX, 0);
  flyG.add(cyl(0.62, 0.62, 0.14, MAT.iron, 0, 0, 0, "x", 36));
  flyG.add(cyl(0.18, 0.18, 0.22, MAT.chrome, 0, 0, 0, "x", 20));
  for (let i = 0; i < 4; i++) {
    const pv = new THREE.Group();
    pv.rotation.x = (i / 4) * Math.PI * 2 + 0.4;
    const hole = box(0.16, 0.14, 0.14, MAT.dark, -0.04, 0.38, 0);
    pv.add(hole);
    flyG.add(pv);
  }
  engine.add(flyG);
  regPart(flyG, 0, 1.0, 2.6);

  // --- Acople y guarda tipo escalera ---
  const coupG = new THREE.Group();
  const CX0 = -2.22,
    CX1 = -1.6;
  const coupHub = new THREE.Group();
  coupHub.position.set((CX0 + CX1) / 2, AX, 0);
  coupHub.add(cyl(0.05, 0.05, 0.62, MAT.steel, 0, 0, 0, "x", 12));
  coupHub.add(cyl(0.24, 0.24, 0.14, M2.blue, -0.1, 0, 0, "x", 22));
  coupHub.add(cyl(0.24, 0.24, 0.14, M2.blue, 0.1, 0, 0, "x", 22));
  coupHub.add(cyl(0.2, 0.2, 0.06, M2.rubber, 0, 0, 0, "x", 22));
  for (let i = 0; i < 6; i++) {
    const b = cyl(0.025, 0.025, 0.36, MAT.chrome, 0, 0, 0, "x", 6);
    b.position.set(0, Math.cos((i / 6) * Math.PI * 2) * 0.17, Math.sin((i / 6) * Math.PI * 2) * 0.17);
    coupHub.add(b);
  }
  coupG.add(coupHub);
  // Guarda tipo escalera de tijera: costados en diagonal apoyados en los rieles del chasis
  ladderGuard(coupG, { box, mat: M2.frame, x0: CX0, x1: CX1, yBot: 0.3, yTop: 1.95, zBot: 0.98, zTop: 0.44, rungs: 7, bar: 0.06 });
  engine.add(coupG);
  regPart(coupG, -0.9, 2.0, 0);

  // --- Bomba centrífuga azul (voluta, succión axial, descarga vertical, soporte de rodamientos) ---
  const pumpG = new THREE.Group();
  const VX = -3.05;
  pumpG.add(cyl(0.62, 0.62, 0.42, M2.blue, VX, AX, 0, "x", 40));
  const scroll = mk(new THREE.TorusGeometry(0.58, 0.16, 14, 40), M2.blue, VX, AX, 0);
  scroll.rotation.y = Math.PI / 2;
  pumpG.add(scroll);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    pumpG.add(cyl(0.035, 0.035, 0.5, M2.blue, VX, AX + Math.cos(a) * 0.68, Math.sin(a) * 0.68, "x", 8));
  }
  // Succión axial con brida y tapa cobriza
  pumpG.add(cyl(0.3, 0.33, 0.3, M2.blue, VX - 0.35, AX, 0, "x", 28));
  pumpG.add(cyl(0.44, 0.44, 0.08, M2.blue, VX - 0.52, AX, 0, "x", 32));
  pumpG.add(cyl(0.31, 0.31, 0.03, M2.copper, VX - 0.57, AX, 0, "x", 28));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    pumpG.add(cyl(0.03, 0.03, 0.1, MAT.dark, VX - 0.53, AX + Math.cos(a) * 0.37, Math.sin(a) * 0.37, "x", 8));
  }
  // Descarga vertical tangencial con brida y tapa cobriza
  pumpG.add(cyl(0.22, 0.26, 0.62, M2.blue, VX, AX + 0.78, 0.2, null, 24));
  pumpG.add(cyl(0.38, 0.38, 0.08, M2.blue, VX, AX + 1.11, 0.2, null, 32));
  pumpG.add(cyl(0.25, 0.25, 0.03, M2.copper, VX, AX + 1.16, 0.2, null, 28));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    pumpG.add(cyl(0.03, 0.03, 0.1, MAT.dark, VX + Math.cos(a) * 0.31, AX + 1.12, 0.2 + Math.sin(a) * 0.31, null, 8));
  }
  // Soporte de rodamientos (cónico) y placa con agujeros
  pumpG.add(cyl(0.36, 0.22, 0.6, M2.blue, VX + 0.55, AX, 0, "x", 24));
  pumpG.add(box(0.26, 0.36, 0.03, MAT.steel, VX + 0.55, AX, 0.33));
  // Patas
  pumpG.add(box(0.3, 0.55, 0.16, M2.blue, VX, 0.7, 0.32));
  pumpG.add(box(0.3, 0.55, 0.16, M2.blue, VX, 0.7, -0.32));
  pumpG.add(box(0.5, 0.06, 0.9, M2.blue, VX, 0.45, 0));
  pumpG.add(box(0.22, 0.5, 0.5, M2.blue, VX + 0.6, 0.7, 0));
  [-0.18, 0.18].forEach((dx) => [-0.38, 0.38].forEach((z) => pumpG.add(cyl(0.035, 0.035, 0.08, MAT.chrome, VX + dx, 0.5, z, null, 8))));
  engine.add(pumpG);
  regPart(pumpG, -1.9, 0.3, 0);

  // --- Tablero: 3 relojes y llave, montado en el poste del marco ---
  const tabG = new THREE.Group();
  tabG.position.set(PX, 2.6, -1.14);
  tabG.add(box(0.34, 1.25, 0.1, M2.frame, 0, 0, 0));
  const tNeedles = [];
  [0.4, 0.1, -0.2].forEach((gy) => {
    const face = cyl(0.12, 0.12, 0.03, MAT.white, 0, gy, -0.06, "z", 24);
    tabG.add(face);
    const bezel = mk(new THREE.TorusGeometry(0.125, 0.015, 8, 24), MAT.chrome, 0, gy, -0.07);
    tabG.add(bezel);
    const pv = new THREE.Group();
    pv.position.set(0, gy, -0.08);
    pv.add(box(0.015, 0.1, 0.01, MAT.dark, 0, 0.035, 0));
    tabG.add(pv);
    tNeedles.push(pv);
  });
  tabG.add(cyl(0.05, 0.05, 0.04, MAT.chrome, 0, -0.45, -0.06, "z", 14));
  tabG.add(box(0.012, 0.06, 0.02, MAT.dark, 0, -0.45, -0.09));
  tabG.add(box(0.1, 0.08, 0.02, MAT.screen, 0, -0.55, -0.06));
  engine.add(tabG);
  regPart(tabG, -0.5, 0.4, -3.5);

  /* piezas clicables → categoría de repuestos (una pieza puede tener varios grupos) */
  const PART_GROUPS = {
    chasis: [skid, cageG], bloque: [blockG], carter: [carterG], camisas: [linerG], pistones: [pistonG],
    culata: [headG], ciguenal: [crank.crankG], distribucion: [vt.distG], valvulas: [vt.valvG], alternador: [vt.altG], inyeccion: [injG], escape: [escG], admision: [admG], mangueras: [hoseG],
    arranque: [startG], soportes: mountGroups, tanque: [tankG], radiador: [radG], ventilador: [fanG],
    volante: [flyG], acople: [coupG], bomba: [pumpG], tablero: [tabG],
  };

  return { PART_GROUPS, crank, vt, flyG, fanG, coupHub, tNeedles, smokeAnchor };
}
