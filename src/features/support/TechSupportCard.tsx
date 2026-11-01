"use client";
import { useState } from "react";

/** Tarjeta «Soporte técnico»: al tocarla despliega dos caminos, WhatsApp o correo. */
export function TechSupportCard(props: {
  h: string;
  p: string;
  cta: string;
  waHref: string;
  email: string | null;
  labels: { whatsapp: string; whatsappDesc: string; email: string; emailDesc: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`help-card primary tech-card${open ? " open" : ""}`}>
      <h2>{props.h}</h2>
      <p>{props.p}</p>
      {open ? (
        <div className="tech-opts">
          <a className="tech-opt tech-wa" href={props.waHref} target="_blank" rel="noopener">
            <b>{props.labels.whatsapp}</b>
            <small>{props.labels.whatsappDesc}</small>
          </a>
          {props.email && (
            <a className="tech-opt tech-mail" href={`mailto:${props.email}`}>
              <b>{props.labels.email}</b>
              <small>{props.labels.emailDesc.replace("{email}", props.email)}</small>
            </a>
          )}
        </div>
      ) : (
        <button type="button" className="catalog-card-cta tech-toggle" aria-expanded={open} onClick={() => setOpen(true)}>
          {props.cta} <span aria-hidden="true">▾</span>
        </button>
      )}
    </div>
  );
}
