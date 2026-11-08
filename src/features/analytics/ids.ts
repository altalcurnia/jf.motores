/**
 * Identificadores públicos de medición de anuncios, editables en /admin/empresa.
 * No son secretos (cualquiera los ve en el código de la página). Vacío = esa red no se carga.
 */
export type AnalyticsIds = {
  /** Google Analytics 4: G-XXXXXXX */
  ga4: string | null;
  /** Píxel de Meta (Instagram y Facebook): solo números */
  pixel: string | null;
  /** Google Ads, ID de conversión: AW-123456789 */
  gads: string | null;
  /** Google Ads, etiqueta de la conversión «clic a WhatsApp» */
  gadsLabel: string | null;
  /** Píxel de TikTok */
  tiktok: string | null;
  /** Google Search Console: código de la etiqueta HTML «google-site-verification» */
  gsc: string | null;
  /** Meta: código de verificación del dominio «facebook-domain-verification» */
  metaVerify: string | null;
};

export const EMPTY_ANALYTICS: AnalyticsIds = { ga4: null, pixel: null, gads: null, gadsLabel: null, tiktok: null, gsc: null, metaVerify: null };

/** Si pegan la etiqueta completa (<meta name="..." content="CÓDIGO" />), se queda solo con el código. */
const metaContent = (v: string) => (v.match(/content=["']([^"']+)["']/i)?.[1] ?? v).trim();

const RULES: Record<keyof AnalyticsIds, { re: RegExp; clean: (v: string) => string; error: string }> = {
  ga4: { re: /^G-[A-Z0-9]{4,15}$/, clean: (v) => v.trim().toUpperCase(), error: "El ID de GA4 debe verse como G-ABC123XYZ." },
  pixel: { re: /^[0-9]{6,20}$/, clean: (v) => v.replace(/\D/g, ""), error: "El ID del Píxel de Meta son solo números (6 a 20)." },
  gads: { re: /^AW-[0-9]{6,15}$/, clean: (v) => v.trim().toUpperCase(), error: "El ID de Google Ads debe verse como AW-123456789." },
  gadsLabel: { re: /^[A-Za-z0-9_-]{6,40}$/, clean: (v) => v.trim(), error: "La etiqueta de conversión de Google Ads solo lleva letras, números, - y _." },
  tiktok: { re: /^[A-Z0-9]{10,30}$/, clean: (v) => v.trim().toUpperCase(), error: "El ID del Píxel de TikTok solo lleva letras y números (p. ej. C4ABC123DEF456)." },
  gsc: { re: /^[A-Za-z0-9_-]{20,100}$/, clean: metaContent, error: "El código de Search Console solo lleva letras, números, - y _ (pega el «content» de la etiqueta HTML)." },
  metaVerify: { re: /^[a-z0-9]{20,60}$/, clean: (v) => metaContent(v).toLowerCase(), error: "El código de verificación de Meta solo lleva letras minúsculas y números." },
};

export const ANALYTICS_KEYS = Object.keys(RULES) as (keyof AnalyticsIds)[];

/** Lee lo guardado en la base y descarta valores con formato inválido. */
export function parseAnalytics(raw: unknown): AnalyticsIds {
  const a = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = { ...EMPTY_ANALYTICS };
  for (const k of ANALYTICS_KEYS) {
    const v = typeof a[k] === "string" ? RULES[k].clean(a[k] as string) : "";
    out[k] = RULES[k].re.test(v) ? v : null;
  }
  // La etiqueta sola no sirve: Google Ads necesita también el ID de conversión
  if (!out.gads) out.gadsLabel = null;
  return out;
}

/** Valida lo escrito en el panel. Devuelve lo que se guarda o el primer error. */
export function validateAnalytics(input: Partial<Record<keyof AnalyticsIds, string>>): { ok: true; value: Record<string, string> } | { ok: false; error: string } {
  const value: Record<string, string> = {};
  for (const k of ANALYTICS_KEYS) {
    const v = RULES[k].clean(input[k] ?? "");
    if (!v) continue;
    if (!RULES[k].re.test(v)) return { ok: false, error: RULES[k].error };
    value[k] = v;
  }
  if (value.gadsLabel && !value.gads) return { ok: false, error: "Para la etiqueta de conversión falta el ID de Google Ads (AW-…)." };
  return { ok: true, value };
}
