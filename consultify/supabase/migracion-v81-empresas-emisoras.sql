-- ═══════════════════════════════════════════════════════════════════════════
-- v81 · LAS TRES EMPRESAS QUE PUEDEN EMITIR
--
-- TuConsultor es la marca; detrás hay tres sociedades y cada oferta la emite
-- una concreta. Hasta ahora el CIF B84867670 estaba escrito a mano en cuatro
-- ficheros distintos, así que emitir desde otra sociedad era imposible.
--
-- Y hay una razón legal, no solo de orden: la oferta es el documento que se
-- firma. Si dice una sociedad y factura otra, el contrato no se sostiene.
--
-- Quién puede emitir con cada una se asigna por persona: no todo el equipo
-- oferta desde las tres.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.empresas_emisoras (
  id            text primary key,
  marca         text not null,            -- lo que ve el cliente
  razon_social  text not null,            -- lo que exige la ley
  cif           text not null unique,
  domicilio     text,
  email         text,
  telefono      text,
  web           text,
  registro      text,                     -- datos registrales para el contrato
  iva_defecto   numeric(5,2) not null default 21,
  color         text default '#F99001',
  orden         int not null default 100,
  activa        boolean not null default true,
  por_defecto   boolean not null default false
);

-- Solo una puede ser la de por defecto: con dos, nadie sabe cuál sale.
create unique index if not exists emisoras_una_por_defecto
  on public.empresas_emisoras (por_defecto) where por_defecto;

insert into public.empresas_emisoras (id, marca, razon_social, cif, domicilio, email, orden, por_defecto) values
  ('trescore',  'TuConsultor', 'TRESCORE PROYECTOS ITE, S.L.',            'B84867670',
   'Alcorcón, Madrid', 'hola@tuconsultor.com', 10, true),
  ('iee',       'TuConsultor', 'INSTITUTO EXCELENCIA EUROPEA, S.L.',      'B87093076',
   'Alcorcón, Madrid', 'hola@tuconsultor.com', 20, false),
  ('defi',      'TuConsultor', 'INSTITUTO EUROPEO DE BLOCKCHAIN Y DEFI, S.L.', 'B06996631',
   'Alcorcón, Madrid', 'hola@tuconsultor.com', 30, false)
on conflict (id) do update
  set marca = excluded.marca, razon_social = excluded.razon_social, cif = excluded.cif,
      domicilio = excluded.domicilio, email = excluded.email, orden = excluded.orden;

comment on table public.empresas_emisoras is
  'Sociedades que pueden emitir una oferta. La marca es común (TuConsultor); la razón social y el CIF, no.';

-- ── Quién puede emitir con cada una ────────────────────────────────────────
create table if not exists public.perfil_emisoras (
  id          bigserial primary key,
  perfil_id   uuid not null references public.perfiles(id) on delete cascade,
  emisora_id  text not null references public.empresas_emisoras(id) on delete cascade,
  por_defecto boolean not null default false,
  creado      timestamptz not null default now(),
  unique (perfil_id, emisora_id)
);
create unique index if not exists perfil_emisoras_una_por_defecto
  on public.perfil_emisoras (perfil_id) where por_defecto;

comment on table public.perfil_emisoras is
  'Con qué sociedades puede emitir cada persona del equipo. Sin filas = solo la emisora por defecto.';

-- ── La oferta guarda desde cuál se emitió ──────────────────────────────────
-- Es un dato histórico: si mañana cambia la sociedad por defecto, las ofertas
-- anteriores siguen diciendo quién las emitió de verdad.
alter table public.presupuestos
  add column if not exists emisora_id text references public.empresas_emisoras(id);

update public.presupuestos set emisora_id = 'trescore' where emisora_id is null;

create index if not exists presupuestos_emisora on public.presupuestos (emisora_id);

-- ═══ RLS ═══════════════════════════════════════════════════════════════════
alter table public.empresas_emisoras enable row level security;
alter table public.perfil_emisoras   enable row level security;

drop policy if exists emisoras_lectura on public.empresas_emisoras;
create policy emisoras_lectura on public.empresas_emisoras
  for select to authenticated using (true);

drop policy if exists emisoras_escritura on public.empresas_emisoras;
create policy emisoras_escritura on public.empresas_emisoras for all to authenticated
  using (coalesce(public.mi_rol(),'') in ('superadmin','admin'))
  with check (coalesce(public.mi_rol(),'') in ('superadmin','admin'));

-- Cada cual ve sus asignaciones; asignarlas es cosa de administración.
drop policy if exists pe_propias on public.perfil_emisoras;
create policy pe_propias on public.perfil_emisoras
  for select to authenticated
  using (perfil_id = auth.uid() or coalesce(public.mi_rol(),'') in ('superadmin','admin','director'));

drop policy if exists pe_escritura on public.perfil_emisoras;
create policy pe_escritura on public.perfil_emisoras for all to authenticated
  using (coalesce(public.mi_rol(),'') in ('superadmin','admin'))
  with check (coalesce(public.mi_rol(),'') in ('superadmin','admin'));

grant select on public.empresas_emisoras to authenticated, anon;
grant select, insert, update, delete on public.perfil_emisoras to authenticated;

-- ── Con qué sociedades puedo emitir yo ─────────────────────────────────────
-- Sin asignaciones, la de por defecto: nadie se queda sin poder ofertar por no
-- estar dado de alta en ninguna.
create or replace function public.mis_emisoras()
returns jsonb language sql stable security definer as $$
  select coalesce(jsonb_agg(e order by e.orden), '[]'::jsonb)
  from (
    select em.id, em.marca, em.razon_social, em.cif, em.domicilio, em.email, em.orden,
           coalesce(pe.por_defecto, em.por_defecto) as por_defecto
      from public.empresas_emisoras em
      join public.perfil_emisoras pe on pe.emisora_id = em.id and pe.perfil_id = auth.uid()
     where em.activa
    union all
    select em.id, em.marca, em.razon_social, em.cif, em.domicilio, em.email, em.orden, em.por_defecto
      from public.empresas_emisoras em
     where em.activa and em.por_defecto
       and not exists (select 1 from public.perfil_emisoras p2 where p2.perfil_id = auth.uid())
  ) e;
$$;

revoke all on function public.mis_emisoras() from public, anon;
grant execute on function public.mis_emisoras() to authenticated;

notify pgrst, 'reload schema';

select 'v81 aplicada' as ok;
