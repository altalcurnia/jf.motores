"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { engineVariants } from "@/features/engine3d/variants";
import { setEngineVariant } from "./actions";

/**
 * Motor 3D del inicio: tarjetas con cada versión del modelo. Se puede ver en el sitio sin
 * activarla (?motor=vN), usarla, eliminarla (queda oculta) o restaurarla.
 */
export function EngineVariants({ active, hidden, canEdit }: { active: string; hidden: string[]; canEdit: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  async function run(action: "use" | "hide" | "restore", key: string, name: string) {
    if (action === "hide" && !window.confirm(`¿Eliminar «${name}»? Deja de aparecer como opción; puedes restaurarla después.`)) return;
    setBusy(key + action);
    setMsg(null);
    const r = await setEngineVariant(action, key);
    setBusy(null);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setMsg({
      ok: true,
      text:
        action === "use"
          ? `Listo: el inicio ahora muestra «${name}».`
          : action === "hide"
            ? `«${name}» quedó eliminada de las opciones.`
            : `«${name}» volvió a las opciones.`,
    });
    router.refresh();
  }

  const visible = engineVariants.filter((v) => !hidden.includes(v.key));
  const removed = engineVariants.filter((v) => hidden.includes(v.key));

  return (
    <section className="panel engine-variants">
      <h2>Motor 3D del inicio</h2>
      <p className="muted small">
        Todas las versiones tienen las mismas 19 piezas, botones y recorrido; cambia solo el modelo. Usa «Ver en el sitio»
        para compararlas sin cambiar lo que ve el público.
      </p>
      <div className="ev-grid">
        {visible.map((v) => {
          const isActive = v.key === active;
          return (
            <article key={v.key} className={`ev-card${isActive ? " on" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura estática */}
              <img src={v.thumb} alt={`Vista previa de ${v.name}`} loading="lazy" />
              <div className="ev-body">
                <h3>
                  {v.name} {isActive && <span className="pill ok">En el sitio</span>}
                </h3>
                <p className="muted small">{v.desc}</p>
                <div className="ev-actions">
                  <a className="btn-ghost" href={`/es?motor=${v.key}#journey`} target="_blank" rel="noopener">
                    Ver en el sitio
                  </a>
                  {canEdit && !isActive && (
                    <button type="button" className="btn-primary" disabled={!!busy} onClick={() => run("use", v.key, v.name)}>
                      {busy === v.key + "use" ? "Guardando…" : "Usar esta"}
                    </button>
                  )}
                  {canEdit && !isActive && (
                    <button type="button" className="btn-ghost danger" disabled={!!busy} onClick={() => run("hide", v.key, v.name)}>
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
              {removed.map((v) => (
                <li key={v.key}>
                  <span>{v.name}</span>
                  {canEdit && (
                    <button type="button" className="btn-ghost" disabled={!!busy} onClick={() => run("restore", v.key, v.name)}>
                      Restaurar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {!canEdit && <p className="muted small">Necesitas el permiso «Editar datos de la empresa» para cambiarlo.</p>}
      {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
    </section>
  );
}
