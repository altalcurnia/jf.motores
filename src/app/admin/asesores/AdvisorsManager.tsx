"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAdvisor, deleteRule, saveAdvisor, saveRule, type AdvisorInput, type RuleInput } from "./actions";

export type AdvisorRow = Omit<AdvisorInput, "id"> & { id: string };
export type RuleRow = Omit<RuleInput, "id"> & { id: string };

const CATS = [
  ["motobomba", "Motobombas"],
  ["motor", "Motores"],
  ["repuesto", "Repuestos"],
] as const;
const LANGS = [
  ["es", "Español"],
  ["en", "Inglés"],
  ["pt", "Portugués"],
] as const;
const DAYS = [
  ["1", "L"],
  ["2", "M"],
  ["3", "X"],
  ["4", "J"],
  ["5", "V"],
  ["6", "S"],
  ["7", "D"],
] as const;
const STRATEGY = { rotacion: "Rotación por turnos", ponderada: "Rotación por peso (%)", fijo: "Siempre el primero" } as const;

const emptyAdvisor = (): AdvisorInput => ({
  id: null,
  name: "",
  title: "Asesor comercial",
  phone: "",
  email: "",
  languages: ["es"],
  catalogs: ["motobomba", "motor", "repuesto"],
  countries: "",
  days: [],
  from: "08:00",
  to: "18:00",
  weight: 1,
  active: true,
  isFallback: false,
});
const emptyRule = (): RuleInput => ({
  id: null,
  name: "",
  priority: 100,
  catalogs: [],
  countries: "",
  languages: [],
  inSchedule: false,
  strategy: "rotacion",
  advisorIds: [],
  active: true,
});

function Chips<T extends string>({ options, value, onChange }: { options: readonly (readonly [T, string])[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="chips">
      {options.map(([k, label]) => (
        <label key={k} className={`chip ${value.includes(k) ? "on" : ""}`}>
          <input type="checkbox" hidden checked={value.includes(k)} onChange={() => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k])} />
          {label}
        </label>
      ))}
    </div>
  );
}

/** Asesores (WhatsApp, idiomas, catálogos, horario, peso) y reglas de reparto. */
export function AdvisorsManager({ advisors, rules }: { advisors: AdvisorRow[]; rules: RuleRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [adv, setAdv] = useState<AdvisorInput | null>(null);
  const [rule, setRule] = useState<RuleInput | null>(null);
  const name = (id: string) => advisors.find((a) => a.id === id)?.name ?? "—";

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string, after?: () => void) =>
    start(async () => {
      setMsg(null);
      const r = await fn();
      if (!r.ok) return setMsg({ ok: false, text: r.error ?? "Error" });
      setMsg({ ok: true, text: ok });
      after?.();
      router.refresh();
    });

  return (
    <>
      {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}

      <section className="panel">
        <div className="panel-head">
          <h2>Asesores</h2>
          <button className="btn-primary" onClick={() => setAdv(emptyAdvisor())}>
            + Nuevo asesor
          </button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Asesor</th>
                <th>WhatsApp</th>
                <th>Atiende</th>
                <th>Horario</th>
                <th>Peso</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {advisors.map((a) => (
                <tr key={a.id}>
                  <td>
                    <b>{a.name}</b>
                    {a.isFallback && <span className="pill owner">Respaldo</span>}
                    <br />
                    <small className="muted">{a.title}</small>
                  </td>
                  <td>+{a.phone}</td>
                  <td>
                    <small>
                      {a.catalogs.map((c) => CATS.find(([k]) => k === c)?.[1]).join(", ")}
                      <br />
                      {a.languages.join(", ").toUpperCase()}
                      {a.countries && ` · ${a.countries}`}
                    </small>
                  </td>
                  <td>
                    <small>{a.days.length ? `${a.days.map((d) => DAYS.find(([k]) => k === d)?.[1]).join("")} ${a.from}–${a.to}` : "Siempre"}</small>
                  </td>
                  <td>{a.weight}</td>
                  <td>{a.active ? <span className="pill ok">Activo</span> : <span className="pill">Inactivo</span>}</td>
                  <td>
                    <button className="link-btn" onClick={() => setAdv({ ...a })}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {adv && (
          <div className="edit-box">
            <h3>{adv.id ? `Editar ${adv.name}` : "Nuevo asesor"}</h3>
            <div className="contact-row">
              <label className="field">
                <span className="field-label">Nombre</span>
                <input value={adv.name} onChange={(e) => setAdv({ ...adv, name: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-label">Cargo</span>
                <input value={adv.title} onChange={(e) => setAdv({ ...adv, title: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-label">WhatsApp (con indicativo)</span>
                <input value={adv.phone} inputMode="tel" placeholder="573001234567" onChange={(e) => setAdv({ ...adv, phone: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-label">Cuenta del panel (opcional)</span>
                <input value={adv.email} type="email" placeholder="correo con el que entra" onChange={(e) => setAdv({ ...adv, email: e.target.value })} />
              </label>
            </div>
            <div className="field">
              <span className="field-label">Catálogos que atiende</span>
              <Chips options={CATS} value={adv.catalogs} onChange={(v) => setAdv({ ...adv, catalogs: v })} />
            </div>
            <div className="field">
              <span className="field-label">Idiomas</span>
              <Chips options={LANGS} value={adv.languages} onChange={(v) => setAdv({ ...adv, languages: v })} />
            </div>
            <div className="contact-row">
              <label className="field">
                <span className="field-label">Países (códigos, vacío = todos)</span>
                <input value={adv.countries} placeholder="CO, PE, EC" onChange={(e) => setAdv({ ...adv, countries: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-label">Peso (para rotación por peso)</span>
                <input type="number" min={1} max={100} value={adv.weight} onChange={(e) => setAdv({ ...adv, weight: Number(e.target.value) })} />
              </label>
            </div>
            <div className="field">
              <span className="field-label">Horario (hora de Colombia; sin días = siempre disponible)</span>
              <div className="sched">
                <Chips options={DAYS} value={adv.days} onChange={(v) => setAdv({ ...adv, days: v })} />
                <input type="time" value={adv.from} onChange={(e) => setAdv({ ...adv, from: e.target.value })} aria-label="Desde" />
                <span>a</span>
                <input type="time" value={adv.to} onChange={(e) => setAdv({ ...adv, to: e.target.value })} aria-label="Hasta" />
              </div>
            </div>
            <label className="check-row">
              <input type="checkbox" checked={adv.active} onChange={(e) => setAdv({ ...adv, active: e.target.checked })} /> Activo (recibe leads)
            </label>
            <label className="check-row">
              <input type="checkbox" checked={adv.isFallback} onChange={(e) => setAdv({ ...adv, isFallback: e.target.checked })} /> Asesor de respaldo (recibe lo que
              ninguna regla asigna)
            </label>
            <div className="row-actions">
              <button className="btn-primary" disabled={pending} onClick={() => run(() => saveAdvisor(adv), "Asesor guardado.", () => setAdv(null))}>
                Guardar asesor
              </button>
              <button className="btn-ghost" onClick={() => setAdv(null)}>
                Cancelar
              </button>
              {adv.id && !adv.isFallback && (
                <button
                  className="link-danger"
                  disabled={pending}
                  onClick={() => confirm(`¿Borrar a ${adv.name}? Sus leads se conservan sin asesor.`) && run(() => deleteAdvisor(adv.id!), "Asesor borrado.", () => setAdv(null))}
                >
                  Borrar
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Reglas de reparto</h2>
          <button className="btn-primary" onClick={() => setRule(emptyRule())}>
            + Nueva regla
          </button>
        </div>
        <p className="muted small">
          Se revisan de menor a mayor prioridad; gana la primera que aplica y tiene asesores disponibles. Un cliente que vuelve se
          asigna al asesor que ya lo atendió.
        </p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Prioridad</th>
                <th>Regla</th>
                <th>Aplica a</th>
                <th>Modo</th>
                <th>Asesores</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className={r.active ? "" : "muted"}>
                  <td>{r.priority}</td>
                  <td>
                    <b>{r.name}</b>
                    {!r.active && <span className="pill">Inactiva</span>}
                  </td>
                  <td>
                    <small>
                      {[
                        r.catalogs.length ? r.catalogs.map((c) => CATS.find(([k]) => k === c)?.[1]).join(", ") : null,
                        r.countries || null,
                        r.languages.length ? r.languages.join(", ").toUpperCase() : null,
                        r.inSchedule ? "solo en horario" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Todo"}
                    </small>
                  </td>
                  <td>{STRATEGY[r.strategy]}</td>
                  <td>
                    <small>{r.advisorIds.length ? r.advisorIds.map(name).join(", ") : "Todos los activos"}</small>
                  </td>
                  <td>
                    <button className="link-btn" onClick={() => setRule({ ...r })}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rule && (
          <div className="edit-box">
            <h3>{rule.id ? `Editar «${rule.name}»` : "Nueva regla"}</h3>
            <div className="contact-row">
              <label className="field">
                <span className="field-label">Nombre</span>
                <input value={rule.name} placeholder="Ej.: Repuestos para Ana" onChange={(e) => setRule({ ...rule, name: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-label">Prioridad (menor = primero)</span>
                <input type="number" min={1} max={9999} value={rule.priority} onChange={(e) => setRule({ ...rule, priority: Number(e.target.value) })} />
              </label>
              <label className="field">
                <span className="field-label">Modo</span>
                <select value={rule.strategy} onChange={(e) => setRule({ ...rule, strategy: e.target.value as RuleInput["strategy"] })}>
                  {Object.entries(STRATEGY).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="field">
              <span className="field-label">Solo para estos catálogos (vacío = todos)</span>
              <Chips options={CATS} value={rule.catalogs} onChange={(v) => setRule({ ...rule, catalogs: v })} />
            </div>
            <div className="field">
              <span className="field-label">Solo para estos idiomas del visitante (vacío = todos)</span>
              <Chips options={LANGS} value={rule.languages} onChange={(v) => setRule({ ...rule, languages: v })} />
            </div>
            <label className="field">
              <span className="field-label">Solo para estos países (códigos, vacío = todos)</span>
              <input value={rule.countries} placeholder="PE, EC" onChange={(e) => setRule({ ...rule, countries: e.target.value })} />
            </label>
            <div className="field">
              <span className="field-label">Asesores de la regla (ninguno marcado = todos los activos)</span>
              <Chips options={advisors.map((a) => [a.id, a.name] as const)} value={rule.advisorIds} onChange={(v) => setRule({ ...rule, advisorIds: v })} />
            </div>
            <label className="check-row">
              <input type="checkbox" checked={rule.inSchedule} onChange={(e) => setRule({ ...rule, inSchedule: e.target.checked })} /> Solo asesores en horario (si
              nadie está en turno, pasa a la siguiente regla)
            </label>
            <label className="check-row">
              <input type="checkbox" checked={rule.active} onChange={(e) => setRule({ ...rule, active: e.target.checked })} /> Activa
            </label>
            <div className="row-actions">
              <button className="btn-primary" disabled={pending} onClick={() => run(() => saveRule(rule), "Regla guardada.", () => setRule(null))}>
                Guardar regla
              </button>
              <button className="btn-ghost" onClick={() => setRule(null)}>
                Cancelar
              </button>
              {rule.id && (
                <button
                  className="link-danger"
                  disabled={pending}
                  onClick={() => confirm(`¿Borrar la regla «${rule.name}»?`) && run(() => deleteRule(rule.id!), "Regla borrada.", () => setRule(null))}
                >
                  Borrar
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
