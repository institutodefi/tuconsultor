# Prompt para el proyecto web de tuconsultor.com — Orbita · PM Tool + archivo de publicación

Pega esto tal cual en el agente del proyecto web, con la carpeta `orbita_web/` descomprimida en la raíz del repositorio.

```
Tienes en la raíz del repo la carpeta `orbita_web/`. Contiene todo lo necesario para incorporar el producto
"Orbita · PM Tool" a tuconsultor.com y para que la web sea la fuente única del archivo de publicación en redes.
Trabaja en este orden y no inventes nada que no esté en los datos: los textos, colores, logos y reglas ya están decididos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ASSETS (copiar, no modificar)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- `orbita_web/social-img/orbita/*.png` → `/social-img/orbita/` (180 imágenes: 90 mensajes × linkedin 1200×627 / instagram 1080×1080).
  Las URLs `https://www.tuconsultor.com/social-img/orbita/<codigo>_linkedin.png` y `_instagram.png` ya están referenciadas
  en el calendario: los nombres NO se cambian.
- `orbita_web/marca/orbita/` → `/marca/orbita/` (SVG estáticos y animados, favicon, OG images). Tipografía elegida: Manrope.
- Comprueba tras el deploy que `https://www.tuconsultor.com/social-img/orbita/A01_instagram.png` responde 200 con `image/png`.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. PÁGINA /orbita/ (nueva)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Ruta `/orbita/index.html`. Es el destino de todos los enlaces de la campaña (`/orbita/?utm_source=…&utm_content=<codigo>`):
  la página debe cargar bien con cualquier query string y registrar `utm_content` en la analítica que ya use la web.
- Estructura: hero (titular + subtítulo + CTA naranja + `marca/orbita/svg/horizontal-light-anim.svg`, estática con
  `prefers-reduced-motion`) → el problema en 3 frases → seis bloques, uno por eje, con el titular y el subtítulo del primer
  mensaje de cada eje en `orbita_web/data/banco_mensajes_orbita.json` (ejes A-F) → cómo se trabaja con TuConsultor
  dentro de la herramienta (modelos Relación · Implicación · Compromiso) → CTA final → pie TuConsultor.
- CTA: [demo / acceso / lista de espera — rellenar] hacia [URL o formulario — rellenar]. Hasta que se rellene, la CTA
  abre `mailto:hola@tuconsultor.com?subject=Orbita%20PM%20Tool`.
- Reglas de marca (manual v1.1, obligatorias): nombre siempre "Orbita · PM Tool" (punto medio con espacios; nunca "Orbital",
  "PMTool", "Órbita"); Manrope (títulos 600, texto 400, interlineado 1,6, máx. 76 caracteres por línea); JetBrains Mono para
  cifras; colores solo #22A2A5 (verde Órbita, protagonista), #F39200 (naranja, acento y CTA, <15 % de superficie),
  #1B5D72 (texto), #0A2B3A (fondo oscuro, nunca texto), #EAF4F7 (texto sobre oscuro), #93BFC9 (estructural);
  único degradado: linear-gradient(135deg,#22A2A5 0%,#22A2A5 58%,#F39200 100%). Logo a color solo sobre blanco o navy;
  sobre verde/naranja, versión monocromo blanca. Área de respeto = altura del icono. Nunca en cajas.
- SEO: title "Orbita · PM Tool — gestión de proyectos con TuConsultor"; meta description ≤155 caracteres; OG image
  `/marca/orbita/og-image-light.png`; canonical; alta en `sitemap.xml`; enlace en navegación principal, pie y una tarjeta
  en la home junto a Consultify.
- Tono: directo, frases cortas. Prohibido "solución integral", "líder", "innovador", "360º", "sinergias".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. ARTÍCULO DE LANZAMIENTO (blog)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Slug `orbita-pm-tool-presentacion`, categoría "Normas de gestión", 600-800 palabras, imagen social
  `/social-img/orbita/A02_instagram.png` (o genera `/social-img/orbita-presentacion.png` desde el molde de LinkedIn).
- Título: "Orbita · PM Tool: así llevamos ahora los proyectos con nuestros clientes". Cierra con la misma CTA que /orbita/.
- Añádelo al índice del blog como cualquier otro post. Publicación: [fecha — rellenar].

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. ARCHIVO DE PUBLICACIÓN (la web pasa a ser la fuente única del calendario de redes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Copia `orbita_web/data/calendario_publicacion.csv` a `/data/calendario_publicacion.csv` y
  `orbita_web/data/calendario_reels.csv` a `/data/calendario_reels.csv`. Se sirven públicos, `text/csv; charset=utf-8`,
  con `Cache-Control: no-cache`. Un escenario de Make los lee cada día y añade a la hoja "Calendario RRSS TuConsultor"
  las filas cuya `id` aún no exista. Por eso: las ids son inmutables, nunca se reutilizan y nunca se borran filas;
  una fila que no deba publicarse se deja con `fecha` vacía.
- Esquema exacto (cabecera literal, UTF-8, comillas dobles, saltos de línea reales dentro de `texto`):
  `id,fecha,hora,red,texto,imagen_url,enlace,publicado,lista`   (reels: + `video_url,titulo`)
  · id: entero correlativo (hoy 181-884; reels R001-R140). · fecha dd/mm/yyyy · hora HH:mm · red: linkedin | instagram
  (reels: instagram_reel). · publicado y lista SIEMPRE vacíos. · imagen_url y enlace absolutos https://www.tuconsultor.com/…
- Crea el script `scripts/actualizar_publicacion.(js|py)` y engánchalo al build. Cada vez que se publica un post nuevo en el
  blog (nuevo slug en el índice que no tenga filas en el CSV) añade DOS filas al final del CSV, id = última + 1:
    linkedin 09:00  →  "{título}\n\n{entradilla ampliada a 2-3 frases}\n\n👉 Lo contamos en detalle aquí: {url}\n\n{5 hashtags}"
    instagram 12:30 →  "{emoji} {título}\n\n{entradilla}\n\n📎 Artículo completo: enlace en bio.\n❤️ Gestión con corazón desde 2006.\n\n{5 hashtags} #GestiónConCorazón"
  fecha = primer día libre a partir de mañana en el que no haya ya un artículo programado (uno por día; las 19:00 son de Orbita
  y no se tocan). imagen_url = la imagen social del post (`/social-img/<slug>.png`); si no existe, genera una con
  `orbita_web/generador/moldes/molde_linkedin_1200x627.html` cambiando el texto, nunca `blog-general.png`.
  enlace = https://www.tuconsultor.com/blog/post.html?p={slug}. Idempotente: si el slug ya tiene filas, no hace nada.
- Sirve también `/data/publicacion.json` con `{ "ultima_id": N, "ultimo_reel": "Rnnn", "actualizado": ISO8601 }`.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. GENERADOR DE CREATIVIDADES (para regenerar en lote)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- `orbita_web/generador/` contiene base.css, fuentes, `banco.py` (los 90 mensajes), `gen.py` (imágenes + CSV) y `reel.py`
  (reels 1080×1920, 7 s, Playwright + ffmpeg). Ajusta las rutas absolutas del principio de cada script a la del repo.
- Logo del 20 aniversario de TuConsultor: ya está aplicado en las 180 imágenes y en los reels. Los archivos oficiales van en
  `orbita_web/marca/20-aniversario/` → cópialos a `/marca/20-aniversario/` (16 originales + 2 derivados con fondo transparente
  para usar sobre oscuro: `tuconsultor-20-horizontal-sobre-oscuro-transp.png` y `...-vertical-sobre-oscuro-transp.png`).
  Los scripts `gen.py` y `reel.py` ya apuntan a `/marca/20-aniversario/tuconsultor-20-horizontal-sobre-oscuro-transp.png`.
- Mientras dure el aniversario, usa en la web el logo de 20 años en lugar del logo normal: cabecera → `horizontal-color-transp`
  (sobre blanco) o `horizontal-sobre-oscuro-transp` (sobre navy/oscuro); pie → `horizontal-blanco-negro` recortado o el
  `sobre-oscuro-transp`; favicon y avatar no cambian. Sobre naranja usa `horizontal-color-naranja`. Nunca el de fondo navy
  (`horizontal-color-navy`) sobre otro color: su navy (#0F1730) no es el de la web.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENTREGA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ficheros completos, sin fragmentos. Al terminar lista: archivos creados/modificados, URL de /orbita/, resultado de las
comprobaciones 200 de `/social-img/orbita/A01_instagram.png` y `/data/calendario_publicacion.csv`, y el contenido de
`/data/publicacion.json`.
```
