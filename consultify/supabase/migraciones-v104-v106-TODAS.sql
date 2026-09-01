-- ═══════════════════════════════════════════════════════════════════════════
-- TUCONSULTOR · MIGRACIONES v104 → v106
--
-- Pegalo ENTERO en el editor SQL de Supabase y ejecutalo de una vez.
-- SQL puro: sin Markdown. Se puede ejecutar varias veces sin romper nada.
--
--   v104  sesiones de tarea: varias por tarea, con hora inicio y fin, y las
--         horas teoricas del modelo, que no se editan
--   v105  el catalogo de tareas lo leen todos, solo lo edita Administracion
--   v106  el equipo se asigna por PROYECTO, no por cliente
--
-- Requisito: hay que haber aplicado antes hasta la v103.
-- Al terminar debe salir 'MIGRACIONES v104-v106 APLICADAS'.
-- ═══════════════════════════════════════════════════════════════════════════

begin;


-- ─────────────────────────────────────────────────────────────────────
-- migracion-v104-sesiones-tarea.sql
-- ─────────────────────────────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- v104 · UNA TAREA, VARIAS SESIONES
--
-- Hasta ahora una tarea tenía UNA fecha y UNA duración. Pero el trabajo real no
-- es así: una auditoría interna de 8 horas se hace en dos mañanas, y una
-- revisión por la dirección se prepara un día y se presenta otro.
--
-- Se separan dos cosas que estaban mezcladas:
--
--   `tareas_programadas.horas_teoricas`  lo que el MODELO dice que cuesta esa
--                                        tarea. Sale del catálogo y NO se toca:
--                                        es lo comprometido en la oferta, y si
--                                        se pudiera editar, la comparación
--                                        planificado-frente-a-comprometido no
--                                        significaría nada.
--
--   `tarea_sesiones`                     cada vez que alguien se sienta a
--                                        hacerla: fecha, hora de inicio y fin,
--                                        y quién. Las horas se SUMAN.
--
-- La agenda del consultor pasa a leer las sesiones: es donde están la fecha y
-- la hora reales. Sin sesiones, una tarea no está en el calendario de nadie.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Las horas comprometidas, intocables ────────────────────────────────
alter table public.tareas_programadas
  add column if not exists horas_teoricas numeric(6,2);

comment on column public.tareas_programadas.horas_teoricas is
  'Horas que el modelo asigna a esta tarea. Vienen del catálogo y no se editan: son la referencia contra la que se compara lo planificado.';

-- Rellenar desde la duración que ya tuvieran, para no perder lo cargado.
update public.tareas_programadas
   set horas_teoricas = round(duracion_min::numeric / 60, 2)
 where horas_teoricas is null and duracion_min is not null and duracion_min > 0;

-- ── 2 · Sesiones ───────────────────────────────────────────────────────────
-- Conviven DOS tablas de tareas: `cliente_tareas` (panel de configuración del
-- proyecto) y `tareas_programadas` (planificador por contextos). Unificarlas
-- ahora obligaría a migrar datos en producción con el sistema en uso, así que
-- las sesiones aceptan colgar de cualquiera de las dos y un check garantiza que
-- cuelgan de UNA sola. Cuando se decida cuál se queda, esto se simplifica sin
-- perder nada.
create table if not exists public.tarea_sesiones (
  id           uuid primary key default gen_random_uuid(),
  tarea_id     uuid references public.tareas_programadas(id) on delete cascade,
  cliente_tarea_id uuid references public.cliente_tareas(id) on delete cascade,
  consultor_id uuid references public.perfiles(id) on delete set null,
  fecha        date not null,
  hora_inicio  time not null,
  hora_fin     time not null,
  -- Se guarda calculado para poder sumar sin recalcular en cada consulta, y
  -- para que un cambio de hora no deje totales viejos por ahí.
  horas        numeric(6,2) generated always as (
                 round(extract(epoch from (hora_fin - hora_inicio)) / 3600.0, 2)
               ) stored,
  estado       text not null default 'programada'
                 check (estado in ('programada','hecha','anulada')),
  notas        text,
  creado       timestamptz not null default now(),
  -- Una sesión que acaba antes de empezar es un error de tecleo, no un dato.
  constraint sesion_horas_coherentes check (hora_fin > hora_inicio),
  -- Exactamente una tarea de origen: ni ninguna ni las dos.
  constraint sesion_una_tarea check (
    (tarea_id is not null)::int + (cliente_tarea_id is not null)::int = 1)
);

create index if not exists tarea_sesiones_tarea on public.tarea_sesiones (tarea_id) where tarea_id is not null;
create index if not exists tarea_sesiones_ctarea on public.tarea_sesiones (cliente_tarea_id) where cliente_tarea_id is not null;
create index if not exists tarea_sesiones_agenda
  on public.tarea_sesiones (consultor_id, fecha) where estado <> 'anulada';

comment on table public.tarea_sesiones is
  'Cada vez que se trabaja en una tarea. Varias sesiones por tarea; sus horas se suman y se comparan con las teóricas.';

-- ── 3 · Lo planificado y lo ejecutado de cada tarea ────────────────────────
create or replace view public.v_tareas_horas as
select t.id                                   as tarea_id,
       t.contexto_id,
       t.codigo, t.titulo, t.estado,
       t.horas_teoricas,
       coalesce(sum(s.horas) filter (where s.estado <> 'anulada'), 0)   as horas_planificadas,
       coalesce(sum(s.horas) filter (where s.estado = 'hecha'), 0)      as horas_ejecutadas,
       count(s.id) filter (where s.estado <> 'anulada')                 as n_sesiones,
       min(s.fecha) filter (where s.estado <> 'anulada')                as primera_sesion,
       max(s.fecha) filter (where s.estado <> 'anulada')                as ultima_sesion
  from public.tareas_programadas t
  left join public.tarea_sesiones s on s.tarea_id = t.id
 group by t.id;

grant select on public.v_tareas_horas to authenticated;

-- Lo mismo para las tareas del panel de configuración del proyecto.
create or replace view public.v_cliente_tareas_horas as
select t.id                                     as tarea_id,
       t.proyecto_id, t.cliente_id, t.titulo, t.hecha,
       t.horas                                  as horas_teoricas,
       coalesce(sum(s.horas) filter (where s.estado <> 'anulada'), 0) as horas_planificadas,
       coalesce(sum(s.horas) filter (where s.estado = 'hecha'), 0)    as horas_ejecutadas,
       count(s.id) filter (where s.estado <> 'anulada')               as n_sesiones
  from public.cliente_tareas t
  left join public.tarea_sesiones s on s.cliente_tarea_id = t.id
 group by t.id;

grant select on public.v_cliente_tareas_horas to authenticated;

-- ── 4 · Resumen por consultor, para su panel ───────────────────────────────
-- Comprometido = lo que dice el modelo. Planificado = lo que hay en calendario.
-- Ejecutado = lo cerrado. Las tres cifras juntas son la única forma de ver si
-- un consultor va sobrado o ahogado antes de que sea tarde.
create or replace view public.v_consultor_carga as
select s.consultor_id,
       count(distinct coalesce(s.tarea_id, s.cliente_tarea_id))     as tareas_planificadas,
       count(distinct coalesce(s.tarea_id, s.cliente_tarea_id))
         filter (where s.estado = 'hecha')                          as tareas_ejecutadas,
       coalesce(sum(s.horas) filter (where s.estado <> 'anulada'), 0) as horas_planificadas,
       coalesce(sum(s.horas) filter (where s.estado = 'hecha'), 0)    as horas_ejecutadas,
       min(s.fecha) as desde,
       max(s.fecha) as hasta
  from public.tarea_sesiones s
 where s.consultor_id is not null
 group by s.consultor_id;

grant select on public.v_consultor_carga to authenticated;

-- ── 5 · Acceso ─────────────────────────────────────────────────────────────
alter table public.tarea_sesiones enable row level security;

drop policy if exists ts_equipo on public.tarea_sesiones;
create policy ts_equipo on public.tarea_sesiones for all to authenticated
  using (coalesce(public.mi_rol(), '') in ('superadmin','admin','director','consultor','gestion'))
  with check (coalesce(public.mi_rol(), '') in ('superadmin','admin','director','consultor','gestion'));

grant select, insert, update, delete on public.tarea_sesiones to authenticated;

-- ── 6 · El estado de la tarea lo marcan sus sesiones ───────────────────────
-- Sin esto habría que acordarse de cambiar el estado a mano cada vez, y el
-- primer despiste deja una tarea «pendiente» con tres sesiones hechas.
create or replace function public.sincronizar_estado_tarea()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tarea uuid := coalesce(new.tarea_id, old.tarea_id);
  v_total int;
  v_hechas int;
begin
  -- Solo aplica a `tareas_programadas`; las de `cliente_tareas` llevan su
  -- propio campo `hecha` y no tienen el mismo juego de estados.
  if v_tarea is null then return coalesce(new, old); end if;
  select count(*) filter (where estado <> 'anulada'),
         count(*) filter (where estado = 'hecha')
    into v_total, v_hechas
    from public.tarea_sesiones where tarea_id = v_tarea;

  update public.tareas_programadas t
     set estado = case
                    when v_total = 0            then 'pendiente'
                    when v_hechas = v_total     then 'hecha'
                    else 'programada'
                  end,
         -- La fecha de la tarea es la de su PRIMERA sesión: es cuando arranca.
         fecha = (select min(fecha) from public.tarea_sesiones
                   where tarea_id = v_tarea and estado <> 'anulada')
   where t.id = v_tarea
     and t.estado <> 'anulada';
  return coalesce(new, old);
end $$;

drop trigger if exists trg_estado_tarea on public.tarea_sesiones;
create trigger trg_estado_tarea
  after insert or update or delete on public.tarea_sesiones
  for each row execute function public.sincronizar_estado_tarea();


-- ─────────────────────────────────────────────────────────────────────
-- migracion-v105-catalogo-solo-lectura.sql
-- ─────────────────────────────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- v105 · EL CATÁLOGO DE TAREAS: LO LEEN TODOS, LO EDITA ADMINISTRACIÓN
--
-- `tareas_catalogo` tenía UNA sola política, `for all` con `es_equipo()`:
-- cualquiera del equipo podía cambiar las horas de cualquier tarea.
--
-- Y esas horas no son un dato de trabajo cualquiera: alimentan el motor de
-- precios. Cambiar las horas de «Auditoría interna» en modelo Compromiso mueve
-- el importe de todas las ofertas que se estén preparando en ese momento y de
-- las que se regeneren después. Es una decisión de negocio, no de ejecución.
--
-- A partir de aquí:
--   · LEER    dirección de proyecto, consultoría y gestión. Consultar qué tareas
--             define cada modelo es parte del trabajo diario.
--   · ESCRIBIR  Administración y Superadministración.
--
-- La comprobación de la interfaz sola no basta: estas tablas se pueden tocar
-- desde cualquier cliente con la sesión del usuario. La barrera tiene que estar
-- aquí.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.tareas_catalogo enable row level security;

-- Fuera la política que permitía todo a todo el equipo.
drop policy if exists tareas_catalogo_team_all on public.tareas_catalogo;

-- ── Lectura: todo el equipo ────────────────────────────────────────────────
drop policy if exists tareas_catalogo_lectura on public.tareas_catalogo;
create policy tareas_catalogo_lectura on public.tareas_catalogo
  for select to authenticated
  using (coalesce(public.mi_rol(), '') in
         ('superadmin','admin','director','consultor','gestion'));

-- ── Escritura: solo Administración ─────────────────────────────────────────
drop policy if exists tareas_catalogo_alta on public.tareas_catalogo;
create policy tareas_catalogo_alta on public.tareas_catalogo
  for insert to authenticated
  with check (coalesce(public.mi_rol(), '') in ('superadmin','admin'));

drop policy if exists tareas_catalogo_edicion on public.tareas_catalogo;
create policy tareas_catalogo_edicion on public.tareas_catalogo
  for update to authenticated
  using (coalesce(public.mi_rol(), '') in ('superadmin','admin'))
  with check (coalesce(public.mi_rol(), '') in ('superadmin','admin'));

drop policy if exists tareas_catalogo_borrado on public.tareas_catalogo;
create policy tareas_catalogo_borrado on public.tareas_catalogo
  for delete to authenticated
  using (coalesce(public.mi_rol(), '') in ('superadmin','admin'));

grant select on public.tareas_catalogo to authenticated;
grant insert, update, delete on public.tareas_catalogo to authenticated;

comment on table public.tareas_catalogo is
  'Catálogo maestro de tareas por norma y modelo. Sus horas alimentan el precio de las ofertas: lo lee todo el equipo, solo lo edita Administración.';

-- ── Lo mismo para el catálogo de normas ────────────────────────────────────
-- Por coherencia: si las horas están protegidas pero cualquiera puede añadir o
-- retirar una norma del catálogo, la protección se rodea por el otro lado.
do $$
begin
  if exists (select 1 from information_schema.tables
              where table_schema = 'public' and table_name = 'normas_catalogo') then
    execute 'alter table public.normas_catalogo enable row level security';
    execute 'drop policy if exists normas_catalogo_team_all on public.normas_catalogo';
    execute 'drop policy if exists normas_catalogo_lectura on public.normas_catalogo';
    execute $p$create policy normas_catalogo_lectura on public.normas_catalogo
      for select to authenticated
      using (coalesce(public.mi_rol(), '') in
             ('superadmin','admin','director','consultor','gestion'))$p$;
    execute 'drop policy if exists normas_catalogo_escritura on public.normas_catalogo';
    execute $p$create policy normas_catalogo_escritura on public.normas_catalogo
      for all to authenticated
      using (coalesce(public.mi_rol(), '') in ('superadmin','admin'))
      with check (coalesce(public.mi_rol(), '') in ('superadmin','admin'))$p$;
  end if;
end $$;


-- ─────────────────────────────────────────────────────────────────────
-- migracion-v106-equipo-proyecto.sql
-- ─────────────────────────────────────────────────────────────────────
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


commit;

notify pgrst, 'reload schema';

-- Comprobación: qué ha quedado montado.
select 'MIGRACIONES v104-v106 APLICADAS' as resultado,
       (select count(*) from public.tarea_sesiones)   as sesiones,
       (select count(*) from public.proyecto_equipo)  as asignaciones_equipo,
       (select count(*) from public.tareas_programadas
         where horas_teoricas is not null)            as tareas_con_horas;
