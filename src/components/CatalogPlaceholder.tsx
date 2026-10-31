import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { localizedAlternates } from "@/i18n/metadata";
import { buildWhatsAppUrl } from "@/features/whatsapp/link";
import { site } from "@/lib/site";
import { Arrow } from "./Arrow";

export type CatalogKey = "motobombas" | "motores" | "repuestos";

/** Página provisional de catálogo (el catálogo real con filtros llega el día 4). */
export async function CatalogPlaceholder({ catalog }: { catalog: CatalogKey }) {
  const dict = await getDictionary();
  const item = dict.catalogs.items[catalog];
  return (
    <section className="block catalog-page">
      <div className="sk">{dict.catalogs.kicker}</div>
      <h1>{item.title}</h1>
      <p>{item.desc}</p>
      <p className="soon">{dict.catalogs.soon}</p>
      <a
        className="btn y"
        href={buildWhatsAppUrl(site.whatsappFallback, dict.whatsapp.general)}
        target="_blank"
        rel="noopener"
      >
        {dict.nav.cta}
        <Arrow />
      </a>
    </section>
  );
}

export async function catalogMetadata(catalog: CatalogKey) {
  const locale = await getLocale();
  const dict = await getDictionary();
  const item = dict.catalogs.items[catalog];
  return { title: item.title, description: item.desc, alternates: localizedAlternates(locale, `/${catalog}`) };
}
