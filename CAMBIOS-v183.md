# TuConsultor · v183 — ISO 20121, ISO 26000, buscador en portada y SEO

## 1 · Nuevas normas en el pool de servicios

Seis páginas nuevas (ES / EN / FR):

- `/areas/sostenibilidad/iso-20121.html` · `/en/...` · `/fr/...`
- `/areas/rsc/iso-26000.html` · `/en/...` · `/fr/...`

Contenido **original**, redactado a partir de la UNE-ISO 20121:2024 y la UNE-EN ISO 26000:2021.
No se ha copiado texto de terceros (Ingertec u otros): su página es de ~250 palabras y
copiarla habría generado contenido duplicado y riesgo de propiedad intelectual.

Estructura de cada página (≈1.800–2.200 palabras frente a las ~150 de las páginas antiguas):

**ISO 20121** — qué es · novedades 2024 (Anexo SL, cambio climático, doble materialidad,
Anexo D de derechos humanos, eventos digitales/híbridos, accesibilidad) · a quién aplica ·
requisitos capítulo a capítulo (4→10) · los 4 principios de gobierno · beneficios ·
6 pasos de implantación · integración con ISO 9001/14001/14064/26000/CSRD · 7 FAQ.

**ISO 26000** — qué es · **no es certificable** (diferenciador honesto que la competencia
oculta) · 7 principios · 7 materias fundamentales · 5 pasos · comparativa
ISO 26000 vs IQNet SR10 vs SGE 21 vs SA 8000 · beneficios · integración · 6 FAQ.

Alta en: los 6 índices de área, `sistemas-de-gestion.html` (ES/EN), buscador global.
Contador **77 → 79 sistemas**. Imágenes OG 1200×630 propias para ambas.

## 2 · Buscador de normas en primera pantalla

- Nuevo `/buscador-normas.js`: dataset de las 79 normas en ES/EN/FR, búsqueda con
  normalización de acentos, navegación con flechas y Enter, roles ARIA de combobox.
- Insertado en el hero de `/`, `/en/` y `/fr/`, entre el subtítulo y los botones:
  visible sin hacer scroll.
- Fallback estático en HTML (funciona aunque el JS tarde o falle).
- Estilos `.tc-bn*` en `capas.css`.

## 3 · Orbita.PMTools en los modelos de suscripción

La herramienta incluida en los niveles de servicio ahora se nombra explícitamente:

- Portadas ES/EN/FR: «Acceso a herramientas integradas» → **«Acceso a Orbita.PMTools»**.
- Consultify (`consultoria-como-servicio.html`, `servicios/consultify.html`, i18n y JSON-LD):
  «Plataforma TuConsultor IA» → **«Orbita.PMTools incluido»**.
- Banda «Elige la intensidad» de las 237 páginas de norma (ES/EN/FR):
  «…Todos incluyen Orbita.PMTools, la plataforma donde vive tu proyecto.»

## 4 · SEO

**Diagnóstico**: solo 4 de 299 páginas tenían JSON-LD y og:image; títulos genéricos
(«SGE 21 · TuConsultor») sin keywords; sin migas de pan; sitemap sin lastmod.

- **298 páginas** con `robots` (max-snippet/max-image-preview), `og:image`, `og:image:width/height`,
  `og:site_name`, `og:locale`, `twitter:card/title/description/image` y `author`.
- **JSON-LD en todo el sitio**:
  - Portadas: `Organization` + `ProfessionalService` (CIF, dirección, teléfono, sameAs de las
    4 redes, knowsAbout, hasOfferCatalog) + `WebSite` con `SearchAction` + `WebPage`.
  - Páginas de norma: `WebPage` + `BreadcrumbList` + `Service` + `FAQPage`.
  - Índices de área: `WebPage` + `BreadcrumbList`.
- **258 títulos** reescritos con intención de búsqueda:
  `ISO 9001: consultoría e implantación | TuConsultor`,
  `Sostenibilidad y Medio Ambiente: consultoría en Madrid | TuConsultor`.
- **258 migas de pan visibles** (`.tc-breadcrumb`): enlazado interno + snippet en Google.
- `sitemap.xml` regenerado: **300 URLs** con `lastmod`, `changefreq`, prioridad y hreflang.
- `robots.txt` ampliado: bloqueo de parámetros de tracking, permiso explícito a GPTBot,
  OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended y Applebot-Extended,
  crawl-delay para Ahrefs y Semrush.
- **`llms.txt`** nuevo: mapa del sitio para buscadores generativos.
- Cache busting `?v=183` en CSS y JS (305 archivos).

## 5 · Corrección de accesibilidad

`accesibilidad.html` no tenía `<main id="main">`: el skip-link «Saltar al contenido»
apuntaba a un ancla inexistente. Corregido.

## Verificación

- 0 enlaces internos rotos (`/consultify/` se resuelve por rewrite en `netlify.toml`).
- JSON-LD válido en las 300 páginas.
- `buscador-normas.js` pasa `node --check`.
- Etiquetas `<main>` y `<section>` balanceadas en todo el sitio.

## Qué mirar después de desplegar

1. Search Console → reenviar `sitemap.xml` y pedir indexación de las 6 páginas nuevas.
2. Rich Results Test sobre `/areas/sostenibilidad/iso-20121.html` (FAQ + Breadcrumb + Service).
3. Recordatorio: **ENS Básica caduca de forma inminente** — sigue pendiente la renovación.

---

# v184 · Verificación de Bing

- `web/BingSiteAuth.xml` en la raíz (se sirve en `https://www.tuconsultor.com/BingSiteAuth.xml`;
  `build-dist.mjs` copia `web/` a la raíz del dist y no hay ninguna regla catch-all
  en `netlify.toml` que lo intercepte).
- `<meta name="msvalidate.01" content="5E68C86191818A62B99BF6C108403776" />` insertado
  tras el `charset` en las **305 páginas HTML** (ES/EN/FR/DE/AR).

Doble método a propósito: si Bing falla al leer el XML, el meta lo cubre, y viceversa.

---

# v185 · IndexNow, Google y `lastmod` real

## IndexNow (Bing, Yandex, Naver, Seznam · y por herencia DuckDuckGo y Yahoo)

- Clave `1cebb014fb74fc8f9c449b2bd8698b5e`, servida en
  `web/1cebb014fb74fc8f9c449b2bd8698b5e.txt`.
- Función `consultify/netlify/functions/indexnow.mjs`, expuesta en `/api/indexnow`.
  Se dispara con un *outgoing webhook* de Netlify en el evento «Deploy succeeded».
  Lee el sitemap y envía solo las URLs con el `lastmod` más reciente.
  Admite además una lista explícita de URLs protegida por token.
- Cabeceras nuevas en `netlify.toml`: `text/plain` para `.txt`,
  `application/xml` para `sitemap.xml` y `BingSiteAuth.xml`.
- Variables de entorno a crear en Netlify: `INDEXNOW_KEY` e `INDEXNOW_TOKEN`.

Google **no** participa en IndexNow. Sigue testeándolo desde 2021 sin adoptarlo.

## `lastmod` real por contenido

`scripts/seo-sitemap.py` sustituye al generador anterior. Guarda el hash del
contenido significativo de cada página en `web/.seo-manifest.json` y solo mueve
el `lastmod` cuando ese hash cambia. Sin esto, IndexNow enviaría las 300 URLs en
cada despliegue y los buscadores dejarían de atender las notificaciones.

En esta versión las 300 salen con fecha de hoy porque es la primera ejecución
del manifiesto y porque v183/v184 sí tocaron las 300 páginas (títulos, JSON-LD,
migas, Orbita.PMTools, meta de Bing). A partir de v186 el número será realista.

**El manifiesto tiene que viajar en el ZIP.** Si se pierde, todo vuelve a
marcarse como nuevo.

## Google

`scripts/gsc-estado.mjs`: reenvío del sitemap vía Search Console API y auditoría
de indexación con URL Inspection API (solo lectura, 2.000 consultas/día).
Requiere cuenta de servicio con la API activada y añadida como propietario en
Search Console.

No se usa la Indexing API: está oficialmente limitada a `JobPosting` y
`BroadcastEvent` y aplicarla a landings de normas incumple sus condiciones.

## Documentación

`scripts/README-SEO.md` con la rutina completa por versión.

---

# v186 · Refuerzo SEO de ISO 9001, 14001, 27001, ENS y ciberseguridad

## Contenido profundo en las 4 páginas prioritarias (ES)

Pasan de ~150 palabras de plantilla a 1.500–2.000 palabras propias con datos
normativos verificados. Esto es lo que de verdad mueve el ranking: hasta ahora
esas cuatro páginas eran indistinguibles de las otras 75.

**ENS** (`/areas/ciberseguridad/ens.html`) — RD 311/2022; ámbito extendido a
proveedores privados del sector público; las cinco dimensiones; las tres
categorías y cómo se calculan; certificación obligatoria en media y alta frente
a autoevaluación con Declaración de Conformidad en básica; las 73 medidas del
Anexo II en sus tres marcos; Declaración de Aplicabilidad; perfiles de
cumplimiento; auditoría bienal y extraordinaria; entidad acreditada ENAC;
comparativa ENS / ISO 27001 / NIS2; 6 pasos; 8 FAQ.

**ISO 27001** — versión 2022; **transición desde 2013 cerrada el 31/10/2025**
(los certificados de la edición 2013 ya no son válidos); Anexo A de 93 controles
en 4 temas con el desglose 37/8/14/34; los 11 controles nuevos; SoA; capítulos
4→10; 6 pasos; 6 FAQ.

**ISO 9001** — **la 2026 aún NO está publicada**: DIS en agosto de 2025, FDIS
votado en primavera de 2026, publicación prevista para septiembre de 2026 y
transición de ~3 años. Lenguaje condicional en todo el bloque de novedades, con
un aviso explícito contra quien ofrezca certificar hoy en la 2026. Siete
principios, capítulos 4→10, 6 pasos, 6 FAQ.

**ISO 14001** — **la 2026 SÍ está publicada** (15 de abril de 2026), sustituye a
la 2015 incluida la enmienda climática de 2024, transición de tres años hasta
abril de 2029. Lenguaje de urgencia y argumento del cuello de botella en la
agenda del certificador. Qué cambia, capítulos 4→10, 6 pasos, 6 FAQ.

FAQPage de schema.org regenerado en las cuatro con las preguntas nuevas.
Títulos y descripciones reescritos con intención de búsqueda.

## CTA reforzado

Bloque `.tc-cta-fuerte` nuevo: caja a dos columnas con borde naranja, lista de
lo que incluye el diagnóstico, botón principal, WhatsApp con mensaje
prerrellenado, teléfono pulsable y nota de tiempo de respuesta. **Aparece dos
veces** en cada página (tras el tercer bloque y al final) y en el índice de
ciberseguridad. En ENS e ISO 14001 el segundo botón del hero pasa a ser
«Diagnóstico sin coste» apuntando al CTA.

La versión de ciberseguridad tiene copy específico de pliego: «¿Tienes un pliego
encima de la mesa?».

## Aviso emergente de ENS

`web/ens-aviso.js`, cargado solo en las 13 páginas de `/areas/ciberseguridad/`.

Disparadores, el primero que ocurra: intención de salida en escritorio,
55 segundos de permanencia o 65 % de scroll.

Decisiones deliberadas para que ayude en vez de molestar:
- Una sola vez por visitante; descarte recordado 60 días en localStorage.
- **No se muestra a quien ya está convirtiendo**: si ha hecho clic en contacto,
  teléfono, WhatsApp o email, se marca como visto y no aparece.
- Sin cuentas atrás falsas, sin escasez inventada, sin «no, prefiero seguir
  siendo vulnerable». El botón de descarte dice lo que hace.
- Accesible: `role="dialog"`, `aria-modal`, foco atrapado dentro, Escape cierra,
  el foco vuelve a su origen, respeta `prefers-reduced-motion`.
- Si no hay localStorage disponible, no se muestra. Mejor perder un lead que ser
  pesado con alguien a quien no podemos recordar.
- Eventos a dataLayer: `ens_aviso_visto`, `ens_aviso_clic`, `ens_aviso_cerrado`.

## Enlazado interno

Enlaces directos a ENS, ISO 27001, ISO 9001 e ISO 14001 desde la portada, bajo
las cuatro líneas de servicio.

## Pendiente

Las versiones EN y FR de estas cuatro páginas siguen con el contenido corto.
El mercado objetivo del ENS es español, así que la prioridad era esta.

---

# v187 · Batería de pruebas y corrección de los fallos encontrados

Nueva `scripts/test-web.py`: 13 comprobaciones sobre las 305 páginas (estructura,
metadatos, hreflang recíproco, JSON-LD, enlaces y recursos, anclas, alt de
imágenes, duplicados, clases CSS, sitemap, robots, clave IndexNow y volumen de
contenido en las páginas reforzadas). Ejecutar antes de cada empaquetado.

Resultado inicial: **44 fallos y 83 avisos**. Resultado final: **0 y 10**.

## Corregido

**96 títulos pasaban de 60 caracteres** — se truncaban en Google. Los sufijos
ahora se eligen por escalera hasta caber: «consultoría e implantación» →
«implantación» → sin sufijo. Culpa mía, del pase de títulos de v183.

**`/fr/areas/` tenía título y descripción en inglés.** Traducidos.
Escaneado el resto de `/fr/`: era el único caso.

**`/equipo.html` y `/proposito.html` (ES y EN)** eran stubs de meta-refresh que
canonicalizaban a `quienes-somos.html`, y el pase de v183 les inyectó un JSON-LD
que se hacía pasar por esa página. Retirado, marcados `noindex,follow` y añadidos
**301 forzados en `netlify.toml`**, que es como debía haberse hecho.

**Portadas FR, DE, AR y `servicios/consultify.html`** solo tenían `Organization`
en JSON-LD porque el pase de v183 saltaba las páginas que ya traían schema.
Añadido el nodo `WebPage`.

**`/blog/post.html` no tenía canonical, description ni schema.** Es una plantilla
que monta el artículo desde Supabase, así que cada post se servía sin metadatos.
Ahora el script fija canonical, description, Open Graph, Twitter Card e inyecta
`BlogPosting` + `BreadcrumbList` con los datos reales del artículo.

**Páginas legales sin description** y **6 páginas sin og:image**. Añadidos.

**5 páginas sin skip-link** teniendo `<main id="main">`. Añadido en su idioma.

**Títulos duplicados ES/EN** en las tres fichas de `/grupo/`: las inglesas tenían
el título en español. Traducidas.

**Descripciones de las 4 páginas reforzadas** pasaban de 170 caracteres.
Recortadas a 143–149.

## Avisos que quedan (deliberados)

- `de/index.html` y `accesibilidad.html` con metadatos algo largos: no los toco
  sin repasar el copy alemán.
- `blog/index.html` con título corto: es correcto para esa página.
- Cuatro descripciones de 170–185 caracteres en páginas secundarias.

## Hallazgo pendiente, y es el importante

**Los artículos del blog no están en el sitemap.** Viven en
`/blog/post.html?p=slug`, una URL con parámetro que Google indexa mal y que
ninguna herramienta descubre sola. Los metadatos ya se generan bien por JS, pero
mientras las URLs no se listen, el blog aporta poco a la autoridad del dominio.

La solución es generar un sitemap de blog leyendo `blog_tuconsultor` de Supabase,
o mejor, prerenderizar cada artículo como HTML estático en el build.

---

# v188 · Presupuestos sin impuestos

## Regla aplicada

Todo importe que ve un cliente se expresa **sin impuestos**, con la leyenda
**«Impuestos indirectos no incluidos.»**

Se ha hecho más que renombrar el 21 %: **se ha retirado el importe con IVA de
las pantallas y documentos de presupuesto.** Anticipar un 21 % en una oferta es
incorrecto en cuatro escenarios reales del negocio:

- cliente canario → IGIC, no IVA;
- Ceuta y Melilla → IPSI;
- intracomunitario con NIF-IVA válido en VIES → inversión del sujeto pasivo,
  factura sin repercutir;
- extracomunitario → operación no sujeta.

En todos ellos la cifra «con IVA» de la oferta no cuadraba con la factura.
La leyenda pedida resuelve los cuatro casos.

El cálculo del impuesto **sigue intacto** en `lib/facturacion.js`: hace falta
para facturar y para el cuadro de cobros. Lo que cambia es qué se enseña.

## Fuente única

Nuevo `app/src/lib/impuestos.js` con `LEYENDA_IMPUESTOS`,
`LEYENDA_IMPUESTOS_LARGA` y `SUFIJO_SIN_IMPUESTOS`. Si cambia la redacción,
se toca en un solo sitio.

## Motor

`calcEngine.js` y `generar-oferta.mjs` devuelven ahora `cuota1SinIva` y
`cuota2SinIva`. Antes solo existían las cuotas con IVA y la interfaz habría
tenido que dividir a mano, con riesgo de descuadre por redondeo.

Verificado: 7.750 € → 3.875 + 3.875 = 7.750 ✓ · pago único 7.362,50 € con
ahorro de 387,50 € coherente ✓

## Pantallas

Calculadora · Generador de Ofertas · FasesPlanes · Mis Ofertas (portal cliente)
· tabla de Ofertas (portal consultores, con subcabecera «sin impuestos») ·
pie del Shell.

Bundle compilado verificado: **0 apariciones de «IVA» en pantalla**.

## Documentos

PDF de oferta · PDF premium · PPTX · resumen por email · contrato ·
condiciones comunes de `contenido-oferta.mjs`.

Los tres formatos se han generado de verdad y auditado: las únicas menciones
restantes a «IVA» son la cláusula explicativa, «NIF-IVA» y la referencia legal
«Ley 37/1992 del IVA» en el marco normativo. Correcto.

**Contrato:** redactado como «importe X, impuestos indirectos no incluidos.
Sobre dicho importe se repercutirán los impuestos indirectos que resulten de
aplicación conforme a la normativa vigente y al domicilio fiscal de la
ORGANIZACIÓN en la fecha de devengo». Más sólido que fijar un 21 % que puede
cambiar entre firma y factura.

## Web pública

`consultoria-como-servicio.html` (ES/EN) y `servicios/consultify.html` en sus
tres idiomas. Clase `.tc-sin-impuestos` en `capas.css`.

## Tres bugs preexistentes corregidos de paso

1. **El PDF de oferta pintaba un plan de pago de tres hitos (50/25/25)** cuando
   el motor solo calcula dos cuotas del 50 %. `cuota3` valía siempre 0, así que
   salía una tercera columna con 0 €. Ahora son dos hitos.
2. **La primera condición decía «50% al inicio + 25% a mitad + 25% antes de la
   auditoría»**, contradiciendo tanto el plan visual como las formas de pago A y
   B del mismo documento. Reescrita.
3. **La nota final de la sección Inversión se solapaba con el título
   «5. Condiciones»**: `presupuesto()` devolvía la Y sin descontar la línea que
   acababa de dibujar. Ahora la nota se envuelve y devuelve la Y correcta.

Además, quedaban tres menciones a «la plataforma TuConsultor IA» en
`servicios/consultify.html` que se escaparon en v186. Ya dicen Orbita.PMTools.

## Pendiente, sin tocar

El pie del PDF premium solapa los tres logos (TuConsultor · Consultify ·
Orbita). Es un bug de maquetación anterior, ajeno a este cambio.

---

# v189 · Compromiso anual, renovación y vencimiento de proyectos

## 1 · La cláusula de horas se prestaba a una lectura peligrosa

El texto decía que cumplidas las tareas del periodo «no existe obligación de
consumir horas restantes». Un cliente podía leer que, agotadas las tareas del
mes, decaía también la cuota de ese mes. Se ha añadido en la misma cláusula:

> Esto no afecta al compromiso de pago. La cuota mensual se mantiene durante los
> doce meses de duración del contrato, con independencia de las horas
> efectivamente empleadas en cada periodo. La cuota retribuye la disponibilidad
> del equipo y el resultado comprometido, no un consumo de horas: los meses de
> menor carga compensan los de mayor carga a lo largo del año.

Va solo en modelos recurrentes: en Implantación no aplica.

Replicado en: Anexo III de la oferta (`contenido-oferta.mjs`), condiciones del
PDF (`documento-oferta.mjs`) y cláusula «Qué incluye y qué no» del contrato.

## 2 · Oferta de renovación un mes antes

Cláusula nueva en la oferta y en la de Duración del contrato:

> Un mes antes de la fecha de finalización se emitirá una oferta de renovación
> para el siguiente periodo anual, con el alcance y la dedicación revisados.
> La renovación requiere aceptación expresa: no opera de forma automática ni
> por silencio.

El contrato decía antes «prorrogables por periodos iguales salvo comunicación en
contra» — prórroga tácita, que es lo contrario de lo acordado. Corregido.

## 3 · Fecha de inicio y fecha de fin en proyectos

**Migración `v92`**: `fecha_fin` y `renovacion_emitida` en `proyectos` y en
`proyectos_cliente` (conviven las dos tablas; el panel lee la segunda, así que
la fecha tenía que estar en ambas o el aviso no saltaría).

Fecha de fin derivada cuando no se indica, por trigger en la base y por la misma
regla en la pantalla:
- recurrentes → inicio + 12 meses
- Implantación → fecha de auditoría, o inicio + 12 meses
- Apoyo → sin fecha: es una bolsa, no vence

Constraint `fecha_fin > fecha_inicio` y vista `v_proyectos_vencimiento` con el
semáforo calculado, para poder consultarlo desde SQL sin reimplementar la regla.

## 4 · Semáforo de vencimiento

`app/src/lib/proyectos.js`, fuente única de la regla:

| Estado | Umbral | Significado |
|---|---|---|
| Vencido | fecha pasada | El contrato terminó y sigue abierto |
| Rojo | ≤ 30 días | La oferta de renovación debería estar emitida |
| Amarillo | ≤ 60 días | Toca preparar la renovación |

El umbral de 30 días no es arbitrario: es la fecha en que, según la cláusula
nueva, la oferta debe estar emitida. El amarillo da un mes de margen para
prepararla.

`renovacion_emitida` apaga el aviso. Sin eso, el aviso se queda encendido y en
dos semanas el equipo deja de mirarlo.

## 5 · Pantalla de Proyectos

- Campos de fecha de inicio, fecha de fin y renovación emitida, con sugerencia
  de fecha de fin según el modelo (se propone, no se impone).
- Aviso en vivo dentro del formulario al fijar la fecha de fin.
- Barra de avisos sobre la tabla, solo si hay algo que hacer.
- Tabla ordenada por urgencia, con columnas de inicio, fin y vencimiento, y la
  fila teñida cuando urge.
- Validación: la fecha de fin debe ser posterior a la de inicio.

## 6 · Panel de proyectos activos

Ampliado `DashboardProyectos.jsx` en lugar de crear un panel nuevo: tener dos
paneles de proyectos habría dividido la atención del equipo.

- Tarjeta «Renovaciones pendientes», que filtra al pulsarla.
- Sección «Vencimientos de contrato» con recuento por nivel y lista ordenada
  por urgencia, con el borde de la sección en rojo o ámbar según lo peor que
  haya.
- Chip de vencimiento de contrato en cada proyecto de la lista.

Se distinguen dos relojes que antes se mezclaban: el del **trabajo** (¿llega el
proyecto a su fecha con las tareas hechas?) y el del **contrato** (¿cuándo vence
y hay que renovar?). Un proyecto puede ir perfecto de tareas y estar a 20 días
de vencer sin oferta emitida.

## Verificación

`scripts/test-proyectos.mjs`: fronteras exactas del semáforo (61 ok / 60 ámbar /
31 ámbar / 30 rojo / 0 rojo / −1 vencido), fecha de fin por defecto en los cinco
modelos, fin de mes (31 ene + 1 mes = 28 feb), silenciado por renovación
emitida, orden por urgencia y exclusión de cerrados. Todo correcto.

PDFs de oferta y contrato generados y auditados con las cláusulas nuevas.
App compilada. Web: 0 fallos.

---

# v190 · Verificación de la regeneración de ofertas

## Comprobación pedida: ¿se regeneran las cláusulas?

**Sí.** Verificado end-to-end simulando el flujo real de regeneración.

La cadena es: el botón «↻ Regenerar» de `Ofertas.jsx` llama a
`/.netlify/functions/generar-oferta`, que ejecuta `calcular()` de nuevo y monta
el documento desde cero llamando a `clausulas(r)` de `contenido-oferta.mjs`.

**Ningún texto de cláusula se persiste en base de datos.** En `presupuestos`
solo se guardan datos (normas, modelo, precio, fechas, URLs). El texto legal
vive únicamente en el código, así que toda oferta regenerada sale con la
redacción vigente en el momento de regenerarla.

Prueba realizada sobre una oferta «antigua» con número emitido y precio
guardado distinto al que calcularía hoy el motor:

| Comprobación | PDF | PPTX |
|---|---|---|
| Compromiso de pago 12 meses (v189) | ✓ | ✓ |
| Renovación un mes antes (v189) | ✓ | ✓ |
| Impuestos indirectos no incluidos (v188) | ✓ | ✓ |
| Ausentes en Implantación (correcto) | ✓ | ✓ |
| Precio emitido respetado (no recalculado) | ✓ | — |

## Sin riesgo de caché

Cada regeneración sube el fichero con `Date.now()` en el nombre
(`slug_1756192834.pdf`), así que la URL cambia y no hay posibilidad de que el
CDN sirva la versión anterior. La fila de `presupuestos` se actualiza con la
URL nueva.

## Dos hallazgos

**1 · `documento-oferta.mjs` está huérfano.** Nadie lo importa: `generar-oferta`
usa `documento-oferta-premium.mjs`. El PDF que recibe el cliente es el premium.
Se ha mantenido actualizado en v188 y v189 por si se reactiva, pero conviene
decidir si se archiva: mantener dos generadores de PDF en paralelo es la vía
directa a que uno se quede desfasado sin que nadie lo note.

Nota relacionada: las cláusulas del Anexo III (donde viven el compromiso de pago
y la renovación) solo existen en el premium y en el PPTX. El estándar tiene su
propia sección 6 de confidencialidad, distinta. Es otra razón para archivarlo.

**2 · Resto de IVA en el cuadro de facturación (corregido).**
El cuadro de previsión de cobros del PDF premium tenía dos columnas, BASE y
TOTAL, y TOTAL era la base multiplicada por 1,21. Se coló en v188 porque estaba
en un bucle de dibujo y no en un literal buscable: una oferta de 7.100 €/mes
mostraba 8.591 € en cada fila.

Corregido sustituyendo la columna por **ACUMULADO**, que en un presupuesto sin
impuestos sí aporta: cuánto lleva comprometido el cliente a cada fecha.

Antes: `7.100,00 € · 8.591,00 €` (base · con IVA)
Ahora: `7.100,00 € · 14.200,00 €` (importe · acumulado)

---

# v191 · Archivado de `documento-oferta.mjs`

## Qué se ha hecho

`consultify/netlify/functions/documento-oferta.mjs` →
`consultify/netlify/functions/_archivo/documento-oferta.mjs`

Con un `README.md` en la carpeta que explica qué era, por qué se retira y qué
hacer si algún día hace falta un segundo formato de oferta (pista: no
resucitarlo, sino añadir una variante dentro del premium que siga leyendo las
cláusulas de `contenido-oferta.mjs`).

## Por qué

Estaba huérfano: ninguna función lo importaba. El PDF que recibe el cliente
sale de `documento-oferta-premium.mjs` desde hace tiempo. Y los dos generadores
ya habían divergido: el premium imprime las cláusulas del Anexo III desde
`contenido-oferta.mjs` (compromiso de pago, renovación), y el archivado llevaba
su propia sección de confidencialidad con otro texto.

## Cómo se ha asegurado que no rompe nada

- Búsqueda en todo el repositorio: cero `import`, cero referencias en
  `netlify.toml` y `build-dist.mjs`. Solo dos comentarios en
  `generar-oferta.mjs` y una línea en el documento de traspaso, los tres
  corregidos.
- `netlify.toml` excluye `_archivo/**` de `included_files`. Netlify no despliega
  como función un `.mjs` suelto dentro de un subdirectorio, pero se excluye de
  forma explícita para no depender de ese detalle.
- Se importaron **las 22 funciones** una a una tras el movimiento.
- Se regeneró un PDF de oferta completo: cláusulas de v189, impuestos de v188 y
  columna ACUMULADO de v190, todo presente.
- App compilada. Web: 0 fallos.

## Hallazgo aparte: dependencia sin declarar

Al importar todas las funciones apareció que **`copia-seguridad.mjs` importa
`@supabase/supabase-js` y ese paquete no estaba en `package.json`**. Es una
función programada (`schedule: '*/10 * * * *'`), así que venía fallando de forma
silenciosa en cada ejecución: nadie la mira porque no tiene interfaz.

No tiene relación con el archivado; salió porque esta vez se importaron todas.
Añadida la dependencia (`^2.45.0`) y verificado que ya carga.

**Conviene comprobar en el panel de Netlify si esa función tiene ejecuciones
correctas recientes o solo errores.** Si llevaba tiempo caída, no hay copias de
seguridad recientes.

---

# v192 · Cuadro de facturación: mes de inicio real y las 12 cuotas

El cuadro mostraba «3 cargos en el primer periodo» empezando en agosto de 2026
para una oferta de 350 €/mes. Tres fallos encadenados, todos corregidos.

## 1 · El calendario empezaba HOY, no en el inicio del servicio

`documento-oferta-premium.mjs` llamaba a `cuadroFacturacion({ firma: r.fecha_inicio })`,
pero **`r.fecha_inicio` no se asignaba nunca** en `generar-oferta.mjs`. Al llegar
`null`, `cuadroFacturacion` cae a `new Date()`.

El generador ya pedía fecha de inicio y de certificación al usuario —la
migración v84 sustituyó «meses» por fechas precisamente para esto— pero ninguna
de las dos se enviaba a la función ni se guardaba en `presupuestos`.

Corregido en tres puntos:
- `GeneradorOfertas.jsx` envía `fecha_inicio` y `fecha_certificacion`, y las
  guarda en la fila del presupuesto.
- `Ofertas.jsx` las reenvía al regenerar, para que la oferta regenerada no se
  recalcule desde hoy.
- `generar-oferta.mjs` las lee del body y las pone en `r`.

## 2 · Doce meses se convertían en tres

```js
r.meses = Math.max(parseInt(meses,10) || (r.fraccionado?.meses) || 3, 1);
```

Ese `3` era el mínimo de meses de una Implantación, y se aplicaba también a los
modelos recurrentes cuando no llegaba `meses`. `cuadroFacturacion` recibía 3 y
generaba tres cuotas de un contrato de doce.

Ahora el fallback distingue: 12 en recurrentes (la permanencia del modelo),
3 en el resto.

## 3 · El PDF recortaba la tabla a tres filas

```js
const filas = r.tipo === 'mes' ? cuadro.filas.slice(0, 3) : cuadro.filas;
```

Con una línea de «… y 9 cuotas más». Se listan las doce: el cliente necesita ver
qué mes empieza, qué mes acaba y cuánto lleva comprometido en cada uno.

Ajustada la reserva de altura de la sección para que pagine sola en vez de
forzar salto de página, y eliminada la línea de resumen.

## Resultado

```
octubre de 2026     Cuota mensual 1 de 12     350,00 €      350,00 €
noviembre de 2026   Cuota mensual 2 de 12     350,00 €      700,00 €
…
septiembre de 2027  Cuota mensual 12 de 12    350,00 €    4.200,00 €
                              4.200,00 € en total · impuestos indirectos no incluidos
```

## Y de paso: el pie ya no solapa los logotipos

Los tres logotipos se dibujaban de izquierda a derecha y el texto legal se
colocaba desde el borde derecho **sin medir si quedaba sitio**. Con «TRESCORE
PROYECTOS ITE, S.L.» ambos se pisaban.

Ahora se mide antes: si el legal completo no cabe se usa una versión corta
(razón social y CIF) y, si tampoco, se omite. Mejor un pie limpio que dos textos
encimados.

## Verificación

Cuadro probado con inicio en octubre de 2026: 12 filas, primer mes = mes de
inicio, último = septiembre de 2027, acumulado correcto y total 4.200 €.
PDF generado y revisado a nivel visual. App compilada.

---

# v193 · Corrección: el cuadro seguía saliendo a 3 meses en ofertas ya emitidas

## Qué falló

v192 arregló el fallback (`|| 3` → `|| 12` en recurrentes), pero **ese fallback
solo actúa cuando no llega `meses`**. Las ofertas ya emitidas llevan su `meses`
guardado en la fila de `presupuestos`, y `Ofertas.jsx` lo reenvía tal cual al
regenerar. Una oferta con `meses: 3` guardado seguía saliendo con tres cuotas
por mucho que se regenerara.

## La raíz: `meses` significa dos cosas distintas

- En **Implantación** → duración del proyecto. Tres meses son tres meses.
- En **recurrentes** → plazo hasta la certificación (3, 6, 8…). **No es la
  duración del contrato**, que es siempre de doce meses de permanencia.

El cuadro estaba usando el primer significado para los dos casos.

## La corrección

El número de cuotas de un modelo recurrente ya no depende de `r.meses`: es
siempre doce, la permanencia del modelo.

```js
const MESES_PERMANENCIA = 12;
const mesesCuadro = r.tipo === 'mes' ? MESES_PERMANENCIA : r.meses;
```

`r.meses` se sigue usando donde sí significa duración: cronograma, plan de
trabajo y reparto de tareas del Anexo I.

Esto arregla **todas las ofertas ya emitidas sin tocar la base de datos**: basta
con regenerarlas.

## Verificado con tres escenarios

| Caso | Cuotas | Primer mes | Total |
|---|---|---|---|
| Antigua, `meses: 3` guardado | 12 | mes de inicio | 4.200 € |
| Antigua, sin `fecha_inicio` | 12 | mes actual | 4.200 € |
| Nueva, `meses: 12` | 12 | mes de inicio | 4.200 € |

## Si tras desplegar sigue saliendo a 3

Comprobar en este orden:
1. Que el deploy de Netlify ha terminado (la función es serverless: hasta que no
   se redespliega, sigue ejecutándose la versión anterior).
2. Que al pulsar «↻ Regenerar» no aparece el diálogo de conflicto de precio sin
   resolver: mientras esté abierto, no se regenera nada.
3. Que la URL del PDF que se está abriendo es la nueva. Cada regeneración crea
   un fichero con timestamp distinto; si la URL es la misma de antes, el
   documento no llegó a regenerarse.

---

# v194 · Fechas de la oferta: emisión, inicio y primer pago

## Migración `v93`

Dos campos nuevos en `presupuestos` (`fecha_inicio` y `fecha_certificacion` ya
existían desde v84):

- **`fecha_emision`** — cuándo se emite la oferta.
- **`fecha_primer_pago`** — cuándo se emite la primera factura. Por defecto, el
  mes de inicio del proyecto.

Con relleno de lo ya emitido (`fecha_emision = creado::date`,
`fecha_primer_pago = fecha_inicio`), constraint de coherencia
(`fecha_primer_pago >= fecha_emision`) y trigger de valores por defecto al
insertar, para que no dependa solo de la pantalla.

## Un fallo que sale a la luz con esto

El PDF **se fechaba con el día en que se generaba el documento**, no con el día
en que se emitió la oferta. Regenerar en agosto una oferta emitida en marzo la
fechaba en agosto. Y como las condiciones dicen «validez de 30 días naturales
desde su fecha de emisión», cada regeneración reabría el plazo sin que nadie lo
hubiera decidido.

Ahora el documento lleva `fecha_emision`. Si falta (ofertas anteriores a la
migración), sigue cayendo a la fecha de hoy.

## Pantalla de edición de ofertas

Bloque de cuatro fechas: emisión, inicio previsto, primer pago y certificación.

- **El primer pago sigue al inicio** mientras no se toque a mano. En cuanto se
  edita, deja de arrastrarse: hay casos reales en que no coinciden (anticipo
  antes de arrancar, o arranque a mitad de mes que se factura al siguiente).
- **Avisos, no bloqueos.** Si el pago cae en un mes distinto al del inicio, o es
  anterior a la emisión, se avisa en naranja y se deja guardar. Quien edita sabe
  lo que hace; un bloqueo aquí solo obligaría a inventar fechas falsas.

Las cuatro se guardan y se envían al regenerar, tanto desde «Guardar y
regenerar» como desde «↻ Regenerar» y desde la edición rápida de normas.

## En el documento

- La portada lleva la fecha de emisión.
- El cuadro de facturación arranca en la **fecha del primer pago**, no en la de
  inicio: son campos distintos precisamente porque pueden no coincidir.

## Verificado

| Caso | Fecha del PDF | Primer cobro | Cuotas |
|---|---|---|---|
| Emisión marzo, inicio y pago octubre | 15 de marzo de 2026 | octubre de 2026 | 12 |
| Pago un mes después del inicio | 26 de agosto de 2026 | octubre de 2026 | 12 |
| Oferta antigua sin fechas | fecha de hoy | mes actual | 12 |

App compilada.

---

# v195 · Cartera comercial en la ficha de empresa

Caja plegable «Ofertas, contratos y proyectos» en `FichaEmpresa.jsx`, con
minidashboard y tres pestañas. Solo en empresas marcadas como cliente.

## El problema de fondo: cuatro tablas que no se conocen

Para saber qué había con un cliente tocaba pasear por Ofertas, Contratos y
Proyectos buscando por nombre en cada pantalla. Y las tablas no están unidas:

| Tabla | Cruza por |
|---|---|
| `presupuestos` | `cif` |
| `contratos` | `cliente_cif` |
| `clientes` | `cif` |
| `proyectos` | cuelga de `clientes.id`, no de `empresas` |

**La única llave común es el CIF**, y se normaliza antes de comparar: en la base
el mismo CIF aparece como `B-84.867.670`, `b84867670` y `B84867670 `. Sin
normalizar, la ficha saldría vacía aunque hubiera cinco ofertas emitidas.

Cuando una oferta no trae CIF se compara por nombre normalizado (sin forma
jurídica ni acentos). Es menos fiable, así que esas coincidencias **se marcan en
la interfaz** con «~ por nombre»: quien mira debe poder desconfiar del dato.

## Minidashboard

Cuatro cifras: ofertas (con las que siguen sin cerrar), contratos (con los
firmados), proyectos activos y **comprometido al año** — recurrentes a doce
meses más proyectos cerrados, contando solo lo vivo.

Debajo, **una sola alerta**, la más urgente: contrato vencido → vence en menos de
30 días → menos de 60 → ofertas sin cerrar → sin proyectos activos. Se eligió una
y no una lista a propósito: cinco avisos no se leen y el urgente se pierde.

## Decisiones

- **Carga bajo demanda.** Son cuatro tablas y la ficha se abre muchas veces solo
  para mirar un teléfono. Se piden al desplegar la caja, no al abrir la ficha.
- **Se abre por la pestaña que tiene algo.** Proyectos si los hay, si no
  contratos, si no ofertas. Abrir siempre en Proyectos con la lista vacía hace
  pensar que no hay nada cuando hay tres ofertas abiertas.
- **Si la empresa no tiene CIF**, el mensaje de lista vacía lo dice: es la llave
  del cruce y sin él no se encuentra nada.

## Verificación

`scripts/test-cartera.mjs`: cruce con tres formatos distintos del mismo CIF,
coincidencia por nombre cuando falta el CIF, exclusión de empresas ajenas
(ofertas, contratos y proyectos), recuento de abiertas, comprometido anual,
renovaciones, elección de alerta, orden por fecha descendente, normalización de
razón social y casos vacíos (empresa sin datos y empresa nula). Todo correcto.

App compilada.

---

# v196 · Enlaces desde la cartera de la empresa

Cada línea de la caja «Ofertas, contratos y proyectos» lleva ahora a donde se
gestiona. El título es el enlace: es lo que se pulsa por instinto.

| Línea | Lleva a |
|---|---|
| Oferta | `/consultores/ofertas?oferta=ID`, con la edición abierta |
| Contrato | `/consultores/ofertas?oferta=PRESUPUESTO_ID` — el contrato cuelga de su oferta |
| Proyecto | `/consultores/proyectos?proyecto=ID`, con el proyecto seleccionado |

Además, acceso directo a los documentos: PDF y PPT de cada oferta y PDF del
contrato, sin pasar por el listado.

## Ofertas acepta parámetros de URL

`Ofertas.jsx` no leía la URL. Ahora entiende `?oferta=ID` (abre esa oferta en
edición y resalta su fila) y `?empresa=NOMBRE` (deja el buscador filtrado). Si
el id no existe —oferta borrada— lo dice en vez de quedarse en blanco.

De paso, la apertura de la edición estaba duplicada en línea dentro del JSX de
la tabla; se ha extraído a `abrirEdicion()`, que usan el lápiz y el enlace.

## Hallazgo: la cartera leía la tabla equivocada

Al buscar a dónde enlazar los proyectos apareció que **hay dos tablas de
proyectos y `Proyectos.jsx` está huérfano**, como lo estaba
`documento-oferta.mjs`:

- `proyectos` — la que leía la cartera de v195. Su pantalla (`Proyectos.jsx`) no
  está montada en ninguna ruta del portal.
- `proyectos_cliente` — la operativa: tiene las tareas colgando, la usa
  `ProyectosConfig` (la pantalla real de proyectos) y también
  `DashboardProyectos`.

La cartera se ha cambiado a `proyectos_cliente`. Con la anterior, la caja habría
mostrado proyectos que el equipo no ve en su pantalla, o ninguno; y el enlace no
habría podido apuntar a sitio alguno, porque esa pantalla no existe en el portal.

Queda pendiente decidir qué hacer con `Proyectos.jsx` y la tabla `proyectos`:
tienen el mismo problema que tenía el generador de PDF archivado. La diferencia
es que aquí hay datos de por medio, así que conviene mirar antes si la tabla
`proyectos` tiene filas y de cuándo.

## Verificación

`scripts/test-cartera.mjs` ampliado: además del cruce por CIF, comprueba que el
contrato apunta a una oferta que existe en la misma cartera y que el cruce de
`cliente_id` funciona comparando como texto (los uuid llegan a veces como
string y a veces como objeto según el driver).

App compilada y bundle verificado: las tres rutas salen con el prefijo correcto
`/consultores`, no `/consultor`.

---

# v197 · Certificación desvinculada del fin de contrato

## El problema

En el generador de ofertas había dos fechas: inicio y **certificación**. De la
certificación salía todo: el plazo de planificación y, de hecho, el final del
encargo. Son cosas distintas:

- La **certificación** es la auditoría externa. Muchas veces no tiene fecha
  cuando se emite la oferta, porque depende de la agenda del certificador.
- El **fin de contrato** son doce meses desde el inicio, la permanencia del
  modelo. Se sabe en cuanto se sabe cuándo se arranca.

Al estar unidas, sin fecha de auditoría no se podía emitir la oferta.

## Ahora

Tres fechas independientes en el generador:

| Campo | Comportamiento |
|---|---|
| Inicio del proyecto | — |
| Fin de contrato | **12 meses desde el inicio, automático.** Editable; si se toca, deja de arrastrarse y aparece un enlace para volver a los 12 meses |
| Certificación | **Opcional.** Si aún no hay auditoría, se deja vacía |

El plazo con el que se planifican las tareas va hasta la auditoría si la hay, y
si no hasta el fin de contrato. Se muestra cuál se está usando.

Lo mismo en la edición de ofertas, con botón «Poner a 12 meses del inicio».

## Migración `v94`

`fecha_fin` en `presupuestos`, con relleno a doce meses del inicio para lo ya
emitido —**no se copia de la certificación**, que volvería a mezclarlas— y
constraint `fecha_fin > fecha_inicio`.

La certificación **no se restringe contra el fin**: puede caer después
(auditoría al final del ciclo) o antes (certificación temprana y resto del año
en mantenimiento). Solo se exige que sea posterior al inicio.

El trigger de v93 se amplía en lugar de crear otro: dos triggers BEFORE INSERT
sobre la misma tabla es una fuente de sorpresas.

## Dos correcciones que hicieron falta para que «deje generar»

**1 · La duración mínima se medía contra la auditoría.** La regla «Compromiso
necesita al menos N meses» se comprobaba contra la certificación, así que una
auditoría en el mes cinco bloqueaba la oferta aunque el contrato durase doce.
Ahora se mide contra el fin de contrato, que es lo que determina si el modelo es
viable. La auditoría temprana pasa a ser un aviso, no un error.

**2 · `sumarMeses()` desbordaba de mes.** `setMonth` salta al mes siguiente
cuando el destino tiene menos días: 31 de enero + 1 mes daba **3 de marzo**, y
29 de febrero de un bisiesto + 12 meses daba **1 de marzo** en vez del 28 de
febrero. Afectaba a toda fecha de contrato calculada desde un día 29, 30 o 31.
Corregido al último día del mes de destino.

## Verificación

`scripts/test-fechas-oferta.mjs`: fin automático (incluidos 31 de enero y 29 de
febrero bisiesto), generación sin certificación, generación con certificación
temprana, certificación posterior al fin, contrato demasiado corto (sí bloquea) y
fin anterior al inicio (sí bloquea). Todo correcto. App compilada.

---

# v198 · El plazo solo bloquea donde forma parte del producto

## La regla, por modelo

| Modelo | ¿El plazo impide emitir? | Por qué |
|---|---|---|
| **Implantación** | **No** | No hay cuotas: se paga en uno o dos pagos por un alcance cerrado. Un calendario de seis meses en vez de doce es una decisión de planificación, no un impedimento. Se avisa, se emite |
| **Apoyo** | **Sí** | La bolsa se dimensiona por meses, y el mínimo sube con el nº de sistemas (3, o 4 con más de dos). Con menos plazo las horas no encajan |
| **Recurrentes** | **Sí** | Hay permanencia y cuotas mensuales. Un contrato más corto que el mínimo no es ese modelo |

## Qué pasaba antes

`plazoOk` del motor se calculaba igual para todos: `mesesProyecto >= minMeses`.
Y `MESES_MODELO.Implantación` vale **12**. Así que una implantación a ocho meses
—perfectamente normal— deshabilitaba el botón con «Mínimo 12 meses», aunque en
implantación no hay permanencia que respetar.

Ahora `plazoOk` es siempre `true` en Implantación y se añade `plazoCorto`, que es
informativo y alimenta el aviso.

En Implantación el plazo que se manda al motor pasa a ser el del **calendario de
trabajo** (hasta la auditoría si la hay), no el del contrato: es la fecha que hay
que cumplir y la que reparte las tareas por meses.

## Hallazgo: había dos mínimos distintos para lo mismo

- `MESES_MINIMOS_RECURRENTE = 6` en `planificacion.js`
- `MESES_MODELO.Compromiso = 12` en `calcEngine.js`

Con un contrato recurrente de seis meses, la validación no daba error —cumplía
el 6— pero el botón se bloqueaba igual, porque el motor exigía 12. Mensaje y
bloqueo decían cosas distintas y no había forma de entender por qué no se podía
generar.

Unificado: la validación usa `mesesPorModelo()`, el mismo que el motor. La
permanencia real de un recurrente son doce meses, así que ese es el mínimo. La
constante se conserva marcada como obsoleta porque está exportada.

El texto del botón bloqueado pasa de «Mínimo 12 meses» a «El plazo no llega al
mínimo del modelo (12 meses)», que dice de dónde viene la restricción.

## Verificación

`scripts/test-plazos-modelo.mjs`: Implantación a 12, 8, 6, 3 y 2 meses (nunca
bloquea, avisa por debajo del mínimo); Apoyo con 1 y 3 sistemas contra sus
mínimos respectivos; recurrentes a 12, 6 y 4; e Implantación con auditoría
temprana. Todo correcto, y sin regresión en `test-fechas-oferta.mjs`.

---

# v199 · La fecha de fin se comporta según el modelo

| Modelo | Fecha de fin |
|---|---|
| **Apoyo**, **Implantación** | **Manual.** Se propone inicio + 12 meses, pero se edita libremente: cada proyecto dura lo que dura |
| **Relación**, **Implicación**, **Compromiso** | **Automática.** Inicio + 12 meses, pegada al inicio y en solo lectura |

## Por qué en los recurrentes se bloquea el campo

La permanencia son doce meses: un fin distinto no representa nada real y, en
cambio, deja la oferta sin poder emitirse. Dejarlo editable solo abre la puerta
a un bloqueo que cuesta entender.

El campo va en `readOnly` con la nota «Permanencia de 12 meses: va siempre
pegado al inicio», para que se vea que no es un fallo sino una regla.

## Reenganche al cambiar de modelo

Si se venía de una Implantación con fin a cinco meses y se cambia a Compromiso,
el fin vuelve a los doce meses automáticamente. Sin esto, la oferta quedaría
bloqueada por un valor heredado del modelo anterior, sin nada en pantalla que
explicara por qué.

Mismo comportamiento en el generador y en la edición de ofertas.

## Verificación

`scripts/test-fin-por-modelo.mjs`: los cinco modelos y si su fin es manual;
recurrentes siempre a doce meses y sin bloqueo; un fin corto forzado en
recurrente que se reengancha; Implantación con fin a 6, 3 y 2 meses (respetado,
no bloquea, avisa); y Apoyo con fin manual, donde los criterios sí siguen
aplicando y un plazo por debajo del mínimo bloquea.

App compilada.

---

# v200 · Las tres fechas del encargo, visibles

Inicio, fin y certificación prevista se ven ahora en los cuatro sitios donde
hacen falta. Antes solo asomaban de refilón: la de emisión en la portada del PDF
y la de primer pago dentro del cuadro de facturación. El cliente no tenía dónde
leer cuándo empieza, cuándo termina y cuándo está prevista la auditoría.

## PDF de oferta

Bloque **Calendario** entre el alcance y la inversión, con las tres fechas en
columnas sobre banda gris con filo naranja.

La etiqueta central se adapta: **«Fin del proyecto»** en Implantación,
**«Fin de contrato»** en los recurrentes.

Y si no hay fecha de auditoría, pone **«Por determinar»** en lugar de dejar un
hueco: un espacio en blanco en un documento de cliente parece un fallo del
documento, no una decisión.

## PowerPoint

Las tres fechas se añaden a la ficha de datos de la slide «La propuesta». Es lo
que se proyecta en la reunión, que es justo donde surgen las preguntas de
calendario.

## Tabla de ofertas

Columna **Calendario** nueva: `01/10/26 → 01/10/27` y debajo `cert. 15/06/27` o
`cert. sin fecha`. Antes había que abrir la edición de cada oferta para saber
cuándo empezaba.

## Cartera de la ficha de empresa

Segunda línea en cada oferta con el mismo formato, y la fecha de emisión pasa a
decir «emitida» para no confundirla con el inicio.

## Verificación

PDF generado en tres variantes —recurrente con certificación, recurrente sin
ella e implantación— y revisado el bloque en el render. PPTX generado y
comprobado que las tres fechas y sus etiquetas llegan al XML. App compilada.

---

# v201 · Rejilla del bloque de fechas del generador

Ajuste sobre el bloque que ya se añadió en v197 y v199 (inicio, fin,
certificación y plazo en el paso «2 · Modelo de servicio»).

Estaba en `sm:grid-cols-4`: cuatro columnas desde 640 px de ancho. A ese tamaño
las etiquetas partían en dos líneas y descuadraban la fila —el mismo problema
que ya tenía «Inicio estimado del proyecto» con solo tres columnas—. Pasa a
`sm:grid-cols-2 xl:grid-cols-4`, con los campos alineados arriba para que las
notas de distinta longitud no desplacen unos inputs respecto a otros.

---

# v202 · Alineación de los bloques de fechas

Las casillas quedaban a distinta altura. La causa es que cada celda apilaba
etiqueta, campo y nota sin altura fija: una etiqueta de dos líneas —«Inicio
estimado del proyecto» era el caso visible— o una nota más larga empujaban el
campo hacia abajo y lo sacaban de la línea de sus vecinos.

Ahora cada celda es una columna flex con tres alturas mínimas fijas:

| Zona | Generador | Edición |
|---|---|---|
| Etiqueta | `min-h-[34px]`, alineada abajo | `min-h-[32px]` |
| Campo | `h-[38px]` | `h-[34px]` |
| Nota | `min-h-[30px]` | `min-h-[28px]` |

Con la etiqueta pegada al borde inferior de su caja, dé una o dos líneas, el
campo arranca siempre a la misma altura.

Detalles que hacían falta para que cuadrase de verdad:

- **«Plazo para planificar» no tiene campo**, sino una cifra. Se le da la misma
  altura que a los inputs para que quede a la altura de las fechas y no flotando
  por encima.
- **Dos celdas no tenían nota** y por eso su recuadro terminaba antes que los
  demás: «Inicio del proyecto» y «Fecha del primer pago». Se les ha puesto una
  útil («Desde aquí se cuenta todo lo demás», «Por defecto, el mes del inicio»)
  en lugar de un hueco vacío.
- **Los avisos de validación ocupan el sitio de la nota** en vez de añadirse
  debajo: así el bloque no crece de altura cuando aparece un aviso.

Aplicado en el generador de ofertas y en la edición del histórico.

---

# v203 · Fin de contrato: 12 meses y un día, editable

## La causa real del «11 meses»: un bug de zona horaria

`hoyISO()` y `sumarMeses()` formateaban con **`toISOString()`**, que convierte a
UTC. `aFecha()` construye la fecha a medianoche **local**, así que en España
(UTC+1/+2) el paso a UTC retrocedía al día anterior:

```
26/08/2026 + 12 meses  →  25/08/2027   (debía ser 26/08/2027)
```

Y como `mesesEntre` resta un mes cuando el día del mes aún no ha llegado, el
plazo salía de **11 meses** y bloqueaba la emisión. En el servidor, que va en
UTC, no se reproducía: el fallo solo se veía en España, que es donde se usa.

Corregido con un formateador local (`aISO`). Verificado con `TZ=Europe/Madrid` y
con `TZ=UTC`: mismo resultado en las dos.

## El día extra

Nuevo `finContratoRecurrente()`: doce meses **y un día** desde el inicio.

Del 26/08/2026 al 26/08/2027 hay doce meses de calendario, pero el último día
cubierto es el 25: el 26 ya pertenece al periodo siguiente. Con el fin en el
mismo día del mes, el contrato se queda a un día de cubrir los doce completos.
Poniéndolo un día después, el contrato cubre el año entero y el plazo no puede
salir corto por un día de diferencia.

Aplicado también en el backend, para las ofertas que llegan sin fecha de fin.

## El campo pasa a ser editable en todos los modelos

En v199 lo dejé en solo lectura para los recurrentes, para evitar que un valor
raro bloqueara la oferta. Con el desfase de zona horaria eso resultó ser justo
lo contrario de lo que hacía falta: el valor «raro» lo estaba poniendo el propio
sistema y no había forma de corregirlo a mano.

Ahora se edita en los cinco modelos, con enlace **«Volver al valor por
defecto»** cuando difiere del sugerido. El valor por defecto sigue dependiendo
del modelo: doce meses y un día en recurrentes, doce meses en Apoyo e
Implantación.

## Verificación

`scripts/test-fin-recurrente.mjs`, ejecutado en UTC y en Europe/Madrid: fin
sugerido para cinco fechas de inicio (incluidos 31 de enero, 31 de diciembre y
29 de febrero bisiesto), que el plazo resultante sea de doce meses en todas y
que ninguna bloquee la emisión, más un fin puesto a mano que se respeta.

---

# v204 · Alta de proyecto desde oferta o contrato, y métricas de la cartera

## Alta de proyecto en dos clics

Botón **«+ proyecto»** en cada oferta y cada contrato de la ficha de empresa.
Abre un formulario con el nombre, las normas, el modelo y las fechas ya
rellenados desde el origen: solo queda confirmar.

Antes había que ir a la pantalla de Proyectos, buscar el cliente y teclear a
mano lo que ya estaba escrito en el contrato.

## Migración `v95`: de qué contrato viene cada proyecto

`proyectos_cliente` no guardaba su origen. Sin ese dato no se puede responder a
la pregunta que importa: **qué contratos están firmados y todavía no tienen
proyecto abierto** — trabajo vendido que nadie ha arrancado.

Se añaden `contrato_id` y `oferta_id` (hay proyectos que arrancan con la oferta
aceptada y el contrato aún sin firmar), más la vista
`v_contratos_sin_proyecto` para consultarlo desde SQL.

El relleno de lo existente solo vincula los casos **seguros**: un cliente con
exactamente un contrato firmado y exactamente un proyecto. Con dos de
cualquiera de los dos no hay forma de saber cuál va con cuál, y adivinar dejaría
datos falsos indistinguibles de los buenos.

## Métricas nuevas

**Ofertas:** aceptadas, rechazadas y tasa de aceptación.

La tasa se calcula **solo sobre lo resuelto**. Contar como pérdidas las que
siguen esperando respuesta hundiría el porcentaje sin motivo: una empresa con
tres ofertas recién enviadas no tiene un 0 % de aceptación, tiene tres ofertas
pendientes.

Una oferta con contrato firmado cuenta como aceptada aunque su campo `estado`
no se haya llegado a tocar: lo que manda es que se firmó.

**Proyectos:** pendientes, activos, en pausa y cerrados.

«Pendiente» no es un estado de la tabla, es un contrato firmado sin proyecto.
Cuando aparece, la ficha lo muestra en un aviso con el botón para abrirlo ahí
mismo, en lugar de dejar el aviso sin acción posible.

## Refactor necesario

`etapaDe()` y `ETAPAS` vivían dentro de `components/EstadosOferta.jsx`. Se han
movido a `lib/ofertas.js`: un módulo de lógica no debería importar un componente
de React para clasificar una fila, y el módulo de cartera lo necesita.

`EstadosOferta.jsx` lo reexporta para no romper lo que ya importaba de ahí.
Que las dos vistas usen la misma función es lo que hace que las cifras del
embudo y las de la ficha de empresa cuadren entre sí.

## Verificación

`scripts/test-cartera.mjs` ampliado: aceptadas contando la que tiene contrato
sin estado marcado, rechazadas incluyendo caducadas, tasa sobre resueltas,
proyectos por estado, contrato firmado sin proyecto detectado, y que deje de
contar como pendiente en cuanto se abre el proyecto. App compilada.

---

# v205 · Crear proyecto desde cero y tarjetas enlazadas

## El caso que faltaba: empresa sin ofertas

En v204 el alta de proyecto solo existía colgando de una oferta o un contrato.
Una empresa sin nada —clientes que ya trabajaban con nosotros antes de que las
ofertas estuvieran en el sistema, o trabajos que no vienen de una oferta— se
quedaba con un panel de ceros y el mensaje «Sin ofertas, contratos ni
proyectos», sin nada que pulsar.

Botón **«+ Nuevo proyecto»** siempre visible en la caja. Sin origen, el
formulario pide normas y modelo, y propone el nombre a partir de lo elegido
mientras nadie lo escriba a mano.

Si la empresa no tiene ficha de cliente el botón queda deshabilitado y se
explica por qué: los proyectos cuelgan de `clientes`, no de `empresas`, y sin
ficha no hay dónde colgarlo.

El mensaje de lista vacía deja de ser un callejón sin salida: ahora apunta al
botón.

## Tarjetas enlazadas

Las cifras del panel llevan a la pantalla que gestiona ese dato:

| Tarjeta | Destino |
|---|---|
| Ofertas · Aceptadas · Rechazadas | `/consultores/ofertas?empresa=NOMBRE` |
| Contratos | igual — se gestionan desde su oferta |
| Proy. activos · Proy. cerrados | `/consultores/proyectos?cliente=ID` |

Pulsar un número y no poder ir a lo que cuenta es la frustración clásica de un
panel.

`Proy. pendientes` no enlaza: no son proyectos que existan, sino contratos
firmados sin proyecto. Llevar a la pantalla de proyectos para no encontrarlos
sería peor que no enlazar; ese dato ya tiene su propio aviso con el botón para
abrirlos.

## `ProyectosConfig` acepta `?cliente=ID`

Solo entendía `?proyecto=ID`. Ahora, al llegar con un cliente, abre su proyecto
activo —o el primero que tenga— en lugar de aterrizar en un listado que hay que
volver a filtrar a mano.

App compilada y rutas verificadas en el bundle.

---

# v206 · Configuración de proyectos: el alta usa las empresas del CRM

## El error de la pantalla

El proyecto que aparecía con **«—» en Normas y en Modelo** no era un fallo de
visualización: se creó así. El alta era esta:

```js
const idx = Number(prompt(`¿Para qué cliente?\n${lista}\n\nEscribe el número:`));
const nombre = prompt('Nombre del proyecto:', 'Proyecto 1');
insertRow('proyectos_cliente', { cliente_id, nombre, normas: [], modelo: 'Implicación', … });
```

Dos `prompt()` encadenados —uno pedía teclear el número de una lista numerada— y
las normas fijas a lista vacía. Todo proyecto creado por esa vía nacía sin
normas y con el modelo puesto por defecto, contradiciendo lo que la persona
hubiera escrito en el nombre.

Ahora el alta usa el mismo `AltaProyecto` de la ficha de empresa, que pide
normas, modelo y fechas.

## Dos listas de clientes distintas

`ProyectosConfig` listaba la tabla `clientes`; la pestaña Empresas usa
`empresas` con `es_cliente`. Son tablas distintas: `empresas` es el CRM que se
mantiene al día, `clientes` la operativa de la que cuelgan proyectos y tareas.
El resultado era que una empresa dada de alta como cliente en el CRM no aparecía
al crear un proyecto.

Nuevo `lib/clienteDeEmpresa.js`: se listan siempre **las empresas marcadas como
cliente** y, al guardar, se resuelve su ficha operativa por CIF normalizado —o
por razón social si no hay CIF— **creándola si no existe**.

Crear la ficha al vuelo es deliberado: la alternativa es un error pidiendo dar
de alta el cliente en otra pantalla, que obliga a abandonar lo que se estaba
haciendo para teclear datos que ya están en el CRM.

## Fuera el desplegable de proyecto

«— Selecciona un proyecto activo —» duplicaba lo que ya hace el «Abrir →» de la
tabla, y encima solo listaba los activos: un proyecto pausado o cerrado no era
accesible por ninguna de las dos vías. Quitado.

El pie decía «Los proyectos se crean desde la pestaña Clientes», que ya no es
cierto. Corregido.

## Verificación

`scripts/test-cliente-empresa.mjs`: filtrado de empresas cliente (proveedores
excluidos, orden alfabético), resolución por CIF con formatos distintos
(`B-84.867.670` ↔ `b84867670 `), resolución por razón social cuando no hay CIF,
y casos nulos. App compilada.

---

# v207 · Precio de los recurrentes: suma por sistema y descuento por volumen

## El error

En Relación, Implicación y Compromiso el precio salía de las horas totales y el
**suelo de 350 € se comparaba contra el total de la oferta**, no contra cada
sistema. Con pocas horas, casi todo caía bajo el suelo y los sistemas
adicionales apenas se notaban:

| Relación | Antes | Ahora |
|---|---|---|
| 1 sistema | 350 € | 350 € |
| 2 sistemas | **450 €** | 665 € |
| 3 sistemas | 575 € | 945 € |
| 4 sistemas | 700 € | 1.190 € |

Dos sistemas costaban 100 € más que uno. El segundo se estaba regalando.

## La regla nueva

1. Se calcula el precio de **cada sistema** por separado, con su parte de
   coordinación, y cada uno tiene un **mínimo de 350 €/mes**.
2. Las horas presenciales se suman una sola vez: son por cliente, no por
   sistema.
3. Sobre el subtotal se aplica el **descuento por volumen**: 5 % con dos
   sistemas, 10 % con tres, **15 % con cuatro o más**, y nunca más del 15 %.

El descuento por volumen sustituye al «regalo» implícito que hacía el suelo
global: ahora agrupar sistemas sigue saliendo a cuenta, pero de forma explícita,
acotada y visible en la oferta.

No afecta a Apoyo ni a Implantación, que no son cuotas.

## Cliente antiguo con tarifa pactada

Casilla **«Cliente antiguo con tarifa pactada»** que abre un campo por sistema
para fijar su precio heredado. Los que se dejen en blanco siguen la regla de
catálogo con su suelo.

Es lo que hacía falta para respetar el precio de un cliente de hace años sin
tocar el catálogo ni inventar un descuento porcentual que no cuadra con nada.

## Interruptor de reglas comerciales

Casilla **«Aplicar las reglas comerciales activas»**, marcada por defecto.
Desmarcarla da el precio de catálogo limpio, sin campañas ni recargos, que es
desde donde se negocia. El panel avisa cuando están desactivadas.

## Desglose visible

El panel de precio muestra ahora cómo se forma la cuota: cada sistema con su
importe (marcando los pactados y los que están en el mínimo), las presenciales,
el subtotal, el descuento por volumen y la regla al pie.

Sin esto, un cliente que pregunta «¿y si quito la 14001?» obliga a rehacer la
oferta para poder responder.

## Verificación

`scripts/test-precio-sistemas.mjs`: escala de descuento (incluido que nunca pasa
del 15 % con 5, 9 o 50 sistemas), que el precio siempre sube al añadir sistemas
en los tres modelos, que cada sistema respeta el suelo, precio pactado por
sistema con los demás siguiendo la regla, que un precio 0 se ignora, el
interruptor de reglas, y que Apoyo e Implantación no se ven afectados.
