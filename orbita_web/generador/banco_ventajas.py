# -*- coding: utf-8 -*-
# Banco «ventajas» de Orbita · PM Tool (v279ao) — 10 ventajas × 3 formulaciones = 30 mensajes.
# El mensaje: las normas y los procesos en un solo portal. Y lo que eso te da.
#
# Cada mensaje: (código, tag, titular, remate naranja, subtítulo, cuerpo LinkedIn empresa, cuerpo LinkedIn Alejandro)
# El subtítulo va en la imagen y en Instagram. Los cuerpos son de 2-3 frases: LinkedIn admite contexto.

CLAIM = "Las normas y los procesos en un solo portal."
HASH_BASE = "#OrbitaPMTool #SistemasDeGestión #TuConsultor"
CTA_EMPRESA = [
    "Orbita · PM Tool, el portal de gestión de TuConsultor.",
    "Pide una demo de Orbita · PM Tool.",
    "Así trabajamos ahora con nuestros clientes.",
]
CTA_YO = [
    "Si quieres verlo con tu sistema, escríbeme.",
    "Te lo enseño en 20 minutos con un proyecto real.",
    "Si te suena, hablamos.",
]
CTA_IG = [
    "Orbita · PM Tool, el portal de gestión de TuConsultor.",
    "Pide una demo: enlace en bio.",
    "Un portal. Todo dentro.",
]

VENTAJAS = {
 "V01": ("PORTAL ÚNICO", "#PortalÚnico #ISO9001"),
 "V02": ("NO DEPENDE DE UNA PERSONA", "#Continuidad #Equipo"),
 "V03": ("SIEMPRE ATENDIDO", "#Consultoría #Acompañamiento"),
 "V04": ("GESTIÓN DEL LEGADO", "#Legado #Conocimiento"),
 "V05": ("SEGURIDAD DE LA INFORMACIÓN", "#ISO27001 #Seguridad"),
 "V06": ("RESPUESTAS INMEDIATAS", "#IA #Consultoría"),
 "V07": ("DASHBOARD DE INDICADORES", "#Dashboard #Dirección"),
 "V08": ("DOCUMENTACIÓN 24/7", "#Documentación #Auditoría"),
 "V09": ("RESPUESTA 24/7", "#Soporte #Disponibilidad"),
 "V10": ("HIPERACCESIBLE", "#Accesibilidad #Móvil"),
}

# código = ventaja + letra de formulación (A, B, C). Orden de calendario: V01A, V02A … V10A, V01B …
BANCO = [
 # ── V01 · Las normas y los procesos en un solo portal ──
 ("V01A", "V01", "Las normas y los procesos", "en un solo portal.", "ISO, procesos, tareas, evidencias y equipo. Un sitio. Orbita · PM Tool.",
  "La calidad en un Excel, los proyectos en otro, los procedimientos en una carpeta y el consultor por correo. Así no se gestiona: se sobrevive. Orbita junta las normas y los procesos en un solo portal, con el consultor y el cliente dentro.",
  "Llevo veinte años viendo sistemas de gestión repartidos en carpetas, correos y cabezas. Por eso construimos Orbita: un solo portal donde están las normas, los procesos, las tareas y las evidencias. Ahora trabajo así con todos mis clientes."),
 ("V01B", "V01", "Un portal.", "Todas tus normas, todos tus procesos.", "9001, 14001, 27001, 45001… y los procesos que las sostienen. Juntos.",
  "Cada norma que añades no puede ser otra carpeta y otro responsable. En Orbita las normas comparten procesos, tareas y evidencias: una integración de verdad, no una pestaña más.",
  "Cuando una empresa suma su segunda norma, lo normal es que duplique papeles. En Orbita no: las normas comparten los mismos procesos y las mismas evidencias. Menos trabajo, más control. Es lo que llevo años defendiendo."),
 ("V01C", "V01", "Lo que no está en el portal,", "no existe.", "Y eso es exactamente lo que quieres: una sola versión, la vigente.",
  "La versión buena del procedimiento está en el portátil de alguien. En Orbita hay una versión: la vigente, con su historial. Tu equipo, tu consultor y tu auditor miran la misma pantalla.",
  "Mi regla con los clientes es sencilla: lo que no está en Orbita no existe. Suena duro y es lo que más tranquilidad da. Una versión, la vigente, y todos mirando lo mismo."),
 # ── V02 · No depende de una persona ──
 ("V02A", "V02", "Tu sistema de gestión", "no depende de una persona.", "Si el responsable de calidad se va, el sistema se queda.",
  "El sistema ISO de muchas empresas vive en la cabeza de una persona. Cuando esa persona se va, se va el sistema. En Orbita, procesos, tareas, evidencias e historial están en el portal: quien llegue continúa donde lo dejó el anterior.",
  "He visto sistemas de calidad desaparecer con una baja o un cambio de puesto. Con Orbita eso no pasa: el sistema está en el portal, no en una persona. Es la diferencia entre tener un sistema y tener a alguien que se lo sabe."),
 ("V02B", "V02", "Vacaciones, bajas, cambios.", "El sistema sigue.", "Tareas con dueño, plazos y sustituto. Nada se para.",
  "En Orbita cada tarea tiene responsable, plazo y evidencia. Si alguien falta, se reasigna y sigue. La auditoría no espera a que vuelva nadie de vacaciones, y tu sistema tampoco.",
  "Agosto es la prueba de fuego de un sistema de gestión. En Orbita, las tareas del sistema tienen dueño y sustituto, y el consultor las ve. Cuando vuelve el equipo, no hay que reconstruir nada."),
 ("V02C", "V02", "El conocimiento del sistema", "es de la empresa.", "No del consultor. No del responsable. De la organización.",
  "Cuando el sistema está en Orbita, el conocimiento se queda en la empresa: qué se hizo, por qué, con qué evidencia. Cambie quien cambie, el hilo no se rompe.",
  "Como consultor, mi trabajo es que el cliente no me necesite para saber cómo funciona su sistema. Orbita lo hace posible: todo lo que hacemos juntos queda en su portal, no en mis notas."),
 # ── V03 · Siempre atendido ──
 ("V03A", "V03", "Siempre atendido.", "No una visita al mes.", "Tu consultor dentro del portal, cada semana, no solo antes de la auditoría.",
  "La consultoría clásica es una visita mensual y un correo cuando hay prisa. En Orbita el consultor está dentro del portal: ve las tareas, contesta las dudas y programa el trabajo semana a semana. Acompañamiento de verdad, no presencia.",
  "Ya no trabajo a golpe de visita mensual. Estoy dentro del portal de cada cliente, veo lo que avanza y lo que se atasca, y actúo antes de que sea un problema. Siempre atendido no es un eslogan: es el modelo."),
 ("V03B", "V03", "Cada tarea del sistema", "tiene a alguien detrás.", "Consultor asignado, agenda compartida y seguimiento en el portal.",
  "En Orbita cada proyecto tiene su consultor y cada tarea su sesión programada. El cliente ve quién viene, cuándo y a qué. Sin perseguir a nadie por correo.",
  "Lo que más agradecen mis clientes de Orbita no es la tecnología: es saber quién de mi equipo se ocupa de cada cosa y cuándo. Eso es estar atendido."),
 ("V03C", "V03", "Relación, Implicación", "o Compromiso.", "Tres modelos de acompañamiento. Tú eliges cuánto nos metemos.",
  "No todas las empresas necesitan lo mismo. En Orbita trabajamos con tres modelos: Relación (te acompañamos), Implicación (lo hacemos contigo) y Compromiso (lo llevamos por ti). El portal es el mismo; cambia cuánto hacemos nosotros.",
  "Hay clientes que quieren que les acompañe y clientes que quieren que me ocupe. Por eso Orbita tiene tres modelos: Relación, Implicación y Compromiso. Elige el tuyo y el portal se adapta."),
 # ── V04 · Gestión del legado ──
 ("V04A", "V04", "Diez años de sistema", "en un solo hilo.", "Auditorías, no conformidades, cambios y decisiones. Con fecha y evidencia.",
  "Un sistema de gestión es su historia: qué falló, qué se decidió, qué se cambió. En Orbita ese legado está ordenado por proyecto y por proceso, con fecha, autor y evidencia. Nada se pierde entre versiones de carpeta.",
  "Lo primero que pide un auditor es el hilo: qué pasó el año pasado y qué hicisteis. En Orbita el hilo está entero, con fecha y evidencia. Es el legado del sistema, y es de la empresa."),
 ("V04B", "V04", "La no conformidad de 2024", "y lo que hiciste con ella.", "En el portal, a dos clics. No en un correo de hace dos años.",
  "En Orbita cada hallazgo lleva su análisis, su acción y su verificación de eficacia. Cuando el auditor pregunte por la no conformidad de hace dos años, la respuesta está en el portal, no en la memoria de nadie.",
  "Una no conformidad bien cerrada es la mejor prueba de que el sistema funciona. Con Orbita queda el ciclo completo: hallazgo, causa, acción y eficacia. Eso es gestionar el legado."),
 ("V04C", "V04", "Cambiar de consultor", "sin empezar de cero.", "El sistema, sus decisiones y sus evidencias siguen en tu portal.",
  "Con Orbita el sistema es tuyo: si cambia el consultor, el nuevo entra en el portal y continúa. Sin rehacer procedimientos, sin reconstruir el historial.",
  "Sé que suena raro viniendo de un consultor: con Orbita puedes cambiar de consultor sin perder nada. El sistema, con todo su historial, es de la empresa. Así debería ser siempre."),
 # ── V05 · Seguridad de la información ──
 ("V05A", "V05", "Tus procedimientos", "no viajan por WhatsApp.", "Accesos por rol, trazabilidad y datos en la Unión Europea.",
  "Un sistema de gestión maneja información sensible: auditorías, no conformidades, datos de personas. En Orbita cada usuario ve lo suyo, cada acceso queda registrado y los datos se alojan en la Unión Europea.",
  "Como consultor de ISO 27001 y ENS no podía ofrecer a mis clientes un portal que no cumpliera lo que yo exijo en las auditorías. Orbita tiene accesos por rol, registro de accesos y datos en la UE."),
 ("V05B", "V05", "Quién vio qué", "y cuándo.", "Registro de accesos y cambios. Lo que pide la ISO 27001 y el ENS.",
  "Orbita registra entradas, accesos y cambios en el sistema. Es lo que piden la ISO 27001 y el ENS, y lo que necesitas para saber que la documentación del sistema está bajo control.",
  "La trazabilidad no es un lujo: es un requisito. En Orbita sabemos quién entró, qué vio y qué cambió. Es la misma exigencia que aplico en cada implantación de 27001."),
 ("V05C", "V05", "Copias, cifrado y accesos", "que no dependen de nadie.", "Infraestructura profesional, no una carpeta compartida.",
  "La carpeta compartida no tiene copias de seguridad verificadas ni control de accesos real. Orbita corre sobre infraestructura profesional en la UE, con copias, cifrado en tránsito y en reposo y accesos por rol.",
  "Cada vez que veo un sistema de gestión en una carpeta compartida sin control de accesos, pienso en el día que alguien lo borre sin querer. Con Orbita ese día no llega."),
 # ── V06 · Respuestas inmediatas ──
 ("V06A", "V06", "Preguntas al sistema.", "Respuestas al momento.", "La documentación de tu ISO responde: qué dice el procedimiento, qué toca ahora.",
  "«¿Qué dice nuestro procedimiento de compras?» «¿Qué me toca antes de la auditoría?» En Orbita las respuestas salen de tu propia documentación, al instante, sin esperar al consultor ni buscar en carpetas.",
  "Mis clientes me hacían las mismas preguntas una y otra vez. Ahora se las hacen al portal y la respuesta sale de su propia documentación. Yo me quedo para lo que aporta valor."),
 ("V06B", "V06", "Sin esperar al correo", "del consultor.", "Dudas resueltas en el portal, con la referencia al procedimiento.",
  "Una duda del sistema no puede esperar tres días a que el consultor conteste el correo. En Orbita la respuesta es inmediata y cita el procedimiento: si hace falta más, el consultor entra en el mismo hilo.",
  "Odiaba ser el cuello de botella de mis clientes. Con Orbita las dudas del día a día se resuelven al momento y con referencia al procedimiento. Yo entro cuando hace falta criterio, no para buscar un párrafo."),
 ("V06C", "V06", "La auditoría empieza", "cuando tú quieras.", "Simula preguntas del auditor y comprueba las respuestas con tu documentación.",
  "Antes de la auditoría, pregunta al portal lo que preguntaría el auditor. Orbita responde con tu documentación y te dice dónde hay hueco. Llegas sabiendo qué van a encontrar.",
  "Preparar una auditoría era una semana de nervios. Con Orbita mis clientes se hacen las preguntas del auditor antes, con sus propios datos, y llegan tranquilos."),
 # ── V07 · Dashboard de indicadores ──
 ("V07A", "V07", "Tus indicadores,", "en tiempo real.", "Objetivos, no conformidades, tareas y auditorías en una pantalla.",
  "Un sistema de gestión sin indicadores a la vista es un archivo. En Orbita el dashboard muestra objetivos, no conformidades abiertas, tareas pendientes y próximas auditorías, actualizado según se trabaja.",
  "Ver es la mitad del control. En Orbita cada cliente tiene su dashboard: indicadores, tareas y auditorías en vivo. Y yo veo lo mismo, así que no hace falta preguntar."),
 ("V07B", "V07", "El comité de dirección", "sin preparar el Excel.", "Los datos de la revisión por la dirección ya están en el portal.",
  "La revisión por la dirección no debería empezar con dos semanas de recopilar datos. En Orbita los indicadores del sistema están siempre al día: la reunión es para decidir, no para reunir.",
  "La revisión por la dirección es el momento más útil del sistema y el peor preparado. Con Orbita los datos ya están; dedicamos la reunión a decidir. Eso cambia la conversación con la dirección."),
 ("V07C", "V07", "Un semáforo por proceso.", "Sin sorpresas.", "Qué va bien, qué se retrasa y qué necesita decisión. A un vistazo.",
  "En Orbita cada proceso y cada proyecto tienen su estado: al día, en riesgo o retrasado. La dirección ve el sistema completo de un vistazo y decide con datos, no con sensaciones.",
  "Un dashboard no es para mirar números: es para no llevarse sorpresas. En Orbita el semáforo por proceso avisa antes de que el problema llegue a la auditoría."),
 # ── V08 · Documentación 24/7 ──
 ("V08A", "V08", "La documentación del sistema,", "disponible 24/7.", "Procedimientos, registros y evidencias. A cualquier hora, desde cualquier sitio.",
  "El auditor llega a las 8 y el responsable está de viaje. Da igual: en Orbita la documentación del sistema está disponible las 24 horas, con la versión vigente y su historial. Sin pedir nada a nadie.",
  "La documentación del sistema no puede depender de que alguien esté en la oficina. En Orbita está siempre disponible, con la versión vigente. Es lo mínimo para un sistema que dice estar vivo."),
 ("V08B", "V08", "Un solo lugar", "para cada documento.", "Sin copias en el escritorio ni versiones en el correo.",
  "En Orbita cada documento tiene un lugar, un estado y un historial. La copia que alguien guardó en su escritorio deja de ser un riesgo porque nadie la necesita.",
  "La pregunta «¿cuál es la versión buena?» desaparece con Orbita. Hay una, está en el portal y se puede consultar a cualquier hora. Parece poco; cambia la auditoría entera."),
 ("V08C", "V08", "Evidencias con fecha,", "no capturas en el móvil.", "Cada registro en su proceso, con quién y cuándo. Listo para auditar.",
  "Las evidencias del sistema en Orbita cuelgan del proceso y de la tarea: quién, cuándo y qué. Cuando el auditor pide la prueba, está donde debe estar, no en el carrete de un teléfono.",
  "He visto auditorías salvadas con capturas de un móvil. Con Orbita las evidencias están en su sitio, con fecha y responsable. La diferencia entre aprobar y demostrar."),
 # ── V09 · Respuesta 24/7 ──
 ("V09A", "V09", "Respuesta 24/7.", "También un domingo.", "El portal contesta siempre; el consultor, en horario. Nunca te quedas sin respuesta.",
  "Las dudas no esperan al lunes. En Orbita el portal responde a cualquier hora con tu documentación y el consultor retoma en horario. Siempre hay respuesta; luego, si hace falta, criterio.",
  "No prometo estar disponible un domingo a las once. Prometo que mis clientes tendrán respuesta: el portal contesta con su documentación y yo retomo el lunes con criterio. Eso es 24/7 de verdad."),
 ("V09B", "V09", "Soporte dentro del portal.", "No un teléfono que nadie coge.", "Consulta, incidencia o petición: queda registrada y con seguimiento.",
  "En Orbita el soporte está dentro: cada consulta o incidencia queda registrada, con estado y responsable. Sabes que se ha recibido y sabes en qué punto está.",
  "El soporte a un cliente no puede ser un correo perdido. En Orbita cada petición tiene número, estado y responsable. Yo lo veo y el cliente también."),
 ("V09C", "V09", "Antes de la auditoría,", "a la hora que sea.", "El día previo no tiene horario. El portal tampoco.",
  "El día antes de la auditoría siempre surge algo. En Orbita el portal responde con tu documentación a cualquier hora y el equipo de TuConsultor está al tanto. Nadie llega solo a la auditoría.",
  "Sé que la víspera de una auditoría se trabaja hasta tarde. Por eso Orbita responde a cualquier hora con la documentación del cliente. Y yo llego a la auditoría sabiendo qué se ha consultado."),
 # ── V10 · Hiperaccesible ──
 ("V10A", "V10", "Desde el móvil,", "desde la planta, desde la auditoría.", "Orbita funciona donde estés. Sin instalar nada.",
  "Un sistema de gestión se usa donde pasa el trabajo: en planta, en obra, en la visita del auditor. Orbita es web, se abre en el móvil y no requiere instalación. Accesible para todo el equipo, no solo para calidad.",
  "Un sistema que solo se consulta desde el despacho de calidad no es un sistema. Orbita se abre en el móvil de quien está en planta. Ahí es donde el sistema se cumple o no."),
 ("V10B", "V10", "Para el equipo, el cliente", "y el auditor.", "Cada uno con su acceso y su vista. Todos en el mismo portal.",
  "Orbita es hiperaccesible porque no es solo para calidad: el equipo ve sus tareas, la dirección su dashboard, el consultor el plan y el auditor las evidencias. Cada rol con su acceso, todos en el mismo sitio.",
  "El sistema deja de ser «cosa de calidad» cuando cada persona ve lo suyo en el mismo portal. En Orbita el operario, la dirección y el auditor entran por la misma puerta, cada uno a su sitio."),
 ("V10C", "V10", "Accesible también", "para quien no ve, no oye o no puede.", "Orbita cumple accesibilidad web. El sistema es de todos.",
  "Hiperaccesible también significa accesible: Orbita está diseñado para usarse con lector de pantalla, con teclado y con contraste alto. Un sistema de gestión para toda la plantilla, sin excepciones.",
  "Trabajo con entidades del ámbito social y de la discapacidad. No podía ofrecerles un portal que excluyera a parte de su equipo. Orbita cumple accesibilidad web: el sistema es de todos."),
]
