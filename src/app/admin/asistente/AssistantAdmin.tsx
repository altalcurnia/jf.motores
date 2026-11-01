"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { addDocument, connectTelegram, deleteDocument, newDocumentPath, saveSettings, setDocumentActive, testAssistant } from "./actions";

export type DocRow = { id: string; title: string; chars: number; active: boolean; isTest: boolean; createdAt: string };
type Note = { ok: boolean; text: string } | null;

const MODELS = [
  { id: "deepseek-flash", label: "deepseek-flash (rápido y económico, recomendado)" },
  { id: "deepseek-v4-pro", label: "deepseek-v4-pro (más preciso, cuesta más)" },
];

export function AssistantAdmin(props: {
  enabled: boolean;
  model: string;
  docs: DocRow[];
  keyConfigured: boolean;
  telegramConfigured: boolean;
  searchConfigured: boolean;
  webVerify: boolean;
  domains: string[];
}) {
  const [webVerify, setWebVerify] = useState(props.webVerify);
  const [domains, setDomains] = useState(props.domains.join("\n"));
  const router = useRouter();
  const [enabled, setEnabled] = useState(props.enabled);
  const [model, setModel] = useState(props.model);
  const [note, setNote] = useState<Note>(null);
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Note>(null);
  const activeDocs = props.docs.filter((d) => d.active).length;

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, okText?: string) =>
    start(async () => {
      setNote(null);
      const r = await fn();
      setNote(r.ok ? { ok: true, text: r.message ?? okText ?? "Guardado." } : { ok: false, text: r.error ?? "Error" });
      if (r.ok) router.refresh();
    });

  async function upload() {
    if (!file) return { ok: false, error: "Elige un PDF." };
    if (file.type !== "application/pdf") return { ok: false, error: "El archivo debe ser PDF." };
    if (file.size > 20 * 1024 * 1024) return { ok: false, error: "El PDF pesa más de 20 MB." };
    const path = await newDocumentPath();
    const { error } = await createSupabaseBrowserClient().storage.from("conocimiento").upload(path, file, { contentType: "application/pdf" });
    if (error) return { ok: false, error: `No se pudo subir: ${error.message}` };
    const r = await addDocument({ title: title || file.name.replace(/\.pdf$/i, ""), path });
    if (r.ok) {
      setTitle("");
      setFile(null);
    }
    return r;
  }

  return (
    <div className="pform">
      <div className="pform-grid">
        <section className="panel">
          <h2>Estado</h2>
          <ul className="ai-status">
            <li className={props.keyConfigured ? "ok" : "bad"}>
              {props.keyConfigured ? "✓ Clave de DeepSeek configurada en Vercel" : "✗ Falta DEEPSEEK_API_KEY en Vercel"}
            </li>
            <li className={activeDocs ? "ok" : "bad"}>{activeDocs ? `✓ ${activeDocs} documento(s) activo(s)` : "✗ No hay documentos activos"}</li>
            <li className={enabled ? "ok" : "muted"}>{enabled ? "✓ Visible en el sitio" : "Apagado en el sitio (solo se puede probar aquí)"}</li>
            <li className="ok">✓ Lee el catálogo publicado (productos, precios, estado y compatibilidad) en cada pregunta</li>
            <li className={props.searchConfigured ? "ok" : "muted"}>
              {props.searchConfigured ? "✓ Búsqueda en fuentes oficiales disponible (TAVILY_API_KEY)" : "Búsqueda en fuentes oficiales: falta TAVILY_API_KEY en Vercel"}
            </li>
          </ul>
          <label className="check-row">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Mostrar “Chat con IA” en el botón Soporte
          </label>
          <label className="field">
            <span className="field-label">Modelo de DeepSeek</span>
            <select value={MODELS.some((m) => m.id === model) ? model : "otro"} onChange={(e) => setModel(e.target.value === "otro" ? "" : e.target.value)}>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
              <option value="otro">Otro…</option>
            </select>
          </label>
          {!MODELS.some((m) => m.id === model) && (
            <label className="field">
              <span className="field-label">Nombre exacto del modelo</span>
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="deepseek-…" />
            </label>
          )}
          <label className="check-row">
            <input type="checkbox" checked={webVerify} onChange={(e) => setWebVerify(e.target.checked)} /> Verificar datos técnicos en sitios oficiales
            de fabricantes cuando algo no cuadre
          </label>
          <label className="field">
            <span className="field-label">Sitios oficiales permitidos (uno por línea; nunca foros, tiendas ni blogs)</span>
            <textarea rows={6} value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="cummins.com" />
          </label>
          <button
            className="btn-primary"
            disabled={pending}
            onClick={() => {
              if (enabled && (!props.keyConfigured || !activeDocs)) {
                setNote({ ok: false, text: "Para encenderlo hace falta la clave de DeepSeek y al menos un documento activo." });
                return;
              }
              run(() => saveSettings({ enabled, model, webVerify, domains }));
            }}
          >
            Guardar
          </button>
        </section>

        <section className="panel">
          <h2>Probar</h2>
          <p className="muted small">Pregunta como lo haría un cliente. Funciona aunque el chat esté apagado en el sitio.</p>
          <textarea rows={3} value={question} maxLength={800} onChange={(e) => setQuestion(e.target.value)} placeholder="¿Qué motobomba me sirve para sacar 3 000 L/min a 50 m?" />
          <button
            className="btn-secondary"
            disabled={pending || !question.trim()}
            onClick={() =>
              start(async () => {
                setAnswer(null);
                const r = await testAssistant(question);
                setAnswer(
                  r.ok
                    ? {
                        ok: true,
                        text:
                          r.handoff !== null
                            ? `→ Pasa a un asesor por WhatsApp. Resumen para el asesor: ${r.handoff || "(sin resumen)"}`
                            : r.noInfo
                              ? "→ Sin dato en las fuentes: el cliente verá “escríbenos por WhatsApp”."
                              : r.reply + (r.sources.length ? `\n\nFuentes oficiales consultadas:\n${r.sources.join("\n")}` : ""),
                      }
                    : { ok: false, text: r.error },
                );
              })
            }
          >
            {pending ? "Pensando…" : "Preguntar"}
          </button>
          {answer && <div className={`ai-answer ${answer.ok ? "" : "err-text"}`}>{answer.text}</div>}
        </section>

        <section className="panel full">
          <h2>Documentos (única fuente de información)</h2>
          <p className="muted small">
            El catálogo y los precios los lee directamente de la base de datos: no hace falta subirlos en PDF. Aquí van políticas, guías
            técnicas, manuales y condiciones comerciales. PDF con texto seleccionable (no escaneos), hasta 20 MB. Lo que cargues aquí lo puede citar el asistente público:{" "}
            <b>no subas información confidencial</b> (costos internos, datos de clientes).
          </p>
          <div className="ai-upload">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (ej. Catálogo 2027)" maxLength={120} />
            <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button className="btn-primary" disabled={pending || !file} onClick={() => run(upload)}>
              {pending ? "Procesando…" : "Cargar PDF"}
            </button>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Texto</th>
                  <th>Cargado</th>
                  <th>Activo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {props.docs.map((d) => (
                  <tr key={d.id}>
                    <td>
                      {d.title} {d.isTest && <span className="pill">Prueba</span>}
                    </td>
                    <td>{d.chars.toLocaleString("es-CO")} caracteres</td>
                    <td>{d.createdAt}</td>
                    <td>
                      <input type="checkbox" checked={d.active} disabled={pending} onChange={(e) => run(() => setDocumentActive(d.id, e.target.checked))} />
                    </td>
                    <td>
                      <button
                        className="link-danger"
                        disabled={pending}
                        onClick={() => {
                          if (confirm(`¿Borrar “${d.title}”?`)) run(() => deleteDocument(d.id), "Documento borrado.");
                        }}
                      >
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
                {!props.docs.length && (
                  <tr>
                    <td colSpan={5} className="muted">
                      Aún no hay documentos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel full">
          <h2>Telegram (pruebas)</h2>
          <p className="muted small">
            El mismo asistente, con los mismos documentos, en un bot de Telegram. Necesita TELEGRAM_BOT_TOKEN y TELEGRAM_WEBHOOK_SECRET
            en Vercel.
          </p>
          <button className="btn-secondary" disabled={pending || !props.telegramConfigured} onClick={() => run(connectTelegram)}>
            {props.telegramConfigured ? "Conectar bot de Telegram" : "Faltan las variables de Telegram en Vercel"}
          </button>
        </section>
      </div>
      {note && <p className={note.ok ? "mail-ok" : "err-text"}>{note.text}</p>}
    </div>
  );
}
