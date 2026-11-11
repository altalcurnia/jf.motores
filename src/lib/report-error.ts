import { SENTRY_DSN } from "@/lib/sentry-options";

/**
 * Registra un error que el código ya manejó (p. ej. el cliente igual llegó a WhatsApp) para que no quede
 * oculto: siempre en los registros de Vercel y, si Sentry está activo, también como aviso.
 * Sirve en servidor y navegador.
 */
export function reportError(where: string, error: unknown, extra?: Record<string, unknown>) {
  const msg = error instanceof Error ? error.message : (error as { message?: unknown } | null)?.message ?? error;
  if (extra) console.error(`${where}:`, msg, extra);
  else console.error(`${where}:`, msg);
  if (!SENTRY_DSN) return;
  import("@sentry/nextjs")
    .then((Sentry) =>
      Sentry.captureException(error instanceof Error ? error : new Error(`${where}: ${String(error)}`), {
        tags: { where },
        extra,
      }),
    )
    .catch(() => {});
}
