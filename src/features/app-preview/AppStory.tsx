"use client";
import { useEffect, useRef, useState } from "react";

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
 * Mano con guante de trabajo sosteniendo el teléfono. Dos capas: la palma va detrás del
 * teléfono; los dedos (que abrazan el borde derecho) y el pulgar (borde izquierdo) van delante.
 * Coordenadas en el mismo sistema que la caja del teléfono (300 × 600).
 */
export function Hand({ part }: { part: "back" | "front" }) {
  if (part === "back") {
    return (
      <svg className="hand back" viewBox="0 0 300 760" preserveAspectRatio="xMidYMin meet">
        <defs>
          <linearGradient id="glove-palm" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4a515b" />
            <stop offset="0.55" stopColor="#30353d" />
            <stop offset="1" stopColor="#1d2026" />
          </linearGradient>
          <linearGradient id="cuff" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f7c600" />
            <stop offset="1" stopColor="#c99a00" />
          </linearGradient>
        </defs>
        {/* Palma y dorso de la mano, detrás del teléfono */}
        <path d="M18 400 C 6 470 14 560 52 620 C 80 662 120 690 168 700 L 252 700 C 286 650 300 560 296 470 C 292 420 284 380 276 350 L 30 350 Z" fill="url(#glove-palm)" />
        {/* Muñeca y puño con banda reflectiva */}
        <path d="M120 690 L 262 690 L 270 760 L 112 760 Z" fill="url(#cuff)" />
        <rect x="114" y="716" width="154" height="10" fill="#e8edf2" opacity="0.75" />
      </svg>
    );
  }
  // Dedos: se asoman poco por el borde derecho y se solapan, como al sostener un teléfono
  const fingers = [
    { y: 380, h: 54, x: 268 },
    { y: 426, h: 56, x: 266 },
    { y: 474, h: 56, x: 267 },
    { y: 522, h: 50, x: 270 },
  ];
  return (
    <svg className="hand front" viewBox="0 0 300 760" preserveAspectRatio="xMidYMin meet">
      <defs>
        <linearGradient id="finger" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#626a75" />
          <stop offset="0.35" stopColor="#434a53" />
          <stop offset="1" stopColor="#262a30" />
        </linearGradient>
        <linearGradient id="thumb" x1="0" y1="1" x2="0.6" y2="0">
          <stop offset="0" stopColor="#23272d" />
          <stop offset="0.55" stopColor="#3f4650" />
          <stop offset="1" stopColor="#5b636e" />
        </linearGradient>
        <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="-2" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
        </filter>
      </defs>
      {/* Dedos que abrazan el borde derecho (de abajo hacia arriba para que se solapen bien) */}
      <g filter="url(#soft)">
        {[...fingers].reverse().map((f) => (
          <g key={f.y} transform={`rotate(-8 ${f.x + 20} ${f.y + f.h / 2})`}>
            <path
              d={`M ${f.x} ${f.y + f.h * 0.18} Q ${f.x} ${f.y} ${f.x + 16} ${f.y} L ${f.x + 22} ${f.y} Q ${f.x + 40} ${f.y} ${f.x + 40} ${f.y + f.h / 2} Q ${f.x + 40} ${f.y + f.h} ${f.x + 22} ${f.y + f.h} L ${f.x + 16} ${f.y + f.h} Q ${f.x} ${f.y + f.h} ${f.x} ${f.y + f.h * 0.82} Z`}
              fill="url(#finger)"
            />
            <path d={`M ${f.x + 6} ${f.y + 8} Q ${f.x + 20} ${f.y + 3} ${f.x + 32} ${f.y + 10}`} stroke="#7d8692" strokeWidth="1.5" fill="none" opacity="0.55" />
          </g>
        ))}
      </g>
      {/* Pulgar apoyado sobre el borde izquierdo (gira desde su base para tocar la pantalla) */}
      <g filter="url(#soft)" className="thumb">
        <path
          d="M 40 676 C 20 630 14 560 28 505 C 38 482 64 476 76 494 C 88 512 82 542 76 574 C 70 610 84 650 124 690 Z"
          fill="url(#thumb)"
        />
        <path d="M 34 500 C 46 488 62 486 70 496" stroke="#86909b" strokeWidth="1.6" fill="none" opacity="0.6" />
        <path d="M 34 626 C 30 590 36 556 50 526" stroke="#15181c" strokeWidth="1.2" strokeDasharray="4 4" fill="none" opacity="0.7" />
      </g>
    </svg>
  );
}
