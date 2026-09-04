# orbita_web — paquete para el proyecto web de tuconsultor.com

| Carpeta | Qué es | Destino en la web |
|---|---|---|
| `social-img/orbita/` | 180 creatividades (90 mensajes × LinkedIn + Instagram) | `/social-img/orbita/` |
| `marca/orbita/` | Logos SVG (estáticos y animados), favicon, OG images. Tipografía: Manrope | `/marca/orbita/` |
| `marca/20-aniversario/` | Logo 20 aniversario TuConsultor: 16 originales + 2 con fondo transparente para oscuro | `/marca/20-aniversario/` |
| `muestras/` | 3 reels de muestra (A01, D01, F02) | no se publica |
| `data/calendario_publicacion.csv` | 704 filas: artículos 181-232 (09/09→04/10/2026) + Orbita 233-884 (09/09/2026→31/07/2027) | `/data/` |
| `data/calendario_reels.csv` | 140 reels L/X/V 20:30 hasta 31/07/2027 (pestaña Video) | `/data/` |
| `data/banco_mensajes_orbita.json` | Los 90 mensajes por eje, con CTA y hashtags | referencia |
| `generador/` | Moldes HTML, fuentes y scripts para regenerar imágenes y reels | repo (no se publica) |
| `PROMPT_WEB_ORBITA.md` | El prompt para el agente del proyecto web | — |

Pendiente de tu lado: URL/formulario de la CTA, fecha del artículo de lanzamiento, subir los reels a Supabase `videos/orbita/` cuando estén generados.
