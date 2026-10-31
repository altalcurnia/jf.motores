import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { supabasePublicEnv } from "@/lib/env";
import type { Database } from "./types";

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
