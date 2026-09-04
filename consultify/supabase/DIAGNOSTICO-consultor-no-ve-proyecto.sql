-- ═══════════════════════════════════════════════════════════════════════════
-- DIAGNÓSTICO · por qué un consultor no ve un proyecto
--
-- Pégalo en el editor SQL de Supabase. No modifica nada: solo consulta.
--
-- Cambia 'ADF' por el nombre del cliente que quieras revisar.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · ¿Existen las tablas nuevas? ────────────────────────────────────────
-- Si alguna sale 'FALTA', ese es el problema: hay migraciones sin aplicar y
-- todo lo demás es consecuencia.
select 'proyecto_equipo' as tabla,
       case when to_regclass('public.proyecto_equipo') is null
            then 'FALTA · aplica la v106' else 'ok' end as estado
union all
select 'tarea_sesiones',
       case when to_regclass('public.tarea_sesiones') is null
            then 'FALTA · aplica la v104' else 'ok' end
union all
select 'cliente_tareas',
       case when to_regclass('public.cliente_tareas') is null
            then 'FALTA' else 'ok' end;

-- ── 2 · Los proyectos de ese cliente ───────────────────────────────────────
select p.id            as proyecto_id,
       p.nombre,
       p.estado,
       p.modelo,
       p.normas,
       cl.empresa      as cliente,
       (select count(*) from public.cliente_tareas t where t.proyecto_id = p.id)  as tareas,
       (select count(*) from public.proyecto_equipo e where e.proyecto_id = p.id) as personas_asignadas
  from public.proyectos_cliente p
  join public.clientes cl on cl.id = p.cliente_id
 where cl.empresa ilike '%ADF%';

-- ── 3 · Quién está asignado, y si tiene cuenta ─────────────────────────────
-- La columna `puede_verlo` es la clave: sin cuenta activa, una persona puede
-- estar asignada y no ver nada, porque no hay panel donde enseñárselo.
select cl.empresa                        as cliente,
       p.nombre                          as proyecto,
       e.papel,
       pf.nombre || ' ' || coalesce(pf.apellidos, '') as persona,
       pf.email,
       pf.rol,
       pf.activo,
       case when pf.id is null then 'NO · sin perfil'
            when pf.activo is not true then 'NO · perfil inactivo'
            else 'sí' end                as puede_verlo
  from public.proyecto_equipo e
  join public.proyectos_cliente p on p.id = e.proyecto_id
  join public.clientes cl on cl.id = p.cliente_id
  left join public.perfiles pf on pf.id = e.perfil_id
 where cl.empresa ilike '%ADF%';

-- ── 4 · Consultores asignados al CLIENTE (el sistema antiguo) ──────────────
-- Si aquí hay gente pero en el punto 3 no, es que la v106 no llegó a migrarlos:
-- solo migra a quien tenga cuenta de usuario.
select cl.empresa,
       c1.nombre as consultor_1, c1.user_id as user_1,
       c2.nombre as consultor_2, c2.user_id as user_2
  from public.clientes cl
  left join public.consultores c1 on c1.id = cl.consultor_1_id
  left join public.consultores c2 on c2.id = cl.consultor_2_id
 where cl.empresa ilike '%ADF%';

-- ── 5 · ¿Hay tareas en el catálogo para ese modelo? ────────────────────────
-- Si `con_horas` es 0, el volcado no traerá nada: una tarea de 0 h no se
-- programa, así que no se crea.
select t.norma_id,
       t.modelo,
       count(*)                                        as tareas,
       count(*) filter (where t.horas_base > 0)        as con_horas,
       round(sum(t.horas_base), 1)                     as horas_totales
  from public.tareas_catalogo t
 where t.norma_id in (
         select unnest(p.normas) from public.proyectos_cliente p
           join public.clientes cl on cl.id = p.cliente_id
          where cl.empresa ilike '%ADF%' limit 1)
 group by t.norma_id, t.modelo
 order by t.norma_id, t.modelo;
