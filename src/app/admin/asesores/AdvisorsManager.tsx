"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { prepareImage } from "@/lib/image-prepare";
import { sedesUrl } from "@/features/catalog/shared";
import { translateFieldsWithAi } from "../ai-copy";
import { ScheduleEditor, formatScheduleCompact } from "../ScheduleEditor";
import { deleteAdvisor, deleteRule, saveAdvisor, saveRule, type AdvisorInput, type RuleInput } from "./actions";

export type AdvisorRow = Omit<AdvisorInput, "id"> & { id: string };
export type RuleRow = Omit<RuleInput, "id"> & { id: string };
export type BranchOption = { id: string; name: string; city: string };

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
const COUNTRIES = [
  ["CO", "Colombia"],
  ["EC", "Ecuador"],
  ["PE", "Perú"],
  ["PA", "Panamá"],
  ["VE", "Venezuela"],
  ["BR", "Brasil"],
  ["MX", "México"],
  ["CL", "Chile"],
  ["BO", "Bolivia"],
  ["US", "EE. UU."],
] as const;
const ROLE_PRESETS: { es: string; en: string; pt: string }[] = [
  { es: "Asesor comercial", en: "Sales advisor", pt: "Consultor comercial" },
  { es: "Asesor de repuestos", en: "Spare parts advisor", pt: "Consultor de peças" },
  { es: "Asesor de motobombas y motores", en: "Pumps & engines advisor", pt: "Consultor de motobombas e motores" },
  { es: "Soporte técnico", en: "Technical support", pt: "Suporte técnico" },
  { es: "Jefe de sede", en: "Branch manager", pt: "Gerente da filial" },
];
const WEIGHT_PRESETS: { value: number; label: string }[] = [
  { value: 1, label: "1 · Normal" },
  { value: 2, label: "2 · Doble" },
  { value: 3, label: "3 · Triple" },
  { value: 5, label: "5 · Máximo" },
];
const PRIORITY_PRESETS: { value: number; label: string }[] = [
  { value: 10, label: "10 · Muy alta (primero)" },
  { value: 50, label: "50 · Alta" },
  { value: 100, label: "100 · Normal" },
  { value: 200, label: "200 · Respaldo / Baja" },
];
const RULE_NAME_PRESETS = [
  "Rotación general",
  "Especialista en repuestos",
  "Motobombas y motores",
  "Clientes en inglés o portugués",
  "Turno en horario laboral",
] as const;

const STRATEGY = { rotacion: "Rotación por turnos", ponderada: "Rotación por peso (%)", fijo: "Siempre el primero" } as const;

const emptyAdvisor = (defaultBranchId: string | null): AdvisorInput => ({
  id: null,
  name: "",
  title: "Asesor comercial",
  titleEn: "Sales advisor",
  titlePt: "Consultor comercial",
  phone: "",
  email: "",
  publicEmail: "",
  branchId: defaultBranchId,
  photoPath: null,
  showOnSite: true,
  languages: ["es"],
  catalogs: ["motobomba", "motor", "repuesto"],
  countries: "",
  days: ["1", "2", "3", "4", "5", "6"],
  from: "07:30",
  to: "17:30",
  perDaySchedule: true,
  dayHours: {
    "1": ["07:30", "17:30"],
    "2": ["07:30", "17:30"],
    "3": ["07:30", "17:30"],
    "4": ["07:30", "17:30"],
    "5": ["07:30", "17:30"],
    "6": ["08:00", "13:00"],
  },
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

function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly (readonly [T, string])[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="chips">
      {options.map(([k, label]) => (
        <label key={k} className={`chip ${value.includes(k) ? "on" : ""}`}>
          <input
            type="checkbox"
            hidden
            checked={value.includes(k)}
            onChange={() => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k])}
          />
          {label}
        </label>
      ))}
    </div>
  );
}

function parseCountries(raw: string): string[] {
  return [...new Set(raw.toUpperCase().split(/[\s,;]+/).filter((c) => /^[A-Z]{2}$/.test(c)))];
}

function CountryPicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const selected = parseCountries(value);
  function toggle(code: string) {
    const next = selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code];
    onChange(next.join(", "));
  }
  return (
    <div className="country-picker">
      <div className="chips">
        <button
          type="button"
          className={`chip ${selected.length === 0 ? "on" : ""}`}
          onClick={() => onChange("")}
        >
          Todos los países
        </button>
        {COUNTRIES.map(([code, label]) => {
          const active = selected.includes(code);
          return (
            <button
              key={code}
              type="button"
              className={`chip ${active ? "on" : ""}`}
              onClick={() => toggle(code)}
            >
              {label} ({code})
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Asesores (WhatsApp, sede, foto, correo público, idiomas, catálogos, horario por día, peso) y reglas de reparto. */
export function AdvisorsManager({
  advisors,
  rules,
  branches,
  supabaseUrl,
}: {
  advisors: AdvisorRow[];
  rules: RuleRow[];
  branches: BranchOption[];
  supabaseUrl: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [adv, setAdv] = useState<AdvisorInput | null>(null);
  const [rule, setRule] = useState<RuleInput | null>(null);
  const name = (id: string) => advisors.find((a) => a.id === id)?.name ?? "—";
  const branchName = (id: string | null) => branches.find((b) => b.id === id)?.name ?? "—";

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string, after?: () => void) =>
    start(async () => {
      setMsg(null);
      const r = await fn();
      if (!r.ok) return setMsg({ ok: false, text: r.error ?? "Error" });
      setMsg({ ok: true, text: ok });
      after?.();
      router.refresh();
    });

  async function uploadPhoto(file: File | undefined) {
    if (!file || !adv) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      return setMsg({ ok: false, text: "La foto debe ser JPG, PNG o WEBP." });
    }
    if (file.size > 25 * 1024 * 1024) {
      return setMsg({ ok: false, text: "La foto pesa más de 25 MB." });
    }
    setUploading(true);
    setMsg(null);
    const { blob, ext } = await prepareImage(file, 800);
    const path = `asesores/${crypto.randomUUID()}.${ext}`;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.storage.from("sedes").upload(path, blob, {
      contentType: blob.type || file.type,
      cacheControl: "31536000",
    });
    setUploading(false);
    if (error) return setMsg({ ok: false, text: `No se pudo subir la foto: ${error.message}` });
    if (adv.photoPath) await supabase.storage.from("sedes").remove([adv.photoPath]);
    setAdv({ ...adv, photoPath: path });
  }

  async function removePhoto() {
    if (!adv?.photoPath) return;
    await createSupabaseBrowserClient().storage.from("sedes").remove([adv.photoPath]);
    setAdv({ ...adv, photoPath: null });
  }

  async function translateTitleWithAi() {
    if (!adv || !adv.title.trim()) return;
    setAiBusy(true);
    setMsg(null);
    const r = await translateFieldsWithAi({ title: adv.title }, "Cargo de un asesor en JF Motores");
    setAiBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setAdv((prev) =>
      prev
        ? {
            ...prev,
            titleEn: r.en.title || prev.titleEn,
            titlePt: r.pt.title || prev.titlePt,
          }
        : prev,
    );
    setMsg({ ok: true, text: "Cargo traducido a inglés y portugués con IA." });
  }

  return (
    <>
      {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}

      <section className="panel">
        <div className="panel-head">
          <h2>Asesores</h2>
          <button className="btn-primary" onClick={() => setAdv(emptyAdvisor(branches[0]?.id ?? null))}>
            + Nuevo asesor
          </button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Asesor</th>
                <th>Sede</th>
                <th>WhatsApp y correo</th>
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
                    <div className="adv-cell">
                      <span className="adv-mini-avatar" aria-hidden="true">
                        {a.photoPath ? (
                          // eslint-disable-next-line @next/next/no-img-element -- miniatura en la tabla de asesores
                          <img src={sedesUrl(a.photoPath, supabaseUrl)} alt="" />
                        ) : (
                          a.name.slice(0, 2).toUpperCase()
                        )}
                      </span>
                      <div>
                        <b>{a.name}</b>
                        {a.isFallback && <span className="pill owner">Respaldo</span>}
                        <br />
                        <small className="muted">{a.title}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <small>{branchName(a.branchId)}</small>
                  </td>
                  <td>
                    +{a.phone}
                    {a.publicEmail && (
                      <>
                        <br />
                        <small className="muted">{a.publicEmail}</small>
                      </>
                    )}
                  </td>
                  <td>
                    <small>
                      {a.catalogs.map((c) => CATS.find(([k]) => k === c)?.[1]).join(", ")}
                      <br />
                      {a.languages.join(", ").toUpperCase()}
                      {a.countries && ` · ${a.countries}`}
                    </small>
                  </td>
                  <td>
                    <small>
                      {formatScheduleCompact(
                        a.days,
                        a.from,
                        a.to,
                        !!a.perDaySchedule,
                        a.dayHours ?? {},
                      )}
                    </small>
                  </td>
                  <td>{a.weight}</td>
                  <td>
                    {a.active ? <span className="pill ok">Activo</span> : <span className="pill">Inactivo</span>}{" "}
                    {a.showOnSite && <span className="pill">En Sedes</span>}
                  </td>
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
                <span className="field-label">Sede</span>
                <select value={adv.branchId ?? ""} onChange={(e) => setAdv({ ...adv, branchId: e.target.value || null })}>
                  <option value="">Sin sede asignada</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">WhatsApp (con indicativo)</span>
                <input value={adv.phone} inputMode="tel" placeholder="573001234567" onChange={(e) => setAdv({ ...adv, phone: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-label">Correo público (página de Sedes, opcional)</span>
                <input value={adv.publicEmail} type="email" placeholder="asesor@jfmotores.com" onChange={(e) => setAdv({ ...adv, publicEmail: e.target.value })} />
              </label>
            </div>

            <div className="field">
              <div className="panel-head">
                <span className="field-label">Elige el cargo con 1 clic (rellena los 3 idiomas automáticamente) o tradúcelo con IA:</span>
                <button
                  type="button"
                  className="btn-secondary ai-btn"
                  disabled={aiBusy || !adv.title.trim()}
                  onClick={translateTitleWithAi}
                >
                  {aiBusy ? "Traduciendo…" : "🌐 Traducir cargo a Inglés y Portugués con IA"}
                </button>
              </div>
              <div className="chips">
                {ROLE_PRESETS.map((r) => (
                  <button
                    key={r.es}
                    type="button"
                    className={`chip ${adv.title === r.es ? "on" : ""}`}
                    onClick={() => setAdv({ ...adv, title: r.es, titleEn: r.en, titlePt: r.pt })}
                  >
                    {r.es}
                  </button>
                ))}
              </div>
            </div>

            <div className="contact-row">
              <label className="field">
                <span className="field-label">Cargo (Español)</span>
                <input value={adv.title} placeholder="Asesor comercial" onChange={(e) => setAdv({ ...adv, title: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-label">Cargo (Inglés, opcional)</span>
                <input value={adv.titleEn} placeholder="Sales advisor" onChange={(e) => setAdv({ ...adv, titleEn: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-label">Cargo (Portugués, opcional)</span>
                <input value={adv.titlePt} placeholder="Consultor comercial" onChange={(e) => setAdv({ ...adv, titlePt: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-label">Cuenta del panel (opcional)</span>
                <input value={adv.email} type="email" placeholder="correo con el que entra" onChange={(e) => setAdv({ ...adv, email: e.target.value })} />
              </label>
            </div>

            <div className="field">
              <span className="field-label">Foto del asesor (aparece en la página de Sedes)</span>
              <div className="adv-photo-row">
                <span className="adv-photo-preview" aria-hidden="true">
                  {adv.photoPath ? (
                    // eslint-disable-next-line @next/next/no-img-element -- vista previa de la foto del asesor
                    <img src={sedesUrl(adv.photoPath, supabaseUrl)} alt="" />
                  ) : (
                    adv.name.slice(0, 2).toUpperCase() || "JF"
                  )}
                </span>
                <label className={`btn-secondary${uploading ? " disabled" : ""}`} style={{ cursor: "pointer" }}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    disabled={uploading}
                    onChange={(e) => {
                      uploadPhoto(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  {uploading ? "Subiendo…" : adv.photoPath ? "Cambiar foto" : "Subir foto"}
                </label>
                {adv.photoPath && (
                  <button type="button" className="link-danger" onClick={removePhoto}>
                    Quitar foto
                  </button>
                )}
              </div>
            </div>

            <div className="field">
              <span className="field-label">Catálogos que atiende</span>
              <Chips options={CATS} value={adv.catalogs} onChange={(v) => setAdv({ ...adv, catalogs: v })} />
            </div>
            <div className="field">
              <span className="field-label">Idiomas que habla</span>
              <Chips options={LANGS} value={adv.languages} onChange={(v) => setAdv({ ...adv, languages: v })} />
            </div>
            <div className="field">
              <span className="field-label">Países que atiende (selecciona con 1 clic)</span>
              <CountryPicker value={adv.countries} onChange={(countries) => setAdv({ ...adv, countries })} />
            </div>
            <div className="field">
              <span className="field-label">Peso en el reparto (elige con 1 clic)</span>
              <div className="chips">
                {WEIGHT_PRESETS.map((w) => (
                  <button
                    key={w.value}
                    type="button"
                    className={`chip ${adv.weight === w.value ? "on" : ""}`}
                    onClick={() => setAdv({ ...adv, weight: w.value })}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="field-label">
                Horario de atención (hora de Colombia; por defecto todos los días marcados usan el único horario, o activa horarios por día)
              </span>
              <ScheduleEditor
                days={adv.days}
                from={adv.from}
                to={adv.to}
                perDay={!!adv.perDaySchedule}
                dayHours={adv.dayHours ?? {}}
                emptyLabel="Sin días marcados = disponible siempre (24/7)"
                onChange={(next) =>
                  setAdv({
                    ...adv,
                    days: next.days,
                    from: next.from,
                    to: next.to,
                    perDaySchedule: next.perDay,
                    dayHours: next.dayHours,
                  })
                }
              />
            </div>
            <label className="check-row">
              <input type="checkbox" checked={adv.active} onChange={(e) => setAdv({ ...adv, active: e.target.checked })} />{" "}
              <span>
                <b>Activo (recibe cotizaciones por WhatsApp):</b> entra en el reparto automático y recibe los clics a su tarjeta.
              </span>
            </label>
            <label className="check-row">
              <input type="checkbox" checked={adv.showOnSite} onChange={(e) => setAdv({ ...adv, showOnSite: e.target.checked })} />{" "}
              <span>
                <b>Mostrar en la página de Sedes:</b> aparece en la sede elegida arriba (aunque no esté activo en el reparto automático).
              </span>
            </label>
            <label className="check-row">
              <input type="checkbox" checked={adv.isFallback} onChange={(e) => setAdv({ ...adv, isFallback: e.target.checked })} /> Asesor de respaldo (recibe lo que
              ninguna regla asigna)
            </label>
            <div className="row-actions">
              <button className="btn-primary" disabled={pending || uploading} onClick={() => run(() => saveAdvisor(adv), "Asesor guardado.", () => setAdv(null))}>
                Guardar asesor
              </button>
              <button className="btn-ghost" onClick={() => setAdv(null)}>
                Cancelar
              </button>
              {adv.id && !adv.isFallback && (
                <button
                  className="link-danger"
                  disabled={pending || uploading}
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
            <div className="field">
              <span className="field-label">Elige un nombre sugerido con 1 clic (o escríbelo abajo)</span>
              <div className="chips">
                {RULE_NAME_PRESETS.map((rn) => (
                  <button
                    key={rn}
                    type="button"
                    className={`chip ${rule.name === rn ? "on" : ""}`}
                    onClick={() => setRule({ ...rule, name: rn })}
                  >
                    {rn}
                  </button>
                ))}
              </div>
            </div>
            <div className="contact-row">
              <label className="field">
                <span className="field-label">Nombre</span>
                <input value={rule.name} placeholder="Ej.: Repuestos para Ana" onChange={(e) => setRule({ ...rule, name: e.target.value })} />
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
              <span className="field-label">Prioridad (elige con 1 clic: menor número = se evalúa primero)</span>
              <div className="chips">
                {PRIORITY_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    className={`chip ${rule.priority === p.value ? "on" : ""}`}
                    onClick={() => setRule({ ...rule, priority: p.value })}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="field-label">Solo para estos catálogos (vacío = todos)</span>
              <Chips options={CATS} value={rule.catalogs} onChange={(v) => setRule({ ...rule, catalogs: v })} />
            </div>
            <div className="field">
              <span className="field-label">Solo para estos idiomas del visitante (vacío = todos)</span>
              <Chips options={LANGS} value={rule.languages} onChange={(v) => setRule({ ...rule, languages: v })} />
            </div>
            <div className="field">
              <span className="field-label">Solo para estos países (selecciona con 1 clic)</span>
              <CountryPicker value={rule.countries} onChange={(countries) => setRule({ ...rule, countries })} />
            </div>
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
