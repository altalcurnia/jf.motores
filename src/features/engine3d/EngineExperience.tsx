"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Hand } from "@/features/app-preview/AppStory";
import { STOP_AT, STOP_END, stageAt, type StageKey } from "./stages.js";
import type { Locale } from "@/i18n/config";
import { localeTags } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { engineLabels, isPartKey, type PartKey } from "./parts";

type Props = {
  locale: Locale;
  t: Pick<Dictionary, "journey" | "hud" | "rail" | "parts">;
};

/**
 * Motor 3D de fondo + recorrido por scroll (encendido, revolución, despiece, apagado).
 * El texto de la página se muestra de inmediato; el 3D se carga después y aparece con un fundido.
 */
export function EngineExperience({ locale, t }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const journeyRef = useRef<HTMLElement>(null);
  const engineRef = useRef<{ highlight?: (k: string | null) => void } | null>(null);
  const [p, setP] = useState(0);
  const [active, setActive] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  // En celular, tocar una pieza abre este menú (abrir catálogo o seguir explorando)
  const [sheet, setSheet] = useState<PartKey | null>(null);

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
      // Las tarjetas se van justo antes de que entre la cinta amarilla de la siguiente sección
      setActive(r.top < window.innerHeight * 0.35 && prog < 0.985);
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
  const router = useRouter();
  // Referencias estables: el motor se crea una sola vez por idioma.
  const routerRef = useRef(router);
  const hudRef = useRef(t.hud);
  useEffect(() => {
    routerRef.current = router;
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

    import("./engine.js")
      .then(({ startEngine }) => {
        if (cancelled) return;
        try {
          const started = startEngine({
            canvas,
            isMobile: window.matchMedia("(max-width:760px)").matches,
            numberLocale: localeTags[locale],
            hud: hudRef.current,
            onPartClick: (part: string, touch: boolean) => {
              if (!touch) return routerRef.current.push(`/${locale}/repuestos/${part}`);
              if (!isPartKey(part)) return;
              setHover(part);
              started.highlight(part);
              setSheet(part);
            },
            onPartHover: (part: string | null) => {
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
      .catch((err) => console.warn("No se pudo cargar el motor 3D", err));

    return () => {
      cancelled = true;
      engineRef.current = null;
      cleanup?.();
      canvas.remove();
      document.body.classList.remove("no-3d");
    };
  }, [locale]);

  const j = t.journey;
  const stage: StageKey = stageAt(p).key;
  const show = (k: StageKey) => (active && stage === k ? " on" : "");
  const exploded = active && stage === "x";
  const appOn = active && stage === "e";

  useEffect(() => {
    document.body.classList.toggle("parts-open", exploded);
    document.body.classList.toggle("app-open", appOn);
    if (!exploded) engineRef.current?.highlight?.(null);
    return () => document.body.classList.remove("parts-open", "app-open");
  }, [exploded, appOn]);

  function lightPart(part: string | null) {
    if (sheet && part === null) return; // con el menú abierto la pieza sigue resaltada
    setHover(part);
    engineRef.current?.highlight?.(part);
  }

  /** En pantallas táctiles el toque no navega: resalta, acerca y ofrece el menú. */
  function onPartTap(e: MouseEvent, part: PartKey) {
    if (!window.matchMedia("(hover: none)").matches) return;
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
        <div className={`jcards${active ? " active" : ""}`}>
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

          <div className={"card jcard" + show("c")}>
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
          <MiniRemote on={appOn} p={p} s={j.e.screen} />
        </div>

        {/* Fila de piezas del despiece: al pasar el cursor se ilumina la pieza y su etiqueta */}
        <div className={`part-row${exploded ? " on" : ""}`} aria-hidden={!exploded}>
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
          <div className="part-sheet" role="dialog" aria-label={t.parts[sheet]}>
            <b>{t.parts[sheet]}</b>
            <div className="part-sheet-actions">
              <Link className="btn y" href={`/${locale}/repuestos/${sheet}`}>
                {j.sheetOpen}
              </Link>
              <button type="button" className="btn g" onClick={closeSheet}>
                {j.sheetContinue}
              </button>
            </div>
          </div>
        )}
      </section>

      <div id="labels">
        {engineLabels.map((l, i) => (
          <a
            className={`lbl${hover === l.part ? " hl" : ""}`}
            id={l.id}
            key={l.id}
            href={`/${locale}/repuestos/${l.part}`}
            onMouseEnter={() => lightPart(l.part)}
            onMouseLeave={() => lightPart(null)}
            onTouchStart={() => lightPart(l.part)}
            onClick={(e) => onPartTap(e, l.part)}
          >
            <div className="tag">
              <b>{String(i + 1).padStart(2, "0")}</b> {t.parts[l.part]}
            </div>
            <div className="stem" />
          </a>
        ))}
      </div>

      <div id="hud" aria-hidden="true">
        <div className="hud-state">
          {t.hud.state}
          <b id="hudState">{t.hud.standby}</b>
        </div>
        <Gauge arcId="rpmArc" needleId="needleRpm" textId="txtRpm" color="#F7C600" text="0" label={t.hud.rpm} ticks />
        <Gauge arcId="tmpArc" needleId="needleTemp" textId="txtTemp" color="#ff7a45" text="21°" label={t.hud.temp} />
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

/** Teléfono en la mano que apaga la motobomba (simulación de la futura app). */
function MiniRemote({ on, p, s }: { on: boolean; p: number; s: Dictionary["journey"]["e"]["screen"] }) {
  const pressed = p >= STOP_AT;
  const k = Math.min(1, Math.max(0, (p - STOP_AT) / (STOP_END - STOP_AT)));
  const state = !pressed ? s.on : k < 1 ? s.stopping : s.off;
  return (
    <div className={`mini-remote${on ? " on" : ""}`} aria-hidden="true">
      <div className={`hand-phone small${pressed ? " tapping" : ""}`}>
        <Hand part="back" />
        <div className="phone">
          <div className="notch" />
          <div className="screen">
            <div className="scr-top">
              <span>
                <b>{s.unit}</b>
              </span>
              <span className={`scr-chip ${k >= 1 ? "recovered" : pressed ? "control" : "normal"}`}>{state}</span>
            </div>
            <div className="mr-rpm">
              {/* El motor 3D actualiza este número en vivo (mismas rpm del tacómetro) */}
              <b id="phoneRpm">840</b>
              <small>RPM</small>
            </div>
            <span className={`mr-btn${pressed ? " pressed" : ""}`}>
              ⏻ {s.button}
              <i className="tap-ring" />
            </span>
            <span className={`mr-ok${pressed ? " show" : ""}`}>{k >= 1 ? s.stopped : s.sent}</span>
          </div>
          <div className="glass" />
        </div>
        <Hand part="front" />
      </div>
    </div>
  );
}

function Gauge(props: {
  arcId: string;
  needleId: string;
  textId: string;
  color: string;
  text: string;
  label: string;
  ticks?: boolean;
}) {
  const arc = "M12 66 A50 50 0 0 1 108 66";
  return (
    <div className="gauge">
      <svg viewBox="0 0 120 74">
        <path d={arc} fill="none" stroke="#23282e" strokeWidth="6" strokeLinecap="round" />
        <path
          id={props.arcId}
          d={arc}
          fill="none"
          stroke={props.color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="151"
          strokeDashoffset="151"
        />
        {props.ticks && (
          <g stroke="#5a636d" strokeWidth="2">
            <line x1="14" y1="62" x2="20" y2="59" />
            <line x1="24" y1="38" x2="29" y2="41" />
            <line x1="45" y1="22" x2="47" y2="27" />
            <line x1="73" y1="22" x2="71" y2="27" />
            <line x1="96" y1="38" x2="91" y2="41" />
            <line x1="106" y1="62" x2="100" y2="59" />
          </g>
        )}
        <line
          id={props.needleId}
          x1="60"
          y1="66"
          x2="60"
          y2="24"
          stroke={props.color}
          strokeWidth="3"
          strokeLinecap="round"
          transform="rotate(-80 60 66)"
        />
        <circle cx="60" cy="66" r="5" fill={props.color} />
      </svg>
      <div className="gv" id={props.textId} style={props.color !== "#F7C600" ? { color: props.color } : undefined}>
        {props.text}
      </div>
      <div className="gt">{props.label}</div>
    </div>
  );
}
