"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { prepareImage } from "@/lib/image-prepare";
import { sedesUrl } from "@/features/catalog/shared";
import { generateDescriptionWithAi, translateFieldsWithAi } from "../ai-copy";
import { ScheduleEditor, formatScheduleTrilingual, type DayHoursMap } from "../ScheduleEditor";
import { deleteBranch, reorderBranches, saveBranch, type BranchAdminInput } from "./actions";

export type BranchAdminRow = BranchAdminInput & { id: string };

const COMMON_CITIES = [
  "Medellín",
  "Caucasia",
  "Bogotá",
  "Cali",
  "Bucaramanga",
  "Barrancabermeja",
  "Montería",
  "Quibdó",
  "Segovia",
  "Amalfi",
] as const;

const REAL_BRANCH_SERVICES = [
  "Ensamble y banco de pruebas",
  "Venta de motobombas diésel",
  "Motores para trabajo pesado",
  "Stock permanente de repuestos",
  "Despacho inmediato a mina y región",
  "Asesoría técnica especializada",
  "Entrega inmediata en mostrador",
] as const;

const emptyBranch = (sort: number): BranchAdminInput => {
  const defaultHours = formatScheduleTrilingual(
    ["1", "2", "3", "4", "5", "6"],
    "07:30",
    "17:30",
    true,
    {
      "1": ["07:30", "17:30"],
      "2": ["07:30", "17:30"],
      "3": ["07:30", "17:30"],
      "4": ["07:30", "17:30"],
      "5": ["07:30", "17:30"],
      "6": ["08:00", "13:00"],
    },
  );
  return {
    id: null,
    name: "",
    city: "",
    address: "",
    phone: "",
    hoursEs: defaultHours.es,
    hoursEn: defaultHours.en,
    hoursPt: defaultHours.pt,
    descEs: "",
    descEn: "",
    descPt: "",
    mapQuery: "",
    photos: [],
    active: true,
    sort,
  };
};

/** Editor completo de sedes: datos interactivos, horario por día, IA de traducción/redacción verificada, mapa y fotos. */
export function BranchesManager({
  branches,
  canEdit,
  supabaseUrl,
}: {
  branches: BranchAdminRow[];
  canEdit: boolean;
  supabaseUrl: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [aiBusy, setAiBusy] = useState<"translate" | "generate" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [ed, setEd] = useState<BranchAdminInput | null>(null);

  // Estado interactivo del selector de horario de la sede abierta
  const [schedDays, setSchedDays] = useState<string[]>(["1", "2", "3", "4", "5", "6"]);
  const [schedFrom, setSchedFrom] = useState("07:30");
  const [schedTo, setSchedTo] = useState("17:30");
  const [schedPerDay, setSchedPerDay] = useState(true);
  const [schedDayHours, setSchedDayHours] = useState<DayHoursMap>({
    "1": ["07:30", "17:30"],
    "2": ["07:30", "17:30"],
    "3": ["07:30", "17:30"],
    "4": ["07:30", "17:30"],
    "5": ["07:30", "17:30"],
    "6": ["08:00", "13:00"],
  });

  // Estado para preguntas de verificación de IA antes de redactar la descripción
  const [aiQuestions, setAiQuestions] = useState<{ hint: string; questions: string[] } | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [extraFacts, setExtraFacts] = useState("");

  function openEditor(b: BranchAdminInput) {
    setEd({ ...b });
    setAiQuestions(null);
    setSelectedServices([]);
    setExtraFacts("");
    const hasSatHalf = /s[áa]b.*8:00.*1:00|s[áa]b.*13:00/i.test(b.hoursEs);
    setSchedDays(["1", "2", "3", "4", "5", "6"]);
    setSchedFrom("07:30");
    setSchedTo("17:30");
    setSchedPerDay(hasSatHalf || !b.hoursEs);
    setSchedDayHours({
      "1": ["07:30", "17:30"],
      "2": ["07:30", "17:30"],
      "3": ["07:30", "17:30"],
      "4": ["07:30", "17:30"],
      "5": ["07:30", "17:30"],
      "6": hasSatHalf || !b.hoursEs ? ["08:00", "13:00"] : ["07:30", "17:30"],
    });
  }

  function move<T>(list: T[], i: number, d: number): T[] {
    const out = [...list];
    const [x] = out.splice(i, 1);
    out.splice(Math.max(0, Math.min(out.length, i + d)), 0, x);
    return out;
  }

  function moveBranch(i: number, d: number) {
    const next = move(branches, i, d);
    start(async () => {
      setMsg(null);
      const r = await reorderBranches(next.map((b) => b.id));
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      router.refresh();
    });
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files?.length || !ed) return;
    const branchId = ed.id ?? crypto.randomUUID();
    setUploading(true);
    setMsg(null);
    const supabase = createSupabaseBrowserClient();
    const added: string[] = [];
    for (const file of Array.from(files)) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        setMsg({ ok: false, text: "Solo se permiten imágenes JPG, PNG o WEBP." });
        continue;
      }
      if (file.size > 25 * 1024 * 1024) {
        setMsg({ ok: false, text: "Una de las fotos pesa más de 25 MB." });
        continue;
      }
      const { blob, ext } = await prepareImage(file);
      const path = `sedes/${branchId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("sedes").upload(path, blob, {
        contentType: blob.type || file.type,
        cacheControl: "31536000",
      });
      if (error) {
        setUploading(false);
        return setMsg({ ok: false, text: `No se pudo subir: ${error.message}` });
      }
      added.push(path);
    }
    setUploading(false);
    if (added.length) {
      setEd((prev) => (prev ? { ...prev, id: branchId, photos: [...prev.photos, ...added] } : prev));
    }
  }

  async function removePhoto(path: string) {
    if (!ed) return;
    await createSupabaseBrowserClient().storage.from("sedes").remove([path]);
    setEd({ ...ed, photos: ed.photos.filter((p) => p !== path) });
  }

  async function handleTranslateWithAi() {
    if (!ed) return;
    setAiBusy("translate");
    setMsg(null);
    const r = await translateFieldsWithAi(
      {
        hours: ed.hoursEs,
        desc: ed.descEs,
      },
      `Sede ${ed.name || ed.city} de JF Motores en ${ed.city || "Colombia"}`,
    );
    setAiBusy(null);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setEd((prev) =>
      prev
        ? {
            ...prev,
            hoursEn: r.en.hours || prev.hoursEn,
            hoursPt: r.pt.hours || prev.hoursPt,
            descEn: r.en.desc || prev.descEn,
            descPt: r.pt.desc || prev.descPt,
          }
        : prev,
    );
    setMsg({ ok: true, text: "Horario y descripción traducidos a inglés y portugués con IA." });
  }

  async function handleGenerateDescWithAi(confirmedFacts = false) {
    if (!ed) return;
    setAiBusy("generate");
    setMsg(null);
    const combinedFacts = [
      selectedServices.length ? `Servicios reales confirmados: ${selectedServices.join(", ")}` : "",
      extraFacts.trim(),
    ]
      .filter(Boolean)
      .join(". ");

    const r = await generateDescriptionWithAi({
      kind: "sede",
      city: ed.city,
      name: ed.name || (ed.city ? `Sede ${ed.city}` : ""),
      address: ed.address,
      phone: ed.phone,
      hoursEs: ed.hoursEs,
      currentDescEs: confirmedFacts ? "" : ed.descEs,
      extraFacts: combinedFacts,
    });
    setAiBusy(null);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    if (r.needsInfo) {
      setAiQuestions({ hint: r.missingHint, questions: r.questions });
      return;
    }
    setAiQuestions(null);
    setEd((prev) =>
      prev
        ? {
            ...prev,
            descEs: r.es,
            descEn: r.en || prev.descEn,
            descPt: r.pt || prev.descPt,
          }
        : prev,
    );
    setMsg({
      ok: true,
      text: "Descripción generada en español, inglés y portugués usando únicamente los datos reales verificados.",
    });
  }

  function save() {
    if (!ed) return;
    start(async () => {
      setMsg(null);
      const r = await saveBranch(ed);
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setMsg({ ok: true, text: "Sede guardada. Ya se ve en la página pública." });
      setEd(null);
      router.refresh();
    });
  }

  function remove(b: BranchAdminRow) {
    if (!confirm(`¿Borrar la sede «${b.name}»? También se borrarán sus fotos.`)) return;
    start(async () => {
      setMsg(null);
      const r = await deleteBranch(b.id);
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setMsg({ ok: true, text: "Sede borrada." });
      setEd(null);
      router.refresh();
    });
  }

  const previewMapQuery = ed
    ? ed.mapQuery.trim() || [ed.address, ed.city, "Colombia"].filter(Boolean).join(", ")
    : "";

  return (
    <>
      {!canEdit && (
        <div className="notice">
          Solo puedes ver las sedes. Necesitas el permiso «Editar datos de la empresa» para modificarlas.
        </div>
      )}
      {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}

      <section className="panel">
        <div className="panel-head">
          <h2>Sedes ({branches.length})</h2>
          {canEdit && (
            <button type="button" className="btn-primary" onClick={() => openEditor(emptyBranch(branches.length + 1))}>
              + Nueva sede
            </button>
          )}
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Sede</th>
                <th>Dirección y teléfono</th>
                <th>Fotos</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {branches.map((b, i) => (
                <tr key={b.id}>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={!canEdit || pending || i === 0}
                        onClick={() => moveBranch(i, -1)}
                        aria-label="Subir"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={!canEdit || pending || i === branches.length - 1}
                        onClick={() => moveBranch(i, 1)}
                        aria-label="Bajar"
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td>
                    <b>{b.name}</b>
                    <br />
                    <small className="muted">{b.city}</small>
                  </td>
                  <td>
                    <small>
                      {b.address || "—"}
                      {b.phone ? ` · ${b.phone}` : ""}
                    </small>
                  </td>
                  <td>{b.photos.length}</td>
                  <td>{b.active ? <span className="pill ok">Activa</span> : <span className="pill">Oculta</span>}</td>
                  <td>
                    <button type="button" className="link-btn" onClick={() => openEditor(b)}>
                      {canEdit ? "Editar" : "Ver"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {ed && (
          <fieldset disabled={!canEdit || pending || uploading || !!aiBusy} className="edit-box">
            <h3>{ed.city ? `Sede: ${ed.name || ed.city}` : "Nueva sede"}</h3>

            <div className="field">
              <span className="field-label">Elige la ciudad con 1 clic (o escríbela abajo)</span>
              <div className="chips">
                {COMMON_CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`chip ${ed.city === c ? "on" : ""}`}
                    onClick={() =>
                      setEd({
                        ...ed,
                        city: c,
                        name: !ed.name || ed.name === `Sede ${ed.city}` ? `Sede ${c}` : ed.name,
                      })
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="contact-row">
              <label className="field">
                <span className="field-label">Ciudad *</span>
                <input
                  value={ed.city}
                  placeholder="Ej.: Medellín"
                  onChange={(e) => {
                    const nextCity = e.target.value;
                    setEd({
                      ...ed,
                      city: nextCity,
                      name: !ed.name || ed.name === `Sede ${ed.city}` ? (nextCity ? `Sede ${nextCity}` : "") : ed.name,
                    });
                  }}
                  required
                />
              </label>
              <label className="field">
                <span className="field-label">Nombre de la sede</span>
                <input
                  value={ed.name}
                  placeholder={`Sede ${ed.city || "principal"}`}
                  onChange={(e) => setEd({ ...ed, name: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">Dirección</span>
                <input
                  value={ed.address}
                  placeholder="Cra. 52 # 12-40"
                  onChange={(e) => setEd({ ...ed, address: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">Teléfono (opcional)</span>
                <input
                  value={ed.phone}
                  placeholder="573122110262"
                  onChange={(e) => setEd({ ...ed, phone: e.target.value })}
                />
              </label>
            </div>

            <div className="field">
              <span className="field-label">
                Horario interactivo (elige días y horas sin escribir — rellena automáticamente Español, Inglés y Portugués)
              </span>
              <ScheduleEditor
                days={schedDays}
                from={schedFrom}
                to={schedTo}
                perDay={schedPerDay}
                dayHours={schedDayHours}
                emptyLabel="Sin días marcados = no se muestra horario en la sede"
                onChange={(next) => {
                  setSchedDays(next.days);
                  setSchedFrom(next.from);
                  setSchedTo(next.to);
                  setSchedPerDay(next.perDay);
                  setSchedDayHours(next.dayHours);
                  const formatted = formatScheduleTrilingual(
                    next.days,
                    next.from,
                    next.to,
                    next.perDay,
                    next.dayHours,
                  );
                  setEd({
                    ...ed,
                    hoursEs: formatted.es,
                    hoursEn: formatted.en,
                    hoursPt: formatted.pt,
                  });
                }}
              />
            </div>

            <div className="contact-row">
              <label className="field">
                <span className="field-label">Horario generado (Español)</span>
                <input
                  value={ed.hoursEs}
                  placeholder="Lun–Vie 7:30 a. m. – 5:30 p. m. · Sáb 8:00 a. m. – 1:00 p. m."
                  onChange={(e) => setEd({ ...ed, hoursEs: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">Horario (Inglés)</span>
                <input
                  value={ed.hoursEn}
                  placeholder="Mon–Fri 7:30 am – 5:30 pm · Sat 8:00 am – 1:00 pm"
                  onChange={(e) => setEd({ ...ed, hoursEn: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">Horario (Portugués)</span>
                <input
                  value={ed.hoursPt}
                  placeholder="Seg–Sex 7h30 – 17h30 · Sáb 8h – 13h"
                  onChange={(e) => setEd({ ...ed, hoursPt: e.target.value })}
                />
              </label>
            </div>

            <div className="ai-toolbar">
              <div>
                <strong>Descripción e idiomas con IA (DeepSeek)</strong>
                <small className="muted block">
                  Solo usa datos reales y verificables. Si falta confirmar qué servicios presta la sede, te preguntará primero.
                </small>
              </div>
              <div className="ai-toolbar-actions">
                <button
                  type="button"
                  className="btn-secondary ai-btn"
                  disabled={!!aiBusy}
                  onClick={() => handleGenerateDescWithAi(false)}
                >
                  {aiBusy === "generate" ? "Consultando IA…" : "✨ Generar descripción con IA"}
                </button>
                <button
                  type="button"
                  className="btn-secondary ai-btn"
                  disabled={!!aiBusy || (!ed.descEs.trim() && !ed.hoursEs.trim())}
                  onClick={handleTranslateWithAi}
                >
                  {aiBusy === "translate" ? "Traduciendo…" : "🌐 Traducir a Inglés y Portugués con IA"}
                </button>
              </div>
            </div>

            {aiQuestions && (
              <div className="ai-prompt-box">
                <b>⚠️ Para no inventar información, confirma los datos reales de esta sede:</b>
                <p className="muted small">{aiQuestions.hint}</p>
                <ul className="ai-questions-list">
                  {aiQuestions.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
                <div className="field">
                  <span className="field-label">Marca con 1 clic los servicios reales que presta esta sede:</span>
                  <div className="chips">
                    {REAL_BRANCH_SERVICES.map((srv) => {
                      const on = selectedServices.includes(srv);
                      return (
                        <button
                          key={srv}
                          type="button"
                          className={`chip ${on ? "on" : ""}`}
                          onClick={() =>
                            setSelectedServices(on ? selectedServices.filter((x) => x !== srv) : [...selectedServices, srv])
                          }
                        >
                          {srv}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="field">
                  <span className="field-label">Otros datos reales (opcional: cobertura regional, aplicaciones principales, etc.)</span>
                  <input
                    value={extraFacts}
                    placeholder="Ej.: Especialidad en motobombas para minería, despacho directo al Bajo Cauca"
                    onChange={(e) => setExtraFacts(e.target.value)}
                  />
                </label>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!!aiBusy || (!selectedServices.length && !extraFacts.trim())}
                    onClick={() => handleGenerateDescWithAi(true)}
                  >
                    {aiBusy === "generate" ? "Generando…" : "Confirmar datos reales y redactar en los 3 idiomas"}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setAiQuestions(null)}>
                    Cerrar
                  </button>
                </div>
              </div>
            )}

            <div className="contact-row">
              <label className="field">
                <span className="field-label">Descripción corta (Español)</span>
                <textarea
                  rows={2}
                  value={ed.descEs}
                  placeholder="Taller principal de ensamble, pruebas y despacho de motobombas y repuestos."
                  onChange={(e) => setEd({ ...ed, descEs: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">Descripción corta (Inglés, opcional)</span>
                <textarea
                  rows={2}
                  value={ed.descEn}
                  onChange={(e) => setEd({ ...ed, descEn: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field-label">Descripción corta (Portugués, opcional)</span>
                <textarea
                  rows={2}
                  value={ed.descPt}
                  onChange={(e) => setEd({ ...ed, descPt: e.target.value })}
                />
              </label>
            </div>

            <div className="field">
              <span className="field-label">
                Búsqueda para Google Maps (vacío = usa Dirección + Ciudad automáticamente)
              </span>
              <input
                value={ed.mapQuery}
                placeholder="Ej.: Cra. 52 # 12-40, Medellín, Antioquia"
                onChange={(e) => setEd({ ...ed, mapQuery: e.target.value })}
              />
              {previewMapQuery && (
                <div className="sede-map-preview">
                  <iframe
                    src={`https://www.google.com/maps?q=${encodeURIComponent(previewMapQuery)}&output=embed`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Vista previa del mapa"
                  />
                </div>
              )}
            </div>

            <div className="field">
              <span className="field-label">Fotos de la sede (la primera sale como principal)</span>
              <div className="sede-photos-grid">
                {ed.photos.map((p, i) => (
                  <div key={p} className="sede-photo-item">
                    {/* eslint-disable-next-line @next/next/no-img-element -- vista previa en el panel */}
                    <img src={sedesUrl(p, supabaseUrl)} alt={`Foto ${i + 1}`} />
                    <div className="sede-photo-actions">
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={i === 0}
                        onClick={() => setEd({ ...ed, photos: move(ed.photos, i, -1) })}
                        aria-label="Subir foto"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={i === ed.photos.length - 1}
                        onClick={() => setEd({ ...ed, photos: move(ed.photos, i, 1) })}
                        aria-label="Bajar foto"
                      >
                        ↓
                      </button>
                      <button type="button" className="link-danger" onClick={() => removePhoto(p)}>
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <label className={`btn-secondary${uploading ? " disabled" : ""}`} style={{ display: "inline-block", cursor: "pointer" }}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    hidden
                    disabled={uploading}
                    onChange={(e) => {
                      uploadPhotos(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  {uploading ? "Subiendo fotos…" : "+ Subir fotos"}
                </label>
              </div>
            </div>

            <label className="check-row">
              <input
                type="checkbox"
                checked={ed.active}
                onChange={(e) => setEd({ ...ed, active: e.target.checked })}
              />{" "}
              Visible en el sitio (activa)
            </label>

            <div className="row-actions">
              {canEdit && (
                <button type="button" className="btn-primary" disabled={pending || uploading} onClick={save}>
                  {pending ? "Guardando…" : "Guardar sede"}
                </button>
              )}
              <button type="button" className="btn-ghost" onClick={() => setEd(null)}>
                Cancelar
              </button>
              {canEdit && ed.id && branches.some((b) => b.id === ed.id) && (
                <button
                  type="button"
                  className="link-danger"
                  disabled={pending || uploading}
                  onClick={() => remove(branches.find((b) => b.id === ed.id)!)}
                >
                  Borrar sede
                </button>
              )}
            </div>
          </fieldset>
        )}
      </section>
    </>
  );
}
