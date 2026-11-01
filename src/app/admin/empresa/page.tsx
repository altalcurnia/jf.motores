import { Suspense } from "react";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parsePhones } from "@/lib/supabase/public";
import { AdminTopbar } from "../AdminTopbar";
import { ContactForm } from "./ContactForm";

export const metadata = { title: "Contacto y sedes" };

export default function CompanyAdminPage() {
  return (
    <main className="shell">
      <AdminTopbar />
      <h1>Contacto y sedes</h1>
      <p className="muted lead">
        Lo que se guarda aquí aparece en todo el sitio: el botón flotante y los botones de WhatsApp usan la primera línea
        marcada como WhatsApp; el correo sale en Contacto y Soporte; las sedes salen al final de la página principal.
      </p>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <Editor />
      </Suspense>
    </main>
  );
}

async function Editor() {
  const session = await getSession();
  if (!session || !session.role.isInternal) return <div className="notice err">No tienes permiso para ver esta sección.</div>;
  const supabase = await createSupabaseServerClient();
  const [{ data: company, error: e1 }, { data: branches, error: e2 }] = await Promise.all([
    supabase.from("company_settings").select("email, phones").maybeSingle(),
    supabase.from("branches").select("id, name, city, address, phone, active, sort").order("sort"),
  ]);
  if (e1 || e2) return <div className="notice err">No se pudieron leer los datos: {(e1 ?? e2)?.message}</div>;
  return (
    <ContactForm
      canEdit={can(session, "empresa.editar")}
      initial={{
        email: company?.email ?? "",
        phones: parsePhones(company?.phones),
        branches: (branches ?? []).map((b) => ({
          id: b.id,
          name: b.name,
          city: b.city,
          address: b.address ?? "",
          phone: b.phone ?? "",
          active: b.active,
        })),
        removedBranches: [],
      }}
    />
  );
}
