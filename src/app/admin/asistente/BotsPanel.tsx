"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  connectTelegram,
  saveTelegram,
  testTelegramTeam,
  type ActionResult,
} from "./actions";

type Status = { ok: boolean; text: string };

export type BotsProps = {
  canSave: boolean;
  telegram: {
    publicEnabled: boolean;
    testChats: string;
    teamChats: string;
    notifyLeads: boolean;
    capUsd: number;
    spentUsd: number;
    messages: number;
    status: Status[];
    webhookUrl: string;
    connectable: boolean;
  };
  whatsapp: { status: Status[]; webhookUrl: string };
};

/** Bots del asistente fuera de la página: Telegram (activo) y WhatsApp (listo para conectar). */
export function BotsPanel({ canSave, telegram, whatsapp }: BotsProps) {
  const router = useRouter();
  const [v, setV] = useState(telegram);
  const [note, setNote] = useState<Status | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      setNote(
        r.ok
          ? { ok: true, text: r.message ?? "Listo." }
          : { ok: false, text: r.error },
      );
      if (r.ok) router.refresh();
    });
  const pct =
    v.capUsd > 0
      ? Math.min(100, Math.round((telegram.spentUsd / v.capUsd) * 100))
      : 0;

  return (
    <div className="pform">
      <div className="pform-grid">
        <section className="panel">
          <h2>Bot de Telegram</h2>
          <p className="muted small">
            El mismo asistente de ventas y técnico de la página, con los mismos
            documentos. Escríbele <code>/id</code> al bot para saber el ID de un
            chat. Para avisos en un grupo, agrega el bot al grupo y escribe{" "}
            <code>/id</code> allí.
          </p>
          <ul className="small">
            {telegram.status.map((s) => (
              <li key={s.text} className={s.ok ? "mail-ok" : "err-text"}>
                {s.ok ? "✓" : "•"} {s.text}
              </li>
            ))}
          </ul>
          <label className="check-row">
            <input
              type="checkbox"
              checked={v.publicEnabled}
              disabled={!canSave}
              onChange={(e) => setV({ ...v, publicEnabled: e.target.checked })}
            />
            <span>
              <b>Abierto al público</b>: responde a cualquier cliente (con el
              tope de gasto). Apagado: solo a los chats de prueba.
            </span>
          </label>
          <label className="field">
            <span className="field-label">
              Chats de prueba (IDs separados por coma)
            </span>
            <input
              value={v.testChats}
              disabled={!canSave}
              placeholder="123456789, 987654321"
              onChange={(e) => setV({ ...v, testChats: e.target.value })}
            />
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={v.notifyLeads}
              disabled={!canSave}
              onChange={(e) => setV({ ...v, notifyLeads: e.target.checked })}
            />
            <span>
              Avisar al equipo de cada cliente nuevo (clic a WhatsApp en la
              página)
            </span>
          </label>
          <label className="field">
            <span className="field-label">
              Chats del equipo que reciben los avisos
            </span>
            <input
              value={v.teamChats}
              disabled={!canSave}
              placeholder="ID personal o de un grupo (los de grupo empiezan con -)"
              onChange={(e) => setV({ ...v, teamChats: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-label">
              Tope de gasto de IA del bot por mes (US$)
            </span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={v.capUsd}
              disabled={!canSave}
              onChange={(e) => setV({ ...v, capUsd: Number(e.target.value) })}
            />
            <small className="muted">
              Este mes: US${telegram.spentUsd.toFixed(3)} en {telegram.messages}{" "}
              respuestas ({pct}% del tope). Al llegar al tope, el bot manda al
              cliente a WhatsApp.
            </small>
          </label>
          {canSave && (
            <div className="bots-actions">
              <button
                className="btn-primary"
                disabled={pending}
                onClick={() => run(() => saveTelegram(v))}
              >
                Guardar Telegram
              </button>
              <button
                className="btn-secondary"
                disabled={pending}
                onClick={() => run(() => testTelegramTeam(v.teamChats))}
              >
                Probar aviso al equipo
              </button>
              <button
                className="btn-secondary"
                disabled={pending || !telegram.connectable}
                onClick={() => run(connectTelegram)}
              >
                {telegram.connectable
                  ? "Conectar el bot (registrar webhook)"
                  : "Faltan las variables de Telegram en Vercel"}
              </button>
            </div>
          )}
          <p className="muted small">
            Dirección del webhook: {telegram.webhookUrl}
          </p>
        </section>

        <section className="panel">
          <h2>Bot de WhatsApp</h2>
          <p className="muted small">
            Integración lista con la API oficial de Meta (WhatsApp Cloud API).
            Mientras se prueba, responde solo a los números de
            WHATSAPP_ALLOWED_NUMBERS; el resto lo atiende el equipo. Las
            respuestas a un cliente que escribió en las últimas 24 h no tienen
            costo de plantilla. Pasos para conectarlo:
            docs/06_GUIA_CONEXIONES.md, sección 7.
          </p>
          <ul className="small">
            {whatsapp.status.map((s) => (
              <li key={s.text} className={s.ok ? "mail-ok" : "err-text"}>
                {s.ok ? "✓" : "•"} {s.text}
              </li>
            ))}
          </ul>
          <p className="muted small">
            URL de devolución de llamada (callback) para Meta:{" "}
            {whatsapp.webhookUrl}
          </p>
        </section>
      </div>
      {note && <p className={note.ok ? "mail-ok" : "err-text"}>{note.text}</p>}
    </div>
  );
}
