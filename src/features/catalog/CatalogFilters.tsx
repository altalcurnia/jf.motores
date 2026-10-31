"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Option = { value: string; label: string };
type Labels = {
  all: string;
  available: string;
  sold: string;
  search: string;
  category: string;
  allCategories: string;
  compatibleWith: string;
  anyModel: string;
  sort: string;
  sortNew: string;
  sortPriceAsc: string;
  sortPriceDesc: string;
  sortHp: string;
};

/** Filtros del catálogo. Todo vive en la URL para poder compartir o volver atrás. */
export function CatalogFilters({ t, categories, models }: { t: Labels; categories: Option[]; models: Option[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  // Búsqueda con una pequeña espera para no recargar en cada letra
  useEffect(() => {
    if ((params.get("q") ?? "") === q) return;
    const id = setTimeout(() => set("q", q.trim()), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const status = params.get("estado") ?? "all";
  const statuses: Option[] = [
    { value: "all", label: t.all },
    { value: "disponible", label: t.available },
    { value: "vendido", label: t.sold },
  ];

  return (
    <div className={`cf ${pending ? "is-pending" : ""}`}>
      <div className="cf-seg" role="group">
        {statuses.map((s) => (
          <button key={s.value} type="button" className={status === s.value ? "on" : ""} aria-pressed={status === s.value} onClick={() => set("estado", s.value === "all" ? "" : s.value)}>
            {s.label}
          </button>
        ))}
      </div>
      <input className="cf-search" type="search" placeholder={t.search} aria-label={t.search} value={q} onChange={(e) => setQ(e.target.value)} />
      {categories.length > 1 && (
        <label className="cf-field">
          <span>{t.category}</span>
          <select value={params.get("categoria") ?? ""} onChange={(e) => set("categoria", e.target.value)}>
            <option value="">{t.allCategories}</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {models.length > 0 && (
        <label className="cf-field">
          <span>{t.compatibleWith}</span>
          <select value={params.get("motor") ?? ""} onChange={(e) => set("motor", e.target.value)}>
            <option value="">{t.anyModel}</option>
            {models.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="cf-field">
        <span>{t.sort}</span>
        <select value={params.get("orden") ?? "new"} onChange={(e) => set("orden", e.target.value === "new" ? "" : e.target.value)}>
          <option value="new">{t.sortNew}</option>
          <option value="price-asc">{t.sortPriceAsc}</option>
          <option value="price-desc">{t.sortPriceDesc}</option>
          <option value="hp">{t.sortHp}</option>
        </select>
      </label>
    </div>
  );
}
