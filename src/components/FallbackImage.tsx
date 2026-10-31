"use client";
import { useState } from "react";
import { BRAND_PLACEHOLDER } from "./placeholder";


/** Imagen externa con respaldo de marca si el enlace deja de funcionar. Provisional hasta tener fotos propias en Supabase. */
export function FallbackImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- origen externo temporal, sin optimizar a propósito
    <img src={failed ? BRAND_PLACEHOLDER : src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
  );
}
