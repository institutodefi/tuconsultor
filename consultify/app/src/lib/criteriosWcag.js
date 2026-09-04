// ════════════════════════════════════════════════════════════════════════════
// QUÉ EXIGE CADA CRITERIO Y CÓMO SE CUMPLE
//
// Redactado a partir del texto normativo de WCAG 2.2 (https://www.w3.org/TR/WCAG22/).
// Para cada criterio:
//   requisito     → qué pide, en una frase
//   comoSeCumple  → mecanismos concretos con los que se satisface
//
// Es un resumen de trabajo, no el texto normativo. Ante una discrepancia manda
// la norma: cada criterio enlaza a su apartado desde la ficha.
// ════════════════════════════════════════════════════════════════════════════

export const FICHA_CRITERIO = {
  '1.1.1': {
    requisito: 'Todo contenido no textual tiene una alternativa textual que cumple la misma función.',
    comoSeCumple: ['alt descriptivo en las imágenes que aportan información', 'alt vacío (alt="") en las decorativas, para que el lector las ignore', 'Nombre accesible en los controles e iconos que actúan como botón', 'Identificación descriptiva en multimedia, tests y CAPTCHA'],
  },
  '1.2.1': {
    requisito: 'Para audio o vídeo grabados sin sonido, una alternativa textual equivalente.',
    comoSeCumple: ['Transcripción completa del audio', 'Descripción textual o pista de audio para el vídeo sin sonido'],
  },
  '1.2.2': {
    requisito: 'Subtítulos en todo el audio grabado de un vídeo con sonido.',
    comoSeCumple: ['Subtítulos sincronizados incrustados o en pista aparte', 'Incluir también la información sonora no verbal relevante'],
  },
  '1.2.3': {
    requisito: 'Audiodescripción o alternativa textual del vídeo grabado.',
    comoSeCumple: ['Transcripción con la descripción de lo que se ve', 'Pista de audiodescripción en los huecos del sonido original'],
  },
  '1.2.4': {
    requisito: 'Subtítulos en el audio en directo.',
    comoSeCumple: ['Subtitulado en vivo por estenotipia o por reconocimiento con revisión humana'],
  },
  '1.2.5': {
    requisito: 'Audiodescripción del vídeo grabado.',
    comoSeCumple: ['Pista de audiodescripción que narre lo visual relevante'],
  },
  '1.2.6': {
    requisito: 'Interpretación en lengua de signos del audio grabado.',
    comoSeCumple: ['Ventana con intérprete sincronizada con el vídeo'],
  },
  '1.2.7': {
    requisito: 'Audiodescripción ampliada cuando las pausas del audio no bastan.',
    comoSeCumple: ['Versión del vídeo que se pausa para dar tiempo a la descripción'],
  },
  '1.2.8': {
    requisito: 'Alternativa textual completa de todo el multimedia grabado.',
    comoSeCumple: ['Documento con el guion y la descripción de lo visual, en orden'],
  },
  '1.2.9': {
    requisito: 'Alternativa textual del audio en directo.',
    comoSeCumple: ['Transcripción en vivo del audio'],
  },
  '1.3.1': {
    requisito: 'La información, la estructura y las relaciones que se ven deben poder determinarse por software.',
    comoSeCumple: ['Encabezados reales (h1–h6), no texto en negrita simulando títulos', 'Listas con ul/ol, tablas con th y scope, formularios con label', 'Regiones con landmarks: header, nav, main, footer', 'ARIA solo cuando el HTML nativo no llega'],
  },
  '1.3.2': {
    requisito: 'Cuando el orden importa, el orden de lectura por software debe ser el correcto.',
    comoSeCumple: ['Orden del DOM coherente con el orden visual', 'Cuidado con CSS grid y flex: order y row-reverse cambian lo que se ve, no lo que se lee'],
  },
  '1.3.3': {
    requisito: 'Las instrucciones no dependen solo de forma, color, tamaño, posición o sonido.',
    comoSeCumple: ['«Pulsa Guardar» en lugar de «pulsa el botón de la derecha»', 'Añadir texto o icono a cualquier referencia visual'],
  },
  '1.3.4': {
    requisito: 'El contenido no se restringe a una sola orientación de pantalla.',
    comoSeCumple: ['No bloquear la orientación salvo que sea esencial', 'Diseño que funcione en vertical y en horizontal'],
  },
  '1.3.5': {
    requisito: 'El propósito de los campos que piden datos personales se determina por software.',
    comoSeCumple: ['Atributo autocomplete con el valor de la lista de WCAG (name, email, tel…)', 'Tipos de input adecuados: email, tel, url'],
  },
  '1.3.6': {
    requisito: 'El propósito de los componentes, iconos y regiones se determina por software.',
    comoSeCumple: ['Roles ARIA y landmarks en las regiones', 'Marcado semántico que permita a la tecnología de apoyo sustituir iconos'],
  },
  '1.4.1': {
    requisito: 'El color no es el único medio para transmitir información.',
    comoSeCumple: ['Añadir texto, icono o subrayado además del color', 'En errores, mensaje escrito, no solo el borde rojo', 'En gráficas, etiquetas o tramas además del color'],
  },
  '1.4.2': {
    requisito: 'Si hay audio automático de más de 3 s, debe poder pararse o bajarse.',
    comoSeCumple: ['No reproducir audio automáticamente', 'Botón de pausa o control de volumen independiente del sistema'],
  },
  '1.4.3': {
    requisito: 'Contraste mínimo de 4,5:1 en el texto; 3:1 en texto grande.',
    comoSeCumple: ['Medir el ratio sobre el color REAL compuesto, no el del CSS con transparencia', 'Texto grande: desde 18,66 px, o 14 px en negrita', 'Quedan exentos logotipos, decoración y componentes inactivos'],
  },
  '1.4.4': {
    requisito: 'El texto se puede ampliar al 200 % sin perder contenido ni función.',
    comoSeCumple: ['Tamaños en unidades relativas y contenedores que crezcan', 'No fijar alturas que recorten el texto al crecer'],
  },
  '1.4.5': {
    requisito: 'Usar texto real en vez de imágenes de texto.',
    comoSeCumple: ['Tipografía web en lugar de PNG con texto', 'Excepción: logotipos y cuando la presentación sea esencial'],
  },
  '1.4.6': {
    requisito: 'Contraste mejorado de 7:1; 4,5:1 en texto grande.',
    comoSeCumple: ['Mismas reglas que 1.4.3 con el listón más alto'],
  },
  '1.4.7': {
    requisito: 'En audio hablado grabado, sin fondo o con el fondo 20 dB por debajo.',
    comoSeCumple: ['Grabar sin música de fondo o permitir apagarla'],
  },
  '1.4.8': {
    requisito: 'Mecanismo para ajustar la presentación de los bloques de texto.',
    comoSeCumple: ['Ancho máximo de 80 caracteres', 'Sin justificar a ambos márgenes', 'Interlineado de al menos 1,5 y separación entre párrafos de 1,5 veces esa'],
  },
  '1.4.9': {
    requisito: 'Imágenes de texto solo para decoración o cuando sean esenciales.',
    comoSeCumple: ['Como 1.4.5 pero sin la excepción de personalización'],
  },
  '1.4.10': {
    requisito: 'Reflujo: sin scroll en dos direcciones a 320 px CSS.',
    comoSeCumple: ['Diseño fluido, probado a 1280 px con zoom del 400 %', 'Excepción: mapas, tablas de datos y contenido que exige dos dimensiones'],
  },
  '1.4.11': {
    requisito: 'Contraste de 3:1 en componentes de interfaz y en gráficos necesarios.',
    comoSeCumple: ['Bordes de campos, estados de foco, iconos con significado', 'No aplica a componentes inactivos ni a lo que dibuja el navegador'],
  },
  '1.4.12': {
    requisito: 'Sin pérdida al forzar interlineado 1,5, párrafo 2, letra 0,12 y palabra 0,16.',
    comoSeCumple: ['Contenedores que crezcan con el texto, sin alturas fijas'],
  },
  '1.4.13': {
    requisito: 'El contenido que aparece al pasar el puntero o al enfocar debe poder descartarse, señalarse y persistir.',
    comoSeCumple: ['Cerrable con Escape sin mover el foco', 'El puntero puede entrar en el propio contenido sin que desaparezca', 'Excepción: los tooltips nativos del atributo title'],
  },
  '2.1.1': {
    requisito: 'Toda la funcionalidad se puede usar con teclado.',
    comoSeCumple: ['Elementos nativos (button, a, input) antes que divs con onclick', 'Si hay componente propio: tabindex, gestión de teclas y roles ARIA'],
  },
  '2.1.2': {
    requisito: 'Sin trampas de teclado: siempre se puede salir.',
    comoSeCumple: ['Los modales devuelven el foco y se cierran con Escape', 'Nada de widgets que capturen el tabulador sin salida'],
  },
  '2.1.3': {
    requisito: 'Toda la funcionalidad con teclado, sin excepciones.',
    comoSeCumple: ['Como 2.1.1 pero sin la excepción del trazo dependiente del recorrido'],
  },
  '2.1.4': {
    requisito: 'Los atajos de una sola tecla imprimible se pueden desactivar o remapear.',
    comoSeCumple: ['No usar atajos de una tecla', 'O permitir apagarlos, remapearlos, o que solo actúen con el foco puesto'],
  },
  '2.2.1': {
    requisito: 'Los límites de tiempo se pueden apagar, ajustar o ampliar.',
    comoSeCumple: ['Avisar antes de expirar y dar al menos 20 s para ampliar', 'Permitir ampliar al menos diez veces'],
  },
  '2.2.2': {
    requisito: 'Todo lo que se mueve, parpadea o se actualiza solo debe poder pausarse, detenerse u ocultarse.',
    comoSeCumple: ['Botón explícito de pausa en carruseles y animaciones de más de 5 s', 'Respetar prefers-reduced-motion', 'Detenerse al pasar el puntero o al enfocar NO basta por sí solo'],
  },
  '2.2.3': {
    requisito: 'Sin tiempos, salvo multimedia no interactivo y eventos en directo.',
    comoSeCumple: ['Eliminar cualquier cuenta atrás del proceso'],
  },
  '2.2.4': {
    requisito: 'Las interrupciones se pueden posponer o suprimir.',
    comoSeCumple: ['Ajuste para silenciar avisos y notificaciones no urgentes'],
  },
  '2.2.5': {
    requisito: 'Al reautenticarse tras caducar la sesión, no se pierden los datos.',
    comoSeCumple: ['Guardar el formulario antes de pedir credenciales de nuevo'],
  },
  '2.2.6': {
    requisito: 'Avisar de la inactividad que puede provocar pérdida de datos.',
    comoSeCumple: ['Aviso de la duración, o conservar los datos más de 20 horas'],
  },
  '2.3.1': {
    requisito: 'Nada destella más de tres veces por segundo.',
    comoSeCumple: ['Evitar parpadeos rápidos y transiciones bruscas de luminancia'],
  },
  '2.3.2': {
    requisito: 'Nada destella más de tres veces por segundo, sin umbral de excepción.',
    comoSeCumple: ['Como 2.3.1 sin la excepción del área pequeña'],
  },
  '2.3.3': {
    requisito: 'La animación provocada por interacción se puede desactivar.',
    comoSeCumple: ['Respetar prefers-reduced-motion en transiciones y parallax'],
  },
  '2.4.1': {
    requisito: 'Mecanismo para saltar bloques repetidos.',
    comoSeCumple: ['Enlace «saltar al contenido» al principio', 'Landmarks y encabezados que permitan saltar'],
  },
  '2.4.2': {
    requisito: 'Cada página tiene un título que describe su tema o propósito.',
    comoSeCumple: ['title único y descriptivo, con lo específico primero'],
  },
  '2.4.3': {
    requisito: 'El orden de foco conserva el significado y la operabilidad.',
    comoSeCumple: ['Orden del DOM coherente', 'Evitar tabindex positivos'],
  },
  '2.4.4': {
    requisito: 'El propósito de cada enlace se entiende por su texto o su contexto.',
    comoSeCumple: ['Nada de «pincha aquí» o «leer más» sueltos', 'Texto que diga adónde lleva'],
  },
  '2.4.5': {
    requisito: 'Más de una forma de llegar a cada página.',
    comoSeCumple: ['Menú y además buscador, mapa del sitio o migas'],
  },
  '2.4.6': {
    requisito: 'Los encabezados y las etiquetas describen su tema o propósito.',
    comoSeCumple: ['Jerarquía sin saltos de nivel', 'Etiquetas concretas, no genéricas'],
  },
  '2.4.7': {
    requisito: 'El indicador de foco del teclado es visible.',
    comoSeCumple: ['No eliminar el outline sin sustituirlo', 'Indicador propio con contraste suficiente sobre fondos oscuros'],
  },
  '2.4.8': {
    requisito: 'Se informa de dónde está la persona dentro del sitio.',
    comoSeCumple: ['Migas de pan', 'Marcar la sección activa en el menú'],
  },
  '2.4.9': {
    requisito: 'El propósito del enlace se entiende solo con su texto.',
    comoSeCumple: ['Enlaces autoexplicativos sin depender del contexto'],
  },
  '2.4.10': {
    requisito: 'Se usan encabezados de sección para organizar el contenido.',
    comoSeCumple: ['Dividir los textos largos con encabezados reales'],
  },
  '2.4.11': {
    requisito: 'Al recibir el foco, el componente no queda totalmente oculto.',
    comoSeCumple: ['Cuidado con cabeceras fijas y banners de cookies que tapan el foco', 'scroll-margin para que el elemento enfocado quede a la vista'],
  },
  '2.4.12': {
    requisito: 'Al recibir el foco, ninguna parte del componente queda oculta.',
    comoSeCumple: ['Como 2.4.11, sin admitir ocultación parcial'],
  },
  '2.4.13': {
    requisito: 'El indicador de foco tiene un área mínima y 3:1 de contraste entre estados.',
    comoSeCumple: ['Perímetro equivalente a 2 px CSS alrededor del componente', 'Contraste de 3:1 entre el estado enfocado y el no enfocado'],
  },
  '2.5.1': {
    requisito: 'Lo que se hace con gestos de varios puntos o con trazo debe poder hacerse con un solo punto.',
    comoSeCumple: ['Alternativa con botones a pellizcos y deslizamientos', 'Excepción: cuando el trazo sea esencial, como una firma'],
  },
  '2.5.2': {
    requisito: 'La acción no se ejecuta al pulsar, sino al soltar, y se puede abortar.',
    comoSeCumple: ['Usar click en vez de mousedown', 'Permitir deshacer o cancelar arrastrando fuera'],
  },
  '2.5.3': {
    requisito: 'El nombre accesible contiene el texto visible de la etiqueta.',
    comoSeCumple: ['Que aria-label no contradiga lo que se lee en pantalla', 'Importa para el control por voz'],
  },
  '2.5.4': {
    requisito: 'Lo que se activa con movimiento del dispositivo tiene alternativa y se puede desactivar.',
    comoSeCumple: ['Botón equivalente al agitar o inclinar'],
  },
  '2.5.5': {
    requisito: 'Objetivos de al menos 44×44 px CSS.',
    comoSeCumple: ['Ampliar la zona de toque con relleno, manteniendo el tamaño visual'],
  },
  '2.5.6': {
    requisito: 'No restringir los métodos de entrada disponibles en la plataforma.',
    comoSeCumple: ['Admitir a la vez teclado, ratón, táctil y lápiz'],
  },
  '2.5.7': {
    requisito: 'Lo que se hace arrastrando debe poder hacerse sin arrastrar.',
    comoSeCumple: ['Botones o menú equivalentes al arrastre', 'Excepción: cuando arrastrar sea esencial'],
  },
  '2.5.8': {
    requisito: 'Objetivos de al menos 24×24 px CSS.',
    comoSeCumple: ['Ampliar la zona de toque con relleno', 'O separarlos: que un círculo de 24 px centrado en cada uno no se solape', 'Excepción: los enlaces dentro de un texto en línea'],
  },
  '3.1.1': {
    requisito: 'El idioma de la página se determina por software.',
    comoSeCumple: ['Atributo lang en el elemento html, con el código correcto'],
  },
  '3.1.2': {
    requisito: 'El idioma de cada fragmento se determina por software.',
    comoSeCumple: ['lang en las citas y expresiones en otro idioma', 'Excepción: nombres propios y tecnicismos asentados'],
  },
  '3.1.3': {
    requisito: 'Mecanismo para las palabras usadas de forma inusual, jerga y modismos.',
    comoSeCumple: ['Glosario enlazado', 'Definición junto al primer uso'],
  },
  '3.1.4': {
    requisito: 'Mecanismo para conocer el significado de las abreviaturas.',
    comoSeCumple: ['Etiqueta abbr con title', 'Desarrollar la abreviatura en su primera aparición'],
  },
  '3.1.5': {
    requisito: 'Contenido alternativo cuando el texto exige más nivel que la secundaria.',
    comoSeCumple: ['Versión en lectura fácil', 'Resumen previo con el mensaje principal'],
  },
  '3.1.6': {
    requisito: 'Mecanismo para la pronunciación cuando el significado depende de ella.',
    comoSeCumple: ['Transcripción fonética junto a la palabra ambigua'],
  },
  '3.2.1': {
    requisito: 'Recibir el foco no cambia el contexto.',
    comoSeCumple: ['Nada de abrir ventanas o enviar formularios al enfocar'],
  },
  '3.2.2': {
    requisito: 'Cambiar un ajuste no cambia el contexto sin avisar antes.',
    comoSeCumple: ['Que un select no navegue solo: botón de confirmar', 'Si es inevitable, avisarlo antes del componente'],
  },
  '3.2.3': {
    requisito: 'La navegación repetida aparece en el mismo orden relativo.',
    comoSeCumple: ['Mismo menú y mismo pie en todas las páginas, en el mismo orden'],
  },
  '3.2.4': {
    requisito: 'Los componentes con la misma función se identifican igual.',
    comoSeCumple: ['Mismo icono, mismo texto y mismo nombre accesible para la misma acción'],
  },
  '3.2.5': {
    requisito: 'Los cambios de contexto solo ocurren a petición, o se pueden desactivar.',
    comoSeCumple: ['No recargar ni redirigir solo', 'Sin actualizaciones automáticas no controlables'],
  },
  '3.2.6': {
    requisito: 'Los mecanismos de ayuda repetidos aparecen en el mismo orden relativo.',
    comoSeCumple: ['Contacto, chat o ayuda siempre en el mismo sitio del pie o de la cabecera'],
  },
  '3.3.1': {
    requisito: 'Los errores detectados se identifican y se describen en texto.',
    comoSeCumple: ['Mensaje que diga qué campo y qué pasa, no solo un borde rojo', 'Anunciar el error con role=alert o aria-live'],
  },
  '3.3.2': {
    requisito: 'Etiquetas o instrucciones cuando se pide una entrada.',
    comoSeCumple: ['label asociado con for, visible', 'El placeholder no es una etiqueta: desaparece al escribir', 'Indicar el formato esperado antes de fallar'],
  },
  '3.3.3': {
    requisito: 'Si se detecta un error y se conoce la corrección, se sugiere.',
    comoSeCumple: ['«El CIF debe empezar por letra y tener 8 dígitos» en vez de «dato inválido»'],
  },
  '3.3.4': {
    requisito: 'En compromisos legales, financieros o de datos: reversible, comprobado o confirmado.',
    comoSeCumple: ['Pantalla de revisión antes de confirmar', 'Posibilidad de deshacer'],
  },
  '3.3.5': {
    requisito: 'Hay ayuda contextual disponible.',
    comoSeCumple: ['Textos de ayuda junto al campo, ejemplos, asistencia humana'],
  },
  '3.3.6': {
    requisito: 'Para cualquier envío: reversible, comprobado o confirmado.',
    comoSeCumple: ['Como 3.3.4, extendido a todos los formularios'],
  },
  '3.3.7': {
    requisito: 'No pedir dos veces en el mismo proceso información ya facilitada.',
    comoSeCumple: ['Autorrellenar o dejar elegir el dato ya introducido', 'Excepción: cuando repetirlo sea esencial, como una contraseña'],
  },
  '3.3.8': {
    requisito: 'Autenticación sin pruebas cognitivas, salvo alternativa.',
    comoSeCumple: ['Permitir pegar la contraseña y que funcione el gestor de contraseñas', 'Sin captchas de transcribir o resolver acertijos'],
  },
  '3.3.9': {
    requisito: 'Autenticación sin pruebas cognitivas, sin la excepción de reconocer objetos.',
    comoSeCumple: ['Como 3.3.8 sin admitir el reconocimiento de imágenes'],
  },
  '4.1.1': {
    requisito: 'Análisis del marcado. RETIRADO en WCAG 2.2.',
    comoSeCumple: ['Ya no se evalúa: los navegadores resuelven el marcado mal formado', 'Sigue en UNE 139803:2012, así que puede haber que informarlo'],
  },
  '4.1.2': {
    requisito: 'Nombre, función y valor de cada componente disponibles por software.',
    comoSeCumple: ['Elementos nativos, que ya lo traen', 'Si es propio: role, nombre accesible y estados con aria-expanded, aria-checked…'],
  },
  '4.1.3': {
    requisito: 'Los mensajes de estado se anuncian sin llevarles el foco.',
    comoSeCumple: ['aria-live=polite en avisos de guardado o de resultados', 'role=alert en errores', 'Sin robar el foco a quien está escribiendo'],
  },
};

/** Enlace al criterio en la especificación, para no fiarse solo del resumen. */
export function enlaceWcag(codigo) {
  const anclas = {
    '1.1.1': 'non-text-content', '1.4.3': 'contrast-minimum', '2.5.8': 'target-size-minimum',
    '2.2.2': 'pause-stop-hide', '1.4.10': 'reflow', '2.4.7': 'focus-visible',
  };
  const a = anclas[codigo];
  return a ? `https://www.w3.org/TR/WCAG22/#${a}`
           : `https://www.w3.org/WAI/WCAG22/quickref/#${codigo.replace(/\./g, '')}`;
}
