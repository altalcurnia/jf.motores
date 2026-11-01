import Link from "next/link";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { localizedAlternates } from "@/i18n/metadata";
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
        <div className="cat-actions app-hero-cta">
          <Link className="btn y" href={`/${locale}/app/registro`}>
            {t.cta}
            <Arrow />
          </Link>
        </div>
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
      </section>

      <section className="block app-plans" id="planes">
        <h2 className="info-h2">{t.plansTitle}</h2>
        <p className="app-intro">{t.plansIntro}</p>
        <div className="plan-grid">
          {t.plans.map((plan, i) => (
            <article key={plan.name} className={`plan ${i === 1 ? "featured" : ""}`}>
              {i === 1 && <span className="plan-flag">{t.recommended}</span>}
              <span className="plan-tag">{plan.tag}</span>
              <h3>{plan.name}</h3>
              {i > 0 && <p className="plan-prev">{t.includesPrev}</p>}
              <ul>
                {plan.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
              <p className="plan-needs">{plan.needs}</p>
            </article>
          ))}
        </div>
        <p className="app-disclaimer">{t.plansNote}</p>
        <p className="app-disclaimer">{t.disclaimer}</p>
        <div className="cat-actions">
          <Link className="btn y" href={`/${locale}/app/registro`}>
            {t.cta}
            <Arrow />
          </Link>
          <Link className="btn g" href={`/${locale}/cuenta`}>
            {t.back}
          </Link>
        </div>
      </section>
    </div>
  );
}
