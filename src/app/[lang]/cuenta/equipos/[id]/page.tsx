import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { localeTags, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getContact } from "@/lib/supabase/public";
import { buildWhatsAppUrl } from "@/features/whatsapp/link";
import { compatibleParts, getCatalogData } from "@/features/catalog/data";
import { ProductCard } from "@/features/catalog/ProductCard";
import { catalogPaths, fill, storageUrl, tr, type I18nText } from "@/features/catalog/shared";
import { warrantyState } from "@/features/account/warranty";
import { BRAND_PLACEHOLDER } from "@/components/placeholder";
import { Arrow } from "@/components/Arrow";

// Cache Components exige al menos un parámetro conocido; los equipos reales se resuelven al visitarlos.
export function generateStaticParams() {
  return [{ id: "equipo" }];
}

export async function generateMetadata() {
  const dict = await getDictionary();
  return { title: dict.account.equipmentTitle, robots: { index: false } };
}

export default async function EquipmentPage({ params }: PageProps<"/[lang]/cuenta/equipos/[id]">) {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return (
    <section className="block eq-page">
      <Suspense fallback={<p className="acc-muted">…</p>}>
        <Equipment params={params} locale={locale} dict={dict} />
      </Suspense>
    </section>
  );
}

async function Equipment({ params, locale, dict }: { params: Promise<{ id: string }>; locale: Locale; dict: Dictionary }) {
  const { id } = await params;
  const t = dict.account;
  const session = await getSession();
  const back = (
    <Link className="pd-crumbs-link" href={`/${locale}/cuenta`}>
      ← {t.backToAccount}
    </Link>
  );
  if (!session) return back;

  const supabase = await createSupabaseServerClient();
  const { data: u } = /^[0-9a-f-]{36}$/i.test(id)
    ? await supabase
        .from("units")
        .select("id, serial, sold_at, warranty_start, warranty_end, products ( id, ref, slug, catalog, name, manual_path, product_images ( path, sort ) )")
        .eq("id", id)
        .eq("owner_id", session.userId)
        .maybeSingle()
    : { data: null };
  if (!u?.products) {
    return (
      <>
        {back}
        <p className="cat-empty">{t.notFoundUnit}</p>
      </>
    );
  }

  const p = u.products;
  const name = tr(p.name as I18nText, locale) || p.ref;
  const img = [...(p.product_images ?? [])].sort((a, b) => a.sort - b.sort)[0];
  const fmt = new Intl.DateTimeFormat(localeTags[locale], { dateStyle: "long" });
  const date = (d: string) => fmt.format(new Date(`${d}T12:00:00`));
  const w = warrantyState(u.warranty_start, u.warranty_end);
  const data = await getCatalogData();
  const catalogProduct = data.products.find((x) => x.id === p.id);
  const parts = catalogProduct ? compatibleParts(data, catalogProduct) : [];
  const partsHref = `/${locale}/repuestos?equipo=${p.id}`;
  const wa = buildWhatsAppUrl((await getContact()).whatsapp, fill(t.requestPartWa, { name, serial: u.serial ?? p.ref }));

  return (
    <>
      {back}
      <div className="eq-top">
        <div className="eq-media">
          <Image
            src={img ? storageUrl(img.path, process.env.NEXT_PUBLIC_SUPABASE_URL) : BRAND_PLACEHOLDER}
            alt={name}
            fill
            sizes="(max-width: 900px) 100vw, 45vw"
            unoptimized={!img}
          />
          <span className="pc-status owned">★ {dict.catalog.owned}</span>
        </div>
        <div className="eq-info">
          <span className="pc-ref">
            {dict.catalog.ref} {p.ref}
          </span>
          <h1>{name}</h1>
          <dl className="eq-facts">
            <div>
              <dt>{t.serial}</dt>
              <dd>{u.serial ?? "—"}</dd>
            </div>
            <div>
              <dt>{t.purchaseDate}</dt>
              <dd>{u.sold_at ? date(u.sold_at) : "—"}</dd>
            </div>
          </dl>

          <div className={`warranty-card ${w.kind}`}>
            <div className="warranty-head">
              <b>{t.warranty}</b>
              <span className="warranty-badge">
                {w.kind === "none" ? t.noWarranty : w.kind === "active" ? t.warrantyActive : t.warrantyExpired}
              </span>
            </div>
            {w.kind !== "none" && (
              <>
                <div className="warranty-dates">
                  <span>
                    {t.warrantyFrom} <b>{date(w.start)}</b>
                  </span>
                  <span>
                    {t.warrantyUntil} <b>{date(w.end)}</b>
                  </span>
                  {w.kind === "active" && <span>{fill(t.daysLeft, { n: w.daysLeft })}</span>}
                </div>
                <div className="warranty-bar" aria-hidden="true">
                  <i style={{ width: `${w.kind === "active" ? 100 - w.progress : 0}%` }} />
                </div>
              </>
            )}
          </div>

          <div className="eq-actions">
            <Link className="btn y" href={partsHref}>
              {t.requestPart}
              <Arrow />
            </Link>
            {p.manual_path && (
              <a className="btn g" href={`/api/manual/${p.id}`} target="_blank" rel="noopener">
                {t.manual}
              </a>
            )}
            <Link className="btn g app-btn" href={`/${locale}/app`}>
              {t.appButton}
              <small>{t.appSoon}</small>
            </Link>
          </div>
          <a className="footer-link" href={wa} target="_blank" rel="noopener">
            WhatsApp · {t.requestPart}
          </a>
          <Link className="footer-link" href={`/${locale}/${catalogPaths[p.catalog]}/${p.slug}`}>
            {t.viewProduct}
          </Link>
        </div>
      </div>

      <div className="eq-parts">
        <div className="eq-parts-head">
          <h2>{t.compatibleParts}</h2>
          {parts.length > 0 && <Link href={partsHref}>{t.viewAllParts} →</Link>}
        </div>
        {parts.length ? (
          <div className="pc-grid">
            {parts.slice(0, 6).map((x) => (
              <ProductCard key={x.id} p={x} locale={locale} t={dict.catalog} />
            ))}
          </div>
        ) : (
          <p className="acc-muted">{t.noCompatible}</p>
        )}
      </div>
    </>
  );
}
