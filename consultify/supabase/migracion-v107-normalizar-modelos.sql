-- ═══════════════════════════════════════════════════════════════════════════
-- v107 · LOS MODELOS, ESCRITOS IGUAL EN TODAS PARTES
--
-- El catálogo guarda «Implantación» y algunos proyectos tienen «implantacion»,
-- según cómo se escribiera el día que se creó. Con una comparación literal, un
-- proyecto de implantación no encontraba NINGUNA de las 331 tareas de su
-- catálogo y la pantalla decía «0 tareas» sin que hubiera nada roto.
--
-- La aplicación ya compara ignorando tildes y mayúsculas, así que esto no es
-- imprescindible. Pero dejar el dato sucio significa que el próximo que
-- consulte por SQL —un informe, una vista, otra pantalla— vuelva a tropezar.
-- Se normaliza en origen.
-- ═══════════════════════════════════════════════════════════════════════════

-- Clave comparable: sin tildes, en minúsculas.
create or replace function public.clave_modelo(t text)
returns text language sql immutable as $$
  select lower(trim(translate(coalesce(t, ''),
    'ÁÀÄÂáàäâÉÈËÊéèëêÍÌÏÎíìïîÓÒÖÔóòöôÚÙÜÛúùüûÑñ',
    'AAAAaaaaEEEEeeeeIIIIiiiiOOOOooooUUUUuuuuNn')))
$$;

-- Los cinco nombres canónicos, tal y como los escribe el catálogo.
do $$
declare
  v_canonicos text[] := array['Apoyo','Relación','Implicación','Compromiso','Implantación'];
  v_nombre text;
begin
  foreach v_nombre in array v_canonicos loop
    -- Proyectos
    execute format(
      'update public.proyectos_cliente set modelo = %L
        where modelo is not null and modelo <> %L
          and public.clave_modelo(modelo) = public.clave_modelo(%L)',
      v_nombre, v_nombre, v_nombre);

    -- Catálogo de tareas
    execute format(
      'update public.tareas_catalogo set modelo = %L
        where modelo is not null and modelo <> %L
          and public.clave_modelo(modelo) = public.clave_modelo(%L)',
      v_nombre, v_nombre, v_nombre);

    -- Tareas ya creadas en proyectos
    if to_regclass('public.cliente_tareas') is not null then
      execute format(
        'update public.cliente_tareas set modelo = %L
          where modelo is not null and modelo <> %L
            and public.clave_modelo(modelo) = public.clave_modelo(%L)',
        v_nombre, v_nombre, v_nombre);
    end if;

    -- Ofertas y contratos, para que el precio y el documento cuadren
    execute format(
      'update public.presupuestos set modelo = %L
        where modelo is not null and modelo <> %L
          and public.clave_modelo(modelo) = public.clave_modelo(%L)',
      v_nombre, v_nombre, v_nombre);

    if to_regclass('public.contratos') is not null then
      execute format(
        'update public.contratos set modelo = %L
          where modelo is not null and modelo <> %L
            and public.clave_modelo(modelo) = public.clave_modelo(%L)',
        v_nombre, v_nombre, v_nombre);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';

-- Qué modelos han quedado. Si aparece alguno que no sea de los cinco
-- canónicos, es un valor escrito a mano que habrá que revisar.
select 'v107 aplicada' as ok,
       (select string_agg(distinct modelo, ' · ') from public.proyectos_cliente
         where modelo is not null)                    as modelos_en_proyectos,
       (select string_agg(distinct modelo, ' · ') from public.tareas_catalogo
         where modelo is not null)                    as modelos_en_catalogo;
