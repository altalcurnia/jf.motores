import Link from "next/link";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { waLead } from "@/features/whatsapp/lead-link";
import { getContact } from "@/lib/supabase/public";
import { Arrow } from "@/components/Arrow";
import { SupportTabs } from "@/components/SupportTabs";
import { TechSupportCard } from "@/features/support/TechSupportCard";
import { pageMetadata } from "@/i18n/page-metadata";

export async function generateMetadata() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return pageMetadata({ locale, path: "/soporte", title: dict.support.title, description: dict.support.intro });
}

export default async function SupportPage() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const t = dict.support;
  const contact = await getContact();
  const hrefs = [
    waLead({ message: t.waTech, source: "soporte", locale }),
    `/${locale}/repuestos`,
    `/${locale}/cuenta`,
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
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
      </header>

      <div className="help-grid">
        {t.cards.map((c, i) => {
          if (i === 0) {
            return (
              <TechSupportCard
                key={c.h}
                h={c.h}
                p={c.p}
                cta={c.cta}
                waHref={hrefs[0]}
                email={contact.email}
                labels={t.techOptions}
                mail={dict.mail}
              />
            );
          }
          return (
            <Link key={c.h} className="help-card" href={hrefs[i]}>
              <h2>{c.h}</h2>
              <p>{c.p}</p>
              <span className="catalog-card-cta">
                {c.cta} <Arrow />
              </span>
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
