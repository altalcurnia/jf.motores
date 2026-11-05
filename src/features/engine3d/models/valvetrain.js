import * as THREE from "three";

/**
 * Sistemas internos que se mueven con el cigüeñal, como en un diésel industrial de 4 cilindros:
 *
 * DISTRIBUCIÓN (engranajes en la tapa frontal)
 *   cigüeñal (z) → árbol de levas (2z): gira a la mitad y en sentido contrario.
 *   árbol de levas → bomba de inyección (2z): también a la mitad de las rpm del cigüeñal.
 *
 * VÁLVULAS EN CULATA (OHV): leva → botador → varilla → balancín (1,5:1) → válvula ↓ contra su resorte.
 *   Ciclo de 4 tiempos por cilindro, ψ = θ − desfase (orden de encendido 1-3-4-2: 0°, 540°, 180°, 360°):
 *     0–180° expansión · 180–360° escape · 360–540° admisión · 540–720° compresión
 *   Escape abre ~40° antes del punto muerto inferior y cierra ~20° después del superior (y la admisión
 *   al revés), con un pequeño cruce de válvulas. El perfil de cada leva es la misma curva de alzada.
 *
 * COMBUSTIÓN: destello sobre el pistón al final de la compresión (inyección + encendido).
 *
 * CORREA: polea del cigüeñal → ventilador/bomba de agua y alternador.
 */
export function buildValvetrain(o) {
  const { mk, MAT, cylX, ax, crank } = o;
  const k = o.scale ?? 1; // escala de tamaños (versión 1 un poco más chica)
  const forged = new THREE.MeshStandardMaterial({ color: 0x8d949b, metalness: 0.9, roughness: 0.32 });
  const gearMat = new THREE.MeshStandardMaterial({ color: 0xb0a48a, metalness: 0.85, roughness: 0.35 });
  const springMat = new THREE.MeshStandardMaterial({ color: 0x4a7fb5, metalness: 0.6, roughness: 0.35 });

  function onX(m) {
    m.rotation.z = Math.PI / 2;
    return m;
  }
  function spinner(x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    return g;
  }
  /** Engranaje recto: perfil con dientes extruido, eje X */
  function gear(r, teeth, w, mat) {
    const s = new THREE.Shape();
    const rr = r - 0.022 * k,
      ro = r + 0.018 * k;
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const d = (Math.PI * 2) / teeth;
      const pts = [
        [rr, a],
        [ro, a + d * 0.2],
        [ro, a + d * 0.45],
        [rr, a + d * 0.65],
      ];
      pts.forEach(([rad, ang], j) => {
        const x = Math.cos(ang) * rad,
          y = Math.sin(ang) * rad;
        if (i === 0 && j === 0) s.moveTo(x, y);
        else s.lineTo(x, y);
      });
    }
    s.closePath();
    const hole = new THREE.Path();
    hole.absarc(0, 0, r * 0.25, 0, Math.PI * 2, true);
    s.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false, curveSegments: 4 });
    geo.translate(0, 0, -w / 2);
    const m = mk(geo, mat, 0, 0, 0);
    m.rotation.y = Math.PI / 2;
    m.userData.noEdges = true;
    return m;
  }

  /* ---------- tiempos del ciclo ---------- */
  const FIRE = [0, 3 * Math.PI, Math.PI, 2 * Math.PI]; // cil. 1, 2, 3, 4 (orden 1-3-4-2)
  const D = Math.PI / 180;
  const EXH = { c: 180 * D + 90 * D + 10 * D, dur: 240 * D }; // abre 140°, cierra 380°
  const INT = { c: 360 * D + 90 * D + 10 * D, dur: 240 * D }; // abre 340°, cierra 580°
  const FOUR = Math.PI * 4;
  function wrap(d) {
    d = ((d % FOUR) + FOUR) % FOUR;
    return d > Math.PI * 2 ? d - FOUR : d;
  }
  const bump = (d, dur) => (Math.abs(d) < dur / 2 ? Math.cos((Math.PI * d) / dur) ** 2 : 0);

  /* ---------- medidas ---------- */
  const { camY, camZ, deckY, rockerY, valveZ, pushZ, valveDx, gearX, beltX } = o;
  const Lv = 0.055 * k; // alzada de válvula
  const ratio = 1.5; // balancín
  const a = (valveZ - pushZ) / (1 + ratio); // brazo del lado de la varilla
  const pivotZ = pushZ + a;
  const b = a * ratio;
  const Lp = Lv / ratio; // alzada en la leva
  const rb = 0.06 * k; // círculo base de la leva
  const lobeW = 0.06 * k;
  const tapH = 0.12 * k;
  const tipY = rockerY - 0.05 * k; // altura de la punta de válvula y de la varilla

  /* ========== DISTRIBUCIÓN: engranajes + árbol de levas ========== */
  const distG = new THREE.Group();
  const cd = Math.hypot(camY - ax, camZ); // distancia entre ejes cigüeñal–levas
  const rc = cd / 3; // z : 2z
  const crankGear = spinner(gearX, ax, 0);
  crankGear.add(gear(rc, 18, 0.07 * k, gearMat));
  distG.add(crankGear);
  const camGear = spinner(gearX, camY, camZ);
  camGear.add(gear(rc * 2, 36, 0.07 * k, gearMat));
  distG.add(camGear);
  const ig = o.injGear;
  const injGear = spinner(gearX, ig.y, ig.z);
  injGear.add(gear(rc * 2, 36, 0.07 * k, gearMat));
  distG.add(injGear);
  // eje de la bomba de inyección hasta el cuerpo de la bomba
  distG.add(onX(mk(new THREE.CylinderGeometry(0.035 * k, 0.035 * k, Math.abs(gearX - ig.x0), 10), MAT.steel, (gearX + ig.x0) / 2, ig.y, ig.z)));

  // árbol de levas: eje + 8 levas con el perfil de alzada
  const camShaft = spinner(0, camY, camZ);
  const x0 = Math.min(...cylX) - 0.35 * k,
    x1 = gearX;
  camShaft.add(onX(mk(new THREE.CylinderGeometry(0.035 * k, 0.035 * k, x1 - x0, 12), forged, (x0 + x1) / 2, 0, 0)));
  const lobeShape = new THREE.Shape();
  const NL = 64;
  for (let i = 0; i <= NL; i++) {
    const al = (i / NL) * Math.PI * 2;
    const alw = al > Math.PI ? al - Math.PI * 2 : al;
    const rad = rb + Lp * bump(2 * alw, EXH.dur);
    // nariz hacia +Y (α = 0); α crece hacia +Z
    const x = -Math.sin(al) * rad,
      y = Math.cos(al) * rad;
    if (i === 0) lobeShape.moveTo(x, y);
    else lobeShape.lineTo(x, y);
  }
  const lobeGeo = new THREE.ExtrudeGeometry(lobeShape, { depth: lobeW, bevelEnabled: false, curveSegments: 4 });
  lobeGeo.translate(0, 0, -lobeW / 2);
  const valves = [];
  cylX.forEach((cx, i) => {
    [
      { dx: -valveDx, ev: EXH },
      { dx: valveDx, ev: INT },
    ].forEach(({ dx, ev }) => {
      const peak = ev.c + FIRE[i]; // θ del cigüeñal con alzada máxima
      const lg = new THREE.Group();
      lg.position.x = cx + dx;
      lg.rotation.x = peak / 2; // β: la nariz mira al botador cuando θ = pico
      const lobe = mk(lobeGeo, forged, 0, 0, 0);
      lobe.rotation.y = -Math.PI / 2; // perfil en el plano YZ
      lobe.userData.noEdges = true;
      lg.add(lobe);
      camShaft.add(lg);
      valves.push({ x: cx + dx, ev, fire: FIRE[i] });
    });
  });
  distG.add(camShaft);

  /* ========== VÁLVULAS Y BALANCINES ========== */
  const valvG = new THREE.Group();
  // eje de balancines
  valvG.add(onX(mk(new THREE.CylinderGeometry(0.03 * k, 0.03 * k, x1 - x0 - 0.3 * k, 12), MAT.steel, (x0 + x1) / 2 - 0.15 * k, rockerY, pivotZ)));
  // resorte helicoidal de altura 1 (se escala en Y)
  const helix = new THREE.Curve();
  helix.getPoint = (t) => new THREE.Vector3(Math.cos(t * Math.PI * 14) * 0.035 * k, t, Math.sin(t * Math.PI * 14) * 0.035 * k);
  const springGeo = new THREE.TubeGeometry(helix, 120, 0.007 * k, 6, false);
  const springBase = deckY + 0.08 * k; // asiento del resorte en la culata
  valves.forEach((v) => {
    // botador (sube con la leva)
    v.tappet = mk(new THREE.CylinderGeometry(0.035 * k, 0.04 * k, tapH, 14), MAT.chrome, v.x, 0, pushZ);
    valvG.add(v.tappet);
    // varilla empujadora
    v.pushBase = camY + rb + tapH;
    v.pushLen = tipY - v.pushBase;
    v.push = mk(new THREE.CylinderGeometry(0.014 * k, 0.014 * k, v.pushLen, 8), MAT.steel, v.x, 0, pushZ);
    valvG.add(v.push);
    // balancín (pivota en el eje)
    v.rocker = new THREE.Group();
    v.rocker.position.set(v.x, rockerY, pivotZ);
    v.rocker.add(mk(new THREE.BoxGeometry(0.045 * k, 0.04 * k, a + b + 0.04 * k), forged, 0, -0.01 * k, (b - a) / 2));
    v.rocker.add(onX(mk(new THREE.CylinderGeometry(0.045 * k, 0.045 * k, 0.06 * k, 14), forged, 0, 0, 0)));
    valvG.add(v.rocker);
    // válvula: cabeza (platillo) + vástago + retén; baja con la alzada
    v.valve = new THREE.Group();
    v.valve.position.set(v.x, 0, valveZ);
    const stemLen = tipY - deckY;
    v.valve.add(mk(new THREE.CylinderGeometry(0.012 * k, 0.012 * k, stemLen, 8), MAT.chrome, 0, stemLen / 2, 0));
    v.valve.add(mk(new THREE.CylinderGeometry(0.045 * k, 0.075 * k, 0.025 * k, 22), v.ev === EXH ? forged : MAT.chrome, 0, 0.012 * k, 0));
    v.valve.add(mk(new THREE.CylinderGeometry(0.04 * k, 0.03 * k, 0.02 * k, 14), MAT.steel, 0, stemLen - 0.07 * k, 0));
    valvG.add(v.valve);
    v.spring = mk(springGeo, springMat, v.x, springBase, valveZ);
    v.spring.userData.noEdges = true;
    v.springTop = deckY + stemLen - 0.08 * k; // retén con la válvula cerrada
    valvG.add(v.spring);
  });

  /* ========== COMBUSTIÓN ========== */
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const flashes = cylX.map((cx) => {
    const m = mk(new THREE.SphereGeometry(o.bore * 0.85, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), flashMat.clone(), cx, 0, 0);
    m.castShadow = false;
    m.scale.y = 0.45;
    m.userData.noEdges = true;
    valvG.add(m); // queda dentro del cilindro (no es pieza propia)
    return m;
  });

  /* ========== CORREA: cigüeñal → ventilador y alternador ========== */
  const altG = new THREE.Group();
  const bt = o.belt;
  const crankPulley = spinner(beltX, ax, 0);
  crankPulley.add(onX(mk(new THREE.CylinderGeometry(bt.rCrank, bt.rCrank, 0.07 * k, 28), MAT.dark, 0, 0, 0)));
  crankPulley.add(onX(mk(new THREE.CylinderGeometry(bt.rCrank * 0.4, bt.rCrank * 0.4, 0.1 * k, 16), MAT.steel, 0, 0, 0)));
  altG.add(crankPulley);
  const fanPulley = onX(mk(new THREE.CylinderGeometry(bt.rFan, bt.rFan, 0.07 * k, 24), MAT.dark, beltX, bt.fanY, bt.fanZ));
  altG.add(fanPulley);
  const altPulley = spinner(beltX, bt.altY, bt.altZ);
  altPulley.add(onX(mk(new THREE.CylinderGeometry(bt.rAlt, bt.rAlt, 0.07 * k, 20), MAT.dark, 0, 0, 0)));
  for (let i = 0; i < 4; i++) {
    const sp = mk(new THREE.BoxGeometry(0.075 * k, bt.rAlt * 1.6, 0.012), MAT.steel, 0, 0, 0);
    sp.rotation.x = (i / 4) * Math.PI;
    altPulley.add(sp);
  }
  altG.add(altPulley);
  // cuerpo del alternador con aletas y soporte
  const altX = beltX - 0.2 * k;
  altG.add(onX(mk(new THREE.CylinderGeometry(0.15 * k, 0.15 * k, 0.3 * k, 26), o.altMat || MAT.steel, altX, bt.altY, bt.altZ)));
  for (let i = 0; i < 5; i++) altG.add(onX(mk(new THREE.TorusGeometry(0.152 * k, 0.008 * k, 6, 26), MAT.dark, altX - 0.12 * k + i * 0.06 * k, bt.altY, bt.altZ)));
  altG.children.slice(-5).forEach((m) => (m.rotation.set(0, Math.PI / 2, 0), (m.userData.noEdges = true)));
  altG.add(mk(new THREE.BoxGeometry(0.06 * k, 0.05 * k, Math.abs(bt.altZ) + 0.05), MAT.dark, altX, bt.altY - 0.12 * k, bt.altZ / 2));
  // correa: envolvente de las tres poleas
  const circles = [
    [ax, 0, bt.rCrank],
    [bt.fanY, bt.fanZ, bt.rFan],
    [bt.altY, bt.altZ, bt.rAlt],
  ];
  const pts = [];
  circles.forEach(([cy, cz, r]) => {
    for (let i = 0; i < 48; i++) {
      const t = (i / 48) * Math.PI * 2;
      pts.push([cz + Math.cos(t) * (r + 0.012), cy + Math.sin(t) * (r + 0.012)]);
    }
  });
  pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (O, A, B) => (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]);
  const lower = [],
    upper = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  const beltCurve = new THREE.CatmullRomCurve3(
    hull.map(([z, y]) => new THREE.Vector3(beltX, y, z)),
    true,
    "centripetal",
  );
  const belt = mk(new THREE.TubeGeometry(beltCurve, 160, 0.022 * k, 6, true), o.beltMat || MAT.dark, 0, 0, 0);
  belt.scale.set(1, 1, 1);
  belt.userData.noEdges = true;
  altG.add(belt);

  /* ========== movimiento (una sola fuente: θ del cigüeñal) ========== */
  const gearPhase = Math.PI / 36; // medio diente para que engranen a la vista
  function update(theta, rpm, solid = 1) {
    const camA = -theta / 2;
    crankGear.rotation.x = theta;
    camGear.rotation.x = camA + gearPhase;
    injGear.rotation.x = -camA;
    camShaft.rotation.x = camA;
    crankPulley.rotation.x = theta;
    altPulley.rotation.x = theta * (bt.rCrank / bt.rAlt);

    for (const v of valves) {
      const lift = Lp * bump(wrap(theta - (v.ev.c + v.fire)), v.ev.dur);
      v.tappet.position.y = camY + rb + lift + tapH / 2;
      v.push.position.y = v.pushBase + lift + v.pushLen / 2;
      const phi = Math.asin(Math.min(1, lift / a));
      v.rocker.rotation.x = phi;
      const vl = b * Math.sin(phi);
      v.valve.position.y = deckY - vl;
      v.spring.scale.y = Math.max(0.05, v.springTop - vl - springBase);
    }

    // destello de combustión: del PMS de compresión hasta ~50° después, más fuerte con más carga
    const load = Math.min(1, rpm * 2.5);
    for (let i = 0; i < flashes.length; i++) {
      const psi = (((theta - FIRE[i]) % FOUR) + FOUR) % FOUR;
      const f = psi < 0.9 ? (1 - psi / 0.9) ** 1.5 : 0;
      const m = flashes[i];
      m.material.opacity = f * load * 0.9 * solid;
      m.visible = m.material.opacity > 0.02;
      m.position.y = crank.crownY(i) + 0.005;
    }
  }
  update(0, 0);

  return { distG, valvG, altG, update };
}
