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
