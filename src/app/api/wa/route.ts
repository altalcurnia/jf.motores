import { createHash, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getContact } from "@/lib/supabase/public";
import { buildWhatsAppUrl } from "@/features/whatsapp/link";
import { getCatalogData } from "@/features/catalog/data";
import { storageUrl } from "@/features/catalog/shared";
import { site } from "@/lib/site";

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CODE_LABEL: Record<string, string> = { es: "Código de cotización", en: "Quote code", pt: "Código do orçamento" };
const PHOTO_LABEL: Record<string, string> = { es: "Foto del producto", en: "Product photo", pt: "Foto do produto" };
const VISITOR_COOKIE = "jf_vid";
const UTM_COOKIE = "jf_utm";

function device(ua: string) {
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  return /Mobi|Android|iPhone/i.test(ua) ? "mobile" : "desktop";
}

/**
 * Clic a WhatsApp: registra el lead (sin datos personales), elige el asesor con las reglas
 * del panel y redirige a su WhatsApp con el mensaje, la foto del producto (si aplica) y el código de cotización.
 * Si algo falla, abre igual la línea principal: el cliente nunca se queda sin WhatsApp.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const message = (sp.get("m") ?? "").slice(0, 1000);
  const source = /^[a-z-]{2,20}$/.test(sp.get("s") ?? "") ? sp.get("s")! : "web";
  const locale = ["es", "en", "pt"].includes(sp.get("l") ?? "") ? sp.get("l")! : "es";
  const product = UUID.test(sp.get("p") ?? "") ? sp.get("p")! : null;
  const advisor = UUID.test(sp.get("a") ?? "") ? sp.get("a")! : null;
  const catalog = ["motobomba", "motor", "repuesto"].includes(sp.get("c") ?? "") ? sp.get("c")! : null;
  const partKey = /^[a-z0-9-]{2,40}$/.test(sp.get("k") ?? "") ? sp.get("k")! : null;
  const imgParam = sp.get("img")?.trim();

  // Si se está preguntando por un producto específico, resolvemos su foto si no viene en el texto
  let photoUrl = imgParam || "";
  if (!photoUrl && product) {
    try {
      const { products } = await getCatalogData();
      const prod = products.find((x) => x.id === product);
      if (prod?.images?.[0]?.path) {
        const raw = storageUrl(prod.images[0].path, process.env.NEXT_PUBLIC_SUPABASE_URL);
        photoUrl = raw.startsWith("http") ? raw : `${site.url}${raw}`;
      }
    } catch (err) {
      console.error("No se pudo obtener foto del producto para WhatsApp:", err);
    }
  }

  let text = message;
  if (photoUrl && !text.includes(photoUrl)) {
    const lbl = PHOTO_LABEL[locale] ?? PHOTO_LABEL.es;
    const photoLine = `${lbl}: ${photoUrl}`;
    const match = text.match(/(https?:\/\/[^\s]+)/);
    if (match && match.index != null) {
      text = `${text.slice(0, match.index)}${photoLine}\n${text.slice(match.index)}`;
    } else {
      text = text ? `${text}\n${photoLine}` : photoLine;
    }
  }

  const fallback = (await getContact()).whatsapp;
  const ua = request.headers.get("user-agent") ?? "";
  const go = (phone: string, bodyText: string) => {
    const res = NextResponse.redirect(buildWhatsAppUrl(phone, bodyText), 302);
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("X-Robots-Tag", "noindex");
    return res;
  };
  if (!ua || BOT.test(ua)) return go(fallback, text);

  let visitor = request.cookies.get(VISITOR_COOKIE)?.value ?? "";
  const newVisitor = !/^[A-Za-z0-9-]{8,64}$/.test(visitor);
  if (newVisitor) visitor = randomUUID();
  let utm: Record<string, string> = {};
  try {
    utm = JSON.parse(request.cookies.get(UTM_COOKIE)?.value ?? "{}");
  } catch {}
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ipHash = ip ? createHash("sha256").update(`${ip}|${process.env.LEAD_SALT ?? "jf-motores"}`).digest("hex").slice(0, 32) : null;

  let phone = fallback;
  try {
    const supabase = await createSupabaseServerClient();
    const args = {
      p_product: product,
      p_catalog: catalog,
      p_part_key: partKey,
      p_source: source,
      p_country: request.headers.get("x-vercel-ip-country"),
      p_locale: locale,
      p_utm: utm,
      p_visitor: visitor,
      p_user_agent: ua.slice(0, 300),
      p_device: device(ua),
      p_ip_hash: ipHash,
    };
    const { data, error } = advisor
      ? await supabase.rpc("lead_create_for", { p_advisor: advisor, ...args })
      : await supabase.rpc("lead_create", args);
    if (error) throw error;
    const r = data as { phone?: string; code?: string } | null;
    if (r?.phone) phone = r.phone;
    if (r?.code) text = `${text}\n\n${CODE_LABEL[locale]}: ${r.code}`;
  } catch (e) {
    console.error("Lead no registrado:", e instanceof Error ? e.message : e);
  }

  const res = go(phone, text);
  if (newVisitor) {
    res.cookies.set(VISITOR_COOKIE, visitor, { maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true, secure: true, path: "/" });
  }
  return res;
}
