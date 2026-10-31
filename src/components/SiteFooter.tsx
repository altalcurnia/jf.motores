import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { site } from "@/lib/site";

export function SiteFooter({ dict, locale }: { dict: Dictionary; locale: Locale }) {
  return (
    <footer>
      <div className="fbrand">
        <Image src="/logo.png" alt="" width={34} height={34} />
        JF <em style={{ color: "var(--yellow)" }}>MOTORES</em>
      </div>
      <p>
        © {site.name} — Medellín, Colombia · <em>{dict.footer.slogan}</em>
        <br />
        <small className="price-notice">{dict.footer.priceNotice}</small>
        <br />
        <Link className="footer-link" href={`/${locale}/legal/privacidad`}>
          {dict.footer.privacy}
        </Link>
      </p>
    </footer>
  );
}
