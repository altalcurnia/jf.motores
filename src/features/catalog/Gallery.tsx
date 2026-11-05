"use client";
import Image from "next/image";
import { useState } from "react";
import { ModelViewer } from "./Viewer3D";

export type GalleryImage = { url: string; alt: string; isReference: boolean };

/**
 * Galería del detalle: imagen grande y miniaturas. Si el producto tiene modelo 3D, un botón en la
 * esquina superior de la foto cambia al visor 3D en el mismo recuadro (y el botón pasa a «Fotos»).
 */
export function Gallery({
  images,
  referenceLabel,
  model,
}: {
  images: GalleryImage[];
  referenceLabel: string;
  model?: { src: string; alt: string; label3d: string; labelPhotos: string };
}) {
  const [i, setI] = useState(0);
  const [show3d, setShow3d] = useState(false);
  const current = images[i] ?? images[0];
  if (!current && !model) return null;
  const in3d = !!model && (show3d || !current);
  return (
    <div className="pd-gallery">
      <div className={`pd-main${in3d ? " is-3d" : ""}`}>
        {in3d ? (
          <ModelViewer src={model!.src} alt={model!.alt} />
        ) : (
          <>
            <Image src={current.url} alt={current.alt} fill priority sizes="(max-width: 900px) 100vw, 55vw" />
            {current.isReference && <span className="pc-ref-tag">{referenceLabel}</span>}
          </>
        )}
        {model && current && (
          <button type="button" className="pd-3d-toggle" aria-pressed={in3d} onClick={() => setShow3d(!in3d)}>
            {in3d ? (
              <>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <circle cx="9" cy="10" r="1.6" />
                  <path d="M21 16l-5-5-8 8" />
                </svg>
                {model.labelPhotos}
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
                  <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
                </svg>
                {model.label3d}
              </>
            )}
          </button>
        )}
      </div>
      {images.length > 1 && (
        <div className="pd-thumbs">
          {images.map((img, n) => (
            <button
              key={img.url + n}
              type="button"
              className={n === i && !in3d ? "on" : ""}
              onClick={() => {
                setI(n);
                setShow3d(false);
              }}
              aria-label={img.alt}
            >
              <Image src={img.url} alt="" fill sizes="96px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
