import Link from "next/link";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { localizedAlternates } from "@/i18n/metadata";
import { buildWhatsAppUrl } from "@/features/whatsapp/link";
import { site } from "@/lib/site";
import { Arrow } from "@/components/Arrow";
import { AppStory } from "@/features/app-preview/AppStory";

export async function generateMetadata() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return {
    title: `${dict.app.title} · ${dict.app.badge}`,
    description: dict.app.intro,
    alternates: localizedAlternates(locale, "/app"),
  };
}

/** Presentación de la futura app de monitoreo (en construcción). */
export default async function AppPreviewPage() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const t = dict.app;
  return (
    <div className="app-page">
      <section className="block app-hero">
        <span className="app-badge">{t.badge}</span>
        <div className="sk">{t.kicker}</div>
        <h1>{t.title}</h1>
        <p className="app-sub">{t.subtitle}</p>
        <p className="app-intro">{t.intro}</p>
        <span className="app-scroll">{t.scroll} ↓</span>
      </section>

      <AppStory phases={t.phases} screen={t.screen} unit="JF-M40 · #0042" />

      <section className="block app-features">
        <h2 className="info-h2">{t.featuresTitle}</h2>
        <div className="help-grid">
          {t.features.map((f) => (
            <div key={f.h} className="help-card">
              <h2>{f.h}</h2>
              <p>{f.p}</p>
            </div>
          ))}
        </div>
        <p className="app-disclaimer">{t.disclaimer}</p>
        <div className="cat-actions">
          <a className="btn y" href={buildWhatsAppUrl(site.whatsappFallback, t.wa)} target="_blank" rel="noopener">
            {t.cta}
            <Arrow />
          </a>
          <Link className="btn g" href={`/${locale}/cuenta`}>
            {t.back}
          </Link>
        </div>
      </section>
    </div>
  );
}
