import { Suspense } from "react";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_BENEFITS_IMAGE, parsePhones } from "@/lib/supabase/public";
import { storageUrl } from "@/features/catalog/shared";
import { supabasePublicEnv } from "@/lib/env";
import { AdminTopbar } from "../AdminTopbar";
import { ContactForm } from "./ContactForm";
import { SiteImages } from "./SiteImages";
import { AnalyticsForm } from "./AnalyticsForm";
import { TrustForm } from "./TrustForm";
import { EngineVariants } from "./EngineVariants";

export const metadata = { title: "Empresa, contacto e imagen" };

export default function CompanyAdminPage() {
  return (
    <main className="shell">
      <AdminTopbar />
      <h1>Empresa, contacto e imagen del inicio</h1>
      <p className="muted lead">
        Lo que se guarda aquí aparece en todo el sitio: el botón flotante y los
        botones de WhatsApp usan la primera línea marcada como WhatsApp; el
        correo sale en Contacto y Soporte; las sedes salen al final de la página
        principal.
      </p>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <Editor />
      </Suspense>
    </main>
  );
}

async function Editor() {
  const session = await getSession();
  if (!session || !session.role.isInternal)
    return (
      <div className="notice err">No tienes permiso para ver esta sección.</div>
    );
  const supabase = await createSupabaseServerClient();
  const [{ data: company, error: e1 }, { data: branches, error: e2 }] =
    await Promise.all([
      supabase
        .from("company_settings")
        .select("email, phones, home_benefits_image, analytics, legal_name, nit, legal_address, founded_year, prices_include_vat, stats, engine_model, engine_models_hidden")
        .maybeSingle(),
      supabase
        .from("branches")
        .select("id, name, city, address, phone, active, sort")
        .order("sort"),
    ]);
  if (e1 || e2)
    return (
      <div className="notice err">
        No se pudieron leer los datos: {(e1 ?? e2)?.message}
      </div>
    );
  const canEdit = can(session, "empresa.editar");
  const { data: testimonials } = await supabase.from("testimonials").select("id, name, place, product, quote, consent, active").order("sort").order("created_at");
  const stats = (company?.stats ?? {}) as Record<string, number>;
  const benefitsPath = company?.home_benefits_image ?? null;
  return (
    <>
      <TrustForm
        canEdit={canEdit}
        testimonials={(testimonials ?? []).map((x) => ({ ...x, place: x.place ?? "", product: x.product ?? "" }))}
        initial={{
          legalName: company?.legal_name ?? "",
          nit: company?.nit ?? "",
          legalAddress: company?.legal_address ?? "",
          foundedYear: company?.founded_year ? String(company.founded_year) : "",
          vat: company?.prices_include_vat === true ? "si" : company?.prices_include_vat === false ? "no" : "",
          equipos: stats.equipos ? String(stats.equipos) : "",
          clientes: stats.clientes ? String(stats.clientes) : "",
          municipios: stats.municipios ? String(stats.municipios) : "",
        }}
      />
      <EngineVariants
        canEdit={canEdit}
        active={company?.engine_model ?? "v2"}
        hidden={company?.engine_models_hidden ?? []}
      />
      <SiteImages
        canEdit={canEdit}
        isDefault={!benefitsPath}
        current={
          benefitsPath
            ? storageUrl(
                benefitsPath,
                supabasePublicEnv().NEXT_PUBLIC_SUPABASE_URL,
              )
            : DEFAULT_BENEFITS_IMAGE
        }
      />
      <ContactForm
        canEdit={canEdit}
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
      <AnalyticsForm
        canEdit={canEdit}
        initial={{
          ga4: String((company?.analytics as { ga4?: string } | null)?.ga4 ?? ""),
          pixel: String((company?.analytics as { pixel?: string } | null)?.pixel ?? ""),
        }}
      />
    </>
  );
}
