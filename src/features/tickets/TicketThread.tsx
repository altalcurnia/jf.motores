"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { MAX_TICKET_IMAGES, signedTicketUrls, uploadTicketImages } from "./images";

export type ThreadLabels = {
  you: string;
  team: string;
  customer: string;
  placeholder: string;
  send: string;
  attach: string;
  sending: string;
  closed: string;
  reopenHint: string;
  error: string;
  photo: string;
};

type Message = { id: string; body: string; images: string[]; from_staff: boolean; created_at: string };

/**
 * Conversación de un ticket (la usan el cliente y el equipo). Lee con RLS desde el navegador,
 * se actualiza sola cada pocos segundos mientras está abierta y permite adjuntar fotos.
 */
export function TicketThread({
  ticketId,
  viewer,
  status,
  labels,
  locale = "es",
  onPosted,
}: {
  ticketId: string;
  viewer: "client" | "staff";
  status: "abierto" | "respondido" | "cerrado";
  labels: ThreadLabels;
  locale?: string;
  onPosted?: () => void;
}) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" });

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("ticket_messages")
      .select("id, body, images, from_staff, created_at")
      .eq("ticket_id", ticketId)
      .order("created_at");
    const list = (data ?? []) as Message[];
    setMsgs((prev) => (prev.length === list.length && prev.at(-1)?.id === list.at(-1)?.id ? prev : list));
    const missing = list.flatMap((m) => m.images);
    if (missing.length) {
      const signed = await signedTicketUrls(missing);
      setUrls((u) => ({ ...u, ...signed }));
    }
    await supabase.rpc("ticket_mark_read", { ticket: ticketId });
  }, [ticketId]);

  useEffect(() => {
    let alive = true;
    const tick = () => alive && load();
    tick();
    const id = setInterval(tick, 8000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [load]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy || (!text.trim() && !files.length)) return;
    setBusy(true);
    setErr(null);
    const up = await uploadTicketImages(files);
    if (up.error) {
      setBusy(false);
      return setErr(labels.error);
    }
    const res = await fetch(`/api/tickets/${ticketId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text.trim(), images: up.paths }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) return setErr(data.error ?? labels.error);
    setText("");
    setFiles([]);
    await load();
    onPosted?.();
  }

  const mine = (m: Message) => (viewer === "staff" ? m.from_staff : !m.from_staff);
  return (
    <div className="tk-thread">
      <div className="tk-msgs" ref={listRef}>
        {msgs.map((m) => (
          <div key={m.id} className={`tk-msg ${mine(m) ? "me" : "them"}${m.from_staff ? " staff" : ""}`}>
            <small>
              {mine(m) ? labels.you : m.from_staff ? labels.team : labels.customer} · {fmt.format(new Date(m.created_at))}
            </small>
            {m.body && <p>{m.body}</p>}
            {m.images.length > 0 && (
              <div className="tk-imgs">
                {m.images.map((p) =>
                  urls[p] ? (
                    <button key={p} type="button" onClick={() => setZoom(urls[p])} aria-label={labels.photo}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- enlace temporal del bucket privado */}
                      <img src={urls[p]} alt="" loading="lazy" />
                    </button>
                  ) : (
                    <span key={p} className="tk-img-wait" />
                  ),
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {status === "cerrado" && <p className="tk-closed">{viewer === "client" ? labels.reopenHint : labels.closed}</p>}
      <form className="tk-form" onSubmit={send}>
        {files.length > 0 && (
          <div className="tk-files">
            {files.map((f, i) => (
              <span key={f.name + i}>
                {f.name.slice(0, 18)}
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="✕">
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="tk-row">
          <label className="tk-attach" title={labels.attach}>
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                setFiles((f) => [...f, ...picked].slice(0, MAX_TICKET_IMAGES));
                e.target.value = "";
              }}
            />
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="10" r="1.6" />
              <path d="M21 16l-5-5-8 8" />
            </svg>
            <span className="sr-only">{labels.attach}</span>
          </label>
          <textarea
            rows={1}
            value={text}
            maxLength={4000}
            placeholder={labels.placeholder}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                (e.currentTarget.form as HTMLFormElement).requestSubmit();
              }
            }}
          />
          <button className="tk-send" disabled={busy || (!text.trim() && !files.length)}>
            {busy ? "…" : labels.send}
          </button>
        </div>
        {err && <p className="tk-err">{err}</p>}
      </form>
      {zoom && (
        <button type="button" className="tk-zoom" onClick={() => setZoom(null)} aria-label="✕">
          {/* eslint-disable-next-line @next/next/no-img-element -- vista ampliada */}
          <img src={zoom} alt="" />
        </button>
      )}
    </div>
  );
}
