import Link from "next/link";
import { Suspense } from "react";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PasswordForm } from "./PasswordForm";
import { AdminTopbar } from "./AdminTopbar";

export const metadata = { title: "Inicio" };

const sections = [
  { title: "Categorías", desc: "Categorías de cada catálogo y pieza del motor 3D que abre cada una.", perm: "catalogo.editar", day: 3 },
];

export default function AdminHome() {
  return (
    <main className="shell">
      <AdminTopbar />
      <Suspense fallback={<p className="muted">Cargando tu cuenta…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

async function Dashboard() {
  const session = await getSession();
  if (!session) return <div className="notice err">Tu sesión terminó. Vuelve a entrar.</div>;

  if (!session.role.isInternal) {
    return (
      <div className="notice err">
        La cuenta <b>{session.email}</b> no tiene acceso al panel. Pide a un administrador que te asigne un rol.
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const [products, leads, advisors] = await Promise.all([
    supabase.from("products").select("status", { count: "exact" }),
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("advisors").select("id", { count: "exact", head: true }).eq("active", true),
  ]);
  const byStatus = (s: string) => (products.data ?? []).filter((p) => p.status === s).length;

  return (
    <>
      <section className="welcome">
        <h1>Hola{session.fullName ? `, ${session.fullName}` : ""}</h1>
        <p className="muted">
          {session.email} · <b className="role">{session.role.name}</b>
          {session.isOwner && <span className="pill owner">Propietario</span>}
        </p>
      </section>

      <section className="stats">
        <Stat value={byStatus("disponible")} label="Disponibles" />
        <Stat value={byStatus("vendido")} label="Vendidos / sin stock" />
        <Stat value={byStatus("borrador")} label="Borradores" />
        <Stat value={leads.count ?? 0} label="Cotizaciones" />
        <Stat value={advisors.count ?? 0} label="Asesores activos" />
      </section>

      <h2>Secciones</h2>
      <section className="grid">
        {can(session, "catalogo.ver") && (
          <Link href="/admin/productos" className="card link">
            <h3>Productos</h3>
            <p>Motobombas, motores y repuestos: fotos, modelo 3D, precio, estado (disponible/vendido o en stock/sin stock) y compatibilidad.</p>
            <span className="pill ok">Disponible</span>
          </Link>
        )}
        {can(session, "equipos.ver") && (
          <Link href="/admin/ventas" className="card link">
            <h3>Ventas y clientes</h3>
            <p>Registra cada venta a la cuenta del cliente: el equipo y su guía quedan en su cuenta. Descarga el historial.</p>
            <span className="pill ok">Disponible</span>
          </Link>
        )}
        {can(session, "interesados.ver") && (
          <Link href="/admin/interesados" className="card link">
            <h3>Interesados en la app</h3>
            <p>Quienes se anotaron para JF Monitor: datos de contacto, plan que les interesa y cuánto pagarían.</p>
            <span className="pill ok">Disponible</span>
          </Link>
        )}
        {(can(session, "leads.ver_todos") || session.role.key === "asesor") && (
          <Link href="/admin/leads" className="card link">
            <h3>Cotizaciones (leads)</h3>
            <p>Cada clic a WhatsApp con su producto, campaña y asesor. Estados, notas y resumen por asesor.</p>
            <span className="pill ok">Disponible</span>
          </Link>
        )}
        {can(session, "asesores.gestionar") && (
          <Link href="/admin/asesores" className="card link">
            <h3>Asesores y reparto</h3>
            <p>WhatsApp, horario y catálogos de cada asesor, y las reglas que reparten los leads.</p>
            <span className="pill ok">Disponible</span>
          </Link>
        )}
        {can(session, "tickets.responder") && (
          <Link href="/admin/tickets" className="card link">
            <h3>Tickets de soporte</h3>
            <p>Responde a los clientes con fotos, cierra casos y activa avisos cuando llegue uno nuevo.</p>
            <span className="pill ok">Disponible</span>
          </Link>
        )}
        {can(session, "empresa.editar") && (
          <Link href="/admin/empresa" className="card link">
            <h3>Empresa</h3>
            <p>Datos legales, IVA, cifras y testimonios; líneas de WhatsApp, correo, sedes, imagen del inicio y medición.</p>
            <span className="pill ok">Disponible</span>
          </Link>
        )}
        {can(session, "asistente.gestionar") && (
          <Link href="/admin/asistente" className="card link">
            <h3>Asistente de IA</h3>
            <p>Chat de ventas 24/7 que responde solo con tus PDF. Enciéndelo, carga documentos y pruébalo.</p>
            <span className="pill ok">Disponible</span>
          </Link>
        )}
        {(session.isOwner || can(session, "usuarios.ver")) && (
          <>
            <Link href="/admin/usuarios" className="card link">
              <h3>Usuarios</h3>
              <p>Todas las cuentas. Toda cuenta nueva es Cliente; {session.isOwner ? "tú" : "el propietario"} asigna los roles del equipo.</p>
              <span className="pill ok">Disponible</span>
            </Link>
            <Link href="/admin/permisos" className="card link">
              <h3>Roles y permisos</h3>
              <p>Crea roles y marca qué puede hacer cada uno. Los cambios piden tu contraseña.</p>
              <span className="pill ok">Disponible</span>
            </Link>
          </>
        )}
        {sections
          .filter((s) => can(session, s.perm))
          .map((s) => (
            <article key={s.title} className="card soon">
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <span className="pill">Llega el día {s.day}</span>
            </article>
          ))}
      </section>

      <section className="two-col">
        <div className="panel">
          <h2>Tu contraseña</h2>
          <p className="muted">Créala para entrar sin esperar el enlace del correo.</p>
          <PasswordForm />
        </div>
        <div className="panel">
          <h2>Tus permisos</h2>
          <ul className="perms">
            {session.permissions.map((p) => (
              <li key={p}>
                <code>{p}</code>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="stat">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}
