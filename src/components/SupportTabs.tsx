import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

/** Pestañas de Soporte: Soporte técnico · Guías · Preguntas frecuentes. */
export function SupportTabs({ current, locale, dict }: { current: "soporte" | "guias"; locale: Locale; dict: Dictionary }) {
  const tabs = [
    { key: "soporte", href: `/${locale}/soporte`, label: dict.nav.techSupport },
    { key: "guias", href: `/${locale}/guias`, label: dict.nav.guias },
    { key: "faq", href: `/${locale}/soporte#faq`, label: dict.nav.faqShort },
  ];
  return (
    <div className="cat-tabs" role="navigation" aria-label={dict.nav.soporte}>
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} className={t.key === current ? "on" : ""} aria-current={t.key === current ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
