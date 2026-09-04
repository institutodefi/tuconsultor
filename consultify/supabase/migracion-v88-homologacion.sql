-- ═══════════════════════════════════════════════════════════════════════════
-- v88 · HOMOLOGACIÓN DE PROVEEDORES, NORMA A NORMA
--
-- Un proveedor no se homologa «en general»: se homologa PARA una norma. Lo que
-- exige la 9001 a un proveedor no es lo que exige la 45001, y un proveedor
-- puede cumplir para una y no para otra.
--
-- Por eso la homologación cuelga de (empresa, norma) y no de la empresa. Y las
-- condiciones se añaden a mano, porque cada organización tiene las suyas:
-- imponer un catálogo cerrado obligaría a usar condiciones que no son las tuyas.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Homologación por norma ─────────────────────────────────────────────
create table if not exists public.homologaciones_norma (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references public.empresas(id) on delete cascade,
  norma       text not null,
  estado      text not null default 'pendiente'
                check (estado in ('pendiente','homologado','condicionado','rechazado','caducado')),
  desde       date,
  hasta       date,                       -- caducidad de la homologación
  evaluado_por uuid,
  evaluado_en timestamptz,
  observaciones text,
  creado      timestamptz not null default now(),
  unique (empresa_id, norma)
);
create index if not exists homologaciones_empresa on public.homologaciones_norma (empresa_id);
create index if not exists homologaciones_caducan on public.homologaciones_norma (hasta) where estado = 'homologado';

comment on table public.homologaciones_norma is
  'Homologación de un proveedor PARA una norma concreta. Lo que exige la 9001 no es lo que exige la 45001.';

-- ── 2 · Condiciones, las que cada cual defina ──────────────────────────────
create table if not exists public.homologacion_condiciones (
  id             uuid primary key default gen_random_uuid(),
  homologacion_id uuid not null references public.homologaciones_norma(id) on delete cascade,
  texto          text not null check (length(btrim(texto)) >= 3),
  obligatoria    boolean not null default true,
  cumplida       boolean not null default false,
  cumplida_en    timestamptz,
  notas          text,
  orden          int not null default 100,
  creado         timestamptz not null default now()
);
create index if not exists condiciones_homologacion on public.homologacion_condiciones (homologacion_id, orden);

-- ── 3 · Archivos: certificados, seguros, lo que haga falta ─────────────────
create table if not exists public.homologacion_archivos (
  id             uuid primary key default gen_random_uuid(),
  homologacion_id uuid references public.homologaciones_norma(id) on delete cascade,
  condicion_id   uuid references public.homologacion_condiciones(id) on delete cascade,
  nombre         text not null,
  ruta           text not null,          -- ruta en el almacenamiento
  tipo           text,                   -- certificado · seguro · declaración · otro
  tamano         bigint,
  caduca         date,                   -- un certificado caducado no vale
  subido_por     uuid,
  creado         timestamptz not null default now(),
  -- Cuelga de la homologación o de una condición concreta, pero de algo.
  check (homologacion_id is not null or condicion_id is not null)
);
create index if not exists archivos_homologacion on public.homologacion_archivos (homologacion_id);
create index if not exists archivos_caducan on public.homologacion_archivos (caduca) where caduca is not null;

-- ── 4 · Estado calculado de una homologación ───────────────────────────────
-- El estado no se teclea: sale de las condiciones. Si alguien lo pone a
-- «homologado» con condiciones obligatorias sin cumplir, el papel dice una cosa
-- y la realidad otra.
create or replace function public.estado_homologacion(p_id uuid)
returns jsonb language sql stable as $$
  with c as (
    select count(*) filter (where obligatoria) as obligatorias,
           count(*) filter (where obligatoria and cumplida) as cumplidas,
           count(*) as total,
           count(*) filter (where cumplida) as total_cumplidas
      from public.homologacion_condiciones where homologacion_id = p_id
  ),
  h as (select hasta from public.homologaciones_norma where id = p_id),
  a as (
    select count(*) filter (where caduca is not null and caduca < current_date) as caducados
      from public.homologacion_archivos where homologacion_id = p_id
  )
  select jsonb_build_object(
    'obligatorias', c.obligatorias,
    'cumplidas', c.cumplidas,
    'total', c.total,
    'total_cumplidas', c.total_cumplidas,
    'archivos_caducados', a.caducados,
    'sugerido', case
      when h.hasta is not null and h.hasta < current_date then 'caducado'
      when a.caducados > 0 then 'condicionado'
      when c.obligatorias = 0 then 'pendiente'
      when c.cumplidas = c.obligatorias and c.total_cumplidas = c.total then 'homologado'
      when c.cumplidas = c.obligatorias then 'condicionado'
      else 'pendiente'
    end)
  from c, h, a;
$$;

grant execute on function public.estado_homologacion(uuid) to authenticated;

-- ── 5 · Un proveedor no tiene estado comercial ─────────────────────────────
-- El estado comercial describe la relación de venta. En un proveedor puro no
-- significa nada, y dejarlo relleno hace que aparezca en informes de clientes.
update public.empresas
   set estado_comercial = null
 where es_proveedor is true and coalesce(es_cliente, false) is false;

-- ═══ RLS ═══════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array['homologaciones_norma','homologacion_condiciones','homologacion_archivos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_todo on public.%I', t, t);
    execute format($f$
      create policy %I_todo on public.%I for all to authenticated
      using (exists (select 1 from public.perfiles p where p.id = auth.uid()
                      and coalesce(p.activo, true)
                      and p.rol in ('superadmin','admin','director','consultor','gestion')))
      with check (exists (select 1 from public.perfiles p where p.id = auth.uid()
                      and coalesce(p.activo, true)
                      and p.rol in ('superadmin','admin','director','consultor','gestion')))
    $f$, t, t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

notify pgrst, 'reload schema';

select 'v88 aplicada' as ok;
