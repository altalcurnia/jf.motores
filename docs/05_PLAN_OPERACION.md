# Plan de implementación — Operación, seguridad y crecimiento

Origen: auditoría completa del 8 nov 2026 (asesor de seguridad y rendimiento de Supabase, dependencias,
configuración de Vercel/GitHub y código). Rama de trabajo: `migracion-next`. Idioma: español.

## Veredicto

La arquitectura (Next.js 16 + Supabase + Vercel + Resend) es moderna, barata y suficiente para JF Motores.
**No se agregan frameworks nuevos.** Lo que falta son bases de operación (respaldos, alertas, ambientes
separados), ordenar cuentas y ramas, y herramientas para vender más.

## Estado actual (lo que ya está bien)

- Encabezados de seguridad (HSTS, X-Frame-Options, Permissions-Policy, Referrer-Policy) y CSP.
- RLS en todas las tablas; el asesor de Supabase no reporta errores críticos.
- Dependencias de producción: 0 vulnerabilidades (`npm audit --omit=dev`). Las 8 moderadas son de desarrollo.
- 66 pruebas unitarias + ~80 E2E; GitHub Actions en verde.
- Límite de uso en el chat de IA (protege el saldo de DeepSeek).
- Correo con dominio propio (`notificaciones@jfmotoresmedellin.com`, SPF + DKIM verificados en Resend).
- Dominio `jfmotoresmedellin.com` en producción; `jfmotores.altalcurnia.com` retirado.

## Fase 1 — Esta semana (gratis)

| # | Tarea | Quién | Estado |
|---|---|---|---|
| 1.1 | Endpoint `/api/health` (responde 200 si el sitio y la base de datos funcionan) para el monitor | Claude | ✅ |
| 1.2 | Monitor de caídas: **Better Stack** o **UptimeRobot** (gratis) vigilando `https://jfmotoresmedellin.com/api/health` cada 3–5 min, aviso al correo/app de jfmotoresm@gmail.com | Dueño (Claude guía) | ✅ UptimeRobot activo |
| 1.3 | **Verificación en dos pasos (2FA)** + método de respaldo en: GitHub, Vercel, Supabase, Resend, Hostinger, Cloudflare, Google (jfmotoresm@gmail.com), DeepSeek, Tavily | Dueño | ⏳ |
| 1.4 | Gestor de contraseñas (**Bitwarden**, gratis) con todas las cuentas y claves; nunca en chats ni archivos sueltos | Dueño | ⏳ |
| 1.5 | Contraseñas más fuertes en Supabase → Auth → Providers → Email: mínimo 10 caracteres, letras y dígitos (gratis) | Dueño | ⏳ |
| 1.6 | Bot de Telegram (`/api/telegram`): decidir si se usa (configurar `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ALLOWED_CHATS` en Vercel) o se quita del código. **Decidido (8-nov):** se queda. Hecho: migración `telegram_ajustes` aprobada y aplicada (tope US$2/mes), modo público, `/id`, avisos de leads al equipo y panel en Admin → Asistente. Falta que el dueño cree el bot y ponga `TELEGRAM_*` y `SUPABASE_SECRET_KEY` en Vercel (docs/06 §6). Bot de WhatsApp (Cloud API) listo para conectar (docs/06 §7) | Dueño decide, Claude ejecuta | 🟡 |
| 1.7 | Errores del servidor con aviso: **Sentry** (gratis). Requiere crear la cuenta y pasar el DSN (no es secreto) para instalar `@sentry/nextjs`. **Código listo (8-nov), apagado hasta tener `NEXT_PUBLIC_SENTRY_DSN`** (ver docs/06) | Dueño crea cuenta, Claude integra | 🟡 |

Nota de la auditoría corregida: `SUPABASE_SECRET_KEY` **no es necesaria hoy** (la función
`createSupabaseAdminClient` existe pero no se usa en ningún lado).

## Extra ya hecho

- ✅ Admin → **Tecnologías** (`/admin/tecnologias`): enlaces, descripción y estado en vivo de cada plataforma.

## Fase 2 — Planes pagos y cuentas de la empresa (jfmotoresm@gmail.com)

| # | Tarea | Costo aprox. | Quién |
|---|---|---|---|
| 2.1 | **Supabase Pro**: respaldo diario automático (hoy: «Sin copias de seguridad»), sin pausa del proyecto. Mientras tanto: copia semanal cifrada gratis con GitHub Actions (`respaldo.yml`, ver docs/06 §4) | 25 USD/mes | Dueño |
| 2.2 | **Protección de contraseñas filtradas** (HaveIBeenPwned) — solo disponible en Pro | incluido | Dueño |
| 2.3 | **Vercel Pro** (Hobby es solo para uso no comercial) | 20 USD/mes | Dueño |
| 2.4 | Pasar a jfmotoresm@gmail.com: Supabase (invitar como Owner de la organización), Vercel (transferir proyecto con código de transferencia + reconectar GitHub), Google Cloud (inicio con Google), DeepSeek, Tavily, Hostinger. Resend ✅ ya hecho | — | Dueño + Claude |
| 2.5 | Borrar la cuenta vieja de Resend cuando todo funcione con la nueva | — | Dueño |

## Fase 3 — Buenas prácticas de desarrollo

| # | Tarea | Quién |
|---|---|---|
| 3.1 | Proyecto Supabase **de pruebas** (gratis) para vistas previas y desarrollo; producción solo con datos reales | Dueño crea, Claude migra el esquema |
| 3.2 | Unir `migracion-next` a `main`; Vercel ya usa `main` como rama de producción. Proteger `main` (PR + CI en verde obligatorio) | Claude (con OK del dueño) |
| 3.3 | Límite de uso del chat de IA persistente (hoy en memoria del servidor): moverlo a la base de datos o a Upstash Redis | Claude |
| 3.4 | Migración de rendimiento: índices para 11 llaves foráneas sin índice y unir políticas RLS duplicadas (asesor de Supabase) | Claude (pide aprobación antes de aplicar) |
| 3.5 | Revisar funciones `SECURITY DEFINER` expuestas (28 avisos): confirmar que cada una valida permisos por dentro; `lead_create`/`lead_create_for` son públicas a propósito (clics a WhatsApp) | Claude |
| 3.6 | Mover la extensión `pg_net` fuera del esquema `public` (aviso del asesor) | Claude |
| 3.7 | Dependencias de desarrollo con vulnerabilidades moderadas (`npm audit`); altalcurnia tiene 3 críticas | Claude |

## Fase 4 — Vender más

| # | Tarea | Quién |
|---|---|---|
| 4.1 | **Perfil de Empresa de Google** por sede (Medellín, Caucasia): aparece en Google Maps y búsquedas locales | Dueño (Claude guía) |
| 4.2 | **Google Search Console**: verificar el dominio y enviar `https://jfmotoresmedellin.com/sitemap.xml` | Dueño + Claude |
| 4.3 | Analítica: **Vercel Web Analytics** o **GA4** (el sitio ya soporta GA4 y Meta Pixel desde Admin → Empresa) | Dueño |
| 4.4 | **WhatsApp Business** (app): catálogo, respuestas rápidas, etiquetas por estado de cotización | Dueño |
| 4.5 | Opcional: facturación electrónica (Alegra/Siigo) y pagos en línea (Wompi/Mercado Pago) | Más adelante |

## Pendientes de producto (de planes anteriores)

- Garantía: página pública + certificado PDF por venta (revisar antes la cláusula de 3 meses con alguien de leyes).
- Datos de la empresa en Admin → Empresa (razón social, NIT, año, cifras, testimonios) y correo de contacto `jfmotoresm@gmail.com`.
- Sedes: fotos reales de sedes y asesores.
- three.js r128 (2021): actualizar solo si hace falta; no urge.

## Reglas para ejecutar este plan

- `npm run lint && npm run typecheck && npm test && npm run build` antes de cada entrega.
- Migraciones: archivo en `supabase/migrations/` y **aprobación del dueño antes de aplicarla**. Si el cambio
  es de configuración de Auth (plantillas, SMTP, URLs) no se hace con SQL: script `scripts/supabase-plantillas.ps1`
  o el panel de Supabase.
- Nunca pedir ni pegar claves secretas en el chat.
- Al terminar y probar un cambio, ofrecer el botón para publicar en producción.
