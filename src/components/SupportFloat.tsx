import { buildWhatsAppUrl } from "@/features/whatsapp/link";
import { getContact } from "@/lib/supabase/public";
import { getAssistantContext } from "@/features/assistant/context";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { SupportFab } from "./SupportFab";

/** Botón flotante de soporte: WhatsApp y, si está encendido en el panel, chat con IA. */
export async function SupportFloat({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const [contact, ai] = await Promise.all([getContact(), getAssistantContext()]);
  return (
    <SupportFab
      locale={locale}
      waHref={buildWhatsAppUrl(contact.whatsapp, dict.whatsapp.fromWeb)}
      waNumber={contact.whatsapp}
      aiEnabled={ai.enabled}
      t={dict.assistant}
    />
  );
}
