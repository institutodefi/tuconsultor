-- ═══════════════════════════════════════════════════════════════════════════
-- v116 · CONTROL DE HORAS POR CONSULTOR · TAREAS INTERNAS EN EL CALENDARIO
--
-- Va detrás de la v115. Tres cosas:
--
-- ── 1 · La jornada de cada persona y su reparto ────────────────────────────
-- Cada consultor dedica el 70 % de su jornada a proyectos de cliente. El otro
-- 30 % se reparte en dos bolsas: 10 % de gestión y coordinación y 20 % de
-- procesos internos. Hasta ahora ese reparto vivía solo en el código de la
-- app (y con cuatro bolsas, no tres). Pasa a `parametros_precio`, grupo
-- `jornada`, para poder ajustarlo sin desplegar, igual que los precios.
--
-- Y `perfiles` gana `pct_jornada`: el porcentaje de jornada de la persona
-- (100 = jornada completa, 50 = media). La app ya lo leía de la vista
-- `consultores` con un «?? 100» porque la columna no existía.
--
-- ── 2 · Tareas internas ────────────────────────────────────────────────────
-- Las sesiones de proyecto cuelgan de `cliente_tareas`. Una tarea de gestión
-- o de un proceso interno no tiene cliente ni norma, así que no cabe ahí
-- (`cliente_id`, `norma_id` y `modelo` son NOT NULL, y con razón). Tabla
-- propia: `tareas_internas`. Sus sesiones van a `tarea_sesiones`, como las
-- demás, por la columna nueva `tarea_interna_id`: la agenda sigue leyendo
-- una sola tabla de sesiones.
--
-- Cada consultor crea y gestiona las suyas. Dirección y administración ven
-- y tocan todas.
--
-- ── 3 · Procesos internos legibles por dirección ───────────────────────────
-- La política de lectura de `procesos_internos` dejaba fuera al rol
-- `director`. Al elegir un proceso para una tarea interna, dirección veía la
-- lista vacía.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1a · Reparto de la jornada, como parámetros ────────────────────────────
-- `grupo` tiene una lista cerrada (v112): se le añade `jornada`. Se recrea la
-- restricción conservando los grupos que ya existen.
alter table public.parametros_precio drop constraint if exists parametros_precio_grupo_check;
alter table public.parametros_precio add constraint parametros_precio_grupo_check
  check (grupo = any (array['tarifas','margen','descuentos','suelos','servicios','general','jornada']));

insert into public.parametros_precio (clave, valor, grupo, etiqueta, descripcion, unidad, minimo, maximo, orden) values
  ('pct_jornada_proyectos', 70, 'jornada', 'Jornada · proyectos de cliente',
   'Porcentaje de la jornada que se dedica a tareas de proyectos de cliente (producción).', 'porcentaje', 0, 100, 10),
  ('pct_jornada_gestion',   10, 'jornada', 'Jornada · gestión y coordinación',
   'Porcentaje de la jornada reservado a gestión y coordinación (reuniones de equipo, seguimiento, coordinación con clientes fuera de tarea).', 'porcentaje', 0, 100, 20),
  ('pct_jornada_procesos',  20, 'jornada', 'Jornada · procesos internos',
   'Porcentaje de la jornada reservado a los procesos internos de la casa (los del mapa de procesos del portal).', 'porcentaje', 0, 100, 30)
on conflict (clave) do nothing;

-- ── 1b · Porcentaje de jornada por persona ─────────────────────────────────
alter table public.perfiles
  add column if not exists pct_jornada numeric not null default 100
  check (pct_jornada > 0 and pct_jornada <= 100);

comment on column public.perfiles.pct_jornada is
  'Porcentaje de jornada de la persona: 100 = completa, 50 = media. Base de su capacidad mensual.';

-- La vista `consultores` es lo que lee la app. `create or replace` admite
-- añadir columnas AL FINAL, que es lo que se hace: el resto queda igual.
create or replace view public.consultores as
  select id,
         coalesce(nombre, split_part(email, '@', 1)) as nombre,
         apellidos,
         coalesce(nivel, 'Senior') as nivel,
         normas,
         capacidad_clientes,
         activo,
         id as user_id,
         rol,
         email,
         pct_jornada
    from public.perfiles p
   where rol = any (array['director','consultor','admin','superadmin'])
     and activo = true;

-- ── 2a · Tareas internas ───────────────────────────────────────────────────
create table if not exists public.tareas_internas (
  id                  uuid primary key default gen_random_uuid(),
  consultor_id        uuid not null references public.perfiles(id) on delete cascade,
  -- gestion         → bolsa de gestión y coordinación (10 %)
  -- proceso_interno → bolsa de procesos internos (20 %)
  tipo                text not null check (tipo in ('gestion','proceso_interno')),
  -- Solo para tipo proceso_interno: de qué proceso del mapa sale.
  proceso_interno_id  uuid references public.procesos_internos(id) on delete set null,
  subproceso_id       uuid references public.procesos_subprocesos(id) on delete set null,
  titulo              text not null,
  descripcion         text,
  -- Horas que la persona prevé dedicar. Las sesiones dicen cuántas van de
  -- verdad; esto es el marco, como las teóricas en las tareas de proyecto.
  horas               numeric not null default 0 check (horas >= 0),
  -- Mes al que se imputa (primer día). Si es null, se imputa por la fecha de
  -- cada sesión. Sirve para tareas que se repiten cada mes.
  mes                 date,
  estado              text not null default 'abierta' check (estado in ('abierta','cerrada')),
  creado              timestamptz not null default now(),
  creado_por          uuid default auth.uid()
);

create index if not exists tareas_internas_consultor_idx on public.tareas_internas (consultor_id);
create index if not exists tareas_internas_proceso_idx   on public.tareas_internas (proceso_interno_id);

comment on table public.tareas_internas is
  'Tareas de gestión/coordinación y de procesos internos de cada consultor. Sus sesiones están en tarea_sesiones.tarea_interna_id.';

alter table public.tareas_internas enable row level security;

-- Todo el equipo las ve: la agenda del equipo enseña la carga completa de
-- cada persona, no solo la de proyecto.
drop policy if exists ti_lectura on public.tareas_internas;
create policy ti_lectura on public.tareas_internas
  for select to authenticated
  using (coalesce(public.mi_rol(), '') = any (array['superadmin','admin','director','consultor','gestion']));

-- Cada uno escribe las suyas; dirección y administración, las de cualquiera.
drop policy if exists ti_propias on public.tareas_internas;
create policy ti_propias on public.tareas_internas
  for all to authenticated
  using (consultor_id = auth.uid() or coalesce(public.mi_rol(), '') = any (array['superadmin','admin','director']))
  with check (consultor_id = auth.uid() or coalesce(public.mi_rol(), '') = any (array['superadmin','admin','director']));

grant select, insert, update, delete on public.tareas_internas to authenticated;

-- ── 2b · Sus sesiones, en la tabla de siempre ──────────────────────────────
alter table public.tarea_sesiones
  add column if not exists tarea_interna_id uuid references public.tareas_internas(id) on delete cascade;

create index if not exists tarea_sesiones_interna_idx on public.tarea_sesiones (tarea_interna_id);

comment on column public.tarea_sesiones.tarea_interna_id is
  'Sesión de una tarea interna (gestión o proceso interno). Excluyente con tarea_id y cliente_tarea_id.';

-- Una sesión cuelga de UNA tarea. Se comprueba, no se supone.
alter table public.tarea_sesiones drop constraint if exists tarea_sesiones_una_tarea;
alter table public.tarea_sesiones add constraint tarea_sesiones_una_tarea
  check (
    (case when tarea_id         is not null then 1 else 0 end)
  + (case when cliente_tarea_id is not null then 1 else 0 end)
  + (case when tarea_interna_id is not null then 1 else 0 end) <= 1
  );

-- ── 2c · Vista de control: horas por consultor y tipo, por mes ─────────────
-- Lo que enseña el panel de control de horas, pero en SQL, para consultas y
-- exportaciones. La app calcula lo mismo en el navegador (modo demo incluido).
create or replace view public.v_horas_consultor_mes as
  select s.consultor_id,
         date_trunc('month', s.fecha)::date                          as mes,
         case
           when s.tarea_interna_id is not null then ti.tipo
           else 'produccion'
         end                                                        as tipo,
         ct.proyecto_id,
         coalesce(sum(s.horas) filter (where s.estado <> 'anulada'), 0) as horas_programadas,
         coalesce(sum(s.horas) filter (where s.estado = 'hecha'),    0) as horas_ejecutadas,
         count(*) filter (where s.estado <> 'anulada')                  as n_sesiones
    from public.tarea_sesiones s
    left join public.cliente_tareas  ct on ct.id = s.cliente_tarea_id
    left join public.tareas_internas ti on ti.id = s.tarea_interna_id
   where s.consultor_id is not null
   group by s.consultor_id, date_trunc('month', s.fecha), 3, ct.proyecto_id;

grant select on public.v_horas_consultor_mes to authenticated;

-- ── 3 · Dirección también lee el mapa de procesos ──────────────────────────
drop policy if exists procesos_internos_select on public.procesos_internos;
create policy procesos_internos_select on public.procesos_internos
  for select to authenticated
  using (coalesce(public.mi_rol(), '') = any (array['superadmin','admin','director','consultor','gestion']));

notify pgrst, 'reload schema';

-- ── Comprobación ───────────────────────────────────────────────────────────
select 'v116 aplicada' as ok;

select clave, valor from public.parametros_precio where grupo = 'jornada' order by orden;   -- 70 / 10 / 20

select column_name from information_schema.columns
 where table_name = 'consultores' and column_name = 'pct_jornada';                          -- 1 fila

select count(*) as tareas_internas from public.tareas_internas;                             -- 0

select column_name from information_schema.columns
 where table_name = 'tarea_sesiones' and column_name = 'tarea_interna_id';                  -- 1 fila
