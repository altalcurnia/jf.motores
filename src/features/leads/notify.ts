import "server-only";
import { tgSend, telegramToken } from "@/features/telegram/api";
import { getTelegramSettings } from "@/features/telegram/settings";
import { reportError } from "@/lib/report-error";
import { site } from "@/lib/site";

export type LeadNotice = {
  code: string | null;
  source: string;
  message: string;
  country: string | null;
  device: string;
  campaign: string | null;
};

/** Texto del aviso interno (en español: lo lee el equipo). Sin datos personales del cliente. */
export function leadNoticeText(n: LeadNotice): string {
  const first = n.message.split("\n").find((l) => l.trim()) ?? "";
  return [
    `🟢 Cliente nuevo en WhatsApp${n.code ? ` · ${n.code}` : ""}`,
    first ? `«${first.slice(0, 200)}»` : null,
    `Desde: ${n.source} · ${n.country ?? "país desconocido"} · ${n.device}`,
    n.campaign ? `Campaña: ${n.campaign}` : null,
    `Panel: ${site.url}/admin/leads`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Avisa a los chats del equipo (Admin → Asistente → Telegram). Si no hay bot o chats, no hace nada. */
export async function notifyTeamLead(n: LeadNotice): Promise<void> {
  if (!telegramToken()) return;
  try {
    const s = await getTelegramSettings();
    if (!s.notifyLeads || s.teamChats.length === 0) return;
    const text = leadNoticeText(n);
    await Promise.all(s.teamChats.map((chat) => tgSend(chat, text)));
  } catch (e) {
    reportError("Aviso de lead por Telegram", e);
  }
}
