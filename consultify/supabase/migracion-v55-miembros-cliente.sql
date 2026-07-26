-- ═══ v55 · PERMISOS POR CLIENTE (miembros_cliente) ═══
-- Cada usuario puede pertenecer a varios clientes con un rol distinto en cada uno:
--   administrador (jefe del proyecto) · consultor · usuario_cliente (solo perfiles cliente)
create table if not exists public.miembros_cliente (
  id bigint generated always as identity primary key,
  creado timestamptz default now(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  rol_cliente text not null default 'consultor'
    check (rol_cliente in ('administrador','consultor','usuario_cliente')),
  unique (cliente_id, usuario_id)
);
alter table public.miembros_cliente enable row level security;

-- El equipo interno gestiona todas las pertenencias
drop policy if exists mc_equipo on public.miembros_cliente;
create policy mc_equipo on public.miembros_cliente
  for all using (public.mi_rol() in ('superadmin','admin','director','consultor','gestion'))
  with check (public.mi_rol() in ('superadmin','admin','director','consultor','gestion'));

-- Cada usuario ve sus propias pertenencias (para el portal cliente)
drop policy if exists mc_propias on public.miembros_cliente;
create policy mc_propias on public.miembros_cliente
  for select using (usuario_id = auth.uid());

-- Migrar la asignación actual: consultor 1 = jefe del proyecto (administrador), consultor 2 = consultor
insert into public.miembros_cliente (cliente_id, usuario_id, rol_cliente)
select id, consultor_1_id, 'administrador' from public.clientes where consultor_1_id is not null
on conflict (cliente_id, usuario_id) do nothing;
insert into public.miembros_cliente (cliente_id, usuario_id, rol_cliente)
select id, consultor_2_id, 'consultor' from public.clientes where consultor_2_id is not null
on conflict (cliente_id, usuario_id) do nothing;

notify pgrst, 'reload schema';
select count(*) as pertenencias_migradas from public.miembros_cliente;
