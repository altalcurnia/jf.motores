"use server";
import { updateTag } from "next/cache";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BranchAdminInput = {
  id: string | null;
  name: string;
  city: string;
  address: string;
  phone: string;
  hoursEs: string;
  hoursEn: string;
  hoursPt: string;
  descEs: string;
  descEn: string;
  descPt: string;
  mapQuery: string;
  photos: string[];
  active: boolean;
  sort: number;
};

type SaveResult = { ok: true; id?: string } | { ok: false; error: string };

const PHOTO_PATH = /^sedes\/[a-z0-9-]+\/[a-z0-9-]+\.(jpg|png|webp)$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function editor() {
  const session = await getSession();
  if (!session || !session.role.isInternal || !can(session, "empresa.editar")) return null;
  return await createSupabaseServerClient();
}

function packI18n(es: string, en: string, pt: string) {
  const out: Record<string, string> = {};
  if (es.trim()) out.es = es.trim().slice(0, 600);
  if (en.trim()) out.en = en.trim().slice(0, 600);
  if (pt.trim()) out.pt = pt.trim().slice(0, 600);
  return out;
}

/** Crea o actualiza una sede con horario, descripción, búsqueda de mapa y fotos. */
export async function saveBranch(input: BranchAdminInput): Promise<SaveResult> {
  const supabase = await editor();
  if (!supabase) return { ok: false, error: "No tienes permiso para editar las sedes." };

  const city = input.city.trim().slice(0, 80);
  if (city.length < 2) return { ok: false, error: "Escribe la ciudad de la sede." };
  const name = input.name.trim().slice(0, 80) || `Sede ${city}`;
  const address = input.address.trim().slice(0, 160) || null;
  const phone = input.phone.trim().slice(0, 30) || null;
  const mapQuery = input.mapQuery.trim().slice(0, 300) || null;
  const photos = (input.photos ?? []).filter((p) => PHOTO_PATH.test(p)).slice(0, 24);
  const hours = packI18n(input.hoursEs, input.hoursEn, input.hoursPt);
  const description = packI18n(input.descEs, input.descEn, input.descPt);
  const sort = Math.max(1, Math.min(999, Math.round(input.sort || 1)));

  const row = {
    name,
    city,
    address,
    phone,
    hours,
    description,
    map_query: mapQuery,
    photos,
    active: input.active,
    sort,
  };

  if (input.id && UUID.test(input.id)) {
    const { data: exists } = await supabase.from("branches").select("id").eq("id", input.id).maybeSingle();
    if (exists) {
      const { error } = await supabase.from("branches").update(row).eq("id", input.id);
      if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` };
      updateTag("company");
      return { ok: true, id: input.id };
    }
    const { error } = await supabase.from("branches").insert({ id: input.id, ...row });
    if (error) return { ok: false, error: `No se pudo crear: ${error.message}` };
    updateTag("company");
    return { ok: true, id: input.id };
  }

  const { data, error } = await supabase.from("branches").insert(row).select("id").single();
  if (error) return { ok: false, error: `No se pudo crear: ${error.message}` };
  updateTag("company");
  return { ok: true, id: data.id };
}

/** Borra una sede y limpia sus fotos del bucket «sedes». */
export async function deleteBranch(id: string): Promise<SaveResult> {
  const supabase = await editor();
  if (!supabase) return { ok: false, error: "No tienes permiso para borrar sedes." };
  if (!UUID.test(id)) return { ok: false, error: "ID inválido." };

  const { data: b } = await supabase.from("branches").select("photos").eq("id", id).maybeSingle();
  const photos = (b?.photos ?? []).filter(Boolean);
  if (photos.length) {
    await supabase.storage.from("sedes").remove(photos);
  }
  const { error } = await supabase.from("branches").delete().eq("id", id);
  if (error) return { ok: false, error: `No se pudo borrar: ${error.message}` };
  updateTag("company");
  return { ok: true };
}

/** Reordena las sedes según la lista de IDs recibida. */
export async function reorderBranches(ids: string[]): Promise<SaveResult> {
  const supabase = await editor();
  if (!supabase) return { ok: false, error: "No tienes permiso." };
  const valid = ids.filter((id) => UUID.test(id));
  for (let i = 0; i < valid.length; i++) {
    const { error } = await supabase.from("branches").update({ sort: i + 1 }).eq("id", valid[i]);
    if (error) return { ok: false, error: error.message };
  }
  updateTag("company");
  return { ok: true };
}

