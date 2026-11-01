import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { localizedAlternates } from "@/i18n/metadata";
import { SupportTabs } from "@/components/SupportTabs";
import { videoItems } from "@/features/library/items";
import { VideoGallery } from "@/features/library/VideoGallery";

export async function generateMetadata() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return { title: dict.guides.videos.title, description: dict.guides.videos.intro, alternates: localizedAlternates(locale, "/videos") };
}

export default async function VideosPage() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const t = dict.guides.videos;
  return (
    <section className="block cat-page info-page">
      <SupportTabs current="videos" locale={locale} dict={dict} />
      <header className="cat-head">
        <div className="sk">{dict.nav.soporte}</div>
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
      </header>
      <VideoGallery
        videos={videoItems.map((v) => ({
          id: v.id,
          title: t.items[v.id as keyof typeof t.items].h,
          source: v.source,
          lang: v.lang === "es" ? dict.guides.library.langEs : dict.guides.library.langEn,
          youtube: v.youtube,
          url: v.url,
        }))}
        labels={{ play: t.play, openSite: t.openSite, modes: t.modes }}
      />
      <p className="video-note">{t.note}</p>
    </section>
  );
}
