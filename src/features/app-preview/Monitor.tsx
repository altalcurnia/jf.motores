"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";

/**
 * Pantalla de JF Monitor (simulación): indicadores de la bomba, el tablero con los 3 relojes del
 * tablero real (rpm, temperatura del agua del motor y presión de aceite), el acelerador (rpm) y el
 * botón de encendido. La usan el teléfono de la página de JF Monitor y el del inicio.
 */

export type Vals = { rpm: number; temp: number; oil: number; flow: number; press: number };
export type Hist = { rpm: number[]; temp: number[]; oil: number[] };
export type ScrState = "normal" | "warning" | "alert" | "control" | "recovered" | "off" | "starting";
export type MonitorLabels = {
  live: string;
  flow: string;
  discharge: string;
  temp: string;
  oil: string;
  rpm: string;
  hours: string;
  turnOn: string;
  turnOff: string;
  control: string;
  normal: string;
};

// Escalas del tablero (iguales a las de un tablero de motobomba diésel)
export const MAX = { rpm: 3000, temp: 120, oil: 6 };
export const RPM_MIN = 800;
export const RPM_MAX = 2600;
const HIST = 32;
const KEYS_V = ["rpm", "temp", "oil", "flow", "press"] as const;
const TICKS = Array.from({ length: 9 }, (_, i) => -120 + i * 30);

/** Valores a los que tiende el equipo según el mando (física simplificada de motor y bomba). */
export function physics(on: boolean, rpm: number): Vals {
  if (!on) return { rpm: 0, temp: 58, oil: 0, flow: 0, press: 0 };
  const k = rpm / 2400;
  return { rpm, temp: 66 + 18 * k, oil: 0.9 + 3.6 * Math.pow(k, 0.8), flow: 4000 * k, press: 6.2 * k * k };
}

/** Estado que muestra la pantalla a partir de los valores (arranque, ajuste, apagado o alerta). */
export function scrState(v: Vals, on: boolean, setpoint: number, fallback?: ScrState): ScrState {
  if (!on) return v.rpm > 40 ? "control" : "off";
  if (v.rpm < 600) return "starting";
  if (Math.abs(v.rpm - setpoint) > 120) return "control";
  if (fallback) return fallback;
  if (v.temp > 98 || v.oil < 3) return "alert";
  return v.temp > 92 ? "warning" : "normal";
}

/**
 * Agujas con inercia y la vibración leve de un motor en marcha. `read` da el objetivo de cada cuadro;
 * el bucle solo corre mientras `active` (la pantalla está a la vista).
 */
export function useMonitorSim(read: () => { target: Vals; tau: Vals; on: boolean }, active: boolean, initial: Vals) {
  const [disp, setDisp] = useState<{ v: Vals; h: Hist }>(() => ({
    v: initial,
    h: { rpm: Array(HIST).fill(initial.rpm), temp: Array(HIST).fill(initial.temp), oil: Array(HIST).fill(initial.oil) },
  }));
  const readRef = useRef(read);
  const smooth = useRef<Vals>({ ...initial });
  const histRef = useRef(disp.h);
  useEffect(() => {
    readRef.current = read;
  });
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let frame = 0;
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { target, tau, on } = readRef.current();
      const s = smooth.current;
      for (const k of KEYS_V) s[k] += (target[k] - s[k]) * (1 - Math.exp(-dt / tau[k]));
      const t = now / 1000;
      const live = on ? Math.min(1, s.rpm / 900) : 0;
      const v: Vals = {
        rpm: Math.max(0, s.rpm + live * (Math.sin(t * 13) * 7 + Math.sin(t * 7.3) * 5)),
        temp: s.temp + live * Math.sin(t * 0.9) * 0.15,
        oil: Math.max(0, s.oil + live * Math.sin(t * 5.1) * 0.04),
        flow: Math.max(0, s.flow + live * Math.sin(t * 3.7) * 12),
        press: Math.max(0, s.press + live * Math.sin(t * 4.3) * 0.03),
      };
      acc += dt;
      if (acc > 0.22) {
        acc = 0;
        const h = histRef.current;
        histRef.current = { rpm: [...h.rpm.slice(1), v.rpm], temp: [...h.temp.slice(1), v.temp], oil: [...h.oil.slice(1), v.oil] };
      }
      // ~30 cuadros por segundo bastan para las agujas
      if (frame++ % 2 === 0) setDisp({ v, h: histRef.current });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return disp;
}

/**
 * El pulgar de la mano apunta al botón de encendido: calcula el giro (y el pequeño estiramiento) del
 * pulgar para que la yema caiga sobre el botón, esté donde esté en la pantalla.
 */
export function useThumbPress(handRef: RefObject<HTMLElement | null>, dep: unknown) {
  useEffect(() => {
    const host = handRef.current;
    if (!host) return;
    const measure = () => {
      const btn = host.querySelector<HTMLElement>(".mon-power");
      if (!btn) return;
      let x = btn.offsetWidth / 2;
      let y = btn.offsetHeight / 2;
      let el: HTMLElement | null = btn;
      while (el && el !== host) {
        x += el.offsetLeft;
        y += el.offsetTop;
        el = el.offsetParent as HTMLElement | null;
      }
      // Pulgar (coordenadas de la mano, 300 × 760): articulación en (44, 574), yema en (86, 422)
      const vx = 42;
      const vy = -152;
      const wx = x - 44;
      const wy = y - 574;
      const deg = ((Math.atan2(wx, -wy) - Math.atan2(vx, -vy)) * 180) / Math.PI;
      const len = Math.hypot(vx, vy);
      const e = Math.hypot(wx, wy) - len + 8;
      host.style.setProperty("--thumb-press", `rotate(${deg.toFixed(1)}deg) translate(${((vx / len) * e).toFixed(1)}px, ${((vy / len) * e).toFixed(1)}px)`);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [handRef, dep]);
}

const fmt = (n: number) => Math.round(n).toLocaleString("es-CO");
const spark = (arr: number[], max: number) =>
  arr.map((x, i) => `${((i / (arr.length - 1)) * 100).toFixed(1)},${(30 - (Math.min(max, Math.max(0, x)) / max) * 28).toFixed(1)}`).join(" ");

export function MonitorScreen(props: {
  unit: string;
  labels: MonitorLabels;
  v: Vals;
  h: Hist;
  on: boolean;
  setpoint: number;
  scr: ScrState;
  chip: string;
  hours: number;
  /** La mano está tocando el botón de encendido. */
  pressing?: boolean;
  /** Mensaje de confirmación (o null). */
  toast?: string | null;
  /** Sin funciones el mando solo se muestra (no se puede tocar). */
  onPower?: () => void;
  onRpm?: (rpm: number) => void;
  children?: ReactNode;
}) {
  const { v, h, labels, on, setpoint } = props;
  const tempAlert = v.temp > 98;
  const oilAlert = on && v.oil < 3 && v.rpm > 600;
  const pct = ((setpoint - RPM_MIN) / (RPM_MAX - RPM_MIN)) * 100;
  const interactive = !!props.onPower;
  return (
    <div className="screen mon-screen">
      <div className="scr-top" aria-hidden="true">
        <span>
          <b>{props.unit}</b>
          <small>
            <i className="live-dot" /> {labels.live}
          </small>
        </span>
        <span className={`scr-chip ${props.scr}`}>{props.chip}</span>
      </div>

      <div className="mon-kpis" aria-hidden="true">
        <span>
          <small>{labels.flow}</small>
          <b>
            {fmt(v.flow)} <i>L/min</i>
          </b>
        </span>
        <span>
          <small>{labels.discharge}</small>
          <b>
            {v.press.toFixed(1)} <i>bar</i>
          </b>
        </span>
      </div>

      {/* Tablero: los mismos 3 relojes del tablero real, en columna */}
      <div className="mon-panel" aria-hidden="true">
        <MonitorRow label="RPM" color="#F7C600" f={v.rpm / MAX.rpm} text={fmt(v.rpm)} unit="rpm" max="3000" range={`${labels.normal} 1.800–2.500`} spark={spark(h.rpm, MAX.rpm)} />
        <MonitorRow
          label={labels.temp}
          color={tempAlert ? "#ff5a4a" : "#ff7a45"}
          f={v.temp / MAX.temp}
          text={`${Math.round(v.temp)}°`}
          unit="°C"
          max="120"
          range={`${labels.normal} 75–95 °C`}
          spark={spark(h.temp, MAX.temp)}
          alert={tempAlert}
        />
        <MonitorRow
          label={labels.oil}
          color={oilAlert ? "#ff5a4a" : "#4fb3ff"}
          f={v.oil / MAX.oil}
          text={v.oil.toFixed(1)}
          unit="bar"
          max="6"
          range={`${labels.normal} 3–5,5 bar`}
          spark={spark(h.oil, MAX.oil)}
          alert={oilAlert}
        />
      </div>

      {/* Mando a distancia: acelerador (rpm) y botón de encendido */}
      <div className="mon-ctrl" role="group" aria-label={labels.control}>
        <div className="mon-ctrl-top">
          <span>{labels.rpm}</span>
          <b>{fmt(setpoint)} rpm</b>
        </div>
        <div className="mon-slider-wrap" style={{ "--f": `${pct}%` } as CSSProperties}>
          <input
            type="range"
            className="mon-slider"
            min={RPM_MIN}
            max={RPM_MAX}
            step={50}
            value={setpoint}
            tabIndex={interactive ? undefined : -1}
            aria-label={labels.rpm}
            aria-valuetext={`${fmt(setpoint)} rpm`}
            onChange={(e) => props.onRpm?.(Number(e.target.value))}
          />
        </div>
        <div className="mon-ctrl-row">
          <span className="mon-hours" aria-hidden="true">
            {labels.hours}
            <b>{props.hours.toFixed(1)} h</b>
          </span>
          <button
            type="button"
            className={`mon-power ${on ? "on" : "off"}${props.pressing ? " pressed" : ""}`}
            aria-pressed={on}
            tabIndex={interactive ? undefined : -1}
            onClick={props.onPower}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v8" />
              <path d="M6.3 7.3a8 8 0 1 0 11.4 0" />
            </svg>
            {on ? labels.turnOff : labels.turnOn}
            <i className="tap-ring" aria-hidden="true" />
          </button>
        </div>
        <span className={`mon-ok${props.toast ? " show" : ""}`} aria-hidden="true">
          ✓ {props.toast}
        </span>
      </div>
      {props.children}
    </div>
  );
}

/** Fila del tablero: reloj redondo (240°, vector y transparente) con su tendencia al lado. */
function MonitorRow(props: { label: string; color: string; f: number; text: string; unit: string; max: string; range: string; spark: string; alert?: boolean }) {
  const f = Math.min(1, Math.max(0, props.f));
  // Arco de 240° (de −120° a +120°), radio 36 → largo ≈ 151
  const arc = "M 18.82 68 A 36 36 0 1 1 81.18 68";
  return (
    <div className={`mon-row${props.alert ? " alert" : ""}`} style={{ "--c": props.color } as CSSProperties}>
      <svg className="mon-dial" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="47" fill="rgba(10,12,15,0.55)" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="43" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <path d={arc} fill="none" stroke="#23282e" strokeWidth="5" strokeLinecap="round" />
        <path d={arc} fill="none" stroke={props.color} strokeWidth="5" strokeLinecap="round" strokeDasharray="151" strokeDashoffset={151 * (1 - f)} />
        {TICKS.map((a, i) => {
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
        <line x1="50" y1="56" x2="50" y2="20" stroke={props.color} strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${-120 + 240 * f} 50 50)`} />
        <circle cx="50" cy="50" r="5" fill={props.color} />
        <circle cx="50" cy="50" r="2" fill="#0b0d10" />
        <text x="50" y="74" textAnchor="middle" className="d-val" style={{ fill: props.color }}>
          {props.text}
        </text>
        <text x="50" y="86" textAnchor="middle" className="d-unit">{props.unit}</text>
      </svg>
      <div className="mon-side">
        <span className="mon-lbl">{props.label}</span>
        <svg className="mon-spark" viewBox="0 0 100 32" preserveAspectRatio="none">
          <polyline points={props.spark} />
        </svg>
        <small>{props.range}</small>
      </div>
    </div>
  );
}
