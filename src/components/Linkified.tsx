"use client";
import { Fragment } from "react";

// [texto](https://…) o https://… suelto (sin la puntuación final)
const LINK = /\[([^\]\n]{1,120})\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?¿¡"'*])/g;

function sameSite(url: string): string | null {
  try {
    const u = new URL(url);
    return typeof window !== "undefined" && u.host === window.location.host ? u.pathname + u.search + u.hash : null;
  } catch {
    return null;
  }
}

/** Texto con enlaces clicables (markdown o URL sueltas) y **negritas**. Los del propio sitio abren en la misma pestaña. */
export function Linkified({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    if (m.index! > last) out.push(...bold(text.slice(last, m.index), out.length));
    const url = m[2] ?? m[3];
    const label = m[1] ?? url.replace(/^https?:\/\/(www\.)?/, "");
    const internal = sameSite(url);
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
