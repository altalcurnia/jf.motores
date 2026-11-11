"use client";
import { createElement, useEffect, useState } from "react";

/** Decodificador de geometría comprimida (meshopt), servido desde el propio sitio. */
const MESHOPT_DECODER = "/vendor/meshopt_decoder-1.3.0.js";
const MODEL_VIEWER_SRC = "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js";

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
  const [ready, setReady] = useState(() => typeof window !== "undefined" && !!customElements.get("model-viewer"));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || customElements.get("model-viewer")) return;
    configureModelViewer();

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${MODEL_VIEWER_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => setReady(true), { once: true });
      existing.addEventListener("error", () => setError(true), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.type = "module";
    script.src = MODEL_VIEWER_SRC;
    script.async = true;
    script.onload = () => setReady(true);
    script.onerror = () => setError(true);
    document.head.appendChild(script);
  }, []);

  if (error) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          minHeight: "360px",
          background: "#0d1014",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          gap: "8px",
          padding: "16px",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: "24px" }}>⚠️</span>
        <p style={{ margin: 0, fontSize: "14px" }}>No se pudo cargar el visor 3D.</p>
        <a
          href={src}
          download
          style={{
            marginTop: "8px",
            fontSize: "12px",
            color: "#f7c600",
            textDecoration: "underline",
          }}
        >
          Descargar archivo 3D (.glb)
        </a>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "360px", background: "#0d1014" }}>
      {!ready && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#f7c600",
            gap: "12px",
            zIndex: 2,
            background: "#0d1014",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              border: "3px solid rgba(247, 198, 0, 0.2)",
              borderTopColor: "#f7c600",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <span style={{ fontSize: "13px", color: "#cbd5e1" }}>Cargando modelo 3D…</span>
        </div>
      )}
      {createElement("model-viewer", {
        src,
        alt,
        "camera-controls": true,
        "auto-rotate": true,
        "shadow-intensity": "1",
        "touch-action": "pan-y",
        style: { width: "100%", height: "100%", background: "#0d1014", display: ready ? "block" : "none" },
      })}
    </div>
  );
}
