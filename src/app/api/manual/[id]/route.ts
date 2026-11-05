import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Descarga de la guía de usuario (PDF) de un producto.
 * La base de datos decide quién puede: el personal, los dueños de una unidad de ese
 * producto, o cualquiera si la guía es pública. Se entrega con un enlace temporal.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notFound = () => new NextResponse("Guía no disponible", { status: 404, headers: { "cache-control": "no-store" } });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return notFound();

  const supabase = await createSupabaseServerClient();
  const { data: product } = await supabase.from("products").select("ref, manual_path").eq("id", id).maybeSingle();
  if (!product?.manual_path) return notFound();

  const { data, error } = await supabase.storage
    .from("manuales")
    .createSignedUrl(product.manual_path, 300, { download: `${product.ref}-guia-de-usuario.pdf` });
  if (error || !data) {
    // Sin permiso: si no ha iniciado sesión, que entre y vuelva
    const { data: claims } = await supabase.auth.getClaims();
    if (!claims?.claims?.sub) {
      const back = encodeURIComponent(`/api/manual/${id}`);
      return NextResponse.redirect(new URL(`/es/cuenta/entrar?next=${back}`, request.nextUrl.origin));
    }
    return notFound();
  }
  return NextResponse.redirect(data.signedUrl, { headers: { "cache-control": "no-store" } });
}
