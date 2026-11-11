import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getCatalogData } from "./data";
import { ProductCard } from "./ProductCard";

/** Productos marcados como "Destacado" en el panel (solo los disponibles). Si no hay, no se muestra. */
export async function FeaturedProducts({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const { products } = await getCatalogData();
  const featured = products.filter((p) => p.featured && p.status === "disponible").slice(0, 6);
  if (!featured.length) return null;
  return (
    <section className="block" id="destacados">
      <div className="sk reveal">{dict.catalog.featuredKicker}</div>
      <h2 className="reveal">{dict.catalog.featuredTitle}</h2>
      <div className="pc-grid featured-grid">
        {featured.map((p) => (
          <ProductCard key={p.id} p={p} locale={locale} t={dict.catalog} />
        ))}
      </div>
    </section>
  );
}
