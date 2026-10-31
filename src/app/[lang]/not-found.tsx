import Link from "next/link";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { catalogPaths, catalogTypes } from "@/features/catalog/shared";

export default async function NotFound() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return (
    <section className="block cat-page">
      <header className="cat-head">
        <div className="sk">404</div>
        <h1>{dict.notFound.title}</h1>
        <p>{dict.notFound.text}</p>
      </header>
      <div className="cat-actions">
        <Link className="btn y" href={`/${locale}`}>
          {dict.notFound.home}
        </Link>
        {catalogTypes.map((c) => (
          <Link key={c} className="btn g" href={`/${locale}/${catalogPaths[c]}`}>
            {dict.catalogs.items[catalogPaths[c]].title}
          </Link>
        ))}
      </div>
    </section>
  );
}
