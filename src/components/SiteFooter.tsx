import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { site } from "@/lib/site";
import { ConsentSettingsLink } from "@/features/analytics/Consent";
import { getTrust } from "@/lib/supabase/public";

export async function SiteFooter({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  const trust = await getTrust();
  return (
    <footer>
      <div className="fbrand">
        <Image src="/logo.png" alt="" width={34} height={34} />
        JF <em style={{ color: "var(--yellow)" }}>MOTORES</em>
      </div>
      <p>
        © {site.name} — Medellín, Colombia · <em>{dict.footer.slogan}</em>
        {trust.legalName && (
          <>
            <br />
            <small className="footer-legal">
              {trust.legalName}
              {trust.nit && ` · NIT ${trust.nit}`}
            </small>
          </>
        )}
        <br />
        <span className="footer-links">
          <Link className="footer-link" href={`/${locale}/soporte`}>
            {dict.nav.soporte}
          </Link>
          <Link className="footer-link" href={`/${locale}/guias`}>
            {dict.nav.guias}
          </Link>
          <Link className="footer-link" href={`/${locale}/legal/privacidad`}>
            {dict.footer.privacy}
          </Link>
          <Link className="footer-link" href={`/${locale}/legal/terminos`}>
            {dict.legal.terms}
          </Link>
          <ConsentSettingsLink label={dict.consent.settings} />
          <a className="footer-link" href="https://www.sic.gov.co" target="_blank" rel="noopener">
            SIC
          </a>
        </span>
      </p>
    </footer>
  );
}
