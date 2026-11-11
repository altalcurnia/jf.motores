"use client";
import { useEffect, useState } from "react";
import { hasLocale, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { waLead } from "@/features/whatsapp/lead-link";

type Texts = Dictionary["errorPage"];

// Los textos se cargan solo cuando ocurre un error: no pesan en la carga normal de la página
const load: Record<Locale, () => Promise<Texts>> = {
  es: () => import("@/i18n/dictionaries/es.json").then((m) => m.default.errorPage),
  en: () => import("@/i18n/dictionaries/en.json").then((m) => m.default.errorPage),
  pt: () => import("@/i18n/dictionaries/pt.json").then((m) => m.default.errorPage),
};

/** Idioma a partir de la ruta (/es/…, /en/…, /pt/…). */
export function localeFromPath(path: string): Locale {
  const first = path.split("/")[1];
  return hasLocale(first) ? first : "es";
}

/**
 * Pantalla de error con «Reintentar» y WhatsApp (el cliente nunca se queda sin contacto).
 * `bare` = sin estilos del sitio (global-error reemplaza todo el diseño).
 */
export function ErrorScreen({ locale, retry, bare = false }: { locale: Locale; retry: () => void; bare?: boolean }) {
  const [t, setT] = useState<Texts | null>(null);
  useEffect(() => {
    let alive = true;
    load[locale]()
      .then((x) => alive && setT(x))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [locale]);

  const wa = waLead({ message: t?.waMessage ?? "", source: "error", locale });
  const box: React.CSSProperties | undefined = bare
    ? { maxWidth: 520, margin: "15vh auto", padding: "0 16px", fontFamily: "system-ui, sans-serif", textAlign: "center" }
    : undefined;
  const btn = (bg: string): React.CSSProperties | undefined =>
    bare ? { display: "inline-block", margin: 6, padding: "12px 20px", borderRadius: 8, border: 0, background: bg, color: "#fff", fontSize: 16, textDecoration: "none", cursor: "pointer" } : undefined;

  return (
    <section className={bare ? undefined : "block cat-page"} style={box} role="alert">
      <header className={bare ? undefined : "cat-head"}>
        <h1>{t?.title ?? "…"}</h1>
        <p>{t?.text ?? ""}</p>
      </header>
      <div className={bare ? undefined : "cat-actions"}>
        <a className={bare ? undefined : "btn y"} style={btn("#1fa855")} href={wa} target="_blank" rel="noopener">
          {t?.whatsapp ?? "WhatsApp"}
        </a>
        <button type="button" className={bare ? undefined : "btn g"} style={btn("#444")} onClick={() => retry()}>
          {t?.retry ?? "↻"}
        </button>
      </div>
    </section>
  );
}
