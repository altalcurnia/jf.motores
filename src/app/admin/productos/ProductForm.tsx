"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { storageUrl, type CatalogType, type ProductStatus } from "@/features/catalog/shared";
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
const MAX_IMAGE_SIDE = 2000;

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
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [models, setModels] = useState(options.engineModels);
  const [newModel, setNewModel] = useState({ brand: "", model: "" });
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
    if (file.size > 80 * 1024 * 1024) return setMsg({ ok: false, text: "El archivo pesa más de 80 MB. Redúcelo antes de subirlo." });
    setBusy("glb");
    setMsg(null);
    let body: Blob = file;
    let note = "";
    if (isStl) {
      try {
        const { stlToGlb } = await import("@/features/catalog/stl-to-glb");
        const { glb, triangles } = await stlToGlb(await file.arrayBuffer());
        body = new Blob([glb], { type: "model/gltf-binary" });
        note = ` Convertido de STL (${triangles.toLocaleString("es-CO")} triángulos, ${(body.size / 1048576).toFixed(1)} MB).`;
      } catch (err) {
        setBusy(null);
        return setMsg({ ok: false, text: `No se pudo leer el STL: ${err instanceof Error ? err.message : "archivo dañado"}` });
      }
    }
    if (body.size > 15 * 1024 * 1024) {
      setBusy(null);
      return setMsg({ ok: false, text: "El modelo pesa más de 15 MB. Simplifícalo (menos triángulos) antes de subirlo." });
    }
    const path = `modelos/${crypto.randomUUID()}.glb`;
    const { error } = await createSupabaseBrowserClient().storage.from("catalogo").upload(path, body, { contentType: "model/gltf-binary", cacheControl: "31536000" });
    setBusy(null);
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
          <label>
            <span>
              Nombre {lang === "es" && <span className="req">obligatorio</span>}
            </span>
            <input required={lang === "es"} value={v.name[lang]} onChange={(e) => setText("name", e.target.value)} maxLength={140} placeholder={lang === "es" ? "Motobomba JF-M25" : v.name.es} />
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
                <option value="disponible">Disponible</option>
                <option value="vendido">Vendido</option>
              </select>
            </label>
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
          <datalist id="spec-keys">
            {SPEC_KEYS[v.catalog].map(([k, label]) => (
              <option key={k} value={k} label={label} />
            ))}
          </datalist>
          <div className="specs">
            {v.specs.map((s, i) => (
              <div className="spec-row" key={i}>
                <input list="spec-keys" placeholder="Dato (ej. hp)" value={s.key} onChange={(e) => set("specs", v.specs.map((x, n) => (n === i ? { ...x, key: e.target.value } : x)))} />
                <input placeholder={SPEC_KEYS[v.catalog].find(([k]) => k === s.key)?.[1] ?? "Valor"} value={s.value} onChange={(e) => set("specs", v.specs.map((x, n) => (n === i ? { ...x, value: e.target.value } : x)))} />
                <button type="button" className="link-danger" onClick={() => set("specs", v.specs.filter((_, n) => n !== i))} aria-label="Quitar">
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn-ghost" onClick={() => set("specs", [...v.specs, { key: "", value: "" }])}>
            + Agregar dato
          </button>
          <p className="hint">Escribe solo el número (sin unidades): el sitio agrega HP, L/min, m… y traduce el nombre del dato.</p>
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
              {busy === "glb" ? "Procesando…" : "+ Subir modelo 3D (.glb o .stl)"}
            </label>
          )}
          <p className="hint">
            Opcional. GLB (con colores y texturas) o STL (de CAD o impresión 3D; se convierte solo y se muestra en gris metálico).
            Máximo 15 MB ya convertido. En la ficha aparece el botón “Ver en 3D”.
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

