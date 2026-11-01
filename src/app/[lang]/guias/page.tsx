import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { localizedAlternates } from "@/i18n/metadata";
import { buildWhatsAppUrl } from "@/features/whatsapp/link";
import { getContact } from "@/lib/supabase/public";
import { Arrow } from "@/components/Arrow";
import { SupportTabs } from "@/components/SupportTabs";
import { libraryGroups, libraryItems } from "@/features/library/items";

export async function generateMetadata() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return { title: dict.guides.title, description: dict.guides.intro, alternates: localizedAlternates(locale, "/guias") };
}

export default async function GuidesPage() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const t = dict.guides;
  const contact = await getContact();
  return (
    <section className="block cat-page info-page">
      <SupportTabs current="guias" locale={locale} dict={dict} />
      <header className="cat-head">
        <div className="sk">{dict.nav.soporte}</div>
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
      </header>

      {/* Biblioteca técnica gratuita: documentos oficiales; se abren con sesión */}
      <section id="biblioteca" className="library">
        <div className="library-head">
          <span className="library-kicker">{t.library.kicker}</span>
          <h2>{t.library.title}</h2>
          <p>{t.library.intro}</p>
          <p className="library-login">🔒 {t.library.loginNote}</p>
        </div>
        {libraryGroups.map((g) => (
          <div key={g} className="library-group">
            <h3>{t.library.groups[g]}</h3>
            <div className="library-grid">
              {libraryItems
                .filter((i) => i.group === g)
                .map((i) => {
                  const text = t.library.items[i.id as keyof typeof t.library.items];
                  return (
                    <article key={i.id} className="library-card">
                      <div className="library-meta">
                        <span>{i.source}</span>
                        <span>{i.lang === "es" ? t.library.langEs : t.library.langEn}</span>
                      </div>
                      <h4>{text.h}</h4>
                      <p>{text.p}</p>
                      <small>{i.file ? t.library.hosted : t.library.official}</small>
                      <a className="btn g" href={`/api/biblioteca/${i.id}?lang=${locale}`} target="_blank" rel="noopener">
                        {i.file ? t.library.open : t.library.openOfficial}
                        <Arrow />
                      </a>
                    </article>
                  );
                })}
            </div>
          </div>
        ))}
        <aside className="library-tip">
          <b>{t.library.criteriaTitle}</b>
          <p>{t.library.criteria}</p>
        </aside>
      </section>

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
          <a className="btn g" href={buildWhatsAppUrl(contact.whatsapp, t.waGuide + g.h)} target="_blank" rel="noopener">
            {t.cta}
            <Arrow />
          </a>
        </article>
      ))}
    </section>
  );
}
