/**
 * Plataformas que usa JF Motores: para qué sirve cada una, dónde se administra y quién es el dueño.
 * El estado en vivo (cuando se puede revisar automáticamente) lo calcula checks.ts.
 */
export type ServiceKey =
  | "sitio"
  | "vercel"
  | "supabase"
  | "github"
  | "resend"
  | "hostinger"
  | "uptimerobot"
  | "deepseek"
  | "tavily"
  | "google-cloud"
  | "whatsapp"
  | "telegram"
  | "analytics"
  | "cloudflare"
  | "search-console"
  | "google-business";

export type Service = {
  key: ServiceKey;
  name: string;
  group: "Núcleo" | "Correo y avisos" | "Inteligencia artificial" | "Clientes y ventas" | "Medición y crecimiento" | "Otros";
  what: string;
  links: { label: string; href: string }[];
  /** Planificado en docs/05_PLAN_OPERACION.md, todavía sin configurar. */
  planned?: boolean;
};

export const SERVICES: Service[] = [
  {
    key: "sitio",
    name: "Sitio web jfmotoresmedellin.com",
    group: "Núcleo",
    what: "La página pública, el catálogo, el panel y la API. El monitor de caídas revisa /api/health.",
    links: [
      { label: "Abrir sitio", href: "https://jfmotoresmedellin.com" },
      { label: "Salud (/api/health)", href: "/api/health" },
    ],
  },
  {
    key: "vercel",
    name: "Vercel",
    group: "Núcleo",
    what: "Aloja y publica el sitio. Cada cambio en GitHub crea una vista previa; producción se publica con aprobación.",
    links: [
      { label: "Proyecto", href: "https://vercel.com/dammians-projects/jf-motores" },
      { label: "Despliegues", href: "https://vercel.com/dammians-projects/jf-motores/deployments" },
      { label: "Variables", href: "https://vercel.com/dammians-projects/jf-motores/settings/environment-variables" },
      { label: "Registros", href: "https://vercel.com/dammians-projects/jf-motores/logs" },
    ],
  },
  {
    key: "supabase",
    name: "Supabase",
    group: "Núcleo",
    what: "Base de datos (productos, cotizaciones, clientes, ventas), cuentas de usuario, fotos y avisos automáticos de cotizaciones.",
    links: [
      { label: "Proyecto", href: "https://supabase.com/dashboard/project/lsrjrwpxxqlgobablyyc" },
      { label: "Asesor de seguridad", href: "https://supabase.com/dashboard/project/lsrjrwpxxqlgobablyyc/advisors/security" },
      { label: "Correos de acceso", href: "https://supabase.com/dashboard/project/lsrjrwpxxqlgobablyyc/auth/templates" },
      { label: "Respaldos", href: "https://supabase.com/dashboard/project/lsrjrwpxxqlgobablyyc/database/backups/scheduled" },
    ],
  },
  {
    key: "github",
    name: "GitHub",
    group: "Núcleo",
    what: "El código del sitio y las pruebas automáticas (GitHub Actions) que corren con cada cambio.",
    links: [
      { label: "Repositorio", href: "https://github.com/altalcurnia/jf.motores" },
      { label: "Pruebas (Actions)", href: "https://github.com/altalcurnia/jf.motores/actions" },
    ],
  },
  {
    key: "resend",
    name: "Resend",
    group: "Correo y avisos",
    what: "Envía los correos del sitio y de las cuentas desde notificaciones@jfmotoresmedellin.com (las respuestas llegan a jfmotoresm@gmail.com).",
    links: [
      { label: "Correos enviados", href: "https://resend.com/emails" },
      { label: "Dominio", href: "https://resend.com/domains" },
    ],
  },
  {
    key: "hostinger",
    name: "Hostinger",
    group: "Correo y avisos",
    what: "El dominio jfmotoresmedellin.com: su DNS (registros que apuntan a Vercel y a Resend) y el buzón de correo del dominio.",
    links: [
      { label: "Panel", href: "https://hpanel.hostinger.com" },
      { label: "DNS", href: "https://hpanel.hostinger.com/domain/jfmotoresmedellin.com/dns" },
    ],
  },
  {
    key: "uptimerobot",
    name: "UptimeRobot",
    group: "Correo y avisos",
    what: "Revisa cada 5 minutos que el sitio y la base de datos respondan, y avisa si se caen.",
    links: [{ label: "Monitores", href: "https://dashboard.uptimerobot.com/monitors" }],
  },
  {
    key: "deepseek",
    name: "DeepSeek",
    group: "Inteligencia artificial",
    what: "El modelo del asistente de IA del chat y de las descripciones de productos. Se paga por uso con saldo prepagado.",
    links: [
      { label: "Uso y saldo", href: "https://platform.deepseek.com/usage" },
      { label: "Recargar", href: "https://platform.deepseek.com/top_up" },
    ],
  },
  {
    key: "tavily",
    name: "Tavily",
    group: "Inteligencia artificial",
    what: "Búsquedas en internet del asistente (fichas y especificaciones de fabricantes).",
    links: [{ label: "Panel", href: "https://app.tavily.com" }],
  },
  {
    key: "google-cloud",
    name: "Google Cloud",
    group: "Clientes y ventas",
    what: "El botón «Entrar con Google» (credenciales OAuth). Si el dueño de la cuenta se pierde, el inicio con Google puede dejar de funcionar.",
    links: [{ label: "Credenciales", href: "https://console.cloud.google.com/apis/credentials" }],
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    group: "Clientes y ventas",
    what: "Canal de venta: todos los botones «Cotizar» registran la cotización y abren el chat del asesor asignado.",
    links: [
      { label: "WhatsApp Web", href: "https://web.whatsapp.com" },
      { label: "WhatsApp Business", href: "https://business.whatsapp.com" },
    ],
  },
  {
    key: "telegram",
    name: "Telegram",
    group: "Otros",
    what: "Bot opcional del asistente de IA en Telegram (/api/telegram).",
    links: [{ label: "BotFather", href: "https://t.me/BotFather" }],
  },
  {
    key: "analytics",
    name: "Google Analytics y Meta Pixel",
    group: "Medición y crecimiento",
    what: "Medición de visitas y anuncios. Solo se cargan si el visitante acepta las cookies; los IDs se ponen en Admin → Empresa.",
    links: [
      { label: "Google Analytics", href: "https://analytics.google.com" },
      { label: "Meta (eventos)", href: "https://business.facebook.com/events_manager2" },
      { label: "Configurar IDs", href: "/admin/empresa" },
    ],
  },
  {
    key: "search-console",
    name: "Google Search Console",
    group: "Medición y crecimiento",
    what: "Ver cómo encuentran el sitio en Google y enviar el mapa del sitio (sitemap.xml).",
    links: [{ label: "Abrir", href: "https://search.google.com/search-console" }],
    planned: true,
  },
  {
    key: "google-business",
    name: "Perfil de Empresa de Google",
    group: "Medición y crecimiento",
    what: "Ficha de cada sede en Google Maps y búsquedas locales («motobombas Medellín»).",
    links: [{ label: "Abrir", href: "https://business.google.com" }],
    planned: true,
  },
  {
    key: "cloudflare",
    name: "Cloudflare",
    group: "Otros",
    what: "DNS de altalcurnia.com (otro sitio) y el túnel de n8n. JF Motores ya no lo usa.",
    links: [{ label: "Panel", href: "https://dash.cloudflare.com" }],
  },
];

export type Level = "ok" | "warn" | "error" | "info";
export type Status = { level: Level; text: string };

/** Saldo de DeepSeek → estado (aviso por debajo de 2 USD, error si no hay saldo o no responde). */
export function deepseekStatus(r: { is_available?: boolean; balance_infos?: { currency: string; total_balance: string }[] } | null): Status {
  if (!r) return { level: "error", text: "No respondió. Revisa la clave DEEPSEEK_API_KEY." };
  const b = r.balance_infos?.[0];
  const amount = b ? Number(b.total_balance) : NaN;
  const label = b ? `${b.total_balance} ${b.currency}` : "sin dato";
  if (!r.is_available || !(amount > 0)) return { level: "error", text: `Sin saldo (${label}). El asistente de IA no responde: recarga.` };
  if (b?.currency === "USD" && amount < 2) return { level: "warn", text: `Saldo bajo: ${label}. Recarga pronto.` };
  return { level: "ok", text: `Saldo: ${label}` };
}

/** Última ejecución de GitHub Actions → estado. */
export function ciStatus(run: { conclusion: string | null; status: string; head_sha: string; created_at: string } | null): Status {
  if (!run) return { level: "info", text: "Sin datos de GitHub (límite de consultas o sin conexión)." };
  const when = new Date(run.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" });
  const sha = run.head_sha.slice(0, 7);
  if (run.status !== "completed") return { level: "info", text: `Pruebas en curso (${sha}, ${when}).` };
  if (run.conclusion === "success") return { level: "ok", text: `Pruebas en verde (${sha}, ${when}).` };
  return { level: "error", text: `Las pruebas fallaron (${sha}, ${when}). Revisa Actions.` };
}
