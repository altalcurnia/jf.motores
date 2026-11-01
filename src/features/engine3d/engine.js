/*
 * Motor diésel 3D del sitio original (Three.js r128 + GSAP ScrollTrigger),
 * migrado casi literal desde legacy/index.html para conservar el mismo aspecto.
 * Cambios: módulo con limpieza (cleanup), textos traducibles, piezas clicables
 * que abren su categoría de repuestos y sin pantalla de carga bloqueante.
 */
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * @param {{ canvas: HTMLCanvasElement, isMobile: boolean, numberLocale: string,
 *   hud: { standby: string, start: string, running: string, full: string },
 *   onPartClick: (partKey: string) => void, onContextLost?: () => void }} opts
 * @returns {(() => void) & { highlight: (partKey: string | null) => void }} limpieza + resaltar pieza
 */
export function startEngine(opts) {
  const isMobile = opts.isMobile;
  const disposers = [];
  let rafId = 0;
  function listen(type, fn, o) {
    window.addEventListener(type, fn, o);
    disposers.push(() => window.removeEventListener(type, fn, o));
  }
  let renderer;
  /** Funciones que la página puede llamar mientras el motor está activo */
  const api = { highlight: /** @param {string | null} _k */ () => {} };
  const ctx = gsap.context(() => {
/* ================= STATE ================= */
      const S = {
        camTheta: 0.35,
        camPhi: 1.22,
        camR: 13.5,
        camTY: 1.5,
        rpm: 0,
        smoke: 0,
        explode: 0,
        glow: 0,
        shake: 0,
        atmo: 0,
        // Encendido mientras se recorre la portada (antes del recorrido)
        preRpm: 0,
        preSmoke: 0,
        preGlow: 0,
        // 0 → manda el encendido de la portada; 1 → manda el recorrido
        handoff: 0,
      };
      // Valores efectivos que usa el render (mezcla de portada y recorrido)
      const R = { rpm: 0, smoke: 0, glow: 0 };
      let heat = 0,
        pistonPhase = 0,
        flyRot = 0;
      const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
      let inJourney = false;

      /* ================= THREE ================= */
      const canvas = opts.canvas;
      // Celulares (sobre todo iPhone): menos resolución y sin suavizado para no agotar la memoria gráfica
      renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: "default" });
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, isMobile ? 1.25 : 2),
      );
      // Si el sistema libera el contexto WebGL (falta de memoria), detener el motor y avisar
      const onLost = (ev) => {
        ev.preventDefault();
        cancelAnimationFrame(rafId);
        rafId = -1;
        if (opts.onContextLost) opts.onContextLost();
      };
      canvas.addEventListener("webglcontextlost", onLost, false);
      disposers.push(() => canvas.removeEventListener("webglcontextlost", onLost, false));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.shadowMap.enabled = !isMobile;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0d1014);
      scene.fog = new THREE.FogExp2(0x0d1014, 0.03);
      const camera = new THREE.PerspectiveCamera(
        42,
        window.innerWidth / window.innerHeight,
        0.1,
        120,
      );

      /* zoom-out responsivo */
      const CAMK = isMobile ? 1.6 : 1;
      const RMIN = isMobile ? 14.5 : 0;
      if (isMobile) {
        camera.fov = 55;
        camera.updateProjectionMatrix();
      }

      const hemi = new THREE.HemisphereLight(0x39424d, 0x0a0c0e, 0.75);
      scene.add(hemi);
      const key = new THREE.DirectionalLight(0xffe3b0, 1.15);
      key.position.set(6, 9, 5);
      key.castShadow = !isMobile;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = -10;
      key.shadow.camera.right = 10;
      key.shadow.camera.top = 10;
      key.shadow.camera.bottom = -10;
      scene.add(key);
      const rim = new THREE.SpotLight(0xf7c600, 1.2, 40, Math.PI / 4, 0.5, 1);
      rim.position.set(-7, 6, -6);
      scene.add(rim);
      const fill = new THREE.PointLight(0x3d5a77, 0.5, 30);
      fill.position.set(4, 2, -6);
      scene.add(fill);
      const underGlow = new THREE.PointLight(0xf7c600, 0, 9, 2);
      underGlow.position.set(0, 0.4, 0);
      scene.add(underGlow);
      const smokeLight = new THREE.PointLight(0xffb066, 0, 7, 2);
      smokeLight.position.set(1.7, 4.4, -0.95);
      scene.add(smokeLight);

      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(30, 48),
        new THREE.MeshStandardMaterial({
          color: 0x0c0e11,
          roughness: 0.95,
          metalness: 0.1,
        }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);
      const floorRing = new THREE.Mesh(
        new THREE.RingGeometry(4.6, 4.75, 72),
        new THREE.MeshBasicMaterial({
          color: 0xf7c600,
          transparent: true,
          opacity: 0.12,
        }),
      );
      floorRing.rotation.x = -Math.PI / 2;
      floorRing.position.y = 0.012;
      scene.add(floorRing);

      const MAT = {
        steel: new THREE.MeshStandardMaterial({
          color: 0x9aa0a6,
          metalness: 0.85,
          roughness: 0.35,
        }),
        iron: new THREE.MeshStandardMaterial({
          color: 0x3a3f45,
          metalness: 0.8,
          roughness: 0.5,
        }),
        dark: new THREE.MeshStandardMaterial({
          color: 0x1a1d21,
          metalness: 0.6,
          roughness: 0.6,
        }),
        yellow: new THREE.MeshStandardMaterial({
          color: 0xf7c600,
          metalness: 0.35,
          roughness: 0.45,
        }),
        chrome: new THREE.MeshStandardMaterial({
          color: 0xdfe4ea,
          metalness: 1.0,
          roughness: 0.16,
        }),
        glass: new THREE.MeshStandardMaterial({
          color: 0x9fd8ff,
          metalness: 0.1,
          roughness: 0.08,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
        }),
        glow: new THREE.MeshStandardMaterial({
          color: 0xf7c600,
          emissive: 0xf7c600,
          emissiveIntensity: 0,
        }),
        screen: new THREE.MeshStandardMaterial({
          color: 0x141414,
          emissive: 0xf7c600,
          emissiveIntensity: 0,
        }),
        white: new THREE.MeshStandardMaterial({
          color: 0xe8ecef,
          roughness: 0.4,
          metalness: 0.1,
        }),
      };
      function mk(geo, mat, x, y, z) {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x || 0, y || 0, z || 0);
        m.castShadow = true;
        return m;
      }

      const engine = new THREE.Group();
      scene.add(engine);
      const parts = [];
      function regPart(g, dx, dy, dz) {
        g.userData.dir = new THREE.Vector3(dx, dy, dz);
        g.userData.base = g.position.clone();
        parts.push(g);
      }

      const skid = new THREE.Group();
      skid.add(
        mk(new THREE.BoxGeometry(6.8, 0.24, 2.6), MAT.dark, -0.2, 0.14, 0),
      );
      skid.add(
        mk(new THREE.BoxGeometry(6.8, 0.1, 0.14), MAT.yellow, -0.2, 0.06, 1.28),
      );
      skid.add(
        mk(
          new THREE.BoxGeometry(6.8, 0.1, 0.14),
          MAT.yellow,
          -0.2,
          0.06,
          -1.28,
        ),
      );
      engine.add(skid);

      const luzG = new THREE.Group();
      luzG.add(
        mk(new THREE.BoxGeometry(6.2, 0.05, 2.1), MAT.glow, -0.2, 0.035, 0),
      );
      engine.add(luzG);
      regPart(luzG, 0, -1.15, 0);

      const CYL_X = [-1.275, -0.425, 0.425, 1.275];
      const blockG = new THREE.Group();
      blockG.add(mk(new THREE.BoxGeometry(3.4, 1.2, 1.2), MAT.iron, 0, 0.9, 0));
      blockG.add(
        mk(new THREE.BoxGeometry(3.46, 0.12, 1.26), MAT.steel, 0, 1.52, 0),
      );
      CYL_X.forEach((cx) =>
        blockG.add(
          mk(new THREE.BoxGeometry(0.09, 1.0, 1.24), MAT.dark, cx, 0.9, 0),
        ),
      );
      engine.add(blockG);

      const linerG = new THREE.Group();
      CYL_X.forEach((cx) => {
        linerG.add(
          mk(
            new THREE.CylinderGeometry(0.3, 0.3, 0.8, 24, 1, true),
            MAT.glass,
            cx,
            1.9,
            0,
          ),
        );
        const rt = mk(
          new THREE.TorusGeometry(0.3, 0.025, 10, 24),
          MAT.steel,
          cx,
          2.3,
          0,
        );
        rt.rotation.x = Math.PI / 2;
        linerG.add(rt);
      });
      engine.add(linerG);
      regPart(linerG, 0, 1.5, 1.1);

      const PISTON_PHASE = [0, Math.PI, Math.PI, 0];
      const pistonG = new THREE.Group();
      const pistonBodies = [];
      CYL_X.forEach((cx) => {
        const pb = new THREE.Group();
        pb.position.set(cx, 1.92, 0);
        pb.add(
          mk(
            new THREE.CylinderGeometry(0.25, 0.25, 0.4, 22),
            MAT.chrome,
            0,
            0,
            0,
          ),
        );
        for (let r = 0; r < 3; r++) {
          const ring = mk(
            new THREE.TorusGeometry(0.25, 0.014, 8, 22),
            MAT.dark,
            0,
            0.11 - r * 0.07,
            0,
          );
          ring.rotation.x = Math.PI / 2;
          pb.add(ring);
        }
        pb.add(
          mk(
            new THREE.CylinderGeometry(0.05, 0.07, 0.7, 10),
            MAT.steel,
            0,
            -0.5,
            0,
          ),
        );
        const pin = mk(
          new THREE.CylinderGeometry(0.06, 0.06, 0.3, 10),
          MAT.dark,
          0,
          -0.05,
          0,
        );
        pin.rotation.x = Math.PI / 2;
        pb.add(pin);
        pistonG.add(pb);
        pistonBodies.push(pb);
      });
      engine.add(pistonG);
      regPart(pistonG, 0, 2.9, 0);

      const headG = new THREE.Group();
      headG.add(
        mk(new THREE.BoxGeometry(3.4, 0.22, 1.25), MAT.iron, 0, 2.41, 0),
      );
      headG.add(
        mk(new THREE.BoxGeometry(3.3, 0.2, 0.95), MAT.yellow, 0, 2.62, 0),
      );
      CYL_X.forEach((cx) =>
        [-0.22, 0.22].forEach((zo) =>
          headG.add(
            mk(
              new THREE.CylinderGeometry(0.045, 0.045, 0.18, 10),
              MAT.chrome,
              cx,
              2.8,
              zo,
            ),
          ),
        ),
      );
      engine.add(headG);
      regPart(headG, 0, 4.4, 0);

      const escG = new THREE.Group();
      CYL_X.forEach((cx) => {
        const dp = mk(
          new THREE.CylinderGeometry(0.05, 0.05, 0.4, 10),
          MAT.steel,
          cx,
          2.42,
          -0.78,
        );
        dp.rotation.x = Math.PI / 2;
        escG.add(dp);
      });
      const collector = mk(
        new THREE.CylinderGeometry(0.07, 0.07, 3.0, 14),
        MAT.steel,
        0,
        2.42,
        -0.98,
      );
      collector.rotation.z = Math.PI / 2;
      escG.add(collector);
      escG.add(
        mk(
          new THREE.CylinderGeometry(0.09, 0.09, 1.3, 14),
          MAT.steel,
          1.7,
          3.1,
          -0.98,
        ),
      );
      escG.add(
        mk(
          new THREE.CylinderGeometry(0.18, 0.18, 0.7, 18),
          MAT.chrome,
          1.7,
          4.05,
          -0.98,
        ),
      );
      escG.add(
        mk(
          new THREE.CylinderGeometry(0.07, 0.09, 0.3, 12),
          MAT.dark,
          1.7,
          4.55,
          -0.98,
        ),
      );
      const smokeAnchor = new THREE.Object3D();
      smokeAnchor.position.set(1.7, 4.75, -0.98);
      escG.add(smokeAnchor);
      engine.add(escG);
      regPart(escG, 1.2, 2.6, -1.4);

      const tankG = new THREE.Group();
      tankG.add(
        mk(new THREE.BoxGeometry(0.9, 0.55, 1.0), MAT.yellow, -2.45, 1.95, 0),
      );
      tankG.add(
        mk(
          new THREE.CylinderGeometry(0.11, 0.11, 0.1, 14),
          MAT.dark,
          -2.45,
          2.27,
          0,
        ),
      );
      tankG.add(
        mk(new THREE.BoxGeometry(0.08, 0.5, 0.08), MAT.dark, -2.45, 1.45, 0.4),
      );
      tankG.add(
        mk(new THREE.BoxGeometry(0.08, 0.5, 0.08), MAT.dark, -2.45, 1.45, -0.4),
      );
      engine.add(tankG);
      regPart(tankG, -2.2, 2.2, 0);

      const radG = new THREE.Group();
      radG.add(
        mk(new THREE.BoxGeometry(2.2, 1.25, 0.18), MAT.dark, 0, 1.15, 1.05),
      );
      for (let i = 0; i < 6; i++)
        radG.add(
          mk(
            new THREE.BoxGeometry(2.1, 0.03, 0.2),
            MAT.iron,
            0,
            0.68 + i * 0.19,
            1.05,
          ),
        );
      radG.add(
        mk(new THREE.BoxGeometry(2.3, 0.1, 0.26), MAT.yellow, 0, 1.83, 1.05),
      );
      engine.add(radG);
      regPart(radG, 0, 0.5, 3.0);
      const fanG = new THREE.Group();
      fanG.position.set(0, 1.15, 0.82);
      for (let i = 0; i < 5; i++) {
        const blade = mk(
          new THREE.BoxGeometry(0.12, 0.5, 0.02),
          MAT.steel,
          0,
          0.28,
          0,
        );
        const pv = new THREE.Group();
        pv.rotation.z = (i / 5) * Math.PI * 2;
        blade.rotation.x = 0.5;
        pv.add(blade);
        fanG.add(pv);
      }
      engine.add(fanG);

      const flyG = new THREE.Group();
      flyG.position.set(2.1, 1.05, 0);
      const flyMesh = mk(
        new THREE.CylinderGeometry(0.82, 0.82, 0.16, 36),
        MAT.iron,
        0,
        0,
        0,
      );
      flyMesh.rotation.z = Math.PI / 2;
      flyG.add(flyMesh);
      const flyHub = mk(
        new THREE.CylinderGeometry(0.2, 0.2, 0.24, 20),
        MAT.chrome,
        0,
        0,
        0,
      );
      flyHub.rotation.z = Math.PI / 2;
      flyG.add(flyHub);
      for (let i = 0; i < 4; i++) {
        const spoke = mk(
          new THREE.BoxGeometry(0.18, 0.62, 0.06),
          MAT.dark,
          0,
          0,
          0,
        );
        const pv = new THREE.Group();
        pv.rotation.x = (i / 4) * Math.PI * 2 + 0.4;
        spoke.position.y = 0.4;
        pv.add(spoke);
        flyG.add(pv);
      }
      engine.add(flyG);
      regPart(flyG, 3.0, 0.5, 0);

      const pumpG = new THREE.Group();
      const vol = mk(
        new THREE.CylinderGeometry(0.55, 0.55, 0.34, 28),
        MAT.yellow,
        -2.75,
        0.85,
        0,
      );
      vol.rotation.z = Math.PI / 2;
      pumpG.add(vol);
      const suc = mk(
        new THREE.CylinderGeometry(0.2, 0.2, 0.5, 18),
        MAT.steel,
        -3.2,
        0.85,
        0,
      );
      suc.rotation.z = Math.PI / 2;
      pumpG.add(suc);
      pumpG.add(
        mk(
          new THREE.CylinderGeometry(0.17, 0.17, 0.6, 18),
          MAT.steel,
          -3.0,
          1.3,
          0,
        ),
      );
      engine.add(pumpG);
      regPart(pumpG, -3.0, 0.4, 0);

      const tabG = new THREE.Group();
      tabG.position.set(2.5, 1.85, 0.95);
      tabG.rotation.y = 0.55;
      tabG.rotation.x = -0.12;
      tabG.add(mk(new THREE.BoxGeometry(1.15, 0.72, 0.1), MAT.dark, 0, 0, 0));
      tabG.add(
        mk(new THREE.BoxGeometry(1.25, 0.08, 0.14), MAT.yellow, 0, 0.4, 0),
      );
      const tFace1 = mk(
        new THREE.CylinderGeometry(0.17, 0.17, 0.03, 24),
        MAT.white,
        -0.3,
        0.1,
        0.06,
      );
      tFace1.rotation.x = Math.PI / 2;
      tabG.add(tFace1);
      const tFace2 = mk(
        new THREE.CylinderGeometry(0.17, 0.17, 0.03, 24),
        MAT.white,
        0.3,
        0.1,
        0.06,
      );
      tFace2.rotation.x = Math.PI / 2;
      tabG.add(tFace2);
      const tNeedles = [];
      [-0.3, 0.3].forEach((nx) => {
        const pv = new THREE.Group();
        pv.position.set(nx, 0.1, 0.085);
        pv.add(
          mk(new THREE.BoxGeometry(0.02, 0.13, 0.012), MAT.dark, 0, 0.045, 0),
        );
        tabG.add(pv);
        tNeedles.push(pv);
      });
      tabG.add(
        mk(new THREE.BoxGeometry(0.62, 0.16, 0.02), MAT.screen, 0, -0.2, 0.06),
      );
      [-0.42, 0, 0.42].forEach((ix) =>
        tabG.add(
          mk(
            new THREE.CylinderGeometry(0.025, 0.025, 0.03, 10),
            MAT.yellow,
            ix,
            -0.32,
            0.06,
          ),
        ),
      );
      tabG.add(
        mk(
          new THREE.CylinderGeometry(0.05, 0.06, 1.7, 10),
          MAT.iron,
          0,
          -1.0,
          -0.1,
        ),
      );
      engine.add(tabG);
      regPart(tabG, 1.6, 1.4, 2.4);

      /* labels */
      const labelDefs = [
        {
          el: document.getElementById("lbl-escape"),
          parent: escG,
          off: new THREE.Vector3(1.7, 4.05, -0.98),
          th: 0.5,
        },
        {
          el: document.getElementById("lbl-valvulas"),
          parent: headG,
          off: new THREE.Vector3(0, 2.85, 0),
          th: 0.58,
        },
        {
          el: document.getElementById("lbl-pistones"),
          parent: pistonG,
          off: new THREE.Vector3(0.425, 2.25, 0),
          th: 0.66,
        },
        {
          el: document.getElementById("lbl-tanque"),
          parent: tankG,
          off: new THREE.Vector3(-2.45, 2.3, 0),
          th: 0.74,
        },
        {
          el: document.getElementById("lbl-tablero"),
          parent: tabG,
          off: new THREE.Vector3(0, 0.5, 0.1),
          th: 0.82,
        },
        {
          el: document.getElementById("lbl-luz"),
          parent: luzG,
          off: new THREE.Vector3(2.6, 0.05, 0.8),
          th: 0.9,
        },
      ];
      labelDefs.forEach((d) => {
        d.anchor = new THREE.Object3D();
        d.anchor.position.copy(d.off);
        d.parent.add(d.anchor);
      });

      
      /* piezas clicables → categoría de repuestos */
      const PART_GROUPS = {
        chasis: skid, luz: luzG, bloque: blockG, camisas: linerG, pistones: pistonG,
        culata: headG, escape: escG, tanque: tankG, radiador: radG, ventilador: fanG,
        volante: flyG, bomba: pumpG, tablero: tabG,
      };
      for (const [k, g] of Object.entries(PART_GROUPS)) g.userData.partKey = k;
      const raycaster = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      function partAt(clientX, clientY) {
        if (S.explode < 0.35) return null;
        ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        const hit = raycaster.intersectObject(engine, true)[0];
        let o = hit && hit.object;
        while (o && !o.userData.partKey) o = o.parent;
        return o ? o.userData.partKey : null;
      }
      function isUiTarget(el) {
        return !!(el && el.closest && el.closest("a,button,select,input,textarea,.card,nav"));
      }
      listen("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        const k = isUiTarget(e.target) ? null : partAt(e.clientX, e.clientY);
        document.body.classList.toggle("over-part", !!k);
      }, { passive: true });
      // Resaltar una pieza (desde la fila de botones del despiece)
      const hlMats = new Map();
      let hlKey = null;
      function paint(key, on) {
        const g = PART_GROUPS[key];
        if (!g) return;
        g.traverse((o) => {
          if (!o.isMesh) return;
          if (on) {
            if (!o.userData.baseMat) o.userData.baseMat = o.material;
            let m = hlMats.get(o.userData.baseMat);
            if (!m) {
              m = o.userData.baseMat.clone();
              if (m.emissive) {
                m.emissive.set(0xf7c600);
                m.emissiveIntensity = 0.55;
              }
              hlMats.set(o.userData.baseMat, m);
            }
            o.material = m;
          } else if (o.userData.baseMat) {
            o.material = o.userData.baseMat;
          }
        });
      }
      api.highlight = (key) => {
        if (hlKey === key) return;
        if (hlKey) paint(hlKey, false);
        hlKey = key && PART_GROUPS[key] ? key : null;
        if (hlKey) paint(hlKey, true);
      };
      disposers.push(() => hlMats.forEach((m) => m.dispose()));

      listen("click", (e) => {
        if (isUiTarget(e.target)) return;
        const k = partAt(e.clientX, e.clientY);
        if (k) opts.onPartClick(k);
      });

      /* smoke */
      function makeSmokeTex() {
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        const g = c.getContext("2d");
        const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
        gr.addColorStop(0, "rgba(255,255,255,.95)");
        gr.addColorStop(0.35, "rgba(255,255,255,.55)");
        gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr;
        g.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(c);
      }
      const smokeTex = makeSmokeTex();
      const smokePool = [];
      const POOL_N = isMobile ? 50 : 180;
      for (let i = 0; i < POOL_N; i++) {
        const m = new THREE.SpriteMaterial({
          map: smokeTex,
          transparent: true,
          depthWrite: false,
          opacity: 0,
          color: 0xd6dade,
        });
        const sp = new THREE.Sprite(m);
        sp.visible = false;
        scene.add(sp);
        smokePool.push({
          sp,
          vel: new THREE.Vector3(),
          life: 0,
          max: 1,
          alive: false,
        });
      }
      let smokeAcc = 0;
      function spawnSmoke(rate, dt) {
        smokeAcc += rate * dt;
        while (smokeAcc >= 1) {
          smokeAcc -= 1;
          const p = smokePool.find((q) => !q.alive);
          if (!p) break;
          p.alive = true;
          p.sp.visible = true;
          smokeAnchor.getWorldPosition(p.sp.position);
          p.sp.position.x += (Math.random() - 0.5) * 0.1;
          p.sp.position.z += (Math.random() - 0.5) * 0.1;
          p.vel.set(
            (Math.random() - 0.5) * 0.3 + 0.3,
            1.1 + Math.random() * 0.8,
            (Math.random() - 0.5) * 0.3,
          );
          p.life = 0;
          p.max = 2.2 + Math.random() * 1.6;
          p.sp.material.opacity = 0;
          p.sp.scale.set(0.35, 0.35, 0.35);
        }
      }
      function updateSmoke(dt) {
        for (const p of smokePool) {
          if (!p.alive) continue;
          p.life += dt;
          const t = p.life / p.max;
          if (t >= 1) {
            p.alive = false;
            p.sp.visible = false;
            continue;
          }
          p.sp.position.addScaledVector(p.vel, dt);
          p.vel.y += dt * 0.3;
          p.vel.x += dt * 0.15;
          const s = 0.35 + t * 2.6;
          p.sp.scale.set(s, s, s);
          p.sp.material.opacity =
            Math.sin(Math.min(t, 1) * Math.PI) * (0.55 + R.smoke * 0.35);
        }
      }

      /* dust */
      const dustGeo = new THREE.BufferGeometry();
      const dustN = isMobile ? 120 : 260,
        dustPos = new Float32Array(dustN * 3);
      for (let i = 0; i < dustN; i++) {
        dustPos[i * 3] = (Math.random() - 0.5) * 26;
        dustPos[i * 3 + 1] = Math.random() * 7;
        dustPos[i * 3 + 2] = (Math.random() - 0.5) * 26;
      }
      dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
      const dust = new THREE.Points(
        dustGeo,
        new THREE.PointsMaterial({
          color: 0xf7c600,
          size: 0.035,
          transparent: true,
          opacity: 0.4,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      scene.add(dust);

      /* atmospheres */
      const ATMO = [
        { bg: new THREE.Color(0x0d1014), rim: 0.9, fog: 0.03 },
        { bg: new THREE.Color(0x15100a), rim: 1.4, fog: 0.03 },
        { bg: new THREE.Color(0x1c1206), rim: 2.0, fog: 0.026 },
        { bg: new THREE.Color(0x0b1217), rim: 1.2, fog: 0.023 },
        { bg: new THREE.Color(0x060709), rim: 0.5, fog: 0.034 },
      ];
      const tmpColor = new THREE.Color();
      function applyAtmo(t) {
        const i = Math.max(0, Math.min(ATMO.length - 2, Math.floor(t)));
        const f = THREE.MathUtils.clamp(t - i, 0, 1);
        tmpColor.copy(ATMO[i].bg).lerp(ATMO[i + 1].bg, f);
        scene.background.copy(tmpColor);
        scene.fog.color.copy(tmpColor);
        scene.fog.density = THREE.MathUtils.lerp(
          ATMO[i].fog,
          ATMO[i + 1].fog,
          f,
        );
        rim.intensity =
          THREE.MathUtils.lerp(ATMO[i].rim, ATMO[i + 1].rim, f) *
          (0.6 + R.glow * 0.7);
      }

      /* master timeline */
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: "#journey",
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        },
      });
      // Escala de tiempo 0–100 = progreso del scroll del recorrido (ver stages.js).
      // El arranque ya ocurrió en la portada; aquí sube de ralentí a media carga.
      tl.to(S, { handoff: 1, duration: 2, ease: "none" }, 0)
        .to(S, { camTheta: 1.9, camR: 10.5, camPhi: 1.32, duration: 15, ease: "none" }, 0)
        .fromTo(S, { rpm: 0.12 }, { rpm: 0.55, duration: 11.5, ease: "power1.inOut", immediateRender: false }, 0)
        .fromTo(S, { smoke: 0.4 }, { smoke: 0.7, duration: 7, ease: "power1.inOut", immediateRender: false }, 0)
        .fromTo(S, { glow: 0.3 }, { glow: 0.7, duration: 9, ease: "power1.inOut", immediateRender: false }, 0)
        .to(S, { atmo: 1, duration: 10, ease: "power1.inOut" }, 2)
        // Revolución: llega a 2400 rpm justo antes de pasar a la siguiente tarjeta
        .to(S, { camTheta: 3.7, camR: 7.6, camPhi: 1.42, camTY: 1.7, duration: 18, ease: "none" }, 15)
        .to(S, { rpm: 1, duration: 16, ease: "power2.inOut" }, 15)
        .to(S, { smoke: 1, duration: 10, ease: "power1.inOut" }, 16)
        .to(S, { shake: 1, duration: 10, ease: "power1.inOut" }, 15)
        .to(S, { atmo: 2, duration: 12, ease: "power1.inOut" }, 15)
        // Despiece
        .to(S, { camTheta: 6.283, camR: 15.5, camPhi: 1.12, camTY: 1.7, duration: 30, ease: "power1.inOut" }, 33)
        .to(S, { rpm: 0.35, duration: 8, ease: "power2.inOut" }, 33)
        .to(S, { smoke: 0.5, duration: 8, ease: "power1.inOut" }, 33)
        .to(S, { shake: 0.12, duration: 8, ease: "power2.out" }, 33)
        .to(S, { explode: 1, duration: 12, ease: "power2.inOut" }, 36)
        .to(S, { atmo: 3, duration: 12, ease: "power1.inOut" }, 33)
        // Las piezas vuelven a su sitio
        .to(S, { explode: 0, duration: 9, ease: "power2.inOut" }, 63)
        .to(S, { camTheta: 6.7, camR: 13, camPhi: 1.24, camTY: 1.5, duration: 22, ease: "power1.inOut" }, 62)
        .to(S, { atmo: 4, duration: 10, ease: "power1.inOut" }, 72)
        // Apagado desde el celular (tarjeta de la app)
        .to(S, { rpm: 0, duration: 8, ease: "power2.in" }, 80)
        .to(S, { smoke: 0, duration: 6, ease: "power2.in" }, 80)
        .to(S, { glow: 0, duration: 8, ease: "power2.in" }, 80)
        .set({}, {}, 100);

      // Encendido desde el primer milímetro de scroll en la portada:
      // marcha de arranque, tose, y queda en ralentí al llegar al recorrido.
      gsap.timeline({
        scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: 0.6 },
      })
        .to(S, { preRpm: 0.16, duration: 0.25, ease: "power2.out" }, 0)
        .to(S, { preRpm: 0.06, duration: 0.2, ease: "power1.out" }, 0.25)
        .to(S, { preRpm: 0.12, duration: 0.55, ease: "power1.inOut" }, 0.45)
        .to(S, { preSmoke: 0.4, duration: 0.6, ease: "power1.out" }, 0.05)
        .to(S, { preGlow: 0.3, duration: 0.7, ease: "power1.inOut" }, 0.3);

      ScrollTrigger.create({
        trigger: "#journey",
        start: "top 60%",
        end: "bottom 40%",
        onEnter: () => {
          inJourney = true;
          document.body.classList.add("in-journey");
        },
        onLeave: () => {
          inJourney = false;
          document.body.classList.remove("in-journey");
        },
        onEnterBack: () => {
          inJourney = true;
          document.body.classList.add("in-journey");
        },
        onLeaveBack: () => {
          inJourney = false;
          document.body.classList.remove("in-journey");
        },
      });

      listen("mousemove", (e) => {
        mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
        mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
      });

      
/* HUD refs */
      const needleRpm = document.getElementById("needleRpm");
      const needleTemp = document.getElementById("needleTemp");
      const rpmArc = document.getElementById("rpmArc");
      const tmpArc = document.getElementById("tmpArc");
      const txtRpm = document.getElementById("txtRpm");
      const txtTemp = document.getElementById("txtTemp");
      const bigRpm = document.getElementById("bigRpm");
      const stTorque = document.getElementById("stTorque");
      const stTemp = document.getElementById("stTemp");
      const stFlow = document.getElementById("stFlow");
      const hudState = document.getElementById("hudState");
      const phoneRpm = document.getElementById("phoneRpm");

      /* loop */
      const clock = new THREE.Clock();
      const wv = new THREE.Vector3();
      function noise(t, s) {
        return (
          Math.sin(t * 12.9898 + s) * 0.5 + Math.sin(t * 7.233 + s * 2) * 0.5
        );
      }
      function tick() {
        if (rafId === -1) return;
        rafId = requestAnimationFrame(tick);
        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;
        const hk = S.handoff;
        R.rpm = S.preRpm * (1 - hk) + S.rpm * hk;
        R.smoke = S.preSmoke * (1 - hk) + S.smoke * hk;
        R.glow = S.preGlow * (1 - hk) + S.glow * hk;
        mouse.x += (mouse.tx - mouse.x) * 0.05;
        mouse.y += (mouse.ty - mouse.y) * 0.05;

        const par = inJourney ? 0.3 : 1;
        const th = S.camTheta + mouse.x * 0.07 * par;
        const ph = THREE.MathUtils.clamp(
          S.camPhi + mouse.y * 0.05 * par,
          0.5,
          1.5,
        );
        const rEff = Math.max(S.camR * CAMK, RMIN);
        camera.position.set(
          rEff * Math.sin(ph) * Math.sin(th),
          rEff * Math.cos(ph) + S.camTY,
          rEff * Math.sin(ph) * Math.cos(th),
        );
        const sh = S.shake * R.rpm;
        camera.position.x += noise(t, 1) * 0.028 * sh;
        camera.position.y += noise(t, 2) * 0.02 * sh;
        camera.lookAt(0, S.camTY, 0);

        engine.position.set(
          noise(t, 3) * 0.018 * sh,
          Math.abs(noise(t, 5)) * 0.012 * sh,
          noise(t, 7) * 0.018 * sh,
        );

        const e = S.explode;
        for (const p of parts)
          p.position.copy(p.userData.base).addScaledVector(p.userData.dir, e);

        const run = THREE.MathUtils.clamp(R.rpm * 4, 0, 1);
        pistonPhase += dt * (2 + R.rpm * 26);
        for (let i = 0; i < 4; i++)
          pistonBodies[i].position.y =
            1.92 + Math.sin(pistonPhase + PISTON_PHASE[i]) * 0.14 * run;
        flyRot += dt * R.rpm * 16;
        flyG.rotation.x = flyRot;
        fanG.rotation.z = -flyRot * 1.6;
        tNeedles[0].rotation.z = -0.9 + run * 1.5 + noise(t, 9) * 0.08 * run;
        tNeedles[1].rotation.z = 0.9 - run * 1.5 - noise(t, 10) * 0.08 * run;

        MAT.glow.emissiveIntensity = R.glow * (1.6 + Math.sin(t * 3) * 0.25);
        MAT.screen.emissiveIntensity = 0.3 + R.glow * 1.4;
        underGlow.intensity = R.glow * 2.2;
        floorRing.material.opacity = 0.1 + R.glow * 0.3;

        if (R.smoke > 0.02) spawnSmoke(R.smoke * (12 + R.rpm * 30), dt);
        updateSmoke(dt);
        smokeLight.intensity = R.smoke * (0.7 + Math.abs(noise(t, 4)) * 0.5);

        dust.rotation.y += dt * 0.012;
        dust.position.y = Math.sin(t * 0.3) * 0.2;

        applyAtmo(S.atmo);

        const W = window.innerWidth,
          H = window.innerHeight;
        for (const d of labelDefs) {
          const vis =
            THREE.MathUtils.clamp((e - d.th) * 6, 0, 1) *
            THREE.MathUtils.clamp((1.02 - e) * 10 + 0.4, 0, 1);
          if (vis <= 0.01) {
            d.el.style.opacity = 0;
            d.el.style.pointerEvents = "none";
            continue;
          }
          d.anchor.getWorldPosition(wv);
          wv.project(camera);
          if (wv.z > 1) {
            d.el.style.opacity = 0;
            d.el.style.pointerEvents = "none";
            continue;
          }
          d.el.style.opacity = vis;
          d.el.style.pointerEvents = vis > 0.5 ? "auto" : "none";
          d.el.style.left = (wv.x * 0.5 + 0.5) * W + "px";
          d.el.style.top = (-wv.y * 0.5 + 0.5) * H + "px";
        }

        heat += (R.rpm - heat) * dt * 0.25;
        const rpmVal = Math.round(R.rpm * 2400 + noise(t, 11) * 30 * run);
        const tempVal = Math.round(21 + heat * 74);
        const ang =
          -80 +
          THREE.MathUtils.clamp(R.rpm, 0, 1) * 160 +
          noise(t, 12) * 3 * run;
        needleRpm.setAttribute("transform", "rotate(" + ang + " 60 66)");
        rpmArc.style.strokeDashoffset =
          151 - THREE.MathUtils.clamp(R.rpm, 0, 1) * 151;
        needleTemp.setAttribute(
          "transform",
          "rotate(" +
            (-80 + THREE.MathUtils.clamp(heat, 0, 1) * 160) +
            " 60 66)",
        );
        tmpArc.style.strokeDashoffset =
          151 - THREE.MathUtils.clamp(heat, 0, 1) * 151;
        txtRpm.textContent = rpmVal;
        txtTemp.textContent = tempVal + "°";
        bigRpm.textContent = String(Math.max(0, rpmVal)).padStart(4, "0");
        // El celular de la tarjeta "app" muestra las mismas rpm que el motor
        if (phoneRpm) phoneRpm.textContent = String(Math.max(0, rpmVal));
        stTorque.textContent = Math.round(R.rpm * 92) + " N·m";
        stTemp.textContent = tempVal + " °C";
        stFlow.textContent =
          Math.round(R.rpm * 4000).toLocaleString(opts.numberLocale) + " L/min";
        hudState.textContent =
          R.rpm < 0.03
            ? opts.hud.standby
            : R.rpm < 0.3
              ? opts.hud.start
              : R.rpm < 0.7
                ? opts.hud.running
                : opts.hud.full;

        renderer.render(scene, camera);
      }
      tick();

      listen("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      });

      const logoRow = document.getElementById("logoRow");
      if (!isMobile && logoRow) {
        listen("mousemove", (e) => {
          const x = (e.clientX / window.innerWidth - 0.5) * 14;
          const y = (e.clientY / window.innerHeight - 0.5) * 10;
          logoRow.style.transform = "translate(" + x + "px," + y + "px)";
        });
      }
  });

  const cleanup = () => {
    cancelAnimationFrame(rafId);
    disposers.forEach((d) => d());
    ctx.revert();
    document.body.classList.remove("in-journey", "over-part");
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss();
    }
  };
  cleanup.highlight = (key) => api.highlight(key);
  return cleanup;
}
