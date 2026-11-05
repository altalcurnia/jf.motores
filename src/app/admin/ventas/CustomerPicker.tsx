"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type Customer = { id: string; email: string; full_name: string | null; phone: string | null; purchases: number };

/**
 * Campo de correo del cliente: al tocarlo muestra todas las cuentas en orden alfabético,
 * filtra mientras escribes y al elegir una confirma que la cuenta existe.
 */
export function CustomerPicker({
  value,
  onChange,
}: {
  value: Customer | null;
  onChange: (c: Customer | null, typed: string) => void;
}) {
  const [all, setAll] = useState<Customer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(value?.email ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  async function load() {
    if (all) return;
    const { data, error: err } = await createSupabaseBrowserClient().rpc("list_customers");
    if (err) return setError(err.message);
    setAll(data ?? []);
  }

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [open]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (all ?? []).filter((c) => !needle || `${c.email} ${c.full_name ?? ""} ${c.phone ?? ""}`.toLowerCase().includes(needle)).slice(0, 80);
  }, [all, q]);

  function pick(c: Customer) {
    setQ(c.email);
    setOpen(false);
    onChange(c, c.email);
  }

  function type(text: string) {
    setQ(text);
    setOpen(true);
    setActive(0);
    // Si escribe un correo completo que existe, queda verificado sin hacer clic
    const exact = all?.find((c) => c.email.toLowerCase() === text.trim().toLowerCase()) ?? null;
    onChange(exact, text);
  }

  return (
    <div className="picker" ref={box}>
      <input
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls="customer-list"
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Toca para ver las cuentas o escribe el correo"
        value={q}
        onFocus={() => (load(), setOpen(true))}
        onChange={(e) => type(e.target.value)}
        onKeyDown={(e) => {
          if (!open || !shown.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, shown.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(shown[active]);
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && (
        <ul className="picker-list" id="customer-list" role="listbox">
          {error && <li className="picker-empty err-text">{error}</li>}
          {!error && !all && <li className="picker-empty">Cargando cuentas…</li>}
          {all && shown.length === 0 && <li className="picker-empty">Ninguna cuenta coincide.</li>}
          {shown.map((c, n) => (
            <li
              key={c.id}
              role="option"
              aria-selected={n === active}
              className={n === active ? "on" : ""}
              onPointerDown={(e) => (e.preventDefault(), pick(c))}
              onPointerEnter={() => setActive(n)}
            >
              <b>{c.email}</b>
              <span>
                {c.full_name || "Sin nombre"}
                {c.purchases ? ` · ${c.purchases} compra(s)` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
