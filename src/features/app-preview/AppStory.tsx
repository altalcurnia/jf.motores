"use client";
import { useEffect, useRef, useState, useId } from "react";

type Screen = {
  flow: string;
  pressure: string;
  temp: string;
  hours: string;
  normal: string;
  warning: string;
  alert: string;
  recovered: string;
  notifTitle: string;
  notifBody: string;
  live: string;
  waApp: string;
  waFrom: string;
  waTime: string;
  waMsg: string;
  waOpen: string;
  rpm: string;
  control: string;
  reduce: string;
  stop: string;
  sent: string;
  adjusting: string;
};
type Phase = { h: string; p: string };

// Recorrido simulado: normal → cambia → alerta → WhatsApp → control remoto → normal
const KEYS = [0, 0.14, 0.3, 0.36, 0.64, 0.8, 0.9, 1];
const FLOW = [4000, 3950, 3300, 2200, 2150, 2700, 3850, 3980];
const PRESSURE = [6.2, 6.1, 5.0, 3.4, 3.3, 4.6, 5.9, 6.1];
const TEMP = [82, 83, 93, 104, 104, 96, 86, 83];
const RPM = [2400, 2400, 2400, 2400, 2400, 1800, 2250, 2400];
const BOUNDS = [0.16, 0.33, 0.5, 0.66, 0.83];

function at(series: number[], p: number) {
  for (let i = 1; i < KEYS.length; i++) {
    if (p <= KEYS[i]) {
      const t = (p - KEYS[i - 1]) / (KEYS[i] - KEYS[i - 1]);
      return series[i - 1] + (series[i] - series[i - 1]) * t;
    }
  }
  return series[series.length - 1];
}
const phaseOf = (p: number) => BOUNDS.findIndex((b) => p < b) === -1 ? 5 : BOUNDS.findIndex((b) => p < b);
// Estilo de color de cada fase
const TONE = ["normal", "warning", "alert", "alert", "control", "recovered"] as const;

/**
 * Historia con scroll: un teléfono en la mano, en la mina, mostrando una motobomba
 * que pasa de normal a alerta, avisa por WhatsApp, se controla a distancia y se normaliza.
 * Es una simulación.
 */
export function AppStory({ phases, screen, unit }: { phases: Phase[]; screen: Screen; unit: string }) {
  const root = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);
  // Se fija con JS (no con position: sticky) porque el sitio usa overflow-x en <body>
  const [pin, setPin] = useState<"before" | "pinned" | "after">("before");

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = root.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = Math.max(1, r.height - window.innerHeight);
      setP(Math.min(1, Math.max(0, -r.top / total)));
      setPin(r.top > 0 ? "before" : r.bottom < window.innerHeight ? "after" : "pinned");
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

  const phase = phaseOf(p);
  const tone = TONE[phase];
  const flow = at(FLOW, p);
  const pressure = at(PRESSURE, p);
  const temp = at(TEMP, p);
  const rpm = at(RPM, p);
  const flowPct = Math.min(100, (flow / 5000) * 100);
  const enter = Math.min(1, p / 0.07);
  // Durante el control remoto el teléfono se acerca un poco
  const lift = phase === 4 ? 1 : 0;
  const spark = Array.from({ length: 28 }, (_, i) => {
    const q = Math.max(0, p - (27 - i) * 0.012);
    return `${(i / 27) * 100},${40 - ((at(TEMP, q) - 75) / 35) * 36}`;
  }).join(" ");
  const chip = { normal: screen.normal, warning: screen.warning, alert: screen.alert, control: screen.adjusting, recovered: screen.recovered }[tone];
  const sent = phase === 4 && p > 0.72;

  return (
    <section ref={root} className={`app-story s-${tone} ph-${phase}`} aria-label={phases.map((x) => x.h).join(" · ")}>
      <div className={`app-sticky ${pin}`}>
        <div className="mine" aria-hidden="true" style={{ transform: `scale(${1.04 + p * 0.12})` }}>
          {Array.from({ length: 14 }, (_, i) => (
            <b key={i} className="dust" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.9}s` }} />
          ))}
        </div>
        <span className="alarm-glow" aria-hidden="true" />

        <div className="app-stage">
          <div
            className="hand-phone"
            style={{ transform: `translateY(${(1 - enter) * 45 - lift * 3}vh) rotate(${-7 + enter * 4 + lift * 2}deg)` }}
            aria-hidden="true"
          >
            <Hand part="back" />
            <div className="phone">
              <div className="notch" />
              <div className="screen">
                <div className="scr-top">
                  <span>
                    <b>{unit}</b>
                    <small>
                      <i className="live-dot" /> {screen.live}
                    </small>
                  </span>
                  <span className={`scr-chip ${tone}`}>{chip}</span>
                </div>

                <div className={`notif ${phase === 2 ? "show" : ""}`}>
                  <b>⚠ {screen.notifTitle}</b>
                  <span>{screen.notifBody}</span>
                </div>

                <div className={`wa ${phase === 3 ? "show" : ""}`}>
                  <div className="wa-head">
                    <i className="wa-logo">
                      <svg viewBox="0 0 24 24">
                        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z" />
                      </svg>
                    </i>
                    <b>{screen.waApp}</b>
                    <small>{screen.waTime}</small>
                  </div>
                  <div className="wa-bubble">
                    <b>{screen.waFrom}</b>
                    <span>{screen.waMsg}</span>
                    <em>{screen.waOpen} →</em>
                  </div>
                </div>

                <div className={`remote ${phase === 4 ? "show" : ""}`}>
                  <span className="remote-title">{screen.control}</span>
                  <div className="remote-rpm">
                    <small>{screen.rpm}</small>
                    <b>{Math.round(rpm).toLocaleString("es-CO")} rpm</b>
                    <i>
                      <em style={{ width: `${(rpm / 3000) * 100}%` }} />
                    </i>
                  </div>
                  <div className="remote-btns">
                    <span className={`rb primary ${phase === 4 ? "pressed" : ""}`}>
                      {screen.reduce}
                      <i className="tap" />
                    </span>
                    <span className="rb">{screen.stop}</span>
                  </div>
                  <span className={`remote-ok ${sent ? "show" : ""}`}>✓ {screen.sent}</span>
                </div>

                <div className="gauge-ring">
                  <svg viewBox="0 0 120 120">
                    <path d="M 22 92 A 48 48 0 1 1 98 92" pathLength={100} className="track" />
                    <path d="M 22 92 A 48 48 0 1 1 98 92" pathLength={100} className="value" style={{ strokeDasharray: `${flowPct} 100` }} />
                  </svg>
                  <div>
                    <b>{Math.round(flow).toLocaleString("es-CO")}</b>
                    <small>L/min · {screen.flow}</small>
                  </div>
                </div>
                <div className="metric">
                  <span>{screen.pressure}</span>
                  <b>{pressure.toFixed(1)} bar</b>
                  <i>
                    <em style={{ width: `${(pressure / 8) * 100}%` }} />
                  </i>
                </div>
                <div className="metric">
                  <span>{screen.temp}</span>
                  <b>{Math.round(temp)} °C</b>
                  <svg className="spark" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <polyline points={spark} />
                  </svg>
                </div>
                <div className="metric small">
                  <span>{screen.hours}</span>
                  <b>{(1284.5 + p * 0.6).toFixed(1)} h</b>
                </div>
              </div>
              <div className="glass" />
            </div>
            <Hand part="front" />
          </div>

          <div className="app-copy">
            {phases.map((x, i) => (
              <article key={x.h} className={i === phase ? "on" : ""} aria-hidden={i !== phase}>
                <span className="step">0{i + 1}</span>
                <h2>{x.h}</h2>
                <p>{x.p}</p>
              </article>
            ))}
            <div className="app-dots" aria-hidden="true">
              {phases.map((x, i) => (
                <i key={x.h} className={i <= phase ? "on" : ""} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Mano con guante de trabajo sosteniendo el teléfono (estilo realista, con volumen y costuras).
 * Dos capas en el mismo sistema que la caja del teléfono (300 × 600, el teléfono va de x 20 a 280):
 *  - detrás: palma, raíz de los dedos y muñeca con el puño reflectivo;
 *  - delante: base del pulgar (eminencia tenar) que envuelve la esquina inferior izquierda,
 *    el pulgar unido a ella (gira desde su articulación para tocar la pantalla) y las yemas
 *    de los cuatro dedos que abrazan el borde derecho.
 */
export function Hand({ part }: { part: "back" | "front" }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (n: string) => `${n}-${uid}`;
  const url = (n: string) => `url(#${id(n)})`;
  if (part === "back") {
    return (
      <svg className="hand back" viewBox="0 0 300 760" preserveAspectRatio="xMidYMin meet">
        <defs>
          <linearGradient id={id("palm")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4c535d" />
            <stop offset="0.5" stopColor="#323840" />
            <stop offset="1" stopColor="#1b1e23" />
          </linearGradient>
          <linearGradient id={id("root")} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#262a30" />
            <stop offset="0.6" stopColor="#3d434c" />
            <stop offset="1" stopColor="#2a2e34" />
          </linearGradient>
          <linearGradient id={id("cuff")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f7c600" />
            <stop offset="1" stopColor="#c99a00" />
          </linearGradient>
        </defs>
        {/* Palma detrás del teléfono: asoma por la derecha y por debajo */}
        <path
          d="M 30 470 C 26 540 40 610 84 660 C 112 690 150 704 196 706 L 252 702 C 286 660 304 600 306 520 C 307 450 302 380 296 316 L 268 300 C 160 330 80 380 30 470 Z"
          fill={url("palm")}
        />
        {/* Raíz de los dedos (falanges proximales) por fuera del borde derecho */}
        {[318, 370, 420, 468].map((y, i) => (
          <path
            key={y}
            d={`M 276 ${y} C 290 ${y - 4} 304 ${y + 2} 308 ${y + 20} C 311 ${y + 36} 302 ${y + 50} 286 ${y + 50 - i * 2} L 276 ${y + 48 - i * 2} Z`}
            fill={url("root")}
          />
        ))}
        {/* Muñeca y puño con banda reflectiva */}
        <path d="M 118 690 C 160 700 214 702 262 690 L 272 760 L 108 760 Z" fill={url("cuff")} />
        <path d="M 112 716 C 160 724 220 724 268 714 L 269 726 C 220 736 160 736 111 728 Z" fill="#e8edf2" opacity="0.8" />
        <path d="M 116 692 C 160 702 214 704 262 692" stroke="#8a6c00" strokeWidth="2" fill="none" opacity="0.6" />
      </svg>
    );
  }
  // Dedos de la mano izquierda que abrazan el teléfono por detrás: se ven las dos últimas falanges
  // doblándose sobre el borde derecho, en abanico (índice arriba, meñique abajo y más corto).
  const fingers = [
    { y: 332, w: 21, tip: 250, rot: -9 },
    { y: 378, w: 22, tip: 245, rot: -3 },
    { y: 423, w: 21, tip: 249, rot: 3 },
    { y: 464, w: 17.5, tip: 258, rot: 10 },
  ];
  return (
    <svg className="hand front" viewBox="0 0 300 760" preserveAspectRatio="xMidYMin meet">
      <defs>
        <linearGradient id={id("finger")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6c7480" />
          <stop offset="0.28" stopColor="#4c535d" />
          <stop offset="0.75" stopColor="#2e3238" />
          <stop offset="1" stopColor="#1d2025" />
        </linearGradient>
        <linearGradient id={id("bend")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="0.5" stopColor="#000" stopOpacity="0.45" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id("thumb")} x1="0" y1="0" x2="1" y2="0.35">
          <stop offset="0" stopColor="#2a2e34" />
          <stop offset="0.45" stopColor="#4e5560" />
          <stop offset="0.8" stopColor="#5f6773" />
          <stop offset="1" stopColor="#3a4048" />
        </linearGradient>
        <radialGradient id={id("thenar")} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#59616c" />
          <stop offset="0.55" stopColor="#3a4048" />
          <stop offset="1" stopColor="#1e2126" />
        </radialGradient>
        <filter id={id("soft")} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="-3" dy="5" stdDeviation="4" floodColor="#000" floodOpacity="0.55" />
        </filter>
      </defs>

      {/* Dedos (de abajo hacia arriba para que cada uno pise al siguiente) */}
      <g filter={url("soft")}>
        {[...fingers].reverse().map((f) => {
          const { y, w, tip } = f;
          const x0 = 312;
          const knuckle = 283; // donde el dedo se dobla sobre el borde del teléfono
          return (
            <g key={y} transform={`rotate(${f.rot} ${x0} ${y})`}>
              {/* silueta: se angosta hacia la yema y termina redondeada */}
              <path
                d={`M ${x0} ${y - w} C ${knuckle} ${y - w - 1} ${tip + w * 1.2} ${y - w * 0.92} ${tip + w * 0.75} ${y - w * 0.88} C ${tip + 4} ${y - w * 0.82} ${tip - 3} ${y - w * 0.35} ${tip - 3} ${y + 1} C ${tip - 3} ${y + w * 0.5} ${tip + 5} ${y + w * 0.92} ${tip + w * 0.8} ${y + w * 0.95} C ${tip + w * 1.3} ${y + w} ${knuckle} ${y + w + 1} ${x0} ${y + w} Z`}
                fill={url("finger")}
              />
              {/* sombra del doblez sobre el borde y pliegue de la última articulación */}
              <rect x={knuckle - 7} y={y - w} width="14" height={w * 2} fill={url("bend")} />
              <path d={`M ${tip + (knuckle - tip) * 0.45} ${y - w * 0.82} C ${tip + (knuckle - tip) * 0.4} ${y - w * 0.2} ${tip + (knuckle - tip) * 0.4} ${y + w * 0.3} ${tip + (knuckle - tip) * 0.46} ${y + w * 0.88}`} stroke="#16191d" strokeWidth="1.5" fill="none" opacity="0.7" />
              {/* brillo del lomo y costura de la punta del guante */}
              <path d={`M ${tip + 6} ${y - w * 0.68} C ${tip + 16} ${y - w * 0.86} ${knuckle - 14} ${y - w * 0.9} ${x0 - 6} ${y - w * 0.9}`} stroke="#9aa3ae" strokeWidth="1.5" fill="none" opacity="0.5" strokeLinecap="round" />
              <path d={`M ${tip + w * 0.9} ${y - w * 0.85} C ${tip + w * 0.55} ${y - w * 0.3} ${tip + w * 0.55} ${y + w * 0.3} ${tip + w * 0.9} ${y + w * 0.9}`} stroke="#121417" strokeWidth="1" strokeDasharray="2.5 2.5" fill="none" opacity="0.65" />
              {/* línea de separación con el dedo de abajo */}
              <path d={`M ${tip + w * 0.8} ${y + w * 0.95} C ${tip + w * 1.4} ${y + w} ${knuckle} ${y + w + 1} ${x0} ${y + w}`} stroke="#0d0f12" strokeWidth="1.6" fill="none" opacity="0.6" />
            </g>
          );
        })}
      </g>

      {/* Pulgar: unido a la base de la palma; gira desde su articulación (ver .thumb en globals.css) */}
      <g filter={url("soft")} className="thumb">
        <path
          d="M 14 584 C 10 544 20 508 36 480 C 46 460 56 442 64 430 C 72 418 90 414 99 427 C 107 440 102 456 93 468 C 84 482 80 500 79 522 C 78 548 76 570 72 594 Z"
          fill={url("thumb")}
        />
        {/* pliegue de la articulación, brillo y costura */}
        <path d="M 40 486 C 52 494 70 496 86 490" stroke="#16191d" strokeWidth="1.8" fill="none" opacity="0.75" />
        <path d="M 46 470 C 54 452 64 436 74 428" stroke="#8d96a1" strokeWidth="1.8" fill="none" opacity="0.6" strokeLinecap="round" />
        <path d="M 30 560 C 26 530 34 500 46 478" stroke="#14171a" strokeWidth="1.1" strokeDasharray="3 3" fill="none" opacity="0.7" />
      </g>

      {/* Base del pulgar (eminencia tenar) sobre la esquina del teléfono: tapa la raíz del pulgar */}
      <g filter={url("soft")}>
        <path
          d="M 124 716 C 82 708 34 682 14 640 C 4 616 6 592 20 578 C 34 566 56 566 74 576 C 94 588 116 602 136 618 C 156 636 160 670 152 704 Z"
          fill={url("thenar")}
        />
        <path d="M 24 584 C 36 574 56 574 72 584" stroke="#7c858f" strokeWidth="1.6" fill="none" opacity="0.5" />
        <path d="M 60 640 C 82 636 110 640 140 660" stroke="#16191d" strokeWidth="1.4" fill="none" opacity="0.55" />
        <path d="M 20 640 C 40 676 76 698 120 708" stroke="#14171a" strokeWidth="1" strokeDasharray="3 3" fill="none" opacity="0.6" />
      </g>
    </svg>
  );
}
