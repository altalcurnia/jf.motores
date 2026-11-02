import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/**
 * Modelo detallado de la motobomba, medido sobre los planos (vista lateral, trasera y frontal).
 * Lo usan dos versiones con distinto acabado:
 *  - "cad":  colores planos y bordes negros, como los renders del plano.
 *  - "real": pintura gastada, metal sucio y aristas redondeadas, como la foto.
 * Eje X = largo (bomba en −X, radiador en +X); Y = alto; Z = ancho (−Z = lado del tablero).
 */
export function buildDetailed({ engine, regPart, MAT, mk, isMobile }, style) {
  const real = style === "real";
  const cad = !real;
  const SCALE = 0.85;
  const AX = 1.75; // eje del cigüeñal y de la bomba

  /* ---------- acabados ---------- */
  function grunge(base, opts) {
    const c = document.createElement("canvas");
    const N = isMobile ? 128 : 256;
    c.width = c.height = N;
    const g = c.getContext("2d");
    g.fillStyle = base;
    g.fillRect(0, 0, N, N);
    let seed = opts.seed || 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    // Moteado de pintura
    for (let i = 0; i < N * 6; i++) {
      const a = rnd() * 0.08;
      g.fillStyle = rnd() > 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 0.6})`;
      g.fillRect(rnd() * N, rnd() * N, 1 + rnd() * 3, 1 + rnd() * 3);
    }
    // Chorreones de suciedad
    for (let i = 0; i < (opts.streaks || 10); i++) {
      const x = rnd() * N;
      const grd = g.createLinearGradient(x, 0, x, N);
      grd.addColorStop(0, "rgba(30,22,10,0)");
      grd.addColorStop(1, `rgba(30,22,10,${0.12 + rnd() * 0.18})`);
      g.fillStyle = grd;
      g.fillRect(x, rnd() * N * 0.5, 2 + rnd() * 6, N);
    }
    // Pintura saltada (deja ver metal)
    for (let i = 0; i < (opts.chips || 14); i++) {
      g.fillStyle = `rgba(${opts.metal || "120,118,112"},${0.5 + rnd() * 0.4})`;
      g.beginPath();
      g.ellipse(rnd() * N, rnd() * N, 1 + rnd() * 4, 1 + rnd() * 2.5, rnd() * 3, 0, Math.PI * 2);
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.encoding = THREE.sRGBEncoding;
    return t;
  }
  function paint(hex, cadProps, realProps, tex) {
    if (cad) return new THREE.MeshStandardMaterial({ color: hex, metalness: 0.15, roughness: 0.55, ...cadProps });
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: grunge("#" + hex.toString(16).padStart(6, "0"), tex || {}),
      metalness: 0.4,
      roughness: 0.62,
      ...realProps,
    });
  }
  const P = {
    yellow: paint(0xf2bf00, {}, {}, { streaks: 14, chips: 22, seed: 11 }),
    yellowDk: paint(0xc99c00, {}, {}, { streaks: 18, chips: 10, seed: 5 }),
    blue: paint(0x1f6fe0, {}, { metalness: 0.45 }, { streaks: 8, chips: 26, metal: "150,140,130", seed: 3 }),
    frame: paint(cad ? 0x1b1d20 : 0x2a2c2f, {}, { metalness: 0.55, roughness: 0.58 }, { streaks: 6, chips: 30, metal: "150,150,150", seed: 9 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x151719, metalness: 0.05, roughness: 0.9 }),
    red: new THREE.MeshStandardMaterial({ color: cad ? 0xe0201a : 0xc61f17, metalness: 0.1, roughness: 0.5 }),
    copper: new THREE.MeshStandardMaterial({ color: cad ? 0xff8a1c : 0xc06c34, metalness: cad ? 0.2 : 0.85, roughness: cad ? 0.5 : 0.3 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xcaa255, metalness: 0.9, roughness: 0.25 }),
    gray: new THREE.MeshStandardMaterial({ color: 0xb8bcc1, metalness: 0.7, roughness: 0.35 }),
    plate: new THREE.MeshStandardMaterial({ color: 0x9aa0a6, metalness: 0.7, roughness: 0.4 }),
  };
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x050607, transparent: true, opacity: 0.85 });

  /* ---------- utilidades de forma ---------- */
  function box(w, h, d, mat, x, y, z, r) {
    const geo = real && (r ?? 0.03) > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r ?? 0.03, w / 2.2, h / 2.2, d / 2.2)) : new THREE.BoxGeometry(w, h, d);
    return mk(geo, mat, x, y, z);
  }
  function cyl(r1, r2, len, mat, x, y, z, axis, seg) {
    const m = mk(new THREE.CylinderGeometry(r1, r2, len, seg || 28), mat, x, y, z);
    if (axis === "x") m.rotation.z = Math.PI / 2;
    else if (axis === "z") m.rotation.x = Math.PI / 2;
    return m;
  }
  function ring(r, tube, mat, x, y, z, axis) {
    const m = mk(new THREE.TorusGeometry(r, tube, 10, 32), mat, x, y, z);
    if (axis === "x") m.rotation.y = Math.PI / 2;
    else if (axis === "y") m.rotation.x = Math.PI / 2;
    return m;
  }
  function curve(pts) {
    return new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  }
  function tube(pts, r, mat, seg) {
    return mk(new THREE.TubeGeometry(curve(pts), seg || 48, r, 14, false), mat, 0, 0, 0);
  }
  function corrugated(pts, r, mat, rings) {
    const g = new THREE.Group();
    const c = curve(pts);
    g.add(mk(new THREE.TubeGeometry(c, 60, r, 14, false), mat, 0, 0, 0));
    const rg = new THREE.TorusGeometry(r * 1.03, r * 0.17, 6, 18);
    const up = new THREE.Vector3(0, 0, 1);
    for (let i = 1; i < rings; i++) {
      const m = mk(rg, mat, 0, 0, 0);
      m.position.copy(c.getPointAt(i / rings));
      m.quaternion.setFromUnitVectors(up, c.getTangentAt(i / rings));
      g.add(m);
    }
    return g;
  }
  function bolts(n, rad, len, mat, x, y, z, axis, br) {
    const g = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const b = cyl(br || 0.035, br || 0.035, len, mat, 0, 0, 0, axis, 8);
      if (axis === "x") b.position.set(x, y + Math.cos(a) * rad, z + Math.sin(a) * rad);
      else if (axis === "z") b.position.set(x + Math.cos(a) * rad, y + Math.sin(a) * rad, z);
      else b.position.set(x + Math.cos(a) * rad, y, z + Math.sin(a) * rad);
      g.add(b);
    }
    return g;
  }
  function liftLug(x, y, z, alongX) {
    const g = new THREE.Group();
    g.add(box(alongX ? 0.4 : 0.12, 0.34, alongX ? 0.12 : 0.4, P.frame, 0, 0.17, 0, 0.02));
    const r = ring(0.13, 0.065, P.frame, 0, 0.38, 0, alongX ? null : "x");
    g.add(r);
    g.position.set(x, y, z);
    return g;
  }
  /** Canal C (riel del chasis) */
  function channel(len, h, x, y, z, side) {
    const g = new THREE.Group();
    g.add(box(len, h, 0.06, P.frame, 0, 0, side * 0.09, 0.01));
    g.add(box(len, 0.06, 0.24, P.frame, 0, h / 2 - 0.03, 0, 0.01));
    g.add(box(len, 0.06, 0.24, P.frame, 0, -h / 2 + 0.03, 0, 0.01));
    g.position.set(x, y, z);
    return g;
  }

  /* ---------- CHASIS: base de canal ---------- */
  const skid = new THREE.Group();
  const SK0 = -3.55,
    SK1 = 3.6,
    SKZ = 1.38;
  [-1, 1].forEach((s) => skid.add(channel(SK1 - SK0, 0.4, (SK0 + SK1) / 2, 0.2, s * SKZ, s)));
  [-3.4, -2.2, -0.75, 0.9, 2.35, 3.45].forEach((x) => skid.add(box(0.14, 0.26, SKZ * 2, P.frame, x, 0.25, 0, 0.01)));
  skid.add(box(1.5, 0.12, 1.5, P.frame, -2.75, 0.46, 0, 0.02)); // pedestal de la bomba
  [-3.4, -2.2, -0.75, 0.9, 2.35, 3.45].forEach((x) => [-1, 1].forEach((s) => skid.add(cyl(0.04, 0.04, 0.06, MAT.chrome, x, 0.42, s * (SKZ - 0.08), null, 8))));
  engine.add(skid);

  /* ---------- MARCO de protección (parte del chasis) ---------- */
  const cageG = new THREE.Group();
  const PX = -0.55,
    PZ = 1.28,
    PT = 0.28;
  [-1, 1].forEach((s) => {
    cageG.add(box(PT, 3.9, PT, P.frame, PX, 2.35, s * PZ, 0.03));
    const ch = box(PT, 0.58, PT, P.frame, PX, 4.42, s * (PZ - 0.2), 0.03);
    ch.rotation.x = -s * 0.8;
    cageG.add(ch);
    // Tirante diagonal hacia el radiador y pie de apoyo
    const br = box(0.16, 1.7, 0.16, P.frame, PX + 0.62, 1.1, s * PZ, 0.02);
    br.rotation.z = -0.72;
    cageG.add(br);
    cageG.add(box(0.5, 0.06, 0.5, P.frame, PX, 0.43, s * PZ, 0.01));
  });
  cageG.add(box(PT, PT, (PZ - 0.42) * 2, P.frame, PX, 4.62, 0, 0.03));
  cageG.add(liftLug(PX, 4.76, 0, false));
  engine.add(cageG);
  regPart(cageG, 0, 0.9, -3.0);

  /* luz ambiental bajo el chasis */
  const luzG = new THREE.Group();
  luzG.add(box(6.8, 0.05, 2.5, MAT.glow, 0, 0.035, 0, 0));
  engine.add(luzG);
  regPart(luzG, 0, 0, 0);

  /* ---------- MOTOR: bloque, carcasa del volante, tapa frontal ---------- */
  const EX0 = -0.42,
    EX1 = 2.12,
    EXM = (EX0 + EX1) / 2,
    EW = 0.64;
  const CYL_X = [0.0, 0.58, 1.16, 1.74];
  const blockG = new THREE.Group();
  blockG.add(box(EX1 - EX0, 1.22, EW * 2, P.yellow, EXM, 2.16, 0, 0.06));
  // faldón del cárter y nervaduras
  blockG.add(box(EX1 - EX0 - 0.1, 0.18, EW * 2 + 0.08, P.yellowDk, EXM, 1.6, 0, 0.03));
  CYL_X.forEach((cx) =>
    [-1, 1].forEach((s) => {
      blockG.add(box(0.1, 0.95, 0.06, P.yellowDk, cx + 0.29, 2.2, s * (EW + 0.02), 0.02));
      blockG.add(cyl(0.075, 0.075, 0.04, MAT.dark, cx, 2.35, s * (EW + 0.02), "z", 14));
      blockG.add(box(0.36, 0.12, 0.05, P.yellowDk, cx, 1.85, s * (EW + 0.02), 0.02));
    }),
  );
  // carcasa del volante (campana) y anillo de pernos
  const bell = mk(new THREE.CylinderGeometry(0.88, 0.8, 0.42, 40, 1, true), P.yellow, EX0 - 0.21, AX, 0);
  bell.rotation.z = Math.PI / 2;
  blockG.add(bell);
  blockG.add(ring(0.88, 0.05, P.yellowDk, EX0 - 0.42, AX, 0, "x"));
  blockG.add(bolts(12, 0.88, 0.08, MAT.dark, EX0 - 0.44, AX, 0, "x", 0.03));
  // tapa de distribución, bomba de agua y polea
  blockG.add(box(0.16, 1.25, EW * 2 - 0.1, P.yellowDk, EX1 + 0.08, 2.25, 0, 0.04));
  blockG.add(cyl(0.26, 0.26, 0.1, MAT.dark, EX1 + 0.22, AX, 0, "x", 30));
  blockG.add(cyl(0.18, 0.2, 0.3, P.yellow, EX1 + 0.18, 2.55, 0.25, "x", 22));
  blockG.add(cyl(0.16, 0.16, 0.1, MAT.dark, EX1 + 0.3, 2.55, 0.25, "x", 22));
  // filtro de aceite y varilla
  blockG.add(cyl(0.15, 0.15, 0.36, MAT.dark, 0.7, 1.95, EW + 0.18, "z", 22));
  blockG.add(cyl(0.02, 0.02, 0.6, P.yellowDk, 1.4, 2.4, EW + 0.05, null, 8));
  engine.add(blockG);

  /* ---------- CÁRTER ---------- */
  const carterG = new THREE.Group();
  carterG.add(box(EX1 - EX0 - 0.25, 0.28, EW * 2 - 0.12, P.yellowDk, EXM + 0.05, 1.37, 0, 0.05));
  carterG.add(box(1.2, 0.22, EW * 2 - 0.3, P.yellowDk, EXM + 0.4, 1.14, 0, 0.05));
  carterG.add(cyl(0.05, 0.05, 0.07, MAT.chrome, EXM + 0.4, 1.0, 0, null, 10));
  engine.add(carterG);
  regPart(carterG, 0, -0.1, -2.4);

  /* ---------- CAMISAS y PISTONES ---------- */
  const PISTON_Y = 2.4;
  const PISTON_PHASE = [0, Math.PI, Math.PI, 0];
  const linerG = new THREE.Group();
  const pistonG = new THREE.Group();
  const pistonBodies = [];
  CYL_X.forEach((cx) => {
    linerG.add(mk(new THREE.CylinderGeometry(0.25, 0.25, 0.85, 26, 1, true), MAT.glass, cx, 2.3, 0));
    linerG.add(ring(0.25, 0.026, MAT.steel, cx, 2.73, 0, "y"));
    const pb = new THREE.Group();
    pb.position.set(cx, PISTON_Y, 0);
    pb.add(mk(new THREE.CylinderGeometry(0.22, 0.22, 0.38, 24), MAT.chrome, 0, 0, 0));
    for (let r = 0; r < 3; r++) pb.add(ring(0.222, 0.013, MAT.dark, 0, 0.11 - r * 0.06, 0, "y"));
    pb.add(mk(new THREE.CylinderGeometry(0.045, 0.065, 0.62, 10), MAT.steel, 0, -0.47, 0));
    const pin = cyl(0.05, 0.05, 0.3, MAT.dark, 0, -0.05, 0, "z", 10);
    pb.add(pin);
    pistonG.add(pb);
    pistonBodies.push(pb);
  });
  engine.add(linerG);
  regPart(linerG, 0, 1.7, 2.1);
  engine.add(pistonG);
  regPart(pistonG, 0, 2.5, 0);

  /* ---------- CULATA y tapas de balancines ---------- */
  const headG = new THREE.Group();
  headG.add(box(EX1 - EX0 - 0.06, 0.36, EW * 2 - 0.02, P.yellow, EXM, 2.95, 0, 0.05));
  headG.add(box(EX1 - EX0 - 0.02, 0.05, EW * 2 + 0.02, P.yellowDk, EXM, 2.79, 0, 0.01));
  [
    [0.0, 0.58],
    [1.16, 1.74],
  ].forEach(([a, b]) => {
    const cx = (a + b) / 2;
    headG.add(box(1.12, 0.32, 0.92, P.yellow, cx, 3.3, 0, 0.12));
    headG.add(box(1.18, 0.05, 0.98, P.yellowDk, cx, 3.15, 0, 0.02));
    [-0.42, 0, 0.42].forEach((dx) => headG.add(cyl(0.035, 0.035, 0.06, MAT.chrome, cx + dx, 3.47, 0, null, 8)));
  });
  headG.add(cyl(0.09, 0.09, 0.1, MAT.dark, 0.3, 3.5, 0.22, null, 16));
  // caja del termostato (recibe la manguera roja)
  headG.add(box(0.26, 0.22, 0.3, P.yellowDk, EX1 - 0.12, 3.25, -0.25, 0.04));
  engine.add(headG);
  regPart(headG, 0, 2.6, 0);

  /* ---------- INYECCIÓN: bomba, 4 cañerías, inyectores y acelerador (lado del tablero, −Z) ---------- */
  const injG = new THREE.Group();
  injG.add(box(1.0, 0.42, 0.34, P.yellow, 0.95, 2.35, -(EW + 0.2), 0.04));
  injG.add(box(1.0, 0.06, 0.36, P.yellowDk, 0.95, 2.59, -(EW + 0.2), 0.01));
  injG.add(cyl(0.12, 0.12, 0.3, P.yellow, 0.3, 2.35, -(EW + 0.2), "x", 18));
  CYL_X.forEach((cx, i) => {
    const sx = 0.62 + i * 0.22;
    injG.add(cyl(0.035, 0.035, 0.12, MAT.chrome, sx, 2.66, -(EW + 0.2), null, 8));
    injG.add(
      tube(
        [
          [sx, 2.7, -(EW + 0.2)],
          [sx + (cx - sx) * 0.35, 2.92, -(EW + 0.22)],
          [cx, 3.1, -(EW + 0.08)],
          [cx, 3.22, -(EW - 0.12)],
        ],
        0.022,
        P.yellow,
        24,
      ),
    );
    injG.add(cyl(0.045, 0.045, 0.16, MAT.chrome, cx, 3.2, -(EW - 0.12), null, 10));
  });
  const lever = new THREE.Group();
  lever.position.set(0.05, 2.35, -(EW + 0.42));
  lever.add(box(0.3, 0.2, 0.06, P.frame, 0.08, 0, 0, 0.01));
  const arm = cyl(0.025, 0.025, 0.62, MAT.steel, -0.12, 0.26, -0.05, null, 8);
  arm.rotation.z = 0.5;
  lever.add(arm);
  lever.add(mk(new THREE.SphereGeometry(0.085, 18, 14), P.rubber, -0.27, 0.53, -0.05));
  injG.add(lever);
  injG.add(tube([[0.2, 2.35, -(EW + 0.36)], [0.6, 2.2, -(EW + 0.34)], [0.9, 2.2, -(EW + 0.24)]], 0.012, MAT.steel, 16));
  engine.add(injG);
  regPart(injG, 0, 1.2, -2.0);

  /* ---------- ESCAPE: múltiple, silenciador vertical y cuello de ganso (lado +Z) ---------- */
  const escG = new THREE.Group();
  CYL_X.forEach((cx) => escG.add(box(0.2, 0.18, 0.2, P.frame, cx, 2.92, EW + 0.08, 0.04)));
  escG.add(cyl(0.1, 0.1, 1.95, P.frame, 0.87, 2.92, EW + 0.2, "x", 16));
  const MX = -0.1,
    MZ = EW + 0.42;
  escG.add(tube([[0.0, 2.92, EW + 0.2], [-0.05, 3.0, EW + 0.32], [MX, 3.15, MZ]], 0.1, P.frame, 16));
  escG.add(cyl(0.25, 0.25, 0.95, P.frame, MX, 3.6, MZ, null, 26));
  escG.add(ring(0.25, 0.03, MAT.dark, MX, 3.13, MZ, "y"));
  escG.add(ring(0.25, 0.03, MAT.dark, MX, 4.07, MZ, "y"));
  escG.add(
    tube(
      [
        [MX, 4.05, MZ],
        [MX, 4.55, MZ],
        [MX + 0.04, 4.82, MZ],
        [MX + 0.24, 4.98, MZ],
        [MX + 0.44, 4.84, MZ],
        [MX + 0.5, 4.6, MZ],
        [MX + 0.5, 4.42, MZ],
      ],
      0.11,
      P.rubber,
      60,
    ),
  );
  const smokeAnchor = new THREE.Object3D();
  smokeAnchor.position.set(MX + 0.5, 4.35, MZ);
  escG.add(smokeAnchor);
  engine.add(escG);
  regPart(escG, -0.3, 0.8, 2.4);

  /* ---------- ADMISIÓN: múltiple, manguera corrugada y filtro de aire ---------- */
  const admG = new THREE.Group();
  admG.add(box(1.7, 0.16, 0.18, P.yellow, 0.95, 3.18, EW - 0.02, 0.04));
  admG.add(
    corrugated(
      [
        [1.55, 3.25, EW + 0.06],
        [1.75, 3.7, EW + 0.1],
        [2.1, 3.95, 0.55],
        [2.35, 3.98, 0.4],
      ],
      0.14,
      P.rubber,
      18,
    ),
  );
  admG.add(cyl(0.27, 0.27, 0.7, P.frame, 2.4, 3.98, 0.12, "z", 28));
  admG.add(cyl(0.28, 0.28, 0.05, MAT.dark, 2.4, 3.98, -0.24, "z", 28));
  admG.add(cyl(0.28, 0.28, 0.05, MAT.dark, 2.4, 3.98, 0.48, "z", 28));
  admG.add(box(0.12, 0.5, 0.5, P.frame, 2.4, 3.6, 0.12, 0.02));
  engine.add(admG);
  regPart(admG, 0.9, 1.1, 2.2);

  /* ---------- MANGUERAS: superior roja y inferior negra ---------- */
  const RX0 = 2.78,
    RX1 = 3.22;
  const hoseG = new THREE.Group();
  hoseG.add(
    tube(
      [
        [RX0 - 0.02, 4.15, -0.3],
        [RX0 - 0.35, 4.22, -0.3],
        [RX0 - 0.65, 3.85, -0.28],
        [EX1 + 0.05, 3.42, -0.26],
        [EX1 - 0.1, 3.36, -0.25],
      ],
      0.11,
      P.red,
      40,
    ),
  );
  hoseG.add(cyl(0.125, 0.125, 0.07, MAT.chrome, RX0 - 0.1, 4.17, -0.3, "x", 18));
  hoseG.add(tube([[RX0 - 0.02, 1.0, 0.45], [RX0 - 0.35, 0.98, 0.42], [EX1 + 0.35, 1.5, 0.3], [EX1 + 0.25, 1.75, 0.25]], 0.1, P.rubber, 30));
  engine.add(hoseG);
  regPart(hoseG, 0.9, 1.4, -0.9);

  /* ---------- MOTOR DE ARRANQUE (+Z) ---------- */
  const startG = new THREE.Group();
  startG.add(cyl(0.19, 0.19, 0.62, P.gray, 1.45, 2.05, EW + 0.22, "x", 26));
  startG.add(cyl(0.11, 0.11, 0.4, P.gray, 1.4, 2.32, EW + 0.22, "x", 18));
  startG.add(cyl(0.14, 0.14, 0.06, MAT.dark, 1.13, 2.05, EW + 0.22, "x", 18));
  startG.add(tube([[1.65, 2.32, EW + 0.22], [1.8, 2.5, EW + 0.3], [1.9, 2.2, EW + 0.42]], 0.02, P.rubber, 12));
  engine.add(startG);
  regPart(startG, 0.2, 0.4, 2.3);

  /* ---------- SOPORTES del motor (altos, negros) ---------- */
  const mountGroups = [-1, 1].map((s) => {
    const g = new THREE.Group();
    [0.0, 1.75].forEach((x) => {
      g.add(box(0.42, 1.12, 0.2, P.frame, x, 0.98, s * (EW + 0.16), 0.02));
      g.add(box(0.56, 0.08, 0.4, P.frame, x, 0.46, s * (EW + 0.16), 0.01));
      g.add(box(0.44, 0.08, 0.3, P.frame, x, 1.56, s * (EW + 0.06), 0.01));
      [-0.12, 0.12].forEach((dx) => [0.9, 1.25].forEach((y) => g.add(cyl(0.035, 0.035, 0.06, MAT.chrome, x + dx, y, s * (EW + 0.27), "z", 8))));
      [-0.18, 0.18].forEach((dx) => g.add(cyl(0.035, 0.035, 0.07, MAT.chrome, x + dx, 0.52, s * (EW + 0.24), null, 8)));
    });
    engine.add(g);
    regPart(g, 0, 0, s * 1.6);
    return g;
  });

  /* ---------- TANQUE diésel en la base ---------- */
  const tankG = new THREE.Group();
  tankG.add(box(2.4, 0.3, 2.2, P.frame, 0.85, 0.22, 0, 0.04));
  tankG.add(cyl(0.11, 0.11, 0.12, P.yellow, 1.8, 0.42, 0.8, null, 18));
  tankG.add(cyl(0.12, 0.12, 0.03, P.brass, 1.8, 0.49, 0.8, null, 18));
  engine.add(tankG);
  regPart(tankG, 0, 0, 2.6);

  /* ---------- RADIADOR: panal, marco, tanque de expansión, tapa de bronce, oreja de izaje ---------- */
  const radG = new THREE.Group();
  const RXM = (RX0 + RX1) / 2,
    RZ = 1.05;
  radG.add(box(RX1 - RX0, 3.2, RZ * 2, MAT.dark, RXM, 2.3, 0, 0.02));
  const finN = cad ? 26 : 22;
  for (let i = 0; i < finN; i++) radG.add(box(0.02, 0.025, RZ * 2 - 0.1, MAT.iron, RX1 + 0.01, 0.82 + (i * 2.95) / finN, 0, 0));
  [-1, 1].forEach((s) => {
    radG.add(box(RX1 - RX0 + 0.12, 3.95, 0.12, P.frame, RXM, 2.4, s * (RZ + 0.06), 0.02));
    radG.add(box(0.7, 0.1, 0.4, P.frame, RXM, 0.45, s * (RZ - 0.1), 0.01));
    radG.add(box(0.12, 0.55, 0.12, P.frame, RXM - 0.25, 0.75, s * (RZ - 0.1), 0.01));
  });
  // carcasa del ventilador
  const shroud = mk(new THREE.CylinderGeometry(1.0, 1.0, 0.32, 48, 1, true), P.frame, RX0 - 0.2, 2.55, 0);
  shroud.rotation.z = Math.PI / 2;
  radG.add(shroud);
  radG.add(box(0.06, 2.2, 0.14, P.frame, RX0 - 0.05, 2.55, 1.0, 0.01));
  radG.add(box(0.06, 2.2, 0.14, P.frame, RX0 - 0.05, 2.55, -1.0, 0.01));
  radG.add(box(0.06, 0.14, 2.14, P.frame, RX0 - 0.05, 3.62, 0, 0.01));
  radG.add(box(0.06, 0.14, 2.14, P.frame, RX0 - 0.05, 1.48, 0, 0.01));
  // tanque de expansión
  radG.add(box(0.62, 0.55, RZ * 2 - 0.1, P.frame, RXM, 4.17, 0, 0.05));
  radG.add(box(0.66, 0.05, RZ * 2 - 0.06, MAT.dark, RXM, 3.88, 0, 0.01));
  radG.add(cyl(0.1, 0.1, 0.08, P.brass, RXM, 4.48, 0.55, null, 20));
  radG.add(cyl(0.135, 0.135, 0.04, P.brass, RXM, 4.53, 0.55, null, 20));
  radG.add(liftLug(RXM, 4.45, -0.35, true));
  radG.add(cyl(0.12, 0.12, 0.22, MAT.dark, RX0 - 0.08, 4.15, -0.3, "x", 16));
  radG.add(cyl(0.11, 0.11, 0.22, MAT.dark, RX0 - 0.08, 1.0, 0.45, "x", 16));
  engine.add(radG);
  regPart(radG, 2.1, 0.3, 0);

  /* ---------- VENTILADOR (grande, gira sobre X) ---------- */
  const fanG = new THREE.Group();
  fanG.position.set(RX0 - 0.22, 2.55, 0);
  fanG.add(cyl(0.16, 0.16, 0.14, MAT.dark, 0, 0, 0, "x", 20));
  const bladeN = 7;
  for (let i = 0; i < bladeN; i++) {
    const pv = new THREE.Group();
    pv.rotation.x = (i / bladeN) * Math.PI * 2;
    const blade = box(0.02, 0.72, 0.26, cad ? P.frame : MAT.steel, 0, 0.52, 0, 0);
    blade.rotation.y = 0.45;
    pv.add(blade);
    fanG.add(pv);
  }
  // reja radial del ventilador
  for (let i = 0; i < 3; i++) fanG.add(ring(0.35 + i * 0.28, 0.012, MAT.dark, 0.14, 0, 0, "x"));
  fanG.add(cyl(0.05, 0.05, 0.62, MAT.steel, -0.38, 0, 0, "x", 10));
  engine.add(fanG);
  regPart(fanG, 1.3, 0, 0);

  /* ---------- VOLANTE (dentro de la campana) ---------- */
  const flyG = new THREE.Group();
  flyG.position.set(EX0 - 0.22, AX, 0);
  flyG.add(cyl(0.76, 0.76, 0.16, MAT.iron, 0, 0, 0, "x", 40));
  flyG.add(ring(0.76, 0.03, MAT.steel, 0.08, 0, 0, "x"));
  flyG.add(cyl(0.2, 0.2, 0.24, MAT.chrome, 0, 0, 0, "x", 20));
  for (let i = 0; i < 6; i++) {
    const pv = new THREE.Group();
    pv.rotation.x = (i / 6) * Math.PI * 2;
    pv.add(cyl(0.07, 0.07, 0.18, MAT.dark, 0.0, 0.48, 0, "x", 12));
    flyG.add(pv);
  }
  engine.add(flyG);
  regPart(flyG, 0, 1.0, 2.6);

  /* ---------- ACOPLE y guarda tipo escalera (trapecio) ---------- */
  const coupG = new THREE.Group();
  const GX0 = -2.02,
    GX1 = -0.92,
    GXM = (GX0 + GX1) / 2,
    GL = GX1 - GX0;
  const coupHub = new THREE.Group();
  coupHub.position.set(GXM, AX, 0);
  coupHub.add(cyl(0.06, 0.06, GL, MAT.steel, 0, 0, 0, "x", 12));
  coupHub.add(cyl(0.3, 0.3, 0.16, P.blue, -0.12, 0, 0, "x", 26));
  coupHub.add(cyl(0.3, 0.3, 0.16, P.blue, 0.12, 0, 0, "x", 26));
  coupHub.add(cyl(0.25, 0.25, 0.08, P.rubber, 0, 0, 0, "x", 26));
  for (let i = 0; i < 6; i++) {
    const b = cyl(0.03, 0.03, 0.4, MAT.chrome, 0, 0, 0, "x", 6);
    b.position.set(0, Math.cos((i / 6) * Math.PI * 2) * 0.21, Math.sin((i / 6) * Math.PI * 2) * 0.21);
    coupHub.add(b);
  }
  coupG.add(coupHub);
  const GY0 = 0.52,
    GY1 = 2.55,
    GZB = 0.78,
    GZT = 0.5;
  [-1, 1].forEach((s) => {
    // largueros inclinados (más anchos abajo)
    [GX0 + 0.04, GX1 - 0.04].forEach((x) => {
      const post = box(0.08, GY1 - GY0 + 0.05, 0.08, P.frame, x, (GY0 + GY1) / 2, s * ((GZB + GZT) / 2), 0.01);
      post.rotation.x = s * Math.atan2(GZB - GZT, GY1 - GY0);
      coupG.add(post);
    });
    // peldaños
    for (let i = 0; i < 8; i++) {
      const y = GY0 + 0.12 + (i * (GY1 - GY0 - 0.2)) / 7;
      const zz = GZB - ((y - GY0) / (GY1 - GY0)) * (GZB - GZT);
      coupG.add(box(GL, 0.1, 0.05, P.frame, GXM, y, s * zz, 0.01));
    }
    coupG.add(box(GL + 0.04, 0.05, 0.08, P.frame, GXM, GY1, s * GZT, 0.01));
    coupG.add(box(GL + 0.04, 0.06, 0.12, P.frame, GXM, GY0, s * GZB, 0.01));
  });
  for (let i = 0; i < 5; i++) coupG.add(box(0.07, 0.05, GZT * 2, P.frame, GX0 + 0.04 + (i * (GL - 0.08)) / 4, GY1, 0, 0.01));
  engine.add(coupG);
  regPart(coupG, -0.8, 2.0, 0);

  /* ---------- BOMBA centrífuga: voluta en espiral, succión axial, descarga vertical ---------- */
  const pumpG = new THREE.Group();
  const VX = -2.95,
    VD = 0.62;
  // voluta: espiral extruida (el radio crece hasta la descarga, arriba)
  const vs = new THREE.Shape();
  const N = 64;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = Math.PI / 2 + t * Math.PI * 2;
    const r = 0.74 + 0.24 * t;
    const px = Math.cos(a) * r,
      py = Math.sin(a) * r;
    if (i === 0) vs.moveTo(px, py);
    else vs.lineTo(px, py);
  }
  vs.lineTo(-0.3, 0.98);
  vs.lineTo(-0.3, 0.74);
  vs.closePath();
  const vgeo = new THREE.ExtrudeGeometry(vs, {
    depth: VD,
    bevelEnabled: true,
    bevelThickness: 0.09,
    bevelSize: 0.08,
    bevelSegments: real ? 4 : 2,
    curveSegments: 12,
  });
  vgeo.translate(0, 0, -VD / 2);
  const volute = mk(vgeo, P.blue, VX, AX, 0);
  volute.rotation.y = Math.PI / 2;
  pumpG.add(volute);
  // tapa frontal (lado de succión) con corona de pernos
  pumpG.add(cyl(0.82, 0.82, 0.12, P.blue, VX - VD / 2 - 0.1, AX, 0, "x", 48));
  pumpG.add(bolts(12, 0.86, 0.12, P.blue, VX - VD / 2 - 0.12, AX, 0, "x", 0.045));
  pumpG.add(cyl(0.55, 0.55, 0.1, P.blue, VX - VD / 2 - 0.2, AX, 0, "x", 40));
  pumpG.add(bolts(8, 0.46, 0.1, MAT.dark, VX - VD / 2 - 0.26, AX, 0, "x", 0.035));
  // succión axial con brida y tapa cobriza
  pumpG.add(cyl(0.34, 0.36, 0.3, P.blue, VX - VD / 2 - 0.38, AX, 0, "x", 32));
  pumpG.add(cyl(0.48, 0.48, 0.08, P.blue, VX - VD / 2 - 0.55, AX, 0, "x", 40));
  pumpG.add(cyl(0.34, 0.34, 0.03, P.copper, VX - VD / 2 - 0.6, AX, 0, "x", 32));
  pumpG.add(bolts(8, 0.41, 0.1, MAT.dark, VX - VD / 2 - 0.56, AX, 0, "x", 0.03));
  // descarga vertical tangencial con brida y tapa cobriza
  const DZ = -0.15;
  pumpG.add(cyl(0.26, 0.32, 0.55, P.blue, VX, AX + 1.15, DZ, null, 28));
  pumpG.add(cyl(0.46, 0.46, 0.09, P.blue, VX, AX + 1.45, DZ, null, 40));
  pumpG.add(cyl(0.3, 0.3, 0.03, P.copper, VX, AX + 1.51, DZ, null, 32));
  pumpG.add(bolts(8, 0.39, 0.1, MAT.dark, VX, AX + 1.47, DZ, null, 0.03));
  // soporte de rodamientos (cónico), placa perforada y patas
  pumpG.add(cyl(0.44, 0.3, 0.75, P.blue, VX + VD / 2 + 0.42, AX, 0, "x", 32));
  pumpG.add(ring(0.45, 0.04, P.blue, VX + VD / 2 + 0.06, AX, 0, "x"));
  [-1, 1].forEach((s) => {
    pumpG.add(box(0.36, 0.42, 0.03, P.plate, VX + VD / 2 + 0.42, AX, s * 0.39, 0.01));
    for (let i = 0; i < 6; i++) pumpG.add(cyl(0.035, 0.035, 0.035, MAT.dark, VX + VD / 2 + 0.33 + (i % 2) * 0.18, AX - 0.12 + Math.floor(i / 2) * 0.12, s * 0.405, "z", 10));
    const foot = box(0.35, 0.82, 0.16, P.blue, VX, 0.93, s * 0.42, 0.03);
    foot.rotation.x = -s * 0.28;
    pumpG.add(foot);
    pumpG.add(box(0.5, 0.08, 0.4, P.blue, VX, 0.56, s * 0.52, 0.02));
    [-0.15, 0.15].forEach((dx) => pumpG.add(cyl(0.04, 0.04, 0.08, MAT.chrome, VX + dx, 0.62, s * 0.6, null, 8)));
  });
  pumpG.add(box(0.3, 0.75, 0.55, P.blue, VX + VD / 2 + 0.5, 0.95, 0, 0.03));
  pumpG.add(box(0.5, 0.08, 0.7, P.blue, VX + VD / 2 + 0.5, 0.56, 0, 0.02));
  engine.add(pumpG);
  regPart(pumpG, -1.9, 0.3, 0);

  /* ---------- TABLERO: 3 relojes y llave, en el poste del marco (−Z) ---------- */
  const tabG = new THREE.Group();
  tabG.position.set(PX + 0.38, 3.7, -(PZ + 0.1));
  tabG.add(box(0.42, 1.3, 0.12, P.frame, 0, 0, 0, 0.03));
  tabG.add(box(0.36, 0.06, 0.2, P.frame, -0.3, 0.3, 0.05, 0.01));
  const tNeedles = [];
  [0.4, 0.08, -0.24].forEach((gy) => {
    tabG.add(cyl(0.14, 0.14, 0.03, MAT.white, 0, gy, -0.07, "z", 28));
    tabG.add(ring(0.145, 0.018, MAT.chrome, 0, gy, -0.085, null));
    for (let k = 0; k < 7; k++) {
      const a = -1.2 + (k * 2.4) / 6;
      tabG.add(box(0.008, 0.03, 0.005, MAT.dark, Math.sin(a) * 0.11, gy + Math.cos(a) * 0.11, -0.088, 0));
    }
    const pv = new THREE.Group();
    pv.position.set(0, gy, -0.095);
    pv.add(box(0.016, 0.11, 0.01, MAT.dark, 0, 0.04, 0, 0));
    tabG.add(pv);
    tNeedles.push(pv);
  });
  tabG.add(cyl(0.06, 0.06, 0.05, MAT.chrome, 0, -0.5, -0.07, "z", 16));
  tabG.add(box(0.014, 0.07, 0.02, MAT.dark, 0, -0.5, -0.1, 0));
  engine.add(tabG);
  regPart(tabG, -0.4, 0.4, -3.4);

  /* ---------- bordes negros (versión plano CAD) ---------- */
  if (cad) {
    const cache = new Map();
    engine.traverse((o) => {
      if (!o.isMesh || o.material === MAT.glow || o.material === MAT.glass) return;
      let eg = cache.get(o.geometry);
      if (!eg) {
        eg = new THREE.EdgesGeometry(o.geometry, 28);
        cache.set(o.geometry, eg);
      }
      const ln = new THREE.LineSegments(eg, edgeMat);
      ln.raycast = () => {};
      o.add(ln);
    });
  }

  engine.scale.setScalar(SCALE);

  const PART_GROUPS = {
    chasis: [skid, cageG], bloque: [blockG], carter: [carterG], camisas: [linerG], pistones: [pistonG],
    culata: [headG], inyeccion: [injG], escape: [escG], admision: [admG], mangueras: [hoseG],
    arranque: [startG], soportes: mountGroups, tanque: [tankG], radiador: [radG], ventilador: [fanG],
    volante: [flyG], acople: [coupG], bomba: [pumpG], tablero: [tabG],
  };
  return { PART_GROUPS, pistonBodies, PISTON_Y, PISTON_PHASE, flyG, fanG, coupHub, tNeedles, smokeAnchor };
}
