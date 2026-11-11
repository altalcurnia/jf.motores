"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteTestimonial, saveTestimonial, saveTrust, type TestimonialInput, type TrustInput } from "./actions";

export type TestimonialRow = Omit<TestimonialInput, "id"> & { id: string };

const empty = (): TestimonialInput => ({ id: null, name: "", place: "", product: "", quote: "", consent: false, active: true });

const FOUNDED_YEAR_PRESETS = ["2005", "2008", "2010", "2012", "2015", "2018", "2020"];
const PLACE_PRESETS = ["Caucasia, Antioquia", "Segovia, Antioquia", "Zaragoza, Antioquia", "El Bagre, Antioquia", "Remedios, Antioquia", "Medellín, Antioquia"];
const EQUIP_PRESETS = ["Motobomba Jaguar 25", "Motobomba Diésel 4x4", "Motobomba Diésel 6x6", "Motor Diésel 25 HP", "Motor Diésel 38 HP"];

/** Datos legales (política, términos y pie), IVA, cifras y testimonios. Lo vacío no se muestra en el sitio. */
export function TrustForm({ initial, testimonials, canEdit }: { initial: TrustInput; testimonials: TestimonialRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [t, setT] = useState<TestimonialInput | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: ok } : { ok: false, text: r.error ?? "Error" });
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });
  const field = (k: keyof TrustInput, label: string, ph = "", extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="field">
      <span className="field-label">{label}</span>
      <input value={v[k]} placeholder={ph} disabled={!canEdit} onChange={(e) => setV({ ...v, [k]: e.target.value })} {...extra} />
    </label>
  );

  return (
    <section className="panel trust-panel">
      <h2>Datos legales y confianza</h2>
      <p className="muted small">
        Se usan en la política de datos, los términos y condiciones y el pie de página. Las cifras y los testimonios aparecen en el
        inicio solo cuando están llenos. Publica únicamente datos reales y verificables (Ley 1480).
      </p>
      <div className="trust-grid">
        {field("legalName", "Razón social", "JF Motores S.A.S.")}
        {field("nit", "NIT", "900123456-7")}
        {field("legalAddress", "Dirección legal", "Cra. 52 # 12-40, Medellín")}
        <div className="field">
          <span className="field-label">Año de fundación</span>
          {canEdit && (
            <div className="sched-presets">
              {FOUNDED_YEAR_PRESETS.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  className={`chip-btn ${v.foundedYear === yr ? "on" : ""}`}
                  onClick={() => setV({ ...v, foundedYear: yr })}
                >
                  {yr}
                </button>
              ))}
            </div>
          )}
          <input value={v.foundedYear} placeholder="2008" inputMode="numeric" disabled={!canEdit} onChange={(e) => setV({ ...v, foundedYear: e.target.value })} />
        </div>
        <label className="field">
          <span className="field-label">¿Los precios publicados incluyen IVA?</span>
          <select value={v.vat} disabled={!canEdit} onChange={(e) => setV({ ...v, vat: e.target.value as TrustInput["vat"] })}>
            <option value="">Sin confirmar (no se dice nada)</option>
            <option value="si">Sí, IVA incluido</option>
            <option value="no">No, se suma el IVA</option>
          </select>
        </label>
        {field("equipos", "Equipos entregados", "Ej. 350", { inputMode: "numeric" })}
        {field("clientes", "Clientes atendidos", "Ej. 200", { inputMode: "numeric" })}
        {field("municipios", "Municipios atendidos", "Ej. 40", { inputMode: "numeric" })}
      </div>
      {canEdit && (
        <button className="btn-primary" disabled={pending} onClick={() => run(() => saveTrust(v), "Datos guardados. Ya se aplican en el sitio.")}>
          Guardar datos
        </button>
      )}

      <h3 className="trust-h3">Testimonios</h3>
      <p className="muted small">Pide autorización al cliente antes de publicar. Sin la casilla de permiso marcada, el testimonio no aparece.</p>
      {testimonials.length === 0 && <p className="muted small">Aún no hay testimonios.</p>}
      {testimonials.map((x) => (
        <div key={x.id} className="trust-item">
          <div>
            <b>{x.name}</b>
            {x.place && <small className="muted"> · {x.place}</small>}
            <p>“{x.quote}”</p>
            <small className={x.consent && x.active ? "ok-text" : "muted"}>
              {!x.consent ? "Sin permiso: no se publica" : !x.active ? "Oculto" : "Publicado"}
            </small>
          </div>
          {canEdit && (
            <button className="link-btn" onClick={() => setT({ ...x })}>
              Editar
            </button>
          )}
        </div>
      ))}
      {canEdit && !t && (
        <button className="btn-ghost" onClick={() => setT(empty())}>
          + Agregar testimonio
        </button>
      )}
      {t && (
        <div className="edit-box">
          <div className="trust-grid">
            <label className="field">
              <span className="field-label">Nombre del cliente</span>
              <input value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} placeholder="Carlos Pérez" />
            </label>
            <div className="field">
              <span className="field-label">Mina o lugar (opcional)</span>
              <div className="sched-presets">
                {PLACE_PRESETS.map((pl) => (
                  <button
                    key={pl}
                    type="button"
                    className={`chip-btn ${t.place === pl ? "on" : ""}`}
                    onClick={() => setT({ ...t, place: pl })}
                  >
                    {pl}
                  </button>
                ))}
              </div>
              <input value={t.place} onChange={(e) => setT({ ...t, place: e.target.value })} placeholder="Segovia, Antioquia" />
            </div>
            <div className="field">
              <span className="field-label">Equipo que compró (opcional)</span>
              <div className="sched-presets">
                {EQUIP_PRESETS.map((eq) => (
                  <button
                    key={eq}
                    type="button"
                    className={`chip-btn ${t.product === eq ? "on" : ""}`}
                    onClick={() => setT({ ...t, product: eq })}
                  >
                    {eq}
                  </button>
                ))}
              </div>
              <input value={t.product} onChange={(e) => setT({ ...t, product: e.target.value })} placeholder="Motobomba Jaguar 25" />
            </div>
          </div>
          <label className="field">
            <span className="field-label">Testimonio (sus palabras)</span>
            <textarea rows={3} maxLength={600} value={t.quote} onChange={(e) => setT({ ...t, quote: e.target.value })} />
          </label>
          <label className="check-row">
            <input type="checkbox" checked={t.consent} onChange={(e) => setT({ ...t, consent: e.target.checked })} /> El cliente autorizó publicar su nombre y
            testimonio
          </label>
          <label className="check-row">
            <input type="checkbox" checked={t.active} onChange={(e) => setT({ ...t, active: e.target.checked })} /> Mostrar en el sitio
          </label>
          <div className="row-actions">
            <button className="btn-primary" disabled={pending} onClick={() => run(() => saveTestimonial(t), "Testimonio guardado.", () => setT(null))}>
              Guardar testimonio
            </button>
            <button className="btn-ghost" onClick={() => setT(null)}>
              Cancelar
            </button>
            {t.id && (
              <button
                className="link-danger"
                onClick={() => confirm("¿Borrar este testimonio?") && run(() => deleteTestimonial(t.id!), "Testimonio borrado.", () => setT(null))}
              >
                Borrar
              </button>
            )}
          </div>
        </div>
      )}
      {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
    </section>
  );
}
