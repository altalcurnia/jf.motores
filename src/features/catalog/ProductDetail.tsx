import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { localizedAlternates } from "@/i18n/metadata";
import { waLead } from "@/features/whatsapp/lead-link";
import { site } from "@/lib/site";
import { Arrow } from "@/components/Arrow";
import { BRAND_PLACEHOLDER } from "@/components/placeholder";
import { compatibleParts, compatibleWith, getCatalogData } from "./data";
import { Gallery } from "./Gallery";
import { ProductCard } from "./ProductCard";
import { OwnerBanner, StatusPill } from "./owned";
import { catalogPaths, fill, formatPrice, productHref, productSeoTitle, specValue, statusLabels, storageUrl, tr, type CatalogType } from "./shared";
import { vatPrefix } from "@/features/catalog/PriceNotice";
import { JsonLd } from "@/components/JsonLd";

const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL;

async function findProduct(catalog: CatalogType, slug: string) {
  const data = await getCatalogData();
  const product = data.products.find((p) => p.catalog === catalog && p.slug === slug);
  return { data, product };
}

/** Slugs conocidos al compilar (Cache Components exige al menos uno). */
export async function productStaticParams(catalog: CatalogType) {
  const { products } = await getCatalogData();
  const slugs = products.filter((p) => p.catalog === catalog).map((p) => ({ slug: p.slug }));
  return slugs.length ? slugs : [{ slug: "__vacio__" }];
}

export async function productMetadata(catalog: CatalogType, slug: string) {
  const [{ product }, locale] = await Promise.all([findProduct(catalog, slug), getLocale()]);
  if (!product) return {};
  const img = product.images[0];
  const title = productSeoTitle(tr(product.name, locale), product.ref, product.specs);
  const description = tr(product.summary, locale) || tr(product.description, locale).slice(0, 160);
  // Al compartir el enlace (WhatsApp, Facebook) sale la foto del producto
  const rawImg = img ? storageUrl(img.path, supabaseUrl()) : "/og.jpg";
  const absImg = rawImg.startsWith("http") ? rawImg : `${site.url}${rawImg.startsWith("/") ? "" : "/"}${rawImg}`;
  const images = [absImg];
  return {
    title,
    description,
    alternates: localizedAlternates(locale, `/${catalogPaths[catalog]}/${slug}`),
    openGraph: { type: "website", siteName: site.name, title, description, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export async function ProductDetail({ catalog, slug }: { catalog: CatalogType; slug: string }) {
  const [{ data, product: p }, locale, dict] = await Promise.all([findProduct(catalog, slug), getLocale(), getDictionary()]);
  if (!p) notFound();
  const t = dict.catalog;
  const name = tr(p.name, locale);
  const price = formatPrice(p.priceCop, locale);
  const category = data.categories.find((c) => c.id === p.categoryId);
  const model = data.engineModels.find((m) => m.id === p.engineModelId);
  const pageUrl = `${site.url}${productHref(locale, p)}`;
  const isPart = p.catalog === "repuesto";
  const abs = (u: string) => (u.startsWith("http") ? u : `${site.url}${u}`);
  const photoUrl = p.images.length && p.images[0]?.path ? abs(storageUrl(p.images[0].path, supabaseUrl())) : undefined;
  const message = fill(p.status === "vendido" ? (isPart ? t.whatsappOutOfStock : t.whatsappSold) : t.whatsapp, {
    name,
    ref: p.ref,
    url: pageUrl,
  });
  const images = p.images.length
    ? p.images.map((i) => ({ url: storageUrl(i.path, supabaseUrl()), alt: tr(i.alt, locale) || name, isReference: i.isReference }))
    : [{ url: BRAND_PLACEHOLDER, alt: name, isReference: false }];
  const specs = Object.entries(p.specs).filter(([, v]) => v != null && v !== "");
  const parts = catalog === "repuesto" ? [] : compatibleParts(data, p);
  const fits = catalog === "repuesto" ? compatibleWith(data, p) : null;
  const listHref = `/${locale}/${catalogPaths[catalog]}`;
    const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    sku: p.ref,
    description: tr(p.summary, locale) || tr(p.description, locale).slice(0, 300) || undefined,
    image: p.images.length ? images.slice(0, 6).map((i) => abs(i.url)) : undefined,
    brand: { "@type": "Brand", name: model?.brand ?? site.name },
    category: category ? tr(category.name, locale) : undefined,
    url: pageUrl,
    offers:
      p.priceCop != null
        ? {
            "@type": "Offer",
            url: pageUrl,
            priceCurrency: "COP",
            price: p.priceCop,
            itemCondition: "https://schema.org/NewCondition",
            availability: p.status === "disponible" ? "https://schema.org/InStock" : isPart ? "https://schema.org/OutOfStock" : "https://schema.org/SoldOut",
            seller: { "@type": "Organization", name: site.name },
          }
        : undefined,
  };
  const crumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: site.name, item: `${site.url}/${locale}` },
      { "@type": "ListItem", position: 2, name: dict.catalogs.items[catalogPaths[catalog]].title, item: `${site.url}${listHref}` },
      { "@type": "ListItem", position: 3, name, item: pageUrl },
    ],
  };

  return (
    <section className="block pd-page">
      <JsonLd data={productLd} />
      <JsonLd data={crumbsLd} />
      <div className="pd-crumbs">
        <Link href={listHref}>← {dict.catalogs.items[catalogPaths[catalog]].title}</Link>
        {category && <span> / {tr(category.name, locale)}</span>}
      </div>

      <div className="pd-top">
        <div className="pd-media">
          <Gallery
            images={images}
            referenceLabel={t.reference}
            model={p.glbPath ? { src: storageUrl(p.glbPath, supabaseUrl()), alt: name, label3d: t.view3d, labelPhotos: t.photos } : undefined}
          />
        </div>

        <div className="pd-info">
          <span className="pc-ref">
            {t.ref} {p.ref}
          </span>
          <h1>{name}</h1>
          {tr(p.summary, locale) && <p className="pd-summary">{tr(p.summary, locale)}</p>}
          <StatusPill
            className="static"
            productId={p.id}
            status={p.status}
            labels={{ ...statusLabels(t, p.catalog), owned: t.owned }}
          />
          <OwnerBanner productId={p.id} locale={locale} text={t.ownedBanner} link={t.ownedLink} />

          <div className="pd-price">
            <b>{price ?? t.askPrice}</b>
            {price && <small>{(await vatPrefix(t)) + t.shippingNote}</small>}
            {p.warrantyMonths && <small className="pd-warranty">✓ {fill(t.warrantyMonths, { n: p.warrantyMonths })}</small>}
          </div>
          {p.status === "vendido" && <p className="pd-sold sold-note">{isPart ? t.outOfStockNotice : t.soldNotice}</p>}

          <div className="pd-actions">
            <a className="btn y" href={waLead({ message, source: "ficha", locale, productId: p.id, catalog: p.catalog, imageUrl: photoUrl })} target="_blank" rel="noopener">
              {t.quote}
              <Arrow />
            </a>
            {p.hasPublicManual && (
              <a className="btn g" href={`/api/manual/${p.id}`} target="_blank" rel="noopener">
                {t.manual}
              </a>
            )}
          </div>

          {specs.length > 0 && (
            <>
              <h2>{t.specsTitle}</h2>
              <dl className="pd-specs">
                {model && (
                  <div>
                    <dt>{t.engineModel}</dt>
                    <dd>
                      {model.brand} {model.model}
                    </dd>
                  </div>
                )}
                {specs.map(([k, v]) => (
                  <div key={k}>
                    <dt>{t.specs[k as keyof typeof t.specs] ?? k}</dt>
                    <dd>{specValue(k, v, locale)}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          {fits && (fits.models.length > 0 || fits.products.length > 0) && (
            <>
              <h2>{t.compatTitle}</h2>
              <ul className="pd-fits">
                {fits.models.map((m) => (
                  <li key={m.id}>
                    <Link href={`/${locale}/repuestos?motor=${m.id}`}>
                      {m.brand} {m.model}
                    </Link>
                  </li>
                ))}
                {fits.products.map((x) => (
                  <li key={x.id}>
                    <Link href={productHref(locale, x)}>{tr(x.name, locale)}</Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {tr(p.description, locale) && (
        <div className="pd-desc">
          <h2>{t.descriptionTitle}</h2>
          {tr(p.description, locale)
            .split(/\n{2,}/)
            .map((para, i) => (
              <p key={i}>{para}</p>
            ))}
        </div>
      )}

      {parts.length > 0 && (
        <div className="pd-related">
          <h2>{t.partsTitle}</h2>
          <div className="pc-grid">
            {parts.slice(0, 6).map((x) => (
              <ProductCard key={x.id} p={x} locale={locale} t={t} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
