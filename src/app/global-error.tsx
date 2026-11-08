"use client";
import { useEffect } from "react";
import { ErrorScreen, localeFromPath } from "@/components/ErrorScreen";
import { reportError } from "@/lib/report-error";

/** Error en el diseño raíz: reemplaza toda la página, por eso lleva su propio <html> y estilos mínimos. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const locale = localeFromPath(typeof window === "undefined" ? "/" : window.location.pathname);
  useEffect(() => reportError("Error general del sitio", error), [error]);
  return (
    <html lang={locale}>
      <body style={{ margin: 0, background: "#0b0d10", color: "#f2f2f2" }}>
        <ErrorScreen locale={locale} retry={retry} bare />
      </body>
    </html>
  );
}
