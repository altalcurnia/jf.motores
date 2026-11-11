"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type MailLabels = { gmail: string; outlook: string; app: string; copy: string; copied: string; subject: string; choose: string };

/**
 * Enlace de correo que no depende del programa de correo del equipo: un enlace «mailto:» en un PC
 * sin programa de correo configurado abre el navegador (Edge) y no hace nada. Al tocarlo se elige:
 * Gmail o Outlook en la web, la app de correo del equipo (lo normal en celulares) o copiar la dirección.
 */
export function EmailChooser({
  email,
  labels,
  className,
  inline = false,
  children,
}: {
  email: string;
  labels: MailLabels;
  className?: string;
  /** El menú se abre dentro del flujo (tarjetas) en lugar de flotar. */
  inline?: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

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

  const to = encodeURIComponent(email);
  const su = encodeURIComponent(labels.subject);
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}`;
  const outlook = `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${su}`;
  const mailto = `mailto:${email}?subject=${su}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      // Navegadores sin permiso de portapapeles: se selecciona el texto para copiarlo a mano
      const r = document.createRange();
      const node = ref.current?.querySelector(".mail-addr");
      if (node) {
        r.selectNodeContents(node);
        getSelection()?.removeAllRanges();
        getSelection()?.addRange(r);
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <span ref={ref} className={`mail-pick${open ? " open" : ""}${inline ? " inline" : ""}`}>
      <button type="button" className={className} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        {children ?? email}
      </button>
      {open && (
        <span className="mail-menu" role="menu" aria-label={labels.choose}>
          <span className="mail-addr">{email}</span>
          <a role="menuitem" href={gmail} target="_blank" rel="noopener" onClick={() => setOpen(false)}>
            <i className="mi gm" aria-hidden="true">G</i> {labels.gmail}
          </a>
          <a role="menuitem" href={outlook} target="_blank" rel="noopener" onClick={() => setOpen(false)}>
            <i className="mi ol" aria-hidden="true">O</i> {labels.outlook}
          </a>
          <a role="menuitem" href={mailto} onClick={() => setOpen(false)}>
            <i className="mi ap" aria-hidden="true">✉</i> {labels.app}
          </a>
          <button type="button" role="menuitem" onClick={copy}>
            <i className="mi cp" aria-hidden="true">⧉</i> {copied ? labels.copied : labels.copy}
          </button>
        </span>
      )}
    </span>
  );
}
