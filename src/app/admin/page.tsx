import Link from "next/link";
import { Suspense } from "react";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PasswordForm } from "./PasswordForm";
import { AdminTopbar } from "./AdminTopbar";

export const metadata = { title: "Inicio" };

const sections = [
  { title: "Categorías", desc: "Categorías de cada catálogo y pieza del motor 3D que abre cada una.", perm: "catalogo.editar", day: 3 },
  { title: "Cotizaciones", desc: "Clientes que tocaron WhatsApp: producto, asesor, país y estado.", perm: "leads.ver_todos", day: 6 },
  { title: "Asesores", desc: "WhatsApp, nombre, cargo y reglas para repartir clientes.", perm: "asesores.gestionar", day: 6 },
  { title: "Empresa y sedes", desc: "Datos de confianza, garantía, cifras y sedes.", perm: "empresa.editar", day: 7 },
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
        <Stat value={byStatus("vendido")} label="Vendidos" />
        <Stat value={byStatus("borrador")} label="Borradores" />
        <Stat value={leads.count ?? 0} label="Cotizaciones" />
        <Stat value={advisors.count ?? 0} label="Asesores activos" />
      </section>

      <h2>Secciones</h2>
      <section className="grid">
        {can(session, "catalogo.ver") && (
          <Link href="/admin/productos" className="card link">
            <h3>Productos</h3>
            <p>Motobombas, motores y repuestos: fotos, modelo 3D, precio, disponible/vendido y compatibilidad.</p>
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
