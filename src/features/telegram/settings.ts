import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { parseChatIds } from "./api";

export type TelegramSettings = {
  /** Abierto a cualquier cliente (si no, solo los chats de prueba). */
  publicEnabled: boolean;
  testChats: string[];
  teamChats: string[];
  notifyLeads: boolean;
  capUsd: number;
  /** false = la base no está disponible para el servidor (falta SUPABASE_SECRET_KEY): modo de prueba con TELEGRAM_ALLOWED_CHATS. */
  fromDb: boolean;
};

/** Chats de prueba que vienen de Vercel (compatibilidad con la configuración anterior). */
function envChats() {
  return parseChatIds(process.env.TELEGRAM_ALLOWED_CHATS ?? "");
}

/**
 * Ajustes del bot (Admin → Asistente). Se leen con la clave secreta porque el público no puede verlos.
 * Sin clave secreta o si la consulta falla: bot privado, solo chats de TELEGRAM_ALLOWED_CHATS, sin avisos.
 */
export async function getTelegramSettings(): Promise<TelegramSettings> {
  "use cache";
  cacheLife("minutes");
  cacheTag("telegram");
  const fallback: TelegramSettings = { publicEnabled: false, testChats: envChats(), teamChats: [], notifyLeads: false, capUsd: 0, fromDb: false };
  if (!process.env.SUPABASE_SECRET_KEY) return fallback;
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("telegram_settings")
      .select("public_enabled, test_chats, team_chats, notify_leads, monthly_cap_usd")
      .maybeSingle();
    if (error || !data) return fallback;
    return {
      publicEnabled: data.public_enabled,
      testChats: [...new Set([...data.test_chats.map(String), ...envChats()])],
      teamChats: data.team_chats.map(String),
      notifyLeads: data.notify_leads,
      capUsd: Number(data.monthly_cap_usd),
      fromDb: true,
    };
  } catch {
    return fallback;
  }
}

/** Primer día del mes actual en hora de Colombia (YYYY-MM-01), igual que la función telegram_charge. */
export function currentMonth(now = new Date()): string {
  const d = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Gasto de IA del bot en el mes (US$). */
export async function botSpentThisMonth(): Promise<number> {
  if (!process.env.SUPABASE_SECRET_KEY) return 0;
  const { data } = await createSupabaseAdminClient().from("telegram_usage").select("cost_usd").eq("month", currentMonth()).maybeSingle();
  return Number(data?.cost_usd ?? 0);
}

/** Suma el costo de una respuesta al mes en curso. */
export async function chargeBot(costUsd: number): Promise<void> {
  if (!process.env.SUPABASE_SECRET_KEY || !(costUsd > 0)) return;
  await createSupabaseAdminClient().rpc("telegram_charge", { p_cost: Math.min(1, Number(costUsd.toFixed(6))) });
}
