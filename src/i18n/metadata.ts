import type { Metadata } from "next";
import { locales, localeTags, type Locale } from "./config";

/** canonical + hreflang para una ruta, p. ej. ("es", "/motores"). */
export function localizedAlternates(locale: Locale, path = ""): Metadata["alternates"] {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(locales.map((l) => [localeTags[l], `/${l}${path}`])),
      "x-default": `/es${path}`,
    },
  };
}
