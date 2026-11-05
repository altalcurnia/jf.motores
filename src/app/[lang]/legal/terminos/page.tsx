import Link from "next/link";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { localizedAlternates } from "@/i18n/metadata";
import { formatPhone, getCompanyInfo, getContact, getTrust } from "@/lib/supabase/public";
import { site } from "@/lib/site";

export async function generateMetadata() {
  const dict = await getDictionary();
  return { title: dict.legal.termsTitle, alternates: localizedAlternates(await getLocale(), "/legal/terminos") };
}

/** Términos y condiciones (Ley 1480 de 2011). Toma razón social, NIT, dirección, IVA y contacto del panel. */
export default async function TermsPage() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const t = dict.legal;
  const [company, contact, trust] = await Promise.all([getCompanyInfo(), getContact(), getTrust()]);
  const vat = trust.vat === true ? t.vatYes : trust.vat === false ? t.vatNo : t.vatUnknown;
  const fill = (text: string) =>
    text
      .replace("{legalName}", company.legalName ?? t.pending)
      .replace("{nit}", company.nit ?? t.pending)
      .replace("{address}", company.address ?? site.workshopAddress)
      .replaceAll("{email}", contact.email ?? t.pending)
      .replaceAll("{phone}", formatPhone(contact.whatsapp))
      .replace("{vat}", vat);
  const isDraft = !company.legalName || !company.nit;

  return (
    <section className="block legal-page">
      <h1>{t.termsTitle}</h1>
      <p className="acc-muted">{t.termsUpdated}</p>
      {isDraft && <div className="acc-notice warn">{t.draftNotice}</div>}
      {t.termsSections.map((s) => (
        <div key={s.h} className="legal-section">
          <h2>{s.h}</h2>
          <p>{fill(s.p)}</p>
        </div>
      ))}
      <p className="legal-links">
        <Link href={`/${locale}/legal/privacidad`}>{t.privacyTitle}</Link> ·{" "}
        <a href="https://www.sic.gov.co" target="_blank" rel="noopener">
          {t.sic}
        </a>
      </p>
    </section>
  );
}
