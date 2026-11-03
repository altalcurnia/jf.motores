"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { storageUrl, type CatalogType, type ProductStatus } from "@/features/catalog/shared";
import { generateDescriptionWithAi, translateFieldsWithAi } from "../ai-copy";
import { createEngineModel, deleteProduct, saveProduct, type ProductInput } from "./actions";
import { SPEC_KEYS, slugify, type FormOptions, type Lang, type ProductFormValue } from "./form-model";

export type { FormOptions, ProductFormValue } from "./form-model";

const LANGS: { key: Lang; label: string }[] = [
  { key: "es", label: "Español" },
  { key: "en", label: "Inglés" },
  { key: "pt", label: "Portugués" },
];
const CATALOGS: { key: CatalogType; label: string }[] = [
  { key: "motobomba", label: "Motobomba" },
  { key: "motor", label: "Motor" },
  { key: "repuesto", label: "Repuesto" },
];
const WARRANTY_PRESETS: { value: number | null; label: string }[] = [
  { value: null, label: "Sin garantía" },
  { value: 3, label: "3 meses" },
  { value: 6, label: "6 meses" },
  { value: 12, label: "12 meses (1 año)" },
  { value: 18, label: "18 meses" },
  { value: 24, label: "24 meses (2 años)" },
];
const SPEC_VALUE_PRESETS: Record<string, string[]> = {
  arranque: ["Eléctrico 12V", "Eléctrico 24V", "Eléctrico y manual", "Manual"],
  aspiracion: ["Turboalimentado", "Natural"],
  refrigeracion: ["Agua (radiador)", "Aire"],
  material: ["Hierro fundido", "Acero forjado", "Aluminio", "Bronce"],
  succion_in: ["2", "3", "4", "6", "8"],
  descarga_in: ["2", "3", "4", "6"],
  cilindros: ["1", "2", "3", "4", "6"],
  voltaje_v: ["12", "24"],
};
const PRODUCT_FACT_CHIPS = [
  "Minería de aluvión",
  "Minería a tajo abierto",
  "Riego agrícola",
  "Bombeo de alto caudal",
  "Alta presión / cabeza",
  "Construcción y drenaje",
  "Repuesto original verificado",
  "Incluye chasis y tablero",
] as const;

const MAX_IMAGE_SIDE = 2000;
/** Modelo 3D: tamaño máximo del archivo original y del ya comprimido */
const MAX_3D_INPUT = 300 * 1024 * 1024;
const MAX_3D = 15 * 1024 * 1024;
const mb = (n: number) => `${(n / 1048576).toFixed(1)} MB`;

/** Reduce fotos grandes del celular (máx. 2000 px, JPG) antes de subirlas. */
async function shrink(file: File): Promise<Blob> {
  if (file.size < 600_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export function ProductForm({ initial, options, supabaseUrl, canEdit }: { initial: ProductFormValue; options: FormOptions; supabaseUrl: string; canEdit: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [lang, setLang] = useState<Lang>("es");
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [models, setModels] = useState(options.engineModels);
  const [newModel, setNewModel] = useState({ brand: "", model: "" });
  const [aiQuestions, setAiQuestions] = useState<{ hint: string; questions: string[] } | null>(null);
  const [selectedFacts, setSelectedFacts] = useState<string[]>([]);
  const [extraFacts, setExtraFacts] = useState("");

  const set = <K extends keyof ProductFormValue>(k: K, value: ProductFormValue[K]) => setV((p) => ({ ...p, [k]: value }));
  const setText = (field: "name" | "summary" | "description", value: string) =>
    setV((p) => {
      const next = { ...p, [field]: { ...p[field], [lang]: value } };
      if (field === "name" && lang === "es" && !slugTouched) next.slug = slugify(value);
      return next;
    });

  const categories = options.categories.filter((c) => c.catalog === v.catalog);
  const isPart = v.catalog === "repuesto";

  function changeCatalog(catalog: CatalogType) {
    setV((p) => {
      const emptySpecs = p.specs.every((s) => !s.value);
      return {
        ...p,
        catalog,
        categoryId: options.categories.find((c) => c.catalog === catalog)?.id ?? null,
        specs: emptySpecs ? SPEC_KEYS[catalog].slice(0, 5).map(([key]) => ({ key, value: "" })) : p.specs,
      };
    });
  }

  async function handleTranslateWithAi() {
    if (!v.name.es.trim() && !v.summary.es.trim() && !v.description.es.trim()) {
      return setMsg({ ok: false, error: "" } as never), setMsg({ ok: false, text: "Escribe primero el texto en español antes de traducir." });
    }
    setBusy("ai-translate");
    setMsg(null);
    const r = await translateFieldsWithAi(
      {
        name: v.name.es,
        summary: v.summary.es,
        description: v.description.es,
      },
      `Producto ${v.catalog} (${v.ref || v.name.es}) de JF Motores`,
    );
    setBusy(null);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setV((p) => ({
      ...p,
      name: { ...p.name, en: r.en.name || p.name.en, pt: r.pt.name || p.name.pt },
      summary: { ...p.summary, en: r.en.summary || p.summary.en, pt: r.pt.summary || p.summary.pt },
      description: { ...p.description, en: r.en.description || p.description.en, pt: r.pt.description || p.description.pt },
    }));
    setMsg({ ok: true, text: "Nombre, resumen y descripción traducidos a inglés y portugués con IA." });
  }

  async function handleGenerateWithAi(confirmedFacts = false) {
    setBusy("ai-generate");
    setMsg(null);
    const catLabel = categories.find((c) => c.id === v.categoryId)?.label;
    const engLabel = models.find((m) => m.id === v.engineModelId)?.label;
    const compatLabels = [
      ...v.compatModels.map((id) => models.find((m) => m.id === id)?.label ?? ""),
      ...v.compatProducts.map((id) => options.equipment.find((e) => e.id === id)?.label ?? ""),
    ].filter(Boolean);
    const specEntries = v.specs
      .filter((s) => s.key.trim() && s.value.trim())
      .map((s) => ({
        key: s.key,
        label: SPEC_KEYS[v.catalog].find(([k]) => k === s.key)?.[1] ?? s.key,
        value: s.value,
      }));
    const combinedFacts = [
      selectedFacts.length ? `Usos/características reales confirmados: ${selectedFacts.join(", ")}` : "",
      extraFacts.trim(),
    ]
      .filter(Boolean)
      .join(". ");

    const r = await generateDescriptionWithAi({
      kind: "producto",
      catalog: v.catalog,
      ref: v.ref,
      nameEs: v.name.es,
      categoryLabel: catLabel,
      engineModelLabel: engLabel,
      compatLabels,
      specs: specEntries,
      warrantyMonths: v.warrantyMonths,
      currentSummaryEs: confirmedFacts ? "" : v.summary.es,
      currentDescEs: confirmedFacts ? "" : v.description.es,
      extraFacts: combinedFacts,
    });
    setBusy(null);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    if (r.needsInfo) {
      setAiQuestions({ hint: r.missingHint, questions: r.questions });
      return;
    }
    setAiQuestions(null);
    setV((p) => ({
      ...p,
      summary: {
        es: r.summaryEs || p.summary.es,
        en: r.summaryEn || p.summary.en,
        pt: r.summaryPt || p.summary.pt,
      },
      description: {
        es: r.es,
        en: r.en || p.description.en,
        pt: r.pt || p.description.pt,
      },
    }));
    setMsg({
      ok: true,
      text: "Descripción y resumen generados en español, inglés y portugués usando solo datos reales verificados.",
    });
  }

  async function uploadImages(files: FileList | null) {
    if (!files?.length) return;
    setBusy("images");
    setMsg(null);
    const supabase = createSupabaseBrowserClient();
    const added: ProductInput["images"] = [];
    for (const file of Array.from(files)) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        setMsg({ ok: false, text: `"${file.name}" no es JPG, PNG ni WEBP.` });
        continue;
      }
      const blob = await shrink(file);
      const ext = blob.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
      const path = `productos/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("catalogo").upload(path, blob, { contentType: blob.type || file.type, cacheControl: "31536000" });
      if (error) {
        setMsg({ ok: false, text: `No se pudo subir "${file.name}": ${error.message}` });
        continue;
      }
      added.push({ path, isReference: false });
    }
    setV((p) => ({ ...p, images: [...p.images, ...added] }));
    setBusy(null);
  }

  async function upload3d(file: File | undefined) {
    if (!file) return;
    const name = file.name.toLowerCase();
    const isStl = name.endsWith(".stl");
    if (!isStl && !name.endsWith(".glb")) return setMsg({ ok: false, text: "El modelo 3D debe ser un archivo .glb o .stl" });
    if (file.size > MAX_3D_INPUT) return setMsg({ ok: false, text: "El archivo pesa más de 300 MB. Redúcelo antes de subirlo." });
    setBusy("glb");
    setMsg(null);
    let source: ArrayBuffer = await file.arrayBuffer();
    let note = "";
    if (isStl) {
      try {
        setProgress("Convirtiendo el STL…");
        const { stlToGlb } = await import("@/features/catalog/stl-to-glb");
        const { glb, triangles } = await stlToGlb(source);
        source = glb;
        note = ` Convertido de STL (${triangles.toLocaleString("es-CO")} triángulos).`;
      } catch (err) {
        setBusy(null);
        setProgress(null);
        return setMsg({ ok: false, text: `No se pudo leer el STL: ${err instanceof Error ? err.message : "archivo dañado"}` });
      }
    }
    let body: Blob = new Blob([source], { type: "model/gltf-binary" });
    try {
      const { compressGlb } = await import("@/features/catalog/compress-glb");
      const r = await compressGlb(source, { maxBytes: MAX_3D, onStep: setProgress });
      if (r.after < body.size) {
        body = new Blob([r.glb as BlobPart], { type: "model/gltf-binary" });
        note += ` Comprimido de ${mb(r.before)} a ${mb(r.after)}${r.textures ? ` (${r.textures} textura${r.textures === 1 ? "" : "s"} en WebP)` : ""}.`;
      }
    } catch (err) {
      console.error("Compresión del modelo 3D:", err);
      if (body.size > MAX_3D) {
        setBusy(null);
        setProgress(null);
        return setMsg({ ok: false, text: `No se pudo comprimir el modelo: ${err instanceof Error ? err.message : "formato no compatible"}` });
      }
    }
    if (body.size > MAX_3D) {
      setBusy(null);
      setProgress(null);
      return setMsg({ ok: false, text: `Aun comprimido pesa ${mb(body.size)} (máximo ${mb(MAX_3D)}). Simplifica la malla en tu programa 3D y vuelve a subirlo.` });
    }
    setProgress("Subiendo…");
    const path = `modelos/${crypto.randomUUID()}.glb`;
    const { error } = await createSupabaseBrowserClient().storage.from("catalogo").upload(path, body, { contentType: "model/gltf-binary", cacheControl: "31536000" });
    setBusy(null);
    setProgress(null);
    if (error) return setMsg({ ok: false, text: `No se pudo subir el modelo 3D: ${error.message}` });
    set("glbPath", path);
    setMsg({ ok: true, text: `Modelo 3D listo.${note} Guarda el producto para publicarlo.` });
  }

  async function uploadManual(file: File | undefined) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return setMsg({ ok: false, text: "La guía debe ser un PDF." });
    if (file.size > 30 * 1024 * 1024) return setMsg({ ok: false, text: "El PDF pesa más de 30 MB. Comprímelo antes de subirlo." });
    setBusy("manual");
    setMsg(null);
    const path = `guias/${crypto.randomUUID()}.pdf`;
    const { error } = await createSupabaseBrowserClient().storage.from("manuales").upload(path, file, { contentType: "application/pdf" });
    setBusy(null);
    if (error) return setMsg({ ok: false, text: `No se pudo subir la guía: ${error.message}` });
    set("manualPath", path);
    setMsg({ ok: true, text: `Guía "${file.name}" lista. Guarda el producto para aplicarla.` });
  }

  function moveImage(i: number, dir: -1 | 1) {
    setV((p) => {
      const imgs = [...p.images];
      const j = i + dir;
      if (j < 0 || j >= imgs.length) return p;
      [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
      return { ...p, images: imgs };
    });
  }

  async function addModel() {
    setBusy("model");
    const res = await createEngineModel(newModel.brand, newModel.model);
    setBusy(null);
    if (!res.ok) return setMsg({ ok: false, text: res.error });
    const opt = { id: res.id!, label: `${newModel.brand.trim()} ${newModel.model.trim()}` };
    setModels((m) => [...m, opt]);
    if (isPart) set("compatModels", [...v.compatModels, opt.id]);
    else set("engineModelId", opt.id);
    setNewModel({ brand: "", model: "" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy("save");
    setMsg(null);
    const { isDemo: _demo, ...input } = v;
    void _demo;
    const res = await saveProduct(input);
    setBusy(null);
    if (!res.ok && res.error === "needs_sale") {
      setMsg({
        ok: false,
        text: v.id
          ? "Para marcarlo como Vendido registra la venta a la cuenta del cliente (Panel → Ventas). Así queda en tu base de clientes y el cliente ve su equipo y su guía."
          : "Crea el producto como Disponible y luego registra la venta en Panel → Ventas.",
      });
      return;
    }
    if (!res.ok) return setMsg({ ok: false, text: res.error });
    setMsg({ ok: true, text: v.status === "borrador" ? "Guardado como borrador (no se ve en el sitio)." : "Guardado. Ya se ve en el sitio." });
    if (!v.id && res.id) router.replace(`/admin/productos/${res.id}?nuevo=1`);
    else router.refresh();
  }

  async function onDelete() {
    if (!v.id || !confirm(`¿Borrar "${v.name.es || v.ref}"? Se borran también sus fotos. No se puede deshacer.`)) return;
    setBusy("delete");
    const res = await deleteProduct(v.id);
    setBusy(null);
    if (!res.ok) return setMsg({ ok: false, text: res.error });
    router.replace("/admin/productos");
  }

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  return (
    <form className="pform" onSubmit={onSubmit}>
      {v.isDemo && <div className="notice">Este es un producto de <b>ejemplo</b>. Si lo guardas, pasa a ser real y no se borra con “Borrar datos de ejemplo”.</div>}
      <fieldset disabled={!canEdit} className="pform-grid">
        <section className="panel">
          <h2>Tipo y referencia</h2>
          <div className="seg wide">
            {CATALOGS.map((c) => (
              <button type="button" key={c.key} className={v.catalog === c.key ? "on" : ""} onClick={() => changeCatalog(c.key)}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="row2">
            <label>
              Referencia
              <input required value={v.ref} onChange={(e) => set("ref", e.target.value.toUpperCase())} placeholder="JF-M25" maxLength={40} />
            </label>
            <label>
              Categoría
              <select value={v.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value || null)}>
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Textos</h2>
            <div className="seg">
              {LANGS.map((l) => (
                <button type="button" key={l.key} className={lang === l.key ? "on" : ""} onClick={() => setLang(l.key)}>
                  {l.label}
                  {!v.name[l.key] && l.key !== "es" && <span className="dot" title="Falta traducir" />}
                </button>
              ))}
            </div>
          </div>

          <div className="ai-toolbar">
            <div>
              <strong>Asistente de redacción y traducción (DeepSeek)</strong>
              <small className="muted block">
                Usa solo especificaciones y datos reales verificables. Si faltan datos, pregunta antes de generar.
              </small>
            </div>
            <div className="ai-toolbar-actions">
              <button
                type="button"
                className="btn-secondary ai-btn"
                disabled={!!busy}
                onClick={() => handleGenerateWithAi(false)}
              >
                {busy === "ai-generate" ? "Consultando IA…" : "✨ Generar descripción con IA"}
              </button>
              <button
                type="button"
                className="btn-secondary ai-btn"
                disabled={!!busy || (!v.name.es.trim() && !v.summary.es.trim() && !v.description.es.trim())}
                onClick={handleTranslateWithAi}
              >
                {busy === "ai-translate" ? "Traduciendo…" : "🌐 Traducir a Inglés y Portugués con IA"}
              </button>
            </div>
          </div>

          {aiQuestions && (
            <div className="ai-prompt-box">
              <b>⚠️ Para no inventar datos técnicos, confirma la información real del producto:</b>
              <p className="muted small">{aiQuestions.hint}</p>
              <ul className="ai-questions-list">
                {aiQuestions.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
              <div className="field">
                <span className="field-label">Marca con 1 clic las aplicaciones o características reales que aplican:</span>
                <div className="chips">
                  {PRODUCT_FACT_CHIPS.map((fc) => {
                    const on = selectedFacts.includes(fc);
                    return (
                      <button
                        key={fc}
                        type="button"
                        className={`chip ${on ? "on" : ""}`}
                        onClick={() =>
                          setSelectedFacts(on ? selectedFacts.filter((x) => x !== fc) : [...selectedFacts, fc])
                        }
                      >
                        {fc}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label>
                <span>Datos técnicos o comerciales reales adicionales (opcional)</span>
                <input
                  value={extraFacts}
                  placeholder="Ej.: Motor 4 cilindros 85 HP, bomba 6×4 pulgadas, acoplado en chasis reforzado"
                  onChange={(e) => setExtraFacts(e.target.value)}
                />
              </label>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!!busy || (!selectedFacts.length && !extraFacts.trim())}
                  onClick={() => handleGenerateWithAi(true)}
                >
                  {busy === "ai-generate" ? "Generando…" : "Confirmar datos reales y redactar en los 3 idiomas"}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setAiQuestions(null)}>
                  Cerrar
                </button>
              </div>
            </div>
          )}

          <label>
            <span>
              Nombre {lang === "es" && <span className="req">obligatorio</span>}
            </span>
            <input required={lang === "es"} value={v.name[lang]} onChange={(e) => setText("name", e.target.value)} maxLength={140} placeholder={lang === "es" ? "Motobomba JF Jaguar 25" : v.name.es} />
          </label>
          <label>
            <span>
              Resumen corto <span className="hint">(aparece en la tarjeta)</span>
            </span>
            <input value={v.summary[lang]} onChange={(e) => setText("summary", e.target.value)} maxLength={140} placeholder={lang === "es" ? "Minera · tajo abierto" : v.summary.es} />
          </label>
          <label>
            Descripción
            <textarea rows={5} value={v.description[lang]} onChange={(e) => setText("description", e.target.value)} maxLength={4000} placeholder={lang === "es" ? "" : v.description.es} />
          </label>
          {lang !== "es" && <p className="hint">Si dejas un idioma vacío, el sitio muestra el texto en español.</p>}
          <label>
            Dirección en el sitio
            <div className="slug">
              <span>/{v.catalog === "motobomba" ? "motobombas" : v.catalog === "motor" ? "motores" : "repuestos"}/</span>
              <input
                required
                value={v.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value));
                }}
              />
            </div>
          </label>
        </section>

        <section className="panel">
          <h2>Precio y estado</h2>
          <div className="row2">
            <label>
              Precio en pesos (COP)
              <input
                inputMode="numeric"
                value={v.priceCop == null ? "" : v.priceCop.toLocaleString("es-CO")}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  set("priceCop", digits ? Number(digits) : null);
                }}
                placeholder="Vacío = Consultar precio"
              />
            </label>
            <label>
              Estado
              <select value={v.status} onChange={(e) => set("status", e.target.value as ProductStatus)}>
                <option value="borrador">Borrador (oculto)</option>
                <option value="disponible">{v.catalog === "repuesto" ? "En stock" : "Disponible"}</option>
                <option value="vendido">{v.catalog === "repuesto" ? "Sin stock" : "Vendido"}</option>
              </select>
            </label>
          </div>
          <div className="field">
            <span className="field-label">
              Garantía <span className="hint">(elige con 1 clic; se propone al registrar cada venta)</span>
            </span>
            <div className="chips">
              {WARRANTY_PRESETS.map((w) => (
                <button
                  key={String(w.value)}
                  type="button"
                  className={`chip ${v.warrantyMonths === w.value ? "on" : ""}`}
                  onClick={() => set("warrantyMonths", w.value)}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
          <label className="check">
            <input type="checkbox" checked={v.featured} onChange={(e) => set("featured", e.target.checked)} />
            <span>
              Destacado en el inicio <span className="hint">(aparece en la sección “Destacados” de la página principal si está disponible)</span>
            </span>
          </label>
          <p className="hint">
            {v.publishedAt
              ? `Publicado el ${new Date(v.publishedAt).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })}.`
              : "La fecha de publicación se pone sola la primera vez que lo marcas como Disponible o Vendido."}
          </p>
          <p className="hint">Los precios se muestran como “solo el artículo, sin envío ni costos de importación”.</p>
        </section>

        <section className="panel">
          <h2>Fotos</h2>
          <div className="imgs">
            {v.images.map((img, i) => (
              <figure key={img.path} className="img-item">
                {/* eslint-disable-next-line @next/next/no-img-element -- vista previa del panel */}
                <img src={storageUrl(img.path, supabaseUrl)} alt="" />
                {i === 0 && <span className="pill ok cover">Principal</span>}
                <figcaption>
                  <label className="check small">
                    <input
                      type="checkbox"
                      checked={img.isReference}
                      onChange={(e) => set("images", v.images.map((x, n) => (n === i ? { ...x, isReference: e.target.checked } : x)))}
                    />
                    Imagen de referencia
                  </label>
                  <div className="img-actions">
                    <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label="Mover antes">
                      ←
                    </button>
                    <button type="button" onClick={() => moveImage(i, 1)} disabled={i === v.images.length - 1} aria-label="Mover después">
                      →
                    </button>
                    <button type="button" className="link-danger" onClick={() => set("images", v.images.filter((_, n) => n !== i))}>
                      Quitar
                    </button>
                  </div>
                </figcaption>
              </figure>
            ))}
            <label className="img-add">
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => (uploadImages(e.target.files), (e.target.value = ""))} />
              {busy === "images" ? "Subiendo…" : "+ Agregar fotos"}
            </label>
          </div>
          <p className="hint">La primera foto es la principal. Marca “Imagen de referencia” cuando la foto no sea del equipo exacto.</p>
        </section>

        <section className="panel">
          <h2>Especificaciones</h2>
          <div className="chips">
            {SPEC_KEYS[v.catalog].map(([k, label]) => {
              const already = v.specs.some((s) => s.key === k);
              return (
                <button
                  key={k}
                  type="button"
                  className={`chip ${already ? "on" : ""}`}
                  onClick={() => {
                    if (already) return;
                    set("specs", [...v.specs, { key: k, value: "" }]);
                  }}
                >
                  + {label}
                </button>
              );
            })}
          </div>
          <div className="specs">
            {v.specs.map((s, i) => {
              const presets = SPEC_VALUE_PRESETS[s.key];
              return (
                <div className="spec-item-wrap" key={i}>
                  <div className="spec-row">
                    <select
                      value={s.key}
                      onChange={(e) => set("specs", v.specs.map((x, n) => (n === i ? { ...x, key: e.target.value } : x)))}
                    >
                      <option value="">Elige el dato…</option>
                      {!SPEC_KEYS[v.catalog].some(([k]) => k === s.key) && s.key && (
                        <option value={s.key}>{s.key}</option>
                      )}
                      {SPEC_KEYS[v.catalog].map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder={SPEC_KEYS[v.catalog].find(([k]) => k === s.key)?.[1] ?? "Valor"}
                      value={s.value}
                      onChange={(e) => set("specs", v.specs.map((x, n) => (n === i ? { ...x, value: e.target.value } : x)))}
                    />
                    <button type="button" className="link-danger" onClick={() => set("specs", v.specs.filter((_, n) => n !== i))} aria-label="Quitar">
                      ✕
                    </button>
                  </div>
                  {presets && (
                    <div className="spec-presets">
                      {presets.map((val) => (
                        <button
                          key={val}
                          type="button"
                          className={`chip-btn${s.value === val ? " on" : ""}`}
                          onClick={() => set("specs", v.specs.map((x, n) => (n === i ? { ...x, value: val } : x)))}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button type="button" className="btn-ghost" onClick={() => set("specs", [...v.specs, { key: "", value: "" }])}>
            + Agregar fila de dato
          </button>
          <p className="hint">Elige el dato en la lista o toca las opciones rápidas; el sitio agrega unidades (HP, L/min, m…) y traduce el nombre.</p>
        </section>

        <section className="panel">
          <h2>{isPart ? "Compatible con" : "Motor"}</h2>
          {isPart ? (
            <>
              <p className="hint">Motores</p>
              <div className="chips">
                {models.map((m) => (
                  <label key={m.id} className={`chip ${v.compatModels.includes(m.id) ? "on" : ""}`}>
                    <input type="checkbox" hidden checked={v.compatModels.includes(m.id)} onChange={() => set("compatModels", toggle(v.compatModels, m.id))} />
                    {m.label}
                  </label>
                ))}
              </div>
              <p className="hint">Equipos específicos</p>
              <div className="chips">
                {options.equipment.map((m) => (
                  <label key={m.id} className={`chip ${v.compatProducts.includes(m.id) ? "on" : ""}`}>
                    <input type="checkbox" hidden checked={v.compatProducts.includes(m.id)} onChange={() => set("compatProducts", toggle(v.compatProducts, m.id))} />
                    {m.label}
                  </label>
                ))}
              </div>
            </>
          ) : (
            <label>
              <span>
                Modelo de motor <span className="hint">(conecta con sus repuestos compatibles)</span>
              </span>
              <select value={v.engineModelId ?? ""} onChange={(e) => set("engineModelId", e.target.value || null)}>
                <option value="">Sin especificar</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="new-model">
            <input placeholder="Marca" value={newModel.brand} onChange={(e) => setNewModel({ ...newModel, brand: e.target.value })} />
            <input placeholder="Modelo nuevo" value={newModel.model} onChange={(e) => setNewModel({ ...newModel, model: e.target.value })} />
            <button type="button" className="btn-ghost" disabled={busy === "model" || !newModel.brand || !newModel.model} onClick={addModel}>
              + Crear motor
            </button>
          </div>
        </section>

        <section className="panel">
          <h2>Guía de usuario (PDF)</h2>
          {v.manualPath ? (
            <p>
              <a href={v.id ? `/api/manual/${v.id}` : "#"} target="_blank" rel="noopener">
                {v.id ? "Ver guía actual" : v.manualPath.split("/").pop()}
              </a>{" "}
              <button type="button" className="link-danger" onClick={() => set("manualPath", null)}>
                Quitar
              </button>
            </p>
          ) : (
            <label className="img-add wide">
              <input type="file" accept="application/pdf,.pdf" hidden onChange={(e) => (uploadManual(e.target.files?.[0]), (e.target.value = ""))} />
              {busy === "manual" ? "Subiendo…" : "+ Subir guía en PDF"}
            </label>
          )}
          <label className="check">
            <input type="checkbox" checked={v.manualPublic} onChange={(e) => set("manualPublic", e.target.checked)} />
            <span>
              Pública <span className="hint">(cualquiera la descarga desde la ficha; si no, solo quienes compraron este producto)</span>
            </span>
          </label>
          <p className="hint">Quien compra el producto la ve en “Mi cuenta → Tus equipos”. Máximo 30 MB.</p>
        </section>

        <section className="panel">
          <h2>Modelo 3D</h2>
          {v.glbPath ? (
            <p>
              <code>{v.glbPath.split("/").pop()}</code>{" "}
              <button type="button" className="link-danger" onClick={() => set("glbPath", null)}>
                Quitar
              </button>
            </p>
          ) : (
            <label className="img-add wide">
              <input type="file" accept=".glb,.stl,model/gltf-binary,model/stl" hidden onChange={(e) => (upload3d(e.target.files?.[0]), (e.target.value = ""))} />
              {busy === "glb" ? (progress ?? "Procesando…") : "+ Subir modelo 3D (.glb o .stl)"}
            </label>
          )}
          <p className="hint">
            Opcional. GLB (con colores y texturas) o STL (de CAD o impresión 3D; se convierte solo y se muestra en gris metálico).
            Se comprime solo al subirlo: texturas a WebP y geometría comprimida. Acepta archivos de hasta 300 MB y deben quedar en
            15 MB o menos. En la ficha aparece el botón “Ver en 3D”.
          </p>
        </section>
      </fieldset>

      <div className="savebar">
        {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
        <div className="savebar-actions">
          <Link href="/admin/productos" className="btn-ghost">
            Volver
          </Link>
          {v.id && canEdit && (
            <button type="button" className="btn-danger" onClick={onDelete} disabled={!!busy}>
              Borrar
            </button>
          )}
          {canEdit && (
            <button className="btn-primary" disabled={!!busy}>
              {busy === "save" ? "Guardando…" : "Guardar"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
