"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { brandVersions } from "@/features/brand/brands";
import { setBrandVersion } from "./actions";

/**
 * Versión de marca del sitio: textos y paleta. Usar una, eliminarla de las opciones o restaurarla.
 * La activa no se puede eliminar; si queda una sola, no hay botón de eliminar.
 */
export function BrandVersions({ active, hidden, canEdit }: { active: string; hidden: string[]; canEdit: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const visible = brandVersions.filter((b) => !hidden.includes(b.key));
  const removed = brandVersions.filter((b) => hidden.includes(b.key));

  async function run(action: "use" | "hide" | "restore", key: string, name: string) {
    if (action === "hide" && !window.confirm(`¿Eliminar «${name}» de las opciones? Puedes restaurarla después.`)) return;
    setBusy(key + action);
    setMsg(null);
    const r = await setBrandVersion(action, key);
    setBusy(null);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setMsg({
      ok: true,
      text:
        action === "use"
          ? `Listo: el sitio ahora usa «${name}». Recarga cualquier página para verlo.`
          : action === "hide"
            ? `«${name}» quedó eliminada de las opciones.`
            : `«${name}» volvió a las opciones.`,
    });
    router.refresh();
  }

  return (
    <section className="panel engine-variants">
      <h2>Marca del sitio</h2>
      <p className="muted small">
        Cambia los textos de la página y la paleta de colores. El cambio es inmediato en todo el sitio y se puede deshacer
        eligiendo otra versión.
      </p>
      <div className="ev-grid">
        {visible.map((b) => {
          const isActive = b.key === active;
          return (
            <article key={b.key} className={`ev-card${isActive ? " on" : ""}`}>
              <div className="bv-swatches" aria-hidden="true">
                {b.swatches.map((c) => (
                  <span key={c} style={{ background: c }} />
                ))}
              </div>
              <div className="ev-body">
                <h3>
                  {b.name} {isActive && <span className="pill ok">En el sitio</span>}
                </h3>
                <p className="muted small">{b.desc}</p>
                <div className="ev-actions">
                  {canEdit && !isActive && (
                    <button type="button" className="btn-primary" disabled={!!busy} onClick={() => run("use", b.key, b.name)}>
                      {busy === b.key + "use" ? "Guardando…" : "Usar esta"}
                    </button>
                  )}
                  {canEdit && !isActive && visible.length > 1 && (
                    <button type="button" className="btn-ghost danger" disabled={!!busy} onClick={() => run("hide", b.key, b.name)}>
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {removed.length > 0 && (
        <div className="ev-removed">
          <button type="button" className="btn-ghost" onClick={() => setShowHidden((x) => !x)}>
            {showHidden ? "Ocultar" : "Ver"} eliminadas ({removed.length})
          </button>
          {showHidden && (
            <ul>
              {removed.map((b) => (
                <li key={b.key}>
                  <span>{b.name}</span>
                  {canEdit && (
                    <button type="button" className="btn-ghost" disabled={!!busy} onClick={() => run("restore", b.key, b.name)}>
                      Restaurar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {!canEdit && <p className="muted small">Necesitas el permiso «Editar datos de la empresa» para cambiarla.</p>}
      {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
    </section>
  );
}
