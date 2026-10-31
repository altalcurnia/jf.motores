"use client";
import Image from "next/image";
import { useState } from "react";

export type GalleryImage = { url: string; alt: string; isReference: boolean };

/** Galería del detalle: imagen grande y miniaturas. */
export function Gallery({ images, referenceLabel }: { images: GalleryImage[]; referenceLabel: string }) {
  const [i, setI] = useState(0);
  const current = images[i] ?? images[0];
  if (!current) return null;
  return (
    <div className="pd-gallery">
      <div className="pd-main">
        <Image src={current.url} alt={current.alt} fill priority sizes="(max-width: 900px) 100vw, 55vw" />
        {current.isReference && <span className="pc-ref-tag">{referenceLabel}</span>}
      </div>
      {images.length > 1 && (
        <div className="pd-thumbs">
          {images.map((img, n) => (
            <button key={img.url + n} type="button" className={n === i ? "on" : ""} onClick={() => setI(n)} aria-label={img.alt}>
              <Image src={img.url} alt="" fill sizes="96px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
