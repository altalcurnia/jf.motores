import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { supabasePublicEnv, supabaseSecretKey } from "@/lib/env";

/**
 * Cliente con la sesión del usuario actual (respeta RLS).
 * Crear uno nuevo por petición.
 */
export async function createSupabaseServerClient() {
  const env = supabasePublicEnv();
  const cookieStore = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: las cookies se renuevan en el proxy/Server Actions.
        }
      },
    },
  });
}

/**
 * Cliente con clave secreta: IGNORA RLS. Solo para tareas del servidor
 * (registrar leads, tareas programadas). Nunca exponer al navegador.
 */
export function createSupabaseAdminClient() {
  const env = supabasePublicEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
