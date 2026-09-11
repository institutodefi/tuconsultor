# Make · escenarios de publicación en redes

| Escenario | Qué hace | Estado |
|---|---|---|
| **Publicador RRSS · Web (Orbita, blog, premios)** (id 7369174) | Cada 15 min pide a `https://www.tuconsultor.com/api/publicaciones?accion=pendientes` lo que toca publicar, lo publica (LinkedIn empresa, LinkedIn Alejandro, Instagram, reels, vídeo LinkedIn) y marca el resultado (`accion=marcar`). | Creado en v279ao. Se activa cuando `PUBLICACIONES_TOKEN` esté en Netlify. |
| Integration Google Sheets (id 6704320) | El publicador antiguo: lee la hoja «Calendario RRSS TuConsultor» (`lista` = SI). Desde el 9/9 no publicaba nada (las filas 181+ nunca llegaron a la hoja). | Sustituido por el de arriba; se puede desactivar. |
| Publicador RRSS · Vídeo ISO (id 6847735) | Pestaña «Video» de la hoja: vídeos ISO con avatar. | Sigue igual. |

`publicador-rrss-web.blueprint.json` es el blueprint del nuevo escenario, con el token sustituido por `<PUBLICACIONES_TOKEN>`. Para recrearlo: importar en Make y poner el token real en las cabeceras `x-publicaciones-token` (6 módulos HTTP).

Fuente única del calendario: `web/data/calendario_publicacion.csv` y `calendario_reels.csv` → cada noche (`publicaciones-cron`, 04:10 UTC) se vuelcan en la tabla `publicaciones` de Supabase → Make publica → Órbita («Publicaciones en redes») lo enseña.
