import type { Instrumentation } from "next";
import { SENTRY_DSN, sentryOptions } from "@/lib/sentry-options";

/** Arranque del servidor: activa Sentry solo si hay DSN (ver src/lib/sentry-options.ts). */
export async function register() {
  if (!SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.init(sentryOptions());
}

/** Errores de páginas, rutas de API, acciones de servidor y proxy. */
export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
};
