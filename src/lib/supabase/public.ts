import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { supabasePublicEnv } from "@/lib/env";
import type { Database } from "./types";
import { site } from "@/lib/site";

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
      supabase.from("company_settings").select("legal_name, nit").maybeSingle(),
      supabase.from("branches").select("address, city, phone").eq("active", true).order("sort").limit(1).maybeSingle(),
    ]);
    return {
      legalName: company?.legal_name ?? null,
      nit: company?.nit ?? null,
      address: branch ? [branch.address, branch.city].filter(Boolean).join(", ") : null,
      phone: branch?.phone ?? null,
    };
  } catch {
    return { legalName: null, nit: null, address: null, phone: null };
  }
}

export type ContactPhone = { label: string; number: string; whatsapp: boolean };
export type ContactBranch = { id: string; name: string; city: string; address: string | null; phone: string | null };
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
    branches: [{ id: "medellin", name: "Medellín", city: "Medellín", address: site.workshopAddress, phone: null }],
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
    return {
      email: company?.email?.trim() || null,
      phones: phones.length ? phones : fallback.phones,
      whatsapp: wa?.number ?? fallback.whatsapp,
      branches: branches?.length ? branches : fallback.branches,
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
