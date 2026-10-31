import Image from "next/image";
import Link from "next/link";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { buildWhatsAppUrl } from "@/features/whatsapp/link";
import { site } from "@/lib/site";
import { Arrow } from "@/components/Arrow";

const catalogKeys = ["motobombas", "motores", "repuestos"] as const;

export default async function HomePage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const t = dict.hero;
  const wa = buildWhatsAppUrl(site.whatsappFallback, dict.whatsapp.general);

  return (
    <>
      {/* El motor 3D (día 5) se monta detrás de este hero. */}
      <section id="hero">
        <div className="hero-in">
          <div className="kicker">{t.kicker}</div>
          <div className="logo-row" id="logoRow">
            <Image className="logo-mark" src="/logo.png" alt="Logo JF Motores" width={120} height={120} priority />
            <div className="wordmark">
              <span className="wm1">JF MOTORES</span>
              <span className="wm2">MEDELLÍN</span>
            </div>
          </div>
          <div className="slogan">
            <i />
            {t.slogan}
          </div>
          <h1>
            <span className="ln">
              <i>{t.line1}</i>
            </span>
            <span className="ln">
              <i>
                {t.line2a}
                <span className="yl">{t.line2b}</span>
                {t.line2c}
              </i>
            </span>
            <span className="ln">
              <i>{t.line3}</i>
            </span>
          </h1>
          <p className="copy">{t.copy}</p>
          <div className="cta-row">
            <a className="btn y" href={wa} target="_blank" rel="noopener">
              {t.ctaPrimary}
              <Arrow />
            </a>
            <Link className="btn g" href={`/${locale}/motobombas`}>
              {t.ctaSecondary}
            </Link>
          </div>
        </div>
        <div className="scroll-hint">
          <span className="wire">
            <i />
          </span>
          {t.scrollHint}
        </div>
        <div className="hero-spec">
          <b>{t.spec1}</b>
          <br />
          {t.spec2}
          <br />
          {t.spec3}
        </div>
      </section>

      <section className="block" id="catalogos">
        <div className="sk reveal">{dict.catalogs.kicker}</div>
        <h2 className="reveal">{dict.catalogs.title}</h2>
        <div className="catalog-cards">
          {catalogKeys.map((key) => (
            <Link key={key} href={`/${locale}/${key}`} className="catalog-card reveal">
              <h3>{dict.catalogs.items[key].title}</h3>
              <p>{dict.catalogs.items[key].desc}</p>
              <span className="catalog-card-cta">
                {dict.catalogs.cta} <Arrow />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="block" id="contacto">
        <div className="sk reveal">{dict.contact.kicker}</div>
        <div className="big reveal">
          {dict.contact.title1}
          <br />
          <em>{dict.contact.title2}</em>
        </div>
        <div className="c-row reveal">
          <a className="btn y" href={wa} target="_blank" rel="noopener">
            {dict.contact.cta}
            <Arrow />
          </a>
        </div>
        <div className="c-meta reveal">
          <div>
            <b>{dict.contact.workshop}</b>
            {site.workshopAddress}
          </div>
          <div>
            <b>{dict.contact.phone}</b>
            {site.phoneDisplay}
          </div>
        </div>
      </section>
    </>
  );
}
