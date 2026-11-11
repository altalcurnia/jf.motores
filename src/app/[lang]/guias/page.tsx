import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { waLead } from "@/features/whatsapp/lead-link";
import { Arrow } from "@/components/Arrow";
import { SupportTabs } from "@/components/SupportTabs";
import { libraryItems, libraryLangs, videoItems } from "@/features/library/items";
import { VideoGallery } from "@/features/library/VideoGallery";
import { GuideTabs } from "@/features/library/GuideTabs";
import { pageMetadata } from "@/i18n/page-metadata";

export async function generateMetadata() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return pageMetadata({ locale, path: "/guias", title: dict.guides.title, description: dict.guides.intro });
}

export default async function GuidesPage() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const t = dict.guides;
  const tv = t.videos;
  return (
    <section className="block cat-page info-page">
      <SupportTabs current="guias" locale={locale} dict={dict} />
      <header className="cat-head">
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
      </header>

      <GuideTabs
        labels={t.tabs}
        ourIds={t.items.map((g) => g.id)}
        official={
          <section id="biblioteca" className="library">
            <div className="library-head">
              <span className="library-kicker">{t.library.kicker}</span>
              <h2>{t.library.title}</h2>
              <p>{t.library.intro}</p>
              <p className="library-login">🔒 {t.library.loginNote}</p>
            </div>
            {libraryLangs(locale).map((lang) => (
              <div key={lang} className="library-group">
                <h3>{t.library.langTitle[lang]}</h3>
                <div className="library-grid">
                  {libraryItems
                    .filter((i) => i.lang === lang)
                    .map((i) => {
                      const text =
                        t.library.items[i.id as keyof typeof t.library.items];
                      return (
                        <article key={i.id} className="library-card">
                          <div className="library-meta">
                            <span>{i.source}</span>
                            <span>{t.library.groups[i.group]}</span>
                          </div>
                          <h4>{text.h}</h4>
                          <p>{text.p}</p>
                          <small>
                            {i.file ? t.library.hosted : t.library.official}
                          </small>
                          <a
                            className="btn g"
                            href={`/api/biblioteca/${i.id}?lang=${locale}`}
                            target="_blank"
                            rel="noopener"
                          >
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
        }
        videos={
          <section id="videos-lista" className="guide-videos">
            <p className="library-intro">{tv.intro}</p>
            {libraryLangs(locale)
              .filter((lang) => videoItems.some((v) => v.lang === lang))
              .map((lang) => (
                <div key={lang} className="video-lang">
                  <h2>{t.library.langTitle[lang]}</h2>
                  <VideoGallery
                    videos={videoItems
                      .filter((v) => v.lang === lang)
                      .map((v) => ({
                        id: v.id,
                        title: tv.items[v.id as keyof typeof tv.items].h,
                        source: v.source,
                        lang: v.lang === "es" ? t.library.langEs : t.library.langEn,
                        youtube: v.youtube,
                        url: v.url,
                      }))}
                    labels={{ play: tv.play, openSite: tv.openSite, modes: tv.modes }}
                  />
                </div>
              ))}
            <p className="video-note">{tv.note}</p>
          </section>
        }
        ours={
          <>
            {t.items.map((g, i) => (
              <article key={g.id} id={g.id} className="guide">
                <span className="guide-n">0{i + 1}</span>
                <h2>{g.h}</h2>
                <ol>
                  {g.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                <a
                  className="btn g"
                  href={waLead({ message: t.waGuide + g.h, source: "guia", locale })}
                  target="_blank"
                  rel="noopener"
                >
                  {t.cta}
                  <Arrow />
                </a>
              </article>
            ))}
          </>
        }
      />
    </section>
  );
}
