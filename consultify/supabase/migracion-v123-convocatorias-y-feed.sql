-- v123 · Convocatorias en las sesiones y enlace de calendario por persona.
--
-- · tarea_sesiones.convocatoria_id: cuando una sesión convoca a varias
--   personas se crea una fila por persona (así cada una la ve en su agenda)
--   y todas comparten este id. Sirve para saber quién más está convocado.
-- · perfiles.feed_token: token secreto del calendario suscribible de cada
--   consultor (/api/agenda-feed?c=<id>&t=<token>). Se genera desde Órbita y
--   se puede regenerar para invalidar el enlace anterior.
-- Aplicar después de la v122.

alter table public.tarea_sesiones
  add column if not exists convocatoria_id uuid;
create index if not exists tarea_sesiones_convocatoria_idx on public.tarea_sesiones (convocatoria_id);

alter table public.perfiles
  add column if not exists feed_token text;

comment on column public.tarea_sesiones.convocatoria_id is 'Agrupa las sesiones de una misma convocatoria (una fila por persona convocada).';
comment on column public.perfiles.feed_token is 'Token del calendario suscribible (.ics) de la persona. Regenerarlo invalida el enlace anterior.';
