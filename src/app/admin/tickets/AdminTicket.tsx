"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TicketThread } from "@/features/tickets/TicketThread";
import "@/features/tickets/tickets.css";

const LABELS = {
  you: "Equipo (tú)",
  team: "Equipo JF",
  customer: "Cliente",
  placeholder: "Escribe la respuesta… (Enter envía, Shift+Enter salta de línea)",
  send: "Responder",
  attach: "Adjuntar fotos",
  sending: "Enviando…",
  closed: "Ticket cerrado. Si respondes, el cliente lo verá igual; el cliente puede reabrirlo escribiendo.",
  reopenHint: "",
  error: "No se pudo enviar.",
  photo: "Ver foto",
};

/** Vista de un ticket en el panel: datos del cliente, conversación y cerrar/reabrir. */
export function AdminTicket(props: {
  id: string;
  subject: string;
  status: "abierto" | "respondido" | "cerrado";
  customer: { name: string | null; email: string | null; phone: string | null };
  opened: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function setStatus(s: "abierto" | "cerrado") {
    setBusy(true);
    await createSupabaseBrowserClient().rpc("ticket_set_status", { ticket: props.id, new_status: s });
    setBusy(false);
    router.refresh();
  }
  const wa = props.customer.phone?.replace(/\D/g, "");
  return (
    <div className="tk-admin-ticket">
      <header>
        <div>
          <h2 className="tk-admin-subject">{props.subject}</h2>
          <p className="muted small">
            {props.customer.name ?? "Cliente"}
            {props.customer.email && (
              <>
                {" · "}
                <a href={`mailto:${props.customer.email}`}>{props.customer.email}</a>
              </>
            )}
            {wa && (
              <>
                {" · "}
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener">
                  WhatsApp
                </a>
              </>
            )}
            {" · abierto el "}
            {props.opened}
          </p>
        </div>
        {props.status === "cerrado" ? (
          <button className="btn-ghost" disabled={busy} onClick={() => setStatus("abierto")}>
            Reabrir
          </button>
        ) : (
          <button className="btn-ghost" disabled={busy} onClick={() => setStatus("cerrado")}>
            Cerrar ticket
          </button>
        )}
      </header>
      <div className="tk-admin-thread">
        <TicketThread ticketId={props.id} viewer="staff" status={props.status} labels={LABELS} locale="es-CO" onPosted={() => router.refresh()} />
      </div>
    </div>
  );
}
