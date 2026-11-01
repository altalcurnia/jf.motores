"use client";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

const EVENT = "guidetab";
function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    window.removeEventListener(EVENT, cb);
  };
}

/**
 * Subpestañas de Guías: «Guías oficiales» (por defecto) y «Nuestras guías».
 * La pestaña sale del #ancla, así los enlaces como /guias#pedir-repuesto abren la correcta.
 */
export function GuideTabs(props: {
  labels: { official: string; ours: string };
  ourIds: string[];
  official: ReactNode;
  ours: ReactNode;
}) {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash.slice(1),
    () => "",
  );
  const tab =
    hash === "nuestras" || props.ourIds.includes(hash) ? "ours" : "official";

  // Al llegar con un ancla de una guía (p. ej. #pedir-repuesto), baja hasta ella cuando su pestaña ya está visible
  useEffect(() => {
    if (hash && props.ourIds.includes(hash)) document.getElementById(hash)?.scrollIntoView({ block: "start" });
  }, [hash, props.ourIds]);

  function pick(next: "official" | "ours") {
    history.replaceState(
      null,
      "",
      `#${next === "ours" ? "nuestras" : "oficiales"}`,
    );
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <>
      <div className="guide-subtabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "official"}
          className={tab === "official" ? "on" : ""}
          onClick={() => pick("official")}
        >
          {props.labels.official}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "ours"}
          className={tab === "ours" ? "on" : ""}
          onClick={() => pick("ours")}
        >
          {props.labels.ours}
        </button>
      </div>
      <div role="tabpanel" hidden={tab !== "official"}>
        {props.official}
      </div>
      <div role="tabpanel" hidden={tab !== "ours"}>
        {props.ours}
      </div>
    </>
  );
}
