"use client";
import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { waLead } from "@/features/whatsapp/lead-link";
import { Linkified } from "./Linkified";
import { TicketsPanel } from "@/features/tickets/TicketsPanel";

type Msg = { role: "user" | "assistant"; content: string; kind?: "info" | "error" | "handoff"; summary?: string };

type T = Dictionary["assistant"];

const WaIcon = () => (
  <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
    <path
      fill="currentColor"
      d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8C29 8.7 23.2 3 16 3zm0 23.4c-2.1 0-4.1-.6-5.9-1.6l-.4-.2-3.8 1.2 1.2-3.7-.3-.4c-1.2-1.8-1.8-3.8-1.8-5.9 0-5.9 4.9-10.7 11-10.7s11 4.8 11 10.7S22.1 26.4 16 26.4zm6-8c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.2 1.4 3.4c.2.2 2.4 3.6 5.8 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"
    />
  </svg>
);
const ChatIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5h16v11H9l-5 4z" />
    <path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" strokeWidth="2.6" />
  </svg>
);
const TicketIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" />
    <path d="M9 9h6M9 13h4" />
  </svg>
);
const FAB_KEY = "jf-fab-bottom";
const HeadsetIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <rect x="3" y="13" width="4" height="6" rx="1.5" />
    <rect x="17" y="13" width="4" height="6" rx="1.5" />
    <path d="M19 19c0 1.5-2 2.5-5 2.5" />
  </svg>
);

export function SupportFab({
  locale,
  waHref,
  aiEnabled,
  t,
  tt,
}: {
  locale: Locale;
  waHref: string;
  aiEnabled: boolean;
  t: T;
  tt: Dictionary["tickets"];
}) {
  // Pasa por /api/wa: registra el lead (fuente «asistente») y abre el WhatsApp del asesor asignado
  const waChatHref = (summary?: string) =>
    waLead({ message: summary ? `${t.waMessage}\n${t.waSummary}${summary}` : t.waMessage, source: "asistente", locale });

  const [menu, setMenu] = useState(false);
  const [chat, setChat] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  // null = comprobando; false = sin sesión
  const [session, setSession] = useState<{ login: boolean; leftPct?: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Tickets: panel abierto (o el id del ticket a abrir) y respuestas sin leer
  const [tickets, setTickets] = useState<false | { id: string | null }>(false);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; bottom: number; moved: boolean } | null>(null);
  // Arriba: el menú se abre hacia abajo
  const [upper, setUpper] = useState(true);
  const suppressClick = useRef(false);
  const posRef = useRef(0);

  const refreshUnread = () =>
    fetch("/api/tickets/unread", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { mine?: number }) => setUnread(d.mine ?? 0))
      .catch(() => undefined);

  // Avisos de respuestas y enlace directo desde el correo (?ticket=…)
  useEffect(() => {
    refreshUnread();
    const id = new URLSearchParams(window.location.search).get("ticket");
    if (id && /^[0-9a-f-]{36}$/.test(id)) {
      const open = () => setTickets({ id });
      open();
    }
  }, []);

  // Posición vertical elegida por el usuario (se arrastra el botón arriba o abajo)
  const place = (bottom: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const max = window.innerHeight - 76;
    const b = Math.max(8, Math.min(max, bottom));
    posRef.current = b;
    const up = b > window.innerHeight / 2;
    // Arriba se ancla por el borde superior: el menú crece hacia abajo sin empujar el botón
    const h = el.querySelector<HTMLElement>(".support-fab")?.offsetHeight ?? 52;
    el.style.top = up ? `${window.innerHeight - b - h}px` : "auto";
    el.style.bottom = up ? "auto" : `${b}px`;
    setUpper(up);
  };
  /** Posición por defecto: arriba (bajo la cabecera; en celular, bajo el logo grande de la portada). */
  const defaultBottom = () => window.innerHeight - (window.innerWidth <= 760 ? 214 : 150);
  useEffect(() => {
    let saved = NaN;
    try {
      saved = Number(localStorage.getItem(FAB_KEY));
    } catch {}
    place(saved > 0 ? saved : defaultBottom());
    const onResize = () => {
      if (posRef.current) place(posRef.current);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    drag.current = { y: e.clientY, bottom: window.innerHeight - e.currentTarget.getBoundingClientRect().bottom, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dy) < 6) return;
    d.moved = true;
    wrapRef.current?.classList.add("dragging");
    place(d.bottom - dy);
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    wrapRef.current?.classList.remove("dragging");
    if (!d?.moved) return;
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 0);
    try {
      localStorage.setItem(FAB_KEY, String(posRef.current));
    } catch {}
  };

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);
  useEffect(() => {
    if (!chat) return;
    let alive = true;
    fetch("/api/asistente", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { login?: boolean; leftPct?: number }) => alive && setSession({ login: !!d.login, leftPct: d.leftPct }))
      .catch(() => alive && setSession({ login: true }));
    return () => {
      alive = false;
    };
  }, [chat]);
  useEffect(() => {
    if (chat) inputRef.current?.focus();
    document.body.classList.toggle("chat-open", chat);
    return () => document.body.classList.remove("chat-open");
  }, [chat]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(false);
      setChat(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function ask(q: string) {
    const question = q.trim().slice(0, 800);
    if (!question || busy) return;
    // Se envían también las respuestas de traspaso para que el modelo vea la conversación completa
    const history: Msg[] = [...msgs.filter((m) => !m.kind || m.kind === "handoff"), { role: "user", content: question }];
    setMsgs((m) => [...m, { role: "user", content: question }]);
    setText("");
    setBusy(true);
    try {
      const res = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, messages: history.map(({ role, content }) => ({ role, content })) }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; code?: string; summary?: string };
      if (data.code === "handoff")
        setMsgs((m) => [...m, { role: "assistant", content: data.reply || t.handoff, kind: "handoff", summary: data.summary || question }]);
      else if (data.reply) setMsgs((m) => [...m, { role: "assistant", content: data.reply!, summary: question }]);
      else {
        if (data.code === "login") setSession({ login: false });
        if (data.code === "quota") setSession({ login: true, leftPct: 0 });
        const map: Record<string, string> = { no_info: t.noInfo, limit: t.limit, disabled: t.disabled, quota: t.quota, login: t.loginTitle };
        setMsgs((m) => [...m, { role: "assistant", content: map[data.code ?? ""] ?? t.unavailable, kind: data.code === "no_info" ? "info" : "error" }]);
      }
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: t.unavailable, kind: "error" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {chat && (
        <section className="ai-chat" role="dialog" aria-label={t.title}>
          <header className="ai-head">
            <span className="ai-avatar" aria-hidden="true">
              JF
            </span>
            <div>
              <b>
                {t.title} <em>{t.badge}</em>
              </b>
              <small>{t.aiDesc}</small>
            </div>
            <button type="button" className="ai-x" onClick={() => setChat(false)} aria-label={t.close}>
              ×
            </button>
          </header>
          <div className="ai-list" ref={listRef} aria-live="polite">
            <p className="ai-msg assistant">
              <Linkified text={t.welcome} />
            </p>
            {msgs.length === 0 && session?.login !== false && (
              <div className="ai-sugs">
                {t.suggestions.map((s) => (
                  <button type="button" key={s} onClick={() => ask(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`ai-msg ${m.role}${m.kind ? ` ${m.kind}` : ""}`}>
                {m.role === "assistant" && (!m.kind || m.kind === "handoff") ? <Linkified text={m.content} waHref={waChatHref(m.summary)} /> : m.content}
                {(m.kind || (m.role === "assistant" && /whatsapp/i.test(m.content))) && (
                  <a className="ai-wa" href={waChatHref(m.summary)} target="_blank" rel="noopener">
                    <WaIcon /> {m.kind === "handoff" ? t.toAdvisor : t.toWhatsapp}
                  </a>
                )}
              </div>
            ))}
            {busy && (
              <p className="ai-msg assistant thinking">
                <i />
                <i />
                <i /> {t.thinking}
              </p>
            )}
          </div>
          {session && !session.login ? (
            <div className="ai-login">
              <b>{t.loginTitle}</b>
              <p>{t.loginText}</p>
              <div>
                <a className="btn y" href={`/${locale}/cuenta/entrar?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : `/${locale}`)}`}>
                  {t.login}
                </a>
                <a className="btn g" href={`/${locale}/cuenta/registro?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : `/${locale}`)}`}>
                  {t.register}
                </a>
              </div>
            </div>
          ) : (
          <form
            className="ai-form"
            onSubmit={(e) => {
              e.preventDefault();
              ask(text);
            }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              maxLength={800}
              placeholder={t.placeholder}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(text);
                }
              }}
            />
            <button className="ai-send" disabled={busy || !text.trim() || session?.leftPct === 0} aria-label={t.send}>
              ➤
            </button>
          </form>
          )}
          {session?.login && session.leftPct !== undefined && session.leftPct <= 25 && (
            <p className="ai-low">{session.leftPct === 0 ? t.quota : t.low.replace("{n}", String(session.leftPct))}</p>
          )}
          <p className="ai-notice">{t.notice}</p>
        </section>
      )}

      {tickets && (
        <TicketsPanel
          t={tt}
          locale={locale}
          initialTicket={tickets.id}
          onClose={() => setTickets(false)}
          onChanged={refreshUnread}
        />
      )}
      <div ref={wrapRef} className={`support${upper ? " upper" : ""}${menu ? " open" : ""}${chat || tickets ? " chatting" : ""}`}>
        {menu && (
          <div className="support-menu" role="menu">
            <a role="menuitem" className="support-opt sopt-wa" href={waHref} target="_blank" rel="noopener" onClick={(e) => {
              setMenu(false);
              const pdBtn = document.querySelector<HTMLAnchorElement>(".pd-actions a[href*='/api/wa']");
              const targetHref = pdBtn?.getAttribute("href");
              if (targetHref) e.currentTarget.href = targetHref;
            }}>
              <span className="ico">
                <WaIcon />
              </span>
              <span>
                <b>{t.whatsapp}</b>
                <small>{t.whatsappDesc}</small>
              </span>
            </a>
            {aiEnabled && (
              <button
                type="button"
                role="menuitem"
                className="support-opt sopt-ai"
                onClick={() => {
                  setMenu(false);
                  setChat(true);
                }}
              >
                <span className="ico">
                  <ChatIcon />
                </span>
                <span>
                  <b>
                    {t.ai} <em>{t.badge}</em>
                  </b>
                  <small>{t.aiDesc}</small>
                </span>
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              className="support-opt sopt-tk"
              onClick={() => {
                setMenu(false);
                setChat(false);
                setTickets({ id: null });
              }}
            >
              <span className="ico">
                <TicketIcon />
              </span>
              <span>
                <b>
                  {tt.option}
                  {unread > 0 && <em className="tk-badge">{unread}</em>}
                </b>
                <small>{tt.optionDesc}</small>
              </span>
            </button>
          </div>
        )}
        <button
          type="button"
          className="support-fab"
          title={tt.dragHint}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-expanded={menu}
          aria-label={menu ? t.fabClose : t.fab}
          onClick={() => {
            if (suppressClick.current) return;
            setChat(false);
            setTickets(false);
            setMenu((v) => {
              if (!v) refreshUnread();
              return !v;
            });
          }}
        >
          {menu ? <span className="x">×</span> : <HeadsetIcon />}
          <span className="lbl-txt">{t.fab}</span>
          {!menu && unread > 0 && <span className="fab-dot" aria-label={tt.newReply} />}
        </button>
      </div>
    </>
  );
}
