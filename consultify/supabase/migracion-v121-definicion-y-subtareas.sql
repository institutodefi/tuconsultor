-- v121 · Definición y subtareas (checklist) de cada tarea.
--
-- En Sistemas de gestión cada tarea del catálogo lleva su definición (qué es,
-- qué se entrega) y sus subtareas. Al volcarse a un proyecto, la tarea del
-- proyecto se lleva la definición y las subtareas como checklist marcable.
-- Aplicar después de la v120.

alter table public.tareas_catalogo
  add column if not exists definicion text,
  add column if not exists subtareas jsonb not null default '[]'::jsonb;

comment on column public.tareas_catalogo.definicion is 'Qué es la tarea y qué se entrega. Se copia a las tareas de los proyectos.';
comment on column public.tareas_catalogo.subtareas is 'Subtareas del catálogo: [{"texto":"..."}]. Se copian a los proyectos como checklist.';

alter table public.cliente_tareas
  add column if not exists definicion text,
  add column if not exists subtareas jsonb not null default '[]'::jsonb;

comment on column public.cliente_tareas.definicion is 'Definición heredada del catálogo (editable en el proyecto).';
comment on column public.cliente_tareas.subtareas is 'Checklist: [{"texto":"...","hecha":false,"fecha":null}].';
