-- ═══════════════════════════════════════════════════════════════════════════
-- TUCONSULTOR · MIGRACIONES v107 → v108
--
-- Pegalo ENTERO en el editor SQL de Supabase. SQL puro, reejecutable.
--
--   v107  los modelos escritos igual en todas partes (la tilde de
--         «Implantación» hacia que un proyecto no encontrara sus tareas)
--   v108  los proyectos heredan normas y modelo de SU OFERTA
--         (caso CECE: oferta de Relacion con 3 sistemas, proyecto con 1)
--
-- La v108 usa una funcion que crea la v107, asi que van juntas y en este orden.
-- Al terminar debe salir 'MIGRACIONES v107-v108 APLICADAS'.
-- ═══════════════════════════════════════════════════════════════════════════

begin;


-- ─────────────────────────────────────────────────────────────────────
-- migracion-v107-normalizar-modelos.sql
-- ─────────────────────────────────────────────────────────────────────
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

-- Qué modelos han quedado. Si aparece alguno que no sea de los cinco
-- canónicos, es un valor escrito a mano que habrá que revisar.


-- ─────────────────────────────────────────────────────────────────────
-- migracion-v108-heredar-de-oferta.sql
-- ─────────────────────────────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- v108 · LOS PROYECTOS HEREDAN NORMAS Y MODELO DE SU OFERTA
--
-- Caso real: una oferta de CECE en modelo Relación con ISO 9001, 14001 y 27001.
-- Su proyecto apareció con solo 9001 y modelo «Apoyo», que son los valores por
-- defecto de la pantalla. La copia de normas y modelo del proyecto estaba
-- vacía, y nadie se dio cuenta hasta abrirlo.
--
-- La v103 ya hacía este relleno, pero solo cuando la copia estaba VACÍA de
-- verdad (`cardinality = 0`). No cubría el caso de un proyecto con `{9001}`
-- puesto por defecto, que es lo que ocurre cuando alguien abre el panel y
-- guarda sin darse cuenta.
--
-- Aquí se corrige eso: si el proyecto tiene menos normas que su oferta, o un
-- modelo distinto, se toma el de la oferta. La oferta es lo que se firmó.
--
-- Lo que NO se toca: un proyecto con MÁS normas que su oferta. Eso es una
-- ampliación deliberada —se añadió alcance sin reemitir— y sobreescribirla
-- borraría una decisión.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Normas ─────────────────────────────────────────────────────────────
update public.proyectos_cliente p
   set normas = o.normas
  from public.presupuestos o
 where o.id = p.oferta_id
   and o.normas is not null
   and cardinality(o.normas) > 0
   and (
     p.normas is null
     or cardinality(p.normas) = 0
     -- El proyecto se quedó corto: le faltan normas que la oferta sí tiene.
     or exists (select 1 from unnest(o.normas) n
                 where not (n = any(coalesce(p.normas, '{}'))))
   )
   -- Salvo que el proyecto tenga alguna que la oferta no: eso es ampliación.
   and not exists (select 1 from unnest(coalesce(p.normas, '{}')) n
                    where not (n = any(o.normas)));

-- ── 2 · Modelo ─────────────────────────────────────────────────────────────
-- Se compara sin tildes: «implantacion» y «Implantación» son el mismo modelo,
-- y cambiarlo sería solo ortografía, no una corrección real.
update public.proyectos_cliente p
   set modelo = o.modelo
  from public.presupuestos o
 where o.id = p.oferta_id
   and coalesce(o.modelo, '') <> ''
   and (p.modelo is null or p.modelo = ''
        or public.clave_modelo(p.modelo) <> public.clave_modelo(o.modelo));

-- ── 3 · Lo mismo llegando por el contrato ──────────────────────────────────
update public.proyectos_cliente p
   set normas = o.normas,
       modelo = coalesce(nullif(o.modelo, ''), p.modelo)
  from public.contratos c
  join public.presupuestos o on o.id = c.presupuesto_id
 where c.id = p.contrato_id
   and p.oferta_id is null
   and o.normas is not null
   and cardinality(o.normas) > 0
   and (p.normas is null or cardinality(p.normas) = 0
        or exists (select 1 from unnest(o.normas) n
                    where not (n = any(coalesce(p.normas, '{}')))));

-- ── 4 · Los meses, si el proyecto no los tiene ─────────────────────────────
update public.proyectos_cliente p
   set meses_estimados = o.meses
  from public.presupuestos o
 where o.id = p.oferta_id
   and o.meses is not null and o.meses > 0
   and (p.meses_estimados is null or p.meses_estimados = 0);

-- Qué ha quedado: proyectos cuyas normas siguen sin coincidir con su oferta.
-- Si aparece alguno, es una ampliación deliberada y está bien que se quede.


commit;

notify pgrst, 'reload schema';

select 'MIGRACIONES v107-v108 APLICADAS' as resultado,
       (select string_agg(distinct modelo, ' · ') from public.proyectos_cliente
         where modelo is not null)                                as modelos_en_proyectos,
       (select count(*) from public.proyectos_cliente p
          join public.presupuestos o on o.id = p.oferta_id
         where p.normas is distinct from o.normas)                as proyectos_con_alcance_ampliado;
