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

notify pgrst, 'reload schema';

select 'v104 aplicada' as ok;
