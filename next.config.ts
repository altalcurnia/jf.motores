import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

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
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://www.gstatic.com https://www.googletagmanager.com https://connect.facebook.net https://www.googleadservices.com https://googleads.g.doubleclick.net https://analytics.tiktok.com https://vercel.live`,
  `connect-src 'self' blob: data: ${supabase} ${supabase.replace(/^http/, "ws")} https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net https://www.gstatic.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.facebook.com https://connect.facebook.net https://www.google.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://*.doubleclick.net https://analytics.tiktok.com https://*.tiktok.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://vercel.live wss://ws-us3.pusher.com`,
  `img-src 'self' data: blob: ${supabase} https://*.supabase.co https://i.ytimg.com https://*.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://www.google.com https://www.google.com.co https://www.googleadservices.com https://googleads.g.doubleclick.net https://analytics.tiktok.com https://vercel.live https://vercel.com`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "worker-src 'self' blob: https://cdn.jsdelivr.net",
  "child-src 'self' blob: https://cdn.jsdelivr.net",
  "frame-src https://www.youtube-nocookie.com https://www.google.com https://td.doubleclick.net https://www.googletagmanager.com https://vercel.live",
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

/**
 * Sentry (avisos de errores) solo se conecta a la compilación si hay DSN en Vercel. Con SENTRY_AUTH_TOKEN
 * (secreto, solo en Vercel), SENTRY_ORG y SENTRY_PROJECT además sube los mapas de código para ver la línea exacta.
 */
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      telemetry: false,
      widenClientFileUpload: true,
      suppressOnRouterTransitionStartWarning: true,
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN, deleteSourcemapsAfterUpload: true },
      bundleSizeOptimizations: { excludeDebugStatements: true, excludeTracing: true, excludeReplayShadowDom: true, excludeReplayIframe: true, excludeReplayWorker: true },
    })
  : nextConfig;
