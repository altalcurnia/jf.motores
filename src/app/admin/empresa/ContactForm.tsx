"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { saveContact, type BranchInput, type ContactInput, type PhoneInput } from "./actions";

/** Editor de líneas directas, correo de soporte y sedes. */
export function ContactForm({ initial, canEdit }: { initial: ContactInput; canEdit: boolean }) {
  const [v, setV] = useState<ContactInput>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const setPhone = (i: number, patch: Partial<PhoneInput>) =>
    setV((s) => ({ ...s, phones: s.phones.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));
  const setBranch = (i: number, patch: Partial<BranchInput>) =>
    setV((s) => ({ ...s, branches: s.branches.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));
  const move = <T,>(list: T[], i: number, d: number) => {
    const out = [...list];
    const [x] = out.splice(i, 1);
    out.splice(Math.max(0, Math.min(out.length, i + d)), 0, x);
    return out;
  };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const r = await saveContact(v);
      setMsg(r.ok ? { ok: true, text: "Guardado. El sitio ya muestra los datos nuevos." } : { ok: false, text: r.error });
    });
  }

  return (
    <form className="pform" onSubmit={onSubmit}>
      {!canEdit && <div className="notice">Solo puedes ver estos datos. Para editarlos necesitas el permiso “Editar datos de la empresa y sedes”.</div>}
      <fieldset disabled={!canEdit || pending} className="pform-grid">
        <section className="panel">
          <h2>Líneas directas</h2>
          <p className="muted small">
            Número con indicativo de país, sin espacios ni “+” (ej. 573122110262). La primera marcada como WhatsApp recibe los
            mensajes del botón flotante y de “Cotizar por WhatsApp”.
          </p>
          {v.phones.map((p, i) => (
            <div className="contact-row" key={i}>
              <label className="field">
                <span className="field-label">Número</span>
                <input inputMode="tel" value={p.number} onChange={(e) => setPhone(i, { number: e.target.value })} required />
              </label>
              <label className="field">
                <span className="field-label">Etiqueta (opcional)</span>
                <input value={p.label} maxLength={60} placeholder="Ventas, Soporte técnico…" onChange={(e) => setPhone(i, { label: e.target.value })} />
              </label>
              <label className="check">
                <input type="checkbox" checked={p.whatsapp} onChange={(e) => setPhone(i, { whatsapp: e.target.checked })} /> WhatsApp
              </label>
              <div className="row-actions">
                <button type="button" className="btn-ghost" disabled={i === 0} onClick={() => setV((s) => ({ ...s, phones: move(s.phones, i, -1) }))} aria-label="Subir">↑</button>
                <button type="button" className="link-danger" disabled={v.phones.length === 1} onClick={() => setV((s) => ({ ...s, phones: s.phones.filter((_, j) => j !== i) }))}>
                  Quitar
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={() => setV((s) => ({ ...s, phones: [...s.phones, { label: "", number: "", whatsapp: false }] }))}>
            + Agregar línea
          </button>
        </section>

        <section className="panel">
          <h2>Correo de soporte</h2>
          <p className="muted small">Aparece en Contacto, en Soporte y en el menú del celular. Déjalo vacío para no mostrar correo.</p>
          <label className="field">
            <span className="field-label">Correo</span>
            <input type="email" value={v.email} onChange={(e) => setV((s) => ({ ...s, email: e.target.value }))} placeholder="soporte@tuempresa.com" />
          </label>
        </section>

        <section className="panel full">
          <div className="panel-head">
            <h2>Sedes</h2>
            <Link href="/admin/sedes" className="btn-secondary">
              Editar sedes, fotos y mapa →
            </Link>
          </div>
          <p className="muted small">Se muestran en este orden al final de la página principal y en la página de Sedes. Desactiva una sede para ocultarla sin borrarla.</p>
          {v.branches.map((b, i) => (
            <div className="contact-row branch" key={b.id ?? `new-${i}`}>
              <label className="field">
                <span className="field-label">Ciudad</span>
                <input value={b.city} onChange={(e) => setBranch(i, { city: e.target.value })} required />
              </label>
              <label className="field">
                <span className="field-label">Nombre</span>
                <input value={b.name} placeholder={`Sede ${b.city}`} onChange={(e) => setBranch(i, { name: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-label">Dirección</span>
                <input value={b.address} onChange={(e) => setBranch(i, { address: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-label">Teléfono (opcional)</span>
                <input value={b.phone} onChange={(e) => setBranch(i, { phone: e.target.value })} />
              </label>
              <label className="check">
                <input type="checkbox" checked={b.active} onChange={(e) => setBranch(i, { active: e.target.checked })} /> Visible
              </label>
              <div className="row-actions">
                <button type="button" className="btn-ghost" disabled={i === 0} onClick={() => setV((s) => ({ ...s, branches: move(s.branches, i, -1) }))} aria-label="Subir">↑</button>
                <button
                  type="button"
                  className="link-danger"
                  onClick={() =>
                    setV((s) => ({
                      ...s,
                      branches: s.branches.filter((_, j) => j !== i),
                      removedBranches: b.id ? [...s.removedBranches, b.id] : s.removedBranches,
                    }))
                  }
                >
                  Borrar
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setV((s) => ({ ...s, branches: [...s.branches, { id: null, name: "", city: "", address: "", phone: "", active: true }] }))}
          >
            + Agregar sede
          </button>
        </section>
      </fieldset>
      {canEdit && (
        <div className="savebar">
          {msg && <span className={msg.ok ? "mail-ok" : "err-text"}>{msg.text}</span>}
          <div className="savebar-actions">
            <button className="btn-primary" disabled={pending}>
              {pending ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
