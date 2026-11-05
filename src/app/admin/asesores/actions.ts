"use server";
import { updateTag } from "next/cache";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };
const CATALOGS = ["motobomba", "motor", "repuesto"] as const;
const LANGS = ["es", "en", "pt"];
const DAYS = ["1", "2", "3", "4", "5", "6", "7"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHOTO_PATH = /^asesores\/[a-z0-9-]+\.(jpg|png|webp)$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AdvisorInput = {
  id: string | null;
  name: string;
  title: string;
  titleEn: string;
  titlePt: string;
  phone: string;
  email: string;
  publicEmail: string;
  branchId: string | null;
  photoPath: string | null;
  showOnSite: boolean;
  languages: string[];
  catalogs: string[];
  countries: string;
  days: string[];
  from: string;
  to: string;
  perDaySchedule?: boolean;
  dayHours?: Record<string, [string, string]>;
  weight: number;
  active: boolean;
  isFallback: boolean;
};

export type RuleInput = {
  id: string | null;
  name: string;
  priority: number;
  catalogs: string[];
  countries: string;
  languages: string[];
  inSchedule: boolean;
  strategy: "rotacion" | "ponderada" | "fijo";
  advisorIds: string[];
  active: boolean;
};

async function manager() {
  const session = await getSession();
  if (!session || !session.role.isInternal || !can(session, "asesores.gestionar")) return null;
  return await createSupabaseServerClient();
}

const countryList = (s: string) =>
  [...new Set(s.toUpperCase().split(/[\s,;]+/).filter((c) => /^[A-Z]{2}$/.test(c)))].slice(0, 40);

/** Crea o actualiza un asesor. Un solo asesor puede ser el de respaldo. */
export async function saveAdvisor(a: AdvisorInput): Promise<Result> {
  const supabase = await manager();
  if (!supabase) return { ok: false, error: "No tienes permiso para gestionar asesores." };
  const name = a.name.trim().slice(0, 80);
  if (name.length < 2) return { ok: false, error: "Escribe el nombre del asesor." };
  let phone = a.phone.replace(/\D/g, "");
  if (phone.length === 10 && phone.startsWith("3")) phone = `57${phone}`;
  if (!/^[1-9][0-9]{7,14}$/.test(phone)) return { ok: false, error: "WhatsApp inválido. Escríbelo con indicativo, por ejemplo 573001234567." };
  const publicEmail = a.publicEmail.trim().toLowerCase();
  if (publicEmail && !EMAIL.test(publicEmail)) return { ok: false, error: "El correo público de contacto no es válido." };
  const days = a.days.filter((d) => DAYS.includes(d));
  const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;

  const daysMap: Record<string, [string, string]> = {};
  if (days.length) {
    for (const d of days) {
      const pair = a.perDaySchedule && a.dayHours?.[d] ? a.dayHours[d] : [a.from, a.to];
      const [dFrom, dTo] = pair;
      if (!hhmm.test(dFrom) || !hhmm.test(dTo) || dFrom >= dTo) {
        return { ok: false, error: "Revisa el horario: la hora de inicio debe ser anterior a la hora de salida en cada día." };
      }
      daysMap[d] = [dFrom, dTo];
    }
  }
  const schedule = days.length ? { tz: "America/Bogota", days: daysMap } : {};

  let profileId: string | null = null;
  if (a.email.trim()) {
    const { data: p } = await supabase.from("profiles").select("id").eq("email", a.email.trim().toLowerCase()).maybeSingle();
    if (!p) return { ok: false, error: "No hay una cuenta con ese correo. El asesor debe registrarse primero." };
    profileId = p.id;
  }
  if (a.isFallback) await supabase.from("advisors").update({ is_fallback: false }).neq("id", a.id ?? "00000000-0000-0000-0000-000000000000");

  const title: Record<string, string> = {};
  if (a.title.trim()) title.es = a.title.trim().slice(0, 60);
  if (a.titleEn.trim()) title.en = a.titleEn.trim().slice(0, 60);
  if (a.titlePt.trim()) title.pt = a.titlePt.trim().slice(0, 60);

  const row = {
    name,
    title,
    phone_e164: phone,
    profile_id: profileId,
    public_email: publicEmail || null,
    branch_id: a.branchId && UUID.test(a.branchId) ? a.branchId : null,
    photo_path: a.photoPath && PHOTO_PATH.test(a.photoPath) ? a.photoPath : null,
    show_on_site: a.showOnSite,
    languages: a.languages.filter((l) => LANGS.includes(l)).length ? a.languages.filter((l) => LANGS.includes(l)) : ["es"],
    catalogs: (a.catalogs.filter((c) => (CATALOGS as readonly string[]).includes(c)).length
      ? a.catalogs.filter((c) => (CATALOGS as readonly string[]).includes(c))
      : [...CATALOGS]) as ("motobomba" | "motor" | "repuesto")[],
    countries: countryList(a.countries),
    schedule,
    weight: Math.max(1, Math.min(100, Math.round(a.weight || 1))),
    active: a.active,
    is_fallback: a.isFallback,
  };
  const { error } = a.id ? await supabase.from("advisors").update(row).eq("id", a.id) : await supabase.from("advisors").insert(row);
  if (error) return { ok: false, error: error.message.includes("profile_id") ? "Esa cuenta ya está asignada a otro asesor." : error.message };
  updateTag("company");
  return { ok: true };
}

export async function deleteAdvisor(id: string): Promise<Result> {
  const supabase = await manager();
  if (!supabase) return { ok: false, error: "No tienes permiso." };
  const { data } = await supabase.from("advisors").select("is_fallback, photo_path").eq("id", id).maybeSingle();
  if (data?.is_fallback) return { ok: false, error: "No se puede borrar el asesor de respaldo. Marca otro como respaldo primero." };
  if (data?.photo_path) await supabase.storage.from("sedes").remove([data.photo_path]);
  const { error } = await supabase.from("advisors").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  updateTag("company");
  return { ok: true };
}

export async function saveRule(r: RuleInput): Promise<Result> {
  const supabase = await manager();
  if (!supabase) return { ok: false, error: "No tienes permiso." };
  const name = r.name.trim().slice(0, 80);
  if (name.length < 2) return { ok: false, error: "Ponle un nombre a la regla." };
  if (!["rotacion", "ponderada", "fijo"].includes(r.strategy)) return { ok: false, error: "Modo inválido." };
  const conditions: { catalogs?: string[]; countries?: string[]; languages?: string[]; in_schedule?: boolean } = {};
  const cats = r.catalogs.filter((c) => (CATALOGS as readonly string[]).includes(c));
  if (cats.length) conditions.catalogs = cats;
  const countries = countryList(r.countries);
  if (countries.length) conditions.countries = countries;
  const langs = r.languages.filter((l) => LANGS.includes(l));
  if (langs.length) conditions.languages = langs;
  if (r.inSchedule) conditions.in_schedule = true;
  const row = {
    name,
    priority: Math.max(1, Math.min(9999, Math.round(r.priority || 100))),
    conditions,
    strategy: r.strategy,
    advisor_ids: r.advisorIds.filter((x) => /^[0-9a-f-]{36}$/.test(x)),
    active: r.active,
  };
  const { error } = r.id ? await supabase.from("routing_rules").update(row).eq("id", r.id) : await supabase.from("routing_rules").insert(row);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteRule(id: string): Promise<Result> {
  const supabase = await manager();
  if (!supabase) return { ok: false, error: "No tienes permiso." };
  const { error } = await supabase.from("routing_rules").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
