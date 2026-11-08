"use client";
import { useState, useTransition } from "react";
import { saveAnalytics } from "./actions";
import type { AnalyticsIds } from "@/features/analytics/ids";

type Values = Record<keyof AnalyticsIds, string>;

const FIELDS: { key: keyof AnalyticsIds; label: string; placeholder: string; where: string; numeric?: boolean }[] = [
  { key: "pixel", label: "Píxel de Meta (Instagram y Facebook)", placeholder: "123456789012345", where: "Administrador de eventos de Meta → Orígenes de datos → tu píxel → «Identificador»", numeric: true },
  { key: "ga4", label: "Google Analytics 4 (ID de medición)", placeholder: "G-ABC123XYZ", where: "Google Analytics → Administrar → Flujos de datos → Web" },
  { key: "gads", label: "Google Ads (ID de conversión)", placeholder: "AW-123456789", where: "Google Ads → Objetivos → Conversiones → tu acción → Configuración de etiqueta" },
  { key: "gadsLabel", label: "Google Ads (etiqueta de la conversión «clic a WhatsApp»)", placeholder: "AbC-D_efG-h12_34-567", where: "Misma pantalla: lo que va después de la barra en «send_to: AW-…/etiqueta»" },
  { key: "tiktok", label: "Píxel de TikTok", placeholder: "C4ABC123DEF456GHI789", where: "TikTok Ads Manager → Herramientas → Eventos → Web → tu píxel → «ID del píxel»" },
];

/** IDs públicos de medición de anuncios. Solo se activan si el visitante acepta las cookies. */
export function AnalyticsForm({ initial, canEdit }: { initial: Values; canEdit: boolean }) {
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className="panel">
      <h2>Medición de anuncios (Meta, Google y TikTok)</h2>
      <p className="muted small">
        Pega los identificadores y guarda. Ninguno es secreto. Se cargan solo para visitantes que acepten las cookies de
        medición, y cada clic a WhatsApp se envía como evento de cliente potencial (<b>Lead</b> en Meta,{" "}
        <code>generate_lead</code> en GA4, conversión en Google Ads y <b>Contact</b> en TikTok) para que cada red optimice
        sus anuncios. Si un campo queda vacío, esa red no se carga.
      </p>
      <div className="contact-row" style={{ flexWrap: "wrap" }}>
        {FIELDS.map((f) => (
          <label key={f.key} className="field">
            <span className="field-label">{f.label}</span>
            <input
              value={v[f.key]}
              disabled={!canEdit}
              placeholder={f.placeholder}
              inputMode={f.numeric ? "numeric" : undefined}
              onChange={(e) => setV({ ...v, [f.key]: f.numeric ? e.target.value.replace(/\D/g, "") : e.target.value.trim() })}
            />
            <small className="muted">Dónde suele estar: {f.where}</small>
          </label>
        ))}
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
