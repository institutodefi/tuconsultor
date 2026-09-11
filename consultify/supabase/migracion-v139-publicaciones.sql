-- ════════════════════════════════════════════════════════════════════════════
-- v139 · PUBLICACIONES EN REDES · la web como fuente única (sin Google Sheets)
--
-- El calendario vive en el repo (web/data/calendario_publicacion.csv y
-- calendario_reels.csv). Una función de Netlify lo vuelca aquí cada noche
-- (upsert por id, sin tocar lo ya publicado). Make lee las pendientes por API
-- (/api/publicaciones?accion=pendientes), publica y marca el resultado.
-- Así no hay que cargar nada a mano en ninguna hoja.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.publicaciones (
  id             text primary key,                 -- 181, 885, PV001, R012… (inmutable, nunca se reutiliza)
  fecha          date,                             -- null = no se publica
  hora           time,
  red            text not null,                    -- linkedin | linkedin_alejandro | instagram | instagram_reel | linkedin_video
  texto          text,
  imagen_url     text,
  enlace         text,
  video_url      text,
  titulo         text,
  campana        text,                             -- blog | orbita | orbita-ventajas | premios | reels
  publicado_en   timestamptz,
  publicado_ref  text,                             -- id que devuelve la red (urn:li:share:…, id de Instagram)
  error          text,                             -- último error de publicación
  intentos       integer not null default 0,
  origen         text not null default 'csv',
  creado         timestamptz not null default now(),
  actualizado    timestamptz not null default now()
);

create index if not exists publicaciones_pendientes_idx on public.publicaciones (fecha, hora) where publicado_en is null;
create index if not exists publicaciones_campana_idx on public.publicaciones (campana, fecha);

comment on table public.publicaciones is 'Calendario de publicaciones en redes (v139). Fuente: web/data/*.csv; publica Make por /api/publicaciones.';

create or replace function public.publicaciones_actualizado() returns trigger language plpgsql as $$
begin new.actualizado := now(); return new; end $$;
drop trigger if exists trg_publicaciones_actualizado on public.publicaciones;
create trigger trg_publicaciones_actualizado before update on public.publicaciones
  for each row execute function public.publicaciones_actualizado();

-- El equipo lo ve en Órbita; escribe solo el servidor (clave de servicio).
alter table public.publicaciones enable row level security;
drop policy if exists publicaciones_equipo_lee on public.publicaciones;
create policy publicaciones_equipo_lee on public.publicaciones for select to authenticated using (public.es_equipo());
grant select on public.publicaciones to authenticated;

-- Las pendientes de publicar en este momento (hora de Madrid), como las pide Make.
-- No se publica nada con más de dos días de retraso: mejor perder una que
-- soltar diez seguidas cuando vuelve el publicador.
create or replace function public.publicaciones_pendientes(p_max integer default 10)
returns setof public.publicaciones language sql stable security definer as $$
  select * from public.publicaciones
   where publicado_en is null
     and intentos < 3
     and fecha is not null and hora is not null
     and fecha >= (now() at time zone 'Europe/Madrid')::date - 2
     and (fecha + hora) <= (now() at time zone 'Europe/Madrid')
   order by fecha, hora, id
   limit greatest(1, least(p_max, 50));
$$;
revoke all on function public.publicaciones_pendientes(integer) from public, anon;
grant execute on function public.publicaciones_pendientes(integer) to service_role, authenticated;

notify pgrst, 'reload schema';
select 'v139 aplicada' as ok;
