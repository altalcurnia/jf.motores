"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type LinkItem = { href: string; label: string; external?: boolean };
export type MenuSection = { title?: string; links: LinkItem[] };

/**
 * Menú de celular: botón a la izquierda del logo que abre un panel lateral.
 * Se cierra al tocar fuera, con Escape o al navegar.
 */
export function MobileMenu({
  labels,
  sections,
  footer,
}: {
  labels: { open: string; close: string };
  sections: MenuSection[];
  footer: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);
  // El panel va directo en <body>: el encabezado usa backdrop-filter, que atraparía un panel "fixed".
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // eslint-disable-next-line react-hooks/set-state-in-effect -- cerrar al cambiar de página
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("drawer-open");
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("drawer-open");
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="burger"
        aria-label={labels.open}
        aria-expanded={open}
        aria-controls="drawer"
        onClick={() => setOpen(true)}
      >
        <span />
        <span />
        <span />
      </button>
      {mounted &&
        createPortal(
          <>
            <div
              className={`drawer-backdrop ${open ? "open" : ""}`}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <aside
              id="drawer"
              className={`drawer ${open ? "open" : ""}`}
              aria-hidden={!open}
              inert={!open}
              aria-label={labels.open}
            >
              <div className="drawer-head">
                <Image src="/logo.png" alt="" width={30} height={30} />
                <b>
                  JF <em>MOTORES</em>
                </b>
                <button
                  ref={closeRef}
                  type="button"
                  className="drawer-close"
                  aria-label={labels.close}
                  onClick={() => setOpen(false)}
                >
                  ✕
                </button>
              </div>
              <div className="drawer-body">
                {sections.map((s) => (
                  <div key={s.title ?? s.links[0]?.href} className="drawer-sec">
                    {s.title && <span className="drawer-title">{s.title}</span>}
                    {s.links.map((l) =>
                      l.external ? (
                        <a
                          key={l.href}
                          href={l.href}
                          target="_blank"
                          rel="noopener"
                        >
                          {l.label}
                        </a>
                      ) : (
                        <Link
                          key={l.href}
                          href={l.href}
                          className={
                            pathname === l.href.split("#")[0] ? "on" : ""
                          }
                          onClick={() => setOpen(false)}
                        >
                          {l.label}
                        </Link>
                      ),
                    )}
                  </div>
                ))}
              </div>
              <div className="drawer-foot">{footer}</div>
            </aside>
          </>,
          document.body,
        )}
    </>
  );
}
