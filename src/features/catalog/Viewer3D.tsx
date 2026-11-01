"use client";
import Script from "next/script";
import { createElement } from "react";

/** Decodificador de geometría comprimida (meshopt), servido desde el propio sitio. */
const MESHOPT_DECODER = "/vendor/meshopt_decoder-1.3.0.js";

/** model-viewer lee su configuración global al cargar: hay que fijarla antes de cargar la librería. */
function configureModelViewer() {
  const w = window as unknown as { ModelViewerElement?: Record<string, unknown> };
  w.ModelViewerElement = { ...(w.ModelViewerElement ?? {}), meshoptDecoderLocation: MESHOPT_DECODER };
}

/**
 * Visor 3D del producto (archivo .glb subido desde el panel). Se monta solo cuando el
 * cliente pide verlo, y la librería se descarga en ese momento (no pesa en móviles).
 */
export function ModelViewer({ src, alt }: { src: string; alt: string }) {
  if (typeof window !== "undefined") configureModelViewer();
  return (
    <>
      <Script type="module" src="https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js" />
      {createElement("model-viewer", {
        src,
        alt,
        "camera-controls": true,
        "auto-rotate": true,
        "shadow-intensity": "1",
        "touch-action": "pan-y",
        style: { width: "100%", height: "100%", background: "#0d1014" },
      })}
    </>
  );
}
