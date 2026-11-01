import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { buildWhatsAppUrl } from "@/features/whatsapp/link";
import { site } from "@/lib/site";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { AccountNavLink } from "@/features/account/AccountNavLink";
import { CatalogMenu } from "./CatalogMenu";
import { MobileMenu } from "./MobileMenu";

export function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.nav;
  const l = (path: string) => `/${locale}${path}`;
  const wa = buildWhatsAppUrl(site.whatsappFallback, dict.whatsapp.general);
  const catalogItems = [
    ...(["motobombas", "motores", "repuestos"] as const).map((k) => ({
      href: l(`/${k}`),
      title: dict.catalogs.items[k].title,
      desc: dict.catalogs.items[k].desc,
    })),
    { href: l("/catalogo"), title: `${t.viewAll} →`, desc: dict.catalogs.allDesc },
  ];

  return (
    <nav id="nav">
      <div className="nav-left">
        <MobileMenu
          labels={{ open: t.menu, close: t.close }}
          sections={[
            { links: [{ href: l(""), label: t.home }] },
            {
              title: t.secCatalog,
              links: [
                { href: l("/catalogo"), label: t.viewAll },
                { href: l("/motobombas"), label: t.motobombas },
                { href: l("/motores"), label: t.motores },
                { href: l("/repuestos"), label: t.repuestos },
                { href: l("/guias#pedir-repuesto"), label: t.findPart },
              ],
            },
            {
              title: t.soporte,
              links: [
                { href: l("/soporte"), label: t.techSupport },
                { href: l("/guias"), label: t.guias },
                { href: l("/soporte#faq"), label: t.faq },
                { href: l("#contacto"), label: t.contacto },
              ],
            },
            {
              title: t.secAccount,
              links: [
                { href: l("/cuenta"), label: dict.account.myAccount },
                { href: l("/legal/privacidad"), label: dict.footer.privacy },
              ],
            },
          ]}
          footer={
            <>
              <LanguageSwitcher current={locale} label={t.language} />
              <a className="btn y drawer-cta" href={wa} target="_blank" rel="noopener">
                {t.writeUs}
              </a>
              <a className="drawer-phone" href={`tel:+${site.whatsappFallback}`}>
                {site.phoneDisplay}
              </a>
            </>
          }
        />
        <Link className="brand" href={`/${locale}`} aria-label={site.name}>
          <Image src="/logo.png" alt="" width={34} height={34} priority />
          <b>
            JF <em>MOTORES</em>
          </b>
        </Link>
      </div>
      <div className="nlinks">
        <Link href={l("")}>{t.home}</Link>
        <CatalogMenu label={t.catalog} items={catalogItems} />
        <Link href={l("/soporte")}>{t.soporte}</Link>
        <Link href={l("#contacto")}>{t.contacto}</Link>
      </div>
      <div className="nav-right">
        <span className="nav-lang">
          <LanguageSwitcher current={locale} label={t.language} />
        </span>
        <AccountNavLink locale={locale} signIn={dict.account.signIn} myAccount={dict.account.myAccount} />
        <a className="ncta" href={wa} target="_blank" rel="noopener">
          {t.cta}
        </a>
      </div>
    </nav>
  );
}
