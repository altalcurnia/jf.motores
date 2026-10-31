import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-redirect";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const next = safeNextPath(request.nextUrl.searchParams.get("next"), "/admin/login");
  return NextResponse.redirect(new URL(next, request.nextUrl.origin), { status: 303 });
}
