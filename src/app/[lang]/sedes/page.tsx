import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { formatPhone, getBranchesPage } from "@/lib/supabase/public";
import { fill, tr } from "@/features/catalog/shared";
import { waLead } from "@/features/whatsapp/lead-link";
import { JsonLd } from "@/components/JsonLd";
import { site } from "@/lib/site";
import { BranchTabs, type BranchView } from "@/features/branches/BranchTabs";
import { pageMetadata } from "@/i18n/page-metadata";

export async function generateMetadata() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return pageMetadata({ locale, path: "/sedes", title: dict.branches.title, description: dict.branches.intro });
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "JF"
  );
}

export default async function SedesPage() {
  const [locale, dict, data] = await Promise.all([getLocale(), getDictionary(), getBranchesPage()]);
  const t = dict.branches;

  const views: BranchView[] = data.branches.map((b) => {
    const phoneDigits = b.phone ? b.phone.replace(/\D/g, "") : "";
    const phoneNorm = phoneDigits.length === 10 && phoneDigits.startsWith("3") ? `57${phoneDigits}` : phoneDigits;
    return {
      id: b.id,
      slug: b.slug,
      name: b.name,
      city: b.city,
      address: b.address,
      phone: phoneNorm || b.phone,
      phoneFormatted: phoneNorm ? formatPhone(phoneNorm) : b.phone,
      hours: tr(b.hours, locale),
      description: tr(b.description, locale),
      mapQuery: b.mapQuery,
      mapTitle: fill(t.mapTitle, { name: b.name }),
      advisorsTitle: fill(t.advisors, { city: b.city }),
      photos: b.photos,
      generalWaHref: waLead({
        source: "sedes",
        locale,
        message: fill(t.waMessage, { name: site.name, city: b.city }),
      }),
      advisors: b.advisors.map((a) => ({
        id: a.id,
        name: a.name,
        initials: initials(a.name),
        title: tr(a.title, locale),
        photoUrl: a.photoUrl,
        phone: a.phone,
        phoneFormatted: formatPhone(a.phone),
        email: a.email,
        waHref: waLead({
          advisorId: a.id,
          source: "sedes",
          locale,
          message: fill(t.waMessage, { name: a.name, city: b.city }),
        }),
      })),
    };
  });

  const base = site.url.replace(/\/$/, "");
  const jsonLd = data.branches.map((b) => ({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `${site.name} — ${b.name}`,
    url: `${base}/${locale}/sedes#${b.slug}`,
    telephone: b.phone ? `+${b.phone.replace(/\D/g, "")}` : `+${data.whatsapp}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: b.address ?? undefined,
      addressLocality: b.city,
      addressCountry: "CO",
    },
    ...(b.lat != null && b.lng != null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: b.lat,
            longitude: b.lng,
          },
        }
      : {}),
  }));

  return (
    <section className="block cat-page info-page sedes-page">
      <header className="cat-head">
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
      </header>
      <BranchTabs branches={views} labels={t} mail={dict.mail} />
      <JsonLd data={jsonLd} />
    </section>
  );
}

