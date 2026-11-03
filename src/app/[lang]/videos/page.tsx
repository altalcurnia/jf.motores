import { redirect } from "next/navigation";
import { getLocale } from "@/i18n/dictionaries";

/** Los videos ahora son una subpestaña de Guías: la dirección vieja sigue funcionando. */
export default async function VideosPage() {
  const locale = await getLocale();
  redirect(`/${locale}/guias#videos`);
}
