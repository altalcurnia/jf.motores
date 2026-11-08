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
4. En el mismo Administrador de eventos, **verifica el dominio** cuando te lo pida (Configuración del negocio → Seguridad de la marca → Dominios). Para eso Meta pide un registro DNS. Pásale el texto a Claude y lo agrega en el dominio.
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

## 5. Una sola vez en Vercel (secreto)

- `LEAD_SALT`: un texto aleatorio largo (genéralo con Bitwarden). Protege las IP de los clientes en los leads. Ponlo una sola vez y no lo cambies.

---

## 6. Telegram (pendiente)

El bot ya funciona en modo de prueba. Falta aprobar el cambio de base de datos para:
- configurar los chats desde el panel;
- avisar al equipo de cada cliente nuevo;
- abrirlo al público como asistente de ventas y técnico, con un tope de gasto mensual.

Necesitará `TELEGRAM_BOT_TOKEN` y `TELEGRAM_WEBHOOK_SECRET` en Vercel (secretos: el token se pide a [@BotFather](https://t.me/BotFather)).
