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

## v279ao · campaña «ventajas» (desde el 14/09/2026)

- `generador/banco_ventajas.py` — 10 ventajas × 3 formulaciones (V01A…V10C): portal único, no depende de una persona, siempre atendido, gestión del legado, seguridad de la información, respuestas inmediatas, dashboard de indicadores, documentación 24/7, respuesta 24/7, hiperaccesible.
- `generador/gen_ventajas.py` — genera las 60 creatividades (`web/social-img/orbita/V??X_*.png`) y las filas del calendario: **cada día** LinkedIn Alejandro 08:45 (primera persona), LinkedIn empresa 19:00 e Instagram 19:00, del 14/09/2026 al 31/07/2027 (ids 885–1847). Las filas antiguas de Orbita (233–884) quedan sin fecha desde el 14/09.
- El calendario ya no pasa por Google Sheets: ver `make/README.md`.
