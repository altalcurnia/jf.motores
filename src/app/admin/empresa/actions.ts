"use server";
import { updateTag } from "next/cache";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PhoneInput = { label: string; number: string; whatsapp: boolean };
export type BranchInput = { id: string | null; name: string; city: string; address: string; phone: string; active: boolean };
export type ContactInput = { email: string; phones: PhoneInput[]; branches: BranchInput[]; removedBranches: string[] };
export type SaveResult = { ok: true } | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Guarda líneas, correo y sedes. La base de datos vuelve a validar el permiso (RLS). */
export async function saveContact(input: ContactInput): Promise<SaveResult> {
  const session = await getSession();
  if (!session || !session.role.isInternal || !can(session, "empresa.editar")) {
    return { ok: false, error: "No tienes permiso para editar los datos de contacto." };
  }
  const email = input.email.trim().toLowerCase();
  if (email && !EMAIL.test(email)) return { ok: false, error: "El correo no es válido." };

  const phones = input.phones
    .map((p) => ({ label: p.label.trim().slice(0, 60), number: p.number.replace(/\D/g, ""), whatsapp: p.whatsapp }))
    .filter((p) => p.number);
  if (!phones.length) return { ok: false, error: "Agrega al menos una línea directa." };
  const bad = phones.find((p) => p.number.length < 8 || p.number.length > 15);
  if (bad) return { ok: false, error: `El número ${bad.number} no es válido. Escríbelo con indicativo de país, por ejemplo 573001234567.` };
  if (!phones.some((p) => p.whatsapp)) return { ok: false, error: "Marca al menos una línea como WhatsApp." };

  const branches = input.branches.map((b, i) => ({
    id: b.id,
    name: b.name.trim().slice(0, 80),
    city: b.city.trim().slice(0, 80),
    address: b.address.trim().slice(0, 160) || null,
    phone: b.phone.trim().slice(0, 30) || null,
    active: b.active,
    sort: i + 1,
  }));
  const incomplete = branches.find((b) => !b.city);
  if (incomplete) return { ok: false, error: "Cada sede necesita al menos la ciudad." };

  const supabase = await createSupabaseServerClient();
  const { error: e1 } = await supabase.from("company_settings").update({ email: email || null, phones }).eq("id", true);
  if (e1) return { ok: false, error: `No se pudo guardar: ${e1.message}` };

  for (const id of input.removedBranches) {
    const { error } = await supabase.from("branches").delete().eq("id", id);
    if (error) return { ok: false, error: `No se pudo borrar una sede: ${error.message}` };
  }
  for (const b of branches) {
    const row = { name: b.name || `Sede ${b.city}`, city: b.city, address: b.address, phone: b.phone, active: b.active, sort: b.sort };
    const { error } = b.id
      ? await supabase.from("branches").update(row).eq("id", b.id)
      : await supabase.from("branches").insert(row);
    if (error) return { ok: false, error: `No se pudo guardar la sede ${b.city}: ${error.message}` };
  }
  updateTag("company");
  return { ok: true };
}

/** Cambia la imagen de Beneficios del inicio (ya subida a catalogo/sitio/…) o vuelve a la predeterminada (null). */
export async function saveBenefitsImage(path: string | null): Promise<SaveResult> {
  const session = await getSession();
  if (!session || !session.role.isInternal || !can(session, "empresa.editar")) {
    return { ok: false, error: "No tienes permiso para cambiar las imágenes del sitio." };
  }
  if (path !== null && !/^sitio\/[a-z0-9-]+\.(jpg|png|webp)$/.test(path)) return { ok: false, error: "Archivo inválido." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("company_settings").update({ home_benefits_image: path }).eq("id", true);
  if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` };
  updateTag("company");
  return { ok: true };
}

/** IDs de GA4 y del Píxel de Meta (vacíos = desactivados). */
export async function saveAnalytics(input: { ga4: string; pixel: string }): Promise<SaveResult> {
  const session = await getSession();
  if (!session || !session.role.isInternal || !can(session, "empresa.editar")) {
    return { ok: false, error: "No tienes permiso para cambiar la medición." };
  }
  const ga4 = input.ga4.trim().toUpperCase();
  const pixel = input.pixel.replace(/\D/g, "");
  if (ga4 && !/^G-[A-Z0-9]{4,15}$/.test(ga4)) return { ok: false, error: "El ID de GA4 debe verse como G-ABC123XYZ." };
  if (pixel && !/^[0-9]{6,20}$/.test(pixel)) return { ok: false, error: "El ID del Píxel son solo números (6 a 20)." };
  const analytics: Record<string, string> = {};
  if (ga4) analytics.ga4 = ga4;
  if (pixel) analytics.pixel = pixel;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("company_settings").update({ analytics }).eq("id", true);
  if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` };
  updateTag("company");
  return { ok: true };
}
