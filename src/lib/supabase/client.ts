"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabasePublicEnv } from "@/lib/env";
import type { Database } from "./types";

/** Cliente para el navegador (respeta RLS). */
export function createSupabaseBrowserClient() {
  const env = supabasePublicEnv();
  return createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
