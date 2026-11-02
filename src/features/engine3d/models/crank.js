import * as THREE from "three";

/**
 * Tren alternativo de un diésel de 4 cilindros en línea: cigüeñal, bielas y pistones.
 *
 * Referencias reales (diésel industrial de 4 cilindros, p. ej. 100 mm × 127 mm):
 *  - Cigüeñal de 5 apoyos, muñequillas 1-4 a 0° y 2-3 a 180° (orden de encendido 1-3-4-2).
 *  - Relación biela/manivela λ = r / l ≈ 0,29 (biela ≈ 3,4 veces el radio del cigüeñal).
 *  - Bielas de sección en I con tapa partida y dos pernos; bulón paralelo al cigüeñal.
 *  - Contrapesos opuestos a cada muñequilla para equilibrar las masas giratorias.
 *
 * Cinemática exacta biela-manivela (sin aproximar):
 *   a = θ + φᵢ
 *   muñequilla:  y = Y₀ + r·cos a,   z = r·sin a
 *   bulón:       y = Y₀ + r·cos a + √(l² − r²·sin² a)
 *   biela:       ángulo = atan2(−z_muñequilla, y_bulón − y_muñequilla)
 *
 * @param {{ mk: Function, MAT: any, cylX: number[], y0: number, r: number, l: number, bore: number,
 *   crown: number, x0: number, x1: number, edges?: boolean }} o
 */
export function buildCrankTrain(o) {
  const { mk, MAT, cylX, y0, r, l, bore, crown } = o;
  const PHASE = [0, Math.PI, Math.PI, 0];
  const pitch = cylX.length > 1 ? cylX[1] - cylX[0] : 0.6;
  const forged = new THREE.MeshStandardMaterial({ color: 0x8d949b, metalness: 0.9, roughness: 0.32 });
  const polished = MAT.chrome;

  /* ---------- CIGÜEÑAL ---------- */
  const crankG = new THREE.Group(); // pieza del despiece (no gira)
  const crankRot = new THREE.Group(); // gira sobre el eje X
  crankRot.position.set(0, y0, 0);
  crankG.add(crankRot);
  const journalR = r * 0.52;
  const pinR = r * 0.46;
  const webT = pitch * 0.14;
  const pinLen = pitch * 0.34;
  const cwR = r * 1.55; // radio del contrapeso
  const webW = pinR * 1.35;

  function cyl(rad, len, mat, x, y, z) {
    const m = mk(new THREE.CylinderGeometry(rad, rad, len, 24), mat, x, y, z);
    m.rotation.z = Math.PI / 2;
    return m;
  }
  // Brazo con contrapeso (perfil extruido): muñequilla hacia +Y, contrapeso hacia −Y
  const s = new THREE.Shape();
  const a0 = -Math.PI / 2 - 0.95,
    a1 = -Math.PI / 2 + 0.95;
  s.moveTo(Math.cos(a1) * cwR, Math.sin(a1) * cwR);
  s.lineTo(webW, 0);
  s.lineTo(webW, r);
  s.absarc(0, r, webW, 0, Math.PI, false);
  s.lineTo(-webW, 0);
  s.lineTo(Math.cos(a0) * cwR, Math.sin(a0) * cwR);
  s.absarc(0, 0, cwR, a0, a1, false);
  const webGeo = new THREE.ExtrudeGeometry(s, { depth: webT, bevelEnabled: true, bevelThickness: webT * 0.12, bevelSize: webT * 0.12, bevelSegments: 2, curveSegments: 14 });
  webGeo.translate(0, 0, -webT / 2);

  cylX.forEach((cx, i) => {
    const throwG = new THREE.Group();
    throwG.position.x = cx;
    throwG.rotation.x = PHASE[i];
    [-1, 1].forEach((sd) => {
      const w = mk(webGeo, forged, sd * (pinLen / 2 + webT / 2), 0, 0);
      w.rotation.y = Math.PI / 2;
      throwG.add(w);
    });
    throwG.add(cyl(pinR, pinLen + 0.01, polished, 0, r, 0)); // muñequilla
    crankRot.add(throwG);
  });
  // apoyos de bancada (5) entre y a los lados de las muñequillas
  const jx = [cylX[0] - pitch / 2, ...cylX.slice(0, -1).map((x) => x + pitch / 2), cylX[cylX.length - 1] + pitch / 2];
  jx.forEach((x) => crankRot.add(cyl(journalR, pitch - pinLen - webT * 2 + 0.02, polished, x, 0, 0)));
  // punta delantera con engranaje/polea y brida trasera para el volante
  crankRot.add(cyl(journalR * 0.8, pitch * 0.6, polished, jx[jx.length - 1] + pitch * 0.4, 0, 0));
  crankRot.add(cyl(journalR * 1.9, pitch * 0.08, forged, jx[jx.length - 1] + pitch * 0.62, 0, 0));
  crankRot.add(cyl(journalR * 2.2, pitch * 0.12, forged, jx[0] - pitch * 0.26, 0, 0));
  // cojinetes de bancada (fijos, semitransparentes al ver por dentro)
  jx.forEach((x) => {
    const cap = mk(new THREE.TorusGeometry(journalR * 1.25, journalR * 0.3, 8, 20, Math.PI), MAT.dark, x, y0, 0);
    cap.rotation.y = Math.PI / 2;
    cap.rotation.x = Math.PI;
    crankG.add(cap);
  });

  /* ---------- PISTONES y BIELAS (una pieza del despiece: «pistones») ---------- */
  const pistonG = new THREE.Group();
  const pistons = [];
  const rods = [];
  const pistonH = crown * 1.9;
  const skirt = pistonH - crown;
  const pinPinR = bore * 0.12;
  cylX.forEach((cx) => {
    // pistón: origen en el bulón
    const pb = new THREE.Group();
    pb.position.x = cx;
    pb.add(mk(new THREE.CylinderGeometry(bore, bore * 0.985, pistonH, 28), polished, 0, (crown - skirt) / 2, 0));
    // cámara en la cabeza (diésel de inyección directa)
    const bowl = mk(new THREE.CylinderGeometry(bore * 0.45, bore * 0.3, 0.02, 20), MAT.dark, 0, crown - 0.005, 0);
    pb.add(bowl);
    for (let k = 0; k < 3; k++) {
      const ring = mk(new THREE.TorusGeometry(bore * 1.005, 0.011, 6, 28), MAT.dark, 0, crown - 0.04 - k * 0.045, 0);
      ring.rotation.x = Math.PI / 2;
      pb.add(ring);
    }
    pb.add(cyl(pinPinR, bore * 1.7, MAT.steel, 0, 0, 0)); // bulón (paralelo al cigüeñal)
    pistonG.add(pb);
    pistons.push(pb);

    // biela: origen en el centro de la cabeza (muñequilla), largo hacia +Y
    const rod = new THREE.Group();
    rod.position.x = cx;
    const bigR = pinR * 1.55;
    const big = mk(new THREE.CylinderGeometry(bigR, bigR, pinLen * 0.9, 24, 1, true), forged, 0, 0, 0);
    big.rotation.z = Math.PI / 2;
    rod.add(big);
    // tapa partida con pernos
    rod.add(mk(new THREE.BoxGeometry(pinLen * 0.9, bigR * 0.5, bigR * 2.5), forged, 0, -bigR * 0.95, 0));
    [-1, 1].forEach((sd) => rod.add(mk(new THREE.CylinderGeometry(0.014, 0.014, bigR * 1.6, 8), MAT.chrome, 0, -bigR * 0.3, sd * bigR * 1.05)));
    // vástago en I (alma + dos alas), más angosto hacia el pie
    const shank = l - bigR - pinPinR * 1.6;
    const web = mk(new THREE.BoxGeometry(pinLen * 0.25, shank, bigR * 0.9), forged, 0, bigR + shank / 2, 0);
    rod.add(web);
    [-1, 1].forEach((sd) => {
      const fl = mk(new THREE.BoxGeometry(pinLen * 0.75, shank, 0.022), forged, 0, bigR + shank / 2, sd * bigR * 0.45);
      rod.add(fl);
    });
    // pie de biela (ojo del bulón)
    const small = mk(new THREE.CylinderGeometry(pinPinR * 1.7, pinPinR * 1.7, pinLen * 0.6, 20, 1, true), forged, 0, l, 0);
    small.rotation.z = Math.PI / 2;
    rod.add(small);
    pistonG.add(rod);
    rods.push(rod);
  });

  /** Coloca cigüeñal, bielas y pistones para un ángulo θ del cigüeñal (rad). */
  function update(theta) {
    crankRot.rotation.x = theta;
    for (let i = 0; i < cylX.length; i++) {
      const a = theta + PHASE[i];
      // rotation.x = a lleva (0, r, 0) a (0, r·cos a, r·sin a)
      const py = y0 + r * Math.cos(a);
      const pz = r * Math.sin(a);
      const yPin = py + Math.sqrt(l * l - pz * pz);
      pistons[i].position.set(cylX[i], yPin, 0);
      rods[i].position.set(cylX[i], py, pz);
      rods[i].rotation.x = Math.atan2(-pz, yPin - py);
    }
  }
  update(0);

  return { crankG, pistonG, update, tdcCrown: y0 + r + l + crown };
}
