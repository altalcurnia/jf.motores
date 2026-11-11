import { SENTRY_DSN, sentryOptions } from "@/lib/sentry-options";

// Sentry en el navegador: se descarga aparte y después de la página (no frena la carga en el celular).
// Sin DSN este bloque desaparece de la compilación.
if (SENTRY_DSN) {
  import("@sentry/nextjs")
    .then((Sentry) => Sentry.init(sentryOptions()))
    .catch(() => {});
}
