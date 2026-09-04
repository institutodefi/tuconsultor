-- ═══════════════════════════════════════════════════════════════════════════
-- v80 · EL NÚMERO DE OFERTA, ÚNICO
--
-- Con la red de seguridad del servidor puede intentarse crear la fila dos veces
-- —una desde el navegador y otra desde la función— si ambas llegan a la vez.
-- La función comprueba antes si existe, pero entre comprobar y crear cabe otra
-- petición. Sin unicidad acabarían dos filas con el mismo número de oferta.
--
-- Un número de oferta duplicado es peor que una oferta sin guardar: el cliente
-- tiene un PDF y el sistema dos registros distintos con ese número.
-- ═══════════════════════════════════════════════════════════════════════════

-- Primero, ¿hay duplicados ya? Si los hay, esto los enseña y no rompe.
do $$
declare r record; n int := 0;
begin
  for r in
    select numero_oferta, count(*) as veces
      from public.presupuestos
     where numero_oferta is not null
     group by numero_oferta having count(*) > 1
  loop
    n := n + 1;
    raise notice 'DUPLICADO: % aparece % veces', r.numero_oferta, r.veces;
  end loop;
  if n = 0 then
    raise notice 'Sin duplicados: se puede poner el índice único.';
  else
    raise notice 'Hay % número(s) repetido(s). Revísalos antes: el índice no se creará.', n;
  end if;
end $$;

-- El índice solo se intenta si NO hay duplicados. Si los hay, la migración
-- termina bien pero avisa: hay que resolverlos a mano, porque decidir cuál de
-- las dos filas se queda no es cosa de un script.
do $$
declare dup int;
begin
  select count(*) into dup from (
    select numero_oferta from public.presupuestos
     where numero_oferta is not null
     group by numero_oferta having count(*) > 1) t;

  if dup > 0 then
    raise notice '';
    raise notice '>>> ÍNDICE NO CREADO. Resuelve antes los % número(s) repetido(s) de arriba.', dup;
    raise notice '>>> Para verlos: select numero_oferta, count(*) from presupuestos group by 1 having count(*)>1;';
  else
    create unique index if not exists presupuestos_numero_unico
      on public.presupuestos (numero_oferta) where numero_oferta is not null;
    comment on index presupuestos_numero_unico is
      'Un número de oferta, una fila. Evita duplicados si el navegador y el servidor registran la misma.';
    raise notice '>>> Índice único creado: un número de oferta, una fila.';
  end if;
end $$;

notify pgrst, 'reload schema';
