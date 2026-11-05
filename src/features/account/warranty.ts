/** Estado de la garantía de una unidad a partir de sus fechas (AAAA-MM-DD). */
export type WarrantyState = { kind: "none" } | { kind: "active" | "expired"; start: string; end: string; daysLeft: number; progress: number };

const day = (d: string) => new Date(`${d}T12:00:00Z`).getTime();

export function warrantyState(start: string | null, end: string | null, today = new Date().toISOString().slice(0, 10)): WarrantyState {
  if (!start || !end) return { kind: "none" };
  const total = Math.max(1, (day(end) - day(start)) / 864e5 + 1);
  const left = Math.round((day(end) - day(today)) / 864e5);
  const used = Math.min(total, Math.max(0, (day(today) - day(start)) / 864e5));
  return { kind: left >= 0 ? "active" : "expired", start, end, daysLeft: Math.max(0, left), progress: Math.round((used / total) * 100) };
}
