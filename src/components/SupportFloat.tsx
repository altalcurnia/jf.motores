import { waLead } from "@/features/whatsapp/lead-link";
import { getAssistantContext } from "@/features/assistant/context";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { SupportFab } from "./SupportFab";

/** Botón flotante de soporte: WhatsApp, chat con IA (si está encendido) y tickets con el equipo. */
export async function SupportFloat({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const ai = await getAssistantContext();
  return (
    <SupportFab
      locale={locale}
      waHref={waLead({ message: dict.whatsapp.fromWeb, source: "flotante", locale })}
      aiEnabled={ai.enabled}
      t={dict.assistant}
      tt={dict.tickets}
    />
  );
}
