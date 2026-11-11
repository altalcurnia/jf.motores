# Auditoría integral de SEO On-Page — JF Motores

**Fecha de corte:** 10 de noviembre de 2026  
**Dominio revisado:** [jfmotoresmedellin.com](https://jfmotoresmedellin.com/es)  
**Mercado principal identificado:** Colombia; sedes publicadas en Medellín y Caucasia  
**Alcance:** páginas públicas representativas, metadatos, estructura y contenido, navegación, datos estructurados, indexabilidad, sitemap/robots y búsquedas web exploratorias de competidores.

## Cómo leer los hallazgos

- **Observado en producción:** visible en la página publicada o en sus metadatos.
- **Verificado en el repositorio:** conducta que se desprende del código o de las instrucciones del proyecto.
- **Inferencia:** conclusión estratégica razonable que debe confirmarse con datos del negocio.
- **Pendiente de validar:** no puede concluirse sin Google Search Console, analítica, pruebas de rendimiento o confirmación del propietario.

La prioridad combina impacto posible en visibilidad y leads, urgencia y esfuerzo de corrección. “Alta”, “media” y “baja” son categorías de trabajo, no puntuaciones científicas.

## A. Resumen ejecutivo

JF Motores es un catálogo de venta consultiva B2B para minería. Su conversión principal es iniciar una cotización por WhatsApp; el sitio no muestra un proceso de carrito y pago. El público necesita entender si una bomba satisface caudal, altura, sólidos, succión y descarga, y si un repuesto corresponde a su motor. Las fichas ya cubren varios de esos datos y relacionan equipos con repuestos, lo que puede diferenciar la oferta frente a catálogos genéricos.

La base técnica On-Page observada está bien encaminada: las páginas muestreadas tienen títulos y descripciones, canonical, hreflang, navegación rastreable, sitemap, robots, Schema de producto y breadcrumbs. El inicio explica el negocio antes de la experiencia 3D y conduce a WhatsApp y a los catálogos. No encontré un bloqueo técnico confirmado que impida rastrear todo el sitio.

Los obstáculos principales son la falta de una línea base de visibilidad orgánica, páginas de pieza que se publican aunque no tengan producto, y datos demasiado escuetos o contradictorios en algunas fichas. En la ficha de la JF Jaguar 25, por ejemplo, la descripción SEO es “Minera · tajo abierto”, aunque la página ofrece potencia, caudal, cabeza, paso de sólidos y dimensiones; además, una imagen de un kit de pistón declara Ø98 en su ALT mientras el texto visible indica Ø88. En el catálogo aparece un motor reconstruido, pero el Schema de todas las ofertas declara condición “nuevo”.

**Conclusión ejecutiva:** no hace falta inflar los textos ni rehacer la arquitectura. El mayor valor vendrá de hacer que cada URL indexable responda una intención concreta, comunicar con precisión la información técnica y comercial y medir qué búsquedas llevan a cotizaciones y ventas.

## B. Comprensión del proyecto

| Aspecto | Diagnóstico |
|---|---|
| Tipo de sitio | Catálogo comercial B2B con generación de leads por WhatsApp, no tienda con checkout. |
| Oferta principal | Motobombas diésel completas; motores diésel; repuestos con compatibilidad por modelo. |
| Audiencia | Dueños de minas y, potencialmente, responsables de compras y distribuidores. La mayoría del tráfico previsto es móvil y puede venir de anuncios sociales. Estos datos constan en los requisitos del proyecto. |
| Necesidad | Sacar agua/lodo de una operación minera, conseguir un motor o identificar el repuesto correcto, con menos riesgo de compra equivocada y menos paradas. |
| Conversión primaria | Cotización por WhatsApp. CTA visible en el encabezado, hero, ficha de producto y páginas de categoría. |
| Conversión secundaria | Descubrir inventario, comparar especificaciones, identificar compatibilidad, conocer sedes y generar confianza; registro y servicio a clientes existentes. |
| Mercado e idioma | Colombia y español como mercado/idioma principales. El sitio publica también inglés y portugués. La cobertura comercial real en esos mercados no se confirmó en esta auditoría. |
| Conocimiento técnico del usuario | Alto o medio-alto para jefes de mina y mantenimiento; se esperan modelo, serie, referencias y condiciones de bombeo. La ayuda para elegir equipo reduce fricción. |
| Diferenciadores declarados | Prueba bajo carga en taller, repuestos compatibles, registro de equipos, asesoría directa y catálogo técnico. Son promesas con potencial, pero conviene acompañarlas con evidencia verificable. |
| Objetivo real deducido | Generar cotizaciones calificadas y convertirlas en ventas, principalmente desde móvil. Esto coincide con los requisitos del negocio. |

## C. Diagnóstico SEO On-Page

### C.1 Páginas y evidencia revisadas

Se revisó el DOM publicado de:

- Inicio: [jfmotoresmedellin.com/es](https://jfmotoresmedellin.com/es)
- Catálogos: [/es/motobombas](https://jfmotoresmedellin.com/es/motobombas), [/es/motores](https://jfmotoresmedellin.com/es/motores), [/es/repuestos](https://jfmotoresmedellin.com/es/repuestos)
- Ficha: [/es/motobombas/jf-m25](https://jfmotoresmedellin.com/es/motobombas/jf-m25)
- Categoría de piezas: [/es/repuestos/radiador](https://jfmotoresmedellin.com/es/repuestos/radiador)
- Ayuda: [/es/guias](https://jfmotoresmedellin.com/es/guias), [/es/soporte](https://jfmotoresmedellin.com/es/soporte)
- Local: [/es/sedes](https://jfmotoresmedellin.com/es/sedes)
- [sitemap.xml](https://jfmotoresmedellin.com/sitemap.xml) y [robots.txt](https://jfmotoresmedellin.com/robots.txt)

Es una muestra representativa, no un rastreo automatizado de todas las URLs ni una comprobación de todas las versiones de idioma.

### C.2 Títulos, descripciones y encabezados

Los títulos y descriptions de inicio, catálogos y páginas de apoyo son distintos. La estructura general de las fichas es clara; el principal problema es que las descripciones de producto dependen del resumen editorial cargado para cada artículo, incluso si ese resumen aporta pocos datos.

| Página | Metadata observada | Encabezado/contenido observado | Evaluación y propuesta |
|---|---|---|---|
| Inicio | “JF Motores · Motobombas diésel para minería \| Medellín”; description: “Motobombas diésel probadas bajo carga, motores y repuestos que encajan a la primera. Asesoría por WhatsApp para la minería en Colombia.” | H1: “Que el agua no detenga tu mina.” El kicker y el párrafo cercano dicen motobombas diésel, minería y Medellín. | Está bien alineado y tiene una propuesta memorable. Para hacer el H1 explícito sin perder el concepto, evaluar: **“Motobombas diésel para que el agua no detenga tu mina”**. |
| Motobombas | “Motobombas completas \| JF Motores”; description menciona motor diésel, agua, lodo y desagüe de socavón. | H1: “Motobombas completas”; tarjetas de equipos. | El description es útil, pero el title/H1 no contienen la intención más cualificada. Probar **“Motobombas diésel para minería \| JF Motores Medellín”**. |
| Motores | “Motores \| JF Motores”; description: “Motores diésel de alto torque para minería, nuevos y reconstruidos.” | H1: “Motores”; filtro por modelo y estado; cuatro resultados en la página revisada. | El description es correcto; title y H1 pueden precisar la categoría: **“Motores diésel para minería \| JF Motores Medellín”** y **“Motores diésel para minería”**. |
| Repuestos | “Repuestos \| JF Motores”; description: piezas con información de compatibilidad. | H1: “Repuestos”; lista con trece piezas en la página revisada. | Oportunidad comercial importante. Probar **“Repuestos para motores diésel y motobombas \| JF Motores”** y description que explique búsqueda por referencia/modelo y cotización por WhatsApp. |
| JF-M25 | “Motobomba JF Jaguar 25 · JF-M25 · 25 HP · 6″ \| JF Motores”; description: “Minera · tajo abierto”. | H1: “Motobomba JF Jaguar 25”; specs incluyen 25 HP, 3.000 L/min, 30 m de cabeza, paso de sólidos de 50 mm y conexiones de 6″. | El title es específico; la description desperdicia la mayor parte del valor de la ficha. Usar una descripción basada en especificaciones verificadas (ver H). |
| Repuestos: radiador | “Repuestos: Radiador \| JF Motores”; description genérica por tipo de pieza, motor y WhatsApp. | H1: “Repuestos: Radiador”; producto visible compatible con JF-D25 y JF-D40T. | Correcto como intención de categoría. Generar description específica solo con stock/compatibilidades reales; quitar “precio en tu moneda” mientras la conversión monetaria no exista. |
| Guías | “Guías \| JF Motores”; description: guías prácticas para elegir, cuidar y reparar equipos. | H1: “Guías”; secciones de selección, mantenimiento, repuestos, recursos oficiales y videos. | Buena base informativa. Probar **“Guías para motobombas y motores diésel \| JF Motores”**. |
| Sedes | “Nuestras sedes \| JF Motores”; description invita a visitar talleres y puntos de atención. | H1: “Nuestras sedes”; Medellín y Caucasia, direcciones, horarios, teléfonos, fotos y asesores. | Útil y concreta. Probar **“Sedes de JF Motores en Medellín y Caucasia”** y destacar que la página es de venta/servicio de motobombas y motores para minería si cada sede realmente lo ofrece. |

Google puede reescribir el title link y el snippet usando el título visible y el contenido; por eso la metadata debe describir fielmente la página y no prometer condiciones que el visitante no ve. [Documentación de títulos y snippets de Google Search Central](https://developers.google.com/search/docs/appearance/title-link), [guía SEO de Google](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).

**Jerarquía:** las fichas usan H1 para el equipo y H2 para especificaciones, descripción y repuestos compatibles; esto funciona bien. En los listados de motores/motobombas, el H1 va seguido directamente de encabezados H3 de cada tarjeta sin H2 visible para la sección de resultados. No es un bloqueo SEO, pero es más claro introducir un H2 “Equipos disponibles”/“Resultados” o ajustar el nivel de los títulos de tarjeta al árbol de la página.

### C.3 Intención de búsqueda y mapa de palabras clave

No se consultó un sistema de volúmenes/dificultad. Los términos siguientes son hipótesis de relevancia comercial, no datos de demanda cuantificada.

| Prioridad | Clúster / consultas a validar | Intención | Página recomendada |
|---|---|---|---|
| Alta | motobomba diésel para minería; motobomba diésel para desagüe de socavón; motobomba minera para lodo | Comercial/transaccional | Inicio como marca/oferta; catálogo de motobombas para elección; fichas específicas para cotización. |
| Alta | repuestos para motor diésel JF-D25 / JF Andes 4D24; radiador compatible JF-D25; kit de pistón JF-D25 | Transaccional, modelo/referencia | Catálogo de repuestos, páginas individuales de repuestos y filtro por modelo. |
| Alta | motobomba JF-M25; motobomba Cummins 4BT; motor diésel JF-D25 | Transaccional/navegacional | Página individual del producto, con nombre, referencia, specs, estado y alternativas. |
| Media-alta | motobombas diésel Medellín; motores para minería Medellín; repuestos motores diésel Medellín | Local/comercial | Sedes locales y páginas de catálogo, vinculadas entre sí. |
| Media | cómo elegir motobomba para una mina; caudal y cabeza para desagüe; qué enviar para identificar un repuesto; mantenimiento de motobomba diésel | Informativa/comercial | Guías públicas que resuelvan una pregunta y deriven a la ficha/catálogo correcto. |
| Media | motobomba para tajo abierto; motobomba para socavón; bomba para agua con sólidos de 50 mm | Comercial, larga cola | Solo fichas que confirmen esos usos y parámetros. Crear páginas nuevas solo con contenido técnico propio y datos reales. |

**Asignación recomendada:** página principal = marca y gama para minería; catálogo = selección por línea; ficha = modelo, referencia y aplicación exacta; guía = intención informativa; sede = intención local. La estructura ya permite esta separación.

No se encontró evidencia suficiente para afirmar canibalización entre páginas. Sí hay que vigilar que la página principal y el catálogo de motobombas no compitan por la misma consulta principal y que cada guía tenga un propósito informativo distinto. Search Console debe confirmar qué consultas y URLs aparecen realmente.

### C.4 Contenido, intención, experiencia y conversión

**Fortalezas observadas**

- En segundos se entiende el problema que resuelve el sitio; el subtítulo del hero nombra motobombas, repuestos y WhatsApp.
- El CTA de WhatsApp coincide con el proceso real. La ficha de producto abre una cotización con referencia y enlace; no se fuerza un registro antes de consultar.
- En la ficha JF-M25 se muestra precio en COP, aviso de envío por separado, estado, especificaciones, descripción y repuestos compatibles.
- El catálogo agrupa por tipo, tiene filtros por estado/modelo y órdenes, y los productos enlazan a páginas propias.
- En las sedes se muestran datos concretos; el FAQ responde preguntas útiles sobre precio/envío, imágenes de referencia, compatibilidad y cuenta.
- La experiencia 3D está después del hero con CTA, y sus etiquetas permiten abrir categorías de piezas. La secuencia respeta la conversión antes de la interacción llamativa.

**Fricciones y necesidades no resueltas**

- Una compra industrial de alto valor requiere ver evidencia de la prueba anunciada, condición de producto, garantía aplicable, plazo/disponibilidad, alcance de envío y quién confirma la especificación. En la ficha JF-M25 revisada se ve una etiqueta de “Imagen de referencia”, pero no meses/condiciones de garantía.
- Algunos productos usan imágenes identificadas como referencia. Esa transparencia es correcta; para dar confianza, sustituirlas gradualmente por fotos reales de unidad, prueba o componentes, siempre identificando la imagen con precisión.
- El resumen de la ficha JF-M25 no anticipa las especificaciones que permiten al usuario decidir desde la SERP.
- Las páginas de repuestos son la ruta de intención más concreta, pero el visitante puede caer en una categoría sin inventario (ver hallazgo F-02).
- La biblioteca anuncia diez cursos/guías oficiales como gratuitos para clientes registrados. El contenido útil propio debe seguir abierto y legible sin cuenta; no conviene bloquear resúmenes técnicos que pueden resolver la pregunta orgánica.

### C.5 Imágenes y multimedia

- Los nombres de archivo revisados son relativamente descriptivos (por ejemplo, jf-m25.jpg, radiador-d25.jpg); las imágenes de producto se sirven con next/image y tamaños declarados en el componente de tarjetas.
- Los ALT de las tarjetas suelen nombrar la pieza/modelo, lo que ayuda a accesibilidad e interpretación. Los logos decorativos usan ALT vacío, que puede ser correcto cuando no aportan contenido.
- Hay discrepancias verificables en datos publicados: en la ficha JF-M25, la imagen de kit-piston-d25.jpg declara ALT “Kit de pistón con anillos Ø98”, pero el producto visible dice Ø88 y la especificación también dice 88 mm. En /es/repuestos, el producto se presenta como “Ventilador de 8 aspas Ø450” mientras el ALT dice “Ventilador de 6 aspas Ø450”. Confirmar contra la pieza/foto real y corregir el dato fuente.
- Las miniaturas de videos tienen ALT vacío y una acción accesible que contiene el título; el video remoto se carga al activarlo. Es un enfoque razonable para reducir cargas anticipadas. Si el video aporta contenido único, añadir una transcripción/resumen visible para búsquedas y accesibilidad.
- No se midieron bytes, dimensiones finales, formatos descargados ni uso real de ancho de banda. No se puede afirmar que las imágenes sean pesadas o livianas; comprobarlo con una sesión móvil y red limitada.

Google recomienda ALT descriptivo en contexto y que los archivos sean breves y representativos, sin insertar keywords de manera artificial. [Guía oficial de SEO para imágenes](https://developers.google.com/search/docs/appearance/google-images).

### C.6 Enlaces internos y arquitectura

La arquitectura tiene una base positiva: navegación a las tres líneas, tarjetas de categoría, productos con URLs individuales, breadcrumb de producto en Schema, enlaces de repuestos compatibles y menú que conecta soporte, guías, sedes y preguntas frecuentes.

Mejoras concretas:

1. Desde las guías de selección, enlazar al catálogo de motobombas con anchor descriptivo, por ejemplo “Ver motobombas diésel disponibles”. En la guía “Cómo pedir el repuesto correcto”, enlazar al filtro por motor y a las piezas correspondientes.
2. En cada ficha de motor/equipo, usar el bloque de compatibles como enlace visible a la consulta de repuestos por ese motor; el filtro ya usa parámetros de URL.
3. En páginas de categoría de pieza, enlazar directamente a la ficha del repuesto real y, cuando sea pertinente, al motor/equipo compatible. La frase “Para JF-D25 y JF-D40T” debe seguir siendo factual y no convertirse en keyword genérica.
4. En fichas vendidas, mantener una siguiente acción clara: “Consulta una unidad similar” y enlaces a alternativas disponibles. Mantener la ficha indexable solo si conserva información útil propia.
5. Valorar páginas locales de Medellín y Caucasia únicamente si cada una tiene información realmente distinta (servicios prestados, dirección, horario, fotos y contacto). No crear páginas casi idénticas solo para introducir la ciudad.

No se detectaron enlaces rotos en este muestreo; no se ejecutó un crawler de enlaces.

### C.7 SEO técnico que afecta al On-Page

**Verificado positivamente**

- /robots.txt permite rastreo general y excluye /admin, /api/, /auth/ y cuentas; declara sitemap.
- /sitemap.xml se sirve y cubre páginas públicas, variaciones localizadas y productos.
- Las páginas revisadas publican canonical propio y hreflang para es-CO, en-US, pt-BR y x-default en español.
- El HTML revisado tiene lang="es-CO". En productos se ven Product y BreadcrumbList; inicio publica Organization con sedes; /sedes declara dos LocalBusiness.
- La página de producto incluye precio/moneda COP, estado, SKU, imagen y vendedor en Product JSON-LD. La ficha examinada coincide en precio y disponibilidad con el contenido visible.
- El contenido de catálogo y producto se construye en componentes de servidor del proyecto; filtros interactivos complementan la página y no sustituyen la información básica.

**Problemas / condiciones por validar**

- El Schema de producto fija itemCondition como NewCondition para todos los artículos. La página de motores ofrece un “Motor diésel JF-D25 reconstruido”; el dato estructurado de esa ficha no debe declarar nuevo. Google indica que el marcado debe describir el producto de esa página; Schema.org ofrece RefurbishedCondition. [Google: datos estructurados de producto](https://developers.google.com/search/docs/appearance/structured-data/product-snippet), [Schema.org: RefurbishedCondition](https://schema.org/RefurbishedCondition).
- El sitemap se genera con todas las 24 claves de pieza del motor, aunque la página de categoría puede responder con un estado vacío cuando no hay categoría/productos. Hay que comparar las 24 rutas con el inventario real y no dar por hecho que todas merecen indexación (F-02).
- Las páginas con filtros conservan el canonical de la categoría base y no parecen declarar noindex para estados de búsqueda/filtro según la metadata común. Esto consolida señales, pero no impide que un bot rastree combinaciones de búsqueda/estado/modelo. No es una emergencia; revisar en GSC antes de cambiarlo y excluir del índice las variantes sin contenido propio si Google las está indexando.
- en-US y pt-BR son etiquetas específicas de región. El sitio declara areaServed: CO, y no se confirmó venta/envío en EE. UU. o Brasil. Confirmar si esos son los mercados objetivo y si las traducciones y precios están localizados; si son solo idiomas, ajustar las etiquetas y el contenido a los mercados reales. Google describe los códigos y las relaciones hreflang en su [guía de páginas localizadas](https://developers.google.com/search/docs/specialty/international/localized-versions).
- No se verificaron errores HTTP de todas las URLs, redirects, sitemap en Search Console, indexación real, canonical elegida por Google, schema con Rich Results Test, Core Web Vitals, PSI ni render en Android. La disponibilidad del sitemap no prueba que las páginas estén indexadas.

## D. Análisis competitivo

Las búsquedas web exploratorias se hicieron para consultas como “motobombas para minería/desagüe”, “motobombas diésel Medellín” y “repuestos motores diésel minería Medellín”. Los resultados cambian por ubicación, idioma y momento; no son una SERP certificada de Google desde Medellín ni un ranking exhaustivo. La búsqueda exacta de marca/dominio tampoco devolvió una página oficial de JF en los resultados del buscador consultado; es una señal para revisar GSC, no una prueba de desindexación.

| Competidor/página | Tipo de competencia | Ejemplo público observado | Lección para JF Motores |
|---|---|---|---|
| [Grupo Construequipos — motobombas diésel o gasolina](https://www.grupoconstruequipos.com/motobombas-diesel-gasolina/) | Directo local | Página con frase de categoría + Medellín, “importadores directos” declarado y CTA de WhatsApp/cotización. La página es breve y aporta poca profundidad técnica. | JF puede competir en claridad local y CTA, y superar la profundidad con caudal, cabeza, paso de sólidos, fotos y compatibilidad reales. |
| [Inversiones Hermanos RU](https://hermanosru.com/) | Directo/alternativo nacional | Presenta línea de motobombas diésel/gasolina, equipos base y productos identificados por código; incluye una bomba de achique de 4.800 GPM. | Los códigos y fichas de producto ayudan a ubicar el equipo. JF debería sostener sus referencias y specs en páginas individuales, y crear más contenido solo para inventario real. |
| [Barnes de Colombia — Minera](https://www.barnes.com.co/minera/) | Indirecto y referente técnico | Enfoca aplicaciones mineras de achique/desagüe de socavones y dragado. | El usuario busca una solución de drenaje por aplicación, no solo “una bomba”. Describir el escenario (socavón, tajo, lodo/sólidos) junto a límites técnicos confirmados. |
| [Grupo Turbos y Repuestos Héctor Severino](https://turbosyrepuestos.com/) | Directo en repuestos diésel | Se presenta en Medellín; declara 19 años, más de 2.000 referencias y envíos nacionales; organiza catálogo por motor/máquina y muestra asesores y contactos. Son declaraciones del competidor, no datos auditados. | El filtro por motor, el inventario representado con referencias y las señales locales ayudan a compra consultiva. JF tiene compatibilidades y CTA, pero aún puede fortalecer prueba de experiencia/stock con datos propios verificables. |
| [Multidiesel Medellín — Productos](https://www.multidieselmedellin.com/Productos/) | Directo en repuestos | Agrupa referencias por marcas y familias de motor (Cummins 6BT/6CT, Mack, International, Caterpillar, Detroit) y publica dirección, teléfono y envíos nacionales. | Las consultas largas suelen incluir marca/modelo. Convertir compatibilidad de la base en enlaces visibles y verificables por familia/modelo es una ventaja. |
| [Motores Colombia](https://www.motorescolombia.com/) | Directo/adyacente nacional | Combina motores, repuestos y servicio técnico, marcas/importación, historia y CTA a cotización. Declara trayectoria desde 2008. | Para motores de minería, el usuario compara respaldo, disponibilidad, marcas y soporte, además de HP. El texto de JF debe aclarar qué ofrece realmente en servicio y garantía. |
| [Reyson / Type Group](https://typegroup.com.co/index.html) | Indirecto, sustituto de bombeo | Destaca 8 modelos, caudales de 180–1.200 m³/h, hasta 100 m, stock, respaldo y CTA; la propia página precisa cobertura y condiciones de entrega. | Es un buen ejemplo de comunicar capacidad por caso de uso. No copiar sus claims; presentar la matriz real de desempeño y disponibilidad de JF. |
| [Casa Arango — repuestos diésel](https://www.casaarango.com/repuestos-motores-diesel/) | Directo en repuestos | Catálogo amplio de repuestos con dirección en Medellín y distribución nacional. | Para competir en consultas locales conviene sustentar ubicación, líneas, referencias y alcance real de envíos. |

**Quién compite en orgánico:** para motobombas y desagüe aparecen páginas de equipos de bombeo/minería; para repuestos diésel aparecen distribuidores y catálogos por marca/modelo. No son necesariamente los mismos competidores comerciales. Los hallazgos de búsqueda consultados incluyen además [Motores Colombia](https://www.motorescolombia.com/), [Valestenergy](https://www.valestenergysas.com/) y [Global Miner](https://globalminer.com.co/tienda/?product_cat=motobombas), pero no se debe inferir su posición o tráfico a partir de este muestreo.

**Espacio para diferenciarse:** combinar la respuesta a una aplicación minera concreta con especificaciones comprobables, compatibilidades reales, estado/disponibilidad vigente, imagen honesta y una ruta de asesoría que pida los datos técnicos adecuados. No hace falta copiar claims de “importadores”, “garantía total”, inventario o entregas si JF no los puede sustentar.

## E. Alineamiento con el objetivo comercial

| Perspectiva | Estado | Qué hace falta |
|---|---|---|
| Buscadores | La web expone contenido y rutas dedicadas, canonicals/hreflang, sitemap, robots y Schema. | Confirmar indexación/consultas en Search Console; reducir páginas vacías; corregir metadata y Schema contradictorios. |
| Usuario | La oferta y WhatsApp se entienden rápido; las fichas contienen especificaciones y compatibilidades. | Sustituir descriptions vagas; verificar que imágenes/ALT/diámetros coincidan; ofrecer alternativa útil si no hay stock; mostrar evidencia de prueba y condiciones comerciales confirmadas. |
| Negocio | La mayoría de CTAs conducen al canal que cierra la venta; las fichas incluyen referencia y vínculo a WhatsApp. | Medir clic → conversación calificada → cotización → venta por producto, página, idioma y campaña; evitar prometer moneda/garantía/envíos no disponibles. |

El posible conflicto principal es publicar muchas variantes de idioma o páginas de pieza para ampliar alcance antes de tener traducción, cobertura comercial o inventario que justifique cada URL. Resolverlo con información localizada y real, no con páginas repetitivas.

## F. Inventario de hallazgos

| ID / prioridad | Elemento y URL | Evidencia y tipo de problema | Consecuencia probable | Recomendación | Impacto SEO / negocio | Esfuerzo |
|---|---|---|---|---|---|---|
| F-01 · Alta / inmediata | Indexación y medición del dominio | La consulta de marca/dominio en el buscador consultado no devolvió una página oficial. docs/05_PLAN_OPERACION.md mantiene Search Console y Perfil de Empresa de Google en el plan de crecimiento. Esto es una señal, no prueba de desindexación. | Puede no haber base para saber si Google descubre/indexa el catálogo ni si las impresiones orgánicas llegan a leads. | Verificar propiedad GSC, enviar sitemap, revisar “Inspección de URL” en inicio, categorías y productos; resolver estados excluidos/duplicados. Crear/validar el perfil real de cada sede si el negocio lo gestiona. | SEO alto por incertidumbre; negocio alto porque no se atribuye demanda orgánica/local. | Bajo |
| F-02 · Alta / inmediata | Categorías de pieza y sitemap, por ejemplo /es/repuestos/ciguenal | El código envía al sitemap las 24 claves de pieza para cada idioma. Una página sin categoría o producto muestra estado vacío, pero sigue siendo URL válida y tiene metadata genérica. No se rastrearon las 24 en producción una por una. | Páginas débiles o vacías pueden consumir rastreo, quedar fuera o satisfacer mal la intención de búsqueda. | Comparar cada clave con inventario. Mantener indexables las categorías con producto o contenido propio útil. Para categorías vacías, conservar CTA para visitantes y aplicar noindex,follow hasta que tengan contenido/inventario; no listarlas en sitemap mientras tanto. | SEO medio-alto; negocio alto si el clic de una pieza termina en un vacío. | Bajo-medio |
| F-03 · Alta / inmediata | Ficha /es/motobombas/jf-m25 | Description actual “Minera · tajo abierto”; la página tiene 25 HP, 3.000 L/min, 30 m, paso de sólidos 50 mm y 6″. Desalineación de metadata/contenido. | El snippet no ayuda a comparar el equipo y desaprovecha consultas técnicas de alta intención. | Escribir una description dinámica y única por ficha (ver H). Auditar los demás productos por resúmenes escuetos. | SEO medio-alto; negocio alto por cualificación. | Bajo |
| F-04 · Alta / inmediata | Schema de producto: /es/motores y ficha JF-D25R | El catálogo muestra “Motor diésel JF-D25 reconstruido” (/es/motores/jf-d25r). En ProductDetail.tsx, itemCondition está fijado a NewCondition para todo producto. Error de veracidad de datos estructurados. | Señal contradictoria entre ficha y Schema; puede reducir confianza o elegibilidad de resultados enriquecidos. | Derivar la condición del dato editorial de producto y usar el valor Schema que refleje la condición real (p. ej., RefurbishedCondition si aplica). No confundir condición con disponibilidad “vendido”. Validar marcado. | SEO medio; negocio medio-alto porque describe incorrectamente un bien reconstruido. | Bajo |
| F-05 · Alta / inmediata | ALT/datos de imágenes: JF-M25 y /es/repuestos | El ALT del kit de pistón dice Ø98, pero la ficha dice Ø88; ALT del ventilador dice 6 aspas mientras el producto dice 8. Error objetivo de datos/accesibilidad. | Lectores de pantalla, buscadores y compradores reciben información inconsistente sobre piezas técnicas. | Confirmar las piezas contra el artículo y corregir el origen del ALT/dato visible en los tres idiomas. Revisar sistemáticamente diámetro, aspas, capacidad y referencias. | SEO de imágenes medio; impacto de confianza/conversión alto. | Bajo |
| F-06 · Alta / inmediata | Categoría /es/repuestos/radiador y metadata multilingüe | La description plantilla promete “precio en tu moneda” en ES/EN/PT. El precio almacenado es COP y formatPrice formatea explícitamente COP; no se encontró conversión por país en el flujo revisado. Desalineación comercial entre promesa y salida. | Usuario internacional puede esperar una divisa local y encontrar COP; el snippet puede atraer clic con una promesa falsa. | Hasta implementar y verificar conversión, cambiar a “precio publicado en COP”/“precio y envío se confirman por WhatsApp” en los tres idiomas. Si se implementa, publicar tasa/moneda/fecha con coherencia entre UI y Schema. | SEO medio; negocio alto en sesiones internacionales. | Bajo para corregir copy; alto para conversión de moneda. |
| F-07 · Media-alta | /es/motobombas, /es/motores, /es/repuestos | “Motores \| JF Motores” y “Repuestos \| JF Motores” son titles amplios; la categoría de motobombas se llama “Motobombas completas”. Las descriptions aportan más intención que el title. | Menor diferenciación de SERP para “diésel”, minería, compatibilidad y Medellín. | Aplicar titles/H1 propuestos en C.2 y H, separados por intención; no repetir lista de keywords. | SEO medio; negocio medio-alto. | Bajo |
| F-08 · Media-alta | Localización /es, /en, /pt y productos | hreflang señala en-US y pt-BR; tr() usa español como respaldo cuando falta traducción del dato de producto. El Schema indica cobertura Colombia. No se validó el texto de todas las páginas en inglés/portugués. Riesgo condicional. | Una página que declara una región/idioma puede mostrar texto, moneda o condiciones del mercado equivocados. | Revisar muestras de fichas, repuestos y sedes en EN/PT; mantener hreflang solo para versiones realmente traducidas/localizadas y destinos que atiende el negocio. Si son solo idiomas, considerar etiquetas de idioma sin región. | SEO medio; negocio medio-alto para tráfico exterior. | Medio |
| F-09 · Media-alta | /es/sedes y presencia local | La página contiene dos sedes y JSON-LD LocalBusiness, pero el plan operativo todavía lista Perfil de Empresa de Google por sede como tarea. | Oportunidad local y de verificación empresarial desaprovechada; el marcado por sí solo no sustituye perfiles ni señales externas. | Confirmar datos idénticos (nombre, dirección, teléfono, horario) entre sede, perfil oficial y negocio; completar horario/geo/Maps en Schema cuando estén validados. Crear páginas individuales solo si aportan contenido propio. | SEO local alto; negocio alto para consultas cerca de sedes. | Medio |
| F-10 · Media | Trust, fotos y garantías en inicio y fichas | El sitio destaca prueba bajo carga, compatibilidades y registro con garantía; las fichas muestreadas muestran imágenes de referencia y no muestran condiciones/duración de garantía. El plan operativo aún marca testimonios, cifras, fotos y garantía como pendientes. | Una persona que compara equipos costosos tiene poca evidencia pública para comprobar claims y reducir riesgo. | Publicar evidencia real (fotos/videos de prueba, unidades entregadas, datos de garantía aprobados) y enlazar condiciones desde la ficha. No inventar años, stock, garantía ni respaldo. | SEO indirecto medio; negocio alto. | Medio-alto |
| F-11 · Media | /es/guias | El catálogo de recursos oficiales comunica acceso gratuito para clientes registrados; existen tres guías propias y videos. Fricción de acceso para una página cuyo valor potencial es atraer búsquedas informativas. | Baja utilidad para visitantes nuevos y menor recorrido desde consulta técnica a producto. | Mantener texto y pasos propios abiertos. Valorar enlaces directos a documentos públicos sin login obligatorio; añadir enlaces contextuales a producto/parte y una CTA de cotización relevante. | SEO medio; negocio medio. | Bajo-medio |
| F-12 · Media | URLs de filtros de catálogo | Los filtros usan query params; metadata común fija canonical a la categoría sin query, pero no declara noindex para estados de búsqueda/filtro. | Combinaciones dinámicas pueden producir rastreo de muchas URLs similares. | Primero mirar cobertura de GSC. Si se rastrean/indexan variantes sin contenido propio, marcar variantes con parámetros noindex,follow, mantener canonical a la categoría base y conservar los enlaces compartibles para usuarios/anuncios. | SEO medio, no confirmado como incidencia; negocio positivo al conservar filtros. | Bajo-medio |
| F-13 · Baja / recomendada | Encabezados de listados | Las categorías revisadas tienen H1 seguido directamente de H3 en tarjetas. | Jerarquía menos explícita para lector asistido; efecto de ranking directo bajo. | Añadir H2 de resultados o ajustar nivel semántico de títulos de producto según el DOM final. | SEO bajo; accesibilidad media. | Bajo |
| F-14 · Pendiente de medir | Inicio y medios, especialmente 3D en móviles | La secuencia coloca copy/CTA antes de la experiencia 3D, lo cual es correcto. No hay PSI/CrUX/RUM medido en esta auditoría. | El peso/tiempo del 3D podría perjudicar usuarios móviles o CWV si carga de forma temprana. No es un problema confirmado. | Medir páginas de inicio, catálogo y ficha con PSI móvil y datos de campo; observar LCP/INP/CLS y bytes del bundle/imagen. Mantener carga diferida/pausa fuera de pantalla y fallback para móviles débiles. | Potencial SEO y negocio alto si falla; certeza actual baja. | Medio |

## G. Plan de optimización

### Prioridad inmediata — primeros cambios

1. **Conectar la medición orgánica.** Verificar jfmotoresmedellin.com en Search Console, enviar sitemap.xml, inspeccionar manualmente muestras de inicio, categorías, ficha JF-M25 y repuesto. Registrar URLs indexadas, canónicas elegidas y consultas. Esto permite distinguir falta de visibilidad de un problema de contenido.
2. **Depurar el sitemap de páginas de pieza.** Revisar cada una de las 24 claves y su inventario; poner en sitemap solo páginas con producto o contenido útil. En las vacías, mantener la ruta de contacto para usuarios y excluirlas temporalmente del índice.
3. **Alinear las fichas con datos verdaderos.** Corregir las dimensiones de pistón/ventilador, condición de “reconstruido” en Product JSON-LD, y asegurar que stock/precio/condición reflejen lo publicado. Revisar la interfaz de administración para prevenir que el mismo dato diverja entre nombre, especificación y ALT.
4. **Reescribir metadata de las fichas y categorías prioritarias.** Empezar por JF-M25 y repuestos, luego aplicar una plantilla con campos dinámicos a productos reales; reemplazar los titles demasiado genéricos de motores/repuestos.
5. **Quitar la promesa de moneda local si no se presta hoy.** Actualizar descriptions en ES/EN/PT para no anunciar precio en moneda del visitante cuando el precio se presenta en COP. Si se implementa conversión, reflejar la misma moneda en contenido y Schema.
6. **Medir CTA y calidad de lead.** Confirmar evento de clic a WhatsApp, UTMs por página/producto, y atribución hasta lead calificado y venta. La métrica de negocio no es solo tráfico: es cotización calificada por visita orgánica.

**Resultado esperado:** datos fiables, mayor coincidencia entre consulta/snippet/página y primera línea de medición SEO→WhatsApp. **Indicadores:** cobertura/indexación de GSC, impresiones/clics/CTR por landing y consulta, errores de datos estructurados, clics a WhatsApp y leads calificados por producto.

### Prioridad intermedia — contenido, navegación y localización

1. Optimizar H1/title/description de motobombas, motores y repuestos; conservar la frase emocional del hero como apoyo de marca.
2. Crear un bloque de aplicación y selección en motobombas: qué medir (caudal requerido, altura total, succión/descarga y tamaño de sólidos), con un CTA que solicite esa información. El área técnica debe aprobar fórmulas y límites.
3. Hacer accesible para visitantes el contenido propio de las guías. Conectar cada guía a catálogo/ficha relevante y a WhatsApp con un mensaje contextual.
4. Validar traducciones y etiquetas regionales con el responsable comercial. No publicar una versión como dirigida a Brasil/EE. UU. si no se atienden esos mercados ni se explica precio, envío, moneda y soporte.
5. Terminar perfiles locales oficiales de Medellín y Caucasia y alinear datos de sede, horarios y página. Añadir detalles Schema solo cuando estén confirmados.
6. Auditar las imágenes de referencia; sustituir las más importantes por material real de equipo/taller y describir el medio con ALT exacto.

**Resultado esperado:** más búsquedas cualificadas por zona, aplicación, modelo y referencia; menos dudas antes del contacto. **Indicadores:** impresiones/clics por landing local/producto/guía, CTR, clics a CTA por página y porcentaje de leads que traen modelo/datos útiles.

### Optimización estratégica — 1 a 3 meses

1. Publicar guías propias sobre selección de bomba para socavón/tajo, lectura de placa, compatibilidad, cebado y mantenimiento, solo con revisión técnica. Añadir ejemplos de decisiones reales sin divulgar datos del cliente.
2. Crear páginas por motor/familia o aplicación si existe inventario/compatibilidad suficiente y cada página responde preguntas distintas. No abrir una URL por cada variación de palabra clave.
3. Publicar evidencia de taller y equipos entregados (fotos/video, condiciones de prueba, fecha, specs) con permiso y aclaración entre foto real/referencia.
4. Incorporar páginas reales por sede si cada una ofrece valor único para visitantes, consulta local y rutas.
5. Mantener catálogo, Schema, sitemap y traducciones sincronizados mediante verificación editorial recurrente al publicar/descontinuar un producto.

**Resultado esperado:** ganar visibilidad en consultas de evaluación y exact-match, y justificar la confianza en una compra de alto valor. **Indicadores:** nuevos queries no-branded en GSC, tráfico orgánico a guías/fichas, contactos atribuibles y ventas por modelo.

## H. Propuestas de optimización concretas

### H.1 Textos SEO listos para evaluar

**Inicio**

- Title actual → **Motobombas diésel para minería en Colombia \| JF Motores**
- Description actual → **Motobombas diésel probadas en taller, motores y repuestos compatibles para minería. Compara equipos y cotiza disponibilidad por WhatsApp.**
- H1 actual → “Que el agua no detenga tu mina.”
- H1 propuesto → **Motobombas diésel para que el agua no detenga tu mina**
- Justificación: conserva la idea de marca y deja explícita la categoría en el encabezado principal.

**Catálogo motobombas**

- Title actual → **Motobombas diésel para minería \| JF Motores Medellín**
- Description → **Compara motobombas diésel para agua, lodo y desagüe minero. Revisa potencia, caudal, cabeza y paso de sólidos en cada ficha; cotiza por WhatsApp.**
- H1 → **Motobombas diésel para minería**
- Agregar H2 “Equipos disponibles” y enlaces a la guía de selección. Mantener solo los datos que realmente estén cargados en cada ficha.

**Catálogo motores**

- Title → **Motores diésel para minería \| JF Motores Medellín**
- Description → **Consulta motores diésel nuevos y reconstruidos para minería. Compara modelo, potencia, estado y disponibilidad; pregunta por precio y envío en WhatsApp.**
- H1 → **Motores diésel para minería**
- Asegurar que “nuevo”/“reconstruido” esté en producto visible y Schema.

**Catálogo repuestos**

- Title → **Repuestos para motores diésel y motobombas \| JF Motores**
- Description → **Busca repuestos por referencia y compatibilidad con el modelo de tu motor o motobomba. Revisa disponibilidad y cotiza por WhatsApp; envío aparte.**
- H1 → **Repuestos para motores diésel y motobombas**
- Justificación: responde a una intención de compra común y explica cómo encontrar la pieza.

**Ficha JF-M25**

- Title propuesto → **Motobomba JF Jaguar 25 \| JF-M25, 25 HP \| JF Motores**
- Description propuesta → **Motobomba diésel JF Jaguar 25 para tajo abierto. 25 HP, caudal máximo 3.000 L/min, cabeza de 30 m y paso de sólidos de 50 mm. Cotiza por WhatsApp.**
- Descripción visible: mantener la aplicación y las especificaciones en ficha, indicar “máximo” solo donde eso refleja el dato técnico y mantener el aviso de envío.
- Justificación: utiliza datos que ya aparecen en la ficha; no afirma envío, garantía o rendimiento adicional.

**Categoría radiador**

- Title a evaluar → **Radiadores para motores diésel \| Compatibilidad y cotización \| JF Motores**
- Description, solo si la ficha está disponible → **Radiador de aluminio de 4 filas y 9 L para motores JF-D25 y JF-D40T. Consulta disponibilidad y cotiza el envío por WhatsApp.**
- Si no hay productos disponibles, no afirmar existencia/compatibilidad como inventario actual; usar description genérica y noindex temporal.

**Guías**

- Title → **Guías para motobombas y motores diésel \| JF Motores**
- Description → **Aprende a elegir una motobomba, mantener un motor diésel y pedir el repuesto correcto. Guías prácticas y fuentes oficiales, con asesoría por WhatsApp.**
- Añadir enlaces internos desde cada guía a la categoría o ficha adecuada.

**Sedes**

- Title → **Sedes de JF Motores en Medellín y Caucasia \| Atención técnica**
- Description → **Encuentra direcciones, horarios y contacto de las sedes de JF Motores en Medellín y Caucasia. Consulta equipos y repuestos para minería.**
- Usar “atención técnica” solo para sedes que efectivamente prestan ese servicio.

### H.2 Plantilla de description por producto

Usar una plantilla controlada por campos y revisar cada salida:

> **{Nombre y referencia}. {Aplicación confirmada}. {Potencia/caudal/cabeza/paso de sólidos o compatibilidad más relevante}. {Estado y precio en COP si procede}. Cotiza disponibilidad y envío por WhatsApp.**

No forzar todos los atributos en cada ficha. Para repuestos, priorizar nombre, referencia, modelo compatible y dimensión que distinga la pieza. No incluir etiquetas como “imagen exacta”, garantía, certificación o stock si el dato no está confirmado.

### H.3 Propuesta de estructura de contenido para motobombas

1. H1 con tipo de equipo y uso minero.
2. Intro breve que distinga agua, lodo y escenarios validados.
3. Filtros disponibles y cómo interpretar las unidades.
4. Resultados con potencia, caudal máximo, cabeza, succión/descarga, paso de sólidos, motor y estado cuando existan datos.
5. Enlace a “Cómo elegir una motobomba” con una lista de parámetros a enviar.
6. CTA por ficha y CTA de asesoría general. No agregar fórmulas técnicas hasta validarlas con el taller.

### H.4 Recomendaciones de ALT

- Si la imagen es ilustrativa y efectivamente corresponde a la categoría: “Imagen de referencia del kit de pistón para motor JF-D25”. La etiqueta visual “Imagen de referencia” debe coincidir.
- Si es una foto real del componente: “Kit de pistón con anillos para JF-D25, diámetro 88 mm”, siempre que Ø88 esté confirmado.
- Si el producto visible es ventilador de ocho aspas y la foto lo representa: “Ventilador de ocho aspas, diámetro 450 mm”.
- Si no se puede confirmar número de aspas/medida, dejar fuera ese detalle del ALT hasta que se verifique.

### H.5 Datos estructurados y controles

- Mantener Product/Offer para fichas individuales y BreadcrumbList; el marcado actual aporta SKU, precio, moneda, disponibilidad e imagen.
- Seleccionar itemCondition de los datos reales. El motor reconstruido no puede llevar NewCondition; Schema.org ofrece RefurbishedCondition, pero confirmar la condición comercial exacta con el negocio. [Google admite condición como parte del Product Offer y no garantiza por sí solo una mejora de resultados](https://developers.google.com/search/docs/appearance/structured-data/product-snippet).
- No añadir reseñas, aggregateRating, envío gratuito, garantía o devoluciones estructuradas si no existen datos públicos verificables.
- Mantener LocalBusiness de cada sede y añadir horario/geo/mapa solo cuando sea preciso. Usar el nombre, dirección y teléfono idénticos a las páginas y perfiles oficiales.
- Rich results son elegibilidad, no garantía de mostrar un resultado enriquecido.

## I. Indicadores de seguimiento

| Fuente | Métricas | Decisión que habilitan |
|---|---|---|
| Google Search Console | Indexación y canonical elegida; páginas excluidas; sitemap leído; impresiones, clics, CTR y posición media por consulta/página/país/dispositivo. Separar marca vs no-marca. | Detectar si el dominio y las fichas aparecen, qué intención ya trae impresiones y qué snippets necesitan trabajo. |
| GA4/analítica configurada | Landing orgánica, sesiones por categoría/idioma, eventos de clic WhatsApp, producto y ubicación de CTA. | Ver qué página inicia la cotización, no solo cuánto tráfico llega. |
| Leads/CRM | Consultas con fuente/UTM, producto/ref, asesor, estado, cotización y venta. | Medir calidad de lead y retorno orgánico por catálogo/modelo, cuando exista atribución suficiente. |
| Rendimiento | CWV de campo y pruebas móviles de inicio, catálogo y ficha; LCP/INP/CLS, bytes de imágenes y recursos 3D. | Priorizar carga 3D/imagen si la experiencia móvil afecta lectura y CTA. |
| Perfil de Empresa de Google | Vistas/clics a sitio, llamadas, rutas y acciones por sede (si cada perfil oficial está activo). | Medir demanda local y coherencia de ubicación/contacto. |

**Embudo principal recomendado:** impresión orgánica → clic → visita a producto/categoría → clic en WhatsApp → lead registrado → lead calificado → cotización → venta. El objetivo principal debe ser la cantidad y calidad de cotizaciones atribuibles, no el aumento indiscriminado de sesiones.

No hay datos numéricos actuales disponibles en este informe para tráfico, posición, conversión, backlinks, volumen de búsquedas o CWV. No se han inventado ni estimado esas métricas.

## J. Conclusión estratégica

La oferta está definida, las fichas tienen una base de información técnica útil y el cierre por WhatsApp está integrado en el recorrido. El primer obstáculo no es la falta de “más texto”: es la falta de medición orgánica y de consistencia completa entre página, snippet, imágenes y datos estructurados. A eso se suman URLs de piezas que pueden quedar vacías, y una promesa multimoneda que no coincide con el formateo COP identificado en el código.

El mayor valor a corto plazo está en: verificar indexación con Search Console; corregir condiciones y especificaciones publicadas; mejorar descriptions por producto; decidir qué categorías de pieza deben indexarse; retirar promesas de moneda que no se cumplen; y seguir cada clic de búsqueda hasta el lead y la venta. Después, con datos de consultas, expandir guías y páginas locales/modelo únicamente donde exista una respuesta real y diferenciada.

## Fuentes y método

- Revisé las páginas publicadas y los endpoints anteriores el 10 de noviembre de 2026. La página principal, catálogos, ficha y páginas de soporte se leyeron en navegador; sitemap y robots se consultaron directamente.
- Contraste de implementación: docs/01_REQUISITOS.md, docs/02_ARQUITECTURA.md, docs/05_PLAN_OPERACION.md, src/features/catalog/ProductDetail.tsx, src/features/catalog/shared.ts, src/features/catalog/CatalogListing.tsx, src/app/sitemap.ts, src/app/robots.ts, src/i18n/page-metadata.ts, diccionarios ES/EN/PT y páginas bajo src/app/[lang]/.
- Búsquedas web exploratorias para marca y categorías de producto/mercado; no se usó herramienta de volúmenes ni se confirmó ubicación precisa de la SERP.
- Fuentes técnicas primarias: [titles](https://developers.google.com/search/docs/appearance/title-link), [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [imágenes](https://developers.google.com/search/docs/appearance/google-images), [Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product), [páginas localizadas/hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions), [Schema.org RefurbishedCondition](https://schema.org/RefurbishedCondition).
- No se accedió a Google Search Console, GA4/Meta, perfiles locales, CRM, herramienta de keywords, Lighthouse/PageSpeed, datos de campo ni crawl de todas las URLs. No se verificó comportamiento con login ni se comprobó manualmente cada versión EN/PT en producción.
