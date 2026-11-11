import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { waLead } from "@/features/whatsapp/lead-link";
import { isPartKey, partKeys, type PartKey } from "@/features/engine3d/parts";
import { getCatalog } from "@/features/catalog/data";
import { ProductCard } from "@/features/catalog/ProductCard";
import { CatalogTabs } from "@/features/catalog/CatalogListing";
import { ProductDetail, productMetadata, productStaticParams } from "@/features/catalog/ProductDetail";
import { Arrow } from "@/components/Arrow";
import { vatPrefix } from "@/features/catalog/PriceNotice";
import { pageMetadata } from "@/i18n/page-metadata";
import { partKeysWithProducts } from "@/features/catalog/shared";

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
  const [locale, dict, data] = await Promise.all([getLocale(), getDictionary(), getCatalog("repuesto")]);
  return pageMetadata({
    locale,
    path: `/repuestos/${slug}`,
    title: dict.partPage.title + dict.parts[slug],
    description: dict.partPage.metaDesc.replace("{part}", dict.parts[slug].toLowerCase()),
    // Una pieza sin repuestos cargados sigue abierta para los visitantes, pero no va a Google hasta tener productos
    index: partKeysWithProducts(data.categories, data.products).has(slug),
  });
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
  const waHref = waLead({ message: dict.partPage.whatsapp + name, source: "repuestos", locale, catalog: "repuesto", partKey: part });
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
        <p className="price-notice">{(await vatPrefix(t)) + t.shippingNote}</p>
      </header>
      <h2 className="sr-only">{dict.catalogs.items.repuestos.listTitle}</h2>
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
