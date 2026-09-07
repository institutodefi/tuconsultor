-- v125 · Datos de empresa del cliente, sedes y escritura del propio cliente.
--
-- · clientes: campos de empresa que el cliente gestiona desde su zona
--   (nombre comercial, domicilio, web, actividad, plantilla, sector).
-- · cliente_sedes: los centros de trabajo del cliente (los propone la IA
--   desde los certificados y los documentos; el cliente los confirma).
-- · El cliente escribe su propia ficha, sus sedes y sus certificados
--   (normas certificadas y alcances). El equipo, todo.
-- Aplicar después de la v124.

alter table public.clientes
  add column if not exists nombre_comercial text,
  add column if not exists direccion text,
  add column if not exists cp text,
  add column if not exists poblacion text,
  add column if not exists provincia text,
  add column if not exists pais text,
  add column if not exists web text,
  add column if not exists actividad text,
  add column if not exists empleados integer,
  add column if not exists sector text,
  add column if not exists representante text;

drop policy if exists clientes_self_update on public.clientes;
create policy clientes_self_update on public.clientes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.cliente_sedes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nombre text,
  direccion text,
  cp text,
  poblacion text,
  provincia text,
  pais text default 'España',
  actividad text,
  principal boolean not null default false,
  origen text default 'manual',          -- manual | ia
  documento_id uuid references public.cliente_documentos(id) on delete set null,
  notas text,
  creado timestamptz not null default now()
);
create index if not exists cliente_sedes_cliente_idx on public.cliente_sedes (cliente_id);
alter table public.cliente_sedes enable row level security;

drop policy if exists cs_equipo on public.cliente_sedes;
create policy cs_equipo on public.cliente_sedes for all
  using (coalesce(public.mi_rol(), '') in ('superadmin','admin','director','consultor','gestion'))
  with check (coalesce(public.mi_rol(), '') in ('superadmin','admin','director','consultor','gestion'));
drop policy if exists cs_cliente on public.cliente_sedes;
create policy cs_cliente on public.cliente_sedes for all
  using (exists (select 1 from public.clientes c where c.id = cliente_sedes.cliente_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.clientes c where c.id = cliente_sedes.cliente_id and c.user_id = auth.uid()));

-- Normas certificadas y alcances: el cliente también las gestiona.
drop policy if exists cc_cliente_escribe on public.cliente_certificados;
create policy cc_cliente_escribe on public.cliente_certificados for all
  using (exists (select 1 from public.clientes c where c.id = cliente_certificados.cliente_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.clientes c where c.id = cliente_certificados.cliente_id and c.user_id = auth.uid()));

comment on table public.cliente_sedes is 'Centros de trabajo del cliente. origen = ia cuando lo propuso la lectura de documentos y el cliente lo confirmó.';
