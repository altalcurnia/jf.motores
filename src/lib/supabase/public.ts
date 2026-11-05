import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { supabasePublicEnv } from "@/lib/env";
import type { Database } from "./types";
import { site } from "@/lib/site";
import { branchSlug, sedesUrl, type I18nText } from "@/features/catalog/shared";
import { DEFAULT_ENGINE_VARIANT, isEngineVariant } from "@/features/engine3d/variants";
import { DEFAULT_BRAND, isBrand, type BrandKey } from "@/features/brand/brands";

/** Cliente sin sesión (solo datos públicos, respeta RLS). Se puede usar dentro de "use cache". */
export function createSupabasePublicClient() {
  const env = supabasePublicEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type CompanyInfo = {
  legalName: string | null;
  nit: string | null;
  address: string | null;
  phone: string | null;
};

/** Datos legales y de contacto de la empresa (editables desde el panel). Cacheados 1 hora. */
export async function getCompanyInfo(): Promise<CompanyInfo> {
  "use cache";
  cacheLife("hours");
  cacheTag("company");
  try {
    const supabase = createSupabasePublicClient();
    const [{ data: company }, { data: branch }] = await Promise.all([
      supabase.from("company_settings").select("legal_name, nit, legal_address").maybeSingle(),
      supabase.from("branches").select("address, city, phone").eq("active", true).order("sort").limit(1).maybeSingle(),
    ]);
    return {
      legalName: company?.legal_name ?? null,
      nit: company?.nit ?? null,
      address: company?.legal_address || (branch ? [branch.address, branch.city].filter(Boolean).join(", ") : null),
      phone: branch?.phone ?? null,
    };
  } catch {
    return { legalName: null, nit: null, address: null, phone: null };
  }
}

export type ContactPhone = { label: string; number: string; whatsapp: boolean };
export type ContactBranch = { id: string; slug: string; name: string; city: string; address: string | null; phone: string | null };
export type ContactInfo = {
  email: string | null;
  phones: ContactPhone[];
  /** Línea a la que van todos los botones de WhatsApp (la primera marcada como WhatsApp). */
  whatsapp: string;
  branches: ContactBranch[];
};

/** Normaliza la lista de líneas guardada en company_settings.phones. */
export function parsePhones(raw: unknown): ContactPhone[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((x) => {
    if (!x || typeof x !== "object") return [];
    const r = x as Record<string, unknown>;
    const number = String(r.number ?? "").replace(/\D/g, "");
    if (number.length < 8 || number.length > 15) return [];
    return [{ label: String(r.label ?? "").slice(0, 60), number, whatsapp: r.whatsapp !== false }];
  });
}

/** Líneas directas, correo y sedes (editables en /admin/empresa). Cacheados; se refrescan al guardar. */
export async function getContact(): Promise<ContactInfo> {
  "use cache";
  cacheLife("hours");
  cacheTag("company");
  const fallback: ContactInfo = {
    email: null,
    phones: [{ label: "", number: site.whatsappFallback, whatsapp: true }],
    whatsapp: site.whatsappFallback,
    branches: [{ id: "medellin", slug: "medellin", name: "Medellín", city: "Medellín", address: site.workshopAddress, phone: null }],
  };
  try {
    const supabase = createSupabasePublicClient();
    const [{ data: company, error: e1 }, { data: branches, error: e2 }] = await Promise.all([
      supabase.from("company_settings").select("email, phones").maybeSingle(),
      supabase.from("branches").select("id, name, city, address, phone").eq("active", true).order("sort"),
    ]);
    if (e1 || e2) return fallback;
    const phones = parsePhones(company?.phones);
    const wa = phones.find((p) => p.whatsapp) ?? phones[0];
    const used = new Set<string>();
    return {
      email: company?.email?.trim() || null,
      phones: phones.length ? phones : fallback.phones,
      whatsapp: wa?.number ?? fallback.whatsapp,
      branches: branches?.length
        ? branches.map((b) => ({ ...b, slug: branchSlug(b.city, used) }))
        : fallback.branches,
    };
  } catch {
    return fallback;
  }
}

/** +57 312 2110262 para Colombia; +<dígitos> para otros países. */
export function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.startsWith("57") && d.length === 12) return `+57 ${d.slice(2, 5)} ${d.slice(5)}`;
  return `+${d}`;
}

/** Imagen predeterminada de la sección Beneficios del inicio (se cambia en /admin/empresa). */
export const DEFAULT_BENEFITS_IMAGE = "/demo/motobomba-isometrica.jpg";

/** Imágenes del inicio editables desde el panel. Cacheadas; se refrescan al guardar. */
export async function getHomeImages(): Promise<{ benefits: string }> {
  "use cache";
  cacheLife("hours");
  cacheTag("company");
  try {
    const supabase = createSupabasePublicClient();
    const { data } = await supabase.from("company_settings").select("home_benefits_image").maybeSingle();
    const path = data?.home_benefits_image;
    const base = supabasePublicEnv().NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
    return { benefits: path ? `${base}/storage/v1/object/public/catalogo/${path}` : DEFAULT_BENEFITS_IMAGE };
  } catch {
    return { benefits: DEFAULT_BENEFITS_IMAGE };
  }
}

/** Versión de marca del sitio (textos y paleta), elegida en /admin/empresa. Cacheada; se refresca al guardar. */
export async function getBrand(): Promise<BrandKey> {
  "use cache";
  cacheLife("hours");
  cacheTag("company");
  try {
    const supabase = createSupabasePublicClient();
    const { data } = await supabase.from("company_settings").select("brand").maybeSingle();
    return isBrand(data?.brand) ? data.brand : DEFAULT_BRAND;
  } catch {
    return DEFAULT_BRAND;
  }
}

/** Versión del motor 3D del inicio (elegida en /admin/empresa). Cacheada; se refresca al guardar. */
export async function getEngineVariant(): Promise<string> {
  "use cache";
  cacheLife("hours");
  cacheTag("company");
  try {
    const supabase = createSupabasePublicClient();
    const { data } = await supabase.from("company_settings").select("engine_model").maybeSingle();
    return isEngineVariant(data?.engine_model) ? data.engine_model : DEFAULT_ENGINE_VARIANT;
  } catch {
    return DEFAULT_ENGINE_VARIANT;
  }
}

/** IDs de medición (GA4 y Píxel de Meta) editables en /admin/empresa. Vacíos = no se carga nada. */
export async function getAnalyticsIds(): Promise<{ ga4: string | null; pixel: string | null }> {
  "use cache";
  cacheLife("hours");
  cacheTag("company");
  try {
    const { data } = await createSupabasePublicClient().from("company_settings").select("analytics").maybeSingle();
    const a = (data?.analytics ?? {}) as { ga4?: string; pixel?: string };
    return {
      ga4: a.ga4 && /^G-[A-Z0-9]{4,15}$/.test(a.ga4) ? a.ga4 : null,
      pixel: a.pixel && /^[0-9]{6,20}$/.test(a.pixel) ? a.pixel : null,
    };
  } catch {
    return { ga4: null, pixel: null };
  }
}

export type Testimonial = { id: string; name: string; place: string | null; product: string | null; quote: string };
export type TrustInfo = {
  legalName: string | null;
  nit: string | null;
  /** null = sin confirmar */
  vat: boolean | null;
  years: number | null;
  stats: { equipos?: number; clientes?: number; municipios?: number };
  testimonials: Testimonial[];
};

/** Datos legales y prueba social (años, cifras, testimonios con permiso). Cacheados; se refrescan al guardar. */
export async function getTrust(): Promise<TrustInfo> {
  "use cache";
  cacheLife("hours");
  cacheTag("company");
  const empty: TrustInfo = { legalName: null, nit: null, vat: null, years: null, stats: {}, testimonials: [] };
  try {
    const supabase = createSupabasePublicClient();
    const [{ data: c }, { data: t }] = await Promise.all([
      supabase.from("company_settings").select("legal_name, nit, prices_include_vat, founded_year, stats").maybeSingle(),
      supabase.from("testimonials").select("id, name, place, product, quote").order("sort").order("created_at").limit(12),
    ]);
    const raw = (c?.stats ?? {}) as Record<string, unknown>;
    const stats: TrustInfo["stats"] = {};
    for (const k of ["equipos", "clientes", "municipios"] as const) {
      const n = Number(raw[k]);
      if (Number.isFinite(n) && n > 0) stats[k] = Math.round(n);
    }
    const year = new Date().getFullYear();
    return {
      legalName: c?.legal_name ?? null,
      nit: c?.nit ?? null,
      vat: c?.prices_include_vat ?? null,
      years: c?.founded_year && c.founded_year <= year ? year - c.founded_year : null,
      stats,
      testimonials: (t ?? []) as Testimonial[],
    };
  } catch {
    return empty;
  }
}

export type BranchAdvisor = {
  id: string;
  name: string;
  title: I18nText;
  photoUrl: string | null;
  phone: string;
  email: string | null;
  active: boolean;
};

export type PublicBranch = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string | null;
  phone: string | null;
  hours: I18nText;
  description: I18nText;
  mapQuery: string;
  photos: string[];
  lat: number | null;
  lng: number | null;
  advisors: BranchAdvisor[];
};

export type BranchesPageData = {
  branches: PublicBranch[];
  whatsapp: string;
  email: string | null;
};

function cleanI18n(raw: unknown): I18nText {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const out: I18nText = {};
  for (const k of ["es", "en", "pt"] as const) {
    if (typeof r[k] === "string" && r[k].trim()) out[k] = r[k].trim();
  }
  return out;
}

/** Sedes activas con mapa, fotos, horario, descripción y asesores visibles. Si la migración aún no está aplicada, vuelve a getContact(). */
export async function getBranchesPage(): Promise<BranchesPageData> {
  "use cache";
  cacheLife("hours");
  cacheTag("company");
  const contact = await getContact();
  const fallback = (): BranchesPageData => {
    const used = new Set<string>();
    return {
      whatsapp: contact.whatsapp,
      email: contact.email,
      branches: contact.branches.map((b) => ({
        id: b.id,
        slug: branchSlug(b.city, used),
        name: b.name || `Sede ${b.city}`,
        city: b.city,
        address: b.address,
        phone: b.phone,
        hours: {},
        description: {},
        mapQuery: [b.address, b.city, "Colombia"].filter(Boolean).join(", "),
        photos: [],
        lat: null,
        lng: null,
        advisors: [],
      })),
    };
  };
  try {
    const supabase = createSupabasePublicClient();
    const base = supabasePublicEnv().NEXT_PUBLIC_SUPABASE_URL;
    const [{ data: branches, error: e1 }, { data: advisors, error: e2 }] = await Promise.all([
      supabase
        .from("branches")
        .select("id, name, city, address, phone, hours, description, map_query, photos, lat, lng")
        .eq("active", true)
        .order("sort"),
      supabase
        .from("advisors")
        .select("id, name, title, photo_path, phone_e164, public_email, active, branch_id, sort")
        .eq("show_on_site", true)
        .not("branch_id", "is", null)
        .order("sort")
        .order("name"),
    ]);
    if (e1 || e2 || !branches?.length) return fallback();
    const used = new Set<string>();
    const advByBranch = new Map<string, BranchAdvisor[]>();
    for (const a of advisors ?? []) {
      if (!a.branch_id) continue;
      const list = advByBranch.get(a.branch_id) ?? [];
      list.push({
        id: a.id,
        name: a.name,
        title: cleanI18n(a.title),
        photoUrl: a.photo_path ? sedesUrl(a.photo_path, base) : null,
        phone: a.phone_e164,
        email: a.public_email?.trim() || null,
        active: a.active,
      });
      advByBranch.set(a.branch_id, list);
    }
    return {
      whatsapp: contact.whatsapp,
      email: contact.email,
      branches: branches.map((b) => ({
        id: b.id,
        slug: branchSlug(b.city, used),
        name: b.name || `Sede ${b.city}`,
        city: b.city,
        address: b.address,
        phone: b.phone,
        hours: cleanI18n(b.hours),
        description: cleanI18n(b.description),
        mapQuery: b.map_query?.trim() || [b.address, b.city, "Colombia"].filter(Boolean).join(", "),
        photos: (b.photos ?? []).filter(Boolean).map((p) => sedesUrl(p, base)),
        lat: b.lat ?? null,
        lng: b.lng ?? null,
        advisors: advByBranch.get(b.id) ?? [],
      })),
    };
  } catch {
    return fallback();
  }
}
