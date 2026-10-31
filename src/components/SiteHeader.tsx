import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { buildWhatsAppUrl } from "@/features/whatsapp/link";
import { site } from "@/lib/site";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { AccountNavLink } from "@/features/account/AccountNavLink";

export function SiteHeader({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const t = dict.nav;
  return (
    <nav id="nav">
      <Link className="brand" href={`/${locale}`} aria-label={site.name}>
        <Image src="/logo.png" alt="" width={34} height={34} priority />
        <b>
          JF <em>MOTORES</em>
        </b>
      </Link>
      <div className="nlinks">
        <Link href={`/${locale}/motobombas`}>{t.motobombas}</Link>
        <Link href={`/${locale}/motores`}>{t.motores}</Link>
        <Link href={`/${locale}/repuestos`}>{t.repuestos}</Link>
        <Link href={`/${locale}#contacto`}>{t.contacto}</Link>
      </div>
      <div className="nav-right">
        <LanguageSwitcher current={locale} label={t.language} />
        <AccountNavLink locale={locale} signIn={dict.account.signIn} myAccount={dict.account.myAccount} />
        <a
          className="ncta"
          href={buildWhatsAppUrl(site.whatsappFallback, dict.whatsapp.general)}
          target="_blank"
          rel="noopener"
        >
          {t.cta}
        </a>
      </div>
    </nav>
  );
}
