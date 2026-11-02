/*
 * Motor diésel 3D del sitio original (Three.js r128 + GSAP ScrollTrigger),
 * migrado casi literal desde legacy/index.html para conservar el mismo aspecto.
 * Cambios: módulo con limpieza (cleanup), textos traducibles, piezas clicables
 * que abren su categoría de repuestos y sin pantalla de carga bloqueante.
 */
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { buildV1 } from "./models/v1.js";
import { buildV2 } from "./models/v2.js";
import { buildV3 } from "./models/v3.js";

/** Versiones del modelo 3D. Comparten piezas, botones y animación; cambia solo la forma. */
const MODELS = { v1: buildV1, v2: buildV2, v3: buildV3 };

gsap.registerPlugin(ScrollTrigger);

/**
 * @param {{ canvas: HTMLCanvasElement, isMobile: boolean, numberLocale: string, variant?: string,
 *   hud: { standby: string, start: string, running: string, full: string },
 *   onPartClick: (partKey: string, touch: boolean) => void, onPartHover?: (partKey: string | null) => void,
 *   onContextLost?: () => void }} opts
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
      smokeLight.position.set(-0.04, 3.85, 1.0);
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

      /* ===== Modelo del equipo: versión elegida en el admin (ver models/) ===== */
      const build = MODELS[opts.variant] || MODELS.v1;
      const { PART_GROUPS, pistonBodies, PISTON_Y, PISTON_PHASE, flyG, fanG, coupHub, tNeedles, smokeAnchor } = build({
        engine,
        regPart,
        MAT,
        mk,
        isMobile,
      });
      // La luz del humo va en la salida del escape de cada versión
      engine.updateMatrixWorld(true);
      smokeAnchor.getWorldPosition(smokeLight.position);
      for (const [k, gs] of Object.entries(PART_GROUPS)) gs.forEach((g) => (g.userData.partKey = k));
      const tmpBox = new THREE.Box3();
      function partBox(key, out) {
        out.makeEmpty();
        for (const g of PART_GROUPS[key] || []) out.union(tmpBox.setFromObject(g));
        return out;
      }

      /* etiquetas flotantes: una por pieza (en la página: #labels .lbl[data-part]).
         Las marcadas data-main se ven siempre en el despiece; el resto, al resaltar su pieza. */
      engine.updateMatrixWorld(true);
      const labelDefs = [];
      document.querySelectorAll("#labels .lbl[data-part]").forEach((el, i, all) => {
        const key = el.getAttribute("data-part");
        const gs = PART_GROUPS[key];
        if (!gs) return;
        const b = partBox(key, new THREE.Box3());
        const c = b.getCenter(new THREE.Vector3());
        const anchor = new THREE.Object3D();
        // Encima de la pieza (en coordenadas de su primer grupo, para que siga al despiece)
        const p = new THREE.Vector3(c.x, b.max.y + 0.08, c.z);
        gs[0].worldToLocal(p);
        anchor.position.copy(p);
        gs[0].add(anchor);
        labelDefs.push({ el, key, anchor, main: el.hasAttribute("data-main"), th: 0.45 + (i / Math.max(1, all.length)) * 0.4 });
      });
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
      let overKey = null;
      listen("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        // Sobre botones o etiquetas manda la interfaz (ellas avisan su propia pieza)
        if (isUiTarget(e.target)) return;
        const k = partAt(e.clientX, e.clientY);
        document.body.classList.toggle("over-part", !!k);
        if (k !== overKey) {
          overKey = k;
          opts.onPartHover?.(k);
        }
      }, { passive: true });
      // Resaltar una pieza (desde la fila de botones del despiece)
      const hlMats = new Map();
      let hlKey = null;
      function paint(key, on) {
        const gs = PART_GROUPS[key];
        if (!gs) return;
        gs.forEach((g) => g.traverse((o) => {
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
        }));
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
        const touch = e.pointerType ? e.pointerType !== "mouse" : window.matchMedia("(hover: none)").matches;
        if (k) opts.onPartClick(k, touch);
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
      /* Encuadre del despiece: la cámara se aleja o acerca lo justo para que
         todas las piezas separadas quepan en el área libre de la pantalla. */
      let explodedBox = null;
      function getExplodedBox() {
        if (explodedBox) return explodedBox;
        for (const p of parts) p.position.copy(p.userData.base).add(p.userData.dir);
        engine.updateMatrixWorld(true);
        explodedBox = new THREE.Box3().setFromObject(engine);
        for (const p of parts) p.position.copy(p.userData.base);
        engine.updateMatrixWorld(true);
        return explodedBox;
      }
      const fitDir = new THREE.Vector3();
      const fitU = new THREE.Vector3();
      const fitV = new THREE.Vector3();
      const fitP = new THREE.Vector3();
      const fitT = new THREE.Vector3();
      const fitC = new THREE.Vector3();
      const WORLD_UP = new THREE.Vector3(0, 1, 0);
      let viewOffsetOn = false;
      // Acercamiento lento a la pieza resaltada (botón, etiqueta o la pieza misma)
      let focusAmt = 0;
      let focusKey = null;
      const focusBox = new THREE.Box3();
      const focusC = new THREE.Vector3();
      // Márgenes (px) que ocupan encabezado, franjas, fila de piezas y riel en el despiece
      let rowRight = null;
      function freeArea(W, H) {
        const lb = H * 0.07;
        // Celular: la tarjeta "Por dentro" va arriba; PC: va a la derecha
        if (W <= 760) return { l: 10, r: 34, t: lb + 58 + 150, b: lb + 64 };
        // La fila de piezas ocupa la izquierda: se mide su ancho real (cambia con la pantalla)
        if (rowRight == null) {
          const row = document.querySelector(".part-row");
          rowRight = row ? row.getBoundingClientRect().right - (row.classList.contains("on") ? 0 : 12) : 300;
        }
        return { l: Math.min(Math.max(rowRight + 16, 120), W * 0.4), r: Math.min(430, W * 0.3), t: Math.max(lb, 76) + 40, b: lb + 16 };
      }
      /** Distancia mínima para que la caja quepa en el área libre, mirando a T desde la dirección dir. */
      function fitDistance(box, T, dir, tanH, tanV) {
        fitU.crossVectors(WORLD_UP, dir).normalize();
        fitV.crossVectors(dir, fitU).normalize();
        let d = 0;
        for (let i = 0; i < 8; i++) {
          fitP.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(T);
          const along = fitP.dot(dir);
          d = Math.max(d, along + Math.abs(fitP.dot(fitU)) / tanH, along + Math.abs(fitP.dot(fitV)) / tanV);
        }
        return d;
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
        const rBase = Math.max(S.camR * CAMK, RMIN);
        fitDir.set(Math.sin(ph) * Math.sin(th), Math.cos(ph), Math.sin(ph) * Math.cos(th));
        fitT.set(0, S.camTY, 0);
        let rEff = rBase;
        const ef = THREE.MathUtils.smoothstep(S.explode, 0, 1);
        const W = window.innerWidth,
          H = window.innerHeight;
        if (ef > 0.001) {
          const box = getExplodedBox();
          box.getCenter(fitC);
          fitT.lerp(fitC, ef);
          const m = freeArea(W, H);
          const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
          const tanH = tanV * (W / H);
          const freeW = Math.max(W - m.l - m.r, W * 0.4);
          const freeH = Math.max(H - m.t - m.b, H * 0.4);
          const dFit = fitDistance(box, fitT, fitDir, tanH * (freeW / W) * 0.94, tanV * (freeH / H) * 0.94);
          rEff = THREE.MathUtils.lerp(rBase, dFit, ef);
          // Centrar la imagen en el área libre (corre el centro óptico)
          const ox = ((m.l - m.r) / 2) * ef;
          const oy = ((m.t - m.b) / 2) * ef;
          camera.setViewOffset(W, H, -ox, -oy, W, H);
          viewOffsetOn = true;
        } else if (viewOffsetOn) {
          camera.clearViewOffset();
          viewOffsetOn = false;
        }
        if (hlKey) focusKey = hlKey;
        const focusGoal = hlKey && S.explode > 0.5 ? 1 : 0;
        focusAmt += (focusGoal - focusAmt) * Math.min(1, dt * 0.9);
        if (focusAmt > 0.002 && focusKey && PART_GROUPS[focusKey]) {
          partBox(focusKey, focusBox).getCenter(focusC);
          fitT.lerp(focusC, focusAmt * 0.6);
          rEff *= 1 - 0.38 * focusAmt;
        }
        camera.position.copy(fitT).addScaledVector(fitDir, rEff);
        const sh = S.shake * R.rpm;
        camera.position.x += noise(t, 1) * 0.028 * sh;
        camera.position.y += noise(t, 2) * 0.02 * sh;
        camera.lookAt(fitT);

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
            PISTON_Y + Math.sin(pistonPhase + PISTON_PHASE[i]) * 0.13 * run;
        flyRot += dt * R.rpm * 16;
        flyG.rotation.x = flyRot;
        fanG.rotation.x = -flyRot * 1.6;
        coupHub.rotation.x = flyRot;
        // Relojes del tablero: rpm, temperatura y presión de aceite
        tNeedles[0].rotation.z = 1.2 - run * 2.0 - noise(t, 9) * 0.08 * run;
        tNeedles[1].rotation.z = 1.2 - THREE.MathUtils.clamp(heat, 0, 1) * 1.8;
        tNeedles[2].rotation.z = 1.2 - Math.min(1, run * 1.4) * 1.5 - noise(t, 10) * 0.05 * run;

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

        for (const d of labelDefs) {
          const shown = d.main || d.key === hlKey ? 1 : 0;
          const vis =
            shown *
            THREE.MathUtils.clamp((e - (d.main ? d.th : 0.5)) * 6, 0, 1) *
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
        stTorque.textContent = Math.round(R.rpm * 68) + " N·m";
        stTemp.textContent = tempVal + " °C";
        stFlow.textContent =
          Math.round(R.rpm * 3000).toLocaleString(opts.numberLocale) + " L/min";
        hudState.textContent =
          R.rpm < 0.03
            ? opts.hud.standby
            : R.rpm < 0.3
              ? opts.hud.start
              : R.rpm < 0.7
                ? opts.hud.running
                : opts.hud.full;

        // Con la parte opaca del contenido de abajo cubriendo toda la pantalla no se ve el motor:
        // no se dibuja (ahorra batería y procesador en celulares)
        if (post) {
          const pr = post.getBoundingClientRect();
          if (pr.top + pr.height * 0.3 <= 0) return;
        }
        renderer.render(scene, camera);
      }
      const post = document.querySelector(".post");
      tick();

      listen("resize", () => {
        rowRight = null;
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
