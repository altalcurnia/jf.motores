"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { saveBenefitsImage } from "./actions";

const MAX_SIDE = 1600;

/** Reduce la foto en el navegador (lado mayor 1600 px) para que el inicio cargue rápido. */
async function prepare(
  file: File,
): Promise<{ blob: Blob; ext: "jpg" | "png" | "webp" }> {
  const keep = {
    blob: file as Blob,
    ext: (file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg") as "jpg" | "png" | "webp",
  };
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 700_000) return keep;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/jpeg", 0.86),
    );
    return blob && blob.size < file.size ? { blob, ext: "jpg" } : keep;
  } catch {
    return keep;
  }
}

/** Imagen de la sección Beneficios del inicio: vista previa, cambiar y volver a la predeterminada. */
export function SiteImages({
  current,
  isDefault,
  canEdit,
}: {
  current: string;
  isDefault: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState(current);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type))
      return setMsg({ ok: false, text: "La imagen debe ser JPG, PNG o WEBP." });
    if (file.size > 25 * 1024 * 1024)
      return setMsg({ ok: false, text: "La imagen pesa más de 25 MB." });
    setBusy(true);
    setMsg(null);
    const { blob, ext } = await prepare(file);
    const path = `sitio/beneficios-${crypto.randomUUID()}.${ext}`;
    const { error } = await createSupabaseBrowserClient()
      .storage.from("catalogo")
      .upload(path, blob, {
        contentType: blob.type || file.type,
        cacheControl: "31536000",
      });
    if (error) {
      setBusy(false);
      return setMsg({ ok: false, text: `No se pudo subir: ${error.message}` });
    }
    const r = await saveBenefitsImage(path);
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setPreview(URL.createObjectURL(blob));
    setMsg({ ok: true, text: "Imagen cambiada. Ya se ve en el inicio." });
    router.refresh();
  }

  async function reset() {
    setBusy(true);
    const r = await saveBenefitsImage(null);
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setMsg({ ok: true, text: "Se volvió a la imagen predeterminada." });
    router.refresh();
  }

  return (
    <section className="panel site-images">
      <h2>Imagen del inicio</h2>
      <p className="muted small">
        Es la imagen grande de la sección de beneficios («Probada antes de
        salir»…). Usa una foto o render horizontal o cuadrado de al menos 1200
        px de ancho; se reduce sola al subirla.
      </p>
      <div className="site-image-row">
        {/* eslint-disable-next-line @next/next/no-img-element -- vista previa de la imagen subida */}
        <img src={preview} alt="Imagen actual de la sección de beneficios" />
        {canEdit ? (
          <div className="site-image-actions">
            <label className={`btn-primary${busy ? " disabled" : ""}`}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                disabled={busy}
                onChange={(e) => (
                  upload(e.target.files?.[0]),
                  (e.target.value = "")
                )}
              />
              {busy ? "Subiendo…" : "Cambiar imagen"}
            </label>
            {!isDefault && (
              <button
                type="button"
                className="btn-ghost"
                disabled={busy}
                onClick={reset}
              >
                Volver a la predeterminada
              </button>
            )}
          </div>
        ) : (
          <p className="muted small">
            Necesitas el permiso «Editar datos de la empresa» para cambiarla.
          </p>
        )}
      </div>
      {msg && (
        <div className={`notice ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>
      )}
    </section>
  );
}
