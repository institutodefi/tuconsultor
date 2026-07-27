-- ═══════════════════════════════════════════════════════════════════════════
-- v62 · EL CHECKLIST AL DÍA CON WCAG 2.2, CON ORIGEN Y MECANISMO
--
-- Tres cosas:
--
--  1 · ORIGEN de cada criterio. UNE 139803:2012 recoge los 61 criterios de
--      WCAG 2.0. La 2.1 añadió 17 y la 2.2 otros 9, y retiró 4.1.1. Saber de
--      dónde viene cada criterio importa: en España el RD 1112/2018 remite a
--      EN 301 549, que apunta a WCAG 2.1 AA. Lo que solo está en la 2.2 es
--      mejora voluntaria; lo que está en la norma es exigible.
--
--  2 · MECANISMO DE APLICABILIDAD. WCAG no tiene un «no aplica» genérico:
--      tiene cinco vías distintas, y cada una se justifica de forma diferente.
--      Ahora hay que elegir cuál, y no vale el «no procede».
--
--  3 · LO YA VERIFICADO, precargado con el método real y la versión en la que
--      se hizo. Solo lo comprobado de verdad: lo que no se ha medido se queda
--      pendiente, que es más útil que un verde sin respaldo.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══ 1 · COLUMNAS NUEVAS ═══════════════════════════════════════════════════
alter table public.accesibilidad_criterios
  add column if not exists origen text not null default 'une'
    check (origen in ('une','wcag21','wcag22')),
  add column if not exists mecanismo text
    check (mecanismo in ('condicion_no_se_da','excepcion_del_criterio','esencial',
                         'agente_de_usuario','fuera_de_alcance')),
  add column if not exists obsoleto boolean not null default false;

comment on column public.accesibilidad_criterios.origen is
  'une = está en UNE 139803:2012 (WCAG 2.0, exigible) · wcag21 = añadido en WCAG 2.1 (EN 301 549) · wcag22 = añadido en WCAG 2.2 (voluntario)';
comment on column public.accesibilidad_criterios.mecanismo is
  'Por qué queda fuera. condicion_no_se_da → el disparo del criterio no ocurre (se declara CUMPLIDO, no «no aplicable») · excepcion_del_criterio → el texto del criterio lo exime · esencial → quitarlo cambiaría la función y no hay otra vía conforme · agente_de_usuario → lo determina el navegador y el autor no lo modifica · fuera_de_alcance → no está en el alcance declarado';

-- Si ya había criterios marcados fuera SIN mecanismo (de antes de esta columna),
-- no se les inventa uno: se les pone el más probable y se marca en la propia
-- justificación que hay que revisarlo. Un dato asignado a ciegas y silenciado es
-- peor que un dato asignado a ciegas y señalado.
update public.accesibilidad_criterios
   set mecanismo = 'condicion_no_se_da',
       justificacion = coalesce(justificacion, '') ||
         ' [REVISAR: mecanismo asignado automáticamente al migrar a la v62; confirma que es el correcto.]'
 where aplicable = false and mecanismo is null;

-- Marcar fuera lo que no aplica exige también decir POR QUÉ vía.
alter table public.accesibilidad_criterios drop constraint if exists accesibilidad_justifica_no_aplicable;
alter table public.accesibilidad_criterios add constraint accesibilidad_justifica_no_aplicable check (
  aplicable is not false
  or (justificacion is not null and btrim(justificacion) <> '' and mecanismo is not null)
);

-- 4.1.1 Análisis: retirado en WCAG 2.2. Sigue en la norma, así que no se borra.
update public.accesibilidad_criterios set obsoleto = true where codigo = '4.1.1';

-- ═══ 2 · LOS 17 DE WCAG 2.1 ════════════════════════════════════════════════
insert into public.accesibilidad_criterios (codigo, titulo, nivel, principio, origen) values
  ('1.3.4', 'Orientación',                          'AA',  'Perceptible',  'wcag21'),
  ('1.3.5', 'Identificar el propósito de la entrada','AA',  'Perceptible',  'wcag21'),
  ('1.3.6', 'Identificar el propósito',              'AAA', 'Perceptible',  'wcag21'),
  ('1.4.10','Reflujo',                               'AA',  'Perceptible',  'wcag21'),
  ('1.4.11','Contraste del contenido no textual',    'AA',  'Perceptible',  'wcag21'),
  ('1.4.12','Espaciado del texto',                   'AA',  'Perceptible',  'wcag21'),
  ('1.4.13','Contenido al recibir foco o puntero',   'AA',  'Perceptible',  'wcag21'),
  ('2.1.4', 'Atajos de teclado con caracteres',      'A',   'Operable',     'wcag21'),
  ('2.2.6', 'Tiempos de espera',                     'AAA', 'Operable',     'wcag21'),
  ('2.3.3', 'Animación por interacciones',           'AAA', 'Operable',     'wcag21'),
  ('2.5.1', 'Gestos del puntero',                    'A',   'Operable',     'wcag21'),
  ('2.5.2', 'Cancelación del puntero',               'A',   'Operable',     'wcag21'),
  ('2.5.3', 'Etiqueta incluida en el nombre',        'A',   'Operable',     'wcag21'),
  ('2.5.4', 'Actuación por movimiento',              'A',   'Operable',     'wcag21'),
  ('2.5.5', 'Tamaño del objetivo (mejorado)',        'AAA', 'Operable',     'wcag21'),
  ('2.5.6', 'Mecanismos de entrada concurrentes',    'AAA', 'Operable',     'wcag21'),
  ('4.1.3', 'Mensajes de estado',                    'AA',  'Robusto',      'wcag21')
on conflict (codigo) do nothing;

-- ═══ 3 · LOS 9 DE WCAG 2.2 ═════════════════════════════════════════════════
insert into public.accesibilidad_criterios (codigo, titulo, nivel, principio, origen) values
  ('2.4.11','Foco no oscurecido (mínimo)',           'AA',  'Operable',     'wcag22'),
  ('2.4.12','Foco no oscurecido (mejorado)',         'AAA', 'Operable',     'wcag22'),
  ('2.4.13','Apariencia del foco',                   'AAA', 'Operable',     'wcag22'),
  ('2.5.7', 'Movimientos de arrastre',               'AA',  'Operable',     'wcag22'),
  ('2.5.8', 'Tamaño del objetivo (mínimo)',          'AA',  'Operable',     'wcag22'),
  ('3.2.6', 'Ayuda consistente',                     'A',   'Comprensible', 'wcag22'),
  ('3.3.7', 'Entrada redundante',                    'A',   'Comprensible', 'wcag22'),
  ('3.3.8', 'Autenticación accesible (mínimo)',      'AA',  'Comprensible', 'wcag22'),
  ('3.3.9', 'Autenticación accesible (mejorado)',    'AAA', 'Comprensible', 'wcag22')
on conflict (codigo) do nothing;

-- ═══ 4 · LO QUE YA HEMOS APLICADO, CON CÓMO SE HIZO ════════════════════════
-- Solo lo verificado de verdad. Donde la comprobación fue parcial, se dice.

-- 1.4.3 Contraste mínimo · MEDIDO
update public.accesibilidad_criterios set
  aplicable = true, estado = 'cumple',
  metodos = array['contraste','automatico'],
  observaciones = 'Medido el ratio real compuesto (con la opacidad aplicada sobre el color de fondo, no el valor del CSS) en los 7 anuncios del banner de portada. Se detectaron 3,92:1 en los pies de panel y 3,95:1 en el acento lila, por debajo del 4,5:1. Se subieron opacidades y se aclararon tres acentos: lila 3,95→5,98, oro 5,46→7,31 y verde 4,22→7,42. Mínimo actual medido: 4,5:1.',
  evidencia = 'v85 · banner-hero.js · medición sobre el DOM con el ratio de luminancia relativa',
  revisado_en = now()
where codigo = '1.4.3';

-- 2.5.8 Tamaño del objetivo mínimo · MEDIDO
update public.accesibilidad_criterios set
  aplicable = true, estado = 'cumple',
  metodos = array['manual','automatico'],
  observaciones = 'Auditoría en iPhone 13 (390×844) y Android 360×640. Se encontraron 9 elementos por debajo de 24×24: puntos del banner a 11 px, casillas de consentimiento a 17 y enlaces legales del pie a 19 de alto. Corregido: los puntos llevan zona de toque de 24 px con el punto visual pequeño dentro, las flechas a 40, las casillas a 24 y relleno vertical en los enlaces del pie. Recuento posterior: 0 elementos por debajo del umbral. Los enlaces dentro de prosa quedan fuera por la excepción «en línea» del propio criterio.',
  evidencia = 'v80 y v88 · banner-hero.js, formulario-proyecto.js, estilo-base.css',
  revisado_en = now()
where codigo = '2.5.8';

-- 2.2.2 Pausar, detener, ocultar · PARCIAL, y explico por qué
update public.accesibilidad_criterios set
  aplicable = true, estado = 'parcial',
  metodos = array['manual','teclado'],
  observaciones = 'El banner rota solo cada 8 s. Implementado: se detiene al pasar el puntero, al entrar el foco por teclado, con la pestaña en segundo plano, y no arranca si el sistema pide movimiento reducido. Hay flechas y puntos para controlarlo. QUEDA PENDIENTE un botón explícito de pausa: detener al enfocar no es lo mismo que ofrecer un mecanismo de pausa, y un revisor estricto lo pedirá. Es de nivel A y de no interferencia, así que no debería quedarse así.',
  evidencia = 'v85 · banner-hero.js · funciones arrancar/parar y consulta prefers-reduced-motion',
  revisado_en = now()
where codigo = '2.2.2';

-- 2.3.3 Animación por interacciones
update public.accesibilidad_criterios set
  aplicable = true, estado = 'cumple',
  metodos = array['manual'],
  observaciones = 'prefers-reduced-motion se respeta en los dos sitios donde hay movimiento: la cortina de bienvenida no aparece en absoluto, y el banner no rota ni anima la entrada de cada anuncio.',
  evidencia = 'v85 · orbita-preview.js y banner-hero.js',
  revisado_en = now()
where codigo = '2.3.3';

-- 3.1.1 Idioma de la página
update public.accesibilidad_criterios set
  aplicable = true, estado = 'cumple',
  metodos = array['manual','automatico'],
  observaciones = 'Las 298 páginas declaran el idioma en <html lang>. Comprobado leyéndolo desde el navegador en los cinco idiomas (es, en, fr, de, ar); es además el valor del que dependen el banner, la cortina y el formulario para elegir su diccionario.',
  evidencia = 'v85 · comprobación en navegador de /, /en/, /fr/, /de/ y /ar/',
  revisado_en = now()
where codigo = '3.1.1';

-- 3.1.2 Idioma de las partes
update public.accesibilidad_criterios set
  aplicable = true, estado = 'parcial',
  metodos = array['manual'],
  observaciones = 'Marcado donde hay cambio real de idioma: las píldoras del selector llevan lang y hreflang, y la línea de bienvenida multilingüe lleva un lang por idioma. PENDIENTE revisar el resto del contenido, sobre todo los anglicismos técnicos del blog y de las áreas.',
  evidencia = 'v85 · orbita-preview.js',
  revisado_en = now()
where codigo = '3.1.2';

-- 3.3.2 Etiquetas o instrucciones
update public.accesibilidad_criterios set
  aplicable = true, estado = 'cumple',
  metodos = array['manual'],
  observaciones = 'Los 8 campos del formulario de proyecto llevan <label for> visible, no placeholder como etiqueta. Los obligatorios van marcados con asterisco y con una nota que lo explica. Los selectores incluyen una opción inicial descriptiva.',
  evidencia = 'v88 · formulario-proyecto.js',
  revisado_en = now()
where codigo = '3.3.2';

-- 3.3.1 Identificación de errores
update public.accesibilidad_criterios set
  aplicable = true, estado = 'cumple',
  metodos = array['manual'],
  observaciones = 'Los errores del formulario se describen en texto (no solo en color) y el aviso se inserta con role="alert" para que lo anuncie el lector de pantalla. Se distingue entre campos obligatorios sin rellenar y correo con formato inválido.',
  evidencia = 'v88 · formulario-proyecto.js',
  revisado_en = now()
where codigo = '3.3.1';

-- 2.4.6 Encabezados y etiquetas
update public.accesibilidad_criterios set
  aplicable = true, estado = 'parcial',
  metodos = array['manual','automatico'],
  observaciones = 'Verificado que hay UN solo <h1> por página en los cinco idiomas: los titulares de los anuncios añadidos son <h2> con el mismo cuerpo, no h1 duplicados. PENDIENTE revisar el orden jerárquico completo (que no se salte de h2 a h4) en las 298 páginas.',
  evidencia = 'v85 · recuento de h1 en navegador en los cinco idiomas',
  revisado_en = now()
where codigo = '2.4.6';

-- 1.4.10 Reflujo
update public.accesibilidad_criterios set
  aplicable = true, estado = 'parcial',
  metodos = array['manual'],
  observaciones = 'Sin desbordamiento horizontal a 390 px ni a 360 px: el ancho del documento coincide con el de la ventana en ambos. PENDIENTE la prueba que pide el criterio, que es a 320 px CSS (equivale a 1280 px al 400 % de zoom). No se ha hecho.',
  evidencia = 'v80 · auditoría móvil, ancho de documento medido',
  revisado_en = now()
where codigo = '1.4.10';

-- 2.4.7 Foco visible
update public.accesibilidad_criterios set
  aplicable = true, estado = 'parcial',
  metodos = array['manual','teclado'],
  observaciones = 'Añadido indicador de foco explícito a los puntos y flechas del banner y a las píldoras de idioma de la cortina. PENDIENTE el resto del sitio y toda la aplicación: en buena parte se depende del indicador por defecto del navegador, que es aceptable pero no está comprobado en los componentes con fondo oscuro.',
  evidencia = 'v85 · banner-hero.js, orbita-preview.js',
  revisado_en = now()
where codigo = '2.4.7';

-- 1.4.13 Contenido al recibir foco o puntero · excepción del agente de usuario
update public.accesibilidad_criterios set
  aplicable = true, estado = 'cumple',
  metodos = array['manual'],
  mecanismo = 'agente_de_usuario',
  observaciones = 'No hay tooltips propios. Las ayudas de los métodos de verificación usan el atributo title, cuya presentación la controla el navegador y no la modifica el autor: es la excepción explícita del criterio.',
  evidencia = 'v88 · Accesibilidad.jsx',
  revisado_en = now()
where codigo = '1.4.13';

-- 2.5.7 Movimientos de arrastre
update public.accesibilidad_criterios set
  aplicable = true, estado = 'cumple',
  metodos = array['manual'],
  observaciones = 'El banner se puede deslizar con el dedo, pero el arrastre NO es la única vía: hay flechas y puntos que hacen lo mismo con una sola pulsación. Es lo que pide el criterio.',
  evidencia = 'v85 · banner-hero.js',
  revisado_en = now()
where codigo = '2.5.7';

-- 2.1.4 Atajos de teclado con caracteres · la condición no se da
update public.accesibilidad_criterios set
  aplicable = true, estado = 'cumple',
  metodos = array['manual'],
  mecanismo = 'condicion_no_se_da',
  observaciones = 'No hay atajos de una sola tecla imprimible en ningún sitio. El único atajo es Escape para cerrar la cortina, y Escape no es carácter imprimible, así que el criterio no llega a dispararse. Se declara CUMPLIDO, no «no aplicable».',
  evidencia = 'v85 · orbita-preview.js',
  revisado_en = now()
where codigo = '2.1.4';

notify pgrst, 'reload schema';

select origen, nivel, count(*) from public.accesibilidad_criterios group by origen, nivel order by origen, nivel;
