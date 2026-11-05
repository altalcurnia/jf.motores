"use client";
import { useEffect, useRef, useState } from "react";
import { VideoCard, type VideoMode, type VideoModeLabels } from "./VideoCard";

export type GalleryVideo = { id: string; title: string; source: string; lang: string; youtube?: string; url?: string };

/**
 * Lista de videos con un solo reproductor activo. En modo «Ampliado» o «Cine» el video activo
 * sube al inicio y ocupa todo el ancho; los demás quedan debajo (como en YouTube).
 * El reproductor no se vuelve a montar al cambiar de tamaño, así que el video sigue donde iba.
 */
export function VideoGallery(props: { videos: GalleryVideo[]; labels: { play: string; openSite: string; modes: VideoModeLabels } }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<VideoMode>("normal");
  const gridRef = useRef<HTMLDivElement>(null);

  // Ancho real de la página (sin la barra de desplazamiento) para que el modo cine vaya de borde a borde.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const update = () => grid.style.setProperty("--page-w", `${document.documentElement.clientWidth}px`);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Escape vuelve al tamaño normal (si no se está en pantalla completa).
  useEffect(() => {
    if (!activeId || mode === "normal") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) setMode("normal");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, mode]);

  return (
    <div ref={gridRef} className={`video-grid${activeId && mode !== "normal" ? " has-stage" : ""}`}>
      {props.videos.map((v) => (
        <VideoCard
          key={v.id}
          title={v.title}
          source={v.source}
          lang={v.lang}
          youtube={v.youtube}
          url={v.url}
          active={activeId === v.id}
          mode={mode}
          onPlay={() => setActiveId(v.id)}
          onMode={setMode}
          onClose={() => setActiveId(null)}
          labels={props.labels}
        />
      ))}
    </div>
  );
}

