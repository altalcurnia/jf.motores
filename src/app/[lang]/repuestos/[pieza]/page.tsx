import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { localizedAlternates } from "@/i18n/metadata";
import { buildWhatsAppUrl } from "@/features/whatsapp/link";
import { isPartKey, partKeys } from "@/features/engine3d/parts";
import { site } from "@/lib/site";
import { Arrow } from "@/components/Arrow";

export function generateStaticParams() {
  return partKeys.map((pieza) => ({ pieza }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/repuestos/[pieza]">) {
  const { pieza } = await params;
  if (!isPartKey(pieza)) return {};
  const locale = await getLocale();
  const dict = await getDictionary();
  return {
    title: dict.partPage.title + dict.parts[pieza],
    alternates: localizedAlternates(locale, `/repuestos/${pieza}`),
  };
}

/** Categoría de repuestos de una pieza del motor (provisional hasta el catálogo real, día 4). */
export default async function PartPage({ params }: PageProps<"/[lang]/repuestos/[pieza]">) {
  const { pieza } = await params;
  if (!isPartKey(pieza)) notFound();
  const locale = await getLocale();
  const dict = await getDictionary();
  const name = dict.parts[pieza];

  return (
    <section className="block catalog-page">
      <div className="sk">{dict.catalogs.items.repuestos.title}</div>
      <h1>
        {dict.partPage.title}
        {name}
      </h1>
      <p className="soon">{dict.catalogs.soon}</p>
      <a
        className="btn y"
        href={buildWhatsAppUrl(site.whatsappFallback, dict.partPage.whatsapp + name)}
        target="_blank"
        rel="noopener"
      >
        {dict.nav.cta}
        <Arrow />
      </a>
      <Link className="btn g" href={`/${locale}/repuestos`}>
        {dict.partPage.back}
      </Link>
    </section>
  );
}
