-- ═══════════════════════════════════════════════════════════════════════════
-- ¿SE GUARDÓ LA EMPRESA?
--
-- Distingue las dos posibilidades: que no se guardara, o que se guardara y la
-- lista no la muestre. Son arreglos distintos y sin esto no se sabe cuál es.
-- ═══════════════════════════════════════════════════════════════════════════

select
  case when count(*) = 0 then '✗ NO ESTÁ en la base: el guardado falló'
       else '✓ Sí está guardada — el problema es que la lista no la muestra' end as veredicto,
  count(*) as filas
from public.empresas
where upper(regexp_replace(coalesce(cif,''), '[^A-Za-z0-9]', '', 'g'))
    = upper(regexp_replace('G28494912', '[^A-Za-z0-9]', '', 'g'));

-- Si está, aquí van sus datos y sus banderas: `activo` o `revisado` en un valor
-- raro podrían dejarla fuera de algún filtro de la pantalla.
select id, nombre, cif, es_cliente, es_proveedor, estado_comercial,
       activo, revisado, origen, creado
  from public.empresas
 where upper(regexp_replace(coalesce(cif,''), '[^A-Za-z0-9]', '', 'g')) = 'G28494912';

-- Cuántas hay en total: si son más de 1000, la lista puede estar cortándose.
select count(*) as empresas_en_total,
       count(*) filter (where activo is false) as inactivas,
       count(*) filter (where revisado is false) as sin_revisar
  from public.empresas;

-- Las cinco últimas creadas, para ver si la tuya está entre ellas.
select nombre, cif, creado
  from public.empresas
 order by creado desc nulls last
 limit 5;
