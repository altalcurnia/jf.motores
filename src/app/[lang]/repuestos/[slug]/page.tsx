import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { localizedAlternates } from "@/i18n/metadata";
import { buildWhatsAppUrl } from "@/features/whatsapp/link";
import { isPartKey, partKeys, type PartKey } from "@/features/engine3d/parts";
import { getCatalog } from "@/features/catalog/data";
import { ProductCard } from "@/features/catalog/ProductCard";
import { CatalogTabs } from "@/features/catalog/CatalogListing";
import { ProductDetail, productMetadata, productStaticParams } from "@/features/catalog/ProductDetail";
import { getContact } from "@/lib/supabase/public";
import { Arrow } from "@/components/Arrow";

/**
 * /repuestos/[slug] sirve dos cosas:
 *  - una pieza del motor 3D (radiador, culata…) → los repuestos de esa categoría;
 *  - cualquier otro slug → el detalle de un repuesto.
 */
export async function generateStaticParams() {
  const products = await productStaticParams("repuesto");
  return [...partKeys.map((slug) => ({ slug })), ...products.filter((p) => p.slug !== "__vacio__")];
}

export async function generateMetadata({ params }: PageProps<"/[lang]/repuestos/[slug]">) {
  const { slug } = await params;
  if (!isPartKey(slug)) return productMetadata("repuesto", slug);
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return {
    title: dict.partPage.title + dict.parts[slug],
    alternates: localizedAlternates(locale, `/repuestos/${slug}`),
  };
}

export default async function Page({ params }: PageProps<"/[lang]/repuestos/[slug]">) {
  const { slug } = await params;
  if (isPartKey(slug)) return <PartCategory part={slug} />;
  return <ProductDetail catalog="repuesto" slug={slug} />;
}

async function PartCategory({ part }: { part: PartKey }) {
  const [locale, dict, data] = await Promise.all([getLocale(), getDictionary(), getCatalog("repuesto")]);
  const category = data.categories.find((c) => c.partKey === part);
  if (!category && !partKeys.includes(part)) notFound();
  const products = category ? data.products.filter((p) => p.categoryId === category.id) : [];
  const name = dict.parts[part];
  const waHref = buildWhatsAppUrl((await getContact()).whatsapp, dict.partPage.whatsapp + name);
  const t = dict.catalog;

  return (
    <section className="block cat-page">
      <CatalogTabs current="repuesto" locale={locale} dict={dict} />
      <header className="cat-head">
        <div className="sk">{dict.catalogs.items.repuestos.title}</div>
        <h1>
          {dict.partPage.title}
          {name}
        </h1>
        <p>{t.partCategoryIntro}</p>
        <p className="price-notice">{t.shippingNote}</p>
      </header>
      {products.length ? (
        <div className="pc-grid">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} locale={locale} t={t} />
          ))}
        </div>
      ) : (
        <p className="cat-empty">{t.empty}</p>
      )}
      <div className="cat-actions">
        <a className="btn y" href={waHref} target="_blank" rel="noopener">
          {dict.nav.cta}
          <Arrow />
        </a>
        <Link className="btn g" href={`/${locale}/repuestos`}>
          {dict.partPage.back}
        </Link>
      </div>
    </section>
  );
}
