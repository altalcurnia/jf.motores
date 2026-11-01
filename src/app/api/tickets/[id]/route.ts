import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notifyCustomer, notifyStaff } from "@/features/tickets/notify";

/** Agrega un mensaje a un ticket (cliente o equipo) y avisa por correo a la otra parte. */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "login" }, { status: 401 });
  const input = (await request.json().catch(() => ({}))) as { body?: unknown; images?: unknown };
  const body = String(input.body ?? "").trim().slice(0, 4000);
  const images = Array.isArray(input.images) ? input.images.filter((x): x is string => typeof x === "string").slice(0, 6) : [];

  // Estado previo para avisar solo cuando hace falta
  const { data: before } = await supabase.from("tickets").select("user_id, subject, status, user_unread, staff_unread").eq("id", id).maybeSingle();
  if (!before) return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });
  const { error } = await supabase.rpc("ticket_post", { ticket: id, body, images });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (before.user_id === auth.user.id) {
    if (!before.staff_unread) await notifyStaff(id, before.subject, body, "reply");
  } else if (!before.user_unread) {
    const { data: customer } = await supabase.from("profiles").select("email, locale").eq("id", before.user_id).maybeSingle();
    if (customer?.email) await notifyCustomer(customer.email, customer.locale, id, before.subject);
  }
  return NextResponse.json({ ok: true });
}
