import Image from "next/image";
import Link from "next/link";
import { TicketBell } from "./TicketBell";

/** Barra superior del panel con navegación entre secciones. */
export function AdminTopbar() {
  return (
    <header className="topbar">
      <div className="brand">
        <Image src="/logo.png" alt="" width={34} height={34} />
        <b>JF MOTORES</b>
        <span className="tag">Panel</span>
      </div>
      <nav className="admin-nav">
        <Link href="/admin">Inicio</Link>
        <Link href="/admin/productos">Productos</Link>
        <Link href="/admin/ventas">Ventas</Link>
        <Link href="/admin/leads">Leads</Link>
        <Link href="/admin/tickets">Tickets</Link>
        <Link href="/admin/interesados">Interesados app</Link>
        <Link href="/admin/empresa">Empresa</Link>
        <Link href="/admin/asesores">Asesores</Link>
        <Link href="/admin/asistente">Asistente IA</Link>
        <Link href="/admin/usuarios">Usuarios</Link>
        <Link href="/admin/permisos">Roles y permisos</Link>
        <Link href="/es">Ver sitio</Link>
      </nav>
      <TicketBell />
      <form action="/auth/signout" method="post">
        <button className="btn-ghost">Cerrar sesión</button>
      </form>
    </header>
  );
}
