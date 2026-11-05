"use client";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

const EVENT = "guidetab";
const TABS = ["official", "ours", "videos"] as const;
type Tab = (typeof TABS)[number];
const HASH: Record<Tab, string> = { official: "oficiales", ours: "nuestras", videos: "videos" };
function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    window.removeEventListener(EVENT, cb);
  };
}

/**
 * Subpestañas de Guías: «Guías oficiales» (por defecto), «Nuestras guías» y «Videos».
 * La pestaña sale del #ancla, así los enlaces como /guias#pedir-repuesto abren la correcta.
 */
export function GuideTabs(props: {
  labels: { official: string; ours: string; videos: string };
  ourIds: string[];
  official: ReactNode;
  ours: ReactNode;
  videos: ReactNode;
}) {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash.slice(1),
    () => "",
  );
  const tab: Tab = hash === "videos" ? "videos" : hash === "nuestras" || props.ourIds.includes(hash) ? "ours" : "official";

  // Al llegar con un ancla de una guía (p. ej. #pedir-repuesto), baja hasta ella cuando su pestaña ya está visible
  useEffect(() => {
    if (hash && props.ourIds.includes(hash)) document.getElementById(hash)?.scrollIntoView({ block: "start" });
  }, [hash, props.ourIds]);

  function pick(next: Tab) {
    history.replaceState(null, "", `#${HASH[next]}`);
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <>
      <div className="guide-subtabs" role="tablist">
        {TABS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => pick(k)}>
            {props.labels[k]}
          </button>
        ))}
      </div>
      {TABS.map((k) => (
        <div key={k} role="tabpanel" hidden={tab !== k}>
          {props[k]}
        </div>
      ))}
    </>
  );
}
