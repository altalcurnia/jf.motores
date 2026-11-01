import Link from "next/link";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { localizedAlternates } from "@/i18n/metadata";
import { buildWhatsAppUrl } from "@/features/whatsapp/link";
import { site } from "@/lib/site";
import { Arrow } from "@/components/Arrow";
import { SupportTabs } from "@/components/SupportTabs";

export async function generateMetadata() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return { title: dict.support.title, description: dict.support.intro, alternates: localizedAlternates(locale, "/soporte") };
}

export default async function SupportPage() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const t = dict.support;
  const hrefs = [
    buildWhatsAppUrl(site.whatsappFallback, t.waTech),
    `/${locale}/repuestos`,
    `/${locale}/cuenta`,
    `/${locale}/guias`,
  ];
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: t.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <section className="block cat-page info-page">
      <SupportTabs current="soporte" locale={locale} dict={dict} />
      <header className="cat-head">
        <div className="sk">{dict.nav.soporte}</div>
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
      </header>

      <div className="help-grid">
        {t.cards.map((c, i) => {
          const external = hrefs[i].startsWith("http");
          const body = (
            <>
              <h2>{c.h}</h2>
              <p>{c.p}</p>
              <span className="catalog-card-cta">
                {c.cta} <Arrow />
              </span>
            </>
          );
          return external ? (
            <a key={c.h} className={`help-card ${i === 0 ? "primary" : ""}`} href={hrefs[i]} target="_blank" rel="noopener">
              {body}
            </a>
          ) : (
            <Link key={c.h} className="help-card" href={hrefs[i]}>
              {body}
            </Link>
          );
        })}
      </div>

      <h2 className="info-h2" id="faq">
        {t.faqTitle}
      </h2>
      <div className="faq">
        {t.faq.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
    </section>
  );
}
