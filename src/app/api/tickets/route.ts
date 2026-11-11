import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notifyStaff } from "@/features/tickets/notify";

/** Abre un ticket (con sesión). Las fotos ya se subieron al bucket privado desde el navegador. */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "login" }, { status: 401 });
  const input = (await request.json().catch(() => ({}))) as { subject?: unknown; body?: unknown; images?: unknown };
  const subject = String(input.subject ?? "").trim().slice(0, 120);
  const body = String(input.body ?? "").trim().slice(0, 4000);
  const images = Array.isArray(input.images) ? input.images.filter((x): x is string => typeof x === "string").slice(0, 6) : [];
  const { data: id, error } = await supabase.rpc("ticket_create", { subject, body, images });
  if (error || !id) return NextResponse.json({ error: error?.message ?? "No se pudo crear" }, { status: 400 });
  await notifyStaff(id, subject, body, "new");
  return NextResponse.json({ id });
}
