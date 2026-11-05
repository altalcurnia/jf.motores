# 03 · Plan de trabajo — JF Motores

## Día 0 · Preparación (tú, ~1 hora)

1. **Mover el proyecto fuera de OneDrive** (p. ej. `C:\dev\jf-motores`). OneDrive intenta sincronizar `node_modules` (decenas de miles de archivos) y bloquea archivos de git.
2. **Supabase**: proyecto `jf-motores-dev` creado (región `us-east-1`, junto a Vercel). Crear la organización **JF Motores** y transferir el proyecto ahí (Project Settings → General → Transfer project). Autorizar el conector de Supabase en Claude también para esa organización.
3. **Vercel**: pruebas en la cuenta personal (proyecto `jf-motores`); al lanzar se crea el equipo Pro **JF Motores** y se transfiere el proyecto.
4. **Conectar en Claude** (Ajustes → Conectores): GitHub, Supabase y Vercel. Así creo tablas, ramas y despliegues directamente.
5. **Subdominio**: `jfmotores.altalcurnia.com`. El registro DNS (CNAME hacia Vercel) se agrega el día 8 en el proveedor DNS de `altalcurnia.com`.
6. **No pegar nunca** en el chat la `service_role`/`secret key` de Supabase ni la contraseña de la base de datos.

## MVP · 8 días

| Día | Entregable | Criterio de "terminado" |
|---|---|---|
| 1 | Proyecto Next.js + TypeScript, idiomas ES/EN/PT, estilos del sitio actual migrados, CI con pruebas, primer despliegue de vista previa | La URL de vista previa muestra el inicio en ES, EN y PT |
| 2 | Esquema de base de datos completo + RLS + roles/permisos + datos de ejemplo; login del panel | Un Editor no puede gestionar usuarios; un visitante no lee leads (probado) |
| 3 | Panel: productos (3 catálogos), categorías, imágenes, subida `.glb`, compatibilidades, modelos de motor | Crear un producto con fotos y 3D en < 3 min |
| 4 | Catálogos públicos con filtros, estado Todos/Disponibles/Vendidos, orden por fecha, ficha por URL, visor 3D, precios por país + aviso de envío | Filtros en la URL; precio cambia al cambiar país |
| 5 | Motor 3D migrado y optimizado, piezas clicables → categoría de repuestos, respaldo estático | PageSpeed móvil ≥ 80 en inicio; clic en radiador abre radiadores |
| 6 | Asesores + motor de reglas + registro de leads + mini-CRM + GA4/Meta Pixel | Cada regla con prueba unitaria; evento `Lead` visible en Meta |
| 7 | Empresa, sedes, credibilidad editables; política de datos y términos; SEO (metadatos, Open Graph, sitemap); usuarios y permisos en el panel | Compartir una ficha en WhatsApp muestra foto, nombre y precio |
| 8 | Pruebas en celulares reales, accesibilidad, corrección de errores, subdominio + SSL, carga de productos reales | Lista de verificación de lanzamiento aprobada |

**Regla de alcance:** cualquier pedido nuevo durante los 8 días entra a la lista 1.1, salvo que reemplace algo de igual tamaño.

## Versión 1.1 · semanas 2–3

- Cuentas de cliente, favoritos, historial, **Mis equipos** (unidad con serie asignada al comprador).
- Constructor de formularios activable.
- Fichas técnicas PDF.
- Precios/tasas manuales por moneda; traducción asistida por IA en el panel; más idiomas.
- Recordatorio de leads sin atender; Meta Conversions API.
- Fotos reales; modelo 3D realista del inicio (si se consigue según la especificación).
- Proyecto Supabase de **producción** separado; dominio propio y correo corporativo.

## Versión 2

- Telemetría IoT (hardware, ingesta, panel del propietario, alertas).
- Bot de IA en WhatsApp con documentación de la empresa.
- Calculadora de selección (con curvas reales).
- Pagos en línea; costos de envío e importación.

## Especificación del modelo 3D realista (opcional, para 1.1)

`.glb` con licencia comercial · cada pieza como nodo separado `part_<clave>` (`part_radiador`, `part_culata`, …) · origen de cada pieza en su centro · escala en metros, eje Y arriba · ≤ 100 000 triángulos · texturas PBR ≤ 2K · ≤ 3 MB final.
