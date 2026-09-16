-- =============================================================================
-- CONSULTIFY · Migración v142 · Tareas divididas entre varias personas
--
-- Una tarea del catálogo tiene un responsable. Cuando la hacen varias
-- personas, se DIVIDE: la original se queda con una parte y se crean tantas
-- copias como personas más, cada una con su responsable y su fracción de las
-- horas. `parte` es esa fracción (1 = tarea entera); las horas teóricas del
-- catálogo se multiplican por ella. `dividida_de` apunta a la tarea original.
-- =============================================================================
begin;
alter table public.cliente_tareas add column if not exists parte numeric(6,4) not null default 1
  check (parte > 0 and parte <= 1);
alter table public.cliente_tareas add column if not exists dividida_de uuid references public.cliente_tareas(id) on delete set null;
create index if not exists cliente_tareas_dividida_de_idx on public.cliente_tareas (dividida_de);
comment on column public.cliente_tareas.parte is 'Fracción de la tarea del catálogo que lleva esta fila (1 = entera). Las horas teóricas se multiplican por ella.';
comment on column public.cliente_tareas.dividida_de is 'Tarea original de la que se dividió esta parte.';
commit;
