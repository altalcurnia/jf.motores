"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Item = { href: string; title: string; desc: string };

/**
 * Menú desplegable del encabezado de escritorio (Catálogo, Soporte): se abre al pasar el mouse o al tocar.
 * `lastIsAll` resalta el último enlace como «ver todo».
 */
export function CatalogMenu({
  label,
  items,
  lastIsAll = true,
  activePaths,
}: {
  label: string;
  items: Item[];
  lastIsAll?: boolean;
  activePaths?: string[];
}) {
  const [open, setOpen] = useState(false);
  const pointer = useRef<string>("");
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const active = (activePaths ?? items.map((i) => i.href)).some((h) => pathname.startsWith(h));
  const last = lastIsAll ? items.length - 1 : -1;

  // eslint-disable-next-line react-hooks/set-state-in-effect -- cerrar al cambiar de página
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className={`cat-menu ${open ? "open" : ""}`}
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
    >
      <button
        type="button"
        className={active ? "active" : ""}
        aria-expanded={open}
        aria-haspopup="true"
        onPointerDown={(e) => (pointer.current = e.pointerType)}
        // Con mouse ya se abrió al pasar por encima: el clic no lo cierra. Con dedo o teclado alterna.
        onClick={() => setOpen((o) => (pointer.current === "mouse" ? true : !o))}
      >
        {label}
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>
      <div className="cat-menu-panel" role="menu">
        {items.map((i, n) => (
          <Link key={i.href} href={i.href} role="menuitem" className={n === last ? "all" : ""} onClick={() => setOpen(false)}>
            <b>{i.title}</b>
            <span>{i.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
