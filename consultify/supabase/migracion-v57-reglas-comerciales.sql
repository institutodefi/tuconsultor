-- ═══════════════════════════════════════════════════════════════════════════
-- v57 · REGLAS COMERCIALES
--
-- Una regla = condición + efecto. Se dan de alta de una en una desde
-- Comercial › Reglas comerciales, y el generador de ofertas (web e interno)
-- las aplica en vivo. Así la misma combinación de normas y modelo puede dar
-- precios distintos según lo que esté vigente ese día.
--
-- Tipos de efecto:
--   optimizacion → ajusta HORAS (el precio deriva de ellas)
--   precio_hora  → sustituye la tarifa €/h de un nivel o de todos
--   margen       → sustituye el margen del 60 %
--   descuento    → rebaja el precio final (% o €)
--   recargo      → incrementa el precio final (% o €)
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.reglas_comerciales (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  tipo          text not null check (tipo in ('optimizacion','precio_hora','margen','descuento','recargo')),
  activa        boolean not null default true,
  prioridad     integer not null default 100,     -- menor = se aplica antes

  -- ── Condiciones (todas opcionales: vacío = no filtra) ──
  modelos       text[],            -- {Relación,Implicación,…}; vacío = todos
  normas        text[],            -- la oferta debe incluir TODAS las indicadas
  min_sistemas  integer,
  max_sistemas  integer,
  solo_si_tiene_9001 boolean,      -- null = indiferente
  vigente_desde date,
  vigente_hasta date,
  canal         text not null default 'todos' check (canal in ('todos','web','interno')),

  -- ── Efecto ──
  valor         numeric not null,
  unidad        text not null default 'porcentaje' check (unidad in ('porcentaje','euros','factor')),
  nivel         text check (nivel in ('J1','J2','J3','Senior')),  -- null = todos los niveles

  notas         text,
  creada_por    uuid references public.perfiles(id) on delete set null,
  creado        timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists reglas_comerciales_activa_idx on public.reglas_comerciales (activa, prioridad);
create index if not exists reglas_comerciales_vigencia_idx on public.reglas_comerciales (vigente_desde, vigente_hasta);

-- Coherencia entre tipo y unidad: evita reglas imposibles de interpretar.
alter table public.reglas_comerciales drop constraint if exists reglas_tipo_unidad_ok;
alter table public.reglas_comerciales add constraint reglas_tipo_unidad_ok check (
      (tipo = 'optimizacion' and unidad in ('porcentaje','factor'))
   or (tipo = 'precio_hora'  and unidad = 'euros')
   or (tipo = 'margen'       and unidad = 'porcentaje')
   or (tipo in ('descuento','recargo') and unidad in ('porcentaje','euros'))
);

-- Fechas coherentes.
alter table public.reglas_comerciales drop constraint if exists reglas_vigencia_ok;
alter table public.reglas_comerciales add constraint reglas_vigencia_ok check (
  vigente_desde is null or vigente_hasta is null or vigente_hasta >= vigente_desde
);

-- ── updated_at automático ──
create or replace function public.reglas_comerciales_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists reglas_comerciales_touch on public.reglas_comerciales;
create trigger reglas_comerciales_touch before update on public.reglas_comerciales
  for each row execute function public.reglas_comerciales_touch();

-- ═══ RLS ═══════════════════════════════════════════════════════════════════
-- Lectura: la calculadora pública (rol anon) necesita las reglas ACTIVAS para
-- poder ofertar con ellas. Solo ve las activas; nunca las desactivadas ni las
-- notas internas de las inactivas.
-- Escritura: dirección y administración únicamente.
alter table public.reglas_comerciales enable row level security;

drop policy if exists reglas_lectura_publica on public.reglas_comerciales;
create policy reglas_lectura_publica on public.reglas_comerciales
  for select to anon using (activa);

drop policy if exists reglas_lectura_equipo on public.reglas_comerciales;
create policy reglas_lectura_equipo on public.reglas_comerciales
  for select to authenticated using (true);

drop policy if exists reglas_escritura on public.reglas_comerciales;
create policy reglas_escritura on public.reglas_comerciales
  for all to authenticated
  using (public.mi_rol() in ('superadmin','admin','director'))
  with check (public.mi_rol() in ('superadmin','admin','director'));

notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');

-- ═══ Ejemplos (comentados: descoméntalos si quieres arrancar con ellos) ═════
-- insert into public.reglas_comerciales (nombre, tipo, unidad, valor, modelos, vigente_desde, vigente_hasta, notas) values
--   ('Septiembre · Relación −10 %', 'descuento', 'porcentaje', 10, '{Relación}', '2026-09-01', '2026-09-30', 'Campaña de vuelta al trabajo.');
-- insert into public.reglas_comerciales (nombre, tipo, unidad, valor, min_sistemas, notas) values
--   ('Integración ≥ 3 sistemas · −15 % de horas', 'optimizacion', 'porcentaje', 15, 3, 'Solape documental entre sistemas integrados.');
-- insert into public.reglas_comerciales (nombre, tipo, unidad, valor, nivel, modelos, notas) values
--   ('Implantación · hora J3 a 60 €', 'precio_hora', 'euros', 60, 'J3', '{Implantación}', 'Tarifa específica de implantación.');

select 'reglas_comerciales lista' as ok;
