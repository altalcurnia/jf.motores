"use client";
import Script from "next/script";
import { createElement, useState } from "react";

/**
 * Visor 3D del producto (archivo .glb subido desde el panel). La librería se carga
 * solo cuando el cliente toca "Ver en 3D", para no pesar en móviles.
 */
/** Decodificador de geometría comprimida (meshopt), servido desde el propio sitio. */
const MESHOPT_DECODER = "/vendor/meshopt_decoder-1.3.0.js";

/** model-viewer lee su configuración global al cargar: hay que fijarla antes. */
function configureModelViewer() {
  const w = window as unknown as {
    ModelViewerElement?: Record<string, unknown>;
  };
  w.ModelViewerElement = {
    ...(w.ModelViewerElement ?? {}),
    meshoptDecoderLocation: MESHOPT_DECODER,
  };
}

export function Viewer3D({
  src,
  alt,
  label,
  closeLabel,
}: {
  src: string;
  alt: string;
  label: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        className="btn g pd-3d-btn"
        onClick={() => {
          configureModelViewer();
          setOpen(true);
        }}
      >
        {label}
      </button>
    );
  }
  return (
    <div className="pd-3d">
      <Script
        type="module"
        src="https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js"
      />
      {createElement("model-viewer", {
        src,
        alt,
        "camera-controls": true,
        "auto-rotate": true,
        "shadow-intensity": "1",
        "touch-action": "pan-y",
        style: { width: "100%", height: "100%", background: "#0d1014" },
      })}
      <button
        type="button"
        className="pd-3d-close"
        onClick={() => setOpen(false)}
      >
        {closeLabel} ✕
      </button>
    </div>
  );
}
