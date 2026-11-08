/**
 * Configuración común de Sentry (avisos de errores, tarea 1.7 del plan de operación).
 *
 * Todo queda APAGADO mientras no exista `NEXT_PUBLIC_SENTRY_DSN` en Vercel: no se carga el SDK en el navegador
 * ni se envía nada (así local, CI y E2E no mandan errores). El DSN no es secreto.
 * Privacidad (Ley 1581): sin datos personales, sin cookies ni encabezados, sin grabación de pantalla y sin trazas
 * de rendimiento (para no pesar en la carga del celular).
 */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

type Event = {
  request?: { cookies?: unknown; headers?: Record<string, string>; data?: unknown };
  user?: unknown;
};

/** Quita cookies (sesión, jf_vid, jf_utm), encabezados sensibles y cuerpos de formularios antes de enviar. */
export function scrubEvent<T extends Event>(event: T): T {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    const h = event.request.headers;
    if (h) for (const k of Object.keys(h)) if (/cookie|authorization|x-forwarded-for|x-real-ip|token|secret/i.test(k)) delete h[k];
  }
  delete event.user;
  return event;
}

export function sentryOptions() {
  return {
    dsn: SENTRY_DSN,
    enabled: SENTRY_DSN !== "",
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? "development",
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    ignoreErrors: [
      // Ruido conocido de navegadores y del prerender (no afecta al cliente)
      "ResizeObserver loop",
      "Non-Error promise rejection captured",
      "while prerendering",
      "Load failed",
      "NetworkError when attempting to fetch resource",
    ],
    beforeSend: scrubEvent,
  };
}
