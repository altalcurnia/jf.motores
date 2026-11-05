"use client";

export const WEEK_DAYS = [
  { key: "1", short: "Lun", full: "Lunes", en: "Mon", pt: "Seg" },
  { key: "2", short: "Mar", full: "Martes", en: "Tue", pt: "Ter" },
  { key: "3", short: "Mié", full: "Miércoles", en: "Wed", pt: "Qua" },
  { key: "4", short: "Jue", full: "Jueves", en: "Thu", pt: "Qui" },
  { key: "5", short: "Vie", full: "Viernes", en: "Fri", pt: "Sex" },
  { key: "6", short: "Sáb", full: "Sábado", en: "Sat", pt: "Sáb" },
  { key: "7", short: "Dom", full: "Domingo", en: "Sun", pt: "Dom" },
] as const;

export type DayKey = (typeof WEEK_DAYS)[number]["key"];
export type DayHoursMap = Record<string, [string, string]>;

/** Lista de horas cada 30 minutos desde las 05:00 hasta las 22:00 para elegir sin escribir. */
export const TIME_OPTIONS: { value: string; label: string }[] = [];
for (let h = 5; h <= 22; h++) {
  for (const m of [0, 30]) {
    if (h === 22 && m === 30) continue;
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    const value = `${hh}:${mm}`;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 ? "a. m." : "p. m.";
    TIME_OPTIONS.push({ value, label: `${h12}:${mm} ${ampm}` });
  }
}

export const QUICK_RANGES: { label: string; from: string; to: string }[] = [
  { label: "7:30 a. m. – 5:30 p. m.", from: "07:30", to: "17:30" },
  { label: "8:00 a. m. – 6:00 p. m.", from: "08:00", to: "18:00" },
  { label: "8:00 a. m. – 5:00 p. m.", from: "08:00", to: "17:00" },
  { label: "7:00 a. m. – 5:00 p. m.", from: "07:00", to: "17:00" },
  { label: "Sáb / Medio día (8:00 a. m. – 1:00 p. m.)", from: "08:00", to: "13:00" },
];

function fmtTimeEs(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr || 0);
  if (!Number.isFinite(h)) return hhmm;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const ampm = h < 12 ? "a. m." : "p. m.";
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtTimeEn(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr || 0);
  if (!Number.isFinite(h)) return hhmm;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const ampm = h < 12 ? "am" : "pm";
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtTimePt(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr || 0);
  if (!Number.isFinite(h)) return hhmm;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/**
 * Agrupa días consecutivos que tienen el mismo horario [from, to] y devuelve
 * el texto listo en Español, Inglés y Portugués.
 */
export function formatScheduleTrilingual(
  days: string[],
  defaultFrom: string,
  defaultTo: string,
  perDay: boolean,
  dayHours: DayHoursMap,
): { es: string; en: string; pt: string } {
  const ordered = WEEK_DAYS.filter((d) => days.includes(d.key));
  if (!ordered.length) return { es: "", en: "", pt: "" };

  type Group = { startIdx: number; endIdx: number; from: string; to: string };
  const groups: Group[] = [];

  for (const d of ordered) {
    const idx = Number(d.key);
    const pair = perDay && dayHours[d.key] ? dayHours[d.key] : [defaultFrom, defaultTo];
    const [from, to] = pair;
    const prev = groups[groups.length - 1];
    if (prev && prev.endIdx === idx - 1 && prev.from === from && prev.to === to) {
      prev.endIdx = idx;
    } else {
      groups.push({ startIdx: idx, endIdx: idx, from, to });
    }
  }

  const dayMeta = (idx: number) => WEEK_DAYS.find((d) => Number(d.key) === idx)!;

  const esParts = groups.map((g) => {
    const d1 = dayMeta(g.startIdx).short;
    const d2 = dayMeta(g.endIdx).short;
    const dLabel = g.startIdx === g.endIdx ? d1 : `${d1}–${d2}`;
    return `${dLabel} ${fmtTimeEs(g.from)} – ${fmtTimeEs(g.to)}`;
  });

  const enParts = groups.map((g) => {
    const d1 = dayMeta(g.startIdx).en;
    const d2 = dayMeta(g.endIdx).en;
    const dLabel = g.startIdx === g.endIdx ? d1 : `${d1}–${d2}`;
    return `${dLabel} ${fmtTimeEn(g.from)} – ${fmtTimeEn(g.to)}`;
  });

  const ptParts = groups.map((g) => {
    const d1 = dayMeta(g.startIdx).pt;
    const d2 = dayMeta(g.endIdx).pt;
    const dLabel = g.startIdx === g.endIdx ? d1 : `${d1}–${d2}`;
    return `${dLabel} ${fmtTimePt(g.from)} – ${fmtTimePt(g.to)}`;
  });

  return {
    es: esParts.join(" · "),
    en: enParts.join(" · "),
    pt: ptParts.join(" · "),
  };
}

/** Resumen corto en español para tablas (ej. «Lun–Vie 07:30–17:30 · Sáb 08:00–13:00»). */
export function formatScheduleCompact(
  days: string[],
  defaultFrom: string,
  defaultTo: string,
  perDay: boolean,
  dayHours: DayHoursMap,
): string {
  const ordered = WEEK_DAYS.filter((d) => days.includes(d.key));
  if (!ordered.length) return "Siempre";
  type Group = { startIdx: number; endIdx: number; from: string; to: string };
  const groups: Group[] = [];
  for (const d of ordered) {
    const idx = Number(d.key);
    const [from, to] = perDay && dayHours[d.key] ? dayHours[d.key] : [defaultFrom, defaultTo];
    const prev = groups[groups.length - 1];
    if (prev && prev.endIdx === idx - 1 && prev.from === from && prev.to === to) {
      prev.endIdx = idx;
    } else {
      groups.push({ startIdx: idx, endIdx: idx, from, to });
    }
  }
  const dayMeta = (idx: number) => WEEK_DAYS.find((d) => Number(d.key) === idx)!;
  return groups
    .map((g) => {
      const d1 = dayMeta(g.startIdx).short;
      const d2 = dayMeta(g.endIdx).short;
      const dLabel = g.startIdx === g.endIdx ? d1 : `${d1}–${d2}`;
      return `${dLabel} ${g.from}–${g.to}`;
    })
    .join(" · ");
}

export type ScheduleEditorProps = {
  days: string[];
  from: string;
  to: string;
  perDay: boolean;
  dayHours: DayHoursMap;
  emptyLabel?: string;
  onChange: (next: {
    days: string[];
    from: string;
    to: string;
    perDay: boolean;
    dayHours: DayHoursMap;
  }) => void;
};

/**
 * Selector 100 % interactivo de días y horarios (sin necesidad de escribir).
 * - Por defecto todos los días marcados usan el único horario elegido.
 * - Si se activa «Horarios diferentes para cada día», cada día activo permite elegir su propio horario.
 */
export function ScheduleEditor({
  days,
  from,
  to,
  perDay,
  dayHours,
  emptyLabel = "Sin días marcados = disponible siempre (24/7)",
  onChange,
}: ScheduleEditorProps) {
  function ensureDayHours(nextDays: string[], baseFrom: string, baseTo: string, currentMap: DayHoursMap): DayHoursMap {
    const out: DayHoursMap = { ...currentMap };
    for (const d of nextDays) {
      if (!out[d]) out[d] = [baseFrom, baseTo];
    }
    return out;
  }

  function toggleDay(dayKey: string) {
    const exists = days.includes(dayKey);
    const nextDays = exists
      ? days.filter((d) => d !== dayKey)
      : [...days, dayKey].sort((a, b) => Number(a) - Number(b));
    const nextMap = ensureDayHours(nextDays, dayKey === "6" ? "08:00" : from, dayKey === "6" ? "13:00" : to, dayHours);
    onChange({ days: nextDays, from, to, perDay, dayHours: nextMap });
  }

  function applyPresetDays(preset: "lv" | "ls" | "lvs_half" | "all" | "none") {
    if (preset === "none") {
      onChange({ days: [], from, to, perDay: false, dayHours: {} });
      return;
    }
    if (preset === "lv") {
      const nextDays = ["1", "2", "3", "4", "5"];
      onChange({
        days: nextDays,
        from,
        to,
        perDay,
        dayHours: ensureDayHours(nextDays, from, to, dayHours),
      });
      return;
    }
    if (preset === "ls") {
      const nextDays = ["1", "2", "3", "4", "5", "6"];
      onChange({
        days: nextDays,
        from,
        to,
        perDay,
        dayHours: ensureDayHours(nextDays, from, to, dayHours),
      });
      return;
    }
    if (preset === "lvs_half") {
      const nextDays = ["1", "2", "3", "4", "5", "6"];
      const nextMap: DayHoursMap = {
        "1": [from, to],
        "2": [from, to],
        "3": [from, to],
        "4": [from, to],
        "5": [from, to],
        "6": ["08:00", "13:00"],
      };
      onChange({
        days: nextDays,
        from,
        to,
        perDay: true,
        dayHours: nextMap,
      });
      return;
    }
    const nextDays = ["1", "2", "3", "4", "5", "6", "7"];
    onChange({
      days: nextDays,
      from,
      to,
      perDay,
      dayHours: ensureDayHours(nextDays, from, to, dayHours),
    });
  }

  function setSingleRange(nextFrom: string, nextTo: string) {
    const nextMap: DayHoursMap = { ...dayHours };
    if (!perDay) {
      for (const d of days) nextMap[d] = [nextFrom, nextTo];
    }
    onChange({ days, from: nextFrom, to: nextTo, perDay, dayHours: nextMap });
  }

  function togglePerDay(checked: boolean) {
    const nextMap: DayHoursMap = {};
    for (const d of days) {
      nextMap[d] = checked ? (dayHours[d] ?? (d === "6" ? ["08:00", "13:00"] : [from, to])) : [from, to];
    }
    onChange({ days, from, to, perDay: checked, dayHours: nextMap });
  }

  function setDayRange(dayKey: string, nextFrom: string, nextTo: string) {
    const nextMap: DayHoursMap = { ...dayHours, [dayKey]: [nextFrom, nextTo] };
    onChange({ days, from, to, perDay: true, dayHours: nextMap });
  }

  const orderedActiveDays = WEEK_DAYS.filter((d) => days.includes(d.key));

  return (
    <div className="sched-builder">
      <div className="sched-presets">
        <span className="muted small">Atajos de días:</span>
        <button type="button" className="chip-btn" onClick={() => applyPresetDays("lv")}>
          Lun a Vie
        </button>
        <button type="button" className="chip-btn" onClick={() => applyPresetDays("ls")}>
          Lun a Sáb (mismo horario)
        </button>
        <button type="button" className="chip-btn" onClick={() => applyPresetDays("lvs_half")}>
          Lun–Vie + Sáb medio día
        </button>
        <button type="button" className="chip-btn" onClick={() => applyPresetDays("all")}>
          Todos los días
        </button>
        <button type="button" className="chip-btn" onClick={() => applyPresetDays("none")}>
          Limpiar
        </button>
      </div>

      <div className="chips">
        {WEEK_DAYS.map((d) => {
          const active = days.includes(d.key);
          return (
            <button
              key={d.key}
              type="button"
              className={`chip ${active ? "on" : ""}`}
              aria-pressed={active}
              onClick={() => toggleDay(d.key)}
            >
              {d.short}
            </button>
          );
        })}
      </div>

      {orderedActiveDays.length === 0 ? (
        <p className="muted small">{emptyLabel}</p>
      ) : (
        <>
          <label className="check-row sched-mode-toggle">
            <input type="checkbox" checked={perDay} onChange={(e) => togglePerDay(e.target.checked)} />
            <span>
              <b>Horarios diferentes para cada día</b>{" "}
              <small className="muted">
                (si no se marca, todos los días elegidos usan el único horario de abajo)
              </small>
            </span>
          </label>

          {!perDay ? (
            <div className="sched-single-box">
              <div className="sched-time-row">
                <span className="sched-day-badge">Todos los días marcados</span>
                <label className="sched-select-wrap">
                  <span className="muted small">Desde</span>
                  <select value={from} onChange={(e) => setSingleRange(e.target.value, to)} aria-label="Desde">
                    {!TIME_OPTIONS.some((t) => t.value === from) && <option value={from}>{from}</option>}
                    {TIME_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label} ({t.value})
                      </option>
                    ))}
                  </select>
                </label>
                <span className="muted">hasta</span>
                <label className="sched-select-wrap">
                  <span className="muted small">Hasta</span>
                  <select value={to} onChange={(e) => setSingleRange(from, e.target.value)} aria-label="Hasta">
                    {!TIME_OPTIONS.some((t) => t.value === to) && <option value={to}>{to}</option>}
                    {TIME_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label} ({t.value})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="sched-presets">
                <span className="muted small">Elegir horario con 1 clic:</span>
                {QUICK_RANGES.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    className={`chip-btn${from === q.from && to === q.to ? " on" : ""}`}
                    onClick={() => setSingleRange(q.from, q.to)}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="sched-per-day-list">
              {orderedActiveDays.map((d) => {
                const [dFrom, dTo] = dayHours[d.key] ?? [from, to];
                return (
                  <div key={d.key} className="sched-day-row">
                    <strong className="sched-day-name">{d.full}</strong>
                    <label className="sched-select-wrap">
                      <span className="muted small">Desde</span>
                      <select
                        value={dFrom}
                        onChange={(e) => setDayRange(d.key, e.target.value, dTo)}
                        aria-label={`Desde ${d.full}`}
                      >
                        {!TIME_OPTIONS.some((t) => t.value === dFrom) && <option value={dFrom}>{dFrom}</option>}
                        {TIME_OPTIONS.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label} ({t.value})
                          </option>
                        ))}
                      </select>
                    </label>
                    <span className="muted">a</span>
                    <label className="sched-select-wrap">
                      <span className="muted small">Hasta</span>
                      <select
                        value={dTo}
                        onChange={(e) => setDayRange(d.key, dFrom, e.target.value)}
                        aria-label={`Hasta ${d.full}`}
                      >
                        {!TIME_OPTIONS.some((t) => t.value === dTo) && <option value={dTo}>{dTo}</option>}
                        {TIME_OPTIONS.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label} ({t.value})
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="sched-day-quick">
                      <button
                        type="button"
                        className={`chip-btn${dFrom === "07:30" && dTo === "17:30" ? " on" : ""}`}
                        onClick={() => setDayRange(d.key, "07:30", "17:30")}
                      >
                        7:30–5:30
                      </button>
                      <button
                        type="button"
                        className={`chip-btn${dFrom === "08:00" && dTo === "18:00" ? " on" : ""}`}
                        onClick={() => setDayRange(d.key, "08:00", "18:00")}
                      >
                        8:00–6:00
                      </button>
                      <button
                        type="button"
                        className={`chip-btn${dFrom === "08:00" && dTo === "13:00" ? " on" : ""}`}
                        onClick={() => setDayRange(d.key, "08:00", "13:00")}
                      >
                        8:00–1:00 (Medio día)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
