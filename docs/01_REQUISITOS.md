# 01 · Requisitos del sistema — JF Motores

> Versión 1.0 · 31-oct-2026 · Reemplaza la sección de requisitos de `PLAN_DE_IMPLEMENTACION.md`.
> Prioridad: **M** = MVP (8 días) · **1.1** = semanas 2–3 · **2** = fase posterior.
> El modelo de datos se diseña desde el día 1 para soportar todo (M, 1.1 y 2), aunque solo se construya el MVP.

## 1. Contexto y objetivo

| Ítem | Definición |
|---|---|
| Objetivo de negocio | Generar **credibilidad** y **convertir en venta** el tráfico de **publicidad en redes sociales**. Es una página de ventas. |
| Tráfico esperado | Mayoría móvil, desde navegadores internos de Instagram/Facebook. Los clientes actuales llegan por recomendación; el negocio se expande a nuevas zonas. |
| Clientes | Dueños de minas de todo tipo. Posibles: jefes de compras de empresas mineras y distribuidores. |
| Productos | 3 catálogos: **motobombas completas**, **motores**, **repuestos**. |
| Cierre de venta | WhatsApp con asesores. Sin pagos en línea en el MVP. |
| Operación | Administrador principal (desarrollador del sitio) + 2 colaboradores. |
| Métrica principal | Clics a WhatsApp (leads) por campaña, por producto y por asesor. |

## 2. Actores y roles

| Rol | Quién | Puede |
|---|---|---|
| **Administrador** | Administrador principal | Todo. Gestiona usuarios, roles y **permisos** desde el panel. |
| **Editor** | Colaboradores | Catálogo, contenido, datos de empresa (según permisos asignados). |
| **Asesor** | Vendedores por WhatsApp | Ver y actualizar sus leads asignados. |
| **Cliente** | Usuario externo registrado | Funciones extra (favoritos, historial de cotizaciones, **Mis equipos**). |
| **Visitante** | Anónimo | Ver catálogo, 3D, cotizar por WhatsApp. |

Los permisos son **granulares** (p. ej. `productos.editar`, `leads.ver_todos`, `usuarios.gestionar`) y el Administrador los asigna a cada rol desde el panel.

## 3. Requisitos funcionales

### RF-01 · Inicio con motor 3D (M)
- Se conserva la animación de fondo actual (encendido → revolución → despiece → apagado), **optimizada**.
- En el despiece, **cada pieza es clicable** y abre la categoría de repuestos de esa pieza (p. ej. radiador → `/repuestos/radiadores`).
- El mapeo pieza → categoría se edita desde el admin. Las categorías de repuestos son ampliables sin tocar código.
- El contenido comercial y el botón de WhatsApp se ven **antes** de que cargue el 3D. En dispositivos débiles se muestra imagen fija.

### RF-02 · Catálogos (M)
- Tres catálogos independientes: motobombas, motores, repuestos. Cada uno con categorías (y subcategorías) editables.
- Filtro de estado: **Todos / Disponibles / Vendidos**.
- Orden predeterminado: **fecha de publicación (más reciente primero)**. Otros órdenes: precio ↑↓, potencia ↑↓.
- Filtros adicionales: categoría, rango de precio, potencia (HP), diámetro de succión/descarga, marca/modelo de motor, compatibilidad (repuestos), búsqueda por texto y referencia.
- Los filtros se reflejan en la URL (se pueden compartir y usar en anuncios).

### RF-03 · Ficha de producto (M)
- URL propia por producto (`/motobombas/jf-m25`), galería de imágenes, especificaciones, precio, estado (Disponible/Vendido), botón WhatsApp.
- **Visor 3D por producto**: el modelo (`.glb`) se sube en el mismo formulario del producto en el admin. Si no hay modelo, el visor no aparece.
- Imágenes de referencia marcadas como *"Imagen de referencia"* (campo por imagen).
- Repuestos: lista de **compatibilidad** (con qué motores/motobombas/modelos de motor funciona). Motores y motobombas: lista de repuestos compatibles.
- Ficha técnica en PDF descargable (**1.1**).

### RF-04 · Precios por país (M)
- Precio base en **COP** cargado en el admin.
- Se detecta el país del visitante y se muestra el precio en su moneda con tasa de cambio actualizada diariamente; selector manual de país/moneda.
- El Administrador puede fijar tasas manuales o precios manuales por moneda (**1.1**).
- Aviso visible: *"Precio del artículo. No incluye envío, impuestos ni costos de importación/exportación."*
- Envío y costos de importación calculados: (**2**).

### RF-05 · Idiomas (M)
- Selector de idioma. MVP: **español, inglés y portugués** (interfaz completa). Estructura lista para agregar más idiomas sin código.
- El contenido de productos, categorías y empresa tiene campos por idioma; si falta una traducción se muestra el español.
- Traducción asistida por IA desde el admin (**1.1**).

### RF-06 · Cotización por WhatsApp (M)
- Botón **directo a WhatsApp** con mensaje armado: producto, referencia, precio mostrado, moneda, país, enlace a la ficha.
- Antes de abrir WhatsApp se **registra el lead** (producto, asesor asignado, país, idioma, campaña/UTM, dispositivo).
- El asesor se asigna con las reglas de RF-07.

### RF-07 · Asesores y reglas de asignación (M)
- CRUD de asesores en el admin: nombre, cargo, funciones, foto, WhatsApp, idiomas, países/zonas, catálogos que atiende, horario, peso, activo/inactivo.
- Reglas configurables desde el admin (se evalúan por prioridad; gana la primera que aplique):

| Modo | Qué hace | Cuándo usarlo |
|---|---|---|
| **Por catálogo / especialidad** | Motobombas → asesor A; repuestos → asesor B | Cuando cada asesor domina una línea |
| **Por país / zona** | Perú → asesor C; Antioquia → asesor A | Expansión a nuevas zonas |
| **Por idioma** | Visitante en inglés → asesor bilingüe | Tráfico internacional |
| **Rotación equitativa (round-robin)** | Reparte en turno entre un grupo | Equipo parejo, carga balanceada |
| **Rotación ponderada** | Reparte por porcentaje (p. ej. 60/40) | Asesores con distinta capacidad o experiencia |
| **Horario** | Solo asigna a asesores en turno; fuera de horario → asesor de guardia o mensaje automático | Evitar leads sin respuesta |
| **Cliente recurrente (fijo)** | Un cliente que vuelve es asignado al mismo asesor | Continuidad y **comisiones** justas |
| **Elección del cliente** | Se muestran tarjetas de asesores (nombre, cargo, foto) y el cliente elige | Generar confianza con caras reales |
| **Respaldo** | Asesor por defecto si ninguna regla aplica | Siempre obligatorio |

- Mini-CRM de leads: estado (*Nuevo, Contactado, Cotizado, Vendido, Perdido*), notas, filtro por asesor/fecha/campaña. Reporte de leads y ventas por asesor (base para comisiones).
- Recordatorio al asesor si un lead sigue en *Nuevo* tras X horas (**1.1**).

### RF-08 · Credibilidad y datos de empresa (M)
- Editables desde el admin: nombre comercial, razón social, NIT, años en el mercado, garantía, cifras (equipos entregados, clientes, zonas), testimonios, videos, redes sociales.
- **Sedes**: CRUD (nombre, ciudad, país, dirección, teléfono, horario, mapa, activa).
- Sección "Equipos entregados" alimentada por productos en estado *Vendido*.
- No se publica ningún servicio que la empresa no preste (p. ej. "asistencia 24/7").

### RF-09 · Formularios configurables (1.1)
- Constructor de formularios en el admin (campos, obligatorios, textos por idioma), **activable/desactivable**, y dónde se muestra (antes de WhatsApp, en ficha, en contacto). Las respuestas quedan en el lead.

### RF-10 · Cuentas de cliente (1.1)
- Registro/inicio de sesión (correo + contraseña, o Google). Funciones: favoritos, historial de cotizaciones, datos de envío.
- **Mis equipos**: al vender una motobomba, el admin registra la **unidad** (número de serie) y la asocia a la cuenta del cliente. Si el cliente no tiene cuenta, se le envía invitación.

### RF-11 · Telemetría IoT de equipos (2)
- Cada unidad vendida puede tener un dispositivo que envía datos (horas de uso, RPM, temperatura, presión, ubicación, alertas).
- **Solo el propietario de la unidad y el Administrador** pueden ver esos datos.
- Alertas y mantenimiento preventivo sugerido.

### RF-12 · Fases posteriores (2)
- Bot de IA en WhatsApp con documentación de la empresa (requiere WhatsApp Business Platform de Meta y empresa verificada).
- Calculadora de selección de motobomba (requiere curvas de rendimiento reales).
- Pagos en línea (anticipos/repuestos).

## 4. Requisitos no funcionales

| Código | Requisito | Criterio medible |
|---|---|---|
| RNF-01 | Velocidad móvil | LCP < 2,5 s y CLS < 0,1 en Android gama media con 4G (PageSpeed móvil ≥ 80 en catálogo y fichas) |
| RNF-02 | 3D no bloquea | El 3D carga después del contenido; se pausa fuera de pantalla; respaldo estático en equipos débiles |
| RNF-03 | SEO | HTML renderizado en servidor, URL por producto, metadatos y Open Graph por producto/idioma, `sitemap.xml` |
| RNF-04 | Seguridad | Claves solo en servidor; permisos en base de datos (RLS); límite de intentos de login; validación de toda entrada; subida de archivos con tipo y tamaño restringidos |
| RNF-05 | Privacidad (Ley 1581/2012) | Política de tratamiento de datos, aviso de cookies, autorización en formularios y registro |
| RNF-06 | Disponibilidad y respaldo | Hosting gestionado; copias diarias de la base de datos |
| RNF-07 | Medición | GA4 + Meta Pixel con evento `Lead` en cada clic a WhatsApp; UTM guardadas en el lead |
| RNF-08 | Accesibilidad | Contraste AA, navegable con teclado, textos alternativos |
| RNF-09 | Mantenibilidad | TypeScript, pruebas automáticas en cada cambio, entorno de pruebas separado de producción |
| RNF-10 | Portabilidad | Sin dependencias de Google AI Studio |

## 5. Pendientes del propietario (bloquean partes del MVP)

- [ ] Razón social, NIT y dirección legal → política de datos, pie de página, verificación en Meta.
- [ ] Números de WhatsApp, nombre, cargo y foto de cada asesor.
- [ ] Datos de credibilidad: años, garantía, cifras, sedes, testimonios, videos.
- [ ] Lista de productos con precio base COP, especificaciones y fotos (de referencia por ahora).
- [ ] Curvas de rendimiento de cada bomba (para la calculadora, fase 2).
- [ ] Compra de dominio definitivo y correo corporativo (`ventas@dominio`).
