-- ═══════════════════════════════════════════════════════════════════════════
-- v106 · EL EQUIPO SE ASIGNA POR PROYECTO, NO POR CLIENTE
--
-- Hasta ahora los consultores colgaban de `clientes`: un cliente, un equipo
-- fijo. Pero un mismo cliente puede tener a la vez una implantación de ISO 27001
-- con el especialista en seguridad y un mantenimiento de 9001 con otra persona.
-- Con el equipo atado al cliente, o se ponía a los dos en todo, o se elegía uno
-- y el otro no veía su trabajo.
--
-- Se añade `proyecto_equipo`: quién trabaja en QUÉ proyecto y con qué papel.
-- De ahí sale el panel de cada consultor —«mis proyectos»— sin tener que
-- deducirlo de las tareas que ya tenga asignadas, que es circular: sin tareas
-- no vería el proyecto, y sin ver el proyecto no puede programarse tareas.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.proyecto_equipo (
  id           uuid primary key default gen_random_uuid(),
  proyecto_id  uuid not null references public.proyectos_cliente(id) on delete cascade,
  perfil_id    uuid not null references public.perfiles(id) on delete cascade,
  papel        text not null default 'consultor'
                 check (papel in ('responsable','consultor','apoyo')),
  -- Horas que se le asignan de las comprometidas del proyecto. Opcional: no
  -- siempre se reparte de antemano.
  horas_asignadas numeric(7,2),
  desde        date,
  hasta        date,
  creado       timestamptz not null default now(),
  -- Una persona una vez por proyecto: si cambia de papel, se actualiza la fila.
  unique (proyecto_id, perfil_id)
);

create index if not exists proyecto_equipo_proyecto on public.proyecto_equipo (proyecto_id);
create index if not exists proyecto_equipo_perfil   on public.proyecto_equipo (perfil_id);

comment on table public.proyecto_equipo is
  'Quién trabaja en cada proyecto. De aquí sale «mis proyectos» en el panel del consultor.';
comment on column public.proyecto_equipo.papel is
  'responsable: rinde cuentas del proyecto · consultor: ejecuta · apoyo: puntual.';

-- Un solo responsable por proyecto: con dos, no hay ninguno.
create unique index if not exists proyecto_equipo_un_responsable
  on public.proyecto_equipo (proyecto_id) where papel = 'responsable';

-- ── Traer lo que ya había ──────────────────────────────────────────────────
-- Los consultores asignados al CLIENTE pasan a estar asignados a sus proyectos.
-- Es lo más fiel a la situación actual: hasta ahora, quien llevaba el cliente
-- llevaba todos sus proyectos.
-- `consultores` enlaza con la cuenta por `user_id`, que es el mismo id que
-- `perfiles.id`. Solo se migra a quien tenga cuenta: un consultor sin usuario
-- no puede ver un panel, así que asignarlo no serviría de nada.
insert into public.proyecto_equipo (proyecto_id, perfil_id, papel)
select p.id, cs.user_id, 'responsable'
  from public.proyectos_cliente p
  join public.clientes cl on cl.id = p.cliente_id
  join public.consultores cs on cs.id = cl.consultor_1_id
  join public.perfiles pf on pf.id = cs.user_id
 where cs.user_id is not null
on conflict (proyecto_id, perfil_id) do nothing;

insert into public.proyecto_equipo (proyecto_id, perfil_id, papel)
select p.id, cs.user_id, 'consultor'
  from public.proyectos_cliente p
  join public.clientes cl on cl.id = p.cliente_id
  join public.consultores cs on cs.id = cl.consultor_2_id
  join public.perfiles pf on pf.id = cs.user_id
 where cs.user_id is not null
on conflict (proyecto_id, perfil_id) do nothing;

-- ── Los proyectos de una persona, con su carga ─────────────────────────────
-- Reúne en una consulta lo que el panel del consultor necesita: sus proyectos,
-- las horas comprometidas de sus tareas y lo que lleva planificado y ejecutado.
create or replace view public.v_mis_proyectos as
select e.perfil_id,
       e.papel,
       e.horas_asignadas,
       p.id            as proyecto_id,
       p.nombre        as proyecto,
       p.estado,
       p.fecha_inicio, p.fecha_fin, p.fecha_limite,
       p.normas, p.modelo,
       coalesce(nullif(emp.nombre_comercial, ''), emp.nombre, cl.empresa) as cliente,
       cl.id           as cliente_id,
       -- Comprometido: lo que suman las horas de catálogo de sus tareas.
       coalesce((select sum(t.horas) from public.cliente_tareas t
                  where t.proyecto_id = p.id), 0)              as horas_comprometidas,
       coalesce((select count(*) from public.cliente_tareas t
                  where t.proyecto_id = p.id), 0)              as tareas_comprometidas,
       -- Planificado y ejecutado: de las sesiones de esas tareas.
       coalesce((select sum(s.horas) from public.tarea_sesiones s
                  join public.cliente_tareas t on t.id = s.cliente_tarea_id
                 where t.proyecto_id = p.id and s.estado <> 'anulada'), 0) as horas_planificadas,
       coalesce((select sum(s.horas) from public.tarea_sesiones s
                  join public.cliente_tareas t on t.id = s.cliente_tarea_id
                 where t.proyecto_id = p.id and s.estado = 'hecha'), 0)    as horas_ejecutadas
  from public.proyecto_equipo e
  join public.proyectos_cliente p on p.id = e.proyecto_id
  left join public.clientes cl on cl.id = p.cliente_id
  left join public.empresas emp
    on upper(regexp_replace(coalesce(emp.cif, ''), '[\s.-]', '', 'g'))
     = upper(regexp_replace(coalesce(cl.cif, ''), '[\s.-]', '', 'g'))
   and coalesce(cl.cif, '') <> '';

grant select on public.v_mis_proyectos to authenticated;

-- ── Acceso ─────────────────────────────────────────────────────────────────
alter table public.proyecto_equipo enable row level security;

-- Lo ve todo el equipo: saber quién lleva qué es información de trabajo.
drop policy if exists pe_lectura on public.proyecto_equipo;
create policy pe_lectura on public.proyecto_equipo for select to authenticated
  using (coalesce(public.mi_rol(), '') in
         ('superadmin','admin','director','consultor','gestion'));

-- Asignar equipo es una decisión de dirección: reparte la carga de trabajo de
-- otras personas y compromete su agenda.
drop policy if exists pe_escritura on public.proyecto_equipo;
create policy pe_escritura on public.proyecto_equipo for all to authenticated
  using (coalesce(public.mi_rol(), '') in ('superadmin','admin','director'))
  with check (coalesce(public.mi_rol(), '') in ('superadmin','admin','director'));

grant select on public.proyecto_equipo to authenticated;
grant insert, update, delete on public.proyecto_equipo to authenticated;

notify pgrst, 'reload schema';

select 'v106 aplicada' as ok,
       count(*) as asignaciones_migradas
  from public.proyecto_equipo;
