import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Qué pueden recorrer los buscadores. El panel, la API y las cuentas quedan fuera.
 * (Vercel ya marca sus vistas previas como "no indexar"; solo el dominio de producción aparece.)
 */
export default function robots(): MetadataRoute.Robots {
  const base = site.url.replace(/\/$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/auth/", "/*/cuenta"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
