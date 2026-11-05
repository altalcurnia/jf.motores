import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

/**
 * Variables públicas de Supabase. Se validan al usarse (no al compilar),
 * para que el sitio compile aunque la base de datos aún no esté configurada.
 * Next.js solo inyecta NEXT_PUBLIC_* en el navegador si se leen de forma literal.
 */
export function supabasePublicEnv() {
  return publicSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

/** Clave secreta: solo servidor. Nunca importar desde un componente de cliente. */
export function supabaseSecretKey(): string {
  return z.string().min(20).parse(process.env.SUPABASE_SECRET_KEY);
}
