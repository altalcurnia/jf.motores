"use client";
import { useCallback, useEffect, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { MAX_TICKET_IMAGES, uploadTicketImages } from "./images";
import { TicketThread } from "./TicketThread";
import "./tickets.css";

type T = Dictionary["tickets"];
type Ticket = { id: string; subject: string; status: "abierto" | "respondido" | "cerrado"; user_unread: boolean; updated_at: string };

/** Panel de tickets del cliente (se abre desde el botón Soporte): lista, nuevo ticket y conversación. */
export function TicketsPanel({
  t,
  locale,
  initialTicket,
  onClose,
  onChanged,
}: {
  t: T;
  locale: Locale;
  initialTicket?: string | null;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [login, setLogin] = useState<boolean | null>(null);
  const [list, setList] = useState<Ticket[]>([]);
  const [view, setView] = useState<{ kind: "list" } | { kind: "new" } | { kind: "thread"; id: string }>(
    initialTicket ? { kind: "thread", id: initialTicket } : { kind: "list" },
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return setLogin(false);
    setLogin(true);
    const { data } = await supabase
      .from("tickets")
      .select("id, subject, status, user_unread, updated_at")
      .eq("user_id", auth.user.id)
      .order("updated_at", { ascending: false })
      .limit(30);
    setList((data ?? []) as Ticket[]);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => alive && (await load()))();
    return () => {
      alive = false;
    };
  }, [load, view.kind]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.classList.add("chat-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("chat-open");
    };
  }, [onClose]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    const up = await uploadTicketImages(files);
    if (up.error) {
      setBusy(false);
      return setErr(t.thread.error);
    }
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body, images: up.paths }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
    setBusy(false);
    if (!res.ok || !data.id) return setErr(data.error ?? t.thread.error);
    setSubject("");
    setBody("");
    setFiles([]);
    setView({ kind: "thread", id: data.id });
    onChanged?.();
  }

  const current = view.kind === "thread" ? list.find((x) => x.id === view.id) : undefined;
  const here = typeof window !== "undefined" ? window.location.pathname : `/${locale}`;

  return (
    <section className="ai-chat tk-panel" role="dialog" aria-label={t.title}>
      <header className="ai-head">
        <span className="ai-avatar" aria-hidden="true">
          JF
        </span>
        <div>
          <b>{current ? current.subject : t.title}</b>
          <small>{current ? t.status[current.status] : t.subtitle}</small>
        </div>
        <button type="button" className="ai-x" onClick={onClose} aria-label="✕">
          ×
        </button>
      </header>

      {login === false ? (
        <div className="ai-login tk-body">
          <b>{t.loginTitle}</b>
          <p>{t.loginText}</p>
          <div>
            <a className="btn y" href={`/${locale}/cuenta/entrar?next=${encodeURIComponent(here)}`}>
              {t.login}
            </a>
            <a className="btn g" href={`/${locale}/cuenta/registro?next=${encodeURIComponent(here)}`}>
              {t.signup}
            </a>
          </div>
        </div>
      ) : view.kind === "thread" ? (
        <div className="tk-body tk-body-thread">
          <div className="tk-bar">
            <button type="button" className="tk-link" onClick={() => setView({ kind: "list" })}>
              {t.back}
            </button>
            {current && current.status !== "cerrado" && (
              <button
                type="button"
                className="tk-link"
                onClick={async () => {
                  await createSupabaseBrowserClient().rpc("ticket_set_status", { ticket: view.id, new_status: "cerrado" });
                  await load();
                }}
              >
                {t.close}
              </button>
            )}
          </div>
          <TicketThread
            ticketId={view.id}
            viewer="client"
            status={current?.status ?? "abierto"}
            labels={t.thread}
            locale={locale}
            onPosted={() => {
              load();
              onChanged?.();
            }}
          />
        </div>
      ) : view.kind === "new" ? (
        <form className="tk-body tk-new" onSubmit={create}>
          <button type="button" className="tk-link" onClick={() => setView({ kind: "list" })}>
            {t.back}
          </button>
          <label>
            <span>{t.subject}</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} required minLength={3} placeholder={t.subjectPh} />
          </label>
          <label>
            <span>{t.message}</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} rows={5} placeholder={t.messagePh} />
          </label>
          <label className="tk-pick">
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                setFiles((f) => [...f, ...Array.from(e.target.files ?? [])].slice(0, MAX_TICKET_IMAGES));
                e.target.value = "";
              }}
            />
            📷 {t.thread.attach} <small>{files.length ? `${files.length}/${MAX_TICKET_IMAGES}` : t.photosHint}</small>
          </label>
          {err && <p className="tk-err">{err}</p>}
          <button className="btn y tk-submit" disabled={busy || subject.trim().length < 3 || (!body.trim() && !files.length)}>
            {busy ? t.creating : t.create}
          </button>
        </form>
      ) : (
        <div className="tk-body tk-list">
          <button type="button" className="btn y tk-submit" onClick={() => setView({ kind: "new" })} disabled={login === null}>
            + {t.newTicket}
          </button>
          <h3>{t.myTickets}</h3>
          {list.length === 0 && login && <p className="tk-empty">{t.empty}</p>}
          {list.map((x) => (
            <button key={x.id} type="button" className={`tk-item${x.user_unread ? " unread" : ""}`} onClick={() => setView({ kind: "thread", id: x.id })}>
              <span>
                <b>{x.subject}</b>
                <small>
                  {fmt.format(new Date(x.updated_at))}
                  {x.user_unread ? ` · ${t.newReply}` : ""}
                </small>
              </span>
              <em className={`tk-st ${x.status}`}>{t.status[x.status]}</em>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
