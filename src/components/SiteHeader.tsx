import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { waLead } from "@/features/whatsapp/lead-link";
import { site } from "@/lib/site";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { AccountNavLink } from "@/features/account/AccountNavLink";
import { CatalogMenu } from "./CatalogMenu";
import { EmailChooser } from "./EmailChooser";
import { MobileMenu } from "./MobileMenu";
import { formatPhone, getContact } from "@/lib/supabase/public";

export async function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const contact = await getContact();
  const t = dict.nav;
  const l = (path: string) => `/${locale}${path}`;
  const wa = waLead({ message: dict.whatsapp.general, source: "cabecera", locale });
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
                { href: l("/legal/terminos"), label: dict.legal.terms },
              ],
            },
          ]}
          footer={
            <>
              <LanguageSwitcher current={locale} label={t.language} />
              <a className="btn y drawer-cta" href={wa} target="_blank" rel="noopener">
                {t.writeUs}
              </a>
              <a className="drawer-phone" href={`tel:+${contact.phones[0].number}`}>
                {formatPhone(contact.phones[0].number)}
              </a>
              {contact.email && (
                <EmailChooser email={contact.email} labels={dict.mail} className="drawer-phone" inline />
              )}
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
        <CatalogMenu
          label={t.soporte}
          lastIsAll={false}
          items={[
            { href: l("/soporte"), title: t.techSupport, desc: t.techSupportDesc },
            { href: l("/guias"), title: t.guias, desc: t.guiasDesc },
          ]}
          activePaths={[l("/soporte"), l("/guias"), l("/videos")]}
        />
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
