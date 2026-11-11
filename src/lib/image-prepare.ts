"use client";

const DEFAULT_MAX_SIDE = 1600;

/** Reduce una imagen en el navegador antes de subirla a Supabase Storage para que cargue rápido. */
export async function prepareImage(
  file: File,
  maxSide = DEFAULT_MAX_SIDE,
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
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 700_000) return keep;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.86));
    return blob && blob.size < file.size ? { blob, ext: "jpg" } : keep;
  } catch {
    return keep;
  }
}

