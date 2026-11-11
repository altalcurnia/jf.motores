import Link from "next/link";
import { Suspense } from "react";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabasePublicEnv } from "@/lib/env";
import { AdminTopbar } from "../AdminTopbar";
import { BranchesManager, type BranchAdminRow } from "./BranchesManager";

export const metadata = { title: "Sedes, fotos y mapa" };

export default function BranchesAdminPage() {
  return (
    <main className="shell">
      <AdminTopbar />
      <h1>Sedes, fotos y mapa</h1>
      <p className="muted lead">
        Cada sede activa tiene su propia pestaña en <Link href="/es/sedes">/es/sedes</Link> con ubicación en Google Maps, fotos,
        horario y los asesores asignados a esa sede (que se eligen en <Link href="/admin/asesores">Asesores</Link>).
      </p>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <Body />
      </Suspense>
    </main>
  );
}

async function Body() {
  const session = await getSession();
  if (!session || !session.role.isInternal) {
    return <div className="notice err">No tienes permiso para ver esta sección.</div>;
  }
  const canEdit = can(session, "empresa.editar");
  const supabase = await createSupabaseServerClient();
  const { data: branches, error } = await supabase
    .from("branches")
    .select("id, name, city, address, phone, hours, description, map_query, photos, active, sort")
    .order("sort")
    .order("name");

  if (error) {
    return (
      <div className="notice err">
        No se pudieron leer las sedes ({error.message}). Si aún no se ha aplicado la migración de Sedes, aplícala primero.
      </div>
    );
  }

  const rows: BranchAdminRow[] = (branches ?? []).map((b) => {
    const h = (b.hours ?? {}) as Record<string, string>;
    const d = (b.description ?? {}) as Record<string, string>;
    return {
      id: b.id,
      name: b.name,
      city: b.city,
      address: b.address ?? "",
      phone: b.phone ?? "",
      hoursEs: h.es ?? "",
      hoursEn: h.en ?? "",
      hoursPt: h.pt ?? "",
      descEs: d.es ?? "",
      descEn: d.en ?? "",
      descPt: d.pt ?? "",
      mapQuery: b.map_query ?? "",
      photos: b.photos ?? [],
      active: b.active,
      sort: b.sort,
    };
  });

  return (
    <BranchesManager
      branches={rows}
      canEdit={canEdit}
      supabaseUrl={supabasePublicEnv().NEXT_PUBLIC_SUPABASE_URL}
    />
  );
}

