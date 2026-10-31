import type { Metadata, Viewport } from "next";
import "@fontsource/archivo/700.css";
import "@fontsource/archivo/900.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/700.css";
import "../legacy.css";
import "../globals.css";
import { locales, localeTags } from "@/i18n/config";
import { localizedAlternates } from "@/i18n/metadata";
import { getDictionary, getLocale } from "@/i18n/dictionaries";
import { site } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteEffects } from "@/components/SiteEffects";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = await getDictionary();
  return {
    metadataBase: new URL(site.url),
    title: { default: dict.meta.title, template: `%s | ${site.name}` },
    description: dict.meta.description,
    alternates: localizedAlternates(locale),
    openGraph: {
      type: "website",
      siteName: site.name,
      title: dict.meta.title,
      description: dict.meta.description,
      locale: localeTags[locale].replace("-", "_"),
      images: ["/logo.png"],
    },
  };
}

export const viewport: Viewport = { themeColor: "#0b0d10" };

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await getLocale();
  const dict = await getDictionary();
  return (
    <html lang={localeTags[locale]}>
      <body>
        <SiteHeader locale={locale} dict={dict} />
        <main>{children}</main>
        <SiteFooter dict={dict} />
        <SiteEffects />
      </body>
    </html>
  );
}
