import Image from "next/image";
import Link from "next/link";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { buildWhatsAppUrl } from "@/features/whatsapp/link";
import { formatPhone, getContact } from "@/lib/supabase/public";
import { Arrow } from "@/components/Arrow";
import { FallbackImage } from "@/components/FallbackImage";
import { EngineExperience } from "@/features/engine3d/EngineExperience";
import { FeaturedProducts } from "@/features/catalog/FeaturedProducts";

// Ilustración de referencia local (public/demo). Se reemplaza por una foto real de la empresa.
const BENEFITS_IMAGE = "/demo/motobomba-isometrica.jpg";

const catalogKeys = ["motobombas", "motores", "repuestos"] as const;
// Miniaturas de referencia por categoría (public/demo); se cambian por fotos reales.
const catalogThumbs: Record<(typeof catalogKeys)[number], string> = {
  motobombas: "/demo/jf-m25.jpg",
  motores: "/demo/jf-d25.jpg",
  repuestos: "/demo/radiador-d25.jpg",
};

export default async function HomePage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const t = dict.hero;
  const b = dict.benefits;
  const contact = await getContact();
  const wa = buildWhatsAppUrl(contact.whatsapp, dict.whatsapp.general);

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
            <div className="b-left">
              <div className="b-visual reveal">
                <FallbackImage src={BENEFITS_IMAGE} alt={b.imageAlt} />
                {/* Barra inferior con el estado de prueba */}
                <div className="bv-bar" style={{ justifyContent: "flex-end" }}>
                  <span>{b.bar2}</span>
                </div>
              </div>
              {/* Datos clave compactos, justo debajo de la imagen */}
              <div className="spec-strip compact reveal" id="specs">
                {b.specs.map((sp) => (
                  <div key={sp.span}>
                    <b>{sp.b}</b>
                    <span>{sp.span}</span>
                  </div>
                ))}
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
        </section>

      <section className="block" id="catalogos">
        <div className="sk reveal">{dict.catalogs.kicker}</div>
        <h2 className="reveal">
          <Link href={`/${locale}/catalogo`} className="title-link">
            {dict.catalogs.title}
            <Arrow />
          </Link>
        </h2>
        <div className="catalog-cards">
          {catalogKeys.map((key) => (
            <Link key={key} href={`/${locale}/${key}`} className="catalog-card reveal">
              <span className="catalog-thumb">
                <FallbackImage src={catalogThumbs[key]} alt="" />
              </span>
              <h3>{dict.catalogs.items[key].title}</h3>
              <p>{dict.catalogs.items[key].desc}</p>
              <span className="catalog-card-cta">
                {dict.catalogs.cta} <Arrow />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <FeaturedProducts locale={locale} dict={dict} />

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
            {contact.branches.map((br) => (
              <span className="c-line" key={br.id}>
                <strong>{br.city}</strong> · {br.address}
              </span>
            ))}
          </div>
          <div>
            <b>{dict.contact.phone}</b>
            {contact.phones.map((ph) => (
              <a className="c-line" key={ph.number} href={`tel:+${ph.number}`}>
                {formatPhone(ph.number)}
                {ph.label && <small> · {ph.label}</small>}
              </a>
            ))}
          </div>
          {contact.email && (
            <div>
              <b>{dict.contact.email}</b>
              <a className="c-line" href={`mailto:${contact.email}`} title={dict.contact.emailHint}>
                {contact.email}
              </a>
            </div>
          )}
        </div>
      </section>
      </div>
    </>
  );
}
