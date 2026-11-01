from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
import sys
out = sys.argv[1]
B = "https://jfmotores.altalcurnia.com"
ss = getSampleStyleSheet()
H1 = ParagraphStyle("h1", parent=ss["Heading1"], fontSize=18, spaceAfter=6)
H2 = ParagraphStyle("h2", parent=ss["Heading2"], fontSize=13.5, spaceBefore=12, spaceAfter=4, textColor=colors.HexColor("#111111"))
H3 = ParagraphStyle("h3", parent=ss["Heading3"], fontSize=11, spaceBefore=8, spaceAfter=2)
P = ParagraphStyle("p", parent=ss["BodyText"], fontSize=9.6, leading=13.4)
LI = ParagraphStyle("li", parent=P, leftIndent=12, bulletIndent=2)
W = ParagraphStyle("w", parent=P, textColor=colors.HexColor("#8a5a00"))
TC = ParagraphStyle("tc", parent=P, fontSize=8.4, leading=10.6)
TU = ParagraphStyle("tu", parent=P, fontSize=7.3, leading=9.4, textColor=colors.HexColor("#1a4fd6"))
doc = SimpleDocTemplate(out, pagesize=A4, leftMargin=1.9*cm, rightMargin=1.9*cm, topMargin=1.7*cm, bottomMargin=1.7*cm,
                        title="JF Motores - Base de conocimiento", author="JF Motores")
s = []
def h1(t): s.append(Paragraph(t, H1))
def h2(t): s.append(Paragraph(t, H2))
def h3(t): s.append(Paragraph(t, H3))
def p(t): s.append(Paragraph(t, P))
def ul(items):
    for i in items: s.append(Paragraph(i, LI, bulletText="•"))
def L(path, text=None):
    url = B + path
    return f'<link href="{url}" color="#1a4fd6">{text or url}</link> ({url})' if text else f'<link href="{url}" color="#1a4fd6">{url}</link>'
def table(rows, widths, head=True):
    data = [[Paragraph(str(c), TU if str(c).startswith("http") else TC) for c in r] for r in rows]
    t = Table(data, colWidths=widths, repeatRows=1 if head else 0)
    st = [("GRID",(0,0),(-1,-1),0.4,colors.grey),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),4),("RIGHTPADDING",(0,0),(-1,-1),4)]
    if head: st.append(("BACKGROUND",(0,0),(-1,0),colors.HexColor("#f7c600")))
    t.setStyle(TableStyle(st)); s.append(t); s.append(Spacer(1,6))

h1("JF Motores — Base de conocimiento")
p("Documento oficial de JF Motores para el asesor virtual de la página y para el equipo comercial. Versión de noviembre de 2026.")
p("Los productos, precios, estado (disponible o vendido), garantías y compatibilidades se consultan siempre en el catálogo en vivo de la página, que se actualiza desde el panel de administración. La orientación técnica de este documento es general: la selección final de un equipo y cualquier diagnóstico los confirma un técnico de JF Motores, y en datos de una marca prevalece el manual oficial del fabricante.")

h2("0. Cómo debe responder el asesor virtual")
ul([
 "Fuentes válidas, en este orden: (1) el catálogo en vivo de la página; (2) este documento y los demás documentos oficiales de JF Motores; (3) los sitios web oficiales de los fabricantes de motores, bombas y repuestos. Nunca foros, blogs, videos, tiendas ni distribuidores.",
 "Responder corto, claro y en el idioma del cliente, con el tono de la marca: «Tranquilidad y confianza».",
 "Compartir el enlace exacto de la ficha o de la página que responde la pregunta (sección 2).",
 "Para recomendar un equipo, pedir primero los datos que falten: caudal, altura total, altitud, tipo de agua y horas de trabajo (sección 6).",
 "Pasar la conversación a un asesor humano cuando el cliente quiere comprar, cotizar formalmente, pagar o pedir envío o factura; cuando hay un reclamo, una garantía, una falla concreta o un riesgo de seguridad; y cuando algo no cuadra entre las fuentes.",
 "Nunca inventar precios, plazos, descuentos, garantías ni especificaciones.",
])

h2("1. Quiénes somos")
p("JF Motores es una empresa de Medellín, Colombia, que vende y mantiene motobombas diésel, motores diésel y repuestos para minería: desagüe de socavones, tajo abierto, bocaminas, recirculación de agua y manejo de agua con sólidos. Atendemos clientes de todo el país y del exterior; la mayoría llega por recomendación de otros mineros.")
p("Lema: «Tranquilidad y confianza». Tranquilidad: equipos que se prueban en el taller antes de salir. Confianza: repuestos con compatibilidad clara, el equipo registrado a nombre del cliente y una línea directa que responde.")
p("Canales: WhatsApp y línea directa +57 312 2110262 (es el canal para cotizar y comprar), correo de soporte publicado en la sección Contacto del sitio, y el chat con IA de la página para dudas rápidas a cualquier hora. Sede principal: Medellín, Cra. 52 # 12-40. Las sedes vigentes y sus direcciones se publican en " + L("/es#contacto", "Contacto") + ".")

h2("2. Mapa del sitio (enlaces)")
p("El sitio está en español, inglés y portugués: cambiando /es por /en o /pt en cualquier enlace se abre la misma página en ese idioma.")
table([
 ["Página", "Para qué sirve", "Enlace"],
 ["Inicio", "Presentación, recorrido 3D del motor (arranque, plena carga, despiece interactivo), beneficios, catálogo y contacto", B+"/es"],
 ["Catálogo completo", "Motobombas, motores y repuestos juntos, con filtros por estado, categoría, compatibilidad y orden", B+"/es/catalogo"],
 ["Motobombas", "Equipos completos: motor diésel acoplado a bomba", B+"/es/motobombas"],
 ["Motores", "Motores diésel nuevos y reconstruidos", B+"/es/motores"],
 ["Repuestos", "Todas las piezas, con compatibilidad por motor y motobomba", B+"/es/repuestos"],
 ["Repuestos compatibles con un equipo", "Desde la ficha de un equipo o desde Mi cuenta (botón Solicitar repuesto) se filtran solo las piezas que le sirven", "Se abre desde la ficha o desde Mi cuenta"],
 ["Soporte", "Soporte técnico por WhatsApp, pedir repuestos, preguntas frecuentes", B+"/es/soporte"],
 ["Preguntas frecuentes", "Envío, fotos de referencia, compatibilidad, cuenta", B+"/es/soporte#faq"],
 ["Guías", "Cómo elegir una motobomba, mantenimiento básico, cómo pedir el repuesto correcto", B+"/es/guias"],
 ["Guía: elegir motobomba", "Paso a paso para definir caudal, altura y tipo de fluido", B+"/es/guias#elegir-motobomba"],
 ["Guía: mantenimiento", "Rutina básica de un motor diésel", B+"/es/guias#mantenimiento"],
 ["Guía: pedir repuesto", "Qué fotos y datos enviar", B+"/es/guias#pedir-repuesto"],
 ["Mi cuenta", "Equipos comprados, garantía, guía de uso, pedir repuestos", B+"/es/cuenta"],
 ["Crear cuenta", "Registro con correo o con Google", B+"/es/cuenta/registro"],
 ["Entrar", "Iniciar sesión", B+"/es/cuenta/entrar"],
 ["JF Monitor (app, próximamente)", "Monitoreo remoto en desarrollo: planes y funciones previstas", B+"/es/app"],
 ["Lista de espera de JF Monitor", "Anotarse para saber cuándo esté disponible (requiere cuenta)", B+"/es/app/registro"],
 ["Política de datos", "Tratamiento de datos personales (Ley 1581 de 2012)", B+"/es/legal/privacidad"],
 ["Contacto", "Sedes, líneas directas y correo", B+"/es#contacto"],
], [3*cm, 5.9*cm, 8.3*cm])
h3("Repuestos por pieza")
parts = [("radiador","Radiador","Enfría el refrigerante del motor"),("culata","Culata","Cierra los cilindros; aloja válvulas e inyectores"),("pistones","Pistones","Transmiten la fuerza de la combustión al cigüeñal"),("camisas","Camisas","Cilindros por donde se desplazan los pistones"),("bloque","Bloque","Estructura principal del motor"),("escape","Escape","Saca los gases; incluye silenciador"),("tanque","Tanque diésel","Almacena el combustible del equipo"),("ventilador","Ventilador","Mueve aire a través del radiador"),("volante","Volante","Masa que estabiliza el giro y transmite potencia"),("bomba","Bomba","Parte hidráulica: impulsor, carcasa, sello mecánico"),("tablero","Tablero","Instrumentos: horómetro, temperatura, presión de aceite, arranque"),("chasis","Chasis","Base o patín donde va montado el conjunto")]
table([["Pieza","Función","Enlace"]]+[[n,f,B+"/es/repuestos/"+k] for k,n,f in parts],[2.4*cm,6.5*cm,8.3*cm])

h2("3. Cómo comprar")
ul([
 "<b>Cotizar:</b> desde cualquier ficha con el botón de WhatsApp; el mensaje ya incluye el producto y la referencia. Para cotizar no se necesita cuenta.",
 "<b>Comprar:</b> se coordina con el asesor por WhatsApp o en persona. La página no tiene pagos en línea: forma de pago, anticipo, factura y fecha de entrega se acuerdan con el asesor.",
 "<b>Cuenta obligatoria para registrar la compra:</b> toda venta se registra a nombre de una cuenta del sitio. Si el cliente no tiene cuenta, la crea en " + L("/es/cuenta/registro", "Crear cuenta") + " (con correo o Google) antes de que se registre la venta.",
 "<b>Después de registrar la venta:</b> el cliente recibe un correo de confirmación y el equipo aparece en " + L("/es/cuenta", "Mi cuenta") + " con número de serie, fecha de compra, estado de la garantía (si aplica), la guía de uso en PDF cuando exista y el botón para pedir repuestos compatibles.",
 "<b>Precio y envío:</b> el precio publicado es el del equipo en pesos colombianos (COP). El envío no está incluido y se cotiza por WhatsApp según el destino. Para envíos fuera de Colombia, los trámites y costos de importación del país de destino corren por cuenta del comprador; el asesor orienta el proceso.",
 "<b>Estados en el catálogo:</b> Disponible o Vendido. Un equipo vendido sigue visible como referencia; se puede preguntar por uno igual.",
 "<b>Fotos:</b> si una foto dice «Imagen de referencia», muestra un equipo igual o similar. Las fotos del equipo exacto se piden por WhatsApp.",
])

h2("4. Garantía y derechos del cliente")
p("La garantía de cada producto (si la tiene y por cuántos meses) se informa en su ficha y queda registrada en Mi cuenta desde la fecha de compra. En Colombia, los productos nuevos tienen además la garantía legal del Estatuto del Consumidor (Ley 1480 de 2011). La garantía no cubre daños por mal uso, como hacer funcionar la bomba en seco, usar combustible contaminado o no hacer el mantenimiento indicado. Para hacer efectiva una garantía, el cliente escribe por WhatsApp con el número de serie, fotos o video de la falla y una descripción de lo que pasó.")

h2("5. Catálogo: cómo está organizado")
ul([
 "<b>Motobombas</b> (" + L("/es/motobombas") + "): equipos completos, motor diésel acoplado a una bomba centrífuga de superficie sobre chasis. Cada ficha indica potencia, diámetros de succión y descarga, caudal máximo, altura máxima, régimen, tipo de arranque, peso, precio, estado y garantía.",
 "<b>Motores</b> (" + L("/es/motores") + "): motores diésel nuevos y reconstruidos, con potencia, cilindros, régimen y refrigeración.",
 "<b>Repuestos</b> (" + L("/es/repuestos") + "): piezas por categoría (sección 2), cada una con la lista de motores y motobombas con los que es compatible.",
 "<b>Estados:</b> Disponible o Vendido. Un equipo vendido sigue visible como referencia y se puede preguntar por uno igual.",
 "<b>Lectura de especificaciones:</b> el caudal máximo y la altura máxima no se dan al mismo tiempo; a la altura máxima el caudal es cercano a cero. Para saber si un equipo sirve para un caudal a cierta altura se usa su curva, que confirma un asesor.",
 "<b>Precios:</b> en pesos colombianos (COP), por el equipo; el envío se cotiza aparte.",
])

h2("6. Asesoría: cómo elegir la motobomba correcta")
p("Una motobomba bien elegida trabaja cerca de su mejor punto, gasta menos combustible y dura más. Hacen falta tres datos: caudal, altura total y tipo de fluido; y conviene saber la altitud del sitio.")
h3("6.1 Caudal: cuánta agua hay que mover")
ul([
 "Conversiones: 1 m³/h = 16,67 L/min · 1 L/s = 60 L/min · 1 galón (EE. UU.) por minuto = 3,785 L/min.",
 "Si se conoce el volumen y el tiempo: caudal = volumen ÷ tiempo. Ejemplo: desaguar 300 m³ en 5 horas = 60 m³/h = 1 000 L/min.",
 "Si el agua entra continuamente (infiltración), la bomba debe superar ese aporte con margen; si no, el nivel no baja.",
 "Es práctica común elegir con un margen sobre el caudal calculado, porque las mangueras se ensucian y el equipo se desgasta.",
])
h3("6.2 Altura dinámica total (ADT)")
ul([
 "ADT = altura de succión (del nivel del agua al eje de la bomba) + altura de descarga (de la bomba al punto más alto de salida) + pérdidas por fricción en mangueras, tubos, codos y válvulas.",
 "Las pérdidas por fricción crecen con la longitud, con cada codo y, sobre todo, al usar mangueras más angostas que la boca de la bomba. Por eso se recomienda usar el diámetro completo de succión y descarga.",
 "Ejemplo orientativo: agua 4 m por debajo de la bomba, salida 30 m por encima, 200 m de manguera con varias curvas: la altura estática es 34 m y la fricción puede sumar varios metros más; el asesor la estima con el diámetro y el caudal.",
])
h3("6.3 Succión y altitud")
p("Una bomba de superficie no «chupa» el agua: la presión atmosférica la empuja hacia la bomba. Por eso hay un límite físico de succión, que baja con la altura sobre el nivel del mar. En la práctica se trabaja bastante por debajo del límite teórico (por pérdidas, temperatura del agua y NPSH de la bomba); suele recomendarse no pasar de 4 a 7 m de succión, y menos en altura.")
table([["Altitud (m s. n. m.)","Presión atmosférica aprox.","Límite teórico de succión (m de agua)"],["0","101 kPa","10,3"],["1 000","90 kPa","9,2"],["2 000","80 kPa","8,1"],["3 000","70 kPa","7,2"],["4 000","62 kPa","6,3"]],[4.5*cm,5*cm,7*cm])
ul([
 "Instalar la bomba lo más cerca posible del agua y con la manguera de succión corta, recta y sin reducciones.",
 "Usar canastilla (coladera) en la punta de succión para impedir que entren piedras; revisarla y limpiarla seguido.",
 "Cebado: si la bomba no es autocebante, hay que llenarla de agua antes de arrancar; una válvula de pie ayuda a mantenerla cebada.",
 "Cavitación: si la succión es excesiva o está obstruida, se forman burbujas que hacen ruido de grava, vibración y pérdida de caudal, y desgastan el impulsor. Se corrige bajando la bomba, acortando la succión o limpiando la canastilla.",
])
h3("6.4 Tipo de fluido")
ul([
 "Agua limpia o poco turbia: bomba centrífuga convencional.",
 "Agua con arena, piedra pequeña o lodo: bomba para sólidos, con impulsor abierto o semiabierto y materiales resistentes a la abrasión. El tamaño máximo de sólido que deja pasar lo indica el fabricante.",
 "Lodos espesos o pulpa: bomba de lodos especializada; consultar siempre con un asesor.",
 "Agua ácida de mina: puede corroer piezas metálicas; avisar al asesor para revisar materiales.",
])
h3("6.5 Motor diésel y altitud")
p("Los motores diésel de aspiración natural pierden potencia con la altura porque el aire tiene menos oxígeno. Como referencia general, muchos fabricantes indican una pérdida del orden de 3 % a 4 % por cada 300 m por encima de unos 1 000 m s. n. m.; el valor exacto depende de cada motor. Los motores con turbo pierden menos. Para trabajar en alta montaña conviene elegir un motor con margen de potencia o turboalimentado.")
h3("6.6 Datos para pedir una recomendación por WhatsApp")
ul(["Caudal deseado o volumen y tiempo de desagüe.","Altura de succión y de descarga, y longitud aproximada de la manguera.","Diámetro de las mangueras que ya tiene.","Tipo de agua (limpia, con arena, lodo, ácida).","Altitud del sitio y si el equipo trabaja en superficie, bocamina o dentro del socavón.","Horas de trabajo por día."])

h2("7. Instalación y operación segura")
ul([
 "<b>Gases de escape:</b> el escape de un motor diésel produce monóxido de carbono, un gas invisible y mortal. No hacer funcionar el motor en espacios cerrados o mal ventilados. Dentro de un socavón, el equipo solo debe operar con ventilación adecuada y según el reglamento de seguridad minera subterránea (Decreto 1886 de 2015).",
 "<b>Ubicación:</b> base firme y nivelada, protegida de inundación y lluvia directa, con espacio para que el radiador reciba aire fresco y el escape salga lejos de las personas.",
 "<b>Combustible:</b> repostar con el motor apagado y frío; no fumar cerca; guardar el diésel en recipientes limpios, tapados y lejos del calor.",
 "<b>Partes en movimiento:</b> mantener puestas las guardas del ventilador, el volante y las correas; no acercar ropa suelta ni manos con el equipo encendido.",
 "<b>Elementos de protección:</b> protección auditiva, gafas, guantes y calzado de seguridad.",
 "<b>Arranque:</b> revisar aceite, refrigerante y combustible; verificar que la bomba esté cebada y la descarga abierta; arrancar y dejar calentar unos minutos antes de exigirle plena carga.",
 "<b>Nunca en seco:</b> si la bomba gira sin agua se daña el sello mecánico en poco tiempo.",
 "<b>Apagado:</b> bajar la carga y dejar el motor unos minutos en ralentí antes de apagarlo, sobre todo si es turboalimentado.",
])

h2("8. Mantenimiento preventivo (orientativo)")
p("Los intervalos exactos los fija el manual de cada motor y bomba. Llevar el registro del horómetro y hacer el mantenimiento por horas de trabajo, no solo por fechas. En ambientes con mucho polvo o agua sucia, revisar con más frecuencia.")
table([
 ["Cuándo","Qué revisar o hacer"],
 ["Cada arranque (diario)","Nivel de aceite y refrigerante; fugas; filtro de aire (indicador o inspección); drenar agua del filtro separador de combustible; canastilla de succión; mangueras y abrazaderas; ruidos o vibraciones extrañas"],
 ["Semanal","Limpiar aletas del radiador; tensión y estado de correas; apriete de pernos de base y acople; estado del sello mecánico (goteo)"],
 ["Según el manual (por horas)","Cambio de aceite y filtro de aceite; filtros de combustible; filtro de aire; revisión de inyectores y calibración de válvulas; cambio de refrigerante"],
 ["Si el equipo va a quedar parado","Limpiar la bomba con agua limpia, drenarla si hay riesgo de sedimento, proteger de la humedad y arrancar periódicamente"],
],[4*cm,13.2*cm])

h2("9. Diagnóstico rápido de fallas")
p("Orientación general para identificar la causa probable. Ante cualquier duda, detener el equipo y escribir a soporte técnico con modelo, número de serie, fotos o video.")
table([
 ["Síntoma","Causas probables","Qué hacer"],
 ["La bomba no saca agua","Falta de cebado; entrada de aire por la succión; canastilla tapada; succión demasiado alta","Cebar; revisar empaques y abrazaderas de succión; limpiar canastilla; bajar la bomba"],
 ["Poco caudal","Impulsor desgastado u obstruido; manguera angosta o doblada; rpm bajas; altura mayor a la prevista","Revisar impulsor; usar diámetro completo; verificar acelerador; recalcular altura"],
 ["Ruido de grava y vibración","Cavitación; piedras en el impulsor; rodamientos gastados; base floja","Reducir succión; limpiar; revisar rodamientos y apriete de la base"],
 ["Goteo en la bomba","Sello mecánico gastado, a menudo por funcionar en seco o con arena","Cambiar el sello; evitar funcionar en seco"],
 ["Sobrecalentamiento","Radiador sucio; correa floja; poco refrigerante; termostato; exceso de carga","Detener y dejar enfriar; limpiar radiador; revisar correa y nivel; no abrir el radiador en caliente"],
 ["Humo negro","Exceso de combustible para el aire: filtro de aire tapado, sobrecarga, inyectores o altitud","Limpiar o cambiar filtro de aire; bajar carga; revisar inyectores"],
 ["Humo blanco","Combustible sin quemar en frío, agua en el combustible o refrigerante entrando al cilindro","Drenar el separador de agua; si persiste, revisar empaque de culata"],
 ["Humo azul","El motor quema aceite: anillos, camisas o guías de válvula gastadas","Revisar consumo de aceite y programar diagnóstico"],
 ["No arranca","Batería descargada; sin combustible o aire en el sistema; filtros tapados","Cargar batería; purgar el sistema de combustible; cambiar filtros"],
 ["Pierde fuerza en altura","Menos oxígeno en el aire (ver 6.5)","Evaluar motor con turbo o con más margen de potencia"],
],[3.4*cm,6.9*cm,6.9*cm])

h2("10. Cuenta y privacidad")
ul([
 "La cuenta se crea con correo y contraseña o con Google; con Google no hace falta contraseña. El teléfono es opcional.",
 "En la cuenta el cliente ve sus equipos, su garantía, la guía de uso y puede pedir repuestos compatibles.",
 "Los datos personales se tratan según la política de datos: " + L("/es/legal/privacidad") + ". El cliente puede pedir consultar, corregir o borrar sus datos por los canales de contacto.",
 "El chat con IA no guarda las conversaciones. No se deben escribir datos personales en el chat.",
])

h2("11. JF Monitor (app de monitoreo, aún no disponible)")
p("JF Monitor es una app en desarrollo para ver el estado de la motobomba en tiempo real, recibir alertas y controlarla a distancia. Todavía no está disponible: las funciones y la fecha pueden cambiar. Quien quiera enterarse del lanzamiento puede anotarse en " + L("/es/app/registro", "la lista de espera") + " (requiere cuenta). Información: " + L("/es/app") + ".")
table([
 ["Plan previsto","Incluye","Requisitos"],
 ["Esencial (telemetría)","Horas de trabajo, temperatura, presión y caudal; alertas al celular; ubicación e historial por turno; recordatorios de mantenimiento por horómetro","Conexión celular; satelital opcional"],
 ["Visión (cámara en vivo)","Todo lo de Esencial + cámara industrial a prueba de agua y polvo, video en vivo a 30 cuadros por segundo, control remoto (encender, apagar, ajustar velocidad), grabación en el equipo, clip con cada alerta, visión nocturna","Buena señal 4G o antena satelital"],
 ["Visión Pro (24/7)","Todo lo de Visión + video y grabación en la nube 24 h, varias cámaras incluida una térmica, cámaras con IA que detectan humo, fugas, chispas o personas, asistencia de un técnico de JF viendo el mismo video","Conexión satelital ilimitada y energía permanente"],
],[3.4*cm,9.6*cm,4.2*cm])
p("Extras previstos: alarmas por WhatsApp, conexión satelital para sitios sin señal y datos avanzados con reportes. Los precios de los planes aún no están definidos. Las cámaras están pensadas para equipos en superficie; dentro del socavón se estudia cada caso.")

h2("12. Preguntas frecuentes")
faq = [
 ("¿El precio incluye el envío?","No. El envío se cotiza aparte por WhatsApp según el destino."),
 ("¿Puedo pagar en la página?","No. La compra y el pago se coordinan con un asesor por WhatsApp o en persona."),
 ("¿Necesito cuenta para cotizar?","No. Para registrar una compra sí, porque el equipo queda a nombre del cliente."),
 ("¿Venden fuera de Colombia?","Sí se atienden clientes del exterior; el asesor cotiza el envío y orienta los trámites de importación del país de destino."),
 ("¿Las fotos son del equipo exacto?","Si dicen «Imagen de referencia», muestran un equipo igual o similar. Fotos del equipo exacto se piden por WhatsApp."),
 ("¿Cómo sé si un repuesto le sirve a mi motor?","Cada repuesto indica su compatibilidad; también se puede filtrar el catálogo por motor. Si hay duda, enviar foto de la placa del motor."),
 ("¿Tienen motores reconstruidos?","Cuando hay motores reconstruidos, se publican como «reconstruido» en el catálogo de motores; la disponibilidad está en el catálogo en vivo."),
 ("¿Qué motobomba necesito?","Depende del caudal, la altura total, el tipo de agua y la altitud (sección 6). Con esos datos un asesor recomienda el equipo."),
 ("¿Puedo usar la motobomba dentro del socavón?","Solo con ventilación adecuada para los gases de escape y cumpliendo el reglamento de seguridad minera; consultar el caso con un asesor."),
 ("¿Dónde veo la garantía de mi equipo?","En Mi cuenta, en la ficha del equipo comprado."),
 ("¿Dónde está la guía de uso?","En Mi cuenta, si el producto tiene guía en PDF; algunas guías también son públicas en la ficha."),
 ("¿Cuándo sale JF Monitor?","Aún no tiene fecha. Se puede anotar en la lista de espera."),
 ("¿Hacen mantenimiento?","Sí. Para programar un mantenimiento o una revisión, escribir por WhatsApp con modelo, serie y descripción del problema."),
]
table([["Pregunta","Respuesta"]]+[[q,a] for q,a in faq],[5.6*cm,11.6*cm])

h2("13. Glosario")
table([["Término","Significado"],
 ["Caudal","Volumen de agua por unidad de tiempo (L/min, m³/h)."],
 ["ADT","Altura dinámica total: altura que la bomba debe vencer, sumando succión, descarga y fricción."],
 ["Cebado","Llenar de agua la bomba y la succión antes de arrancar."],
 ["Cavitación","Formación de burbujas por baja presión en la succión; desgasta el impulsor."],
 ["NPSH","Carga neta positiva de succión: margen de presión que la bomba necesita para no cavitar."],
 ["Impulsor","Rueda con álabes que gira dentro de la bomba e impulsa el agua."],
 ["Sello mecánico","Pieza que impide que el agua salga por el eje de la bomba."],
 ["Horómetro","Contador de horas de trabajo del motor; guía el mantenimiento."],
 ["Turboalimentado","Motor con turbo que comprime el aire de admisión; pierde menos potencia en altura."],
 ["Bocamina","Entrada de la mina subterránea."],
],[3.6*cm,13.6*cm])

h2("14. Cuándo pasar a un asesor humano")
ul(["Cotización formal, reserva, compra o fecha de entrega.","Envío, importación, formas de pago y factura.","Garantías y reclamos.","Diagnóstico de una falla concreta o mantenimiento.","Recomendación final de un equipo para un sitio específico.","Cualquier dato que no esté en el catálogo, en los documentos de JF Motores ni en una fuente oficial del fabricante.","Cuando algo no cuadra: precios o especificaciones que parecen errados, o datos que no coinciden entre fuentes."])
p("WhatsApp y línea directa: +57 312 2110262.")
doc.build(s)
print("ok")
