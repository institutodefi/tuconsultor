-- ═══════════════════════════════════════════════════════════════════════════
-- v74 · AJUSTES DE UNA OFERTA CONCRETA
--
-- Distinto de las reglas comerciales: aquéllas valen para todo el que cumpla la
-- condición; esto es un trato para una oferta y solo una — un 2x1 en sedes, un
-- descuento puntual para cerrar, un precio cerrado acordado con dirección.
--
-- Cada ajuste arrastra su MOTIVO y QUIÉN lo autorizó. Un descuento sin motivo
-- escrito es un número que nadie sabe justificar seis meses después, y es
-- justo lo que se pregunta cuando alguien revisa por qué un cliente pagó menos.
-- Por eso el motivo es obligatorio: la base no admite un ajuste sin él.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.presupuesto_ajustes (
  id             uuid primary key default gen_random_uuid(),
  presupuesto_id uuid not null references public.presupuestos(id) on delete cascade,

  tipo   text not null check (tipo in ('descuento','recargo','precio_fijo','nxm')),
  unidad text check (unidad in ('porcentaje','euros')),
  valor  numeric(12,2),        -- % o €; en nxm no se usa
  lleva  int,                  -- nxm: de cada `lleva`…
  paga   int,                  -- …se pagan `paga`

  motivo text not null check (length(btrim(motivo)) >= 5),
  autorizado_por uuid references public.perfiles(id) on delete set null,
  orden  int not null default 100,
  creado timestamptz not null default now(),

  -- Coherencia según el tipo. Sin esto entran ajustes a medias que luego el
  -- motor ignora en silencio y nadie entiende por qué no se aplicó nada.
  constraint ajuste_coherente check (
        (tipo in ('descuento','recargo') and unidad is not null and valor > 0)
     or (tipo = 'precio_fijo' and valor >= 0)
     or (tipo = 'nxm' and lleva >= 2 and paga >= 1 and paga < lleva)
  )
);

create index if not exists presupuesto_ajustes_pres on public.presupuesto_ajustes (presupuesto_id, orden);

comment on table public.presupuesto_ajustes is
  'Ajustes de precio de UNA oferta concreta, fuera de las reglas comerciales generales.';
comment on column public.presupuesto_ajustes.motivo is
  'Obligatorio. Por qué se hace este trato. Sin motivo no se puede defender el descuento.';

-- ═══ RLS ═══════════════════════════════════════════════════════════════════
-- Tocar precios a mano no es para cualquiera.
alter table public.presupuesto_ajustes enable row level security;

drop policy if exists pa_lectura on public.presupuesto_ajustes;
create policy pa_lectura on public.presupuesto_ajustes for select to authenticated
  using (public.mi_rol() in ('superadmin','admin','director','gestion'));

drop policy if exists pa_escritura on public.presupuesto_ajustes;
create policy pa_escritura on public.presupuesto_ajustes for all to authenticated
  using (public.mi_rol() in ('superadmin','admin','director'))
  with check (public.mi_rol() in ('superadmin','admin','director'));

-- ── El precio de catálogo, guardado aparte ──
-- Para poder decir en la oferta «antes X, ahora Y» y para saber después cuánto
-- se cedió en cada trato.
alter table public.presupuestos
  add column if not exists precio_catalogo int,
  add column if not exists ajuste_oferta numeric(12,2) not null default 0;

comment on column public.presupuestos.precio_catalogo is
  'Precio antes de los ajustes de esta oferta. El campo `precio` lleva el final.';

-- Lo ya emitido no tenía ajustes: su precio de catálogo es el que tiene.
update public.presupuestos set precio_catalogo = precio where precio_catalogo is null;

notify pgrst, 'reload schema';

select 'v74 aplicada' as ok;
