"use client";
import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import type { Dictionary } from "@/i18n/dictionaries";

type Choice = "all" | "necessary";
const KEY = "jf-consent";
const EVENT = "jf-consent";

function read(): Choice | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "all" || v === "necessary" ? v : null;
  } catch {
    return null;
  }
}
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
/** Abre de nuevo el aviso (enlace «Preferencias de cookies» del pie). */
export function reopenConsent() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

type W = Window & { gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void };

/**
 * Aviso de cookies (Ley 1581) y medición. GA4 y el Píxel de Meta solo se cargan si el
 * visitante acepta. Cada clic a WhatsApp (/api/wa) se envía como evento Lead.
 */
export function Consent({ t, locale, ga4, pixel }: { t: Dictionary["consent"]; locale: string; ga4: string | null; pixel: string | null }) {
  // En el servidor no se muestra el aviso; en el navegador aparece si aún no hay decisión
  const choice = useSyncExternalStore<Choice | null>(subscribe, read, () => "necessary");
  const pathname = usePathname();
  const first = useRef(true);
  const measure = choice === "all" && (ga4 || pixel);

  // Vista de página del Píxel en cada cambio de ruta (GA4 la detecta solo)
  useEffect(() => {
    if (!measure) return;
    if (first.current) {
      first.current = false;
      return;
    }
    (window as W).fbq?.("track", "PageView");
  }, [pathname, measure]);

  // Evento Lead en cada clic a WhatsApp
  useEffect(() => {
    if (!measure) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href^='/api/wa']") as HTMLAnchorElement | null;
      if (!a) return;
      const source = new URL(a.href).searchParams.get("s") ?? "web";
      const w = window as W;
      w.gtag?.("event", "generate_lead", { lead_source: source });
      w.fbq?.("track", "Lead", { content_name: source });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [measure]);

  const set = (c: Choice) => {
    try {
      localStorage.setItem(KEY, c);
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    <>
      {measure && ga4 && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga4}');`}
          </Script>
        </>
      )}
      {measure && pixel && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}
        </Script>
      )}
      {choice === null && (
        <div className="consent" role="dialog" aria-live="polite" aria-label={t.settings}>
          <p>
            {t.text}{" "}
            <Link href={`/${locale}/legal/privacidad`}>{t.policy}</Link>
          </p>
          <div className="consent-actions">
            <button type="button" className="btn g" onClick={() => set("necessary")}>
              {t.necessary}
            </button>
            <button type="button" className="btn y" onClick={() => set("all")}>
              {t.accept}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Enlace del pie para cambiar la decisión. */
export function ConsentSettingsLink({ label }: { label: string }) {
  return (
    <button type="button" className="footer-link consent-link" onClick={reopenConsent}>
      {label}
    </button>
  );
}
