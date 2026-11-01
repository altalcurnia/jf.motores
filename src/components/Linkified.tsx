"use client";
import { Fragment } from "react";

// [texto](https://…), https://… suelto (sin la puntuación final), «WhatsApp» o un teléfono (+57 312 2110262)
const LINK =
  /\[([^\]\n]{1,120})\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?¿¡"'*])|(\bWhatsApp\b|\+\d{1,3}[\s.-]?\d{2,4}[\s.-]?\d{3,4}[\s.-]?\d{0,4})/gi;

function sameSite(url: string): string | null {
  try {
    const u = new URL(url);
    const own = new Set<string>();
    if (typeof window !== "undefined") own.add(window.location.host);
    try {
      if (process.env.NEXT_PUBLIC_SITE_URL) own.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).host);
    } catch {}
    return own.has(u.host) ? u.pathname + u.search + u.hash : null;
  } catch {
    return null;
  }
}

/** Texto con enlaces clicables (markdown, URL sueltas, «WhatsApp» y teléfonos) y **negritas**. Los del propio sitio abren en la misma pestaña. */
export function Linkified({ text, waHref }: { text: string; waHref?: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    if (m.index! > last) out.push(...bold(text.slice(last, m.index), out.length));
    if (m[4]) {
      // «WhatsApp» o un número: lleva al chat de WhatsApp de la línea directa
      out.push(
        waHref ? (
          <a key={`w${out.length}`} className="wa-inline" href={waHref} target="_blank" rel="noopener">
            {m[4]}
          </a>
        ) : (
          m[4]
        ),
      );
      last = m.index! + m[0].length;
      continue;
    }
    const url = m[2] ?? m[3];
    const internal = sameSite(url);
    // Etiqueta corta: en enlaces del propio sitio solo la ruta (sin el idioma), en otros el dominio y la ruta
    const label = m[1] ?? (internal ? internal.replace(/^\/(es|en|pt)(\/|$)/, "/") : url.replace(/^https?:\/\/(www\.)?/, ""));
    out.push(
      internal ? (
        <a key={`l${out.length}`} href={internal}>
          {label}
        </a>
      ) : (
        <a key={`l${out.length}`} href={url} target="_blank" rel="noopener nofollow">
          {label}
        </a>
      ),
    );
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(...bold(text.slice(last), out.length));
  return <>{out}</>;
}

function bold(s: string, key: number): React.ReactNode[] {
  return s.split(/\*\*([^*\n]+)\*\*/g).map((part, i) => (i % 2 ? <b key={`b${key}-${i}`}>{part}</b> : <Fragment key={`t${key}-${i}`}>{part}</Fragment>));
}
