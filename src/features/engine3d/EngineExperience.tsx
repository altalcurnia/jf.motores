"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { localeTags } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { engineLabels } from "./parts";

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
          cleanup = startEngine({
            canvas,
            isMobile: window.matchMedia("(max-width:760px)").matches,
            numberLocale: localeTags[locale],
            hud: hudRef.current,
            onPartClick: (part: string) => routerRef.current.push(`/${locale}/repuestos/${part}`),
            // El celular liberó la memoria gráfica: ocultar el 3D y dejar el fondo fijo (el texto sigue visible)
            onContextLost: () => {
              canvas.classList.remove("ready");
              document.body.classList.add("no-3d");
            },
          });
          requestAnimationFrame(() => canvas.classList.add("ready"));
        } catch (err) {
          // Sin WebGL (equipos muy viejos): la página sigue funcionando sin el 3D.
          console.warn("Motor 3D no disponible", err);
        }
      })
      .catch((err) => console.warn("No se pudo cargar el motor 3D", err));

    return () => {
      cancelled = true;
      cleanup?.();
      canvas.remove();
      document.body.classList.remove("no-3d");
    };
  }, [locale]);

  const j = t.journey;
  return (
    <>
      <div ref={hostRef} className="webgl-host" />
      <div className="vignette" />
      <div className="grain" />
      <div className="lb top" />
      <div className="lb bot" />

      <section id="journey">
        <div className="phase" id="ph-a">
          <div className="panel">
            <div className="card">
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
          </div>
        </div>

        <div className="phase" id="ph-b">
          <div className="panel">
            <div className="card right">
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
              <p style={{ marginTop: 18 }}>{j.b.p}</p>
            </div>
          </div>
        </div>

        <div className="phase" id="ph-c">
          <div className="panel">
            <div className="card">
              <div className="pk">{j.c.pk}</div>
              <h2>{j.c.h2}</h2>
              <p>{j.c.p}</p>
              <div className="hint-down">{j.c.hint}</div>
            </div>
          </div>
        </div>

        <div className="phase" id="ph-d">
          <div className="panel">
            <div className="card right">
              <div className="pk">{j.d.pk}</div>
              <h2>{j.d.h2}</h2>
              <p>{j.d.p}</p>
            </div>
          </div>
        </div>
      </section>

      <div id="labels">
        {engineLabels.map((l, i) => (
          <a className="lbl" id={l.id} key={l.id} href={`/${locale}/repuestos/${l.part}`}>
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
        {(["a", "b", "c", "d"] as const).map((k) => (
          <div className="rd" data-r={k} key={k}>
            <span>{t.rail[k]}</span>
            <i />
          </div>
        ))}
      </div>
    </>
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
