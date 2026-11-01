"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Equipos del cliente que está navegando (producto → unidades suyas). Se consulta una
 * sola vez por visita y solo con sesión; las páginas del catálogo siguen siendo estáticas.
 */
type Owned = Map<string, string[]>;
let cache: Promise<Owned> | null = null;

function loadOwned(): Promise<Owned> {
  if (cache) return cache;
  cache = (async () => {
    const owned: Owned = new Map();
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: auth } = await supabase.auth.getSession();
      const uid = auth.session?.user.id;
      if (!uid) return owned;
      const { data } = await supabase.from("units").select("id, product_id").eq("owner_id", uid);
      for (const u of data ?? []) if (u.product_id) owned.set(u.product_id, [...(owned.get(u.product_id) ?? []), u.id]);
    } catch {
      // sin Supabase configurado (pruebas locales) o sin conexión: no se marca nada
    }
    return owned;
  })();
  return cache;
}

function useOwnedUnits(productId: string): string[] {
  const [units, setUnits] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    loadOwned().then((m) => alive && setUnits(m.get(productId) ?? []));
    return () => {
      alive = false;
    };
  }, [productId]);
  return units;
}

/** Estado del producto; para quien lo compró dice "Tu equipo". */
export function StatusPill({
  productId,
  status,
  labels,
  className = "",
}: {
  productId: string;
  status: "disponible" | "vendido";
  labels: { available: string; sold: string; owned: string };
  className?: string;
}) {
  const owned = useOwnedUnits(productId).length > 0;
  const cls = owned ? "owned" : status;
  return <span className={`pc-status ${cls} ${className}`}>{owned ? `★ ${labels.owned}` : status === "vendido" ? labels.sold : labels.available}</span>;
}

/** Aviso en la ficha para el dueño, con acceso directo a su equipo. */
export function OwnerBanner({ productId, locale, text, link }: { productId: string; locale: string; text: string; link: string }) {
  const units = useOwnedUnits(productId);
  if (!units.length) return null;
  return (
    <div className="owner-banner">
      <span>★ {text}</span>
      <Link href={`/${locale}/cuenta/equipos/${units[0]}`}>{link} →</Link>
    </div>
  );
}
