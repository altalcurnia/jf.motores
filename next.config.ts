import type { NextConfig } from "next";

/** Origen de Supabase (datos, fotos privadas, modelos 3D y sesión en tiempo real). */
const supabase = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://lsrjrwpxxqlgobablyyc.supabase.co").origin;
  } catch {
    return "";
  }
})();

/**
 * Política de contenido: solo se cargan scripts, marcos e imágenes de orígenes conocidos.
 * 'unsafe-inline' es necesario para los scripts de arranque de Next con páginas en caché;
 * 'wasm-unsafe-eval' para los decodificadores 3D (meshopt/Draco).
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://www.gstatic.com https://www.googletagmanager.com https://connect.facebook.net https://vercel.live`,
  `connect-src 'self' blob: data: ${supabase} ${supabase.replace(/^http/, "ws")} https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net https://www.gstatic.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.facebook.com https://connect.facebook.net https://vercel.live wss://ws-us3.pusher.com`,
  `img-src 'self' data: blob: ${supabase} https://*.supabase.co https://i.ytimg.com https://*.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://vercel.live https://vercel.com`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "worker-src 'self' blob: https://cdn.jsdelivr.net",
  "child-src 'self' blob: https://cdn.jsdelivr.net",
  "frame-src https://www.youtube-nocookie.com https://www.google.com https://vercel.live",
  supabase.startsWith("https:") ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ")
  .replace(/\s{2,}/g, " ");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Imágenes y modelos del catálogo servidos desde Supabase Storage
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "lsrjrwpxxqlgobablyyc.supabase.co" },
    ],
  },
  // Nada del sitio original (legacy/) se publica: solo se usa como referencia.
  // Los PDF públicos de la biblioteca se sirven desde esta ruta (solo con sesión)
  outputFileTracingIncludes: { "/api/biblioteca/[id]": ["./content/biblioteca/**"] },
  // Cabeceras de seguridad para todas las páginas
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
