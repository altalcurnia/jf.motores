import { createSupabasePublicClient } from "@/lib/supabase/public";

/**
 * Salud del sitio para el monitor de caídas (Better Stack / UptimeRobot).
 * 200 si el servidor responde y la base de datos contesta; 503 si la base no responde.
 * No expone datos: solo el estado y el tiempo de respuesta.
 */
export async function GET() {
  const started = Date.now();
  let db = false;
  try {
    const { error } = await createSupabasePublicClient()
      .from("company_settings")
      .select("email", { head: true, count: "exact" })
      .abortSignal(AbortSignal.timeout(5_000));
    db = !error;
  } catch {
    db = false;
  }
  return Response.json(
    { ok: db, db, ms: Date.now() - started },
    { status: db ? 200 : 503, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );
}
