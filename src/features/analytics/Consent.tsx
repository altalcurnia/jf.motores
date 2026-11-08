"use client";
import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { AnalyticsIds } from "./ids";

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

type W = Window & {
  gtag?: (...a: unknown[]) => void;
  fbq?: (...a: unknown[]) => void;
  ttq?: { track: (event: string, data?: Record<string, unknown>) => void; page: () => void };
};

/**
 * Aviso de cookies (Ley 1581) y medición de anuncios. GA4, Google Ads y los píxeles de Meta y TikTok
 * solo se cargan si el visitante acepta. Cada clic a WhatsApp (/api/wa) se envía como cliente potencial.
 */
export function Consent({ t, locale, ids }: { t: Dictionary["consent"]; locale: string; ids: AnalyticsIds }) {
  // En el servidor no se muestra el aviso; en el navegador aparece si aún no hay decisión
  const choice = useSyncExternalStore<Choice | null>(subscribe, read, () => "necessary");
  const pathname = usePathname();
  const first = useRef(true);
  const { ga4, pixel, gads, gadsLabel, tiktok } = ids;
  const measure = choice === "all" && Boolean(ga4 || pixel || gads || tiktok);
  // GA4 y Google Ads usan la misma librería (gtag.js)
  const gtagId = ga4 ?? gads;

  // Vista de página de los píxeles en cada cambio de ruta (gtag la detecta solo)
  useEffect(() => {
    if (!measure) return;
    if (first.current) {
      first.current = false;
      return;
    }
    const w = window as W;
    w.fbq?.("track", "PageView");
    w.ttq?.page();
  }, [pathname, measure]);

  // Evento Lead en cada clic a WhatsApp
  useEffect(() => {
    if (!measure) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href^='/api/wa']") as HTMLAnchorElement | null;
      if (!a) return;
      const source = new URL(a.href).searchParams.get("s") ?? "web";
      const w = window as W;
      if (ga4) w.gtag?.("event", "generate_lead", { lead_source: source });
      if (gads && gadsLabel) w.gtag?.("event", "conversion", { send_to: `${gads}/${gadsLabel}` });
      w.fbq?.("track", "Lead", { content_name: source });
      w.ttq?.track("Contact", { content_name: source });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [measure, ga4, gads, gadsLabel]);

  const set = (c: Choice) => {
    try {
      localStorage.setItem(KEY, c);
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    <>
      {measure && gtagId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());${[ga4, gads]
              .filter(Boolean)
              .map((id) => `gtag('config','${id}');`)
              .join("")}`}
          </Script>
        </>
      )}
      {measure && tiktok && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var s=d.createElement("script");s.type="text/javascript";s.async=!0;s.src=r+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(s,a)};ttq.load('${tiktok}');ttq.page();}(window,document,'ttq');`}
        </Script>
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
