"use server";
import { isEngineVariant } from "@/features/engine3d/variants";
import { brandVersions, isBrand } from "@/features/brand/brands";
import { updateTag } from "next/cache";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateAnalytics, type AnalyticsIds } from "@/features/analytics/ids";

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
export async function saveAnalytics(input: Partial<Record<keyof AnalyticsIds, string>>): Promise<SaveResult> {
  const session = await getSession();
  if (!session || !session.role.isInternal || !can(session, "empresa.editar")) {
    return { ok: false, error: "No tienes permiso para cambiar la medición." };
  }
  const v = validateAnalytics(input);
  if (!v.ok) return v;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("company_settings").update({ analytics: v.value }).eq("id", true);
  if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` };
  updateTag("company");
  return { ok: true };
}

export type TrustInput = {
  legalName: string;
  nit: string;
  legalAddress: string;
  foundedYear: string;
  vat: "si" | "no" | "";
  equipos: string;
  clientes: string;
  municipios: string;
};

async function editor() {
  const session = await getSession();
  if (!session || !session.role.isInternal || !can(session, "empresa.editar")) return null;
  return await createSupabaseServerClient();
}

/** Razón social, NIT, dirección legal, año de fundación, IVA y cifras. Vacío = no se muestra. */
export async function saveTrust(input: TrustInput): Promise<SaveResult> {
  const supabase = await editor();
  if (!supabase) return { ok: false, error: "No tienes permiso para editar los datos de la empresa." };
  const nit = input.nit.replace(/[^\d-]/g, "");
  if (nit && !/^\d{6,12}(-\d)?$/.test(nit)) return { ok: false, error: "El NIT debe verse como 900123456-7." };
  const year = input.foundedYear.trim() ? Number(input.foundedYear) : null;
  if (year !== null && (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear())) {
    return { ok: false, error: "Revisa el año de fundación." };
  }
  const stats: Record<string, number> = {};
  for (const k of ["equipos", "clientes", "municipios"] as const) {
    const v = input[k].replace(/\D/g, "");
    if (v) stats[k] = Math.min(1_000_000, Number(v));
  }
  const { error } = await supabase
    .from("company_settings")
    .update({
      legal_name: input.legalName.trim().slice(0, 120) || null,
      nit: nit || null,
      legal_address: input.legalAddress.trim().slice(0, 160) || null,
      founded_year: year,
      prices_include_vat: input.vat === "si" ? true : input.vat === "no" ? false : null,
      stats,
    })
    .eq("id", true);
  if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` };
  updateTag("company");
  return { ok: true };
}

export type TestimonialInput = { id: string | null; name: string; place: string; product: string; quote: string; consent: boolean; active: boolean };

/** Testimonio real; solo se publica si el cliente dio permiso (consent). */
export async function saveTestimonial(t: TestimonialInput): Promise<SaveResult> {
  const supabase = await editor();
  if (!supabase) return { ok: false, error: "No tienes permiso." };
  const row = {
    name: t.name.trim().slice(0, 80),
    place: t.place.trim().slice(0, 100) || null,
    product: t.product.trim().slice(0, 80) || null,
    quote: t.quote.trim().slice(0, 600),
    consent: t.consent,
    active: t.active,
  };
  if (row.name.length < 2) return { ok: false, error: "Escribe el nombre del cliente." };
  if (row.quote.length < 10) return { ok: false, error: "El testimonio es muy corto." };
  const { error } = t.id ? await supabase.from("testimonials").update(row).eq("id", t.id) : await supabase.from("testimonials").insert(row);
  if (error) return { ok: false, error: error.message };
  updateTag("company");
  return { ok: true };
}

export async function deleteTestimonial(id: string): Promise<SaveResult> {
  const supabase = await editor();
  if (!supabase) return { ok: false, error: "No tienes permiso." };
  const { error } = await supabase.from("testimonials").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  updateTag("company");
  return { ok: true };
}

/**
 * Motor 3D del inicio: elegir la versión visible, descartar (ocultar) o restaurar versiones.
 * La versión activa no se puede descartar; siempre queda al menos una disponible.
 */
export async function setEngineVariant(
  action: "use" | "hide" | "restore",
  key: string,
): Promise<SaveResult> {
  const session = await getSession();
  if (!session || !session.role.isInternal || !can(session, "empresa.editar")) {
    return { ok: false, error: "No tienes permiso para cambiar el motor 3D." };
  }
  if (!isEngineVariant(key)) return { ok: false, error: "Versión desconocida." };
  const supabase = await createSupabaseServerClient();
  const { data, error: e1 } = await supabase.from("company_settings").select("engine_model, engine_models_hidden").maybeSingle();
  if (e1 || !data) return { ok: false, error: `No se pudo leer la configuración: ${e1?.message ?? "sin datos"}` };
  let active = data.engine_model;
  let hidden = new Set(data.engine_models_hidden ?? []);
  if (action === "use") {
    active = key;
    hidden.delete(key);
  } else if (action === "hide") {
    if (key === active) return { ok: false, error: "Esta versión es la que se ve en el sitio. Elige otra antes de eliminarla." };
    hidden.add(key);
  } else {
    hidden.delete(key);
  }
  hidden = new Set([...hidden].filter(isEngineVariant));
  const { error } = await supabase
    .from("company_settings")
    .update({ engine_model: active, engine_models_hidden: [...hidden].sort() })
    .eq("id", true);
  if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` };
  updateTag("company");
  return { ok: true };
}

/**
 * Versión de marca del sitio (textos y paleta): usar, eliminar (ocultar) o restaurar.
 * La que está en el sitio no se puede eliminar, así que siempre queda al menos una.
 */
export async function setBrandVersion(action: "use" | "hide" | "restore", key: string): Promise<SaveResult> {
  const session = await getSession();
  if (!session || !session.role.isInternal || !can(session, "empresa.editar")) {
    return { ok: false, error: "No tienes permiso para cambiar la marca del sitio." };
  }
  if (!isBrand(key)) return { ok: false, error: "Versión desconocida." };
  const supabase = await createSupabaseServerClient();
  const { data, error: e1 } = await supabase.from("company_settings").select("brand, brands_hidden").maybeSingle();
  if (e1 || !data) return { ok: false, error: `No se pudo leer la configuración: ${e1?.message ?? "sin datos"}` };
  let active = data.brand;
  const hidden = new Set((data.brands_hidden ?? []).filter(isBrand));
  if (action === "use") {
    active = key;
    hidden.delete(key);
  } else if (action === "hide") {
    if (key === active) return { ok: false, error: "Es la versión que se ve en el sitio. Elige otra antes de eliminarla." };
    const visible = brandVersions.filter((b) => !hidden.has(b.key)).length;
    if (visible <= 1) return { ok: false, error: "Debe quedar al menos una versión." };
    hidden.add(key);
  } else {
    hidden.delete(key);
  }
  const { error } = await supabase
    .from("company_settings")
    .update({ brand: active, brands_hidden: [...hidden].sort() })
    .eq("id", true);
  if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` };
  updateTag("company");
  return { ok: true };
}
