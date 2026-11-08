import Link from "next/link";
import { Suspense } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { getCatalog, getCatalogData } from "./data";
import { CatalogFilters } from "./CatalogFilters";
import { ProductCard } from "./ProductCard";
import { catalogPaths, fill, filterProducts, parseCatalogQuery, tr, type CatalogType } from "./shared";
import { vatPrefix } from "@/features/catalog/PriceNotice";
import { pageMetadata } from "@/i18n/page-metadata";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Tab = CatalogType | "all";

/** Pestañas del catálogo: Todo · Motobombas · Motores · Repuestos (sin volver al menú). */
export function CatalogTabs({ current, locale, dict }: { current: Tab | null; locale: Locale; dict: Dictionary }) {
  const tabs: { key: Tab; href: string; label: string }[] = [
    { key: "all", href: `/${locale}/catalogo`, label: dict.catalogs.all },
    ...(["motobomba", "motor", "repuesto"] as const).map((c) => ({
      key: c,
      href: `/${locale}/${catalogPaths[c]}`,
      label: dict.nav[catalogPaths[c]],
    })),
  ];
  return (
    <div className="cat-tabs" role="navigation" aria-label={dict.nav.catalog}>
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} className={t.key === current ? "on" : ""} aria-current={t.key === current ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}

/** Página de un catálogo: pestañas, encabezado fijo y resultados filtrados según la URL. */
export async function CatalogListing({ catalog, searchParams }: { catalog: Tab; searchParams: SearchParams }) {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const item =
    catalog === "all" ? { title: dict.nav.catalog, desc: dict.catalogs.allDesc } : dict.catalogs.items[catalogPaths[catalog]];
  return (
    <section className="block cat-page">
      <CatalogTabs current={catalog} locale={locale} dict={dict} />
      <header className="cat-head">
        <div className="sk">{dict.catalogs.kicker}</div>
        <h1>{item.title}</h1>
        <p>{item.desc}</p>
        <p className="price-notice">{(await vatPrefix(dict.catalog)) + dict.catalog.shippingNote}</p>
      </header>
      <Suspense fallback={<GridSkeleton />}>
        <Results catalog={catalog} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Results({ catalog, searchParams }: { catalog: Tab; searchParams: SearchParams }) {
  const [locale, dict, data, raw, all] = await Promise.all([
    getLocale(),
    getDictionary(),
    getCatalog(catalog),
    searchParams,
    getCatalogData(),
  ]);
  const t = dict.catalog;
  const query = parseCatalogQuery(raw);
  const equipment = query.equipment ? all.products.find((p) => p.id === query.equipment) : null;
  const list = filterProducts(data.products, query, {
    locale,
    categories: data.categories,
    compat: data.compat,
    equipmentEngine: equipment?.engineModelId ?? null,
  });
  const basePath = catalog === "all" ? `/${locale}/catalogo` : `/${locale}/${catalogPaths[catalog]}`;
  const usedCategories = data.categories.filter((c) => data.products.some((p) => p.categoryId === c.id));
  const models =
    catalog === "motobomba" ? [] : data.engineModels.map((m) => ({ value: m.id, label: `${m.brand} ${m.model}` }));
  const filtered = query.status !== "all" || query.category || query.model || query.q || query.equipment;

  return (
    <>
      <CatalogFilters
        t={t}
        catalog={catalog}
        categories={usedCategories.map((c) => ({ value: c.slug, label: tr(c.name, locale) }))}
        models={models}
      />
      {equipment && (
        <p className="equip-chip">
          ★ {fill(t.compatibleFor, { name: tr(equipment.name, locale) })}
          <a href={basePath} aria-label={t.clear}>
            ✕
          </a>
        </p>
      )}
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
            <a className="btn g" href={basePath}>
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

export async function catalogMetadata(catalog: Tab) {
  const locale = await getLocale();
  const dict = await getDictionary();
  if (catalog === "all") {
    return pageMetadata({ locale, path: "/catalogo", title: dict.nav.catalog, description: dict.catalogs.allDesc });
  }
  const item = dict.catalogs.items[catalogPaths[catalog]];
  return pageMetadata({ locale, path: `/${catalogPaths[catalog]}`, title: item.title, description: item.desc });
}
