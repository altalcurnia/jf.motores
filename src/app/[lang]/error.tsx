"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { ErrorScreen, localeFromPath } from "@/components/ErrorScreen";
import { reportError } from "@/lib/report-error";

/** Error en una página del sitio: se conserva la cabecera y el pie, y se ofrece WhatsApp. */
export default function PageError({ error, retry }: { error: unknown; retry: () => void }) {
  const { lang } = useParams<{ lang: string }>();
  useEffect(() => reportError("Página con error", error), [error]);
  return <ErrorScreen locale={localeFromPath(`/${lang}`)} retry={retry} />;
}
