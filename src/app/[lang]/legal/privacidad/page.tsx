import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { localizedAlternates } from "@/i18n/metadata";
import { getCompanyInfo } from "@/lib/supabase/public";
import { site } from "@/lib/site";

export async function generateMetadata() {
  const dict = await getDictionary();
  return { title: dict.legal.privacyTitle, alternates: localizedAlternates(await getLocale(), "/legal/privacidad") };
}

/** Política de tratamiento de datos (Ley 1581/2012). Toma razón social, NIT y dirección del panel. */
export default async function PrivacyPage() {
  const t = (await getDictionary()).legal;
  const company = await getCompanyInfo();
  const fill = (text: string) =>
    text
      .replace("{legalName}", company.legalName ?? t.pending)
      .replace("{nit}", company.nit ?? t.pending)
      .replace("{address}", company.address ?? site.workshopAddress)
      .replace("{phone}", company.phone ?? site.phoneDisplay);
  const isDraft = !company.legalName || !company.nit;

  return (
    <section className="block legal-page">
      <h1>{t.privacyTitle}</h1>
      <p className="acc-muted">{t.updated}</p>
      {isDraft && <div className="acc-notice warn">{t.draftNotice}</div>}
      {t.sections.map((s) => (
        <div key={s.h} className="legal-section">
          <h2>{s.h}</h2>
          <p>{fill(s.p)}</p>
        </div>
      ))}
    </section>
  );
}
