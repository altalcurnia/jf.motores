"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { Hand } from "@/features/app-preview/AppStory";
import { MonitorScreen, physics, useMonitorSim, useThumbPress, type MonitorLabels, type Vals } from "@/features/app-preview/Monitor";
import { STOP_AT, STOP_END, stageAt, type StageKey } from "./stages.js";
import type { Locale } from "@/i18n/config";
import { localeTags } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { engineLabels, isPartKey, type PartKey } from "./parts";

/** Repuesto de una pieza del despiece (miniatura en el panel de la pieza elegida). */
export type PartProduct = { name: string; href: string; img: string | null; price: string | null; inStock: boolean };

type Props = {
  locale: Locale;
  /** Hasta 3 repuestos por pieza (clave = pieza del despiece). */
  partProducts?: Record<string, PartProduct[]>;
  /** Versión del modelo 3D elegida en el admin (v2, v3). */
  variant?: string;
  /** Versión de marca: cambia el color de acento del 3D y la portada en celular. */
  brand?: string;
  t: Pick<Dictionary, "journey" | "hud" | "rail" | "parts" | "partsInfo">;
  /** Textos de la pantalla de JF Monitor (el teléfono del final del recorrido). */
  monitor: MonitorLabels;
};

/**
 * Motor 3D de fondo + recorrido por scroll (encendido, revolución, despiece, apagado).
 * El texto de la página se muestra de inmediato; el 3D se carga después y aparece con un fundido.
 */
export function EngineExperience({ locale, t, monitor, variant = "v2", brand = "nueva", partProducts = {} }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const liftRef = useRef(false);
  const journeyRef = useRef<HTMLElement>(null);
  const engineRef = useRef<{ highlight?: (k: string | null) => void; focus?: (k: string | null) => void } | null>(null);
  const [p, setP] = useState(0);
  // Lo que mide el motor 3D en cada cuadro (rpm, temperatura y aceite) para el teléfono de JF Monitor
  const liveRef = useRef<{ t: number; v: Vals } | null>(null);
  const [active, setActive] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  // En celular, tocar una pieza abre este menú (abrir catálogo o seguir explorando)
  const [sheet, setSheet] = useState<PartKey | null>(null);
  // Celular o PC: el 3D usa cámara y encuadre distintos; si cambia (girar o achicar la ventana) se reinicia
  const mobile = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(max-width:760px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(max-width:760px)").matches,
    () => false,
  );

  // Progreso del recorrido: decide qué tarjeta se ve (independiente del 3D)
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = journeyRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = Math.max(1, r.height - window.innerHeight);
      const prog = Math.min(1, Math.max(0, -r.top / total));
      setP(prog);
      // Al salir del despiece se cierra el menú de pieza
      if (stageAt(prog).key !== "x") setSheet(null);
      // PC: las tarjetas se van justo antes de que entre la cinta amarilla de la siguiente sección.
      // Celular (marcas nuevas): la última tarjeta y la mano suben con la página, como el 3D.
      const lift = liftRef.current;
      setActive(r.top < window.innerHeight * 0.35 && (lift || prog < 0.985));
      const cards = cardsRef.current;
      if (cards) {
        const dy = lift ? Math.min(0, Math.round(r.bottom - window.innerHeight)) : 0;
        cards.style.transform = dy ? `translate3d(0, ${dy}px, 0)` : "";
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  useEffect(() => {
    liftRef.current = mobile && brand !== "clasica";
  }, [mobile, brand]);
  // Referencias estables: el motor se crea una sola vez por idioma.
  const hudRef = useRef(t.hud);
  useEffect(() => {
    hudRef.current = t.hud;
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // Un lienzo nuevo en cada montaje: Next.js conserva la página oculta al navegar y la
    // reutiliza al volver; un lienzo cuyo contexto WebGL ya se liberó no se puede reutilizar.
    const canvas = document.createElement("canvas");
    canvas.id = "webgl";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    // El 3D se descarga cuando la página ya pintó y el navegador está libre: el texto y los
    // botones responden de inmediato, también en celulares lentos
    const whenIdle = () =>
      new Promise<void>((resolve) => {
        let done = false;
        const go = () => {
          if (done) return;
          done = true;
          if ("requestIdleCallback" in window) {
            window.requestIdleCallback(() => resolve(), { timeout: 1500 });
          } else {
            setTimeout(resolve, 200);
          }
        };
        if (document.readyState === "complete" || document.readyState === "interactive") {
          go();
        } else {
          window.addEventListener("DOMContentLoaded", go, { once: true });
          window.addEventListener("load", go, { once: true });
          setTimeout(go, 1000);
        }
      });

    whenIdle()
      .then(() => (cancelled ? Promise.reject(new Error("cancelled")) : import("./engine.js")))
      .then(({ startEngine }) => {
        if (cancelled) return;
        try {
          // Vista previa desde el admin: ?motor=v2 muestra esa versión sin activarla
          const preview = new URLSearchParams(window.location.search).get("motor");
          const started = startEngine({
            canvas,
            variant: preview && /^v[1-9]$/.test(preview) ? preview : variant,
            // Luces de acento del 3D: amarillo de la marca (el rojo se reserva para alertas).
            // Marcas nuevas: en celular la portada sube y acerca el 3D
            accent: 0xf7c600,
            heroLift: brand !== "clasica",
            isMobile: mobile,
            numberLocale: localeTags[locale],
            hud: hudRef.current,
            // Clic o toque en una pieza del modelo: acercamiento + panel con información y repuestos
            onPartClick: (part: string) => {
              if (!isPartKey(part)) return;
              setHover(part);
              started.highlight(part);
              setSheet(part);
            },
            onLive: (rpm: number, temp: number, oil: number) => {
              const k = rpm / 2400;
              liveRef.current = { t: performance.now(), v: { rpm, temp, oil, flow: 4000 * k, press: 6.2 * k * k } };
            },
            onPartHover: (part: string | null) => {
              if (sheetRef.current) return; // con una pieza elegida no se resalta otra al pasar
              setHover(part);
              started.highlight(part);
            },
            // El celular liberó la memoria gráfica: ocultar el 3D y dejar el fondo fijo (el texto sigue visible)
            onContextLost: () => {
              canvas.classList.remove("ready");
              document.body.classList.add("no-3d");
            },
          });
          cleanup = started;
          engineRef.current = started;
          requestAnimationFrame(() => canvas.classList.add("ready"));
        } catch (err) {
          // Sin WebGL (equipos muy viejos): la página sigue funcionando sin el 3D.
          console.warn("Motor 3D no disponible", err);
        }
      })
      .catch((err) => {
        if (!cancelled) console.warn("No se pudo cargar el motor 3D", err);
      });

    return () => {
      cancelled = true;
      engineRef.current = null;
      cleanup?.();
      canvas.remove();
      document.body.classList.remove("no-3d");
    };
  }, [locale, variant, brand, mobile]);

  const j = t.journey;
  const stage: StageKey = stageAt(p).key;
  const show = (k: StageKey) => (active && stage === k ? " on" : "");
  const exploded = active && stage === "x";
  const appOn = active && stage === "e";

  // La cámara se acerca solo a la pieza elegida (clic o toque), nunca al pasar el cursor
  const sheetRef = useRef<PartKey | null>(null);
  useEffect(() => {
    sheetRef.current = sheet;
    engineRef.current?.focus?.(sheet && exploded ? sheet : null);
    // La pieza elegida se ve con sus colores reales (sin el brillo de resaltado)
    if (sheet && exploded) engineRef.current?.highlight?.(null);
    document.body.classList.toggle("part-focus-open", !!(sheet && exploded));
    return () => document.body.classList.remove("part-focus-open");
  }, [sheet, exploded]);
  // Escape cierra el panel de la pieza
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeSheet();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    document.body.classList.toggle("parts-open", exploded);
    document.body.classList.toggle("app-open", appOn);
    // El tablero de relojes acompaña a la tarjeta «plena carga»
    document.body.classList.toggle("stage-b", active && stage === "b");
    if (!exploded) engineRef.current?.highlight?.(null);
    return () => document.body.classList.remove("parts-open", "app-open", "stage-b");
  }, [exploded, appOn, active, stage]);

  function lightPart(part: string | null) {
    if (sheet) return; // con una pieza elegida, la resaltada es esa
    setHover(part);
    engineRef.current?.highlight?.(part);
  }

  /** Clic o toque en un marcador o botón: acerca la cámara, desvanece el resto y abre el panel. */
  function onPartTap(e: MouseEvent, part: PartKey) {
    e.preventDefault();
    setHover(part);
    engineRef.current?.highlight?.(part);
    setSheet(part);
  }

  function closeSheet() {
    setSheet(null);
    setHover(null);
    engineRef.current?.highlight?.(null);
  }

  return (
    <>
      <div ref={hostRef} className="webgl-host" />
      <div className="vignette" />
      <div className="grain" />
      <div className="lb top" />
      <div className="lb bot" />

      <section id="journey" ref={journeyRef} aria-label={t.rail.a}>
        {/* Las tarjetas se muestran una tras otra según el scroll; el despiece queda libre */}
        <div ref={cardsRef} className={`jcards${active ? " active" : ""}`}>
          <div className={"card jcard" + show("a")}>
            <div className="pk">{j.a.pk}</div>
            <h2>{j.a.h2}</h2>
            <p>{j.a.p}</p>
            <div className="chips">
              {j.a.chips.map((c) => (
                <div className="chip" key={c.label}>
                  <span className="dot" />
                  {c.label}
                  <b>{c.value}</b>
                </div>
              ))}
            </div>
          </div>

          <div className={"card right jcard" + show("b")}>
            <div className="pk">{j.b.pk}</div>
            <div className="big-rpm">
              <span id="bigRpm">0000</span> <small>RPM</small>
            </div>
            <div className="statline">
              <span>
                {j.b.torque}
                <b id="stTorque">0 N·m</b>
              </span>
              <span>
                {j.b.temp}
                <b id="stTemp">21 °C</b>
              </span>
              <span>
                {j.b.flow}
                <b id="stFlow">0 L/min</b>
              </span>
            </div>
            <p className="rpm-p" style={{ marginTop: 18 }}>{j.b.p}</p>
          </div>

          <div className={"card right jcard jcard-parts" + (active && (stage === "c" || stage === "x") && !(sheet && exploded) ? " on" : "")}>
            <div className="pk">{j.c.pk}</div>
            <h2>{j.c.h2}</h2>
            <p>{j.c.p}</p>
            <div className="hint-down">{j.c.hint}</div>
          </div>

          <div className={"card right jcard" + show("d")}>
            <div className="pk">{j.d.pk}</div>
            <h2>{j.d.h2}</h2>
            <p>{j.d.p}</p>
          </div>

          <div className={"card right jcard jcard-app" + show("e")}>
            <div className="pk">{j.e.pk}</div>
            <span className="soon-badge">{j.e.badge}</span>
            <h2>{j.e.h2}</h2>
            <p>{j.e.p}</p>
            <Link className="btn y app-cta" href={`/${locale}/app`}>
              {j.e.cta} →
            </Link>
          </div>
          <MiniRemote on={appOn} p={p} s={j.e.screen} labels={monitor} liveRef={liveRef} />
        </div>

        {/* Fila de piezas del despiece: al pasar el cursor se ilumina la pieza y su etiqueta */}
        <div className={`part-row${exploded ? " on" : ""}`} aria-hidden={!exploded} data-count={engineLabels.length}>
          <span className="part-row-title">
            {j.partsTitle}
            <small>{j.partsHint}</small>
          </span>
          {engineLabels.map((l, i) => (
            <Link
              key={l.id}
              href={`/${locale}/repuestos/${l.part}`}
              className={hover === l.part ? "hl" : ""}
              tabIndex={exploded ? 0 : -1}
              onMouseEnter={() => lightPart(l.part)}
              onMouseLeave={() => lightPart(null)}
              onFocus={() => lightPart(l.part)}
              onBlur={() => lightPart(null)}
              onTouchStart={() => lightPart(l.part)}
              onClick={(e) => onPartTap(e, l.part)}
            >
              <b>{String(i + 1).padStart(2, "0")}</b> {t.parts[l.part]}
            </Link>
          ))}
        </div>
        {sheet && exploded && (
          <aside className="part-focus" role="dialog" aria-label={t.parts[sheet]}>
            <button type="button" className="pf-close" onClick={closeSheet} aria-label={j.focusClose}>
              ×
            </button>
            <div className="pk">
              {j.focusKicker} {String(engineLabels.findIndex((l) => l.part === sheet) + 1).padStart(2, "0")}
            </div>
            <h3>{t.parts[sheet]}</h3>
            <p>{t.partsInfo[sheet]}</p>
            {(partProducts[sheet] ?? []).length > 0 ? (
              <div className="pf-items">
                {(partProducts[sheet] ?? []).map((it) => (
                  <Link key={it.href} href={it.href} className="pf-item">
                    {/* eslint-disable-next-line @next/next/no-img-element -- miniatura del catálogo */}
                    {it.img ? <img src={it.img} alt="" loading="lazy" /> : <span className="pf-noimg" />}
                    <span className="pf-name">{it.name}</span>
                    <small className={it.inStock ? "ok" : "off"}>
                      {it.price ?? j.focusAsk} · {it.inStock ? j.focusInStock : j.focusOutStock}
                    </small>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="pf-empty">{j.focusEmpty}</p>
            )}
            <div className="part-sheet-actions">
              <Link className="btn y" href={`/${locale}/repuestos/${sheet}`}>
                {j.focusCatalog}
              </Link>
              <button type="button" className="btn g" onClick={closeSheet}>
                {j.sheetContinue}
              </button>
            </div>
          </aside>
        )}
      </section>

      {/* Marcadores del despiece: solo el número en un botón redondo; al pasar el cursor o tocarlo
          se ilumina la pieza y el botón se abre con el nombre */}
      <div id="labels">
        {engineLabels.map((l, i) => (
          <a
            className={`lbl${hover === l.part ? " hl" : ""}`}
            id={l.id}
            key={l.id}
            data-part={l.part}
            data-main=""
            href={`/${locale}/repuestos/${l.part}`}
            aria-label={t.parts[l.part]}
            onMouseEnter={() => lightPart(l.part)}
            onMouseLeave={() => lightPart(null)}
            onFocus={() => lightPart(l.part)}
            onBlur={() => lightPart(null)}
            onTouchStart={() => lightPart(l.part)}
            onClick={(e) => onPartTap(e, l.part)}
          >
            <div className="tag">
              <b>{String(i + 1).padStart(2, "0")}</b>
              <span className="nm">{t.parts[l.part]}</span>
            </div>
            <div className="stem" />
          </a>
        ))}
      </div>

      {/* Tablero como el de la motobomba real: 3 relojes en columna (rpm, temperatura del agua,
          presión de aceite) y la llave de encendido abajo */}
      <div id="hud" aria-hidden="true">
        <div className="hud-panel">
          <Dial arcId="rpmArc" needleId="needleRpm" textId="txtRpm" color="#F7C600" text="0" unit="×1" label={t.hud.rpm} max="2400" />
          <Dial arcId="tmpArc" needleId="needleTemp" textId="txtTemp" color="#ff7a45" text="21°" unit="°C" label={t.hud.temp} max="95" />
          <Dial arcId="oilArc" needleId="needleOil" textId="txtOil" color="#4fb3ff" text="0.0" unit="bar" label={t.hud.oil} max="5" />
          <div className="hud-key">
            <svg viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="22" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
              <circle cx="30" cy="30" r="15" fill="none" stroke="#c9a24e" strokeWidth="1.5" opacity="0.8" />
              {/* posiciones: apagado, marcha, arranque */}
              <text x="30" y="7" textAnchor="middle" className="hk-t">OFF</text>
              <text x="54" y="20" textAnchor="middle" className="hk-t">ON</text>
              <text x="54" y="46" textAnchor="middle" className="hk-t">ST</text>
              <g id="hudKey">
                <rect x="27" y="12" width="6" height="36" rx="2.5" fill="#c9a24e" />
                <circle cx="30" cy="30" r="4" fill="#0b0d10" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      <div id="rail" aria-hidden="true">
        {(["a", "b", "c", "d", "e"] as const).map((k) => (
          <div className={`rd${active && (stage === k || (k === "c" && stage === "x")) ? " on" : ""}`} data-r={k} key={k}>
            <span>{t.rail[k]}</span>
            <i />
          </div>
        ))}
      </div>
    </>
  );
}

/** Inercia de las agujas del teléfono: siguen al motor 3D casi sin retraso. */
const TAU_LIVE: Vals = { rpm: 0.12, temp: 0.3, oil: 0.15, flow: 0.3, press: 0.3 };

/**
 * Teléfono en la mano con JF Monitor (la misma pantalla de la página de la app): muestra lo que mide el
 * motor 3D y el pulgar toca «Apagar» para detenerlo (simulación de la futura app).
 */
function MiniRemote({
  on,
  p,
  s,
  labels,
  liveRef,
}: {
  on: boolean;
  p: number;
  s: Dictionary["journey"]["e"]["screen"];
  labels: MonitorLabels;
  liveRef: { current: { t: number; v: Vals } | null };
}) {
  const handRef = useRef<HTMLDivElement>(null);
  const pressed = p >= STOP_AT;
  const k = Math.min(1, Math.max(0, (p - STOP_AT) / (STOP_END - STOP_AT)));
  const running = !pressed || k < 1;
  // Sin 3D (equipos sin WebGL) los valores siguen el recorrido
  const fallback = pressed ? (k < 1 ? physics(true, 2400 * (1 - k)) : physics(false, 0)) : physics(true, 2400);
  const disp = useMonitorSim(
    () => {
      const live = liveRef.current;
      const fresh = live && performance.now() - live.t < 500;
      return { target: fresh ? live.v : fallback, tau: TAU_LIVE, on: false };
    },
    on,
    physics(true, 2400),
  );
  useThumbPress(handRef, on);
  const state = !pressed ? s.on : k < 1 ? s.stopping : s.off;
  return (
    <div className={`mini-remote${on ? " on" : ""}`} aria-hidden="true" inert>
      <div ref={handRef} className={`hand-phone small${pressed && k < 1 ? " press-hold" : ""}${running ? "" : " is-off"}`}>
        <Hand part="back" />
        <div className="phone">
          <div className="notch" />
          <MonitorScreen
            unit={s.unit}
            labels={labels}
            v={disp.v}
            h={disp.h}
            on={!pressed}
            setpoint={2400}
            scr={!pressed ? "normal" : k < 1 ? "control" : "off"}
            chip={state}
            hours={1284.5}
            pressing={pressed && k < 1}
            toast={pressed ? (k >= 1 ? s.stopped : s.sent) : null}
          />
          <div className="glass" />
        </div>
        <Hand part="front" />
      </div>
    </div>
  );
}

/** Reloj redondo de tablero (escala de 240°, en vector y transparente). El motor 3D mueve la aguja y el arco. */
function Dial(props: { arcId: string; needleId: string; textId: string; color: string; text: string; unit: string; label: string; max: string }) {
  // Arco de 240° (de −120° a +120°), radio 36 → largo ≈ 151 (lo usa el motor para el relleno)
  const arc = "M 18.82 68 A 36 36 0 1 1 81.18 68";
  const ticks = Array.from({ length: 9 }, (_, i) => -120 + i * 30);
  return (
    <div className="gauge dial">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="47" fill="rgba(10,12,15,0.35)" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="43" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <path d={arc} fill="none" stroke="#23282e" strokeWidth="5" strokeLinecap="round" />
        <path id={props.arcId} d={arc} fill="none" stroke={props.color} strokeWidth="5" strokeLinecap="round" strokeDasharray="151" strokeDashoffset="151" />
        {ticks.map((a, i) => {
          const r = (a * Math.PI) / 180;
          const r1 = i % 2 === 0 ? 39 : 40.5;
          return (
            <line
              key={a}
              x1={50 + Math.sin(r) * r1}
              y1={50 - Math.cos(r) * r1}
              x2={50 + Math.sin(r) * 43}
              y2={50 - Math.cos(r) * 43}
              stroke={i === 8 ? props.color : "#5a636d"}
              strokeWidth={i % 2 === 0 ? 1.8 : 1}
            />
          );
        })}
        <text x="18" y="84" className="d-min">0</text>
        <text x="82" y="84" textAnchor="end" className="d-min">{props.max}</text>
        <line id={props.needleId} x1="50" y1="56" x2="50" y2="20" stroke={props.color} strokeWidth="2.4" strokeLinecap="round" transform="rotate(-120 50 50)" />
        <circle cx="50" cy="50" r="5" fill={props.color} />
        <circle cx="50" cy="50" r="2" fill="#0b0d10" />
        <text x="50" y="74" textAnchor="middle" className="d-val" id={props.textId} style={{ fill: props.color }}>
          {props.text}
        </text>
        <text x="50" y="86" textAnchor="middle" className="d-unit">{props.unit}</text>
      </svg>
      <div className="gt">{props.label}</div>
    </div>
  );
}
