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

---

# v208 · Tarifa pactada al editar, y el precio de una oferta emitida deja de pisarse

## El fallo grave que salió al comprobar el guardado

`guardarEdicion()` hacía esto:

```js
const patch = { …, precio: calc.precioCatalogo };
```

**Recalculaba y guardaba siempre.** Corregir un teléfono en una oferta ya
emitida le cambiaba el importe. Con el cambio de regla de precios de v207 el
salto es brutal: la oferta de la captura, emitida por **537 €/mes**, pasaba a
**945 €** por guardar cualquier campo. El aviso de conflicto existía para
«↻ Regenerar», pero no para «Guardar», que es por donde se toca la oferta.

Ahora, si el precio de hoy difiere del emitido, se pregunta antes de guardar
nada, con dos salidas claras: **mantener el emitido** o **actualizar al de hoy**.

## Segundo fallo: el PDF no cuadraba con el CRM

Al regenerar desde «Guardar y regenerar», el POST no enviaba `fases_plan`,
`ajustes` ni `override`. El backend recalculaba con el plan entero, sin el trato
pactado y con la tarifa de catálogo, así que el documento salía con un importe
distinto del que se acababa de guardar.

El propio código avisaba de esto —«una oferta de 10.296 € se convertía en
14.553 €»— pero solo se había arreglado el cálculo local, no el envío.

Corregido en los dos caminos: «Guardar y regenerar» y «↻ Regenerar» mandan ahora
fases, ajustes, precios pactados, el interruptor de reglas y el override del
precio. Y `calcular()` del servidor recibe los mismos parámetros que el del
navegador.

## Tarifa pactada también al editar

Las dos casillas del generador —**reglas comerciales** y **cliente antiguo con
tarifa pactada**— están ahora en la edición de ofertas, con un campo por sistema
y el subtotal con su descuento por volumen a la vista.

Sin esto, una oferta de cliente antiguo había que rehacerla desde cero para
respetar su precio heredado.

## Migración `v96`

`precios_sistema` (jsonb), `cliente_antiguo` y `aplicar_reglas` en
`presupuestos`, con constraint: no puede haber precios pactados sin marcar la
oferta como de cliente antiguo, porque sería un descuento sin trazabilidad.

Sin persistir estos campos, al regenerar la oferta el motor volvía a aplicar el
catálogo y el documento salía con otro importe.

## Verificación

`scripts/test-guardado-ofertas.mjs`: que el precio de hoy difiere del emitido y
por tanto debe pedirse confirmación; que con tarifa pactada se reproduce
exactamente el importe emitido (537 €); que los precios pactados ignoran el
suelo de 350 €; mezcla de pactados y catálogo con su descuento por volumen; y
que fases y ajustes siguen respetándose. Sin regresión en
`test-precio-sistemas.mjs`.

---

# v209 · Interfaz más compacta y responsiva

## La causa de que todo ocupara tanto

Las etiquetas tenían `tracking-[0.16em]`. Con ese espaciado, «Inicio previsto
del proyecto» no cabía en una línea y partía en dos, descuadrando la fila
entera. Bajado a `0.08em`: cabe en una y se sigue leyendo como rótulo.

Además, cada pantalla resolvía la alineación a mano con `min-h-[32px]`,
`h-[34px]`, `h-[38px]`… valores distintos en cada sitio y que había que repetir
en cada campo nuevo.

## Cuatro clases que lo resuelven una vez

```
.form-grid    1 columna en móvil · 2 en tableta · 4 en escritorio ancho
.campo        columna flex con las tres zonas
.campo .label alineada abajo: da igual si ocupa una o dos líneas
.campo-nota   reserva su hueco aunque esté vacía
```

Con la variante `.denso` para bloques secundarios. Las alturas escritas a mano
en el generador y en la edición de ofertas se han sustituido por estas clases.

## Densidad general

- `.card`: padding de 16/24 px → 14/20 px.
- `.input`: de 44 px a 36 px de alto.
- `.label`: 12 px → 11 px y menos margen inferior.
- Tabla de ofertas: filas y cabecera más ajustadas, texto a 13 px.

## Responsive: dos problemas reales corregidos

**Rejillas que saltaban a 4 columnas desde 640 px.** Un campo de fecha en una
cuarta parte de una pantalla de 640 px es ilegible. Ahora saltan a 4 desde
1280 px, con 2 columnas en el tramo intermedio.

**Tarjetas de cifras a 1 columna en móvil.** En `ResumenAgenda`,
`DashboardProyectos` y `RegistroAccesos` los paneles de cuatro cifras se
apilaban en vertical y ocupaban toda la pantalla. Pasan a 2 columnas: caben de
sobra y el panel se ve de un vistazo.

**Dos tablas anchas sin scroll horizontal.** `ControlSistema` (760 px) y
`Sistemas` (960 px) tenían `min-w` pero ningún contenedor con `overflow-x-auto`:
en móvil desbordaban la página entera en lugar de desplazarse dentro de su
tarjeta. Envueltas.

## Sin regresión

`test-guardado-ofertas.mjs` y `test-precio-sistemas.mjs` siguen pasando: el
cambio es de presentación y no toca el motor de precios.

---

# v210 · Contactos: tabla compacta, edición desplegable y acciones en lote

## Tabla

Cuatro columnas: **Nombre · Correo · Móvil · Empresa**, más la casilla de
selección y el botón de abrir. Filas de una línea, 13 px, con el semáforo de
ficha completa reducido a un punto. Correo y móvil son enlaces `mailto:` y
`tel:`, que en móvil es lo que se usa.

Sustituye al esquema de dos columnas (listado a la izquierda, ficha a la
derecha), que dejaba media pantalla vacía mientras no hubiera nada seleccionado
y obligaba a mirar a otro sitio para leer la ficha.

## Edición desplegable

La ficha se abre **bajo la propia fila del contacto**: se ve a quién se está
mirando sin perder de vista el resto de la lista. Dentro van los datos, los
avisos de ficha incompleta, los botones de editar, Brevo y eliminar, y las
empresas con sus roles.

## Acciones en lote

Barra que aparece **solo cuando hay algo marcado** — una barra permanente con
botones apagados es ruido en cada visita:

- Copiar correos al portapapeles
- Exportar CSV (con BOM, si no Excel destroza los acentos)
- Dar y retirar consentimiento RGPD
- Enviar a Brevo
- Eliminar

Se ejecutan **de una en una contra la base**, no en bloque. Es más lento, pero
si falla el contacto 7 de 40 los seis primeros quedan hechos y el informe dice
cuáles fallaron y por qué. Un `update … in (…)` que revienta a medias deja el
lote en un estado que nadie sabe leer.

«Marcar todos» marca **solo lo que se está viendo**: con un filtro puesto, que
se llevara por delante contactos fuera de pantalla sería una sorpresa
desagradable.

Al retirar el consentimiento **se conserva `consentimiento_fecha`**: es la
prueba de cuándo se tuvo y hay que poder demostrarla.

## Migración `v97`: la columna `movil` no existía

Pediste móvil en la tabla y resultó que **`contactos` no tiene esa columna**.
Y sin embargo tres pantallas ya la leían:

- `MisDatosCliente.jsx` la pide al cliente **y la intenta guardar**
- `SinProyectos.jsx` la muestra
- el listado hacía `c.movil || c.telefono`

Es decir: un cliente escribía su móvil en su ficha y **ese dato se perdía al
guardar**, en silencio. Justo el dato que hace falta para avisar de una
auditoría con poca antelación.

La migración añade la columna y la rellena con el teléfono existente solo
cuando tiene forma de móvil español (empieza por 6 o 7, nueve dígitos). Si no
la tiene, se deja vacía antes que inventar el dato.

## Un fallo evitado sobre la marcha

El lote de Brevo lo escribí llamando a `brevoFn('alta', {…})`, pero esa función
recibe **un solo argumento**. Habría fallado en la primera ejecución. Corregido
para usar el mismo payload que el envío individual: si no, unos contactos
llegan a Brevo con empresa y otros sin ella.

---

# v211 · Toda la edición pasa a diálogo modal

## El componente ya existía y no lo usaba nadie

`components/DialogoFicha.jsx` estaba huérfano, como pasó con
`documento-oferta.mjs` y con `Proyectos.jsx`. Se ha reforzado y aplicado en las
nueve pantallas donde se edita algo.

## Qué se ha reforzado

| | Antes | Ahora |
|---|---|---|
| Escape | solo en el componente sin usar | en todas |
| Foco atrapado dentro | no | sí |
| Foco vuelve al abrir/cerrar | no | sí |
| Cierre por clic fuera | al soltar el ratón, viniera de donde viniera | solo si el gesto **empezó** fuera |
| Aviso de cambios sin guardar | no | sí, donde hay formulario |
| Botonera fija abajo | no | sí, en formularios largos |
| Móvil | centrado, se salía por arriba | anclado abajo, donde llega el pulgar |

El detalle del clic fuera importaba de verdad: seleccionar texto dentro de un
campo y soltar el ratón un poco fuera **cerraba el formulario y se perdía lo
escrito**. Pasaba en los cuatro modales que estaban hechos a mano.

Y el foco: al abrir aterriza en el **primer campo**, no en el botón de cerrar,
que es lo que hacía el componente original.

## Pantallas convertidas

- **Contactos** — alta y edición
- **Empresas** — la ficha completa. Antes sustituía la pantalla entera con un
  `return` temprano: al cerrar se volvía al listado desde arriba, con el filtro
  y el desplazamiento perdidos. Ahora la lista sigue detrás.
- **Clientes** — alta y edición
- **Ofertas** — normas de la oferta
- **Reglas comerciales** — alta y edición
- **Accesos** — editar perfil
- **Agenda** — nueva tarea y edición
- **Control del sistema** — casuísticas
- **Planificador de contextos** — ayuda de tarea

Cuatro de ellas tenían su propio modal escrito a mano, cada uno con sus propios
defectos. Ahora comparten uno.

`GatePoliticas` se queda como está a propósito: es un bloqueo legal que **no
debe poder cerrarse** con Escape ni pulsando fuera.

## Detalle en la ficha de empresa

Dentro del diálogo se oculta el «← Todas las empresas»: con la × de la esquina
al lado, dos formas de cerrar en el mismo sitio confunden más de lo que ayudan.

---

# v212 · Importar datos desde VIES

## Qué había

La consulta a VIES ya existía y **ya devolvía razón social y dirección**, pero la
interfaz solo ofrecía traer el nombre. La dirección se veía en pantalla y había
que copiarla a mano, campo por campo.

## Qué se importa ahora

Razón social, dirección, código postal, población y país, cada uno con su
casilla. Se importa lo que se marque, no todo de golpe.

**El backend trocea la dirección**, que VIES entrega como texto libre en el
formato de cada país. Se cubre el patrón común en la UE —última línea con código
postal y población— con sus variantes:

| País | Formato | Se reconoce |
|---|---|---|
| ES, IT, DE | `28013 MADRID` | ✓ |
| PT | `1100-052 LISBOA` (código partido) | ✓ |
| IT | `MILANO 20121` (invertido) | ✓ |
| BE, LU | `B-1000 BRUXELLES` (prefijo de país) | ✓ |
| NL | `1012 LG AMSTERDAM` | ✓ |

Lo que no encaja con ningún patrón **se deja entero en «Dirección»**. Un campo
con el texto completo es mejor que tres campos con datos repartidos mal.

**La provincia no se deduce.** En España VIES no la publica, y sacarla del
código postal exigiría una tabla que envejece. Se deja vacía antes que
rellenarla a ojo.

## Decisiones de la interfaz

- **Solo se ofrecen los campos que aportan algo.** Uno que ya coincide no
  aparece: una lista con cinco casillas de las que tres no cambian nada se marca
  entera sin mirar.
- **Marcados por defecto solo los campos vacíos.** Rellenar un hueco es seguro;
  sustituir un dato existente es una decisión de quien mira.
- **Si un campo pisaría algo distinto, se dice**: «sustituye a "Sonae"». Sin
  eso, importar borraría en silencio una razón social corregida a mano.
- **Los datos entran en el formulario, no en la base.** Se revisan y se guarda
  después, como cualquier otra edición.

## Verificación

`scripts/test-vies.mjs`: los cinco formatos de dirección de la UE, direcciones
de tres líneas, y los casos límite —vacío, nulo, sin patrón reconocible, país
fuera de la lista— comprobando que en ninguno se inventa un dato.

---

# v213 · Acciones en lote en todas las listas

## Extraído a piezas reutilizables

La mecánica estaba dentro de Contactos. Se ha sacado a:

- **`lib/lote.js`** — hook `useLote` con la selección, el recuento y la
  ejecución, más `exportarCSV` y `copiarCorreos`.
- **`components/BarraLote.jsx`** — la barra, los botones y el informe de
  resultado.

Con las decisiones que costó tomar escritas una sola vez, en lugar de repetidas
—o peor, tomadas distinto— en cada pantalla:

- **Una a una contra la base, no en bloque.** Si falla el registro 7 de 40, los
  seis primeros quedan hechos y el informe dice cuáles fallaron y por qué. Un
  `update … in (…)` que revienta a medias deja el lote ilegible.
- **«Marcar todos» solo marca lo visible.** Con un filtro puesto, llevarse por
  delante registros fuera de pantalla sería una sorpresa muy fea con un botón de
  eliminar al lado.
- **La selección se limpia al terminar**, para no repetir la acción sin querer.
- **Los fallos se listan uno a uno con su motivo.** Un «3 de 40 fallaron» sin
  decir cuáles obliga a revisar los cuarenta a mano.

## Pantallas

| Pantalla | Acciones |
|---|---|
| **Contactos** | copiar correos · CSV · dar y retirar consentimiento · Brevo · eliminar |
| **Empresas** | copiar correos · CSV · marcar cliente o proveedor · cambiar estado comercial · eliminar |
| **Clientes** | copiar correos · CSV · quitar comercial · eliminar |
| **Leads** | copiar correos · CSV · pasar a cualquier estado · eliminar |

En Leads los botones de estado se generan desde la lista `ESTADOS`, así que si
mañana se añade uno aparece solo. Los leads llegan de golpe desde la web y poder
marcar veinte y pasarlos a «contactado» de una vez es lo que vacía la bandeja.

## Un detalle de interacción

En las tablas, **la casilla no abre la ficha y la fila no marca**. Marcar para un
lote y abrir para editar son gestos distintos: mezclarlos hace que al intentar
marcar se abra la ficha, y con la barra de eliminar visible eso es peor que
molesto.

## Sobre la edición emergente

Ya está hecha en v211: las nueve pantallas donde se edita algo abren diálogo
modal (Contactos, Empresas, Clientes, Ofertas, Reglas, Accesos, Agenda, Control
del sistema y Planificador), con Escape, foco atrapado, aviso de cambios sin
guardar y cierre por clic fuera solo si el gesto empezó fuera.

## Verificación

`scripts/test-lote.mjs`: que un fallo no detiene el lote y se sigue con los
siguientes, que el motivo del fallo se conserva, que «marcar todos» no alcanza a
lo que está fuera del filtro, el escapado del CSV (comillas, punto y coma,
nulos) con su BOM, y que los correos salen sin repetir y solo los válidos.

---

# v214 · Nombre comercial, diálogos en portal y tablas más estrechas

## 1 · En los listados manda el nombre comercial

Nuevo `nombreVisible()` en `lib/crm.js`: en pantalla se enseña el nombre
comercial y, si no lo hay, la razón social.

La razón social —«GRUPO ANDES HOLDING, S.L.»— solo hace falta en documentos y
datos fiscales. En una lista estorba: varias empresas de un mismo grupo empiezan
igual y no se distinguen hasta el final del nombre.

En la fila de Empresas, la razón social aparece debajo **solo si difiere** del
comercial: repetirla siempre es ruido. En el CSV salen las dos columnas.

Aplicado en Empresas, Contactos, la cartera de la ficha y el selector de empresa
del alta de proyecto.

## 2 · Los diálogos ya no dependen de dónde estén montados

`DialogoFicha` se dibuja con **`createPortal` sobre `document.body`**.

Un `position: fixed` deja de referirse a la pantalla y pasa a referirse a su
ancestro en cuanto ese ancestro tiene `transform`, `filter` o `contain`; y una
tarjeta con `overflow-hidden` puede recortarlo. Con el portal el diálogo no
depende del árbol donde se escriba, hoy ni cuando alguien añada una animación a
una tarjeta dentro de un año.

**Aclaración importante: no son ventanas emergentes del navegador.** Son HTML de
la propia página. El bloqueador de pop-ups no las afecta y no hay nada que
autorizar. No existe ni un solo `window.open` en la aplicación.

Si un diálogo no aparecía, era código sin desplegar, no un bloqueo.

## 3 · Tablas más estrechas y responsivas

Se baja el ancho mínimo y se ocultan columnas por breakpoint:

| Tabla | Antes | Ahora | Se ocultan |
|---|---|---|---|
| Contactos | 720 px | 420 px | Correo (<640), Empresa (<768) |
| Ofertas | 860 px | 520 px | Fecha (<640), Normas (<768), Comercial (<1024), Calendario (<1280) |
| Clientes | — | — | Email (<640), Contacto (<768), Holded (<1024) |

**Lo que se oculta como columna aparece bajo el nombre** en esas resoluciones.
Ocultar un dato sin dejarlo a mano es peor que la tabla ancha: el correo de un
contacto tiene que poder leerse en el móvil aunque no quepa como columna.

---

# v215 · Corrección: la ficha de empresa se quedaba congelada

## Qué pasaba

Abrir `…/empresas?e=<id>` colgaba la pantalla. El fallo estaba en
`DialogoFicha`, así que afectaba **a todos los diálogos**, no solo a este.

El efecto que instala Escape, el foco y el bloqueo de scroll dependía de
`cerrar`:

```js
const cerrar = useCallback(…, [haycambios, onCerrar]);
useEffect(() => { … }, [cerrar]);
```

Y `onCerrar` llega casi siempre como función inline —`onCerrar={() => setForm(null)}`—,
así que **cambia de identidad en cada render**. Consecuencia: el efecto se
limpiaba y se volvía a montar en cada render. En cada ciclo devolvía el foco al
elemento de origen y programaba otro `setTimeout` para enfocar el primer campo
del formulario.

Esa pelea de foco, con la ficha de empresa —que es grande y provoca varios
renders al cargar—, dejaba la pantalla congelada.

## La corrección

`onCerrar` y `haycambios` pasan a refs, que se actualizan en cada render sin
formar parte de las dependencias. El efecto queda con `[]`: se monta al abrir y
se limpia al cerrar, que es lo único que debía hacer. `cerrar` sigue llamando
siempre a la versión actual.

## Un daño colateral que también desaparece

En cada remontaje se restauraba `document.body.style.overflow` y se volvía a
poner en `hidden`. Con mala suerte de orden, el `overflow: hidden` podía quedarse
pegado al body después de cerrar el diálogo: la página seguía sin poder
desplazarse aunque no hubiera nada abierto. Otro síntoma de «congelada».

Comprobado que ahora hay **un montaje y una limpieza**, y que el scroll se
restaura.

## Y de paso

Un enlace a una empresa que ya no existe dejaba el listado tal cual, sin
explicar por qué no se abría nada. Ahora lo dice, con un enlace para volver a
ver todas.

---

# v216 · Alta de empresa: limpieza de los efectos que abrían el formulario

## Lo primero, y lo más probable

El fallo de «no funciona crear empresa» es **casi con seguridad el bucle de
`DialogoFicha` corregido en v215**, que aún no está desplegado: al pulsar
«+ Nueva empresa» se abría el diálogo y la pelea de foco dejaba la pantalla
bloqueada. Desde fuera se ve igual que si el botón no hiciera nada.

## Aun así, había una duplicación peligrosa

`FichaEmpresa` tenía **dos efectos distintos decidiendo el contenido de `form`**
para el mismo caso:

```js
useEffect(() => { …abrir formulario si es nueva… }, [empresa, form]);
useEffect(() => { setForm(esNueva ? {…} : null); … }, [empresa?.id]);
```

El primero dependía del objeto `empresa` completo, y para un alta el padre
pasaba `{}` escrito en el JSX: **un objeto nuevo en cada render suyo**. El
efecto se disparaba una y otra vez y competía con el segundo por decidir qué
había en el formulario.

No llegaba a reabrirlo gracias a la guarda `form === null`, pero era una
condición de carrera esperando a que alguien tocara cualquiera de los dos.

Ahora hay **un solo efecto**, con dependencia estable (`empresa?.id`:
`undefined` mientras se da de alta, el id real cuando existe), y el padre pasa
una constante congelada en lugar de `{}` inline.

## Comprobado

Simulado el ciclo: el formulario se abre **una sola vez** y lo escrito se
conserva entre pulsaciones; al abrir una empresa existente el formulario no se
abre. Y los helpers que corren antes del `if (form)` —`semaforoEmpresa`,
`candidatasMatriz`, `validarCif`— se han probado con `{}`, `null` y `undefined`:
ninguno lanza, así que la ficha no se rompe al montarse vacía.

---

# v217 · Nunca más una pantalla en blanco sin explicación

## El diagnóstico

La pantalla completamente vacía —ni siquiera el menú lateral— es la firma de un
error de render no capturado: React desmonta el árbol entero y no queda nada.

Encaja con el bucle de `DialogoFicha` corregido en **v215** y **aún sin
desplegar**. Un efecto que se remonta en cada render acaba en «Maximum update
depth exceeded», que React lanza como error, y sin nada que lo recoja la página
se queda en blanco. Antes se manifestó como «congelada» y ahora como «vacía»:
mismo bucle, distinto desenlace según cuántos ciclos aguante el navegador.

Comprobado, para descartar otras causas: todos los exports que usa la pantalla
existen y devuelven lo esperado (`nombreVisible`, `tieneComercialDistinto`,
`semaforoEmpresa`, `exportarCSV`, `copiarCorreos`…), el orden de declaración de
`cargar` y `useLote` es correcto, y los helpers que corren al montar no lanzan
con datos vacíos.

## La red de seguridad

**No había ninguna barrera de errores en toda la aplicación.** Cualquier fallo
de render, en cualquier pantalla, dejaba la página en blanco sin una sola pista.
Eso convierte cada incidencia en una adivinanza.

Nuevo `components/BarreraErrores.jsx`, en dos alturas:

- **Dentro del `Shell`**, alrededor de las rutas: un fallo en una pantalla deja
  el menú en pie y permite irse a otra sin recargar.
- **Alrededor de toda la app**, por si el fallo está en el propio Shell o en el
  router: ese caso es el que dejaba la página literalmente vacía.

Muestra el mensaje del error, el árbol de componentes donde ocurrió, y tiene
botones para **copiar el informe** (mensaje, ruta, navegador, fecha y pila),
reintentar sin recargar, y recargar.

A partir de ahora, cuando algo falle habrá un texto que pegar en lugar de una
pantalla negra que describir.

---

# v218 · Corregido «Cannot access before initialization»

## El error

El informe de la barrera de v217 dio el fallo exacto en un intento:

```
Error: Cannot access 'ae' before initialization
Ruta: /app/consultores/empresas?e=f0aa646d-…
```

Es la **zona muerta temporal** de JavaScript: una variable `const` leída antes
de su declaración. Con el código minificado se llamaba `ae`; en el original es
**`vista`**, en `FichaEmpresa`.

Lo introduje yo en **v212**, al añadir la importación desde VIES. El `useMemo`
de `importables` lee `vista[campo]` en la **línea 142** y `vista` se declaraba en
la **210**. Como el `useMemo` se ejecuta durante el render, saltaba antes de
llegar a la declaración: la ficha entera se caía al abrirse, y sin barrera de
errores eso era una pantalla en blanco.

Explica los tres síntomas seguidos: congelada, blanca y «no funciona crear».

## Corregido

`vista` se declara ahora al principio del componente, antes de todo lo que la
usa. Es donde debió estar desde el principio.

## Y había otro igual, sin detectar

Nuevo `scripts/buscar-tdz.py`, que busca variables de componente usadas antes de
declararse dentro de `useMemo`. Encontró un segundo caso:

**`ProyectosConfig`** — el `useMemo` que filtra proyectos llama a `nombreCli()`,
declarada 25 líneas más abajo. Solo se disparaba **al escribir en el buscador**,
porque con la caja vacía el `useMemo` devuelve antes de llegar a esa línea. Una
bomba de relojería: la pantalla se caía al teclear.

Ambos helpers movidos arriba.

El script queda para pasarlo antes de empaquetar. Distingue el uso real del
falso positivo: `useLote(lista, () => cargar())` es seguro, porque la llamada va
dentro de una función que se ejecuta más tarde; `vista[campo]` dentro de un
`useMemo` no lo es.

---

# v219 · Foto nueva de Alejandro San Nicolás

Sustituida en `quienes-somos.html` (ES y EN), que son las dos páginas donde
aparecía.

Dos versiones generadas desde el original de 1400×1050:

- `web/equipo/alejandro-san-nicolas.jpg` — 330×360, para la ficha de la web.
  Se muestra a 110×120, así que el triple de resolución cubre pantallas retina
  sin engordar: 17 KB.
- `web/equipo/alejandro-san-nicolas-sq.jpg` — 400×400 cuadrada, para avatares
  del CRM cuando haga falta. 21 KB.

El recorte está centrado en la cara, con `object-position: center 30%` para que
el encuadre no corte la barba al reescalar.

## De paso, dos arreglos

**La foto pasa a servirse desde nuestro dominio.** Estaba enlazada al WordPress
antiguo (`tuconsultor.com/wp-content/uploads/…`). Una imagen alojada fuera
desaparece el día que se apague ese sitio, y mientras tanto es una petición a
otro servidor en cada visita.

**`width` y `height` explícitos** en la etiqueta, para que el navegador reserve
el hueco y la página no dé el salto de maquetación al cargar la imagen.

Las demás fotos del equipo siguen apuntando al WordPress antiguo. Conviene
traerlas también cuando se actualice la lista de personas.

## Pendiente

Falta saber a quién hay que quitar del equipo.

---

# v220 · Equipo: retirada la sección «Team» y arregladas las fotos rotas

## Retirados

Camila Kuklis, Pablo Hernández, Patricia Luengo y José Villalba, en
`quienes-somos.html` **y en su versión inglesa**, que va en un archivo aparte y
es fácil de olvidar.

Se ha quitado la sección «Team» entera, no solo las cuatro tarjetas: dejar el
titular «Especialistas en los diferentes ámbitos de la gestión» sobre una
rejilla vacía se vería peor que no tenerla. El bloque de «Tú puedes ser el
próximo · Ficha de candidatos», que va justo después, cubre esa función mientras
llegan los nuevos.

Queda el **Board** con Alejandro San Nicolás y Fátima Ballesteros.

## Las fotos estaban rotas, todas

En la captura se veían los iconos de imagen fallida. La causa: todas las fotos
del equipo se enlazaban al WordPress antiguo
(`tuconsultor.com/wp-content/uploads/…`), que **responde 403**. Comprobado.

Es decir: la página de equipo llevaba tiempo enseñando fichas sin foto a
cualquiera que la visitara.

- **Alejandro** → foto nueva, servida desde `/equipo/` (v219).
- **Fátima** → marcador SVG con sus iniciales sobre el azul de marca, 1 KB.
  Mejor un avatar sobrio que un icono de imagen rota. **Hace falta su foto** para
  sustituirlo.

Ya no queda ninguna referencia a `wp-content` en toda la web.

## Pendiente

1. La foto de Fátima Ballesteros.
2. Los nuevos integrantes del equipo: nombre, cargo, descripción, LinkedIn y foto.

## Aviso sobre el CRM

Las cuatro personas retiradas **no aparecen en el código de la aplicación**, pero
sí pueden tener ficha en la tabla `consultores` con proyectos y tareas
asignados. Antes de borrarlas ahí conviene reasignar su trabajo; marcarlas como
inactivas (`activo = false`) es más seguro que eliminarlas, porque un borrado
deja tareas y agendas apuntando a alguien que ya no existe.

---

# v221 · Retrato de primer plano para la ficha de Alejandro

Sustituida la foto de v219 por el primer plano, que funciona mucho mejor al
tamaño al que se muestra: la ficha son **110×120 píxeles**, y en ese espacio un
plano medio deja la cara demasiado pequeña para reconocerla.

Regeneradas las dos versiones desde el original de 1050×1400:

- `alejandro-san-nicolas.jpg` — 330×360 (proporción 11:12, la de la ficha),
  recortada con algo de aire sobre la cabeza y cortada a la altura del pecho.
  20 KB.
- `alejandro-san-nicolas-sq.jpg` — 400×400, de la coronilla al final de la
  barba, para avatares del CRM. 26 KB.

Retirado el `object-position: center 30%` que se puso en v219: hacía falta con
el plano medio, donde la cara quedaba en el tercio superior. Con un primer plano
ya centrado, ese desplazamiento descuadraría el encuadre.

Comprobado reduciendo la imagen a 110×120 reales: la cara sigue reconociéndose.

---

# v222 · La versión desplegada, a la vista

## El bundle del error es el mismo de la vez anterior

El informe apunta a `index-BuU_DKMJ.js`, **el mismo fichero que en el error de
v218**. Compilando el código actual sale `index-CtX8lrv0.js`. El nombre lleva un
hash del contenido: si fuera el mismo código, sería el mismo nombre.

Es decir, **v218 no está desplegada**: el arreglo de `vista` en `FichaEmpresa`
existe en el código (línea 98, antes de sus usos en 149 y 154) pero no en
producción.

Sin `?e=`, `FichaEmpresa` solo se monta al pulsar «+ Nueva empresa». Por eso el
síntoma es exactamente ese.

## Para no volver a discutirlo

**La versión ahora viaja dentro del bundle.** Vite inyecta número y fecha de
compilación, y aparecen en dos sitios:

- En el **informe de errores**, justo debajo del mensaje.
- En el **pie de la aplicación**, discreto.

Se han perdido dos rondas arreglando cosas que ya estaban arregladas. Con la
versión a la vista, el primer dato del informe dirá si el fallo viene de código
nuevo o de código viejo sin desplegar.

Numeración alineada con el proyecto: `package.json` pasa de `2.0.0` a `221.0.0`.

## Segundo barrido de zonas muertas

`scripts/buscar-tdz.py` mejorado: ahora distingue si el uso está dentro de una
función diferida —segura— o dentro de un `useMemo` que corre en el render.

Cinco avisos, los cinco revisados uno a uno: cuatro son la palabra buscada
dentro de un texto («…eliminar N cliente(s)…») y uno es una variable local
homónima dentro de una función. **Ningún caso real pendiente.**

## Qué comprobar tras desplegar

En el pie de la aplicación debe leerse **v221.0.0** o superior. Si sigue
apareciendo otra cosa, el despliegue no ha llegado.

---

# v223 · Varios contactos directivos por empresa

## Qué impedía tenerlos

Un índice único de la v56:

```sql
create unique index empresa_contactos_rol_unico
  on empresa_contactos (empresa_id, rol) where rol <> 'secundario';
```

Al asignar un segundo directivo, la interfaz **degradaba al primero a
«secundario»** para no violarlo. En una empresa con dirección general, dirección
de calidad y responsable del sistema, solo una podía constar como directiva; las
otras acababan mezcladas con los contactos sueltos y se perdía quién manda.

## Migración `v98`

El índice pasa a cubrir **solo facturación y proyecto**. Ahí la ambigüedad sí es
un problema —a quién se manda la factura, con quién se coordina— y tener dos
obligaría a elegir igualmente. Directivo admite los que hagan falta.

Sigue habiendo **un principal por empresa**: es quien firma los documentos y
quien se sincroniza con Brevo. Varios directivos, uno principal.

La migración además corrige lo que hubiera quedado descolocado: quita el
`principal` a quien no sea directivo, y si una empresa tiene directivos pero
ninguno marcado, asciende al más antiguo.

## En la ficha

- Bloque propio **«Contactos directivos (N)»** con botón «+ añadir otro».
- El principal, primero en la lista, con distintivo **★ PRINCIPAL** y el aviso
  de que es quien aparece en documentos y en Brevo.
- Botón **«hacer principal»** en los demás. Cambia el anterior antes de poner el
  nuevo, porque el índice único de la base no admite dos a la vez.
- Aviso si hay varios directivos y **ninguno** es principal.
- Facturación y proyecto conservan su bloque de rol único.

## Detalles que había que ajustar

- **Al añadir un directivo ya no se degrada a nadie.** La degradación queda solo
  para los dos roles que siguen siendo únicos.
- **El primer directivo es principal; los siguientes, no.** Añadir un segundo no
  debe destronar a quien ya firmaba.
- **Ascender a alguien a directivo tampoco le hace principal** si ya hay uno.

Aplicado en las cuatro vías por las que se puede llegar: vincular existente,
crear nuevo, cambiar de rol y copiar a otro rol.

---

# v224 · Persona de contacto al reeditar y pago anual por adelantado

## 1 · Traer la persona de contacto desde el CRM

Nuevo `components/ImportarContacto.jsx` en la edición de ofertas del histórico.

Los datos de la persona en una oferta antigua son los que se escribieron el día
que se emitió. Si esa persona ya no está, o la oferta se redirige a otro
interlocutor, había que teclear nombre, cargo, correo y teléfono a mano
teniéndolos ya en el CRM.

- La empresa se localiza por **CIF normalizado** y, si no lo hay, por razón
  social: una oferta antigua puede tener el CIF con guiones o en minúsculas.
- Los contactos salen ordenados con el **principal y los directivos primero**:
  son los que reciben la oferta.
- Se marca cuál es **el que ya está puesto**, para no cambiarlo sin querer.
- Carga los datos **solo al desplegarlo**: son tres tablas y la edición se abre
  muchas veces sin tocar el contacto.
- Al elegir, el **móvil manda sobre el fijo**: es el que sirve para avisar.

Se guarda `contacto_id`, así que a partir de ahora consta a quién se dirigió
cada oferta.

## 2 · Pago anual por adelantado · 11 × 12

Casilla en la edición, solo visible en modelos de cuota: en una implantación no
hay mensualidades que adelantar, y una restricción en la base lo impide también
ahí.

**No se modela como un descuento.** La cuota mensual no cambia: son once
mensualidades cobradas por doce meses de servicio. Se guarda así porque en la
oferta hay que poder decir «once pagos, doce meses», que es lo que se entiende y
lo que justifica el adelanto. El equivalente porcentual (8,3 %) se calcula
aparte, solo para comparar.

### Qué cambia en los documentos

**PDF** — el cuadro «Cuándo se factura» pasa de doce cuotas mensuales a **un
solo cargo**: el calendario es lo que el cliente compara con su extracto
bancario, y enseñar doce apuntes cuando hay uno es engañoso. Además, caja nueva
bajo la cuota con el importe anual, las mensualidades y el ahorro.

**PPTX** — la forma de pago en la ficha de datos y el importe anual junto a la
cuota.

La casilla enseña el cálculo en vivo mientras se marca: *«Un pago de 15.152,50 €
en vez de 16.530,00 €: el cliente se ahorra 1.377,50 €»*.

## Migración `v99`

`pago_adelantado` y `contacto_id` en `presupuestos`, con constraint que impide
marcar el adelanto en ofertas que no son de cuota.

## Un solapamiento corregido sobre la marcha

La caja del pago adelantado se dibujaba encima de la de la cuota: partía del
cursor de texto en vez de del final de la caja anterior, y la sección no
reservaba altura para ella. Corregido y verificado en el render.

---

# v225 · Corregido «r is not a function» al cambiar de pantalla

## El informe con versión ya sirvió

`Versión: v221.0.0 · 2026-08-31 12:24` — código actual, fallo nuevo. Sin ese
dato habríamos vuelto a discutir si estaba desplegado.

## El error

```js
const cargar = () => listTable('tareas_catalogo').then(setCatalogo).catch(…);
useEffect(cargar, []);
```

**React usa lo que devuelve el efecto como función de limpieza.** Aquí `cargar`
devolvía la promesa de `listTable`, así que al desmontar la pantalla React
intentaba llamarla: `r is not a function`.

Lo que despista es dónde aparece: el fallo estaba en **`Sistemas`** (ruta
`/sistemas`), pero salta **al abandonarla**, así que el informe lo registra en la
pantalla a la que se navega — `/proyectos/planificador`. Se busca donde no está.

## Corregido en los cinco sitios

`Sistemas`, `ProyectosConfig`, `Clientes`, `Dashboard` y `ClienteProyecto`
usaban `useEffect(cargar, deps)`. Envueltos en `useEffect(() => { cargar(); }, deps)`,
que no devuelve nada.

Solo `Sistemas` reventaba hoy —es el único cuyo `cargar` devolvía la promesa—
pero los otros cuatro fallarían en cuanto alguien les añadiera un `return` o los
hiciera `async`. Es una trampa que se arma sola.

## `scripts/buscar-efectos.py`

Detecta las tres formas de caer:

```js
useEffect(cargar, [])            // si `cargar` devuelve algo
useEffect(() => setX(1), [])     // devuelve el resultado de setX
useEffect(async () => {…}, [])   // devuelve una promesa
```

Ignora los comentarios —la primera versión se señalaba a sí misma— y devuelve
código de error, así que puede encadenarse en el proceso de empaquetado.

Ejecutado sobre todo el proyecto: **cero casos**.

---

# v226 · Los precios admiten céntimos

## El error

```
No se pudo guardar: invalid input syntax for type integer: "537.3"
```

`presupuestos.precio` es de tipo `int`, de cuando todo importe salía redondeado
al escalón de 25 €. Desde la v207 el precio de los modelos recurrentes se forma
sumando cada sistema y aplicando un descuento por volumen del 5, 10 o 15 %, y
**ese porcentaje casi nunca da un entero**. Comprobado en el motor: Compromiso
con dos sistemas sale a 1.377,50 €; con cuatro, a 1.997,50 €.

## Migración `v100`

`presupuestos.precio`, `precio_catalogo` y los `precio_mes` / `precio_total` de
las dos tablas de proyectos pasan a `numeric(12,2)`.

La alternativa era redondear en la aplicación, pero eso significa que **la oferta
enseña un importe y la base guarda otro**. Un céntimo de diferencia entre lo
ofertado y lo facturado es justo el detalle que un cliente detecta y que obliga a
dar explicaciones.

`contratos.importe` ya era `numeric(12,2)` desde la v83: esto alinea el resto,
porque el importe de un contrato y el de la oferta de la que nace tienen que
poder ser el mismo número.

## Los errores de base ahora se explican

Nuevo `explicarErrorBd()` en `lib/data.js`. «invalid input syntax for type
integer» no le dice nada a quien está guardando una oferta, y menos aún que la
solución sea aplicar una migración. Traduce los casos que se han dado de verdad:

| Error de Postgres | Lo que se lee ahora |
|---|---|
| `invalid input syntax for type integer: "537.3"` | «La base aún guarda los precios como número entero y este vale 537,3. Falta aplicar la migración v100» |
| `could not find the 'x' column` | «El campo «x» no existe todavía. Falta una migración o recargar el esquema» |
| `violates check constraint "y"` | «La base rechaza estos datos por la regla «y»» |
| `duplicate key value` | «Ya existe un registro con ese valor único» |

El mensaje original se conserva al final, para poder rastrearlo. Aplicado en
Ofertas, Ficha de empresa y Contactos.

## Migraciones pendientes, en un archivo

`migraciones-v98-v100-TODAS.sql`: v98 (varios directivos), v99 (pago adelantado
y contacto) y v100 (céntimos), dentro de una transacción y validadas con el
parser de PostgreSQL.

---

# v227 · Con pago adelantado, vencimiento único en vez de calendario

## El PDF

Con `pago_adelantado` marcado, la sección **«Cuándo se factura» ya no lleva
tabla**. Una tabla de cuatro columnas con una sola fila, y una columna
«acumulado» que repite el mismo número, es papel gastado: lo que el cliente
necesita saber es cuánto y cuándo vence.

En su lugar, una caja de **pago único**:

```
PAGO ÚNICO                                        VENCIMIENTO
15.152,50 €  sin impuestos              01 de octubre de 2026
Equivale a 1.377,50 €/mes durante 12 meses · ahorro de 1.377,50 €
```

El vencimiento es la fecha del contrato —cuando nace la obligación de pago—, no
el mes en que empieza a prestarse el servicio.

El equivalente mensual se mantiene a la vista: es lo que permite comparar con
otras ofertas y con la propia alternativa de pagar mes a mes.

## Las condiciones cambian, no solo la tabla

**Condición de forma de pago**, primera de la lista:

> Forma de pago: un único pago por adelantado de 15.152,50 €, con vencimiento a
> la fecha del contrato. Cubre 12 meses de servicio (11 mensualidades).

**Cláusula 4 nueva** en el Anexo III, solo cuando hay adelanto: deja claro que no
hay cuotas posteriores ni domiciliación, y que si el contrato se interrumpiera
por causa imputable a la consultora se devolvería la parte proporcional. Sin esa
última frase, un pago anticipado sin condición de devolución es una asimetría
que un cliente con abogado señalaría.

**Cláusula 3 reescrita.** Decía «la cuota mensual se mantiene durante los doce
meses». Pagado por adelantado eso no encaja: ya está todo abonado. Ahora dice que
el importe cubre los doce meses de servicio con independencia de las horas
empleadas.

La numeración se corre sola: con adelanto son seis cláusulas, sin él cinco.

## PowerPoint

La forma de pago aparece en la ficha de datos, y el Anexo III lleva las mismas
cláusulas que el PDF, porque salen de la misma función.

## De paso

Tres helpers de fecha distintos hacían lo mismo. Unificados en `fechaLarga()`.

## Verificado

Generados PDF y PPTX en las dos variantes: con adelanto no aparece ninguna
«Cuota mensual N de 12» y sí el bloque de pago único con su vencimiento; sin él,
el calendario de doce cuotas sigue igual que antes.

---

# v228 · Importe de pago único visible y contacto en desplegable

## El selector de contacto no funcionaba

Dos fallos, y el segundo hacía inútil al primero:

**1 · Estaba al final del formulario**, después de las fechas y del bloque de
tarifa. Nadie lo encontraba. Ahora va **justo encima de los datos de la
persona**, que es donde se busca.

**2 · Los nombres de campo no coincidían.** El formulario de la oferta guarda
`contacto_nombre` y `contacto_apellidos`; el componente devolvía `nombre` y
`apellidos`, como los llama el CRM. Al elegir a alguien **no se rellenaba nada
visible**: el dato entraba en un campo que ningún input leía. Corregido con un
mapeo explícito.

## Ahora es un desplegable de verdad

Antes había que pulsar un enlace para que se cargaran los contactos y aparecía
un listado de tarjetas. Ahora es un `<select>` que se rellena solo en cuanto hay
CIF o nombre de empresa: un desplegable que hay que abrir para que tenga
opciones no es un desplegable.

Cada opción dice quién es, su papel y su correo:

```
Consoli Sánchez — ★ Contacto directivo principal · c.sanchez@adf-formacion.es
Pedro Gil — Contacto de facturación · SIN CORREO
```

«SIN CORREO» en mayúsculas a propósito: es lo que impide enviar la oferta, y
conviene verlo **antes** de elegir a esa persona.

El propio desplegable explica por qué está vacío cuando lo está: falta el CIF,
no se pudo consultar, o la empresa no tiene contactos asignados.

## El importe de pago único, a la vista

En la tabla de ofertas y en la cartera de la ficha de empresa, una oferta con
pago adelantado muestra **lo que se cobra**:

```
5.910,30 €
pago único · 11×12
537,30 €/mes
```

Enseñar solo la cuota mensual obligaba a abrir la oferta para saber cuánto se
factura de verdad. La cuota se conserva debajo, en pequeño, porque sigue siendo
la referencia para comparar.

---

# v229 · Administración con todos los permisos salvo los de Superadministración

## Qué le faltaba

Tres cosas, y las dos primeras eran un estorbo diario:

- **No veía los importes.** `verEconomico` era solo de `superadmin`: gestionaba
  ofertas y proyectos sin poder leer su precio.
- **No entraba en Accesos ni en Control de accesos**, así que cualquier alta de
  usuario dependía de una sola persona.

Ahora Administración ve **las 25 pestañas**, las mismas que Superadministración,
y tiene importes, equipo, accesos y auditoría.

## Qué se reserva a Superadministración, y por qué

Solo lo que permitiría **saltarse la propia jerarquía**:

- Otorgar el rol `superadmin`
- Modificar, desactivar o eliminar a quien ya lo tiene
- «Ver como» otro rol

Si Administración pudiera nombrar superadministradores, el nivel dejaría de
existir: bastaría con ascenderse. Y si pudiera desactivar al superadmin
existente, se quedaría sola al mando. La separación tiene que estar en esas
acciones concretas, no en esconder pantallas de trabajo.

## La barrera está en el servidor, no en el navegador

`admin-usuarios.mjs` aceptaba **solo** `superadmin`. Abrir la pantalla sin tocar
esto habría dado un formulario que falla al guardar.

Ahora acepta a los dos, con un guardián `puedeTocarA()` que se aplica a las
cuatro acciones que actúan sobre un usuario: **editar perfil, restablecer
contraseña, desactivar y eliminar**. Comprobar solo `set_role` habría dejado tres
puertas abiertas —bastaba con eliminar al superadmin para quedarse al mando— y
hacerlo únicamente en la interfaz sería decorativo: esta función se puede llamar
con `curl`.

En la pantalla, un superadministrador aparece con su rol como etiqueta fija en
lugar de desplegable cuando quien mira no puede cambiarlo, y el selector de rol
solo ofrece lo que esa persona puede asignar.

## Verificación

`scripts/test-permisos.mjs`: que admin tenga exactamente las mismas pestañas que
superadmin, las cuatro capacidades compartidas, las dos reservadas, que admin no
pueda asignar `superadmin`, que ningún otro rol gane nada, y que el menú
resultante no quede vacío.

---

# v230 · Los datos del contacto llegan al documento regenerado

## Tres eslabones rotos

Elegir la persona en el desplegable guardaba bien en el CRM, pero el documento
seguía saliendo incompleto. Faltaban tres cosas encadenadas:

**1 · El POST no enviaba el cargo.** «Guardar y regenerar» mandaba empresa,
contacto, CIF, correo y teléfono, pero no `cargo`. Los otros dos caminos —«↻
Regenerar» y la edición rápida de normas— sí lo hacían: se quedó fuera solo en
el que más se usa.

**2 · El backend no pasaba el teléfono.** Lo guardaba en el CRM y lo usaba para
el correo de aviso, pero no lo metía en el objeto `cli` que reciben los
documentos.

**3 · El PDF recibía el cargo y no lo imprimía.** La ficha ponía solo
`cli.contacto`. La oferta iba dirigida a un nombre sin decir qué papel ocupa esa
persona en la empresa.

Ahora la ficha del PDF muestra:

```
PERSONA DE CONTACTO    Consoli Sánchez · Directora
CORREO DE CONTACTO     c.sanchez@adf-formacion.es
```

El correo como línea propia, porque es el dato que se comprueba antes de enviar
la oferta.

## El PowerPoint no mostraba la persona de contacto

Ni con cargo ni sin él: la ficha de datos de la slide llevaba cliente, CIF,
modelo y dedicación, pero no a quién va dirigida. Es lo primero que mira quien
recibe la presentación —si va a su nombre o al de otro—. Añadida con el mismo
formato que el PDF.

## Verificado

Generado el PDF con los datos reales de la oferta OFE-2026-S8LXA: nombre, cargo
y correo aparecen los tres.

---

# v231 · Ver como otro perfil, y aceptar una oferta por indicación del cliente

## 1 · «Ver como» disponible para Administración

Antes solo lo tenía Superadministración. Administración es quien resuelve las
dudas del equipo, y para responder a «a mí no me sale ese botón» hay que poder
mirar lo que ve esa persona.

**Con un límite: nadie puede verse como un rol superior al suyo.** La lista de
vistas se calcula desde la jerarquía, así que Administración ve como director,
consultor, gestión o cliente, pero **nunca como superadministrador**.

No es cosmético: hay muchas comprobaciones que usan el rol efectivo, y si
Administración pudiera ponerse en vista de superadministrador, esas
comprobaciones la tratarían como tal. La suplantación sirve para bajar de nivel
y comprobar qué se ve, nunca para subir.

`realRole` sigue mandando en la seguridad: la suplantación es visual.

La barra ya no ofrece botones que no funcionan —antes listaba `superadmin` para
todos— y muestra «Tu vista · Administración» en lugar de dar por hecho que quien
mira es superadministrador.

## 2 · Aceptar la oferta desde el histórico

El cliente casi nunca acepta pulsando un botón: lo dice por teléfono, por correo
o en una reunión. Sin una acción para registrarlo, **una oferta aceptada de
verdad se quedaba en «emitida» para siempre**, y sin ese estado no se podía
generar el contrato ni, por tanto, abrir el proyecto. El flujo estaba cortado en
el primer paso.

Botón **«✓ El cliente la acepta»** en cada oferta del histórico. Pide
confirmación explícita —*«queda registrado que la das por aceptada tú, con la
fecha de hoy»*— porque es una afirmación sobre la voluntad de un tercero.

Una vez aceptada aparece el distintivo con la fecha, el botón de generar
contrato, y un **«deshacer»** discreto para el caso de haberla marcado por error.

Las ofertas rechazadas, anuladas o caducadas no ofrecen aceptar: si el cliente
cambió de opinión, lo limpio es emitir una nueva.

Con el contrato generado, el alta del proyecto ya funcionaba: cuelga de él, como
debe ser.

## Migración `v101`

`aceptada_en` y `aceptada_por` en `presupuestos`. Si mañana hay discrepancia
sobre si el cliente aceptó, «lo pone en el sistema» no es respuesta si no se sabe
quién lo puso.

En el relleno de lo ya aceptado se usa la fecha de última modificación —no se
sabe la real— y `aceptada_por` se deja **vacío**: atribuir a alguien una acción
que quizá no hizo es peor que no saberlo.

---

# v232 · Un proyecto nace siempre de una oferta aceptada

## La regla

Tres cambios que son el mismo principio: **si no hay oferta aceptada, no hay
proyecto y no hay planificación**. No es burocracia: es lo que permite responder
a «¿por qué hacemos este trabajo y a qué precio?» sin depender de que alguien se
acuerde.

## 1 · El alta solo parte de ofertas aceptadas

`AltaProyecto` se ha reescrito. Antes se podía abrir un proyecto eligiendo
empresa y tecleando las normas a mano; salían proyectos **sin precio, sin
alcance pactado y sin nada que enseñar** si el cliente discutía qué se había
contratado. Fue así como apareció el proyecto de la Fundación con «—» en Normas
y Modelo.

Ahora hay un desplegable de ofertas aceptadas:

```
OF-A · Metalúrgica Norte · 9001 + 14001 · Compromiso · 1.378 €/mes · contrato CT-2
```

Y cuando no hay ninguna, lo dice y explica qué hacer: ir al histórico y marcar
«El cliente la acepta».

## 2 · Los sistemas y el modelo se vuelcan solos

Al elegir la oferta se traen **normas, modelo, fechas, meses y precio**, y se
enseñan en solo lectura: se ven para saber qué se está abriendo, no para
cambiarlos ahí. Volver a elegirlos a mano es la forma de que acaben sin coincidir
con lo que se firmó.

El precio va al campo correcto según el modelo: en Apoyo o Implantación a
`precio_total`, en los recurrentes a `precio_mes`.

Solo quedan editables el **nombre** y las **fechas**, que sí pueden ajustarse al
arrancar.

## 3 · «Aceptada» incluye el contrato firmado

Una oferta con contrato firmado cuenta como aceptada **aunque su estado siga en
«emitida»**: si se firmó, se aceptó. Si no, un despiste al marcar el estado
bloquearía un proyecto que ya está contratado.

Tampoco se ofrecen las que ya tienen proyecto: duplicarlo generaría dos
proyectos cobrando lo mismo y nadie sabría cuál es el bueno.

## 4 · El planificador filtra

Solo aparecen los proyectos con oferta aceptada detrás. Planificar reparte horas
y compromete al equipo: hacerlo sin alcance ni precio pactados es trabajar a
ciegas.

**Los excluidos no se ocultan sin más**: aparecen en un desplegable con su
motivo —«creado sin oferta» o «su oferta aún no está aceptada»—. Un proyecto que
desaparece sin explicación se interpreta como un fallo, y alguien acaba
creándolo otra vez.

## Verificación

`scripts/test-proyecto-desde-oferta.mjs`: qué cuenta como aceptada (estado y
contrato firmado), exclusión de emitidas, rechazadas y las que ya tienen
proyecto, acotado por CIF en formatos distintos, volcado de normas y modelo, y
que el precio caiga en `precio_mes` o `precio_total` según el modelo.

---

# v233 · Una migración pendiente ya no tumba la operación entera

## Lo que pasó

```
No se pudo marcar como aceptada:
Could not find the 'aceptada_por' column of 'presupuestos' in the schema cache
```

Falta la migración **v101**. Pero el fallo real es otro: **no debería haber
impedido aceptar la oferta**. El campo que importa es `estado`, y ese sí se
podía escribir; `aceptada_por` es trazabilidad, un dato accesorio.

## `updateRow` ahora reintenta

`insertRow` ya retiraba la columna ausente y volvía a intentarlo. `updateRow`
no, así que cualquier migración sin aplicar tumbaba la operación completa.

Ahora quita el campo que falta y reintenta con el resto, recursivamente por si
falta más de uno. Si no queda nada que guardar, propaga el error: reintentar en
vacío sería fingir que se guardó.

Devuelve `_camposOmitidos`, y la interfaz lo dice sin ambigüedad:

> Oferta marcada como aceptada (sin registrar aceptada_por: falta aplicar la
> migración v101). Ya puedes generar el contrato.

Queda claro que el trabajo siguió **y** que hay algo pendiente. Ocultarlo sería
peor: nadie aplicaría la migración y la trazabilidad se perdería en silencio.

## Y el mensaje pasa por el traductor

`ContratoDeOferta` mostraba `e.message` en crudo. Ahora usa `explicarErrorBd()`,
que ya traduce este caso a «falta aplicar una migración, o recargar el esquema».

## Verificado

Reintento con una columna ausente, con dos, con ninguna, y el caso en que no
queda nada que guardar.

---

# v234 · Corregida la migración v101

```
ERROR: 42703: column "updated_at" does not exist
LINE 26:   set aceptada_en = coalesce(updated_at, creado)
```

Escribí el relleno suponiendo que `presupuestos` tenía `updated_at`. **No lo
tiene**: solo `creado`. La tabla se creó sin columna de modificación y ninguna
migración se la ha añadido.

## Corregido, y con la consecuencia dicha

El relleno usa `creado`, que es lo único verificable. Y queda escrito en la
propia migración lo que eso significa:

> Para las ofertas ya aceptadas antes de esta migración, `aceptada_en` es la
> fecha de emisión, no la de aceptación. De las nuevas en adelante sí será la
> real.

`aceptada_por` se deja vacío en el relleno: atribuir a alguien una acción que
quizá no hizo es peor que reconocer que no se sabe.

## Revisadas las demás

Verificadas contra el esquema real todas las columnas que usan los rellenos de
v92 a v101: `empresa_contactos.creado`, `proyectos_cliente.meses_estimados`,
`proyectos.fecha_auditoria`, `contratos.cliente_cif`, `clientes.cif`,
`presupuestos.fecha_inicio`… **Existen todas.** El de `updated_at` era el único
caso.

---

# v235 · El histórico de estados no se podía escribir

```
new row violates row-level security policy for table "presupuesto_estados"
```

## La causa, y su alcance real

La v82 creó `presupuesto_estados` con RLS activado y **solo una política de
SELECT**. El trigger que escribe el histórico —`registrar_estado_presupuesto()`—
no es `security definer`, así que el INSERT se ejecuta con los permisos de quien
guarda, y la política lo rechaza.

**No fallaba solo «aceptar»: fallaba cualquier cambio de estado.** Rechazar,
anular y caducar estaban rotos exactamente igual; simplemente no se habían
usado. La función `caducar_ofertas()` tampoco podía funcionar.

## La corrección

La función pasa a `security definer`, con `search_path` fijado —conviene en toda
función con permisos elevados, para que no dependa del esquema de quien la
llame—.

**No se añade una política de INSERT**, que era la otra salida. Si la hubiera,
cualquiera con sesión podría meter filas falsas en el histórico directamente. Un
registro de auditoría que el propio auditado puede escribir a mano no sirve de
nada. Así solo escribe el trigger.

## Y de paso, la v101 duplicaba trabajo

Al mirar la v82 apareció que ya creaba `estado`, `estado_en`, `estado_por`,
`aceptada_en`, `rechazada_en` y `valida_hasta`, y que el trigger **ya rellenaba
`aceptada_en` solo**. Mi v101 las volvía a añadir.

Reescrita: solo aporta `aceptada_por`, que es lo único que faltaba de verdad.

## Revisados los demás triggers

Barrido de todas las funciones de trigger que insertan en tablas con RLS sin ser
`security definer`: 35 tablas con RLS, **un solo caso**, el corregido.

---

# v236 · Integridad del flujo oferta → contrato → proyecto

## 1 · Los datos de empresa y persona dejan de ser editables fuera de su ficha

Era el punto con más riesgo. En la edición de una oferta se podían cambiar
empresa, CIF, nombre, cargo, correo y teléfono. Cada oferta acababa con su
propia versión: se corregía el CIF ahí, seguía mal en el CRM, y el siguiente
documento volvía a salir con el equivocado.

Nuevo `components/DatoEspejo.jsx`. Esos campos se muestran en **solo lectura**,
con enlace a donde sí se editan:

- empresa, CIF, dirección → ficha de **Empresa**
- nombre, cargo, correo, teléfono → ficha de **Contacto**

Para cambiar a qué persona va dirigida sigue estando el desplegable; para
corregir sus datos, su ficha. **Un solo origen, y todos los sitios lo leen**: es
la única forma de que la bidireccionalidad sea real.

### Lo que se emitió no cambia solo

El valor guardado en la oferta **se conserva**: es lo que se imprimió y lo que
tiene el cliente. Si difiere del CRM se avisa, agrupado:

> 2 datos no coinciden con la ficha del CRM
> · CIF: aquí «B8779568», en el CRM «B87795688»
> El documento se emitió con los valores de la izquierda y no se cambian solos:
> alterarlos ahora haría que el PDF que tiene el cliente dejara de coincidir.
> Si el CRM es lo correcto, regenera el documento; si no, corrige la ficha.

Cambiarlos automáticamente habría sido peor: el PDF en manos del cliente diría
una cosa y el sistema otra, sin que nadie lo supiera.

## 2 · El contrato incorpora las condiciones de la oferta

Decía «el alcance es el del Anexo I de la propuesta aceptada», pero la propuesta
es **otro documento**: quien firma solo tiene delante el contrato. Si mañana hay
discusión sobre qué se pactó, remitir a un PDF que quizá no se guardó es una
respuesta débil.

Ahora el contrato reproduce las cláusulas y las condiciones económicas de la
oferta, generadas por la **misma función** (`contenido-oferta.mjs`), así que no
pueden divergir: si cambia una condición, cambia en los dos documentos.

El contrato pasa de 4 a 5 páginas.

## 3 · Vigencia desde el inicio del proyecto

> El contrato entra en vigor el 01 de octubre de 2026, fecha de inicio del
> servicio según la propuesta aceptada, y tiene una duración de doce meses,
> hasta el 02 de octubre de 2027.

Antes contaba desde la firma. Se firma antes de empezar —a veces con semanas de
margen— y contar desde ahí **acortaba el servicio contratado**: doce meses desde
la firma terminan antes que doce desde el arranque.

## 4 · La fecha de certificación ya no bloquea el alta

Exigirla obligaba a inventarse una fecha, y eso es peor que no tenerla: los
avisos de 30 y 60 días saltarían contra un dato falso.

El proyecto se abre igual, el campo queda marcado como opcional, y al guardar se
dice qué falta: *«Sin fecha de certificación: añádela cuando la reserves para
activar los avisos de vencimiento.»*

## Pendiente para el siguiente turno

Los dos últimos puntos son una funcionalidad nueva completa y prefiero hacerlos
con cuidado que a medias:

- **Que cada cliente suba certificados y documentos** — necesita almacenamiento,
  políticas de acceso por cliente y una pantalla en el portal.
- **Que una IA lea cada documento y escriba una nota de ayuda** — encima de lo
  anterior, con la llamada al modelo y el coste asociado.

---

# v237 · Documentos del cliente y lectura por IA

## Dos tablas, no una

`cliente_documentos` y `documento_notas` van separadas **a propósito**, y no como
una columna `nota` dentro de la primera.

Si la nota viviera junto al documento, cualquier consulta del cliente que
trajera la fila entera se la llevaría con ella. Separarlas hace que la política
de acceso sea simple y difícil de romper por descuido.

| | Quién lo ve |
|---|---|
| **Documentos** | El equipo, todos. El cliente, los suyos |
| **Notas de IA** | **Solo el equipo**, ni siquiera el cliente dueño del documento |

## El depósito es privado

Al contrario que el bucket `ofertas`, que es público porque esos PDF se envían
por correo igualmente. Aquí hay escrituras, pólizas y certificados con CIF y
domicilio: se sirven con **enlaces firmados que caducan en una hora**, generados
por el backend. No hay política de lectura directa, así que nadie descarga
saltándose la firma.

## Quién puede qué

- **Subir**: el equipo y el propio cliente en su ficha. Queda marcado
  `subido_por_cliente`, porque no es lo mismo un certificado que aporta el
  cliente que uno que hemos verificado nosotros.
- **Editar**: solo el equipo.
- **Borrar**: solo dirección. Un cliente que pudiera borrar el certificado que
  aportó dejaría el expediente incompleto sin rastro.

## La nota de IA: extracción, no descripción

Como dijiste que sirve para saber alcances, fechas, CIF real y sedes, no se le
pide una descripción sino **datos estructurados**:

```
Razón social · CIF · Norma · Emisor · Nº de certificado
Alcance (literal)
Sedes
Validez: desde → hasta
Avisos: caducado, alcance distinto del esperado, CIF que no cuadra…
Confianza: alta | media | baja
```

Tres decisiones:

- **Se pide que deje en null lo que no aparezca.** Un hueco es mucho más útil
  que una suposición, porque estos datos se usan para verificar el expediente.
- **La confianza se guarda y se muestra.** Una lectura de un escaneo torcido no
  vale lo mismo que la de un PDF limpio, y quien la use debe saberlo.
- **Los datos extraídos NO se escriben solos en la ficha**: se proponen. Una
  fecha de caducidad mal leída activaría avisos falsos.

Y al pie de cada nota: *«Lectura automática. No se muestra al cliente y puede
contener errores: contrasta los datos antes de usarlos en una oferta o un
contrato.»*

Word no se analiza: el modelo no lo lee directamente, y se dice en vez de fingir
un análisis. PDF e imágenes sí.

## Dónde está

- **Equipo**: pestaña «Documentos» en la cartera de la ficha de empresa.
- **Cliente**: pestaña «Mis documentos» en su portal.

Con aviso arriba de los certificados caducados o a menos de 60 días de caducar:
de eso depende que el cliente siga acreditado.

## Hace falta configurar

`ANTHROPIC_API_KEY` en las variables de entorno de Netlify. Sin ella todo
funciona salvo el botón de analizar, que lo dice en vez de fallar en silencio.

## Verificación

`scripts/test-documentos.mjs`: los cinco roles del equipo ven documentos y notas,
el cliente ve sus documentos pero **no** las notas, no ve los de otro cliente, no
puede subir a fichas ajenas ni borrar lo que aportó, y el cálculo de caducidad en
sus cuatro tramos.

---

# v238 · Corregido el identificador del modelo

En `documentos.mjs` puse `claude-sonnet-4-6`, que **no existe en el catálogo
actual**. Las llamadas habrían devuelto un 404 (`not_found_error`).

Corregido a **`claude-sonnet-5`**, y ahora se puede sobreescribir con la variable
`MODELO_DOCUMENTOS` sin tocar código: los modelos se renuevan y no conviene tener
que reeditar la función cada vez.

Por qué Sonnet y no otro: Opus sería más caro sin ganar nada en una extracción de
datos tan acotada, y Haiku falla más con escaneos torcidos, que es justo el caso
difícil de un certificado antiguo.

---

# v239 · La cartera de proyectos, con datos unificados

## Lo que pasaba

Los datos de un proyecto viven repartidos en cuatro tablas:

| | |
|---|---|
| `proyectos_cliente` | nombre, estado, fechas y una **copia** de normas y modelo |
| `clientes` | la ficha operativa: razón social |
| `empresas` | el CRM: **nombre comercial** |
| `presupuestos` | la oferta: el alcance y el modelo **pactados** |

De ahí los dos síntomas: se enseñaba la razón social de `clientes` en vez del
nombre comercial, y normas y modelo salían vacíos porque esa copia nunca se
rellenó en los proyectos creados antes de que el alta partiera de una oferta.

## Nuevo `lib/proyectoResuelto.js`

Cruza las cuatro en un solo sitio, con una regla clara: **la oferta manda**.

- **Nombre comercial** de la empresa del CRM; si no lo tiene, la razón social.
  La empresa se localiza por CIF normalizado —`b-84.867.670` cruza con
  `B84867670`— y, si no hay CIF, por razón social.
- **Normas y modelo** de la oferta, llegando por `oferta_id` o a través del
  contrato.
- El **número de oferta** bajo el nombre del proyecto, para poder rastrearlo.

En la tabla, la razón social aparece bajo el nombre comercial **solo si
difiere**: repetirla en cada fila es ruido, pero cuando no coincide hace falta
verla.

## Un ajuste a mano no se pisa: se avisa

Si el proyecto tiene su propia copia y **no coincide** con la oferta, se marca
con `≠ oferta` en vez de corregirlo. Puede ser deliberado —se amplió el alcance
sin reemitir— y sobreescribirlo borraría esa decisión sin dejar rastro.

## Migración `v103`

Rellena el alcance de los proyectos existentes desde su oferta, **solo los que
están vacíos**, por el mismo motivo.

Y reconstruye el vínculo `oferta_id` de los proyectos huérfanos, pero solo en
los casos **inequívocos**: un cliente con exactamente una oferta aceptada y
exactamente un proyecto. Con dos de cualquiera de los dos no hay forma de saber
cuál va con cuál, y adivinar dejaría trazabilidad falsa, que es peor que no
tener ninguna.

Incluye la vista `v_proyectos_cartera` con el cruce ya hecho, para informes.

## De paso

La búsqueda de la tabla ahora encuentra también por **razón social, CIF y número
de oferta**: quien teclea «B848…» o «OFE-2026-…» espera dar con su proyecto.

## Verificación

`scripts/test-cartera-proyectos.mjs`: nombre comercial con CIF en formatos
distintos, caída a razón social cuando no hay comercial, cliente sin ficha en el
CRM, normas desde la oferta y desde el contrato, detección de desfase sin
sobreescribir, proyecto sin oferta, y los casos nulos.

---

# v240 · Corregida la v103, y Daniela Jiménez en el equipo

## El error de SQL

```
ERROR: 0A000: DISTINCT is not implemented for window functions
LINE 26:  count(distinct p.id) over (partition by p.cliente_id)
```

PostgreSQL no admite `DISTINCT` dentro de una función de ventana. Escribí las
dos condiciones —un solo proyecto por cliente, una sola oferta aceptada— en la
misma consulta, y una de ellas necesitaba una ventana.

Reescrito con **dos CTEs separadas** que cuentan cada cosa por su lado y se
cruzan al final. El resultado es idéntico y además se lee mejor.

## Daniela Jiménez, en el Team

Se recrea la sección «Team», retirada en v220 al quedarse sin nadie.

- **Técnico de Calidad**
- Ingeniera Industrial y Máster en Gestión Integral de la Calidad
- ISO 9001, control documental, auditorías internas y mejora continua
- Enlace a su LinkedIn

Foto recortada del original en las dos medidas habituales: 330×360 para la ficha
y 400×400 cuadrada para avatares.

Versión inglesa incluida, con la descripción traducida y no copiada.

### Lo que NO se publica

El CV traía **teléfono y correo personales**. No van a una página pública
indexada: ni el teléfono, ni el correo, ni la dirección. Comprobado en el
archivo generado.

Tampoco el detalle de su historial laboral. La ficha resume su perfil
profesional, que es lo que corresponde a una página de equipo; el CV completo es
documentación interna.

---

# v241 · Volcado de tareas del modelo y programación por tarea

## 1 · Las tareas del modelo se vuelcan

`tareas_catalogo` guarda, por norma y modelo, qué tareas se hacen: el trabajo
acumulado de la casa. Tenerlo y teclearlo a mano en cada proyecto no tenía
sentido.

Botón **«↓ Volcar tareas del modelo»**. Primero **enseña lo que va a entrar** y
luego se confirma: cuarenta tareas de golpe sin verlas antes son difíciles de
deshacer.

```
14 tareas del modelo Compromiso · 47 h previstas
  9001 · 8 tareas · 26 h
    · REVISION — Revisión por la dirección
    · AUDITOR — Auditoría interna
  14001 · 6 tareas · 21 h
```

Tres reglas:

- **Nunca se mezclan normas.** Tres sistemas son tres contextos y tres juegos de
  tareas independientes; una tarea de la 14001 no aparece en el contexto de la
  9001 aunque se parezcan.
- **No duplica.** Volcar dos veces no crea dos copias: se comparan los títulos
  ignorando acentos y espacios, porque «Auditoría interna» y «AUDITORIA
  INTERNA» son la misma tarea.
- **Entran sin fecha y sin responsable.** Eso lo decide una persona, tarea a
  tarea. Las horas del catálogo sí se traen como duración prevista.

Si el catálogo no tiene tareas para ese modelo, se dice y se indica dónde
añadirlas, en lugar de no hacer nada aparentemente.

## 2 · Pantalla emergente para programar

El campo de fecha suelto se queda corto: una fecha sin responsable no está en la
agenda de nadie. El botón abre un diálogo con **fecha, hora, duración,
responsable y notas**.

Y muestra **qué tiene ya ese consultor ese día**:

> Fátima Ballesteros ya tiene 3 tareas ese día · 6,5 h

No bloquea —a veces se solapan a propósito— pero programar a ciegas es como se
acaba con tres visitas el mismo martes.

También avisa si la fecha cae en fin de semana, sin impedirlo: hay auditorías en
sábado.

## 3 · Al calendario del consultor, sin sincronizar nada

En cuanto la tarea tiene fecha y responsable **aparece en la agenda de esa
persona**. No hay proceso de sincronización porque no hace falta: el planificador
y la agenda leen y escriben la misma tabla, `tareas_programadas`. Una tabla, una
verdad.

## 4 · Cerrar tareas del pasado

Hace falta ahora, cargando proyectos que ya estaban en marcha: hay tareas de hace
meses que se hicieron.

Botón **«✓ Ya está hecha»**, activo solo si la fecha es de hoy o anterior. Con
fecha futura está deshabilitado: sería registrar trabajo que aún no ha ocurrido.

Y **se registra con la fecha de la tarea, no con la de hoy**. Fechar hoy una
tarea de marzo falsearía el histórico y rompería el planificado-frente-a-real.
Se puede indicar las horas reales dedicadas.

## Verificación

`scripts/test-volcado-tareas.mjs`: que no se mezclan normas, que solo entra el
modelo del proyecto, que no duplica comparando sin acentos, la fila resultante
sin fecha ni responsable, el resumen con horas, el aviso cuando el modelo no
tiene tareas, y que solo se pueden cerrar tareas de hoy o anteriores.

---

# v242 · Paquete completo, con la versión al día

`package.json` estaba en `221.0.0` desde que se introdujo el sello de versión.
Actualizado a **`241.0.0`**: el pie de la aplicación y los informes de error
mostraban un número anterior al del código, que es exactamente lo que el sello
venía a evitar.

## Comprobado antes de empaquetar

- `buscar-efectos.py` — 0 efectos con retorno peligroso
- `buscar-tdz.py` — 0 casos reales (5 avisos, todos texto dentro de mensajes)
- Las diez baterías de prueba, sin fallos:
  volcado de tareas · cartera de proyectos · documentos · permisos ·
  precio por sistemas · guardado de ofertas · proyecto desde oferta · lote ·
  cliente-empresa · VIES
- Compilación limpia

## Al desplegar

En el pie debe leerse **v241.0.0**. Si dice otra cosa, el despliegue no llegó.

---

# v243 · Sesiones de tarea: horas planificadas frente a comprometidas

## La pieza que faltaba

Una tarea tenía UNA fecha y UNA duración. El trabajo real no es así: una
auditoría de 8 horas se hace en dos mañanas.

**Migración `v104`** con la tabla `tarea_sesiones`: cada vez que alguien se
sienta a hacer una tarea, con fecha, hora de inicio y fin y responsable. Las
horas se calculan solas en la base —columna generada— y se suman.

Y `horas_teoricas` en la tarea: **lo que el modelo dice que cuesta, y no se
edita**. Si se pudiera cambiar, la desviación se «arreglaría» moviendo el
objetivo y la comparación no diría nada.

Las sesiones aceptan colgar de `cliente_tareas` o de `tareas_programadas` —hay
dos tablas de tareas en paralelo— con un check que garantiza que cuelgan de una
sola. Unificarlas ahora obligaría a migrar datos con el sistema en uso.

## En el panel

- **Las horas se vuelcan con las tareas.** El botón pasa a ser «Volcar N tareas
  al proyecto»: entran con sus horas del modelo y **sin fecha**.
- **Las horas de cada tarea son un botón** que abre la programación, y debajo se
  lee lo planificado: `12 h` / `7 h en 2 ses.`, en color según la desviación.

## El diálogo

Tres cifras arriba: **comprometidas · planificadas · ejecutadas**. Las
comprometidas se muestran como dato, no como campo.

Debajo, las sesiones. Cada una con fecha, horas, responsable y su estado. Se
añaden las que hagan falta y se pueden dar por hechas cuando la fecha ha
llegado.

**Avisa de dos cosas sin impedirlas:**

- **Sesiones después de la certificación**, en rojo: ese trabajo no llega a la
  auditoría. No se bloquea porque a veces el seguimiento posterior se planifica
  a propósito.
- **Solapes**: si ese consultor ya tiene algo a esa hora ese día.

## Fuera «Distribuir agenda»

Volcaba las tareas al calendario de golpe, sin que nadie decidiera cuándo ni con
qué horas. **La agenda se llena sola al programar una sesión**, que es cuando
hay una decisión real detrás.

## Verificación

`scripts/test-sesiones.mjs`: cálculo de horas incluidos los casos inválidos,
suma de varias sesiones excluyendo anuladas, los cuatro estados de desviación
con su margen, que las teóricas no cambian nunca, detección de sesiones tras la
certificación, y solapes por consultor y día.

## Pendiente

El **panel del consultor** con horas y tareas ejecutadas / planificadas /
comprometidas. Las vistas de base de datos ya están hechas
(`v_consultor_carga`, `v_tareas_horas`, `v_cliente_tareas_horas`); falta la
pantalla.

---

# v244 · Preparado el logo del 20 aniversario, y mejoras de estética

## El logo: preparado, no aplicado

**Los archivos del 20 aniversario no están en el proyecto.** Según el brief viven
en OneDrive (`MARKETING/IMAGEN CORPORATIVA/TUCONSULTOR/LOGO/`), pero aquí no hay
ninguno.

He preparado `scripts/logo-20-aniversario.py`, que hace la sustitución completa
—**898 referencias en 301 páginas**— en una sola ejecución. Comprueba primero que
los archivos existan y, si falta alguno, **no toca nada**: dejar la web con rutas
a ficheros inexistentes es peor que no haber empezado.

Los nombres que espera en `web/marca/`:

| Archivo | Para |
|---|---|
| `20a-horizontal-solido.svg` | fondos claros (cabecera) |
| `20a-horizontal-blanco.svg` | fondos oscuros (pie) |
| `20a-horizontal-solido.png` | datos estructurados de Google |
| `20a-isotipo-solido.svg` | usos pequeños |
| `20a-isotipo-solido.png` | ídem |

El script además **sube las alturas fijas un 20 %**: el lockup del aniversario
lleva el isotipo al 180 % y el bloque del «20» debajo, así que con la altura
actual se vería aplastado.

## Estética

**Escala tipográfica fluida.** Los cuatro tamaños grandes pasan a `clamp()`: el
texto crece con el viewport en lugar de saltar en cada punto de ruptura. En un
portátil de 1280 px un titular pensado para 1920 se veía desproporcionado. Los
extremos son los valores que ya había, así que el diseño no cambia en móvil ni
en pantalla grande, solo el camino entre ambos.

**Aire entre secciones proporcional.** Con valores fijos, en móvil las secciones
se pegan y en pantallas grandes queda un hueco muerto.

**Las tarjetas reaccionan al puntero.** No lo hacían: en una rejilla de tarjetas
que además son enlaces, una respuesta discreta dice cuál se va a pulsar sin
tener que fijarse en el cursor. Con `prefers-reduced-motion` respetado.

**Subrayado de enlaces en prosa** con `skip-ink`, para que la línea no atraviese
las jotas y las ges, y en un tono más suave que se intensifica al pasar por
encima.

**Ninguna imagen desborda ni provoca salto de maquetación.** Los logos SVG de la
cabecera no llevaban `width:auto`, así que reservaban 300 px hasta cargar y la
cabecera daba un salto visible.

## Lo que necesito

Los cinco archivos del logo, en **monocromo sólido** (negro o el azul `#0F1730`
del manual) y **blanco sólido**, preferiblemente SVG. Déjalos en `web/marca/`
con esos nombres y el script hace el resto.

---

# v245 · El catálogo de tareas: lo leen todos, lo edita Administración

## Lo que había

La pantalla «Sistemas de gestión» **no comprobaba permisos en absoluto**, y la
política de base de datos era una sola:

```sql
create policy tareas_catalogo_team_all on tareas_catalogo for all
  using (es_equipo()) with check (es_equipo());
```

Cualquiera del equipo podía cambiar las horas de cualquier tarea. Y esas horas
no son un dato de trabajo cualquiera: **alimentan el motor de precios**. Cambiar
las de «Auditoría interna» en modelo Compromiso mueve el importe de todas las
ofertas que se estén preparando en ese momento. Es una decisión de negocio, no
de ejecución.

## Ahora

| | Dirección de proyecto · Consultoría · Gestión | Administración · Superadministración |
|---|---|---|
| Ver el catálogo | Sí | Sí |
| Editar horas | No | Sí |
| Añadir o quitar tareas | No | Sí |

La pestaña **se abre también a consultoría y gestión**, que antes ni la veían:
saber qué tareas define cada modelo es parte del trabajo diario.

## Dos detalles

**`readOnly`, no `disabled`.** Un campo deshabilitado no se puede seleccionar ni
copiar, y esta pantalla se consulta: alguien querrá copiar el nombre de un
subproceso. Con `readOnly` se lee y se copia, pero no se cambia.

**Se dice el motivo**, en lugar de dejar los campos apagados sin explicación:

> Estas horas fijan el precio de las ofertas, así que solo las modifica
> Administración.

## Migración `v105`: la barrera de verdad

La comprobación de la interfaz sola no vale: estas tablas se pueden tocar desde
cualquier cliente con la sesión del usuario. Las políticas se separan en lectura
(todo el equipo) y escritura (Administración).

Se protege también `normas_catalogo`: si las horas están cerradas pero cualquiera
puede añadir o retirar una norma, la protección se rodea por el otro lado.

## Verificación

`scripts/test-permisos.mjs` ampliado: los seis roles con sus dos permisos, que
dirección, consultoría y gestión ven pero no editan, que el cliente ni ve, y que
la pestaña aparece para quien puede leerla.

---

# v246 · Equipo por proyecto, y una sola pantalla de proyectos

## 1 · El equipo se asigna al proyecto, no al cliente

Antes los consultores colgaban de `clientes`: un cliente, un equipo fijo. Pero
un mismo cliente puede tener una implantación de ISO 27001 con el especialista
en seguridad y un mantenimiento de 9001 con otra persona. Con el equipo atado al
cliente, o se ponía a los dos en todo, o uno no veía su trabajo.

**Migración `v106`** con `proyecto_equipo`: quién trabaja en qué proyecto, con
qué papel —responsable, consultor, apoyo— y con cuántas horas asignadas.

- **Un solo responsable por proyecto**, garantizado por índice único: con dos, no
  hay ninguno. Si se nombra a otro, el anterior baja a consultor solo.
- **Asignar equipo es de dirección**: reparte carga de otras personas y
  compromete su agenda.
- El bloque va **antes** de las normas en la ficha: al planificar, lo primero
  que se decide es quién lo lleva.
- Se avisa de las horas sin repartir, comparando con lo comprometido.

La migración trae lo que ya había: quien llevaba el cliente pasa a llevar sus
proyectos. Solo se migra a quien tenga cuenta de usuario; un consultor sin
usuario no puede ver un panel, así que asignarlo no serviría de nada.

## 2 · «Mis proyectos» en el panel del consultor

Sale de `proyecto_equipo`, **no de las tareas que ya tenga**, que sería circular:
sin tareas no vería el proyecto, y sin ver el proyecto no puede programarse
tareas.

Con las seis cifras: **horas y tareas comprometidas, planificadas y ejecutadas**.

- **Comprometidas** salen del catálogo del modelo: es lo que se ofertó, no lo
  que alguien haya planificado después.
- **Planificadas** son las sesiones en calendario, excluidas las anuladas.
- **Ejecutadas**, las cerradas.

Cada proyecto lleva una barra que muestra lo planificado sobre lo comprometido,
con lo ejecutado dentro: un número dice cuánto, la barra dice si vas justo. Y
arriba, cuánto queda sin programar.

Ordenados por fecha límite más cercana.

## 3 · Una sola pantalla de proyectos

Cartera y panel eran dos pantallas sobre los mismos proyectos: una con la tabla,
otra con las cifras. Se entra a mirar «cómo va esto» y había que acordarse de en
cuál estaba cada cosa. Ahora es **una, con dos vistas**.

## 4 · Fuera el planificador de proyectos

Repartía las tareas por el calendario automáticamente. Programar es una decisión
de quien va a hacer el trabajo, y eso se hace ahora tarea a tarea con sus
sesiones.

Las rutas viejas **redirigen** en lugar de dar 404: hay enlaces guardados en
marcadores y en correos.

---

# v247 · «EquipoProyecto is not defined» y el detector que faltaba

## El fallo

Al insertar `<EquipoProyecto>` y `<DashboardProyectos>` en la ficha de proyecto,
**los dos `import` no llegaron a escribirse**. El JSX quedó usando componentes
que no existían.

Lo que lo hace peligroso: **esbuild no lo detecta**. Compila sin una sola queja
y revienta en el navegador con «X is not defined», y solo cuando alguien entra
en esa pantalla concreta. El build salía en verde con la aplicación rota.

Corregido. Es la segunda vez que pasa, así que:

## `scripts/buscar-imports.py`

Recorre los `.jsx` y busca componentes usados en JSX que no estén importados ni
definidos en el propio archivo. Devuelve código de error, así que puede
encadenarse antes de empaquetar.

Los dos primeros avisos que dio eran **texto dentro de comentarios**: «la
calculadora viva es `<GeneradorOfertas>`» y «PR-`<PREFIJO>`-NN». El detector
ahora ignora comentarios de línea y de bloque, con cuidado de no confundir el
`//` de una URL con el de un comentario.

Sobre todo el proyecto: **cero casos**.

## Los tres detectores, juntos

| Script | Qué caza |
|---|---|
| `buscar-imports.py` | componentes usados sin importar |
| `buscar-efectos.py` | `useEffect` que devuelve algo que no es limpieza |
| `buscar-tdz.py` | variables leídas antes de declararse |

Los tres cazan errores que **compilan bien y fallan en producción**, que son los
que cuestan una ronda entera de ida y vuelta.

---

# v248 · Asignar sin horas, proyectos visibles y diagnóstico del catálogo

## 1 · Al asignar equipo ya no se piden horas

Retirado el campo. **Las horas se reparten al programar cada tarea**, que es
donde se sabe cuántas lleva y quién la hace; pedirlas al asignar obliga a
inventarse un número antes de tener la información.

Se conserva el dato de cuántas horas tiene comprometidas el proyecto, como
referencia.

## 2 · El consultor no veía sus proyectos, y el motivo era este

`<MisProyectos>` estaba en el **Dashboard**, pero la ruta índice del portal hace
esto:

```jsx
<Route index element={verPlanAgendaSist ? <Navigate to="mi-agenda" /> : <Dashboard />} />
```

Y `verPlanAgendaSist` incluye a **consultor, director, admin y superadmin**. Es
decir: todos ellos entran directos a la agenda y **nunca llegan al Dashboard**.
El componente estaba bien, pero en una pantalla que esas personas no visitan.

Movido a **Mi agenda**, junto al resumen de vencimientos. Un componente que
nadie ve es como no tenerlo.

## 3 · Por qué no salían las tareas

Revisado `tareasDeCliente()`: filtra por norma, por modelo **y por
`horas_base > 0`**. Ese tercer filtro es el que suele dejar la lista vacía, y no
se veía por ninguna parte.

Ahora, cuando no sale ninguna tarea, se dice el motivo con números:

```
El catálogo no da ninguna tarea para esta combinación
· 24 tarea(s) en el catálogo para 9001, 14001, 27001
· 0 de ellas en modelo Apoyo
· 0 con horas mayores que cero
Hay tareas para Compromiso, Implicación pero no para Apoyo.
Rellena esa columna en «Sistemas de gestión».
```

Distingue los tres casos: normas sin tareas, tareas en otros modelos, o tareas a
0 horas. «Tareas resultantes (0)» a secas parece un fallo del sistema, y lo
normal es que falten datos del catálogo.

---

# v249 · Volcado automático y diagnóstico de por qué no se ve un proyecto

## 1 · Las tareas se vuelcan al guardar la configuración

Antes había que guardar normas y modelo, y **luego pulsar otro botón** para traer
las tareas. Nadie lo hacía: se guardaba, se veía la lista de «Tareas
resultantes» y se daba por hecho que ya estaba. El proyecto se quedaba sin
tareas sin que nadie lo notara hasta mucho después.

Ahora es un solo gesto: **«Guardar y volcar tareas»**. Elegir normas y modelo
*es* definir el trabajo.

Las que ya existen no se tocan: volver a guardar completa, no duplica ni borra
lo que alguien haya ajustado a mano. El botón manual se queda para cuando se
añaden tareas al catálogo después.

## 2 · Cuando no hay proyectos, se dice cuál de los tres motivos es

«No tienes proyectos asignados» manda a buscar donde no está si lo que pasa es
que falta una migración. Ahora se distingue:

| Situación | Mensaje |
|---|---|
| La tabla no existe | «Falta aplicar la migración v106 en Supabase» + el error |
| No hay ninguna asignación en el sistema | «Todavía no hay ningún equipo asignado» |
| Hay asignaciones pero ninguna tuya | «Hay N asignaciones, pero ninguna es tuya» |

## 3 · Consulta de diagnóstico

`supabase/DIAGNOSTICO-consultor-no-ve-proyecto.sql`, solo de lectura. Cinco
comprobaciones en orden:

1. **Si existen las tablas nuevas.** Si falta alguna, ese es el problema y todo
   lo demás es consecuencia.
2. Los proyectos del cliente, con cuántas tareas y cuántas personas tienen.
3. **Quién está asignado y si puede verlo**: una persona sin cuenta activa puede
   estar asignada y no ver nada, porque no hay panel donde enseñárselo.
4. Los consultores del sistema antiguo, atados al cliente. Si aquí hay gente y
   en el punto 3 no, la v106 no llegó a migrarlos.
5. **Si el catálogo tiene tareas con horas** para ese modelo. Con `con_horas` a
   cero el volcado no trae nada: una tarea de 0 h no se programa.

---

# v250 · La causa era una tilde

## El diagnóstico lo dijo todo

```
· 331 tarea(s) en el catálogo para 9001, 14001, 27001
· 0 de ellas en modelo implantacion
Hay tareas para Relación, Implicación, Apoyo, Implantación, Compromiso
pero no para implantacion
```

El proyecto tenía **`implantacion`** y el catálogo **`Implantación`**. La
comparación era literal:

```js
.filter(t => t.modelo === modelo)
```

Un proyecto de implantación no encontraba **ninguna** de sus 331 tareas, y la
pantalla decía «0» sin que hubiera nada roto. Y lo mismo habría pasado con
`relacion`, `implicacion`… cualquier modelo con tilde escrito sin ella.

## Corregido en tres alturas

**En la comparación.** Nuevo `mismoModelo()`, que ignora tildes y mayúsculas.
Es lo que hace que funcione hoy, sin tocar ningún dato.

**Al guardar.** El modelo se escribe en su forma canónica: se guarda
«Implantación», no lo que hubiera. Así deja de arrastrarse.

**Migración `v107`**, que limpia lo ya guardado en proyectos, catálogo, tareas,
ofertas y contratos. No es imprescindible —la aplicación ya compara bien— pero
dejar el dato sucio significa que el próximo informe o vista que consulte por
SQL vuelva a tropezar con lo mismo.

## Las tareas entran solas

Fuera los botones. En cuanto la configuración está completa y el catálogo tiene
algo que aportar, **las tareas se vuelcan**. Elegir normas y modelo *es* definir
el trabajo; que además hubiera que pulsar algo dejaba proyectos sin tareas sin
que nadie lo notara.

Solo entra lo que falte, así que cambiar de modelo o añadir una norma completa
sin duplicar. Un `ref` impide que dos renders seguidos disparen dos volcados a
la vez.

El aviso largo con el desglose se reduce a una línea: con el volcado automático,
lo único que hay que saber es si falta rellenar el catálogo.

---

# v251 · La ficha del cliente, en dos pestañas

## Datos y Documentos

La ficha se había vuelto larga: contactos, datos fiscales, estructura del grupo,
homologación por normas, cartera comercial. Meter ahí los documentos la hacía
inmanejable.

Dos pestañas: **Datos del cliente** —todo lo que ya había— y **Documentos**.

## Con el análisis por IA

La pestaña de documentos incluye lo montado en la v237: subida, enlaces firmados
que caducan, y el botón **✦ analizar** que lee cada documento y extrae lo que
cuesta encontrar.

La nota no describe el documento, lo **desmenuza**:

```
Razón social · CIF · Nº de certificado · Validez
Alcance (literal)
Sedes
Avisos: el alcance no menciona los servicios contratados
Confianza: alta
```

Y sigue siendo **solo para el equipo**: la política de `documento_notas` no la
devuelve al cliente, y el componente ni siquiera la pide cuando quien mira es
cliente.

## Un detalle de datos

Los documentos cuelgan de `clientes`, no de `empresas`. La pestaña busca la
ficha operativa por CIF normalizado y, si no existe, lo dice —«se crea sola al
abrir su primer proyecto»— en vez de fallar al cargar.

---

# v252 · El proyecto hereda las normas y el modelo de su oferta

## El caso de CECE

Oferta en modelo **Relación** con **9001 + 14001 + 27001**. El proyecto apareció
con solo 9001 y modelo **Apoyo**.

Esos no son datos equivocados: son **los valores por defecto de la pantalla**.
El panel hacía esto:

```js
const ns = proyecto.normas || [];          // vacío → solo 9001
const m  = proyecto.modelo || 'Implicación';
```

Leía la copia guardada en el proyecto y, si estaba vacía, caía a los valores por
defecto. **Nunca miraba la oferta.** Y sin las normas correctas no hay tareas
que volcar, porque el catálogo se filtra justo por ahí.

## Corregido en tres sitios

**El panel** usa ahora `resolverProyecto()`, que ya tenía la regla escrita para
el resto de la aplicación: **manda la oferta**, la copia del proyecto es
secundaria. Y espera a que lleguen ofertas y contratos antes de resolver, porque
se cargan por separado y la primera pasada resolvería sin ellos.

**El alta** guarda el modelo en su forma canónica, para que la tilde perdida no
vuelva a dejar un proyecto sin tareas.

**Migración `v108`** para los proyectos ya creados. La v103 hacía este relleno
pero solo con la copia **vacía de verdad**; no cubría el caso de `{9001}` puesto
por defecto, que es exactamente lo que pasó aquí.

### Lo que la migración NO toca

Un proyecto con **más** normas que su oferta se deja como está: eso es una
ampliación deliberada —se añadió alcance sin reemitir— y sobreescribirla
borraría una decisión. La comprobación final del script las lista, para poder
revisarlas.

## Van juntas

`migraciones-v107-v108.sql`: la v108 usa una función que crea la v107, así que
en ese orden y en la misma transacción.

---

# v253 · «Cannot access before initialization», y el detector que no lo vio

## El fallo

El `useEffect` del volcado automático que añadí en la v250 quedó **antes** de
`candidatas`, la variable de la que depende:

```js
useEffect(() => { … }, [candidatas.length]);   // ← línea 243
const candidatas = useMemo(…);                  // ← línea 261
```

Lo que lo hace traicionero: **el array de dependencias se evalúa DURANTE el
render**, en el punto donde está escrito el `useEffect`, no cuando el efecto
corre. Leer `candidatas.length` ahí lanza el error antes de que exista.

Movido detrás, con una nota que explica por qué su posición importa.

## El detector no lo vio, y ahora sí

`buscar-tdz.py` solo miraba dentro de `useMemo`. Reescrito para cubrir los tres
sitios donde esto ocurre, que son los tres que han pasado de verdad:

| Caso | Ejemplo |
|---|---|
| Dentro de un `useMemo` | `vista[campo]` con `vista` más abajo (v218) |
| Una función declarada después | `nombreCli(id)` en un filtro (v218) |
| **Array de dependencias** | `[candidatas.length]` con `candidatas` abajo (este) |

También distingue el patrón **seguro** que antes daba falso positivo:
`useLote(lista, () => cargar())` no lee `cargar` ahora, sino cuando alguien
llame a esa función.

Y vacía cadenas y comentarios antes de analizar, para no confundir una palabra
dentro de un texto con una variable.

Sobre todo el proyecto: **cero casos**.

## Los tres detectores

```
imports   componentes sin importar: 0
efectos   efectos con retorno peligroso: 0
tdz       variables leídas antes de declararse: 0
```

Los tres cazan errores que **compilan sin una queja y revientan en producción**.
Pasan antes de cada entrega.

---

# v254 · Las fechas vienen de la oferta, y las tareas en lista plana

## 1 · Fechas derivadas, no tecleadas

Inicio, certificación, límite y duración salen de la oferta y del contrato. Se
muestran en solo lectura con **de dónde viene cada una**:

| Campo | Origen |
|---|---|
| Inicio | Del contrato firmado; si no hay, de la oferta |
| Certificación prevista | De la oferta |
| **Fecha límite de trabajo** | **Certificación − 15 días** |
| Duración | Del inicio a la certificación |

Tecleadas a mano acababan sin coincidir con el contrato, y entonces el
calendario del equipo va contra unas fechas y el cliente espera otras.

**El límite es 15 días antes de la auditoría** y no se edita: llegar el mismo día
con las tareas a medias no vale, hace falta margen para cerrar hallazgos y
preparar evidencias.

**Bidireccional**: si cambia la fecha en la oferta, el proyecto se alinea solo.
No hay que acordarse de venir a tocarlo.

Cuando no hay certificación, el límite **no se inventa**: se conserva el que
tuviera el proyecto y se dice que se calculará al fijarla.

## 2 · Un solo panel de tareas, en lista plana

Fuera el anidado y el arrastrar-para-fusionar. Cada tarea en su fila, con la
**etiqueta de su sistema** en la primera columna.

Una tarea de la 9001 y otra de la 14001 pueden parecerse, pero son trabajos de
sistemas distintos: fusionarlas escondía a cuál pertenecía cada una y hacía
imposible programarlas por separado.

## 3 · Solo se asigna al equipo del proyecto

El desplegable de responsable ya no lista a todo el equipo, sino a **quien está
asignado a ese proyecto**. Ofrecer a todos permite programar trabajo a alguien
que no lo lleva, y esa persona se lo encuentra en su agenda sin contexto.

Si el proyecto no tiene equipo, el desplegable lo dice y remite a asignarlo.

## 4 · Fuera los bloques de ejecución

Trozos de 4 h repartidos automáticamente que nadie confirmaba, y que competían
con las sesiones reales: dos sitios distintos diciendo cuándo se hace la misma
tarea.

La columna pasa a ser un enlace **«calendario»** que abre el emergente de
sesiones, con fecha, hora de inicio y fin, responsable y el contraste contra las
horas comprometidas.

## Verificación

`scripts/test-fechas-proyecto.mjs`: el cálculo del límite incluido el cruce de
año, que el contrato manda sobre la oferta, que la oferta manda sobre la copia
vieja del proyecto, que sin certificación no se inventa nada, y la detección de
desfase para la sincronización automática.

---

# v255 · Equipo pasa a ser el portal del empleado

## Ficha en emergente, con dos pestañas

Pulsar una fila abre la ficha: **Datos** y **Documentación laboral**. Los datos
de una persona y sus nóminas no caben en una fila de tabla.

## Nóminas y documentación laboral

Nueva tabla `empleado_documentos` con tipos: nómina, contrato, finiquito,
certificado, formación, PRL.

Las nóminas se ordenan por **periodo**, no por fecha de subida: una nómina de
marzo cargada en junio sigue siendo de marzo y tiene que salir donde le toca.

### El acceso, que aquí es lo que importa

Una nómina dice cuánto cobra alguien. Es de lo más sensible que va a guardar
este sistema, y filtrarla no se arregla pidiendo perdón.

| | Ve las suyas | Ve las de otros | Sube |
|---|---|---|---|
| Superadministración · Administración | sí | **sí** | **sí** |
| Dirección de proyecto | sí | **no** | no |
| Consultoría · Gestión | sí | no | no |

**Dirección de proyecto queda fuera a propósito.** Lleva equipos, pero la
retribución de sus compañeros no es asunto suyo, y meterla en su alcance por
comodidad es como se acaban filtrando estas cosas.

**Ni siquiera la propia persona sube su nómina**: la emite la empresa, y dejar
que cada uno cargue las suyas abriría la puerta a versiones que no coinciden con
las emitidas.

El depósito es privado y los enlaces caducan en **diez minutos** —no una hora,
como los de cliente—: una nómina no necesita un enlace vivo mucho después de
haberla abierto.

La comprobación de propiedad se hace **también en el servidor**: la función usa
`service_role`, que se salta RLS, así que sin ese control cualquiera con un id
podría descargar la nómina de otro.

## Los correos que faltaban

La pantalla leía de `consultores`, la tabla antigua, donde muchas filas no
tienen correo. Ahora lee de **`perfiles`**, que es la que tiene la cuenta, el rol
real y el correo, y se completa con el nivel y las normas de `consultores`
cuando existan.

La migración además **rellena los correos vacíos** desde `auth.users`, y añade un
trigger para que un perfil nuevo herede el correo de su cuenta. Así no vuelve a
pasar.

---

# v256 · «Holded devolvió 400» ahora dice por qué

## El problema del mensaje

```
Holded devolvió 400
```

Eso es todo lo que había. **No se leía el cuerpo de la respuesta**, que es donde
Holded explica qué ha rechazado, así que el único camino era ir probando.

Ahora se lee el cuerpo y se acompaña de lo que significa cada código **en esta
integración**:

| Código | Qué suele ser |
|---|---|
| **400** | Una clave de la API v2 usada contra la v1. En Holded hay que crearla desde «Api Keys v1», no la general |
| 401 | Clave no válida o caducada |
| 403 | La clave no tiene el permiso de Contactos |
| 429 | Demasiadas peticiones seguidas |

Mi apuesta para este caso es el 400: la documentación de Holded avisa de que
para la v1 hay que entrar por el banner **«Go to Api Keys v1»**, y una clave
creada en la pantalla general no sirve aunque parezca correcta.

## La escritura fallaba en silencio

`if (r.ok) { … }` sin `else`. La sincronización informaba «10 empresas» aunque
Holded las hubiera **rechazado todas**: se contaba el intento, no el resultado.

Ahora cada fallo se registra con el nombre de la empresa, hasta diez, y luego se
agrupa. Sin el nombre no hay forma de saber cuál corregir.

## Botón «Probar conexiones»

Comprueba las claves de Holded y de Brevo **sin escribir nada**, y responde en
un segundo:

```
Holded: OK · 412 contactos accesibles
Brevo:  OK · cuenta hola@tuconsultor.com
```

Lanzar la sincronización completa para descubrir que una clave no vale deja
datos a medio mover. Esto se prueba antes.

---

# v256 · Pantalla de inicio, y cada rol ve lo suyo

## Por qué los consultores seguían sin ver sus proyectos

`<MisProyectos>` estaba en **Mi agenda**. Tu captura era de **Agenda**, que es
otra pantalla. Y antes había estado en el Dashboard, al que tampoco llegaban.

El problema no era dónde ponerlo: era que **cada rol aterrizaba en una pantalla
distinta** y encontrar lo propio dependía de saber en qué menú buscarlo.

## Nueva pantalla de Inicio

Todos entran por aquí. Lo que ve cualquiera al abrir:

- **Hoy · Próximos 7 días · Sin cerrar**, de sus propias sesiones
- **Lo de hoy con nombre y hora** — un número no dice qué hay que hacer
- **Mis proyectos**, con horas comprometidas, planificadas y ejecutadas
- **Accesos directos** a lo que usa su rol

## Cada rol ve lo suyo

| | Panel de gestión | Agenda del equipo |
|---|---|---|
| Superadministración · Administración | sí | todos los proyectos |
| Dirección de proyecto | **no** | todos los proyectos |
| Consultoría | **no** | **solo los suyos** |
| Gestión | **no** | solo los suyos |

**El panel de gestión enseña MRR, márgenes y cartera.** Son cifras de negocio, y
consultoría no las necesita para trabajar. Protegido **en la ruta**, no solo
escondido del menú: una URL escrita a mano llegaba igual.

**La agenda del equipo se acota a los proyectos donde estás.** La agenda completa
de la casa no le sirve a un consultor y le enseña la carga de clientes que no
lleva. Dirección y Administración sí la ven entera: repartir trabajo exige ver
dónde está el que ya hay.

Y se dice qué se está viendo: una agenda recortada sin avisar parece vacía.

## Nota

El filtrado de la agenda depende de `proyecto_equipo`, que crea la **migración
v106**. Sin ella, un consultor vería la agenda vacía en lugar de la suya.

---

# v257 · El planificador de tareas, tal y como tiene que ser

## Anidar: retirado del todo

Fuera el estado, las funciones y el panel de «anidar tareas comunes». Cada norma
lleva sus tareas por separado y no se fusionan.

Los códigos pasan a ser **`9001-03`**: corto, dice de qué sistema es y en qué
orden va. Es lo que hace falta para hablar de una tarea por teléfono sin leer un
título de ochenta caracteres.

## Las horas teóricas se leen del catálogo, siempre

Era lo más importante de tu lista. `cliente_tareas.horas` es una **copia** del
día en que se volcó la tarea: si alguien ajusta el catálogo después, la copia se
queda con el valor viejo y **se planifica contra un tope que ya no es el
vigente**.

Ahora se busca la tarea en `tareas_catalogo` por norma, modelo, proceso y
subproceso, y se usa esa cifra. Es la que se utilizó para calcular el precio de
la oferta; planificar contra otra cosa es pasarse de horas sin enterarse.

Si la tarea no aparece en el catálogo —se borró o cambió de nombre— se cae a la
copia: peor es no tener referencia que tenerla antigua.

## Al abrir la planificación, solo cinco columnas

```
Código      Tarea                      Teóricas  Programadas  Ejecutadas
9001-02     Auditoría interna              8 h      5 h            4 h
                                                    2 sesiones
```

Fuera el consultor y la fecha límite de la fila: **puede haber varias personas y
varias fechas por tarea**, y meterlas en una columna obligaba a elegir una. Se
ven y se cambian en el calendario de la tarea, que es donde se decide.

El color de «programadas» dice el estado de un vistazo: ámbar si falta, verde si
está cubierta, rojo si se ha pasado.

## Al pinchar en calendario

Las sesiones individuales, cada una con fecha, horas, responsable y si está
hecha. Las cerradas son las que cuentan como ejecutadas y las que suben al
panel.

**Y avisa al pasarse**: si una sesión nueva lleva el total por encima de las
horas del modelo, se dice antes de guardarla. No se impide —a veces una tarea
cuesta más y hay que registrarlo— pero no pasa inadvertido.
