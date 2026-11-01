import { Suspense } from "react";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminTopbar } from "../AdminTopbar";
import { WaitlistTable, type WaitlistRow } from "./WaitlistTable";

export const metadata = { title: "Interesados en la app" };

export default function WaitlistAdminPage() {
  return (
    <main className="shell">
      <AdminTopbar />
      <h1>Interesados en JF Monitor</h1>
      <p className="muted lead">
        Personas que se anotaron en “Quiero enterarme” de la app de monitoreo, con su cuenta y sus respuestas. Úsalo para
        avisarles del lanzamiento y para validar qué plan y precio tienen sentido.
      </p>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <List />
      </Suspense>
    </main>
  );
}

async function List() {
  const session = await getSession();
  if (!session || !session.role.isInternal || !can(session, "interesados.ver")) {
    return <div className="notice err">No tienes permiso para ver esta lista.</div>;
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("app_waitlist")
    .select("*, profiles ( email, created_at )")
    .order("created_at", { ascending: false });
  if (error) return <div className="notice err">No se pudo leer la lista: {error.message}</div>;
  const rows: WaitlistRow[] = (data ?? []).map((r) => ({ ...r, email: r.profiles?.email ?? "—" }));
  return <WaitlistTable rows={rows} />;
}
