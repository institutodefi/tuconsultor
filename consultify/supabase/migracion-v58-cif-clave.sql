-- ═══════════════════════════════════════════════════════════════════════════
-- v58 · EL CIF ES EL DATO CLAVE DE LA EMPRESA
--
-- La ficha ya lo exige y valida en el navegador, pero eso no basta: cualquier
-- alta por API, por importación o por un bug se colaría igual. Aquí se blinda
-- en la base de datos.
--
-- Se hace en dos pasos deliberadamente separados:
--   1 · índice ÚNICO  → se puede aplicar siempre, no rompe nada
--   2 · NOT NULL      → solo si no quedan empresas sin CIF (si quedan, la
--                       migración te las lista y NO fuerza nada)
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1 · Normalizar lo que ya hay: mayúsculas y sin espacios ni guiones ──
update public.empresas
   set cif = upper(regexp_replace(cif, '[\s.\-]', '', 'g'))
 where cif is not null
   and cif <> upper(regexp_replace(cif, '[\s.\-]', '', 'g'));

-- ── 2 · Índice único (solo sobre las que tienen CIF) ──
-- Si esto falla, hay CIF repetidos: la consulta del apartado 4 te dice cuáles.
create unique index if not exists empresas_cif_unico
  on public.empresas (cif)
  where cif is not null;

commit;

-- ── 3 · NOT NULL solo si es seguro ──
do $$
declare sin_cif int;
begin
  select count(*) into sin_cif from public.empresas where cif is null or btrim(cif) = '';
  if sin_cif = 0 then
    alter table public.empresas alter column cif set not null;
    raise notice 'CIF obligatorio activado en base de datos.';
  else
    raise notice 'HAY % empresa(s) sin CIF: no se activa NOT NULL. Rellénalas y vuelve a ejecutar este bloque.', sin_cif;
  end if;
end $$;

notify pgrst, 'reload schema';

-- ═══ 4 · Consultas de apoyo ════════════════════════════════════════════════
-- Empresas sin CIF (hay que rellenarlas para poder activar NOT NULL):
--   select id, nombre, es_cliente, es_proveedor from public.empresas
--    where cif is null or btrim(cif) = '' order by nombre;
--
-- CIF duplicados (impiden crear el índice único):
--   select cif, count(*), string_agg(nombre, ' | ') from public.empresas
--    where cif is not null group by cif having count(*) > 1;

select 'v58 aplicada' as ok;
