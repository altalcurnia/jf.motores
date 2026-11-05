/**
 * Configuración pública del sitio.
 * Provisional hasta el día 6–7: asesores, sedes y datos de empresa pasan a la base de datos
 * y se editan desde el panel admin.
 */
export const site = {
  name: "JF Motores",
  // Producción: dominio propio. Vistas previas de Vercel: su URL automática. Local: localhost.
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  whatsappFallback: process.env.NEXT_PUBLIC_WHATSAPP_FALLBACK ?? "573122110262",
  phoneDisplay: "+57 312 2110262",
  workshopAddress: "Cra. 52 # 12-40, Medellín",
} as const;
