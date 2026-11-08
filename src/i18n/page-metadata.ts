import type { Metadata } from "next";
import { site } from "@/lib/site";
import { localeTags, type Locale } from "./config";
import { localizedAlternates } from "./metadata";

/**
 * Metadatos de una página pública: título, descripción, canonical + hreflang y la vista previa al
 * compartir (WhatsApp, Facebook, Instagram), con el título y la descripción de ESA página.
 * `index: false` la oculta de Google (p. ej. páginas en construcción).
 */
export function pageMetadata(opts: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  image?: string;
  index?: boolean;
}): Metadata {
  const { locale, path, title, description } = opts;
  const image = opts.image ?? "/og.jpg";
  const shareTitle = `${title} | ${site.name}`;
  return {
    title,
    description,
    alternates: localizedAlternates(locale, path),
    openGraph: {
      type: "website",
      siteName: site.name,
      title: shareTitle,
      description,
      url: `/${locale}${path}`,
      locale: localeTags[locale].replace("-", "_"),
      images: [opts.image ? { url: image } : { url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title: shareTitle, description, images: [image] },
    ...(opts.index === false ? { robots: { index: false, follow: true } } : {}),
  };
}
