import { Suspense } from "react";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { localizedAlternates } from "@/i18n/metadata";
import { getCatalog } from "./data";
import { CatalogFilters } from "./CatalogFilters";
import { ProductCard } from "./ProductCard";
import { catalogPaths, fill, filterProducts, parseCatalogQuery, tr, type CatalogType } from "./shared";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Página de un catálogo: encabezado fijo + resultados filtrados según la URL. */
export async function CatalogListing({ catalog, searchParams }: { catalog: CatalogType; searchParams: SearchParams }) {
  const dict = await getDictionary();
  const item = dict.catalogs.items[catalogPaths[catalog]];
  return (
    <section className="block cat-page">
      <header className="cat-head">
        <div className="sk">{dict.catalogs.kicker}</div>
        <h1>{item.title}</h1>
        <p>{item.desc}</p>
        <p className="price-notice">{dict.catalog.priceNote}</p>
      </header>
      <Suspense fallback={<GridSkeleton />}>
        <Results catalog={catalog} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Results({ catalog, searchParams }: { catalog: CatalogType; searchParams: SearchParams }) {
  const [locale, dict, data, raw] = await Promise.all([getLocale(), getDictionary(), getCatalog(catalog), searchParams]);
  const t = dict.catalog;
  const query = parseCatalogQuery(raw);
  const list = filterProducts(data.products, query, { locale, categories: data.categories, compat: data.compat });
  const usedCategories = data.categories.filter((c) => data.products.some((p) => p.categoryId === c.id));
  const models =
    catalog === "motobomba" ? [] : data.engineModels.map((m) => ({ value: m.id, label: `${m.brand} ${m.model}` }));
  const filtered = query.status !== "all" || query.category || query.model || query.q;

  return (
    <>
      <CatalogFilters
        t={t}
        categories={usedCategories.map((c) => ({ value: c.slug, label: tr(c.name, locale) }))}
        models={models}
      />
      <p className="cat-count">{fill(t.results, { n: list.length })}</p>
      {list.length ? (
        <div className="pc-grid">
          {list.map((p) => (
            <ProductCard key={p.id} p={p} locale={locale} t={t} />
          ))}
        </div>
      ) : (
        <div className="cat-empty">
          <p>{t.empty}</p>
          {filtered && (
            <a className="btn g" href={`/${locale}/${catalogPaths[catalog]}`}>
              {t.clear}
            </a>
          )}
        </div>
      )}
    </>
  );
}

function GridSkeleton() {
  return (
    <div className="pc-grid" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="pc pc-skel" />
      ))}
    </div>
  );
}

export async function catalogMetadata(catalog: CatalogType) {
  const locale = await getLocale();
  const dict = await getDictionary();
  const item = dict.catalogs.items[catalogPaths[catalog]];
  return { title: item.title, description: item.desc, alternates: localizedAlternates(locale, `/${catalogPaths[catalog]}`) };
}
