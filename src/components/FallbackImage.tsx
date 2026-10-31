"use client";
import { useState } from "react";

const BRAND_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%230d1014'/%3E%3Cpolygon points='400,210 490,262 490,366 400,418 310,366 310,262' fill='%23F7C600'/%3E%3Crect x='382' y='252' width='36' height='30' rx='4' fill='%230b0d10'/%3E%3Crect x='392' y='282' width='16' height='36' fill='%230b0d10'/%3E%3Ccircle cx='400' cy='330' r='17' fill='%230b0d10'/%3E%3Ctext x='400' y='480' fill='%2398a2ad' font-family='monospace' font-size='22' letter-spacing='6' text-anchor='middle'%3EJF MOTORES%3C/text%3E%3C/svg%3E";

/** Imagen externa con respaldo de marca si el enlace deja de funcionar. Provisional hasta tener fotos propias en Supabase. */
export function FallbackImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- origen externo temporal, sin optimizar a propósito
    <img src={failed ? BRAND_PLACEHOLDER : src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
  );
}
