import { Suspense } from "react";
import { can, getSession } from "@/lib/auth";
import { supabasePublicEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminTopbar } from "../AdminTopbar";
import { AdvisorsManager, type AdvisorRow, type BranchOption, type RuleRow } from "./AdvisorsManager";

export const metadata = { title: "Asesores y reparto" };

export default function AdvisorsPage() {
  return (
    <main className="shell">
      <AdminTopbar />
      <h1>Asesores y reparto de cotizaciones</h1>
      <p className="muted lead">
        Cada clic a WhatsApp se asigna a un asesor: primero al que ya atendió a ese cliente; luego según las reglas (de menor a
        mayor prioridad); y si nada aplica, al asesor de <b>respaldo</b>. Con la regla «Rotación general» los leads se reparten por
        turnos entre todos los asesores activos.
      </p>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <Body />
      </Suspense>
    </main>
  );
}

async function Body() {
  const session = await getSession();
  if (!session || !session.role.isInternal || !can(session, "asesores.gestionar")) {
    return <div className="notice err">No tienes permiso para gestionar asesores.</div>;
  }
  const supabase = await createSupabaseServerClient();
  const [{ data: advisors, error }, { data: rules }, { data: branches }] = await Promise.all([
    supabase
      .from("advisors")
      .select(
        "id, name, title, phone_e164, public_email, branch_id, photo_path, show_on_site, languages, catalogs, countries, schedule, weight, active, is_fallback, profile_id, profiles ( email )",
      )
      .order("sort")
      .order("created_at"),
    supabase.from("routing_rules").select("id, name, priority, conditions, strategy, advisor_ids, active").order("priority"),
    supabase.from("branches").select("id, name, city").order("sort"),
  ]);
  if (error) return <div className="notice err">No se pudieron leer los asesores: {error.message}</div>;
  const rows: AdvisorRow[] = (advisors ?? []).map((a) => {
    const sched = (a.schedule ?? {}) as { days?: Record<string, [string, string]> };
    const dayMap = sched.days ?? {};
    const days = Object.keys(dayMap).sort((x, y) => Number(x) - Number(y));
    const first = days.length ? dayMap[days[0]] : null;
    const baseFrom = first?.[0] ?? "08:00";
    const baseTo = first?.[1] ?? "18:00";
    const hasDifferentHours = days.some((d) => {
      const pair = dayMap[d];
      return pair && (pair[0] !== baseFrom || pair[1] !== baseTo);
    });
    const titleObj = (a.title ?? {}) as Record<string, string>;
    return {
      id: a.id,
      name: a.name,
      title: titleObj.es ?? "",
      titleEn: titleObj.en ?? "",
      titlePt: titleObj.pt ?? "",
      phone: a.phone_e164,
      email: (a.profiles as { email: string } | null)?.email ?? "",
      publicEmail: a.public_email ?? "",
      branchId: a.branch_id ?? null,
      photoPath: a.photo_path ?? null,
      showOnSite: a.show_on_site ?? true,
      languages: a.languages,
      catalogs: a.catalogs,
      countries: a.countries.join(", "),
      days,
      from: baseFrom,
      to: baseTo,
      perDaySchedule: hasDifferentHours,
      dayHours: dayMap,
      weight: a.weight,
      active: a.active,
      isFallback: a.is_fallback,
    };
  });
  const ruleRows: RuleRow[] = (rules ?? []).map((r) => {
    const c = (r.conditions ?? {}) as { catalogs?: string[]; countries?: string[]; languages?: string[]; in_schedule?: boolean };
    return {
      id: r.id,
      name: r.name,
      priority: r.priority,
      catalogs: c.catalogs ?? [],
      countries: (c.countries ?? []).join(", "),
      languages: c.languages ?? [],
      inSchedule: !!c.in_schedule,
      strategy: (r.strategy === "eleccion" ? "rotacion" : r.strategy) as RuleRow["strategy"],
      advisorIds: r.advisor_ids,
      active: r.active,
    };
  });
  const branchOptions: BranchOption[] = (branches ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    city: b.city,
  }));
  const supabaseUrl = supabasePublicEnv().NEXT_PUBLIC_SUPABASE_URL;
  return <AdvisorsManager advisors={rows} rules={ruleRows} branches={branchOptions} supabaseUrl={supabaseUrl} />;
}
