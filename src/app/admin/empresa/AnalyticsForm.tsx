"use client";
import { useState, useTransition } from "react";
import { saveAnalytics } from "./actions";

/** IDs de Google Analytics 4 y del Píxel de Meta. Solo se activan si el visitante acepta las cookies. */
export function AnalyticsForm({ initial, canEdit }: { initial: { ga4: string; pixel: string }; canEdit: boolean }) {
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className="panel">
      <h2>Medición (GA4 y Píxel de Meta)</h2>
      <p className="muted small">
        Pega los identificadores y guarda. Se cargan solo para visitantes que acepten las cookies de medición. Cada clic a
        WhatsApp se envía como evento <b>Lead</b> (en GA4, <code>generate_lead</code>), así Meta puede optimizar los anuncios.
      </p>
      <div className="contact-row">
        <label className="field">
          <span className="field-label">ID de medición de GA4 (G-XXXXXXX)</span>
          <input value={v.ga4} disabled={!canEdit} placeholder="G-ABC123XYZ" onChange={(e) => setV({ ...v, ga4: e.target.value.trim().toUpperCase() })} />
        </label>
        <label className="field">
          <span className="field-label">ID del Píxel de Meta (solo números)</span>
          <input value={v.pixel} disabled={!canEdit} placeholder="123456789012345" inputMode="numeric" onChange={(e) => setV({ ...v, pixel: e.target.value.replace(/\D/g, "") })} />
        </label>
      </div>
      {canEdit && (
        <button
          className="btn-primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveAnalytics(v);
              setMsg(r.ok ? { ok: true, text: "Guardado. Ya se aplica en el sitio." } : { ok: false, text: r.error });
            })
          }
        >
          Guardar medición
        </button>
      )}
      {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
    </section>
  );
}
