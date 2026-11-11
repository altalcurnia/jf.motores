export const locales = ["es", "en", "pt"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const localeNames: Record<Locale, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
};

/** Etiqueta BCP-47 para Intl (moneda, fechas) y para hreflang. */
export const localeTags: Record<Locale, string> = {
  es: "es-CO",
  en: "en-US",
  pt: "pt-BR",
};

export function hasLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/**
 * Elige el idioma a partir del encabezado Accept-Language.
 * Ej.: "pt-BR,pt;q=0.9,en;q=0.8" -> "pt".
 */
export function matchLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return defaultLocale;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { base: tag.trim().toLowerCase().split("-")[0], q: q ? Number(q.split("=")[1]) : 1 };
    })
    .filter((x) => x.base && !Number.isNaN(x.q))
    .sort((a, b) => b.q - a.q);
  for (const { base } of ranked) {
    if (hasLocale(base)) return base;
  }
  return defaultLocale;
}

/** Cambia el prefijo de idioma de una ruta: ("/es/motores", "en") -> "/en/motores". */
export function switchLocalePath(pathname: string, next: Locale): string {
  const parts = pathname.split("/");
  if (hasLocale(parts[1])) {
    parts[1] = next;
    return parts.join("/") || `/${next}`;
  }
  return `/${next}${pathname === "/" ? "" : pathname}`;
}
