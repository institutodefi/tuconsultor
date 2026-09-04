-- ═══════════════════════════════════════════════════════════════════════════
-- v72 · EL TIPO «PROYECTO» EN PRESUPUESTOS  (corregida)
--
-- `presupuestos.tipo` solo admitía 'mes' y 'bolsa'. En la v99 la Implantación
-- pasó a ser un proyecto y el motor empezó a devolver 'proyecto', que la tabla
-- rechazaba.
--
-- La primera versión de esta migración ponía la restricción ANTES de limpiar
-- los datos y fallaba con:
--
--   check constraint "presupuestos_tipo_check" of relation "presupuestos"
--   is violated by some row
--
-- Orden correcto: quitar la restricción, ARREGLAR las filas, y solo entonces
-- volver a ponerla. Una restricción se aplica a lo que ya hay, no solo a lo que
-- venga después.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Fuera la restricción, para poder tocar los datos ──
alter table public.presupuestos drop constraint if exists presupuestos_tipo_check;

-- ── 2 · Qué hay ahí dentro ──
-- Se muestra antes de tocar nada: si aparece algo inesperado, conviene verlo.
do $$
declare r record;
begin
  raise notice '--- valores de `tipo` antes de normalizar ---';
  for r in
    select coalesce(tipo,'(nulo)') as t, coalesce(modelo,'(sin modelo)') as m, count(*) as n
      from public.presupuestos group by 1,2 order by 3 desc
  loop
    raise notice '  tipo=% · modelo=% · % fila(s)', r.t, r.m, r.n;
  end loop;
end $$;

-- ── 3 · Normalizar ──
-- El modelo manda: es el dato fiable. El tipo se deduce de él, y así se corrige
-- tanto lo mal etiquetado como cualquier valor que se colara por el camino.
update public.presupuestos
   set tipo = case
     when modelo = 'Implantación' then 'proyecto'
     when modelo = 'Apoyo'        then 'bolsa'
     when modelo in ('Relación','Implicación','Compromiso') then 'mes'
     -- Sin modelo reconocible se respeta lo que hubiera si es válido; si no,
     -- se deja en 'mes', que es el valor por defecto histórico de la columna.
     when tipo in ('mes','bolsa','proyecto') then tipo
     else 'mes'
   end
 where tipo is distinct from (case
     when modelo = 'Implantación' then 'proyecto'
     when modelo = 'Apoyo'        then 'bolsa'
     when modelo in ('Relación','Implicación','Compromiso') then 'mes'
     when tipo in ('mes','bolsa','proyecto') then tipo
     else 'mes'
   end);

-- ── 4 · Comprobar que ya no queda nada fuera ──
do $$
declare n int;
begin
  select count(*) into n from public.presupuestos
   where tipo is null or tipo not in ('mes','bolsa','proyecto');
  if n > 0 then
    raise exception 'Quedan % filas con un tipo no válido. No se pone la restricción.', n;
  end if;
  raise notice '--- después de normalizar: 0 filas fuera de (mes, bolsa, proyecto) ---';
end $$;

-- ── 5 · Ahora sí, la restricción ──
alter table public.presupuestos
  add constraint presupuestos_tipo_check
  check (tipo in ('mes','bolsa','proyecto'));

comment on column public.presupuestos.tipo is
  'Forma de cobro: mes (cuota recurrente) · bolsa (fondo de horas prepagado) · proyecto (implantación: pago único o dos cuotas).';

-- ── 6 · Resultado ──
do $$
declare r record;
begin
  raise notice '--- reparto final ---';
  for r in select tipo, count(*) as n from public.presupuestos group by 1 order by 2 desc loop
    raise notice '  %: % oferta(s)', r.tipo, r.n;
  end loop;
end $$;

notify pgrst, 'reload schema';

select 'v72 aplicada' as ok;
