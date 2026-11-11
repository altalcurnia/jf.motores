"use client";
import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { localeTags, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { COUNTRIES } from "@/features/account/forms";

type T = Dictionary["appForm"];
export type WaitlistValue = {
  full_name: string;
  phone: string;
  country: string;
  company: string;
  role: string;
  units_count: string;
  site_type: string[];
  signal: string;
  plan: string;
  priorities: string[];
  site_visits: string;
  budget: string;
  comments: string;
  contact_ok: boolean;
};

const nullIfEmpty = (v: string) => (v.trim() ? v.trim() : null);

/** Formulario de la lista de espera de JF Monitor. Se guarda en la cuenta del usuario (una respuesta por cuenta). */
export function WaitlistForm({ t, locale, userId, initial, exists }: { t: T; locale: Locale; userId: string; initial: WaitlistValue; exists: boolean }) {
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(exists);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(exists ? { ok: true, text: t.already } : null);
  const countries = useMemo(() => {
    const dn = new Intl.DisplayNames([localeTags[locale]], { type: "region" });
    return COUNTRIES.map((c) => ({ code: c, name: dn.of(c) ?? c })).sort((a, b) => a.name.localeCompare(b.name));
  }, [locale]);
  const set = <K extends keyof WaitlistValue>(k: K, value: WaitlistValue[K]) => setV((p) => ({ ...p, [k]: value }));
  const toggle = (k: "site_type" | "priorities", item: string) =>
    setV((p) => ({ ...p, [k]: p[k].includes(item) ? p[k].filter((x) => x !== item) : [...p[k], item] }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const digits = v.phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) return setMsg({ ok: false, text: t.phoneError });
    setBusy(true);
    setMsg(null);
    const supabase = createSupabaseBrowserClient();
    const row = {
      user_id: userId,
      full_name: v.full_name.trim(),
      phone: v.phone.trim(),
      country: v.country || null,
      company: nullIfEmpty(v.company),
      role: v.role || null,
      units_count: v.units_count || null,
      site_type: v.site_type,
      signal: v.signal || null,
      plan: v.plan || null,
      priorities: v.priorities,
      site_visits: v.site_visits || null,
      budget: v.budget || null,
      comments: nullIfEmpty(v.comments),
      contact_ok: v.contact_ok,
      locale,
    };
    const { error } = await supabase.from("app_waitlist").upsert(row, { onConflict: "user_id" });
    if (!error) {
      // Completa el perfil si le faltaban teléfono o país
      await supabase
        .from("profiles")
        .update({ phone: row.phone, ...(row.country ? { country: row.country } : {}) })
        .eq("id", userId)
        .is("phone", null);
    }
    setBusy(false);
    if (error) return setMsg({ ok: false, text: t.error });
    setMsg({ ok: true, text: saved ? t.updatedOk : t.saved });
    setSaved(true);
  }

  const radios = (name: keyof WaitlistValue, options: Record<string, string>) => (
    <div className="wl-options">
      {Object.entries(options).map(([k, label]) => (
        <label key={k} className={`wl-chip ${v[name] === k ? "on" : ""}`}>
          <input type="radio" name={name} value={k} checked={v[name] === k} onChange={() => set(name, k as never)} />
          {label}
        </label>
      ))}
    </div>
  );
  const checks = (name: "site_type" | "priorities", options: Record<string, string>) => (
    <div className="wl-options">
      {Object.entries(options).map(([k, label]) => (
        <label key={k} className={`wl-chip ${v[name].includes(k) ? "on" : ""}`}>
          <input type="checkbox" checked={v[name].includes(k)} onChange={() => toggle(name, k)} />
          {label}
        </label>
      ))}
    </div>
  );

  return (
    <form className="wl-form" onSubmit={submit}>
      <fieldset>
        <legend>{t.required}</legend>
        <div className="wl-row">
          <label>
            {t.name}
            <input required minLength={2} maxLength={120} autoComplete="name" value={v.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </label>
          <label>
            {t.phone}
            <input required type="tel" maxLength={30} autoComplete="tel" placeholder="+57 300 000 0000" value={v.phone} onChange={(e) => set("phone", e.target.value)} />
          </label>
        </div>
        <div className="wl-row">
          <label>
            {t.country}
            <select value={v.country} onChange={(e) => set("country", e.target.value)}>
              <option value="">{t.select}</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t.company}
            <input maxLength={120} autoComplete="organization" value={v.company} onChange={(e) => set("company", e.target.value)} />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>{t.optional}</legend>
        <div className="wl-q">
          <span>{t.role}</span>
          {radios("role", t.roles)}
        </div>
        <div className="wl-q">
          <span>{t.units}</span>
          {radios("units_count", { "1": "1", "2-5": "2 – 5", "6-10": "6 – 10", "11+": "11+" })}
        </div>
        <div className="wl-q">
          <span>{t.siteType}</span>
          {checks("site_type", t.sites)}
        </div>
        <div className="wl-q">
          <span>{t.signal}</span>
          {radios("signal", t.signals)}
        </div>
        <div className="wl-q">
          <span>{t.plan}</span>
          {radios("plan", t.plans)}
        </div>
        <div className="wl-q">
          <span>{t.priorities}</span>
          {checks("priorities", t.prio)}
        </div>
        <div className="wl-q">
          <span>{t.visits}</span>
          {radios("site_visits", { "0": "0", "1-4": "1 – 4", "5-10": "5 – 10", "11+": "11+" })}
        </div>
        <div className="wl-q">
          <span>{t.budget}</span>
          {radios("budget", t.budgets)}
        </div>
        <label className="wl-q">
          <span>{t.comments}</span>
          <textarea rows={3} maxLength={1000} value={v.comments} onChange={(e) => set("comments", e.target.value)} />
        </label>
      </fieldset>

      <label className="acc-check">
        <input type="checkbox" checked={v.contact_ok} onChange={(e) => set("contact_ok", e.target.checked)} />
        <span>{t.contactOk}</span>
      </label>
      <p className="acc-muted wl-privacy">{t.privacy}</p>
      {msg && <div className={`acc-notice ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
      <button className="btn y wl-submit" disabled={busy}>
        {busy ? t.saving : saved ? t.update : t.submit}
      </button>
    </form>
  );
}
