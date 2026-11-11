# 06 · Guía de conexiones para operar (paso a paso)

Para el dueño o el colaborador que llene el panel. No hace falta saber programar.

**Regla de oro:**
- Lo que **no es secreto** (identificadores de píxeles, DSN de Sentry) se pega en el **panel** (`/admin`) o se le pasa a Claude.
- Lo que **es secreto** (contraseñas, tokens, «claves de API») se pone **solo** en Vercel o en GitHub, lo pone el dueño y **nunca** se pega en un chat.

Todo lo de esta guía es **gratis**. Lo único que se pagará más adelante, al empezar a operar: Vercel Pro (el plan gratis es para uso no comercial) y Supabase Pro (copias diarias automáticas).

El estado de cada conexión se ve en **Admin → Tecnologías** (verde = funcionando).

---

## 1. Medición de anuncios (antes de lanzar campañas)

Todo se pega en **Admin → Empresa → «Medición de anuncios (Meta, Google y TikTok)»** y se guarda. Si un campo queda vacío, esa red simplemente no se carga.

El sitio ya hace solo lo demás:
- Pide permiso de cookies (Ley 1581) y solo carga los píxeles si el visitante acepta.
- En cada clic a WhatsApp avisa a cada red: **Lead** en Meta, `generate_lead` en GA4, conversión en Google Ads y **Contact** en TikTok.
- Guarda de qué anuncio llegó cada cliente (campaña o identificador de clic de Meta, Google y TikTok). Se ve en **Admin → Leads**.
- Solo cuenta clics de personas (los robots no suman leads).

### 1.1 Meta (Instagram y Facebook)

1. Entra a [business.facebook.com](https://business.facebook.com) con la cuenta de la empresa y crea el **portafolio comercial** si no existe.
2. Abre el **Administrador de eventos** → **Conectar orígenes de datos** → **Web** → ponle nombre (p. ej. «JF Motores web») → elige **instalar el código manualmente** y cierra la ventana del código (no hace falta: el sitio ya lo trae).
3. Copia el **identificador del píxel** (solo números) y pégalo en el panel, campo «Píxel de Meta».
4. **Verifica el dominio** en Meta: Configuración del negocio → Seguridad de la marca → Dominios → agregar `jfmotoresmedellin.com` → opción **Etiqueta meta**. Copia la etiqueta completa, pégala en el panel en «Meta (verificación del dominio)», guarda y vuelve a Meta a tocar **Verificar**.
5. En la campaña, elige como objetivo **Clientes potenciales** o **Ventas** con el evento **Lead**.

### 1.2 Google Analytics 4

1. Entra a [analytics.google.com](https://analytics.google.com) → **Crear** → **Propiedad** (zona horaria Colombia, moneda COP).
2. **Flujo de datos** → **Web** → la dirección del sitio.
3. Copia el **ID de medición** (`G-…`) y pégalo en el panel.

### 1.3 Google Ads

1. Entra a [ads.google.com](https://ads.google.com) y crea la cuenta (puedes saltarte la primera campaña).
2. **Objetivos** → **Conversiones** → **Nueva acción de conversión** → **Sitio web** → **Agregar una acción de conversión manualmente**.
3. Categoría **Contacto**, nombre «Clic a WhatsApp», valor «No usar un valor», recuento **Una**.
4. Al final elige **Usar Google Tag Manager** o **Instalar la etiqueta tú mismo** y busca el texto `send_to: 'AW-123456789/AbCdEf…'`:
   - lo de antes de la barra (`AW-123456789`) va en «Google Ads (ID de conversión)»;
   - lo de después de la barra va en «Google Ads (etiqueta de la conversión)».
5. Recomendado: en Google Ads, **Herramientas → Cuentas vinculadas → Google Analytics** y vincula la propiedad del paso 1.2.

### 1.4 TikTok

1. Entra a [ads.tiktok.com](https://ads.tiktok.com) y crea la cuenta de anunciante.
2. **Herramientas → Eventos → Eventos web → Configurar evento web** → **Píxel de TikTok** → **Configuración manual** (no la de socios).
3. Copia el **ID del píxel** y pégalo en el panel.
4. En la campaña, optimiza por el evento **Contactar** (Contact).

### 1.5 Probar que funciona (5 minutos)

1. Abre el sitio en el celular, en una pestaña de incógnito, **acepta las cookies** y toca un botón de WhatsApp.
2. Revisa en cada red (puede tardar unos minutos):
   - Meta: Administrador de eventos → tu píxel → **Probar eventos**.
   - Google: [tagassistant.google.com](https://tagassistant.google.com).
   - TikTok: Eventos → tu píxel → **Probar eventos**.
3. En **Admin → Leads** debe aparecer el clic.

### 1.6 Enlaces de los anuncios (para saber qué campaña vende)

Usa el enlace del sitio con etiquetas de campaña. Ejemplo:

```text
https://<dominio>/es/motobombas?utm_source=instagram&utm_medium=pago&utm_campaign=motobombas-noviembre
```

- `utm_source`: la red (instagram, facebook, google, tiktok).
- `utm_campaign`: el nombre de la campaña, sin espacios ni tildes.
- Meta, Google y TikTok además agregan solos su identificador de clic. Aunque se te olvide la etiqueta, el panel muestra al menos de qué red vino.

---

### 1.7 Google Search Console (gratis)

1. Entra a [search.google.com/search-console](https://search.google.com/search-console) con la cuenta de Google de la empresa → **Agregar propiedad** → **Prefijo de la URL** → `https://jfmotoresmedellin.com`.
2. Elige el método **Etiqueta HTML**, copia la etiqueta completa y pégala en el panel en «Google Search Console (código de verificación)». Guarda y vuelve a tocar **Verificar**.
3. En Search Console → **Sitemaps** → escribe `sitemap.xml` → **Enviar**.

Si inicias sesión con esa cuenta en el navegador de Claude, él puede hacer estos pasos por ti.

---

## 2. Datos oficiales de la empresa (Admin → Empresa)

Hoy están **vacíos**. Llénalos solo con datos reales (no se publica nada que la empresa no tenga):

- [ ] Razón social, NIT y dirección legal (salen en el pie y en la política de datos, y los pide Meta para verificar el negocio).
- [ ] Año de fundación y si los precios incluyen IVA.
- [ ] Cifras (equipos entregados, clientes, zonas). Solo si son reales.
- [ ] Testimonios de clientes, con su permiso.
- [ ] Redes sociales.
- [ ] Fotos de la sede de Caucasia (Admin → Sedes).

---

## 3. Avisos de errores con Sentry (tarea 1.7)

1. Crea una cuenta gratis en [sentry.io](https://sentry.io) con jfmotoresm@gmail.com (plan **Developer**, gratis).
2. Crea un proyecto de tipo **Next.js** y copia el **DSN** (empieza por `https://` y termina en `.ingest.us.sentry.io/…`). **No es secreto:** pásaselo a Claude y él lo pone en Vercel como `NEXT_PUBLIC_SENTRY_DSN`.
3. Opcional, para ver la línea exacta de cada error: en Sentry crea un **Auth Token** (Settings → Auth Tokens). **Es secreto:** ponlo tú mismo en Vercel → Settings → Environment Variables como `SENTRY_AUTH_TOKEN`, junto con `SENTRY_ORG` y `SENTRY_PROJECT` (el nombre corto de la organización y del proyecto).
4. En Sentry → **Alerts**: crea una alerta «issue nuevo» al correo.

Mientras no haya DSN, Sentry está apagado y no pesa nada en la página.

---

## 4. Copia de seguridad semanal (gratis)

Cada domingo a las 3:00 a. m. GitHub copia la base de datos, la **cifra** y la guarda 35 días. Para activarla:

1. En Supabase → botón **Connect** → **Session pooler** → copia la cadena `postgresql://postgres.…`. Cambia `[YOUR-PASSWORD]` por la contraseña de la base de datos. Si no la recuerdas: Settings → Database → Reset database password.
2. En GitHub → el repositorio → **Settings → Secrets and variables → Actions → New repository secret**:
   - `SUPABASE_DB_URL`: la cadena del paso 1.
   - `BACKUP_PASSPHRASE`: una frase larga inventada. **Guárdala en Bitwarden**: sin ella la copia no se puede abrir.
3. Pruébalo: GitHub → **Actions → Copia de seguridad semanal → Run workflow**. Debe terminar en verde y dejar un archivo `jf-motores-db-AAAA-MM-DD`.

**Restaurar** (lo hace Claude o un técnico): descargar el archivo y descifrarlo con `gpg -d archivo.tar.gz.gpg > copia.tar.gz`. Después, `tar -xzf copia.tar.gz` y cargar `roles.sql`, `schema.sql` y `data.sql`, en ese orden, como indica la guía de Supabase «Backup and restore using the CLI».

No incluye las fotos ni los modelos 3D (Storage), solo la base de datos.

---

## 5. Una sola vez en Vercel (secretos)

En Vercel → el proyecto → **Settings → Environment Variables**, entorno **Production**. Los pone el dueño:

- `LEAD_SALT`: un texto aleatorio largo (genéralo con Bitwarden). Protege las IP de los clientes en los leads. Ponlo una sola vez y no lo cambies.
- `SUPABASE_SECRET_KEY`: en Supabase → **Project Settings → API Keys → Secret keys** (empieza por `sb_secret_`). Con ella el servidor lee los ajustes de los bots, que el público no puede ver. Nunca va en el navegador ni en el chat.

Después de agregar variables hay que **volver a publicar** (Vercel → Deployments → el último → Redeploy) para que se apliquen.

---

## 6. Bot de Telegram

Sirve para tres cosas:
- probar el asistente;
- atender clientes como asistente de ventas y técnico;
- avisar al equipo de cada cliente nuevo.

Es gratis. La IA gasta según las respuestas y el tope mensual lo controla (US$2 por defecto).

1. En Telegram abre [@BotFather](https://t.me/BotFather) → `/newbot` → ponle nombre (p. ej. «JF Motores») y un usuario terminado en `bot`. BotFather entrega el **token**: es **secreto**.
2. En Vercel crea (secretos, entorno Production):
   - `TELEGRAM_BOT_TOKEN`: el token del paso 1.
   - `TELEGRAM_WEBHOOK_SECRET`: un texto inventado de 16 a 256 letras, números, `_` o `-` (genéralo con Bitwarden).
   - `SUPABASE_SECRET_KEY` (sección 5), si no está.
3. Vuelve a publicar en Vercel. Luego, en **Admin → Asistente → Bot de Telegram**, toca **«Conectar el bot (registrar webhook)»**.
4. Escríbele `/id` al bot desde tu Telegram: responde el número de tu chat.
   - Para avisos en un **grupo** del equipo: agrega el bot al grupo y escribe `/id` allí (el número empieza con `-`).
5. En el panel:
   - **Chats de prueba**: tu ID y el de quien vaya a probar.
   - **Chats del equipo**: el ID del grupo o de cada asesor. Toca **«Probar aviso al equipo»**.
   - **Tope mensual**: US$2 (se puede cambiar).
   - **Abierto al público**: actívalo solo cuando el asistente responda bien en las pruebas.
   - Toca **Guardar Telegram**.

El aviso de cada cliente nuevo dice de qué página vino, el país, el dispositivo y la campaña. No incluye datos personales del cliente.

---

## 7. Bot de WhatsApp (listo para conectar)

El código ya está listo: usa la **API oficial de Meta** (WhatsApp Cloud API) y responde con el mismo asistente. Mientras no estén las variables, está apagado.

**Antes de empezar, decide el número:**
- **Un número nuevo solo para el bot** (recomendado para empezar). El número de ventas actual sigue igual en la app.
- **El número de ventas actual**. Meta permite usarlo a la vez en la app WhatsApp Business y en la API (función «coexistencia»), pero hay que conectarlo desde la app siguiendo los pasos de Meta.

**Costos:** responder a un cliente que escribió en las últimas 24 horas no tiene costo de plantilla. Solo se cobra si la empresa inicia la conversación con una plantilla (el bot no lo hace). La IA gasta igual que en Telegram.

**Pasos (cuando quieran conectarlo):**

1. Verificar la empresa en Meta (portafolio comercial → **Centro de seguridad**). Pide la razón social y el NIT (sección 2).
2. En [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Crear app** → tipo **Empresa** → agregar el producto **WhatsApp** → agregar el número y verificarlo por SMS o llamada.
3. En **WhatsApp → Configuración de la API** copia el **Identificador del número de teléfono** (no es secreto).
4. Crea un **token permanente**: portafolio comercial → **Usuarios del sistema** → nuevo usuario administrador → **Generar token** para la app, con los permisos `whatsapp_business_messaging` y `whatsapp_business_management`. Es **secreto**.
5. En la app → **Configuración → Básica** copia la **Clave secreta de la app**. Es **secreta**.
6. En Vercel crea (entorno Production):
   - `WHATSAPP_TOKEN`: el token del paso 4 (secreto).
   - `WHATSAPP_APP_SECRET`: la clave del paso 5 (secreto).
   - `WHATSAPP_VERIFY_TOKEN`: un texto inventado (secreto). Se usa en el paso 7.
   - `WHATSAPP_PHONE_NUMBER_ID`: el identificador del paso 3.
   - `WHATSAPP_ALLOWED_NUMBERS`: los números de prueba, solo dígitos con indicativo, separados por coma (p. ej. `573001112233`).
7. Vuelve a publicar en Vercel. En Meta → **WhatsApp → Configuración → Webhook**:
   - URL de devolución de llamada: `https://<dominio>/api/whatsapp` (aparece en Admin → Asistente);
   - token de verificación: el mismo `WHATSAPP_VERIFY_TOKEN`;
   - suscríbete al campo **messages**.
8. Escríbele al número desde un teléfono de prueba. Cuando el cliente pide un asesor, el equipo recibe el aviso por Telegram con su número.

**Para abrirlo a todos los clientes** hace falta una migración pequeña: agrega el modo público y el tope de gasto de WhatsApp en el panel, como en Telegram. Se aprueba al conectar el número.

---

## 8. Privacidad

Al activar cada servicio, agregar a la política de datos (Ley 1581, encargados y transferencias internacionales):
- Meta (Píxel y WhatsApp);
- Google (Analytics y Ads);
- TikTok;
- Telegram;
- Sentry;
- Vercel y Supabase (Estados Unidos);
- DeepSeek (China);
- Resend.

Pídele a Claude que lo redacte con los datos oficiales de la empresa.
