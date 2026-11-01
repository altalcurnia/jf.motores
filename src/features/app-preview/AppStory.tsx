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
};
type Phase = { h: string; p: string };

// Recorrido simulado: normal → empieza a cambiar → alerta → se normaliza
const KEYS = [0, 0.22, 0.42, 0.55, 0.68, 0.85, 1];
const FLOW = [4000, 3950, 3300, 2200, 2150, 3900, 3980];
const PRESSURE = [6.2, 6.1, 5.0, 3.4, 3.3, 5.9, 6.1];
const TEMP = [82, 83, 93, 104, 104, 86, 83];

function at(series: number[], p: number) {
  for (let i = 1; i < KEYS.length; i++) {
    if (p <= KEYS[i]) {
      const t = (p - KEYS[i - 1]) / (KEYS[i] - KEYS[i - 1]);
      return series[i - 1] + (series[i] - series[i - 1]) * t;
    }
  }
  return series[series.length - 1];
}
const phaseOf = (p: number) => (p < 0.25 ? 0 : p < 0.48 ? 1 : p < 0.72 ? 2 : 3);
const STATUS = ["normal", "warning", "alert", "recovered"] as const;

/**
 * Historia con scroll: un teléfono en la mano, dentro de la mina, mostrando una
 * motobomba que pasa de normal a alerta y vuelve a la normalidad. Es una simulación.
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
  const status = STATUS[phase];
  const flow = at(FLOW, p);
  const pressure = at(PRESSURE, p);
  const temp = at(TEMP, p);
  const flowPct = Math.min(100, (flow / 5000) * 100);
  const enter = Math.min(1, p / 0.08);
  const spark = Array.from({ length: 28 }, (_, i) => {
    const q = Math.max(0, p - (27 - i) * 0.012);
    return `${(i / 27) * 100},${40 - ((at(TEMP, q) - 75) / 35) * 36}`;
  }).join(" ");
  const statusLabel = { normal: screen.normal, warning: screen.warning, alert: screen.alert, recovered: screen.recovered }[status];

  return (
    <section ref={root} className={`app-story s-${status}`} aria-label={phases.map((x) => x.h).join(" · ")}>
      <div className={`app-sticky ${pin}`}>
        <div className="mine" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`arch a${i}`}>
              <i className="lamp" />
            </span>
          ))}
          <span className="rail" />
          {Array.from({ length: 14 }, (_, i) => (
            <b key={i} className="dust" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.9}s` }} />
          ))}
          <span className="alarm-glow" />
        </div>

        <div className="app-stage">
          <div className="hand-phone" style={{ transform: `translateY(${(1 - enter) * 40}vh) rotate(${-6 + enter * 4}deg)` }} aria-hidden="true">
            <svg className="glove back" viewBox="0 0 320 300">
              <path d="M40 120 C 30 200 60 280 150 296 L 260 296 C 300 250 300 170 280 110 L 250 60 L 60 60 Z" fill="#2a2f36" />
              {[70, 112, 154, 196].map((y) => (
                <rect key={y} x="248" y={y} width="62" height="34" rx="17" fill="#343a42" />
              ))}
              <rect x="130" y="270" width="150" height="30" rx="8" fill="#f7c600" />
            </svg>
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
                  <span className={`scr-chip ${status}`}>{statusLabel}</span>
                </div>
                <div className={`notif ${status === "alert" ? "show" : ""}`}>
                  <b>⚠ {screen.notifTitle}</b>
                  <span>{screen.notifBody}</span>
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
            </div>
            <svg className="glove thumb" viewBox="0 0 120 160">
              <path d="M10 150 C 0 110 10 70 40 40 C 60 20 92 22 100 44 C 108 66 84 82 70 96 C 56 112 60 140 58 156 Z" fill="#3a4049" />
            </svg>
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
