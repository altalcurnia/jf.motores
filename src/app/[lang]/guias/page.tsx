import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { localizedAlternates } from "@/i18n/metadata";
import { buildWhatsAppUrl } from "@/features/whatsapp/link";
import { site } from "@/lib/site";
import { Arrow } from "@/components/Arrow";
import { SupportTabs } from "@/components/SupportTabs";

export async function generateMetadata() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return { title: dict.guides.title, description: dict.guides.intro, alternates: localizedAlternates(locale, "/guias") };
}

export default async function GuidesPage() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const t = dict.guides;
  return (
    <section className="block cat-page info-page">
      <SupportTabs current="guias" locale={locale} dict={dict} />
      <header className="cat-head">
        <div className="sk">{dict.nav.soporte}</div>
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
      </header>

      <div className="guide-toc">
        {t.items.map((g, i) => (
          <a key={g.id} href={`#${g.id}`}>
            <span>0{i + 1}</span>
            {g.h}
          </a>
        ))}
      </div>

      {t.items.map((g, i) => (
        <article key={g.id} id={g.id} className="guide">
          <span className="guide-n">0{i + 1}</span>
          <h2>{g.h}</h2>
          <ol>
            {g.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <a className="btn g" href={buildWhatsAppUrl(site.whatsappFallback, t.waGuide + g.h)} target="_blank" rel="noopener">
            {t.cta}
            <Arrow />
          </a>
        </article>
      ))}
    </section>
  );
}
