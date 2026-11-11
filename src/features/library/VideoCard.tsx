"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** Tamaños del reproductor, al estilo de YouTube: en la tarjeta, ampliado arriba de la lista o modo cine (de borde a borde). */
export type VideoMode = "normal" | "large" | "cinema";

export type VideoModeLabels = {
  label: string;
  normal: string;
  large: string;
  cinema: string;
  fullscreen: string;
  close: string;
};

const ICONS: Record<VideoMode | "fullscreen" | "close", ReactNode> = {
  normal: <rect x="6" y="8" width="12" height="8" rx="1.5" />,
  large: <rect x="3" y="6" width="18" height="12" rx="1.5" />,
  cinema: <rect x="1.5" y="7.5" width="21" height="9" rx="1.5" />,
  fullscreen: <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

/** Video con miniatura: el reproductor de YouTube solo se carga al tocar (página liviana y sin rastreo previo). */
export function VideoCard(props: {
  title: string;
  source: string;
  lang: string;
  youtube?: string;
  url?: string;
  /** Este video es el que se está reproduciendo */
  active: boolean;
  mode: VideoMode;
  onPlay: () => void;
  onMode: (mode: VideoMode) => void;
  onClose: () => void;
  labels: { play: string; openSite: string; modes: VideoModeLabels };
}) {
  const cardRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const big = props.active && props.mode !== "normal";

  // Al ampliar o pasar a modo cine, el video sube al inicio de la lista: lo llevamos a la vista.
  useEffect(() => {
    if (!props.active) return;
    const el = cardRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: big ? "start" : "nearest" });
  }, [props.active, props.mode, big]);

  function fullscreen() {
    const el = frameRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else el.webkitRequestFullscreen?.();
  }

  const m = props.labels.modes;
  const modeButtons: VideoMode[] = ["normal", "large", "cinema"];

  return (
    <article ref={cardRef} className={`video-card${props.active ? " is-active" : ""}${big ? ` is-${props.mode}` : ""}`}>
      <div className="video-frame" ref={frameRef}>
        {props.youtube ? (
          props.active ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${props.youtube}?autoplay=1&rel=0`}
              title={props.title}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <button type="button" className="video-thumb" onClick={props.onPlay} aria-label={`${props.labels.play}: ${props.title}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de YouTube */}
              <img src={`https://i.ytimg.com/vi/${props.youtube}/hqdefault.jpg`} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
              <span className="video-play" aria-hidden="true">▶</span>
            </button>
          )
        ) : (
          <a className="video-thumb video-ext" href={props.url} target="_blank" rel="noopener">
            <span className="video-play" aria-hidden="true">↗</span>
            <span>{props.labels.openSite}</span>
          </a>
        )}
      </div>

      {props.active && props.youtube && (
        <div className="video-modes" role="toolbar" aria-label={m.label}>
          <div className="vm-group">
            {modeButtons.map((mode) => (
              <button
                key={mode}
                type="button"
                className="vm-btn"
                aria-pressed={props.mode === mode}
                title={m[mode]}
                onClick={() => props.onMode(mode)}
              >
                <Icon name={mode} />
                <span className="vm-txt">{m[mode]}</span>
              </button>
            ))}
          </div>
          <button type="button" className="vm-btn" title={m.fullscreen} onClick={fullscreen}>
            <Icon name="fullscreen" />
            <span className="vm-txt">{m.fullscreen}</span>
          </button>
          <button type="button" className="vm-btn vm-close" title={m.close} aria-label={`${m.close}: ${props.title}`} onClick={props.onClose}>
            <Icon name="close" />
          </button>
        </div>
      )}

      <div className="video-meta">
        <span>{props.source}</span>
        <span>{props.lang}</span>
      </div>
      <h3>{props.title}</h3>
    </article>
  );
}
