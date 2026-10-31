import Image from "next/image";
import Link from "next/link";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { buildWhatsAppUrl } from "@/features/whatsapp/link";
import { site } from "@/lib/site";
import { Arrow } from "@/components/Arrow";
import { FallbackImage } from "@/components/FallbackImage";
import { EngineExperience } from "@/features/engine3d/EngineExperience";

// Foto de referencia temporal (servidor externo). Se reemplaza por fotos propias desde el panel.
const BENEFITS_IMAGE =
  "https://image.qwenlm.ai/public_source/0b9b4f50-6968-461a-9931-f52210560732/165e11408-37e4-4eec-908d-1dfbb476b268.png";

const catalogKeys = ["motobombas", "motores", "repuestos"] as const;

export default async function HomePage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const t = dict.hero;
  const b = dict.benefits;
  const wa = buildWhatsAppUrl(site.whatsappFallback, dict.whatsapp.general);

  return (
    <>
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

      <EngineExperience
        locale={locale}
        t={{ journey: dict.journey, hud: dict.hud, rail: dict.rail, parts: dict.parts }}
      />

      <div className="post">
        <div className="marquee" aria-hidden="true">
          <div className="track">
            {[0, 1].map((copy) =>
              dict.marquee.map((item, i) => (
                <span key={`${copy}-${i}`} className="mq-item">
                  <span>{item}</span>
                  <span>◆</span>
                </span>
              )),
            )}
          </div>
        </div>

        <section className="block" id="beneficios">
          <div className="sec-head">
            <div>
              <div className="sk reveal">{b.kicker}</div>
              <h2 className="reveal">
                {b.title1}
                <em>{b.titleEm}</em>
                {b.title2}
              </h2>
            </div>
            <p className="reveal">{b.intro}</p>
          </div>
          <div className="b-grid">
            <div className="b-visual reveal">
              <FallbackImage src={BENEFITS_IMAGE} alt={b.imageAlt} />
              <div className="bv-bar">
                <span>{b.bar1}</span>
                <span>{b.bar2}</span>
              </div>
            </div>
            <div>
              {b.rows.map((row, i) => (
                <div className="b-row reveal" key={row.h3}>
                  <div className="num">/{String(i + 1).padStart(2, "0")}</div>
                  <div>
                    <h3>{row.h3}</h3>
                    <p>{row.p}</p>
                  </div>
                  <div className="arr">↗</div>
                </div>
              ))}
            </div>
          </div>
          <div className="spec-strip" id="specs">
            {b.specs.map((sp) => (
              <div className="reveal" key={sp.span}>
                <b>{sp.b}</b>
                <span>{sp.span}</span>
              </div>
            ))}
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
      </div>
    </>
  );
}
