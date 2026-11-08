import { createHash, timingSafeEqual } from "node:crypto";
import { escapeHtml, sendEmail } from "@/lib/email";
import { site } from "@/lib/site";

/**
 * Avisos de cotizaciones sin atender. Lo llama la propia base de datos (pg_cron, cada 15 min)
 * con la lista de leads que siguen en "Nuevo" y a quién avisar.
 * La clave vive solo en la base de datos; aquí se guarda su huella sha256.
 * Si el proyecto de Supabase cambia, se pone la huella nueva en LEADS_CRON_HASH (Vercel).
 */
const KNOWN_HASHES = ["ce5237e5bedb202e1885b5eb2ee4a2ae62c5208e4366db12ff2617dfda9fe537"];

type Item = {
  kind: "asesor" | "propietario";
  to: string;
  advisor: string | null;
  lead: string;
  code: string;
  product: string | null;
  catalog: string | null;
  source: string | null;
  created_at: string;
};

function authorized(req: Request): boolean {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (token.length < 32) return false;
  const got = createHash("sha256").update(token).digest();
  const hashes = [...KNOWN_HASHES, ...(process.env.LEADS_CRON_HASH ?? "").split(",")].map((h) => h.trim()).filter((h) => /^[a-f0-9]{64}$/.test(h));
  return hashes.some((h) => timingSafeEqual(got, Buffer.from(h, "hex")));
}

const SOURCES: Record<string, string> = {
  ficha: "ficha de producto",
  cabecera: "botón de la cabecera",
  inicio: "inicio",
  flotante: "botón Soporte",
  asistente: "chat con IA",
  soporte: "soporte técnico",
  guias: "guías",
  repuestos: "repuestos",
  equipos: "Mis equipos",
  sedes: "sedes",
  error: "página de error",
};

function hoursAgo(iso: string) {
  const h = Math.max(0, (Date.now() - new Date(iso).getTime()) / 3_600_000);
  return h < 48 ? `hace ${Math.round(h)} h` : `hace ${Math.round(h / 24)} días`;
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response("No autorizado", { status: 401 });
  const body = (await req.json().catch(() => null)) as { items?: Item[] } | null;
  const items = (body?.items ?? []).filter((i) => i && typeof i.to === "string" && i.to.includes("@")).slice(0, 400);

  // Un correo por destinatario y tipo de aviso
  const groups = new Map<string, Item[]>();
  for (const it of items) {
    const key = `${it.kind}|${it.to.toLowerCase()}`;
    groups.set(key, [...(groups.get(key) ?? []), it]);
  }

  const base = site.url.replace(/\/$/, "");
  let sent = 0;
  for (const [key, list] of groups) {
    const [kind, to] = key.split("|");
    const owner = kind === "propietario";
    const n = list.length;
    const subject = owner
      ? `${n} cotización${n > 1 ? "es" : ""} sin atender hace más de 24 h`
      : `Tienes ${n} cotización${n > 1 ? "es" : ""} esperando respuesta`;
    const intro = owner
      ? "Estos clientes escribieron por WhatsApp hace más de un día y su cotización sigue en «Nuevo». Márcalas como «Resueltas» en el panel para dejar de recibir avisos:"
      : "Estos clientes te escribieron por WhatsApp hace más de 2 horas y su cotización sigue en «Nuevo». Escríbeles y márcala como «Resuelta» en el panel (o todas de una vez) para no recibir más avisos:";
    const rows = list.map((i) => {
      const what = i.product ?? (i.catalog ? `catálogo ${i.catalog}` : "consulta general");
      const from = i.source ? SOURCES[i.source] ?? i.source : "web";
      return { code: i.code, what, from, when: hoursAgo(i.created_at), advisor: i.advisor };
    });
    const href = `${base}/admin/leads?estado=nuevo`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">
  <h2 style="margin:0 0 12px">${escapeHtml(subject)}</h2>
  <p style="margin:0 0 14px;line-height:1.5">${escapeHtml(intro)}</p>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    <tr style="text-align:left;color:#555"><th style="padding:6px 8px;border-bottom:1px solid #ddd">Código</th><th style="padding:6px 8px;border-bottom:1px solid #ddd">Interés</th><th style="padding:6px 8px;border-bottom:1px solid #ddd">Llegó</th>${owner ? '<th style="padding:6px 8px;border-bottom:1px solid #ddd">Asesor</th>' : ""}</tr>
    ${rows
      .map(
        (r) =>
          `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;font-family:monospace"><b>${escapeHtml(r.code)}</b></td><td style="padding:6px 8px;border-bottom:1px solid #eee">${escapeHtml(r.what)}<br><small style="color:#777">${escapeHtml(r.from)}</small></td><td style="padding:6px 8px;border-bottom:1px solid #eee">${escapeHtml(r.when)}</td>${owner ? `<td style="padding:6px 8px;border-bottom:1px solid #eee">${escapeHtml(r.advisor ?? "—")}</td>` : ""}</tr>`,
      )
      .join("")}
  </table>
  <p style="margin:18px 0"><a href="${href}" style="background:#f7c600;color:#0b0d10;padding:11px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Abrir cotizaciones</a></p>
  <p style="color:#777;font-size:12px">El código aparece al final del mensaje de WhatsApp del cliente. JF Motores · Tranquilidad y confianza</p></div>`;
    const text = [subject, intro, ...rows.map((r) => `${r.code} · ${r.what} (${r.from}) · ${r.when}${owner ? ` · ${r.advisor ?? "—"}` : ""}`), `Abrir: ${href}`].join("\n");
    const res = await sendEmail({ to, subject, html, text });
    if (res.ok) sent++;
  }
  return Response.json({ ok: true, groups: groups.size, sent });
}
