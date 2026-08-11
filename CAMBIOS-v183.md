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
