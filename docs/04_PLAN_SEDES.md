# Plan de implementación — Sección «Sedes»

Estado: **plan aprobado por el dueño para iniciar en otra sesión. Nada de esto está construido ni aplicado.**
Rama: `migracion-next` (no fusionar a `main`). Idioma de trabajo y de respuestas: español.

## Objetivo

Una página pública completa de **Sedes** con una **subpestaña por sede**. Cada sede muestra:

- ubicación en **Google Maps** (mapa embebido + «Cómo llegar»),
- **fotos** de la sede,
- dirección, teléfono, horario y una descripción corta,
- los **asesores de esa sede**, con **foto**, cargo y contacto (WhatsApp, llamada y correo).

**Todo editable desde el panel** (admin).

## Datos actuales (consultados el 3 nov 2026)

- `branches`: «Sede Medellín» (Cra. 52 # 12-40, sort 1) y «Sede Caucasia» (Cl. 20 # 15-32, sort 2). Ya tiene `name, city, country, address, phone, hours jsonb ({}), lat, lng, active, sort`.
- `advisors`: un solo asesor, «JF Motores» (genérico, de respaldo). Ya tiene `title jsonb` (cargo por idioma), `photo_path` (sin uso aún), `phone_e164`, `active`, `sort`, `schedule`…
- La edición básica de sedes (nombre, ciudad, dirección, teléfono, orden) vive hoy en `/admin/empresa` → `ContactForm.tsx` / `saveContact` en `src/app/admin/empresa/actions.ts`.

## Paso 1 — Migración (pedir aprobación antes de aplicarla)

Borrador listo en [`docs/plan-sedes/pagina_sedes.sql`](plan-sedes/pagina_sedes.sql). Copiarlo a
`supabase/migrations/20261103100000_pagina_sedes.sql` (o la fecha del día) y, **antes de `apply_migration`, enviar
un mensaje al dueño para que la apruebe** (regla del proyecto). Solo agrega cosas:

- `branches`: `description jsonb` (por idioma), `map_query text` (búsqueda para el mapa), `photos text[]` (rutas en orden). El horario usa `hours jsonb` ya existente con forma `{"es": "...", "en": "...", "pt": "..."}`.
- `advisors`: `branch_id` (FK a sedes), `public_email`, `show_on_site boolean default true`. Los existentes quedan en la primera sede.
- Bucket público `sedes` (JPG/PNG/WEBP, 8 MB). Subir/cambiar/borrar con permiso `empresa.editar` o `asesores.gestionar`.
- Política `advisors_read_site`: se pueden ver asesores con `show_on_site` y sede, aunque no reciban cotizaciones.
- Función `lead_create_for(p_advisor, …)`: registra el lead con `lead_create` y, si ese asesor está activo, se lo asigna y devuelve su teléfono. Si no, el reparto normal (nunca se pierde el cliente).

Después: `generate_typescript_types` → actualizar `src/lib/supabase/types.ts`. Revisar `get_advisors` (seguridad).

## Paso 2 — Datos públicos

En `src/lib/supabase/public.ts` agregar `getBranchesPage()` (`"use cache"`, `cacheLife("hours")`, `cacheTag("company")`):

- Sedes activas ordenadas por `sort` con `id, name, city, address, phone, hours, description, map_query, photos`.
- Asesores con `show_on_site` y `branch_id` (`id, name, title, photo_path, phone_e164, public_email, active, branch_id, sort`).
- `slug` de cada sede a partir de la ciudad (sin tildes, minúsculas, guiones; único).
- URLs de fotos: `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/sedes/<ruta>` (helper genérico junto a `storageUrl` en `src/features/catalog/shared.ts`).
- Si la consulta falla (p. ej. migración sin aplicar) → volver a los datos de `getContact()` sin fotos ni asesores.

## Paso 3 — Página pública `/[lang]/sedes`

Archivos nuevos: `src/app/[lang]/sedes/page.tsx` y `src/features/branches/BranchTabs.tsx` (cliente).

- Subpestañas por sede con el **#ancla** (`/es/sedes#caucasia`), igual que `src/features/library/GuideTabs.tsx` (`useSyncExternalStore` + `hashchange`). Por defecto la primera.
- Contenido de cada sede:
  - Encabezado: nombre, dirección, ciudad, teléfono (`tel:`), horario del idioma.
  - **Mapa**: `<iframe src="https://www.google.com/maps?q=<map_query o dirección+ciudad>&output=embed" loading="lazy">` y botones «Cómo llegar» (`https://www.google.com/maps/dir/?api=1&destination=…`) y «Abrir en Google Maps». No requiere clave de API.
  - **Fotos**: foto grande + miniaturas (tocar una la pone grande). Sin fotos: texto «Pronto publicaremos fotos de esta sede».
  - Descripción del idioma.
  - **Asesores de la sede**: tarjetas con foto (o iniciales), nombre, cargo del idioma y botones **WhatsApp** (`/api/wa?a=<id>&s=sedes&m=…&l=…`), **Llamar** (`tel:`) y **Correo** con `EmailChooser` (`src/components/EmailChooser.tsx`: Gmail/Outlook/app/copiar). Sin asesores: botón de WhatsApp general.
- Metadatos: `generateMetadata` con `localizedAlternates(locale, "/sedes")`, JSON-LD `LocalBusiness` por sede (dirección, teléfono, geo si hay lat/lng).
- Estilos en `src/app/globals.css` (bloque «Sedes»), adaptados a celular (mapa arriba, fotos en carrusel horizontal, asesores en una columna).

## Paso 4 — WhatsApp por asesor

- `src/app/api/wa/route.ts`: aceptar `a` (UUID del asesor). Si viene, llamar `rpc("lead_create_for", { p_advisor: a, …mismos parámetros })`; si no, `lead_create` como hoy.
- `src/features/whatsapp/lead-link.ts`: opción `advisorId` y nueva fuente `"sedes"`.
- Etiquetas de la fuente «sedes» en `SOURCE_LABEL` (`src/app/admin/leads/page.tsx`) y `SOURCES` (`src/app/api/cron/leads/route.ts`).

## Paso 5 — Enlaces en el sitio

- Encabezado (`src/components/SiteHeader.tsx`): enlace **Sedes** entre Soporte y Contacto, y en el menú del celular.
- Inicio, sección Contacto (`src/app/[lang]/page.tsx`): cada sede enlaza a `/sedes#<slug>`.
- `src/app/sitemap.ts`: agregar `/sedes`.
- Mapa del sitio del asistente (`src/features/assistant/harness.ts`) y su prueba (`tests/unit/assistant.test.ts`).
- CSP (`next.config.ts`): agregar `https://www.google.com` a `frame-src`. Si se usan fotos de Maps, ninguna otra.

## Paso 6 — Textos (es / en / pt, mismas claves)

En `src/i18n/dictionaries/{es,en,pt}.json`: `nav.sedes` y un grupo `branches` con, como mínimo: `title`, `intro`,
`address`, `phone`, `hours`, `directions`, `openMaps`, `photos`, `noPhotos`, `advisors` («Asesores en {city}»),
`noAdvisors`, `whatsapp`, `call`, `email`, `waMessage` («Hola {name}, te escribo desde la página de JF Motores
(sede {city})»), `mapTitle`. La prueba unitaria de diccionarios exige las mismas claves en los tres idiomas.

## Paso 7 — Panel (admin)

**Nueva página `/admin/sedes`** (enlace en `src/app/admin/AdminTopbar.tsx`), con permiso `empresa.editar`:

- Lista de sedes (crear, borrar, ordenar, activar/ocultar).
- Por sede: nombre, ciudad, dirección, teléfono, horario (es/en/pt), descripción (es/en/pt), búsqueda del mapa con vista previa del iframe.
- **Fotos**: subir varias, reordenar (↑ ↓), borrar. Subida desde el navegador al bucket `sedes` (`sedes/<branchId>/<uuid>.jpg`), reduciendo la foto antes (mover la función `prepare` de `src/app/admin/empresa/SiteImages.tsx` a un helper compartido, p. ej. `src/lib/image-prepare.ts`). Al borrar, quitar también el archivo del bucket.
- Acciones de servidor en `src/app/admin/sedes/actions.ts` con validación y `updateTag("company")` para refrescar la página pública.
- En `/admin/empresa` dejar la lista simple de sedes o reemplazarla por un enlace «Editar sedes, fotos y mapa →».

**`/admin/asesores`** (`AdvisorsManager.tsx`, `actions.ts`, `page.tsx`): agregar al formulario de cada asesor:

- **Sede** (selector), **foto** (subir/cambiar/quitar; bucket `sedes`, ruta `asesores/<uuid>.jpg`), **correo público**, **cargo** en es/en/pt (hoy solo es) y **«Mostrar en la página de Sedes»**.
- Aclarar en el formulario la diferencia entre «Activo» (recibe cotizaciones) y «Mostrar en Sedes».

## Paso 8 — Pruebas y entrega

- `npm run lint && npm run typecheck && npm test && npm run build` (regla de `AGENTS.md`).
- E2E (`tests/e2e/home.spec.ts`): `/es/sedes` muestra una pestaña por sede, el mapa con la dirección, el `#ancla` abre la sede correcta, la tarjeta de asesor lleva a `/api/wa?a=…`, y `/admin/sedes` exige iniciar sesión.
- Para las pruebas locales el servidor falso de Supabase debe devolver `branches` con los campos nuevos y `advisors` con `branch_id`, foto y correo. La compilación debe hacerse con `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`.
- Capturas en PC y celular de la página y del panel.
- Commit con los trailers de siempre, push a `migracion-next` y **mostrar el botón para que el dueño apruebe publicar en producción**. Para publicar: `create_deployment` con `deploymentId` de la vista previa lista y `target: "production"` (el endpoint `promote` da 422 con vistas previas).

## Pendiente del dueño (no bloquea el desarrollo)

- Fotos reales de cada sede y de cada asesor, descripciones y horarios.
- Confirmar si el asesor genérico «JF Motores» debe salir en la página (se puede ocultar con «Mostrar en Sedes»).
