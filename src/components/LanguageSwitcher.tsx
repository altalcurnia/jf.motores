"use client";
import { usePathname, useRouter } from "next/navigation";
import { LOCALE_COOKIE, locales, localeNames, switchLocalePath, type Locale } from "@/i18n/config";

export function LanguageSwitcher({ current, label }: { current: Locale; label: string }) {
  const pathname = usePathname();
  const router = useRouter();

  function change(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    // Conserva los filtros (?categoria=…) y el ancla al cambiar de idioma
    router.push(switchLocalePath(pathname, next) + window.location.search + window.location.hash);
  }

  return (
    <label className="lang-switch">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={current}
        onChange={(e) => change(e.target.value as Locale)}
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {l.toUpperCase()} · {localeNames[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
