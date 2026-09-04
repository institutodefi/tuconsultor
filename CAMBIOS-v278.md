# Cambios v278 · 4 de septiembre de 2026

## Órbita (proyectos)
- `consultify/app/src/lib/planCliente.js` · el catálogo arrastra su `id`: el volcado reconocía mal las tareas y CECE llegó a 127 (son 65).
- `consultify/app/src/portal/consultores/ProyectosConfig.jsx` · identidad de tarea por dos claves; código `CECE-9001-01`; título = subproceso; botón «Abrir»; anchos de tabla.
- `consultify/app/src/portal/consultores/ClienteProyecto.jsx` · **BORRADO** (código muerto con el formato antiguo de título).
- `consultify/supabase/migracion-v114-codigos-y-duplicadas.sql` · ya aplicada en producción.

## Precios
- `consultify/supabase/migracion-v115-suelos-y-cliente-antiguo.sql` · **pendiente de aplicar**. Suelos por norma y complejidad; tarifa heredada de cliente antiguo.
- `consultify/app/src/lib/calcEngine.js` · suelo por sistema según norma y complejidad; `aplicarParametros()`.
- `consultify/app/src/lib/reglasComerciales.js` · empuja `parametros_precio` al motor.
- `consultify/app/src/main.jsx` · carga los parámetros al arrancar (antes no se cargaban nunca).
- `consultify/app/src/pages/GeneradorOfertas.jsx`, `portal/consultores/Ofertas.jsx` · «cliente antiguo» propone 199/349/549 por sistema.

## Web · Premios Vanguardistas 2026
- `web/index.html` · módulo de convocatoria con cuenta atrás (Europe/Madrid, tres estados, caduca el 4 dic).
- `web/premios/index.html` · PDF de bases, aviso de informe, logo del aniversario, og:image, datos estructurados, contraste.
- `web/premios/cuenta-atras.js`, `web/premios/bases-premios-vanguardistas-2026.pdf`, `web/premios/logos/`, `web/premios/creatividades/` (60).
- `web/social-img/og-premios-vanguardistas-2026.png`.
- `web/estilo-base.css` · franja `.pv-banda` y corrección de contraste de la página de bases.

## Web · logo del 20 aniversario
- `web/marca/20-aniversario/tuconsultor-20-horizontal-blanco-transp.png` y `-vertical-blanco-transp.png` · derivados del blanco sólido, con el fondo (#202020) hecho transparente.
- `web/marca/20-aniversario/web-horizontal-blanco-600.png` y `web-horizontal-color-600.png` · versiones ligeras para la web.
- 302 páginas HTML: barra y menú (fondo oscuro) → blanco; pie y caja de marcas (fondo claro) → color. Antes: `/marca/horizontal-dark.svg` y `/marca/horizontal-claro.svg`. Para volver al logo normal cuando acabe el aniversario, deshacer ese reemplazo.
- `web/orbita-preview.js`, `web/banner-hero.js` · cortina de bienvenida y banner, en blanco.
- `web/estilo-base.css` · altura de los logos 44 px, para que se lea «20 años».

## Web · Órbita · PM Tool (assets y archivo de publicación)
- `web/social-img/orbita/` (180) · `web/marca/orbita/` (53) · `web/marca/20-aniversario/` (18).
- `web/data/calendario_publicacion.csv` (704 + 120 PV) · `calendario_reels.csv` (140) · `publicacion.json`.
- `netlify.toml` · cabeceras para `/data/` (csv sin caché).
- `orbita_web/` · datos y generador. Las imágenes y la marca del pack ya están en `web/`; no se duplican en el repo.

## Pendiente
- Aplicar la v115 en Supabase.
- Página `/orbita/`, artículo del blog y `scripts/actualizar_publicacion` (puntos 2, 3 y parte del 4 del encargo de Órbita).
- Reels: `videos/orbita/*.mp4` no existen aún en el bucket.
