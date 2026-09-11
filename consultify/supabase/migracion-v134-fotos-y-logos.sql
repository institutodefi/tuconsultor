-- =============================================================================
-- MIGRACIÓN v134 · Foto de personas y logo de empresas
--
-- Columnas para la URL de la imagen y un depósito PÚBLICO `imagenes` en
-- Storage: fotos y logos no son documentos sensibles, y públicos se enseñan
-- con un <img> sin enlaces firmados. La app reduce la imagen a 512 px antes
-- de subirla. Cualquier usuario identificado puede subir (la app solo lo
-- ofrece a quien puede editar la ficha: la propia persona o RR. HH. para las
-- fotos del equipo, el CRM para contactos y logos).
--
-- Después de v133. Idempotente.
-- =============================================================================
begin;

alter table public.perfiles  add column if not exists foto_url text;
alter table public.contactos add column if not exists foto_url text;
alter table public.empresas  add column if not exists logo_url text;

insert into storage.buckets (id, name, public)
values ('imagenes', 'imagenes', true)
on conflict (id) do update set public = true;

drop policy if exists imagenes_lectura on storage.objects;
create policy imagenes_lectura on storage.objects for select
  using (bucket_id = 'imagenes');

drop policy if exists imagenes_subida on storage.objects;
create policy imagenes_subida on storage.objects for insert to authenticated
  with check (bucket_id = 'imagenes');

drop policy if exists imagenes_cambio on storage.objects;
create policy imagenes_cambio on storage.objects for update to authenticated
  using (bucket_id = 'imagenes') with check (bucket_id = 'imagenes');

drop policy if exists imagenes_borrado on storage.objects;
create policy imagenes_borrado on storage.objects for delete to authenticated
  using (bucket_id = 'imagenes');

comment on column public.perfiles.foto_url  is 'Foto de la persona (depósito público imagenes).';
comment on column public.contactos.foto_url is 'Foto del contacto (depósito público imagenes).';
comment on column public.empresas.logo_url  is 'Logo de la empresa (depósito público imagenes).';

commit;
