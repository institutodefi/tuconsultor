-- =============================================================================
-- MIGRACIÓN v135 · Consentimiento RGPD con prueba
--
-- Cada contacto tiene un enlace propio (token) para aceptar la información de
-- protección de datos y, si quiere, las comunicaciones comerciales. Lo que
-- acepta queda en `consentimientos_rgpd` con fecha, canal, versión del texto, IP y
-- navegador: es la prueba que pide el RGPD. Las columnas de siempre
-- (consentimiento_marketing, consentimiento_fecha, rgpd_aceptado, rgpd_fecha)
-- se siguen rellenando para que todo lo que ya las lee funcione igual.
--
-- La tabla se llama consentimientos_rgpd: ya existía una `consentimientos` de la
-- v71 (fase 1 de un diseño que no se terminó, vacía) y no se toca.
--
-- Después de v134. Idempotente.
-- =============================================================================
begin;

alter table public.contactos add column if not exists consentimiento_token uuid default gen_random_uuid();
update public.contactos set consentimiento_token = gen_random_uuid() where consentimiento_token is null;
create unique index if not exists contactos_consentimiento_token_idx on public.contactos (consentimiento_token);

create table if not exists public.consentimientos_rgpd (
  id             uuid primary key default gen_random_uuid(),
  contacto_id    uuid not null references public.contactos(id) on delete cascade,
  fecha          timestamptz not null default now(),
  canal          text not null check (canal in ('enlace', 'formulario', 'verbal', 'oferta')),
  acepta_datos   boolean not null default true,
  acepta_marketing boolean not null default false,
  texto_version  text,
  ip             text,
  user_agent     text,
  nota           text,
  registrado_por uuid,                        -- quien lo anota, si lo anota el equipo
  creado         timestamptz not null default now()
);
create index if not exists consentimientos_rgpd_contacto_idx on public.consentimientos_rgpd (contacto_id, fecha desc);

alter table public.consentimientos_rgpd enable row level security;
drop policy if exists cons_equipo_lee on public.consentimientos_rgpd;
create policy cons_equipo_lee on public.consentimientos_rgpd for select to authenticated using (public.es_equipo());
drop policy if exists cons_equipo_escribe on public.consentimientos_rgpd;
create policy cons_equipo_escribe on public.consentimientos_rgpd for insert to authenticated with check (public.es_equipo());
-- La aceptación por enlace la escribe la función de Netlify con la clave de servicio.

comment on table public.consentimientos_rgpd is 'Prueba del consentimiento RGPD de cada contacto: fecha, canal, versión del texto, IP y navegador.';
comment on column public.contactos.consentimiento_token is 'Token del enlace personal para aceptar la información RGPD.';

commit;
