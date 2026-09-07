-- =============================================================================
-- MIGRACIÓN v126 · Contactos gestionados por el cliente y aceptación RGPD
--
-- El cliente, desde su zona, gestiona los contactos de su empresa
-- (cliente_contactos: quién es quién en su organización) y deja constancia
-- de que acepta el tratamiento de datos (RGPD), tanto por la empresa como
-- por cada persona de contacto. También puede corregir SU propia ficha de
-- contacto del CRM (contactos), cosa que hasta ahora la RLS no permitía.
--
-- Después de v125. Idempotente.
-- =============================================================================
begin;

-- 1 · Aceptación RGPD de la empresa (quien la acepta y cuándo).
alter table public.clientes
  add column if not exists rgpd_aceptado boolean not null default false,
  add column if not exists rgpd_fecha    timestamptz,
  add column if not exists rgpd_por      text;          -- correo de quien aceptó

-- 2 · Contactos de la empresa, gestionados por el cliente.
alter table public.cliente_contactos
  add column if not exists apellidos     text,
  add column if not exists movil         text,
  add column if not exists notas         text,
  add column if not exists rgpd_aceptado boolean not null default false,   -- la persona ha sido informada y acepta
  add column if not exists rgpd_fecha    timestamptz,
  add column if not exists origen        text not null default 'equipo',   -- equipo | cliente
  add column if not exists updated_at    timestamptz;

drop policy if exists cliente_escribe_sus_contactos on public.cliente_contactos;
create policy cliente_escribe_sus_contactos on public.cliente_contactos
  for all
  using      (exists (select 1 from public.clientes c where c.id = cliente_contactos.cliente_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.clientes c where c.id = cliente_contactos.cliente_id and c.user_id = auth.uid()));

-- 3 · Su propia ficha de contacto del CRM: aceptación RGPD y permiso para
--     corregirla (por el correo de su cuenta).
alter table public.contactos
  add column if not exists rgpd_aceptado boolean not null default false,
  add column if not exists rgpd_fecha    timestamptz;

drop policy if exists contactos_self_update on public.contactos;
create policy contactos_self_update on public.contactos
  for update to authenticated
  using      (lower(btrim(coalesce(email, ''))) = lower(btrim(coalesce(auth.jwt() ->> 'email', ''))))
  with check (lower(btrim(coalesce(email, ''))) = lower(btrim(coalesce(auth.jwt() ->> 'email', ''))));

drop policy if exists contactos_self_insert on public.contactos;
create policy contactos_self_insert on public.contactos
  for insert to authenticated
  with check (lower(btrim(coalesce(email, ''))) = lower(btrim(coalesce(auth.jwt() ->> 'email', ''))));

comment on column public.clientes.rgpd_aceptado is 'La empresa acepta el tratamiento de sus datos y los de sus contactos para la prestación del servicio (RGPD). Fecha y correo de quien aceptó en rgpd_fecha / rgpd_por.';
comment on column public.cliente_contactos.rgpd_aceptado is 'La persona ha sido informada y acepta que sus datos se traten para la gestión del servicio.';

-- Que PostgREST vea las columnas nuevas sin esperar.
notify pgrst, 'reload schema';

commit;
