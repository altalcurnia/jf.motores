import Link from "next/link";
import { Suspense } from "react";
import { can, getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminTopbar } from "../AdminTopbar";
import { AdminTicket } from "./AdminTicket";

export const metadata = { title: "Tickets de soporte" };

type Filter = "pendientes" | "respondidos" | "cerrados" | "todos";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "pendientes", label: "Por responder" },
  { key: "respondidos", label: "Respondidos" },
  { key: "cerrados", label: "Cerrados" },
  { key: "todos", label: "Todos" },
];
const STATUS = { abierto: "Abierto", respondido: "Respondido", cerrado: "Cerrado" } as const;

export default function TicketsAdminPage({ searchParams }: PageProps<"/admin/tickets">) {
  return (
    <main className="shell">
      <AdminTopbar />
      <h1>Tickets de soporte</h1>
      <p className="muted lead">
        Los clientes los abren desde el botón «Soporte» del sitio (con su cuenta) y pueden adjuntar fotos. Al responder, el
        cliente recibe un correo y lo ve en «Mis tickets». Activa los avisos de la campana para enterarte cuando llegue uno.
      </p>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <Body searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Body({ searchParams }: Pick<PageProps<"/admin/tickets">, "searchParams">) {
  const session = await getSession();
  if (!session || !session.role.isInternal || !can(session, "tickets.responder")) {
    return <div className="notice err">No tienes permiso para responder tickets. El propietario puede darlo en Roles y permisos.</div>;
  }
  const sp = await searchParams;
  const filter = (FILTERS.find((f) => f.key === sp.estado)?.key ?? "pendientes") as Filter;
  const selected = typeof sp.t === "string" && /^[0-9a-f-]{36}$/.test(sp.t) ? sp.t : null;
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from("tickets")
    .select("id, subject, status, staff_unread, updated_at, created_at, profiles ( email, full_name, phone )")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (filter === "pendientes") q = q.eq("status", "abierto");
  if (filter === "respondidos") q = q.eq("status", "respondido");
  if (filter === "cerrados") q = q.eq("status", "cerrado");
  const { data, error } = await q;
  if (error) return <div className="notice err">No se pudieron leer los tickets: {error.message}</div>;
  const rows = data ?? [];
  let current = selected ? rows.find((r) => r.id === selected) : undefined;
  if (selected && !current) {
    const { data: one } = await supabase
      .from("tickets")
      .select("id, subject, status, staff_unread, updated_at, created_at, profiles ( email, full_name, phone )")
      .eq("id", selected)
      .maybeSingle();
    current = one ?? undefined;
  }
  const fmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });

  return (
    <div className="tk-admin">
      <aside className="tk-admin-list">
        <div className="seg">
          {FILTERS.map((f) => (
            <Link key={f.key} href={`/admin/tickets?estado=${f.key}`} className={f.key === filter ? "on" : ""}>
              {f.label}
            </Link>
          ))}
        </div>
        {rows.length === 0 && <p className="muted small">No hay tickets en esta lista.</p>}
        {rows.map((r) => (
          <Link
            key={r.id}
            href={`/admin/tickets?estado=${filter}&t=${r.id}`}
            className={`tk-row-item${r.id === current?.id ? " on" : ""}${r.staff_unread && r.status !== "cerrado" ? " unread" : ""}`}
          >
            <b>{r.subject}</b>
            <small>
              {r.profiles?.full_name || r.profiles?.email || "Cliente"} · {fmt.format(new Date(r.updated_at))}
            </small>
            <em className={`tk-st ${r.status}`}>{STATUS[r.status]}</em>
          </Link>
        ))}
      </aside>
      <section className="tk-admin-view">
        {current ? (
          <AdminTicket
            key={current.id}
            id={current.id}
            subject={current.subject}
            status={current.status}
            customer={{
              name: current.profiles?.full_name ?? null,
              email: current.profiles?.email ?? null,
              phone: current.profiles?.phone ?? null,
            }}
            opened={fmt.format(new Date(current.created_at))}
          />
        ) : (
          <p className="muted">Elige un ticket de la lista.</p>
        )}
      </section>
    </div>
  );
}
