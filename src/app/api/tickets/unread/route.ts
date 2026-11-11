import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { can, getSession } from "@/lib/auth";

/**
 * Avisos de tickets: { login, mine } para el cliente (respuestas sin leer) y, si tiene el
 * permiso tickets.responder, { staff } con los tickets que esperan respuesta del equipo.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ login: false }, { headers: { "Cache-Control": "no-store" } });
  const session = await getSession();
  const canRespond = !!session && session.role.isInternal && can(session, "tickets.responder");
  const [mine, staff] = await Promise.all([
    supabase.from("tickets").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id).eq("user_unread", true),
    canRespond
      ? supabase.from("tickets").select("id", { count: "exact", head: true }).eq("staff_unread", true).neq("status", "cerrado")
      : Promise.resolve({ count: null }),
  ]);
  return NextResponse.json(
    { login: true, mine: mine.count ?? 0, staff: canRespond ? (staff.count ?? 0) : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
