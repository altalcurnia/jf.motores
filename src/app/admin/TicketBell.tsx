"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const PREF = "jf-ticket-alerts";

/** Pitido corto para avisar (sin archivos de audio). */
function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.4);
  } catch {}
}

/**
 * Campana de tickets del panel: muestra cuántos esperan respuesta (se revisa cada 30 s) y,
 * si se activan los avisos, suena y muestra una notificación del navegador cuando llega uno nuevo.
 */
export function TicketBell() {
  const [count, setCount] = useState<number | null>(null);
  const [alerts, setAlerts] = useState(false);
  const last = useRef<number | null>(null);
  const alertsRef = useRef(false);

  useEffect(() => {
    let on = false;
    try {
      on = localStorage.getItem(PREF) === "1" && "Notification" in window && Notification.permission === "granted";
    } catch {}
    alertsRef.current = on;
    const sync = () => setAlerts(on);
    sync();
    let alive = true;
    const check = async () => {
      const r = await fetch("/api/tickets/unread", { cache: "no-store" }).catch(() => null);
      const d = (await r?.json().catch(() => null)) as { staff?: number | null } | null;
      if (!alive || !d || d.staff == null) return;
      const n = d.staff;
      if (last.current !== null && n > last.current && alertsRef.current) {
        beep();
        try {
          new Notification("JF Motores · Nuevo ticket", { body: `${n} ticket${n === 1 ? "" : "s"} por responder`, tag: "jf-tickets" });
        } catch {}
      }
      last.current = n;
      setCount(n);
      document.title = document.title.replace(/^\(\d+\) /, "");
      if (n > 0) document.title = `(${n}) ${document.title}`;
    };
    check();
    const id = setInterval(check, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  async function toggle() {
    if (alerts) {
      alertsRef.current = false;
      setAlerts(false);
      try {
        localStorage.setItem(PREF, "0");
      } catch {}
      return;
    }
    if (!("Notification" in window)) return;
    const p = await Notification.requestPermission();
    const on = p === "granted";
    alertsRef.current = on;
    setAlerts(on);
    try {
      localStorage.setItem(PREF, on ? "1" : "0");
    } catch {}
    if (on) beep();
  }

  if (count === null) return null;
  return (
    <span className="bell">
      <Link href="/admin/tickets" className={`bell-link${count > 0 ? " has" : ""}`} title="Tickets por responder">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {count > 0 && <b>{count}</b>}
        <span className="sr-only">Tickets por responder</span>
      </Link>
      <button type="button" className={`bell-toggle${alerts ? " on" : ""}`} onClick={toggle} title="Avisos con sonido y notificación del navegador">
        {alerts ? "Avisos activos" : "Activar avisos"}
      </button>
    </span>
  );
}
