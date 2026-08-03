-- ═══════════════════════════════════════════════════════════════════════════
-- ¿SE GUARDÓ LA EMPRESA?
--
-- Distingue las dos posibilidades: que no se guardara, o que se guardara y la
-- lista no la muestre. Son arreglos distintos.
--
-- Todo en una consulta, sin nombrar columnas que puedan no existir: la fila
-- entera se convierte a JSON y así da igual qué columnas tenga tu tabla.
-- ═══════════════════════════════════════════════════════════════════════════

select * from (

  select 1 as n,
         '¿Está G28494912 en la base?' as pregunta,
         case when exists (
           select 1 from public.empresas
            where upper(regexp_replace(coalesce(cif,''), '[^A-Za-z0-9]', '', 'g')) like '%G28494912%'
         ) then '✓ SÍ está guardada — el problema es que la lista no la muestra'
            else '✗ NO ESTÁ: el guardado falló' end as respuesta

  union all
  select 2, 'Sus datos (fila completa)',
         coalesce((select jsonb_pretty(to_jsonb(e))::text from public.empresas e
                    where upper(regexp_replace(coalesce(e.cif,''), '[^A-Za-z0-9]', '', 'g')) like '%G28494912%'
                    limit 1), '—')

  union all
  select 3, 'Empresas en total',
         (select count(*)::text from public.empresas)

  union all
  select 4, 'Las cinco últimas creadas',
         coalesce((select string_agg(x.t, '  ·  ')
                     from (select coalesce(nombre,'(sin nombre)') || ' [' || coalesce(cif,'sin CIF') || ']' as t
                             from public.empresas order by creado desc nulls last limit 5) x), '—')

  union all
  select 5, 'Columnas que tiene la tabla empresas',
         (select string_agg(column_name, ', ' order by ordinal_position)
            from information_schema.columns where table_name = 'empresas')

) t order by n;
