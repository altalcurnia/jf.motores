import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { findLibraryItem } from "@/features/library/items";
import { hasLocale } from "@/i18n/config";

/**
 * Abre un documento de la biblioteca técnica (solo con sesión).
 * Sin sesión → a Entrar y de vuelta aquí. Documento público → el PDF; de un fabricante → su sitio oficial.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = findLibraryItem(id);
  if (!item) return new NextResponse("Documento no disponible", { status: 404 });
  const lang = request.nextUrl.searchParams.get("lang") ?? "es";
  const locale = hasLocale(lang) ? lang : "es";

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    const back = encodeURIComponent(`/api/biblioteca/${id}?lang=${locale}`);
    return NextResponse.redirect(new URL(`/${locale}/cuenta/entrar?next=${back}`, request.nextUrl.origin));
  }

  if (item.url) return NextResponse.redirect(item.url, { headers: { "cache-control": "no-store" } });
  try {
    const file = await readFile(path.join(process.cwd(), "content", "biblioteca", path.basename(item.file!)));
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${item.file}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("Documento no disponible", { status: 404 });
  }
}
