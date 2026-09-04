-- ═══════════════════════════════════════════════════════════════════════════
-- v115 · SUELO POR NORMA Y COMPLEJIDAD · TARIFA DE CLIENTE ANTIGUO
--
-- Nombre: la v112 (que creó `parametros_precio`) ya está aplicada, así que
-- esta va detrás de la v114. Si prefieres otra numeración, se renombra: lo
-- único que importa es el orden en que se lanzan.
--
-- Dos cosas, las dos como parámetros editables. Ninguna cifra se queda en el
-- código: la idea de la v112 era justo esa, que comercial pueda ajustar un
-- precio sin desplegar.
--
-- ── 1 · El suelo deja de ser uno solo ──────────────────────────────────────
-- Hasta ahora todos los sistemas tenían el mismo mínimo: 350 €/mes. Pero la
-- ISO 9001 no cuesta lo mismo de sostener que una 27001, y cobrar por ella el
-- mismo suelo dejaba fuera de precio la puerta de entrada más habitual.
--
--   ISO 9001, complejidad baja o media ...... 199 €
--   ISO 9001, complejidad alta .............. 249 €
--   cualquier otro sistema .................. 350 €
--
-- El suelo sigue siendo POR SISTEMA, como desde la v96: con 9001 (baja) más
-- una 14001, el mínimo conjunto es 199 + 350 = 549 €/mes, no 350.
--
-- Se aplica en todos los modelos de cuota mensual, aunque donde se ve es en
-- Relación: es el modelo con menos horas y el único en el que el cálculo por
-- horas suele quedar por debajo del mínimo.
--
-- ── 2 · La tarifa heredada de los clientes antiguos ────────────────────────
-- `presupuestos.cliente_antiguo` y `presupuestos.precios_sistema` ya existen:
-- permiten fijar a mano el precio de cada sistema y respetar lo pactado sin
-- inventar un descuento. Lo que faltaba era el punto de partida, que hasta
-- ahora había que teclear de memoria en cada oferta:
--
--   Relación .......... 199 €/mes por sistema
--   Implicación ....... 349 €/mes por sistema
--   Compromiso ........ 549 €/mes por sistema
--
-- Son PROPUESTA, no imposición: se escriben en `precios_sistema` al marcar la
-- casilla y desde ahí se editan uno a uno.
--
-- Sobre esos precios se aplican los descuentos por volumen que ya existen
-- (5 % con dos sistemas, 10 % con tres, 15 % de tope), igual que con cualquier
-- precio fijado a mano. No se tocan aquí.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Parámetros nuevos ──────────────────────────────────────────────────────
insert into public.parametros_precio (clave, valor, grupo, etiqueta, descripcion, unidad, minimo, maximo, orden) values

  -- Suelos por norma y complejidad. `suelo_por_sistema` (350) sigue siendo el
  -- que se aplica a todo lo demás: no se toca, es el caso general.
  ('suelo_9001_baja',  199, 'suelos', 'Suelo · ISO 9001 complejidad baja',
   'Cuota mínima mensual de la ISO 9001 cuando la complejidad es baja.', 'euros', 0, 3000, 20),
  ('suelo_9001_media', 199, 'suelos', 'Suelo · ISO 9001 complejidad media',
   'Cuota mínima mensual de la ISO 9001 cuando la complejidad es media.', 'euros', 0, 3000, 30),
  ('suelo_9001_alta',  249, 'suelos', 'Suelo · ISO 9001 complejidad alta',
   'Cuota mínima mensual de la ISO 9001 cuando la complejidad es alta.', 'euros', 0, 3000, 40),

  -- Tarifa heredada, por sistema y modelo.
  ('precio_antiguo_relacion',    199, 'tarifas', 'Cliente antiguo · Relación',
   'Precio mensual por sistema que se propone al marcar «cliente antiguo» en el modelo Relación. Editable oferta a oferta.',
   'euros', 0, 5000, 110),
  ('precio_antiguo_implicacion', 349, 'tarifas', 'Cliente antiguo · Implicación',
   'Precio mensual por sistema que se propone al marcar «cliente antiguo» en el modelo Implicación. Editable oferta a oferta.',
   'euros', 0, 5000, 120),
  ('precio_antiguo_compromiso',  549, 'tarifas', 'Cliente antiguo · Compromiso',
   'Precio mensual por sistema que se propone al marcar «cliente antiguo» en el modelo Compromiso. Editable oferta a oferta.',
   'euros', 0, 5000, 130)

-- `do nothing`: si alguien ya ajustó una de estas cifras a mano, relanzar la
-- migración no se la pisa.
on conflict (clave) do nothing;

-- Que se entienda para qué sirve el que ya existía, ahora que hay varios.
update public.parametros_precio
   set etiqueta    = 'Suelo · resto de sistemas',
       descripcion = 'Cuota mínima mensual de cada sistema que no tenga suelo propio. La ISO 9001 tiene el suyo, por complejidad.',
       orden       = 10
 where clave = 'suelo_por_sistema';

-- ── El suelo, en una sola función ──────────────────────────────────────────
-- La regla vive aquí y no repartida por la aplicación: si mañana la 45001
-- tiene suelo propio, se añade su parámetro y esta función lo encuentra sola,
-- sin desplegar nada.
--
-- Busca por este orden:
--   1. `suelo_<norma>_<complejidad>`   → suelo_9001_alta
--   2. `suelo_<norma>`                 → suelo_9001
--   3. `suelo_por_sistema`             → el general
create or replace function public.suelo_sistema(p_norma text, p_complejidad text default null)
returns numeric
language sql
stable
as $$
  select coalesce(
    (select valor from public.parametros_precio
      where clave = 'suelo_' || lower(trim(coalesce(p_norma, ''))) || '_' || lower(trim(coalesce(p_complejidad, '')))),
    (select valor from public.parametros_precio
      where clave = 'suelo_' || lower(trim(coalesce(p_norma, '')))),
    (select valor from public.parametros_precio where clave = 'suelo_por_sistema'),
    350);
$$;

comment on function public.suelo_sistema(text, text) is
  'Cuota mínima mensual de un sistema, según su norma y la complejidad del cliente. Lee de parametros_precio.';

grant execute on function public.suelo_sistema(text, text) to authenticated;

-- ── Tarifa heredada, también en una función ────────────────────────────────
create or replace function public.precio_cliente_antiguo(p_modelo text)
returns numeric
language sql
stable
as $$
  select (select valor from public.parametros_precio
           where clave = 'precio_antiguo_' ||
             case lower(trim(coalesce(p_modelo, '')))
               when 'relación'    then 'relacion'
               when 'relacion'    then 'relacion'
               when 'implicación' then 'implicacion'
               when 'implicacion' then 'implicacion'
               when 'compromiso'  then 'compromiso'
               else '—'
             end);
$$;

comment on function public.precio_cliente_antiguo(text) is
  'Precio mensual por sistema que se propone a un cliente antiguo en cada modelo recurrente. NULL en los modelos que no lo tienen (Apoyo, Implantación).';

grant execute on function public.precio_cliente_antiguo(text) to authenticated;

notify pgrst, 'reload schema';

-- ── Comprobación ───────────────────────────────────────────────────────────
select 'v115 aplicada' as ok;

select clave, valor, etiqueta
  from public.parametros_precio
 where grupo in ('suelos','tarifas')
 order by grupo, orden;

select public.suelo_sistema('9001','baja')  as s_9001_baja,    -- 199
       public.suelo_sistema('9001','media') as s_9001_media,   -- 199
       public.suelo_sistema('9001','alta')  as s_9001_alta,    -- 249
       public.suelo_sistema('14001','baja') as s_14001,        -- 350
       public.suelo_sistema('27001', null)  as s_27001,        -- 350
       public.precio_cliente_antiguo('Relación')    as ant_rel,   -- 199
       public.precio_cliente_antiguo('Implicación') as ant_imp,   -- 349
       public.precio_cliente_antiguo('Compromiso')  as ant_com,   -- 549
       public.precio_cliente_antiguo('Apoyo')       as ant_apoyo; -- null
