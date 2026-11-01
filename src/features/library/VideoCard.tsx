"use client";
import { useState } from "react";

/** Video con miniatura: el reproductor de YouTube solo se carga al tocar (página liviana y sin rastreo previo). */
export function VideoCard(props: {
  title: string;
  source: string;
  lang: string;
  youtube?: string;
  url?: string;
  labels: { play: string; openSite: string };
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <article className="video-card">
      <div className="video-frame">
        {props.youtube ? (
          playing ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${props.youtube}?autoplay=1&rel=0`}
              title={props.title}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <button type="button" className="video-thumb" onClick={() => setPlaying(true)} aria-label={`${props.labels.play}: ${props.title}`}>
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
      <div className="video-meta">
        <span>{props.source}</span>
        <span>{props.lang}</span>
      </div>
      <h3>{props.title}</h3>
    </article>
  );
}
