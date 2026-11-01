import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { BRAND_PLACEHOLDER } from "@/components/placeholder";
import { StatusPill } from "./owned";
import { formatPrice, productHref, specValue, storageUrl, tr, type CatalogProduct } from "./shared";

const CARD_SPECS = ["hp", "caudal_lpm", "cabeza_m", "cilindros", "diametro_mm", "capacidad_l"];

export function ProductCard({ p, locale, t }: { p: CatalogProduct; locale: Locale; t: Dictionary["catalog"] }) {
  const img = p.images[0];
  const name = tr(p.name, locale);
  const price = formatPrice(p.priceCop, locale);
  const specs = CARD_SPECS.filter((k) => p.specs[k] != null).slice(0, 3);
  return (
    <Link href={productHref(locale, p)} className={`pc ${p.status === "vendido" ? "is-sold" : ""}`}>
      <div className="pc-media">
        <Image
          src={img ? storageUrl(img.path, process.env.NEXT_PUBLIC_SUPABASE_URL) : BRAND_PLACEHOLDER}
          alt={img ? tr(img.alt, locale) || name : name}
          fill
          sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
          unoptimized={!img}
        />
        <StatusPill productId={p.id} status={p.status} labels={{ available: t.statusAvailable, sold: t.statusSold, owned: t.owned }} />
        {img?.isReference && <span className="pc-ref-tag">{t.reference}</span>}
      </div>
      <div className="pc-body">
        <span className="pc-ref">
          {t.ref} {p.ref}
        </span>
        <h3>{name}</h3>
        {tr(p.summary, locale) && <p>{tr(p.summary, locale)}</p>}
        {specs.length > 0 && (
          <ul className="pc-specs">
            {specs.map((k) => (
              <li key={k}>
                <small>{t.specs[k as keyof typeof t.specs] ?? k}</small>
                {specValue(k, p.specs[k], locale)}
              </li>
            ))}
          </ul>
        )}
        <div className="pc-foot">
          <b>{price ?? t.askPrice}</b>
          <span>{t.details} →</span>
        </div>
      </div>
    </Link>
  );
}
