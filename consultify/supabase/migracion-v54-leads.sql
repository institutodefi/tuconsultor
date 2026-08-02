-- ═══ v54 · CLIENTES POTENCIALES (leads de la web) ═══
create table if not exists public.leads (
  id bigint generated always as identity primary key,
  creado timestamptz default now(),
  nombre text, email text not null, empresa text, telefono text,
  producto text, necesidad text, tamano text, plazo text,
  mensaje text, origen text,
  consentimiento_comercial boolean default false,
  estado text not null default 'nuevo' check (estado in ('nuevo','contactado','propuesta','ganado','perdido')),
  notas text,
  asignado_a uuid references public.perfiles(id) on delete set null
);
alter table public.leads enable row level security;
drop policy if exists leads_equipo on public.leads;
create policy leads_equipo on public.leads
  for all using (public.mi_rol() in ('superadmin','admin','director','consultor','gestion'))
  with check (public.mi_rol() in ('superadmin','admin','director','consultor','gestion'));
-- (el alta desde la web entra con service_role desde la función, sin política anon)
notify pgrst, 'reload schema';
select 'leads lista' as ok;
