import type { MetadataRoute } from "next";
import { locales, localeTags } from "@/i18n/config";
import { site } from "@/lib/site";
import { getCatalogData } from "@/features/catalog/data";
import { catalogPaths, storageUrl } from "@/features/catalog/shared";
import { partKeys } from "@/features/engine3d/parts";

/** Mapa del sitio para buscadores: páginas públicas y productos en los tres idiomas. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url.replace(/\/$/, "");
  const entry = (
    path: string,
    opts: { priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly"; lastModified?: string; images?: string[] },
  ) =>
    locales.map((l) => ({
      url: `${base}/${l}${path}`,
      lastModified: opts.lastModified ?? undefined,
      changeFrequency: opts.changeFrequency,
      priority: opts.priority,
      images: opts.images,
      alternates: {
        languages: Object.fromEntries(locales.map((x) => [localeTags[x], `${base}/${x}${path}`])),
      },
    }));

  const pages: MetadataRoute.Sitemap = [
    ...entry("", { priority: 1, changeFrequency: "weekly" }),
    ...entry("/catalogo", { priority: 0.9, changeFrequency: "daily" }),
    ...entry("/motobombas", { priority: 0.9, changeFrequency: "daily" }),
    ...entry("/motores", { priority: 0.9, changeFrequency: "daily" }),
    ...entry("/repuestos", { priority: 0.9, changeFrequency: "daily" }),
    ...entry("/guias", { priority: 0.6, changeFrequency: "monthly" }),
    ...entry("/videos", { priority: 0.5, changeFrequency: "monthly" }),
    ...entry("/soporte", { priority: 0.5, changeFrequency: "monthly" }),
    ...entry("/app", { priority: 0.4, changeFrequency: "monthly" }),
    ...entry("/legal/terminos", { priority: 0.2, changeFrequency: "yearly" }),
    ...entry("/legal/privacidad", { priority: 0.2, changeFrequency: "yearly" }),
    ...partKeys.flatMap((k) => entry(`/repuestos/${k}`, { priority: 0.6, changeFrequency: "weekly" })),
  ];

  let products: MetadataRoute.Sitemap = [];
  try {
    const data = await getCatalogData();
    products = data.products.flatMap((p) =>
      entry(`/${catalogPaths[p.catalog]}/${p.slug}`, {
        priority: p.status === "disponible" ? 0.8 : 0.5,
        changeFrequency: "weekly",
        lastModified: p.publishedAt,
        images: p.images.slice(0, 3).map((i) => {
          const u = storageUrl(i.path, process.env.NEXT_PUBLIC_SUPABASE_URL);
          return u.startsWith("http") ? u : `${base}${u}`;
        }),
      }),
    );
  } catch {
    // Sin base de datos el mapa sigue saliendo con las páginas fijas
  }
  return [...pages, ...products];
}
