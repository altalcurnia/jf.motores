"use client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export const MAX_TICKET_IMAGES = 4;
const MAX_SIDE = 1600;

/** Reduce la foto (lado mayor 1600 px, JPEG) para que suba rápido incluso con datos móviles. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Sube las fotos a la carpeta del usuario en el bucket privado «tickets». Devuelve las rutas. */
export async function uploadTicketImages(files: File[]): Promise<{ paths: string[]; error?: string }> {
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { paths: [], error: "login" };
  const paths: string[] = [];
  for (const file of files.slice(0, MAX_TICKET_IMAGES)) {
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) && !/\.(jpe?g|png|webp|heic)$/i.test(file.name)) continue;
    const blob = await shrink(file);
    const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
    const path = `${data.user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("tickets").upload(path, blob, { contentType: blob.type || "image/jpeg" });
    if (error) return { paths, error: error.message };
    paths.push(path);
  }
  return { paths };
}

/** Enlaces temporales (1 hora) para mostrar fotos del bucket privado. */
export async function signedTicketUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await createSupabaseBrowserClient().storage.from("tickets").createSignedUrls(paths, 3600);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}
