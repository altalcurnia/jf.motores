import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

/** Pestañas de Soporte: Soporte técnico · Guías · Videos, con el título «Soporte» arriba. */
export function SupportTabs({ current, locale, dict }: { current: "soporte" | "guias" | "videos"; locale: Locale; dict: Dictionary }) {
  const tabs = [
    { key: "soporte", href: `/${locale}/soporte`, label: dict.nav.techSupport },
    { key: "guias", href: `/${locale}/guias`, label: dict.nav.guias },
    { key: "videos", href: `/${locale}/videos`, label: dict.nav.videos },
  ];
  return (
    <div className="support-top">
      <div className="sk">{dict.nav.soporte}</div>
      <div className="cat-tabs" role="navigation" aria-label={dict.nav.soporte}>
        {tabs.map((t) => (
          <Link key={t.key} href={t.href} className={t.key === current ? "on" : ""} aria-current={t.key === current ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
