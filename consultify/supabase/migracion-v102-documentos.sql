-- ═══════════════════════════════════════════════════════════════════════════
-- v102 · DOCUMENTOS DEL CLIENTE Y NOTAS DE ANÁLISIS
--
-- Dos cosas con visibilidad DISTINTA, y por eso van en tablas separadas:
--
--   `cliente_documentos`  certificados, informes de auditoría, escrituras…
--                         Los sube el cliente o el equipo, y los ve TODO EL
--                         MUNDO: el cliente los suyos, el equipo todos.
--
--   `documento_notas`     lo que la IA extrae de cada documento: alcance real,
--                         fechas de validez, CIF, sedes, entidad certificadora.
--                         SOLO EL EQUIPO. No es una descripción para el
--                         cliente: es una lectura nuestra para saber qué dice
--                         de verdad un certificado sin abrirlo entero, y puede
--                         contener conjeturas o errores del modelo.
--
-- Separar las tablas, en vez de poner una columna `nota` en la primera, es lo
-- que hace que la política de acceso sea simple y difícil de romper: si la nota
-- viviera junto al documento, cualquier consulta del cliente que trajera la
-- fila entera se la llevaría con ella.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Documentos ─────────────────────────────────────────────────────────
create table if not exists public.cliente_documentos (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references public.clientes(id) on delete cascade,
  proyecto_id   uuid,                          -- opcional: documento de un proyecto concreto
  tipo          text not null default 'otro'
                  check (tipo in ('certificado','auditoria','escritura','poder','politica',
                                  'organigrama','licencia','seguro','otro')),
  titulo        text not null,
  descripcion   text,
  -- Dónde está el fichero en Storage, y sus datos para poder listarlo sin
  -- descargarlo.
  ruta          text not null,
  url           text,
  nombre_fichero text,
  mime          text,
  tamano        bigint,
  -- Metadatos que se pueden rellenar a mano o desde la nota de la IA.
  norma         text,                          -- '9001', 'ENS'…
  emisor        text,                          -- entidad certificadora
  valido_desde  date,
  valido_hasta  date,
  subido_por    uuid references public.perfiles(id) on delete set null,
  subido_por_cliente boolean not null default false,
  creado        timestamptz not null default now()
);

create index if not exists cliente_documentos_cliente on public.cliente_documentos (cliente_id, creado desc);
create index if not exists cliente_documentos_proyecto on public.cliente_documentos (proyecto_id) where proyecto_id is not null;
-- Para avisar de certificados a punto de caducar.
create index if not exists cliente_documentos_vence on public.cliente_documentos (valido_hasta)
  where valido_hasta is not null;

comment on table public.cliente_documentos is
  'Documentos del cliente. Los ve el cliente (los suyos) y todo el equipo.';

-- ── 2 · Notas de análisis · SOLO EQUIPO ────────────────────────────────────
create table if not exists public.documento_notas (
  id            uuid primary key default gen_random_uuid(),
  documento_id  uuid not null references public.cliente_documentos(id) on delete cascade,
  -- Texto libre: qué es el documento y para qué sirve.
  resumen       text,
  -- Lo estructurado, que es lo que de verdad se busca: alcance, sedes, CIF…
  datos         jsonb,
  -- De dónde sale la nota y con qué confianza, para saber si fiarse.
  modelo        text,
  confianza     text check (confianza in ('alta','media','baja')),
  revisada      boolean not null default false,
  revisada_por  uuid references public.perfiles(id) on delete set null,
  creado        timestamptz not null default now()
);

create unique index if not exists documento_notas_doc on public.documento_notas (documento_id);

comment on table public.documento_notas is
  'Lectura por IA de cada documento: alcance, fechas, CIF, sedes. USO INTERNO: no se muestra al cliente.';
comment on column public.documento_notas.confianza is
  'Qué seguridad tiene la extracción. Una nota de confianza baja se enseña, pero avisando.';

-- ── 3 · Quién ve qué ───────────────────────────────────────────────────────
alter table public.cliente_documentos enable row level security;
alter table public.documento_notas    enable row level security;

-- Documentos: el equipo, todos. El cliente, los de su ficha.
drop policy if exists cd_lectura on public.cliente_documentos;
create policy cd_lectura on public.cliente_documentos for select to authenticated
  using (
    coalesce(public.mi_rol(), '') in ('superadmin','admin','director','consultor','gestion')
    or exists (
      select 1 from public.clientes c
       where c.id = cliente_documentos.cliente_id
         and c.user_id = auth.uid()
    )
  );

-- Subir: el equipo y el propio cliente. `subido_por_cliente` deja constancia,
-- porque no es lo mismo un certificado que aporta el cliente que uno que
-- hemos verificado nosotros.
drop policy if exists cd_alta on public.cliente_documentos;
create policy cd_alta on public.cliente_documentos for insert to authenticated
  with check (
    coalesce(public.mi_rol(), '') in ('superadmin','admin','director','consultor','gestion')
    or exists (
      select 1 from public.clientes c
       where c.id = cliente_documentos.cliente_id and c.user_id = auth.uid()
    )
  );

-- Modificar y borrar: solo el equipo. Un cliente que pudiera borrar el
-- certificado que aportó dejaría el expediente incompleto sin rastro.
drop policy if exists cd_edicion on public.cliente_documentos;
create policy cd_edicion on public.cliente_documentos for update to authenticated
  using (coalesce(public.mi_rol(), '') in ('superadmin','admin','director','consultor','gestion'));

drop policy if exists cd_borrado on public.cliente_documentos;
create policy cd_borrado on public.cliente_documentos for delete to authenticated
  using (coalesce(public.mi_rol(), '') in ('superadmin','admin','director'));

-- Notas: SOLO equipo, ni lectura para el cliente.
drop policy if exists dn_equipo on public.documento_notas;
create policy dn_equipo on public.documento_notas for select to authenticated
  using (coalesce(public.mi_rol(), '') in ('superadmin','admin','director','consultor','gestion'));

drop policy if exists dn_edicion on public.documento_notas;
create policy dn_edicion on public.documento_notas for update to authenticated
  using (coalesce(public.mi_rol(), '') in ('superadmin','admin','director','consultor','gestion'));

grant select, insert, update on public.cliente_documentos to authenticated;
grant delete on public.cliente_documentos to authenticated;
grant select, update on public.documento_notas to authenticated;

-- ── 4 · Depósito de ficheros ───────────────────────────────────────────────
-- Bucket PRIVADO, al contrario que 'ofertas'. Un certificado o una escritura no
-- puede quedar accesible a cualquiera que acierte la URL: se sirve con enlaces
-- firmados y caducos que genera el backend.
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do update set public = false;

-- Lectura: la hace el backend con service_role y firma la URL. No se añade
-- política para authenticated, así que nadie descarga saltándose la firma.
drop policy if exists "documentos_sin_acceso_directo" on storage.objects;

notify pgrst, 'reload schema';

select 'v102 aplicada' as ok;
