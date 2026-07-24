-- ═══════════════════════════════════════════════════════════════════════
-- CONSULTIFY → SUPABASE DE TUCONSULTOR (proyecto znrbidycakbbfmynbeot)
-- Instalación completa desde cero en base de datos VACÍA.
-- Generado automáticamente: INSTALL_COMPLETO + migraciones v22→v51
-- + CONSOLIDADO_v94 + seed del blog + alta de superadmin.
--
-- CÓMO EJECUTAR:
--   1. Supabase → SQL Editor → New query → pega TODO este archivo → Run.
--      (Si el editor se queja del tamaño, córtalo por los separadores ══ y
--       ejecuta cada sección en orden.)
--   2. ANTES del paso final (admin-alejandro): crea el usuario en
--      Authentication → Users → Add user → alejandro@tuconsultor.com
--      con contraseña y "Auto Confirm User". Luego ese bloque lo asciende.
-- ═══════════════════════════════════════════════════════════════════════


-- ══════════════ INSTALL_COMPLETO.sql ══════════════

-- =============================================================
-- CONSULTIFY · INSTALACIÓN COMPLETA DESDE CERO
-- Ejecutar TODO de una vez en el SQL Editor de Supabase.
-- Orden: schema → agenda → migraciones → seed de tareas.
-- Idempotente donde es posible (create if not exists / add if not exists).
-- =============================================================


-- ═══════════════════════════════════════════════════════════
-- schema.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================================
-- CONSULTIFY · ESQUEMA SUPABASE v2.0 (jun 2026)
-- Proyecto: consultify
-- Ejecutar en SQL Editor de Supabase (una sola vez).
-- ============================================================

-- ---------- 1 · PERFILES Y ROLES ----------
create table if not exists perfiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  rol       text not null default 'cliente' check (rol in ('cliente','consultor','admin')),
  nombre    text,
  empresa   text,
  creado    timestamptz default now()
);

-- Cada registro nuevo en auth.users crea su perfil (rol cliente por defecto).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, rol, nombre, empresa)
  values (new.id, 'cliente', new.raw_user_meta_data->>'nombre', new.raw_user_meta_data->>'empresa')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper para las políticas RLS.
create or replace function public.mi_rol()
returns text language sql stable security definer set search_path = public as $$
  select rol from perfiles where id = auth.uid();
$$;

-- ---------- 2 · CATÁLOGO DE NORMAS ----------
create table if not exists normas_catalogo (
  id           text primary key,
  nombre       text not null,
  descripcion  text,
  nivel        text not null check (nivel in ('J1','J2','J3','Senior')),
  h_apoyo      int  not null,
  activa       boolean default true
);

insert into normas_catalogo (id, nombre, descripcion, nivel, h_apoyo) values
  ('9001',     'ISO 9001',  'Gestión de la calidad',         'J3', 34),
  ('14001',    'ISO 14001', 'Gestión ambiental',             'J3', 46),
  ('45001',    'ISO 45001', 'Seguridad y salud laboral',     'J2', 63),
  ('27001',    'ISO 27001', 'Seguridad de la información',   'J2', 81),
  ('42001',    'ISO 42001', 'Inteligencia artificial',       'J3', 42),
  ('56001',    'ISO 56001', 'Gestión de la innovación',      'J3', 75),
  ('21001',    'ISO 21001', 'Organizaciones educativas',     'J3', 38),
  ('9004',     'ISO 9004',  'Calidad sostenible',            'J3', 22),
  ('une93200', 'UNE 93200', 'Cartas de Servicios',           'J3', 25)
on conflict (id) do update set nivel = excluded.nivel, h_apoyo = excluded.h_apoyo;

-- ---------- 3 · EQUIPO ----------
create table if not exists consultores (
  id                  uuid primary key default gen_random_uuid(),
  nombre              text not null,
  nivel               text not null check (nivel in ('J1','J2','J3','Senior')),
  normas              text[] not null default '{}',
  capacidad_clientes  int not null default 12,
  activo              boolean default true,
  user_id             uuid references auth.users(id),
  creado              timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ---------- 4 · CLIENTES ----------
create table if not exists clientes (
  id        uuid primary key default gen_random_uuid(),
  empresa   text not null,
  cif       text,
  contacto  text,
  email     text,
  telefono  text,
  user_id   uuid references auth.users(id),   -- vincula la cuenta del cliente a su empresa
  creado    timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- 5 · PROYECTOS ----------
create table if not exists proyectos (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid references clientes(id) on delete set null,
  normas          text[] not null default '{}',
  modelo          text not null check (modelo in ('Apoyo','Relación','Implicación','Compromiso','Implantación')),
  consultor_id    uuid references consultores(id) on delete set null,
  estado          text not null default 'implantación' check (estado in ('implantación','activo','pausado','cerrado')),
  fecha_inicio    date,
  fecha_auditoria date,
  h_total_mes     int,
  precio_mes      int,
  precio_total    int,
  notas           text,
  plan            jsonb,
  creado          timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ---------- 6 · PRESUPUESTOS (calculadora pública) ----------
create table if not exists presupuestos (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references auth.users(id),
  email     text not null,
  nombre    text,
  empresa   text,
  telefono  text,
  normas    text[] not null default '{}',
  modelo    text not null,
  precio    int not null,
  tipo      text not null default 'mes' check (tipo in ('mes','bolsa')),
  creado    timestamptz default now()
);

-- ---------- 7 · TRIGGERS updated_at ----------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_consultores_updated on consultores;
create trigger trg_consultores_updated before update on consultores for each row execute function set_updated_at();
drop trigger if exists trg_clientes_updated on clientes;
create trigger trg_clientes_updated before update on clientes for each row execute function set_updated_at();
drop trigger if exists trg_proyectos_updated on proyectos;
create trigger trg_proyectos_updated before update on proyectos for each row execute function set_updated_at();

-- ---------- 8 · ÍNDICES ----------
create index if not exists idx_proyectos_estado    on proyectos(estado);
create index if not exists idx_proyectos_consultor on proyectos(consultor_id);
create index if not exists idx_proyectos_cliente   on proyectos(cliente_id);
create index if not exists idx_proyectos_normas    on proyectos using gin(normas);
create index if not exists idx_clientes_user       on clientes(user_id);
create index if not exists idx_presupuestos_email  on presupuestos(email);

-- ---------- 9 · ROW LEVEL SECURITY ----------
alter table perfiles        enable row level security;
alter table normas_catalogo enable row level security;
alter table consultores     enable row level security;
alter table clientes        enable row level security;
alter table proyectos       enable row level security;
alter table presupuestos    enable row level security;

-- Perfiles: cada uno ve el suyo; el equipo ve todos.
create policy perfiles_self_select on perfiles for select using (id = auth.uid() or mi_rol() in ('consultor','admin'));
create policy perfiles_self_update on perfiles for update using (id = auth.uid());

-- Catálogo de normas: lectura pública (lo usa la calculadora).
create policy normas_public_read on normas_catalogo for select using (true);

-- Consultores / clientes / proyectos: solo el equipo gestiona.
create policy consultores_team_all on consultores for all
  using (mi_rol() in ('consultor','admin')) with check (mi_rol() in ('consultor','admin'));

create policy clientes_team_all on clientes for all
  using (mi_rol() in ('consultor','admin')) with check (mi_rol() in ('consultor','admin'));
-- …y cada cliente ve su propia ficha:
create policy clientes_self_read on clientes for select using (user_id = auth.uid());

create policy proyectos_team_all on proyectos for all
  using (mi_rol() in ('consultor','admin')) with check (mi_rol() in ('consultor','admin'));
-- …y cada cliente ve sus proyectos:
create policy proyectos_cliente_read on proyectos for select
  using (cliente_id in (select id from clientes where user_id = auth.uid()));

-- Presupuestos: cualquiera puede crear (calculadora pública, incluso anónimos);
-- cada cliente ve los suyos; el equipo lo ve todo.
create policy presupuestos_anon_insert on presupuestos for insert with check (true);
create policy presupuestos_owner_read on presupuestos for select
  using (user_id = auth.uid()
         or email = (select email from auth.users where id = auth.uid())
         or mi_rol() in ('consultor','admin'));

-- ---------- 10 · DATOS INICIALES DEL EQUIPO ----------
insert into consultores (nombre, nivel, normas, capacidad_clientes, activo) values
  ('Carlota', 'J3', '{9001,14001,27001,45001}', 12, true),
  ('Irene',   'J2', '{9001,14001}',             17, true)
on conflict do nothing;

-- ============================================================
-- DESPUÉS DE EJECUTAR ESTE SCRIPT:
-- 1) Crea los usuarios del equipo en Authentication → Users.
-- 2) Asciende su rol:
--    update perfiles set rol = 'consultor' where id = '<uuid-del-usuario>';
--    (o 'admin' para ti)
-- 3) Para dar acceso a un cliente: crea su cuenta y vincula
--    update clientes set user_id = '<uuid>' where id = '<id-cliente>';
-- ============================================================


-- ═══════════════════════════════════════════════════════════
-- agenda.sql
-- ═══════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════
-- CONSULTIFY · AGENDA DE CONSULTORES (festivos, vacaciones, tareas)
-- Ejecutar en: proyecto "consultify" → SQL Editor → Run
-- Complementa supabase/schema.sql (requiere mi_rol() y consultores).
-- Idempotente: se puede ejecutar varias veces sin pisar datos.
-- ════════════════════════════════════════════════════════════════

-- ─── 1 · FESTIVOS (editable: 2026 es año de ajuste) ──────────────
create table if not exists festivos (
  id     uuid primary key default gen_random_uuid(),
  fecha  date not null unique,
  nombre text not null,
  ambito text not null default 'nacional'   -- nacional | autonomico | local
);

-- Festivos 2026 Madrid capital — REVISAR contra el calendario oficial
insert into festivos (fecha, nombre, ambito) values
  ('2026-01-01', 'Año Nuevo',                   'nacional'),
  ('2026-01-06', 'Epifanía del Señor',          'nacional'),
  ('2026-04-02', 'Jueves Santo',                'autonomico'),
  ('2026-04-03', 'Viernes Santo',               'nacional'),
  ('2026-05-01', 'Fiesta del Trabajo',          'nacional'),
  ('2026-05-02', 'Fiesta Comunidad de Madrid',  'autonomico'),
  ('2026-05-15', 'San Isidro',                  'local'),
  ('2026-08-15', 'Asunción de la Virgen',       'nacional'),
  ('2026-10-12', 'Fiesta Nacional de España',   'nacional'),
  ('2026-11-02', 'Todos los Santos (traslado)', 'nacional'),
  ('2026-11-09', 'Virgen de la Almudena',       'local'),
  ('2026-12-08', 'Inmaculada Concepción',       'nacional'),
  ('2026-12-25', 'Natividad del Señor',         'nacional')
on conflict (fecha) do nothing;

-- ─── 2 · VACACIONES (1 fila = 1 día laborable de vacaciones) ─────
create table if not exists vacaciones (
  id           uuid primary key default gen_random_uuid(),
  consultor_id uuid not null references consultores(id) on delete cascade,
  fecha        date not null,
  unique (consultor_id, fecha)
);

-- ─── 3 · TAREAS DE AGENDA (previsto vs real) ─────────────────────
--   consultor_id   = RESPONSABLE de la tarea (reasignable)
--   fecha_prevista / horas_previstas = planificación
--   fecha_efectiva / horas_reales    = ejecución real
--   Límite del convenio: máx. 9 h ordinarias/día (también en la UI)
create table if not exists agenda_tareas (
  id              uuid primary key default gen_random_uuid(),
  consultor_id    uuid not null references consultores(id) on delete cascade,
  proyecto_id     uuid references proyectos(id) on delete set null,
  fecha_prevista  date not null,
  horas_previstas numeric(4,1) not null check (horas_previstas > 0 and horas_previstas <= 9),
  fecha_efectiva  date,
  horas_reales    numeric(4,1) check (horas_reales > 0 and horas_reales <= 9),
  titulo          text not null,
  descripcion     text,
  tipo            text not null default 'produccion'
                  check (tipo in ('produccion','gestion','coordinacion')),
  estado          text not null default 'pendiente'
                  check (estado in ('pendiente','en_curso','completada')),
  creado          timestamptz not null default now()
);

-- ─── 4 · ÍNDICES ─────────────────────────────────────────────────
create index if not exists idx_agenda_consultor_prev on agenda_tareas (consultor_id, fecha_prevista);
create index if not exists idx_agenda_consultor_efec on agenda_tareas (consultor_id, fecha_efectiva);
create index if not exists idx_vacaciones_consultor  on vacaciones (consultor_id, fecha);

-- ─── 5 · RLS (mismo patrón que el resto: solo el equipo) ─────────
alter table festivos      enable row level security;
alter table vacaciones    enable row level security;
alter table agenda_tareas enable row level security;

drop policy if exists festivos_team_all on festivos;
create policy festivos_team_all on festivos for all
  using (mi_rol() in ('consultor','admin')) with check (mi_rol() in ('consultor','admin'));

drop policy if exists vacaciones_team_all on vacaciones;
create policy vacaciones_team_all on vacaciones for all
  using (mi_rol() in ('consultor','admin')) with check (mi_rol() in ('consultor','admin'));

drop policy if exists agenda_tareas_team_all on agenda_tareas;
create policy agenda_tareas_team_all on agenda_tareas for all
  using (mi_rol() in ('consultor','admin')) with check (mi_rol() in ('consultor','admin'));

-- ─── 6 · UPGRADE: columna tipo (si la tabla ya existía sin ella) ──
alter table agenda_tareas add column if not exists tipo text not null default 'produccion';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agenda_tareas_tipo_check') then
    alter table agenda_tareas add constraint agenda_tareas_tipo_check
      check (tipo in ('produccion','gestion','coordinacion'));
  end if;
end $$;

-- ─── 7 · CAMPOS DE CONSULTOR (apellidos, email) y tipo de tarea ──
-- Idempotente: añade columnas que falten sin tocar datos.
alter table consultores add column if not exists apellidos text;
alter table consultores add column if not exists email text;
alter table agenda_tareas add column if not exists tipo text not null default 'produccion';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agenda_tareas_tipo_check') then
    alter table agenda_tareas add constraint agenda_tareas_tipo_check
      check (tipo in ('produccion','gestion','coordinacion'));
  end if;
end $$;
-- Hora de inicio prevista para volcar al calendario (HH:MM); por defecto 09:00
alter table agenda_tareas add column if not exists hora_inicio text default '09:00';


-- ═══════════════════════════════════════════════════════════
-- migracion-v2.sql
-- ═══════════════════════════════════════════════════════════
-- ============================================================
-- MIGRACIÓN v2 · Consultify (ejecutar en SQL Editor)
-- 1) Planificación de proyectos (plan de tareas con 3 perfiles)
-- 2) Perfil de cliente jerárquico: cliente → CIF → centros,
--    con normas y alcances por empresa (CIF)
-- Idempotente: se puede re-ejecutar.
-- ============================================================

-- ---------- 1 · PLAN DE PROYECTO ----------
alter table public.proyectos add column if not exists plan jsonb;

-- ---------- 2 · ID DE CLIENTE ----------
alter table public.clientes add column if not exists codigo text;
create unique index if not exists clientes_codigo_unico on public.clientes (codigo) where codigo is not null;

-- ---------- 3 · EMPRESAS (CIF) DEL CLIENTE ----------
create table if not exists public.cliente_empresas (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references public.clientes(id) on delete cascade,
  cif          text not null,
  razon_social text,
  creado       timestamptz default now()
);

-- ---------- 4 · CENTROS DE TRABAJO POR EMPRESA ----------
create table if not exists public.empresa_centros (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.cliente_empresas(id) on delete cascade,
  nombre     text not null,
  direccion  text,
  creado     timestamptz default now()
);

-- ---------- 5 · NORMAS Y ALCANCES POR EMPRESA ----------
create table if not exists public.empresa_normas (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.cliente_empresas(id) on delete cascade,
  norma_id   text not null,
  alcance    text,
  creado     timestamptz default now(),
  unique (empresa_id, norma_id)
);

-- ---------- 6 · RLS ----------
alter table public.cliente_empresas enable row level security;
alter table public.empresa_centros  enable row level security;
alter table public.empresa_normas   enable row level security;

-- Equipo (consultor/admin) gestiona todo
drop policy if exists equipo_todo_cliente_empresas on public.cliente_empresas;
create policy equipo_todo_cliente_empresas on public.cliente_empresas
  for all using (public.mi_rol() in ('consultor','admin')) with check (public.mi_rol() in ('consultor','admin'));
drop policy if exists equipo_todo_empresa_centros on public.empresa_centros;
create policy equipo_todo_empresa_centros on public.empresa_centros
  for all using (public.mi_rol() in ('consultor','admin')) with check (public.mi_rol() in ('consultor','admin'));
drop policy if exists equipo_todo_empresa_normas on public.empresa_normas;
create policy equipo_todo_empresa_normas on public.empresa_normas
  for all using (public.mi_rol() in ('consultor','admin')) with check (public.mi_rol() in ('consultor','admin'));

-- El cliente ve (solo lectura) lo suyo
drop policy if exists cliente_lee_sus_empresas on public.cliente_empresas;
create policy cliente_lee_sus_empresas on public.cliente_empresas
  for select using (exists (select 1 from public.clientes c where c.id = cliente_id and c.user_id = auth.uid()));
drop policy if exists cliente_lee_sus_centros on public.empresa_centros;
create policy cliente_lee_sus_centros on public.empresa_centros
  for select using (exists (select 1 from public.cliente_empresas e join public.clientes c on c.id = e.cliente_id
                            where e.id = empresa_id and c.user_id = auth.uid()));
drop policy if exists cliente_lee_sus_normas on public.empresa_normas;
create policy cliente_lee_sus_normas on public.empresa_normas
  for select using (exists (select 1 from public.cliente_empresas e join public.clientes c on c.id = e.cliente_id
                            where e.id = empresa_id and c.user_id = auth.uid()));

-- ---------- 7 · CÓDIGOS DE CLIENTE EXISTENTES ----------
-- Asigna CL-0001, CL-0002… a los clientes que aún no tengan código
with numerados as (
  select id, 'CL-' || lpad((row_number() over (order by creado))::text, 4, '0') as cod
  from public.clientes where codigo is null
)
update public.clientes c set codigo = n.cod from numerados n where c.id = n.id;


-- ═══════════════════════════════════════════════════════════
-- migracion-v3.sql
-- ═══════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════
-- CONSULTIFY · MIGRACIÓN v3 — Capacidad por HORAS de dedicación
-- Dominio: consultify.pro
-- Ejecutar en: proyecto "consultify" → SQL Editor → Run (idempotente)
--
-- Cambios:
--  · consultores: + pct_jornada (100=jornada completa), + apellidos, + email
--    (capacidad_clientes se conserva pero deja de usarse)
--  · agenda_tareas: + tipo, + hora_inicio, + horas_base
--    (horas_base = duración "tipo" de la tarea; las horas del consultor
--     salen de horas_base × eficiencia de su categoría)
-- ════════════════════════════════════════════════════════════════

-- ── Consultores: jornada en % + datos personales ──
alter table consultores add column if not exists apellidos   text;
alter table consultores add column if not exists email       text;
alter table consultores add column if not exists pct_jornada numeric(5,2) not null default 100;  -- % de jornada completa
comment on column consultores.pct_jornada is '% de jornada completa (100 = 1.800 h/año). La capacidad en horas se deriva del calendario × este %.';

-- ── Agenda de tareas: tipo, hora y horas base ──
alter table agenda_tareas add column if not exists tipo        text not null default 'produccion';
alter table agenda_tareas add column if not exists hora_inicio text default '09:00';
alter table agenda_tareas add column if not exists horas_base  numeric(4,1);  -- duración "tipo" de la tarea (antes de eficiencia)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agenda_tareas_tipo_check') then
    alter table agenda_tareas add constraint agenda_tareas_tipo_check
      check (tipo in ('produccion','gestion','coordinacion'));
  end if;
end $$;

-- ── Vista de control por sistema (norma × modelo × tareas) ──
-- Une cada tarea con el proyecto, su norma(s) y modelo, para la
-- pestaña "Control por sistema".
create or replace view v_tareas_sistema as
select
  t.id, t.consultor_id, t.proyecto_id,
  t.titulo, t.tipo, t.estado,
  t.fecha_prevista, t.horas_previstas, t.fecha_efectiva, t.horas_reales,
  t.horas_base, t.hora_inicio,
  c.nombre as consultor_nombre, c.apellidos as consultor_apellidos, c.nivel as consultor_nivel,
  p.modelo as proyecto_modelo, p.normas as proyecto_normas,
  cl.empresa as cliente
from agenda_tareas t
left join consultores c on c.id = t.consultor_id
left join proyectos   p on p.id = t.proyecto_id
left join clientes    cl on cl.id = p.cliente_id;


-- ═══════════════════════════════════════════════════════════
-- migracion-v4.sql
-- ═══════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════
-- CONSULTIFY · MIGRACIÓN v4 — Roles, equipo de gestión y clientes
-- Dominio: consultify.pro · Ejecutar en proyecto "consultify" (idempotente)
--
-- Roles: superadmin · admin · consultor · gestion · cliente
--   superadmin → ve TODO, incluido lo económico (Alejandro)
--   admin      → todo MENOS lo económico
--   consultor  → proyectos, planificación, agenda
--   gestion    → equipo de gestión (subtipo: comercial | marketing | administrativo)
--   cliente    → su zona
--
-- Equipo: consultores y equipo de gestión en una sola tabla `consultores`
--   con columna `tipo_equipo` ('consultor' | 'gestion') y `subtipo`.
-- Clientes: + director_proyecto_id (consultor) + jefe_cuenta_id (comercial)
-- ════════════════════════════════════════════════════════════════

-- ── 1 · PERFILES: ampliar roles + subtipo ──
alter table perfiles drop constraint if exists perfiles_rol_check;
alter table perfiles add constraint perfiles_rol_check
  check (rol in ('cliente','consultor','gestion','admin','superadmin'));
alter table perfiles add column if not exists subtipo text
  check (subtipo is null or subtipo in ('comercial','marketing','administrativo'));

-- Helper: ¿es equipo interno? (cualquier rol que no sea cliente)
create or replace function public.es_equipo()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(mi_rol() in ('consultor','gestion','admin','superadmin'), false);
$$;

-- Helper: ¿ve lo económico? (solo superadmin)
create or replace function public.ve_economico()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(mi_rol() = 'superadmin', false);
$$;

-- ── 2 · EQUIPO (consultores + gestión) ──
-- Reutiliza la tabla `consultores` para todo el equipo interno.
alter table consultores add column if not exists apellidos   text;
alter table consultores add column if not exists email       text;
alter table consultores add column if not exists pct_jornada numeric(5,2) not null default 100;
alter table consultores add column if not exists tipo_equipo text not null default 'consultor'
  check (tipo_equipo in ('consultor','gestion'));
alter table consultores add column if not exists subtipo     text
  check (subtipo is null or subtipo in ('comercial','marketing','administrativo'));
-- Para gestión, el nivel J1..Senior no aplica: se admite NULL
alter table consultores alter column nivel drop not null;

comment on column consultores.tipo_equipo is 'consultor = entrega; gestion = comercial/marketing/administrativo';
comment on column consultores.subtipo is 'Solo para tipo_equipo=gestion: comercial | marketing | administrativo';

-- ── 3 · CLIENTES: Director de Proyecto + Jefe de Cuenta ──
alter table clientes add column if not exists director_proyecto_id uuid references consultores(id) on delete set null;
alter table clientes add column if not exists jefe_cuenta_id        uuid references consultores(id) on delete set null;
comment on column clientes.director_proyecto_id is 'Consultor responsable del proyecto (tipo_equipo=consultor)';
comment on column clientes.jefe_cuenta_id is 'Comercial responsable de la cuenta (tipo_equipo=gestion, subtipo=comercial)';

-- ── 4 · AGENDA / TAREAS (asegurar columnas v3) ──
alter table agenda_tareas add column if not exists tipo        text not null default 'produccion';
alter table agenda_tareas add column if not exists hora_inicio text default '09:00';
alter table agenda_tareas add column if not exists horas_base  numeric(4,1);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agenda_tareas_tipo_check') then
    alter table agenda_tareas add constraint agenda_tareas_tipo_check
      check (tipo in ('produccion','gestion','coordinacion'));
  end if;
end $$;

-- ── 5 · CATÁLOGO DE TAREAS POR NORMA Y MODELO ──
-- Plantilla de tareas "tipo" por sistema (norma) y modelo de relación.
-- Se vuelca aquí el desglose del Excel de la calculadora.
create table if not exists tareas_catalogo (
  id          uuid primary key default gen_random_uuid(),
  norma_id    text not null references normas_catalogo(id) on delete cascade,
  modelo      text not null check (modelo in ('Apoyo','Relación','Implicación','Compromiso','Implantación')),
  titulo      text not null,
  tipo        text not null default 'produccion' check (tipo in ('produccion','gestion','coordinacion')),
  horas_base  numeric(4,1) not null default 1,
  orden       int not null default 0,
  creado      timestamptz default now()
);
create index if not exists idx_tareas_catalogo_norma on tareas_catalogo (norma_id, modelo, orden);

-- ── 6 · RLS ──
-- Económico (precios/márgenes) vive en proyectos: lo filtra la UI por rol,
-- pero reforzamos lectura de equipo en las tablas.
alter table consultores    enable row level security;
alter table tareas_catalogo enable row level security;

drop policy if exists consultores_team_all on consultores;
create policy consultores_team_all on consultores for all
  using (es_equipo()) with check (es_equipo());

drop policy if exists tareas_catalogo_team_all on tareas_catalogo;
create policy tareas_catalogo_team_all on tareas_catalogo for all
  using (es_equipo()) with check (es_equipo());

-- Perfiles: el equipo puede leer perfiles (para asignaciones); cada uno el suyo
drop policy if exists perfiles_self_select on perfiles;
create policy perfiles_self_select on perfiles for select
  using (id = auth.uid() or es_equipo());

-- Clientes / proyectos / agenda: acceso del equipo interno
do $$
declare t text;
begin
  foreach t in array array['clientes','proyectos','agenda_tareas','vacaciones','festivos'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I_team_all on %I', t, t);
    execute format('create policy %I_team_all on %I for all using (es_equipo()) with check (es_equipo())', t, t);
  end loop;
end $$;

-- Los clientes ven sus propios proyectos (lectura)
drop policy if exists proyectos_cliente_read on proyectos;
create policy proyectos_cliente_read on proyectos for select
  using (cliente_id in (select id from clientes where user_id = auth.uid()));

-- ── 7 · ASIGNAR SUPERADMIN A ALEJANDRO (ajusta el email) ──
-- update perfiles set rol = 'superadmin'
--   where id = (select id from auth.users where email = 'alejandro@consultify.pro');

-- ── 8 · VISTA control por sistema (norma × modelo × tareas reales) ──
create or replace view v_tareas_sistema as
select
  t.id, t.consultor_id, t.proyecto_id, t.titulo, t.tipo, t.estado,
  t.fecha_prevista, t.horas_previstas, t.fecha_efectiva, t.horas_reales,
  t.horas_base, t.hora_inicio,
  c.nombre as consultor_nombre, c.apellidos as consultor_apellidos, c.nivel as consultor_nivel,
  p.modelo as proyecto_modelo, p.normas as proyecto_normas,
  cl.empresa as cliente
from agenda_tareas t
left join consultores c on c.id = t.consultor_id
left join proyectos   p on p.id = t.proyecto_id
left join clientes    cl on cl.id = p.cliente_id;


-- ═══════════════════════════════════════════════════════════
-- migracion-v8.sql
-- ═══════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════
-- CONSULTIFY · MIGRACIÓN v8 — Catálogo "Tareas por Norma" (consolidada)
-- Corrige el error «column "proceso" does not exist»: crea TODAS las
-- columnas del catálogo ANTES de insertar el seed.
-- Sustituye/consolida v5–v7. Idempotente.
-- Ejecutar en proyecto "consultify" → SQL Editor → Run
--   (y después seed-tareas.sql)
-- ════════════════════════════════════════════════════════════════

-- 1 · CATÁLOGO DE TAREAS (una fila por norma × modelo × tarea)
--     titulo = "Proceso - Subproceso" · horas_base MENSUALES
create table if not exists tareas_catalogo (
  id          uuid primary key default gen_random_uuid(),
  norma_id    text not null references normas_catalogo(id) on delete cascade,
  modelo      text not null check (modelo in ('Apoyo','Relación','Implicación','Compromiso','Implantación')),
  titulo      text not null,
  proceso     text,
  subproceso  text,
  descripcion text,
  tipo        text not null default 'produccion' check (tipo in ('produccion','gestion','coordinacion')),
  horas_base  numeric(6,2) not null default 0,
  orden       int not null default 0,
  creado      timestamptz default now()
);
-- Asegurar columnas si la tabla ya existía sin ellas (causa del error original)
alter table tareas_catalogo add column if not exists proceso     text;
alter table tareas_catalogo add column if not exists subproceso  text;
alter table tareas_catalogo add column if not exists descripcion text;
alter table tareas_catalogo add column if not exists tipo        text not null default 'produccion';
alter table tareas_catalogo add column if not exists horas_base  numeric(6,2) not null default 0;
alter table tareas_catalogo add column if not exists orden       int not null default 0;
alter table tareas_catalogo alter column horas_base type numeric(6,2);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='tareas_catalogo_tipo_check') then
    alter table tareas_catalogo add constraint tareas_catalogo_tipo_check
      check (tipo in ('produccion','gestion','coordinacion'));
  end if;
end $$;
create unique index if not exists ux_tareas_catalogo on tareas_catalogo (norma_id, modelo, titulo);

-- 2 · ELIMINAR el modelo de "tareas de sistema" (volvemos al anterior)
drop trigger if exists trg_propagar_catalogo on tareas_catalogo;
drop function if exists public.propagar_catalogo();
drop table if exists tareas_sistema cascade;
-- Quitar columnas que solo servían para tareas_sistema
alter table agenda_tareas drop column if exists tarea_sistema_id;
alter table agenda_tareas drop column if exists mes;

-- 3 · AGENDA: campos que la tarea conserva (Proceso/Subproceso/descr/horas)
alter table agenda_tareas add column if not exists proceso     text;
alter table agenda_tareas add column if not exists subproceso  text;
alter table agenda_tareas add column if not exists descripcion text;
alter table agenda_tareas add column if not exists norma_id    text references normas_catalogo(id);
alter table agenda_tareas add column if not exists catalogo_id uuid references tareas_catalogo(id) on delete set null;
alter table agenda_tareas add column if not exists tipo        text not null default 'produccion';
alter table agenda_tareas add column if not exists hora_inicio text default '09:00';
alter table agenda_tareas add column if not exists horas_base  numeric(6,2);

-- 4 · RLS del catálogo (solo equipo interno)
alter table tareas_catalogo enable row level security;
drop policy if exists tareas_catalogo_team_all on tareas_catalogo;
create policy tareas_catalogo_team_all on tareas_catalogo for all
  using (es_equipo()) with check (es_equipo());


-- ═══════════════════════════════════════════════════════════
-- migracion-v9.sql
-- ═══════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════
-- CONSULTIFY · MIGRACIÓN v9 — Horas TOTALES por tarea (no mensuales)
-- Modelo definitivo de tareas:
--   · tareas_catalogo.horas_base = TOTAL de la tarea (se hace una vez)
--   · La tarea se PROGRAMA en una fecha concreta (agenda_tareas), sin
--     prorrateo por meses.
--   · La EFICIENCIA del nivel NO altera las horas de la tarea (4h=4h),
--     pero SÍ las horas que consume el consultor de su capacidad
--     (eso se calcula en la app/Agenda, no se almacena distinto).
-- Ejecutar DESPUÉS de migracion-v8.sql. Idempotente.
-- ════════════════════════════════════════════════════════════════

-- 1 · Semántica de horas: total de tarea (no mensual)
comment on column tareas_catalogo.horas_base is 'Horas TOTALES de la tarea (no mensuales). Se programa una vez en una fecha.';
comment on column agenda_tareas.horas_previstas is 'Horas planificadas de la tarea (total, no mensual)';
comment on column agenda_tareas.horas_base is 'Horas de la tarea según catálogo (antes de eficiencia del consultor)';
comment on column agenda_tareas.horas_reales is 'Horas hechas (ejecución real)';

-- 2 · Asegurar que NO queda rastro del modelo "mensual / tareas_sistema"
drop trigger if exists trg_propagar_catalogo on tareas_catalogo;
drop function if exists public.propagar_catalogo();
drop table if exists tareas_sistema cascade;
alter table agenda_tareas drop column if exists tarea_sistema_id;
alter table agenda_tareas drop column if exists mes;

-- 3 · La programación de una tarea vincula a su casuística de catálogo
--     (para saber de qué casuística salió, sin propagación automática)
alter table agenda_tareas add column if not exists catalogo_id uuid references tareas_catalogo(id) on delete set null;

-- 4 · Campo opcional: horas que consume el consultor (tras eficiencia).
--     Lo calcula la app al asignar; se guarda para reporting de capacidad.
alter table agenda_tareas add column if not exists horas_consultor numeric(6,2);
comment on column agenda_tareas.horas_consultor is 'Horas que la tarea consume de la capacidad del consultor (= horas_previstas × eficiencia del nivel)';


-- ═══════════════════════════════════════════════════════════
-- migracion-v10.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================================
-- CONSULTIFY · Migración v10
-- 1) Cliente: hasta 2 consultores responsables + meses estimados + fecha inicio
-- 2) Tabla cliente_tareas: tareas instanciadas por cliente (detectadas de sus
--    normas, añadidas a demanda) con horas, fecha estimada/real y consultor.
-- Idempotente.
-- =============================================================================

begin;

-- 1) Consultores responsables y planificación a nivel de cliente
alter table public.clientes add column if not exists consultor_1_id uuid references public.consultores(id);
alter table public.clientes add column if not exists consultor_2_id uuid references public.consultores(id);
alter table public.clientes add column if not exists meses_estimados integer not null default 3;
alter table public.clientes add column if not exists fecha_inicio date;

comment on column public.clientes.consultor_1_id is 'Consultor responsable principal del cliente.';
comment on column public.clientes.consultor_2_id is 'Segundo consultor responsable (opcional).';
comment on column public.clientes.meses_estimados is 'Duración estimada del proyecto del cliente, en meses (base del Gantt).';

-- 2) Tareas instanciadas por cliente
create table if not exists public.cliente_tareas (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes(id) on delete cascade,
  norma_id       text not null,
  modelo         text not null,
  proceso        text,
  subproceso     text,
  titulo         text not null,
  horas          numeric(6,2) not null default 0,   -- horas totales del acto (tras reducción)
  bloque         text,                                -- prefijo de proceso para el Gantt (PE1, PA1…)
  consultor_id   uuid references public.consultores(id),
  fecha_estimada date,
  fecha_real     date,
  hecha          boolean not null default false,
  orden          integer not null default 0,
  creado         timestamptz default now()
);

create index if not exists idx_cliente_tareas_cliente on public.cliente_tareas (cliente_id);
create index if not exists idx_cliente_tareas_consultor on public.cliente_tareas (consultor_id);

comment on table public.cliente_tareas is 'Tareas del proyecto de un cliente, instanciadas desde el catálogo según sus normas. Fechas estimada (Gantt) y real.';

-- 3) Por cada norma de cada empresa (CIF×norma): responsable + auditoría + caducidad
alter table public.empresa_normas add column if not exists responsable_id    uuid references public.consultores(id);
alter table public.empresa_normas add column if not exists fecha_auditoria    date;
alter table public.empresa_normas add column if not exists fecha_caducidad    date;

comment on column public.empresa_normas.responsable_id is 'Consultor responsable de esta norma (cualquiera del equipo).';
comment on column public.empresa_normas.fecha_auditoria is 'Fecha de la auditoría externa de certificación/seguimiento.';
comment on column public.empresa_normas.fecha_caducidad is 'Fecha de caducidad del certificado de esta norma.';

commit;

-- VERIFICACIÓN (aparte):
-- select column_name from information_schema.columns where table_name='clientes' and column_name like 'consultor_%';
-- select count(*) from public.cliente_tareas;


-- ═══════════════════════════════════════════════════════════
-- migracion-v11.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================================
-- CONSULTIFY · Migración v11
-- Fusión Proyectos → Clientes. El cliente pasa a ser el ente único de proyecto.
-- Traspasa de la tabla proyectos a clientes: consultor, modelo, fecha inicio y
-- fecha de auditoría (esta última también a empresa_normas si procede).
-- NO borra la tabla proyectos (se conserva como histórico).
-- Idempotente y conservador: solo rellena campos vacíos en clientes.
-- =============================================================================

begin;

-- Centros: nº de trabajadores (estilo Magic, para total de plantilla del grupo)
alter table public.empresa_centros add column if not exists trabajadores integer default 0;

-- Campos de proyecto a nivel cliente (por si v10 no se aplicó del todo)
alter table public.clientes add column if not exists modelo text;
alter table public.clientes add column if not exists fecha_auditoria date;
alter table public.clientes add column if not exists estado text;
alter table public.clientes add column if not exists notas text;

-- Traspaso: para cada proyecto, vuelca a su cliente los campos que estén vacíos.
-- Si un cliente tuviera varios proyectos, se toma el más reciente por fecha_inicio.
with ult as (
  select distinct on (cliente_id)
    cliente_id, consultor_id, modelo, estado, fecha_inicio, fecha_auditoria, notas
  from public.proyectos
  where cliente_id is not null
  order by cliente_id, fecha_inicio desc nulls last
)
update public.clientes c
set
  consultor_1_id  = coalesce(c.consultor_1_id, u.consultor_id),
  modelo          = coalesce(c.modelo, u.modelo),
  estado          = coalesce(c.estado, u.estado),
  fecha_inicio    = coalesce(c.fecha_inicio, u.fecha_inicio),
  fecha_auditoria = coalesce(c.fecha_auditoria, u.fecha_auditoria),
  notas           = coalesce(c.notas, u.notas)
from ult u
where u.cliente_id = c.id;

commit;

-- VERIFICACIÓN (aparte):
-- select empresa, modelo, estado, consultor_1_id, fecha_inicio, fecha_auditoria
--   from public.clientes order by empresa;


-- ═══════════════════════════════════════════════════════════
-- migracion-v12-rls.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================================
-- CONSULTIFY · RLS para cliente_tareas (faltaba; causaba "row-level security policy")
-- Alinea con el patrón de cliente_empresas/empresa_normas pero incluye
-- superadmin y gestion (que también gestionan clientes).
-- =============================================================================

begin;

alter table public.cliente_tareas enable row level security;

-- Equipo gestiona todo
drop policy if exists equipo_todo_cliente_tareas on public.cliente_tareas;
create policy equipo_todo_cliente_tareas on public.cliente_tareas
  for all
  using      (public.mi_rol() in ('consultor','gestion','admin','superadmin'))
  with check (public.mi_rol() in ('consultor','gestion','admin','superadmin'));

-- El cliente ve (solo lectura) sus tareas
drop policy if exists cliente_lee_sus_tareas on public.cliente_tareas;
create policy cliente_lee_sus_tareas on public.cliente_tareas
  for select
  using (exists (
    select 1 from public.clientes c
    where c.id = cliente_id and c.user_id = auth.uid()
  ));

commit;

-- ─────────────────────────────────────────────────────────────────────────────
-- OPCIONAL (recomendado): las tablas de v2 tampoco incluían 'superadmin' ni
-- 'gestion' en su política de equipo. Si entras como superadmin o gestion y no
-- puedes editar empresas/centros/normas, ejecuta también esto para alinearlas.
-- ─────────────────────────────────────────────────────────────────────────────
-- begin;
-- drop policy if exists equipo_todo_cliente_empresas on public.cliente_empresas;
-- create policy equipo_todo_cliente_empresas on public.cliente_empresas
--   for all using (public.mi_rol() in ('consultor','gestion','admin','superadmin'))
--   with check (public.mi_rol() in ('consultor','gestion','admin','superadmin'));
-- drop policy if exists equipo_todo_empresa_centros on public.empresa_centros;
-- create policy equipo_todo_empresa_centros on public.empresa_centros
--   for all using (public.mi_rol() in ('consultor','gestion','admin','superadmin'))
--   with check (public.mi_rol() in ('consultor','gestion','admin','superadmin'));
-- drop policy if exists equipo_todo_empresa_normas on public.empresa_normas;
-- create policy equipo_todo_empresa_normas on public.empresa_normas
--   for all using (public.mi_rol() in ('consultor','gestion','admin','superadmin'))
--   with check (public.mi_rol() in ('consultor','gestion','admin','superadmin'));
-- commit;


-- ═══════════════════════════════════════════════════════════
-- migracion-v13.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================================
-- CONSULTIFY · Migración v13
-- Puente Planificador (cliente_tareas) → Agenda (agenda_tareas).
-- Añade el vínculo para sincronizar sin duplicar.
-- =============================================================================

begin;

alter table public.agenda_tareas
  add column if not exists origen_cliente_tarea_id uuid references public.cliente_tareas(id) on delete cascade;

create unique index if not exists uq_agenda_origen_cliente_tarea
  on public.agenda_tareas (origen_cliente_tarea_id)
  where origen_cliente_tarea_id is not null;

comment on column public.agenda_tareas.origen_cliente_tarea_id is
  'Si la tarea de agenda proviene del planificador de un cliente, referencia a cliente_tareas. Permite sincronizar sin duplicar.';

commit;

-- VERIFICACIÓN (aparte):
-- select count(*) from public.agenda_tareas where origen_cliente_tarea_id is not null;


-- ═══════════════════════════════════════════════════════════
-- migracion-v14.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================================
-- CONSULTIFY · Migración v14
-- Renombrado INSTANTÁNEO y GLOBAL del prefijo de cliente en las tareas.
-- Al cambiar clientes.empresa, se reescribe el título de todas sus cliente_tareas
-- como "EMPRESA - norma - proceso - subproceso", y ese cambio se propaga al
-- reflejo en agenda_tareas (vía origen_cliente_tarea_id) mediante un 2º trigger.
-- Idempotente.
-- =============================================================================

begin;

-- Helper: construye el título con prefijo de cliente, omitiendo partes vacías.
create or replace function public.cliente_tarea_titulo(
  p_empresa text, p_norma text, p_proceso text, p_subproceso text
) returns text language sql immutable as $$
  select concat_ws(' - ',
    nullif(btrim(p_empresa), ''),
    nullif(btrim(p_norma), ''),
    nullif(btrim(p_proceso), ''),
    nullif(btrim(p_subproceso), '')
  );
$$;

-- ── 1) Al cambiar el nombre del cliente: renombrar todas sus tareas ──
create or replace function public.trg_cliente_rename_tareas()
returns trigger language plpgsql as $$
begin
  if new.empresa is distinct from old.empresa then
    update public.cliente_tareas t
    set titulo = public.cliente_tarea_titulo(new.empresa, t.norma_id, t.proceso, t.subproceso)
    where t.cliente_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists cliente_rename_tareas on public.clientes;
create trigger cliente_rename_tareas
  after update of empresa on public.clientes
  for each row execute function public.trg_cliente_rename_tareas();

-- ── 2) Al cambiar el título de una cliente_tarea: propagar a su reflejo en agenda ──
create or replace function public.trg_cliente_tarea_sync_agenda_titulo()
returns trigger language plpgsql as $$
begin
  if new.titulo is distinct from old.titulo then
    update public.agenda_tareas a
    set titulo = new.titulo
    where a.origen_cliente_tarea_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists cliente_tarea_sync_agenda_titulo on public.cliente_tareas;
create trigger cliente_tarea_sync_agenda_titulo
  after update of titulo on public.cliente_tareas
  for each row execute function public.trg_cliente_tarea_sync_agenda_titulo();

-- ── 3) Normalizar de una vez los títulos ya existentes ──
update public.cliente_tareas t
set titulo = public.cliente_tarea_titulo(c.empresa, t.norma_id, t.proceso, t.subproceso)
from public.clientes c
where c.id = t.cliente_id
  and t.titulo is distinct from public.cliente_tarea_titulo(c.empresa, t.norma_id, t.proceso, t.subproceso);

commit;

-- VERIFICACIÓN (aparte):
-- update clientes set empresa = empresa where id = '<algún_id>';  -- dispara el rename
-- select titulo from cliente_tareas where cliente_id = '<algún_id>' limit 5;


-- ═══════════════════════════════════════════════════════════
-- migracion-v15.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================================
-- CONSULTIFY · Migración v15
-- Seguimientos de una tarea: una tarea >6h se ejecuta en varios días.
-- Guardamos los tramos como JSONB: [{fecha, horas, hecho}].
-- =============================================================================

begin;

alter table public.cliente_tareas
  add column if not exists seguimientos jsonb not null default '[]'::jsonb;

comment on column public.cliente_tareas.seguimientos is
  'Tramos de ejecución de la tarea cuando supera el tope diario: [{"fecha":"YYYY-MM-DD","horas":n,"hecho":false}].';

commit;


-- ═══════════════════════════════════════════════════════════
-- migracion-v16.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================================
-- CONSULTIFY · Migración v16
-- Separación Cliente / Proyecto. El cliente (matriz de facturación) tiene N
-- proyectos. Las tareas cuelgan del PROYECTO, no del cliente.
-- ⚠️ Borra las cliente_tareas actuales (se recrean desde los proyectos nuevos).
-- =============================================================================

begin;

-- 1) Tabla de proyectos del cliente
create table if not exists public.proyectos_cliente (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes(id) on delete cascade,
  nombre         text not null,
  normas         text[] not null default '{}',     -- normas elegidas para este proyecto
  modelo         text,                              -- modelo de relación
  estado         text not null default 'activo',    -- activo | pausado | cerrado
  meses_estimados integer not null default 3,
  fecha_inicio   date,
  consultor_1_id uuid references public.consultores(id),
  consultor_2_id uuid references public.consultores(id),
  creado         timestamptz default now()
);
create index if not exists idx_proyectos_cliente_cliente on public.proyectos_cliente (cliente_id);
create index if not exists idx_proyectos_cliente_estado on public.proyectos_cliente (estado);

alter table public.proyectos_cliente enable row level security;
drop policy if exists equipo_todo_proyectos_cliente on public.proyectos_cliente;
create policy equipo_todo_proyectos_cliente on public.proyectos_cliente
  for all
  using      (public.mi_rol() in ('consultor','gestion','admin','superadmin'))
  with check (public.mi_rol() in ('consultor','gestion','admin','superadmin'));
drop policy if exists cliente_lee_sus_proyectos on public.proyectos_cliente;
create policy cliente_lee_sus_proyectos on public.proyectos_cliente
  for select using (exists (select 1 from public.clientes c where c.id = cliente_id and c.user_id = auth.uid()));

-- 2) cliente_tareas pasa a colgar del proyecto
--    Borramos las tareas actuales (decisión: recrear desde proyectos nuevos).
delete from public.cliente_tareas;

alter table public.cliente_tareas
  add column if not exists proyecto_id uuid references public.proyectos_cliente(id) on delete cascade;

-- Campos para la integración/anidado de tareas comunes
alter table public.cliente_tareas
  add column if not exists integrada boolean not null default false;
alter table public.cliente_tareas
  add column if not exists normas_integradas text[] not null default '{}';

comment on column public.cliente_tareas.proyecto_id is 'Proyecto al que pertenece la tarea (capa intermedia bajo el cliente).';
comment on column public.cliente_tareas.integrada is 'true si es una tarea anidada que integra varias normas.';
comment on column public.cliente_tareas.normas_integradas is 'Normas integradas en esta tarea (base primero), p.ej. {9001,14001}.';

commit;

-- VERIFICACIÓN (aparte):
-- select count(*) from public.proyectos_cliente;
-- select column_name from information_schema.columns where table_name='cliente_tareas' and column_name in ('proyecto_id','integrada','normas_integradas');


-- ═══════════════════════════════════════════════════════════
-- migracion-v17.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================================
-- CONSULTIFY · Migración v17 · Contactos múltiples por cliente
-- =============================================================================

begin;

create table if not exists public.cliente_contactos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  nombre      text not null default '',
  cargo       text,
  email       text,
  telefono    text,
  principal   boolean not null default false,
  creado      timestamptz default now()
);
create index if not exists idx_cliente_contactos_cliente on public.cliente_contactos (cliente_id);

alter table public.cliente_contactos enable row level security;
drop policy if exists equipo_todo_cliente_contactos on public.cliente_contactos;
create policy equipo_todo_cliente_contactos on public.cliente_contactos
  for all
  using      (public.mi_rol() in ('consultor','gestion','admin','superadmin'))
  with check (public.mi_rol() in ('consultor','gestion','admin','superadmin'));
drop policy if exists cliente_lee_sus_contactos on public.cliente_contactos;
create policy cliente_lee_sus_contactos on public.cliente_contactos
  for select using (exists (select 1 from public.clientes c where c.id = cliente_id and c.user_id = auth.uid()));

commit;


-- ═══════════════════════════════════════════════════════════
-- migracion-v18.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================================
-- CONSULTIFY · Migración v18
-- Flag para saber si una tarea de proyecto fue editada a mano. La sincronización
-- desde el catálogo (tareas_catalogo) solo pisará las que NO estén editadas.
-- =============================================================================

begin;

alter table public.cliente_tareas
  add column if not exists editada_manual boolean not null default false;

comment on column public.cliente_tareas.editada_manual is
  'true si el usuario editó horas/título a mano. La sincronización desde el catálogo no la sobrescribe.';

commit;


-- ═══════════════════════════════════════════════════════════
-- migracion-v19.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================================
-- CONSULTIFY · Migración v19 (consolidada)
-- Asegura TODAS las columnas que la app escribe en cliente_tareas.
-- Resuelve: "Could not find the 'tipo' column of 'cliente_tareas'".
-- Idempotente: se puede ejecutar aunque ya hayas corrido v15/v16/v18.
-- =============================================================================

begin;

alter table public.cliente_tareas add column if not exists tipo              text default 'produccion';
alter table public.cliente_tareas add column if not exists reduccion_pct     numeric(5,2) not null default 0;
alter table public.cliente_tareas add column if not exists seguimientos      jsonb not null default '[]'::jsonb;
alter table public.cliente_tareas add column if not exists proyecto_id       uuid references public.proyectos_cliente(id) on delete cascade;
alter table public.cliente_tareas add column if not exists integrada         boolean not null default false;
alter table public.cliente_tareas add column if not exists normas_integradas text[] not null default '{}';
alter table public.cliente_tareas add column if not exists editada_manual    boolean not null default false;

comment on column public.cliente_tareas.tipo is 'produccion | gestion | coordinacion';

commit;

-- Forzar a PostgREST a recargar el esquema (evita que el error persista por caché).
notify pgrst, 'reload schema';

-- VERIFICACIÓN (aparte):
-- select column_name from information_schema.columns
--   where table_name='cliente_tareas' order by column_name;


-- ═══════════════════════════════════════════════════════════
-- migracion-v20.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================================
-- CONSULTIFY · Migración v20
-- Horas reales en las tareas de proyecto (registro de ejecución).
-- =============================================================================

begin;

alter table public.cliente_tareas add column if not exists horas_reales numeric(6,2);

comment on column public.cliente_tareas.horas_reales is 'Horas reales dedicadas a la tarea (ajuste manual durante la ejecución).';

commit;

notify pgrst, 'reload schema';


-- ═══════════════════════════════════════════════════════════
-- migracion-v21.sql
-- ═══════════════════════════════════════════════════════════
-- =============================================================================
-- CONSULTIFY · Migración v21
-- Bloques de ejecución de una tarea: [{fecha, horas}] (4h por defecto, editables).
-- Cada bloque se vuelca como un evento independiente en la agenda.
-- =============================================================================

begin;

alter table public.cliente_tareas
  add column if not exists bloques_ejecucion jsonb not null default '[]'::jsonb;

comment on column public.cliente_tareas.bloques_ejecucion is
  'Bloques de ejecución [{"fecha":"YYYY-MM-DD","horas":4}]. Una tarea de 20h = 5 bloques.';

commit;

notify pgrst, 'reload schema';


-- Refrescar caché de esquema
notify pgrst, 'reload schema';


-- ══════════════ migracion-v22.sql ══════════════

-- =============================================================================
-- CONSULTIFY · Migración v22
-- Agenda: varias fechas efectivas que suman horas reales + horas planificadas.
-- =============================================================================

begin;

-- Número de tarea dentro del proyecto (para el código CLI-Txxx).
alter table public.cliente_tareas
  add column if not exists num_tarea integer;

-- Varias ejecuciones reales por evento: [{fecha, horas}]. La suma = horas reales.
alter table public.agenda_tareas
  add column if not exists ejecuciones jsonb not null default '[]'::jsonb;

-- Horas planificadas (inicio/fin) del bloque.
alter table public.agenda_tareas
  add column if not exists hora_inicio text;
alter table public.agenda_tareas
  add column if not exists hora_fin    text;

-- Código legible de la tarea/bloque (CLI001-T005-B2).
alter table public.agenda_tareas
  add column if not exists codigo text;

comment on column public.agenda_tareas.ejecuciones is
  'Fechas efectivas con horas: [{"fecha":"YYYY-MM-DD","horas":n}]. La suma alimenta horas_reales.';
comment on column public.agenda_tareas.hora_inicio is 'Hora de inicio planificada (HH:MM).';
comment on column public.agenda_tareas.hora_fin is 'Hora de fin planificada (HH:MM).';
comment on column public.agenda_tareas.codigo is 'Código legible: Cliente-Txxx-By.';

-- La restricción de horas_reales <= 9 estorba si sumamos varias ejecuciones.
-- La relajamos (la suma puede superar 9 entre varios días).
alter table public.agenda_tareas drop constraint if exists agenda_tareas_horas_reales_check;

commit;

notify pgrst, 'reload schema';


-- ══════════════ migracion-v23-une158101.sql ══════════════

-- ============================================================
-- migracion-v23-une158101.sql
-- Alta UNE 158101 en normas_catalogo (esquema real confirmado)
-- ============================================================
INSERT INTO normas_catalogo (id, nombre, descripcion, nivel, h_apoyo, activa)
VALUES (
  'une158101',
  'UNE 158101 — Gestión de centros residenciales',
  'Servicios para la promoción de la autonomía personal. Centros residenciales y con centro de día/noche integrado.',
  'J3',
  40,
  true
)
ON CONFLICT (id) DO UPDATE
  SET nombre = EXCLUDED.nombre,
      descripcion = EXCLUDED.descripcion,
      nivel = EXCLUDED.nivel,
      h_apoyo = EXCLUDED.h_apoyo,
      activa = true;


-- ══════════════ migracion-v24-presupuestos-tipo.sql ══════════════

-- ============================================================
-- migracion-v24-presupuestos-tipo.sql
-- Amplía el CHECK de 'tipo' en presupuestos para admitir 'fraccionado'
-- (modelo Implantación) y mantiene 'mes' y 'bolsa'.
-- También añade una columna opcional 'requerimiento' (texto legible
-- de lo que pidió el lead) para que el comercial prepare la oferta.
-- ============================================================

BEGIN;

-- 1) Reemplazar la restricción de 'tipo'
ALTER TABLE presupuestos DROP CONSTRAINT IF EXISTS presupuestos_tipo_check;
ALTER TABLE presupuestos
  ADD CONSTRAINT presupuestos_tipo_check
  CHECK (tipo IN ('mes', 'bolsa', 'fraccionado'));

-- 2) Columna legible del requerimiento (no rompe inserts existentes)
ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS requerimiento text;

COMMIT;


-- ══════════════ migracion-v25-storage-ofertas.sql ══════════════

-- ============================================================
-- migracion-v25-storage-ofertas.sql
-- 1) Crea el bucket público 'ofertas' en Supabase Storage
-- 2) Política de lectura pública + escritura solo service_role
-- 3) Columnas url_pdf / url_pptx en presupuestos para el enlace de descarga
-- ============================================================

-- 1) Bucket público 'ofertas' (idempotente)
insert into storage.buckets (id, name, public)
values ('ofertas', 'ofertas', true)
on conflict (id) do update set public = true;

-- 2) Políticas de Storage para el bucket 'ofertas'
--    Lectura pública (cualquiera con el enlace puede descargar la oferta)
drop policy if exists "ofertas_public_read" on storage.objects;
create policy "ofertas_public_read"
  on storage.objects for select
  using (bucket_id = 'ofertas');

--    La escritura la hace la función con service_role (que ignora RLS),
--    por lo que NO añadimos política de insert para anon/authenticated:
--    así nadie sube archivos al bucket salvo el backend.

-- 3) Columnas de enlace en presupuestos (idempotente)
alter table presupuestos add column if not exists url_pdf  text;
alter table presupuestos add column if not exists url_pptx text;


-- ══════════════ migracion-v26-presupuestos-campos.sql ══════════════

-- ============================================================
-- migracion-v26-presupuestos-campos.sql
-- Campos adicionales del lead para la oferta:
--   cif, cargo, numero_oferta, comercial
-- ============================================================

alter table presupuestos add column if not exists cif            text;
alter table presupuestos add column if not exists cargo          text;
alter table presupuestos add column if not exists numero_oferta  text;
alter table presupuestos add column if not exists comercial      text default 'Alejandro';

-- Índice para localizar rápido por número de oferta
create index if not exists idx_presupuestos_numero_oferta on presupuestos(numero_oferta);


-- ══════════════ migracion-v27-correlativo-ofertas.sql ══════════════

-- ============================================================
-- migracion-v27-correlativo-ofertas.sql
-- Correlativo limpio de ofertas: OFE-AAAA-NNN reiniciable por año.
-- Usa una tabla contador con bloqueo atómico (sin condiciones de carrera).
-- ============================================================

-- Tabla de contadores por año
create table if not exists oferta_contador (
  anio  int  primary key,
  ultimo int not null default 0
);

-- Función atómica: devuelve el siguiente número del año dado y avanza el contador.
-- UPSERT con bloqueo de fila → seguro ante llamadas concurrentes.
create or replace function siguiente_numero_oferta(p_anio int default extract(year from now())::int)
returns text
language plpgsql
as $$
declare
  v_num int;
begin
  insert into oferta_contador (anio, ultimo)
  values (p_anio, 1)
  on conflict (anio) do update set ultimo = oferta_contador.ultimo + 1
  returning ultimo into v_num;

  return 'OFE-' || p_anio || '-' || lpad(v_num::text, 3, '0');
end;
$$;

-- Permitir que el rol anónimo (formulario público) la invoque vía RPC.
grant execute on function siguiente_numero_oferta(int) to anon, authenticated, service_role;


-- ══════════════ migracion-v29-horas-base-reales.sql ══════════════

-- ============================================================
-- migracion-v29-horas-base-reales.sql
-- Reemplaza horas_base de tareas_catalogo por las horas BASE REALES
-- del planificador (las grandes), para que el planificador reparta
-- correctamente por meses. Afecta a las 9 normas del planificador.
-- NO afecta a precios (la Calculadora usa calcEngine, no este catálogo).
-- ============================================================

begin;

delete from tareas_catalogo where norma_id in ('9001','14001','27001','45001','9004','21001','42001','56001','une158101');

insert into tareas_catalogo (norma_id,modelo,titulo,proceso,subproceso,horas_base,orden) values
  ('9001','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',3.0,1),
  ('9001','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',3.0,2),
  ('9001','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',3.0,3),
  ('9001','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',3.0,4),
  ('9001','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',4.0,5),
  ('9001','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',4.0,6),
  ('9001','Apoyo','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('9001','Apoyo','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.0,8),
  ('9001','Apoyo','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',2.0,9),
  ('9001','Apoyo','PA1 GESTIÓN DE PERSONAS - S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD','PA1 GESTIÓN DE PERSONAS','S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD',2.0,10),
  ('9001','Apoyo','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.0,11),
  ('9001','Apoyo','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',3.0,12),
  ('9001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',2.0,13),
  ('9001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',2.0,14),
  ('9001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',2.0,15),
  ('9001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',2.0,16),
  ('9001','Apoyo','PA5 GESTIÓN DE SEGURIDAD - S1 PA5 GESTION SEGURIDAD OPERACIONAL','PA5 GESTIÓN DE SEGURIDAD','S1 PA5 GESTION SEGURIDAD OPERACIONAL',2.0,17),
  ('9001','Apoyo','PA5 GESTIÓN DE SEGURIDAD - S2 PA5 GESTION SEGURIDAD LÓGICA','PA5 GESTIÓN DE SEGURIDAD','S2 PA5 GESTION SEGURIDAD LÓGICA',2.0,18),
  ('9001','Apoyo','PA5 GESTIÓN DE SEGURIDAD - S3 PA5 GESTION CONTINUIDAD DE NEGOCIO','PA5 GESTIÓN DE SEGURIDAD','S3 PA5 GESTION CONTINUIDAD DE NEGOCIO',2.0,19),
  ('9001','Apoyo','PA5 GESTIÓN DE SEGURIDAD - S4 PA5 GESTIÓN SEGURIDAD DATOS','PA5 GESTIÓN DE SEGURIDAD','S4 PA5 GESTIÓN SEGURIDAD DATOS',2.0,20),
  ('9001','Apoyo','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',2.0,21),
  ('9001','Apoyo','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',2.0,22),
  ('9001','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',3.0,1),
  ('9001','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',3.0,2),
  ('9001','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',3.0,3),
  ('9001','Relación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',3.0,4),
  ('9001','Relación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',4.0,5),
  ('9001','Relación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',4.0,6),
  ('9001','Relación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('9001','Relación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.0,8),
  ('9001','Relación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',2.0,9),
  ('9001','Relación','PA1 GESTIÓN DE PERSONAS - S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD','PA1 GESTIÓN DE PERSONAS','S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD',2.0,10),
  ('9001','Relación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.0,11),
  ('9001','Relación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',3.0,12),
  ('9001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',2.0,13),
  ('9001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',2.0,14),
  ('9001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',2.0,15),
  ('9001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',2.0,16),
  ('9001','Relación','PA5 GESTIÓN DE SEGURIDAD - S1 PA5 GESTION SEGURIDAD OPERACIONAL','PA5 GESTIÓN DE SEGURIDAD','S1 PA5 GESTION SEGURIDAD OPERACIONAL',2.0,17),
  ('9001','Relación','PA5 GESTIÓN DE SEGURIDAD - S2 PA5 GESTION SEGURIDAD LÓGICA','PA5 GESTIÓN DE SEGURIDAD','S2 PA5 GESTION SEGURIDAD LÓGICA',2.0,18),
  ('9001','Relación','PA5 GESTIÓN DE SEGURIDAD - S3 PA5 GESTION CONTINUIDAD DE NEGOCIO','PA5 GESTIÓN DE SEGURIDAD','S3 PA5 GESTION CONTINUIDAD DE NEGOCIO',2.0,19),
  ('9001','Relación','PA5 GESTIÓN DE SEGURIDAD - S4 PA5 GESTIÓN SEGURIDAD DATOS','PA5 GESTIÓN DE SEGURIDAD','S4 PA5 GESTIÓN SEGURIDAD DATOS',2.0,20),
  ('9001','Relación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',2.0,21),
  ('9001','Relación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',2.0,22),
  ('9001','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',3.0,1),
  ('9001','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',3.0,2),
  ('9001','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',3.0,3),
  ('9001','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',3.0,4),
  ('9001','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',8.0,5),
  ('9001','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',6.0,6),
  ('9001','Implicación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('9001','Implicación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.0,8),
  ('9001','Implicación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',6.0,9),
  ('9001','Implicación','PA1 GESTIÓN DE PERSONAS - S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD','PA1 GESTIÓN DE PERSONAS','S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD',4.0,10),
  ('9001','Implicación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.0,11),
  ('9001','Implicación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',6.0,12),
  ('9001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',4.0,13),
  ('9001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',2.0,14),
  ('9001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',2.0,15),
  ('9001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',4.0,16),
  ('9001','Implicación','PA5 GESTIÓN DE SEGURIDAD - S1 PA5 GESTION SEGURIDAD OPERACIONAL','PA5 GESTIÓN DE SEGURIDAD','S1 PA5 GESTION SEGURIDAD OPERACIONAL',2.0,17),
  ('9001','Implicación','PA5 GESTIÓN DE SEGURIDAD - S2 PA5 GESTION SEGURIDAD LÓGICA','PA5 GESTIÓN DE SEGURIDAD','S2 PA5 GESTION SEGURIDAD LÓGICA',2.0,18),
  ('9001','Implicación','PA5 GESTIÓN DE SEGURIDAD - S3 PA5 GESTION CONTINUIDAD DE NEGOCIO','PA5 GESTIÓN DE SEGURIDAD','S3 PA5 GESTION CONTINUIDAD DE NEGOCIO',2.0,19),
  ('9001','Implicación','PA5 GESTIÓN DE SEGURIDAD - S4 PA5 GESTIÓN SEGURIDAD DATOS','PA5 GESTIÓN DE SEGURIDAD','S4 PA5 GESTIÓN SEGURIDAD DATOS',2.0,20),
  ('9001','Implicación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',2.0,21),
  ('9001','Implicación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',2.0,22),
  ('9001','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',5.0,1),
  ('9001','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',5.0,2),
  ('9001','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',5.0,3),
  ('9001','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',3.0,4),
  ('9001','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',10.0,5),
  ('9001','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',6.0,6),
  ('9001','Compromiso','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',6.0,7),
  ('9001','Compromiso','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.0,8),
  ('9001','Compromiso','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',6.0,9),
  ('9001','Compromiso','PA1 GESTIÓN DE PERSONAS - S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD','PA1 GESTIÓN DE PERSONAS','S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD',6.0,10),
  ('9001','Compromiso','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.0,11),
  ('9001','Compromiso','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',6.0,12),
  ('9001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',4.0,13),
  ('9001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',2.0,14),
  ('9001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',2.0,15),
  ('9001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',6.0,16),
  ('9001','Compromiso','PA5 GESTIÓN DE SEGURIDAD - S1 PA5 GESTION SEGURIDAD OPERACIONAL','PA5 GESTIÓN DE SEGURIDAD','S1 PA5 GESTION SEGURIDAD OPERACIONAL',2.0,17),
  ('9001','Compromiso','PA5 GESTIÓN DE SEGURIDAD - S2 PA5 GESTION SEGURIDAD LÓGICA','PA5 GESTIÓN DE SEGURIDAD','S2 PA5 GESTION SEGURIDAD LÓGICA',2.0,18),
  ('9001','Compromiso','PA5 GESTIÓN DE SEGURIDAD - S3 PA5 GESTION CONTINUIDAD DE NEGOCIO','PA5 GESTIÓN DE SEGURIDAD','S3 PA5 GESTION CONTINUIDAD DE NEGOCIO',2.0,19),
  ('9001','Compromiso','PA5 GESTIÓN DE SEGURIDAD - S4 PA5 GESTIÓN SEGURIDAD DATOS','PA5 GESTIÓN DE SEGURIDAD','S4 PA5 GESTIÓN SEGURIDAD DATOS',2.0,20),
  ('9001','Compromiso','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',4.0,21),
  ('9001','Compromiso','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',4.0,22),
  ('9001','Compromiso','PA7 GESTIÓN ECONÓMICA ADMINISTRATIVA - S1 PA7 GESTIÓN ECONÓMICA','PA7 GESTIÓN ECONÓMICA ADMINISTRATIVA','S1 PA7 GESTIÓN ECONÓMICA',2.0,23),
  ('9001','Compromiso','PA7 GESTIÓN ECONÓMICA ADMINISTRATIVA - S1PA7 GESTIÓN ADMINISTRATIVA','PA7 GESTIÓN ECONÓMICA ADMINISTRATIVA','S1PA7 GESTIÓN ADMINISTRATIVA',2.0,24),
  ('9001','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',1.8,1),
  ('9001','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',1.8,2),
  ('9001','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',1.8,3),
  ('9001','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',1.8,4),
  ('9001','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',4.8,5),
  ('9001','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',3.6,6),
  ('9001','Implantación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',2.4,7),
  ('9001','Implantación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',1.8,8),
  ('9001','Implantación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',3.6,9),
  ('9001','Implantación','PA1 GESTIÓN DE PERSONAS - S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD','PA1 GESTIÓN DE PERSONAS','S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD',2.4,10),
  ('9001','Implantación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',1.2,11),
  ('9001','Implantación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',3.6,12),
  ('9001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',2.4,13),
  ('9001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',1.2,14),
  ('9001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',1.2,15),
  ('9001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',2.4,16),
  ('9001','Implantación','PA5 GESTIÓN DE SEGURIDAD - S1 PA5 GESTION SEGURIDAD OPERACIONAL','PA5 GESTIÓN DE SEGURIDAD','S1 PA5 GESTION SEGURIDAD OPERACIONAL',1.2,17),
  ('9001','Implantación','PA5 GESTIÓN DE SEGURIDAD - S2 PA5 GESTION SEGURIDAD LÓGICA','PA5 GESTIÓN DE SEGURIDAD','S2 PA5 GESTION SEGURIDAD LÓGICA',1.2,18),
  ('9001','Implantación','PA5 GESTIÓN DE SEGURIDAD - S3 PA5 GESTION CONTINUIDAD DE NEGOCIO','PA5 GESTIÓN DE SEGURIDAD','S3 PA5 GESTION CONTINUIDAD DE NEGOCIO',1.2,19),
  ('9001','Implantación','PA5 GESTIÓN DE SEGURIDAD - S4 PA5 GESTIÓN SEGURIDAD DATOS','PA5 GESTIÓN DE SEGURIDAD','S4 PA5 GESTIÓN SEGURIDAD DATOS',1.2,20),
  ('9001','Implantación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',1.2,21),
  ('9001','Implantación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',1.2,22),
  ('14001','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',3.0,1),
  ('14001','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',3.0,2),
  ('14001','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',3.0,3),
  ('14001','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',3.0,4),
  ('14001','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',4.0,5),
  ('14001','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',4.0,6),
  ('14001','Apoyo','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('14001','Apoyo','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.0,8),
  ('14001','Apoyo','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',3.0,9),
  ('14001','Apoyo','PA1 GESTIÓN DE PERSONAS - S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD','PA1 GESTIÓN DE PERSONAS','S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD',2.0,10),
  ('14001','Apoyo','PA2 GESTIÓN MEDIOAMBIENTAL - S1 PA2 IDENTIFIACIÓN Y EVALUACION DE ASPECTOS AMBIENTALES','PA2 GESTIÓN MEDIOAMBIENTAL','S1 PA2 IDENTIFIACIÓN Y EVALUACION DE ASPECTOS AMBIENTALES',2.0,11),
  ('14001','Apoyo','PA2 GESTIÓN MEDIOAMBIENTAL - S2 PA2 GESTION DE VERTIDOS RESIDUOS','PA2 GESTIÓN MEDIOAMBIENTAL','S2 PA2 GESTION DE VERTIDOS RESIDUOS',4.0,12),
  ('14001','Apoyo','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.0,13),
  ('14001','Apoyo','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',6.0,14),
  ('14001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',6.0,15),
  ('14001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',6.0,16),
  ('14001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',4.0,17),
  ('14001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',10.0,18),
  ('14001','Apoyo','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',2.0,19),
  ('14001','Apoyo','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',2.0,20),
  ('14001','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',3.0,1),
  ('14001','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',3.0,2),
  ('14001','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',3.0,3),
  ('14001','Relación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',3.0,4),
  ('14001','Relación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',4.0,5),
  ('14001','Relación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',4.0,6),
  ('14001','Relación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('14001','Relación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.0,8),
  ('14001','Relación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',3.0,9),
  ('14001','Relación','PA1 GESTIÓN DE PERSONAS - S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD','PA1 GESTIÓN DE PERSONAS','S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD',2.0,10),
  ('14001','Relación','PA2 GESTIÓN MEDIOAMBIENTAL - S1 PA2 IDENTIFIACIÓN Y EVALUACION DE ASPECTOS AMBIENTALES','PA2 GESTIÓN MEDIOAMBIENTAL','S1 PA2 IDENTIFIACIÓN Y EVALUACION DE ASPECTOS AMBIENTALES',2.0,11),
  ('14001','Relación','PA2 GESTIÓN MEDIOAMBIENTAL - S2 PA2 GESTION DE VERTIDOS RESIDUOS','PA2 GESTIÓN MEDIOAMBIENTAL','S2 PA2 GESTION DE VERTIDOS RESIDUOS',4.0,12),
  ('14001','Relación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.0,13),
  ('14001','Relación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',6.0,14),
  ('14001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',6.0,15),
  ('14001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',6.0,16),
  ('14001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',4.0,17),
  ('14001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',10.0,18),
  ('14001','Relación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',2.0,19),
  ('14001','Relación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',2.0,20),
  ('14001','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',3.0,1),
  ('14001','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',3.0,2),
  ('14001','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',3.0,3),
  ('14001','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',3.0,4),
  ('14001','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',8.0,5),
  ('14001','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',6.0,6),
  ('14001','Implicación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('14001','Implicación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.0,8),
  ('14001','Implicación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',9.0,9),
  ('14001','Implicación','PA1 GESTIÓN DE PERSONAS - S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD','PA1 GESTIÓN DE PERSONAS','S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD',4.0,10),
  ('14001','Implicación','PA2 GESTIÓN MEDIOAMBIENTAL - S1 PA2 IDENTIFIACIÓN Y EVALUACION DE ASPECTOS AMBIENTALES','PA2 GESTIÓN MEDIOAMBIENTAL','S1 PA2 IDENTIFIACIÓN Y EVALUACION DE ASPECTOS AMBIENTALES',6.0,11),
  ('14001','Implicación','PA2 GESTIÓN MEDIOAMBIENTAL - S2 PA2 GESTION DE VERTIDOS RESIDUOS','PA2 GESTIÓN MEDIOAMBIENTAL','S2 PA2 GESTION DE VERTIDOS RESIDUOS',6.0,12),
  ('14001','Implicación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.0,13),
  ('14001','Implicación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',12.0,14),
  ('14001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',8.0,15),
  ('14001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',6.0,16),
  ('14001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',4.0,17),
  ('14001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',15.0,18),
  ('14001','Implicación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',2.0,19),
  ('14001','Implicación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',2.0,20),
  ('14001','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',5.0,1),
  ('14001','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',5.0,2),
  ('14001','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',5.0,3),
  ('14001','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',3.0,4),
  ('14001','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',10.0,5),
  ('14001','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',6.0,6),
  ('14001','Compromiso','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',6.0,7),
  ('14001','Compromiso','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.0,8),
  ('14001','Compromiso','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',9.0,9),
  ('14001','Compromiso','PA1 GESTIÓN DE PERSONAS - S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD','PA1 GESTIÓN DE PERSONAS','S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD',6.0,10),
  ('14001','Compromiso','PA2 GESTIÓN MEDIOAMBIENTAL - S1 PA2 IDENTIFIACIÓN Y EVALUACION DE ASPECTOS AMBIENTALES','PA2 GESTIÓN MEDIOAMBIENTAL','S1 PA2 IDENTIFIACIÓN Y EVALUACION DE ASPECTOS AMBIENTALES',8.0,11),
  ('14001','Compromiso','PA2 GESTIÓN MEDIOAMBIENTAL - S2 PA2 GESTION DE VERTIDOS RESIDUOS','PA2 GESTIÓN MEDIOAMBIENTAL','S2 PA2 GESTION DE VERTIDOS RESIDUOS',6.0,12),
  ('14001','Compromiso','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.0,13),
  ('14001','Compromiso','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',12.0,14),
  ('14001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',8.0,15),
  ('14001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',6.0,16),
  ('14001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',4.0,17),
  ('14001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',20.0,18),
  ('14001','Compromiso','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',4.0,19),
  ('14001','Compromiso','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',4.0,20),
  ('14001','Compromiso','PA7 GESTIÓN ECONÓMICA ADMINISTRATIVA - S1 PA7 GESTIÓN ECONÓMICA','PA7 GESTIÓN ECONÓMICA ADMINISTRATIVA','S1 PA7 GESTIÓN ECONÓMICA',2.0,21),
  ('14001','Compromiso','PA7 GESTIÓN ECONÓMICA ADMINISTRATIVA - S1PA7 GESTIÓN ADMINISTRATIVA','PA7 GESTIÓN ECONÓMICA ADMINISTRATIVA','S1PA7 GESTIÓN ADMINISTRATIVA',2.0,22),
  ('14001','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',1.8,1),
  ('14001','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',1.8,2),
  ('14001','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',1.8,3),
  ('14001','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',1.8,4),
  ('14001','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',4.8,5),
  ('14001','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',3.6,6),
  ('14001','Implantación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',2.4,7),
  ('14001','Implantación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',1.8,8),
  ('14001','Implantación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',5.4,9),
  ('14001','Implantación','PA1 GESTIÓN DE PERSONAS - S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD','PA1 GESTIÓN DE PERSONAS','S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD',2.4,10),
  ('14001','Implantación','PA2 GESTIÓN MEDIOAMBIENTAL - S1 PA2 IDENTIFIACIÓN Y EVALUACION DE ASPECTOS AMBIENTALES','PA2 GESTIÓN MEDIOAMBIENTAL','S1 PA2 IDENTIFIACIÓN Y EVALUACION DE ASPECTOS AMBIENTALES',3.6,11),
  ('14001','Implantación','PA2 GESTIÓN MEDIOAMBIENTAL - S2 PA2 GESTION DE VERTIDOS RESIDUOS','PA2 GESTIÓN MEDIOAMBIENTAL','S2 PA2 GESTION DE VERTIDOS RESIDUOS',3.6,12),
  ('14001','Implantación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',1.2,13),
  ('14001','Implantación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',7.2,14),
  ('14001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',4.8,15),
  ('14001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',3.6,16),
  ('14001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',2.4,17),
  ('14001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',9.0,18),
  ('14001','Implantación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',1.2,19),
  ('14001','Implantación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',1.2,20),
  ('27001','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',3.0,1),
  ('27001','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',12.0,2),
  ('27001','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',9.0,3),
  ('27001','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',6.0,4),
  ('27001','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',8.0,5),
  ('27001','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',4.0,6),
  ('27001','Apoyo','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('27001','Apoyo','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',6.0,8),
  ('27001','Apoyo','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',4.0,9),
  ('27001','Apoyo','PA1 GESTIÓN DE PERSONAS - S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD','PA1 GESTIÓN DE PERSONAS','S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD',2.0,10),
  ('27001','Apoyo','PA2 GESTIÓN MEDIOAMBIENTAL - S2 PA2 GESTION DE VERTIDOS RESIDUOS','PA2 GESTIÓN MEDIOAMBIENTAL','S2 PA2 GESTION DE VERTIDOS RESIDUOS',2.0,11),
  ('27001','Apoyo','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',6.0,12),
  ('27001','Apoyo','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',6.0,13),
  ('27001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',6.0,14),
  ('27001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',6.0,15),
  ('27001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',10.0,16),
  ('27001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',10.0,17),
  ('27001','Apoyo','PA5 GESTIÓN DE SEGURIDAD - S1 PA5 GESTION SEGURIDAD OPERACIONAL','PA5 GESTIÓN DE SEGURIDAD','S1 PA5 GESTION SEGURIDAD OPERACIONAL',10.0,18),
  ('27001','Apoyo','PA5 GESTIÓN DE SEGURIDAD - S2 PA5 GESTION SEGURIDAD LÓGICA','PA5 GESTIÓN DE SEGURIDAD','S2 PA5 GESTION SEGURIDAD LÓGICA',5.0,19),
  ('27001','Apoyo','PA5 GESTIÓN DE SEGURIDAD - S3 PA5 GESTION CONTINUIDAD DE NEGOCIO','PA5 GESTIÓN DE SEGURIDAD','S3 PA5 GESTION CONTINUIDAD DE NEGOCIO',5.0,20),
  ('27001','Apoyo','PA5 GESTIÓN DE SEGURIDAD - S4 PA5 GESTIÓN SEGURIDAD DATOS','PA5 GESTIÓN DE SEGURIDAD','S4 PA5 GESTIÓN SEGURIDAD DATOS',5.0,21),
  ('27001','Apoyo','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',2.0,22),
  ('27001','Apoyo','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',4.0,23),
  ('27001','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',3.0,1),
  ('27001','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',12.0,2),
  ('27001','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',9.0,3),
  ('27001','Relación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',6.0,4),
  ('27001','Relación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',8.0,5),
  ('27001','Relación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',4.0,6),
  ('27001','Relación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('27001','Relación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',6.0,8),
  ('27001','Relación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',4.0,9),
  ('27001','Relación','PA1 GESTIÓN DE PERSONAS - S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD','PA1 GESTIÓN DE PERSONAS','S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD',2.0,10),
  ('27001','Relación','PA2 GESTIÓN MEDIOAMBIENTAL - S2 PA2 GESTION DE VERTIDOS RESIDUOS','PA2 GESTIÓN MEDIOAMBIENTAL','S2 PA2 GESTION DE VERTIDOS RESIDUOS',2.0,11),
  ('27001','Relación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',6.0,12),
  ('27001','Relación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',6.0,13),
  ('27001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',6.0,14),
  ('27001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',6.0,15),
  ('27001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',10.0,16),
  ('27001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',10.0,17),
  ('27001','Relación','PA5 GESTIÓN DE SEGURIDAD - S1 PA5 GESTION SEGURIDAD OPERACIONAL','PA5 GESTIÓN DE SEGURIDAD','S1 PA5 GESTION SEGURIDAD OPERACIONAL',10.0,18),
  ('27001','Relación','PA5 GESTIÓN DE SEGURIDAD - S2 PA5 GESTION SEGURIDAD LÓGICA','PA5 GESTIÓN DE SEGURIDAD','S2 PA5 GESTION SEGURIDAD LÓGICA',5.0,19),
  ('27001','Relación','PA5 GESTIÓN DE SEGURIDAD - S3 PA5 GESTION CONTINUIDAD DE NEGOCIO','PA5 GESTIÓN DE SEGURIDAD','S3 PA5 GESTION CONTINUIDAD DE NEGOCIO',5.0,20),
  ('27001','Relación','PA5 GESTIÓN DE SEGURIDAD - S4 PA5 GESTIÓN SEGURIDAD DATOS','PA5 GESTIÓN DE SEGURIDAD','S4 PA5 GESTIÓN SEGURIDAD DATOS',5.0,21),
  ('27001','Relación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',2.0,22),
  ('27001','Relación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',4.0,23),
  ('27001','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',3.0,1),
  ('27001','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',12.0,2),
  ('27001','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',9.0,3),
  ('27001','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',6.0,4),
  ('27001','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',16.0,5),
  ('27001','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',6.0,6),
  ('27001','Implicación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('27001','Implicación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',6.0,8),
  ('27001','Implicación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',15.0,9),
  ('27001','Implicación','PA1 GESTIÓN DE PERSONAS - S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD','PA1 GESTIÓN DE PERSONAS','S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD',4.0,10),
  ('27001','Implicación','PA2 GESTIÓN MEDIOAMBIENTAL - S2 PA2 GESTION DE VERTIDOS RESIDUOS','PA2 GESTIÓN MEDIOAMBIENTAL','S2 PA2 GESTION DE VERTIDOS RESIDUOS',4.0,11),
  ('27001','Implicación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',6.0,12),
  ('27001','Implicación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',12.0,13),
  ('27001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',8.0,14),
  ('27001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',6.0,15),
  ('27001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',10.0,16),
  ('27001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',15.0,17),
  ('27001','Implicación','PA5 GESTIÓN DE SEGURIDAD - S1 PA5 GESTION SEGURIDAD OPERACIONAL','PA5 GESTIÓN DE SEGURIDAD','S1 PA5 GESTION SEGURIDAD OPERACIONAL',10.0,18),
  ('27001','Implicación','PA5 GESTIÓN DE SEGURIDAD - S2 PA5 GESTION SEGURIDAD LÓGICA','PA5 GESTIÓN DE SEGURIDAD','S2 PA5 GESTION SEGURIDAD LÓGICA',5.0,19),
  ('27001','Implicación','PA5 GESTIÓN DE SEGURIDAD - S3 PA5 GESTION CONTINUIDAD DE NEGOCIO','PA5 GESTIÓN DE SEGURIDAD','S3 PA5 GESTION CONTINUIDAD DE NEGOCIO',10.0,20),
  ('27001','Implicación','PA5 GESTIÓN DE SEGURIDAD - S4 PA5 GESTIÓN SEGURIDAD DATOS','PA5 GESTIÓN DE SEGURIDAD','S4 PA5 GESTIÓN SEGURIDAD DATOS',5.0,21),
  ('27001','Implicación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',2.0,22),
  ('27001','Implicación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',4.0,23),
  ('27001','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',12.0,1),
  ('27001','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',12.0,2),
  ('27001','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',12.0,3),
  ('27001','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',6.0,4),
  ('27001','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',20.0,5),
  ('27001','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',6.0,6),
  ('27001','Compromiso','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',6.0,7),
  ('27001','Compromiso','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',6.0,8),
  ('27001','Compromiso','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',15.0,9),
  ('27001','Compromiso','PA1 GESTIÓN DE PERSONAS - S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD','PA1 GESTIÓN DE PERSONAS','S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD',6.0,10),
  ('27001','Compromiso','PA2 GESTIÓN MEDIOAMBIENTAL - S2 PA2 GESTION DE VERTIDOS RESIDUOS','PA2 GESTIÓN MEDIOAMBIENTAL','S2 PA2 GESTION DE VERTIDOS RESIDUOS',4.0,11),
  ('27001','Compromiso','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',6.0,12),
  ('27001','Compromiso','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',12.0,13),
  ('27001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',8.0,14),
  ('27001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',6.0,15),
  ('27001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',10.0,16),
  ('27001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',20.0,17),
  ('27001','Compromiso','PA5 GESTIÓN DE SEGURIDAD - S1 PA5 GESTION SEGURIDAD OPERACIONAL','PA5 GESTIÓN DE SEGURIDAD','S1 PA5 GESTION SEGURIDAD OPERACIONAL',10.0,18),
  ('27001','Compromiso','PA5 GESTIÓN DE SEGURIDAD - S2 PA5 GESTION SEGURIDAD LÓGICA','PA5 GESTIÓN DE SEGURIDAD','S2 PA5 GESTION SEGURIDAD LÓGICA',5.0,19),
  ('27001','Compromiso','PA5 GESTIÓN DE SEGURIDAD - S3 PA5 GESTION CONTINUIDAD DE NEGOCIO','PA5 GESTIÓN DE SEGURIDAD','S3 PA5 GESTION CONTINUIDAD DE NEGOCIO',15.0,20),
  ('27001','Compromiso','PA5 GESTIÓN DE SEGURIDAD - S4 PA5 GESTIÓN SEGURIDAD DATOS','PA5 GESTIÓN DE SEGURIDAD','S4 PA5 GESTIÓN SEGURIDAD DATOS',5.0,21),
  ('27001','Compromiso','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',4.0,22),
  ('27001','Compromiso','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',8.0,23),
  ('27001','Compromiso','PA7 GESTIÓN ECONÓMICA ADMINISTRATIVA - S1 PA7 GESTIÓN ECONÓMICA','PA7 GESTIÓN ECONÓMICA ADMINISTRATIVA','S1 PA7 GESTIÓN ECONÓMICA',2.0,24),
  ('27001','Compromiso','PA7 GESTIÓN ECONÓMICA ADMINISTRATIVA - S1PA7 GESTIÓN ADMINISTRATIVA','PA7 GESTIÓN ECONÓMICA ADMINISTRATIVA','S1PA7 GESTIÓN ADMINISTRATIVA',2.0,25),
  ('27001','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',1.8,1),
  ('27001','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',7.2,2),
  ('27001','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',5.4,3),
  ('27001','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',3.6,4),
  ('27001','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',9.6,5),
  ('27001','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',3.6,6),
  ('27001','Implantación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',2.4,7),
  ('27001','Implantación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.6,8),
  ('27001','Implantación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',9.0,9),
  ('27001','Implantación','PA1 GESTIÓN DE PERSONAS - S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD','PA1 GESTIÓN DE PERSONAS','S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD',2.4,10),
  ('27001','Implantación','PA2 GESTIÓN MEDIOAMBIENTAL - S2 PA2 GESTION DE VERTIDOS RESIDUOS','PA2 GESTIÓN MEDIOAMBIENTAL','S2 PA2 GESTION DE VERTIDOS RESIDUOS',2.4,11),
  ('27001','Implantación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',3.6,12),
  ('27001','Implantación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',7.2,13),
  ('27001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',4.8,14),
  ('27001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',3.6,15),
  ('27001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',6.0,16),
  ('27001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',9.0,17),
  ('27001','Implantación','PA5 GESTIÓN DE SEGURIDAD - S1 PA5 GESTION SEGURIDAD OPERACIONAL','PA5 GESTIÓN DE SEGURIDAD','S1 PA5 GESTION SEGURIDAD OPERACIONAL',6.0,18),
  ('27001','Implantación','PA5 GESTIÓN DE SEGURIDAD - S2 PA5 GESTION SEGURIDAD LÓGICA','PA5 GESTIÓN DE SEGURIDAD','S2 PA5 GESTION SEGURIDAD LÓGICA',3.0,19),
  ('27001','Implantación','PA5 GESTIÓN DE SEGURIDAD - S3 PA5 GESTION CONTINUIDAD DE NEGOCIO','PA5 GESTIÓN DE SEGURIDAD','S3 PA5 GESTION CONTINUIDAD DE NEGOCIO',6.0,20),
  ('27001','Implantación','PA5 GESTIÓN DE SEGURIDAD - S4 PA5 GESTIÓN SEGURIDAD DATOS','PA5 GESTIÓN DE SEGURIDAD','S4 PA5 GESTIÓN SEGURIDAD DATOS',3.0,21),
  ('27001','Implantación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',1.2,22),
  ('27001','Implantación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',2.4,23),
  ('45001','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',3.0,1),
  ('45001','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',12.0,2),
  ('45001','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',9.0,3),
  ('45001','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',6.0,4),
  ('45001','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',4.0,5),
  ('45001','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',4.0,6),
  ('45001','Apoyo','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('45001','Apoyo','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',6.0,8),
  ('45001','Apoyo','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',4.0,9),
  ('45001','Apoyo','PA1 GESTIÓN DE PERSONAS - S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD','PA1 GESTIÓN DE PERSONAS','S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD',6.0,10),
  ('45001','Apoyo','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.0,11),
  ('45001','Apoyo','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',6.0,12),
  ('45001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',10.0,13),
  ('45001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',10.0,14),
  ('45001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',4.0,15),
  ('45001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',10.0,16),
  ('45001','Apoyo','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',2.0,17),
  ('45001','Apoyo','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',2.0,18),
  ('45001','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',3.0,1),
  ('45001','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',12.0,2),
  ('45001','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',9.0,3),
  ('45001','Relación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',6.0,4),
  ('45001','Relación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',4.0,5),
  ('45001','Relación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',4.0,6),
  ('45001','Relación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('45001','Relación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',6.0,8),
  ('45001','Relación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',4.0,9),
  ('45001','Relación','PA1 GESTIÓN DE PERSONAS - S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD','PA1 GESTIÓN DE PERSONAS','S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD',6.0,10),
  ('45001','Relación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.0,11),
  ('45001','Relación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',6.0,12),
  ('45001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',10.0,13),
  ('45001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',10.0,14),
  ('45001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',4.0,15),
  ('45001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',10.0,16),
  ('45001','Relación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',2.0,17),
  ('45001','Relación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',2.0,18),
  ('45001','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',3.0,1),
  ('45001','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',12.0,2),
  ('45001','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',3.0,3),
  ('45001','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',6.0,4),
  ('45001','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',8.0,5),
  ('45001','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',6.0,6),
  ('45001','Implicación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('45001','Implicación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',6.0,8),
  ('45001','Implicación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',9.0,9),
  ('45001','Implicación','PA1 GESTIÓN DE PERSONAS - S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD','PA1 GESTIÓN DE PERSONAS','S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD',8.0,10),
  ('45001','Implicación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.0,11),
  ('45001','Implicación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',6.0,12),
  ('45001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',12.0,13),
  ('45001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',10.0,14),
  ('45001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',4.0,15),
  ('45001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',15.0,16),
  ('45001','Implicación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',2.0,17),
  ('45001','Implicación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',2.0,18),
  ('45001','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',12.0,1),
  ('45001','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',12.0,2),
  ('45001','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',12.0,3),
  ('45001','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',6.0,4),
  ('45001','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',10.0,5),
  ('45001','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',6.0,6),
  ('45001','Compromiso','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',6.0,7),
  ('45001','Compromiso','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',6.0,8),
  ('45001','Compromiso','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',9.0,9),
  ('45001','Compromiso','PA1 GESTIÓN DE PERSONAS - S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD','PA1 GESTIÓN DE PERSONAS','S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD',10.0,10),
  ('45001','Compromiso','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.0,11),
  ('45001','Compromiso','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',6.0,12),
  ('45001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',12.0,13),
  ('45001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',10.0,14),
  ('45001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',4.0,15),
  ('45001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',20.0,16),
  ('45001','Compromiso','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',4.0,17),
  ('45001','Compromiso','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',4.0,18),
  ('45001','Compromiso','PA7 GESTIÓN ECONÓMICA ADMINISTRATIVA - S1 PA7 GESTIÓN ECONÓMICA','PA7 GESTIÓN ECONÓMICA ADMINISTRATIVA','S1 PA7 GESTIÓN ECONÓMICA',2.0,19),
  ('45001','Compromiso','PA7 GESTIÓN ECONÓMICA ADMINISTRATIVA - S1PA7 GESTIÓN ADMINISTRATIVA','PA7 GESTIÓN ECONÓMICA ADMINISTRATIVA','S1PA7 GESTIÓN ADMINISTRATIVA',2.0,20),
  ('45001','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',1.8,1),
  ('45001','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',7.2,2),
  ('45001','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',1.8,3),
  ('45001','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',3.6,4),
  ('45001','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',4.8,5),
  ('45001','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',3.6,6),
  ('45001','Implantación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',2.4,7),
  ('45001','Implantación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.6,8),
  ('45001','Implantación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',5.4,9),
  ('45001','Implantación','PA1 GESTIÓN DE PERSONAS - S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD','PA1 GESTIÓN DE PERSONAS','S3 PA1 GESTIÓN REL LABORAL, SEGURIDAD Y SALUD',4.8,10),
  ('45001','Implantación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',1.2,11),
  ('45001','Implantación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',3.6,12),
  ('45001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',7.2,13),
  ('45001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',6.0,14),
  ('45001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',2.4,15),
  ('45001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',9.0,16),
  ('45001','Implantación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',1.2,17),
  ('45001','Implantación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',1.2,18),
  ('9004','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',3.0,1),
  ('9004','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',3.0,2),
  ('9004','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',3.0,3),
  ('9004','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',2.0,4),
  ('9004','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',2.0,5),
  ('9004','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',4.0,6),
  ('9004','Apoyo','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('9004','Apoyo','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.0,8),
  ('9004','Apoyo','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',1.0,9),
  ('9004','Apoyo','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.0,10),
  ('9004','Apoyo','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',2.0,11),
  ('9004','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',2.0,12),
  ('9004','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',2.0,13),
  ('9004','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',2.0,14),
  ('9004','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',1.0,15),
  ('9004','Apoyo','PE6 GESTIÓN DEL ÉXITO SOSTENIDO - S1 PE6 ESTRATEGIA, MISIÓN, VISIÓN Y VALORES (5)','PE6 GESTIÓN DEL ÉXITO SOSTENIDO','S1 PE6 ESTRATEGIA, MISIÓN, VISIÓN Y VALORES (5)',4.8,16),
  ('9004','Apoyo','PE6 GESTIÓN DEL ÉXITO SOSTENIDO - S2 PE6 ENTORNO E IDENTIDAD DE LA ORGANIZACIÓN (4)','PE6 GESTIÓN DEL ÉXITO SOSTENIDO','S2 PE6 ENTORNO E IDENTIDAD DE LA ORGANIZACIÓN (4)',3.2,17),
  ('9004','Apoyo','PE7 AUTOEVALUACIÓN Y MADUREZ - S1 PE7 AUTOEVALUACIÓN DE LA MADUREZ (Anexo A)','PE7 AUTOEVALUACIÓN Y MADUREZ','S1 PE7 AUTOEVALUACIÓN DE LA MADUREZ (Anexo A)',4.8,18),
  ('9004','Apoyo','PE7 AUTOEVALUACIÓN Y MADUREZ - S2 PE7 IDENTIFICACIÓN DE OPORTUNIDADES Y PRIORIZACIÓN (10)','PE7 AUTOEVALUACIÓN Y MADUREZ','S2 PE7 IDENTIFICACIÓN DE OPORTUNIDADES Y PRIORIZACIÓN (10)',3.2,19),
  ('9004','Apoyo','PA14 GESTIÓN DE RECURSOS (9004) - S1 PA14 RECURSOS FINANCIEROS, CONOCIMIENTO Y TECNOLOGÍA (7)','PA14 GESTIÓN DE RECURSOS (9004)','S1 PA14 RECURSOS FINANCIEROS, CONOCIMIENTO Y TECNOLOGÍA (7)',4.0,20),
  ('9004','Apoyo','PA15 GESTIÓN DE PARTES INTERESADAS - S1 PA15 NECESIDADES Y EXPECTATIVAS DE LAS PARTES INTERESADAS (4.2)','PA15 GESTIÓN DE PARTES INTERESADAS','S1 PA15 NECESIDADES Y EXPECTATIVAS DE LAS PARTES INTERESADAS (4.2)',3.2,21),
  ('9004','Apoyo','PI4 INNOVACIÓN, APRENDIZAJE Y MEJORA - S1 PI4 APRENDIZAJE, INNOVACIÓN Y MEJORA SOSTENIDA (9-10)','PI4 INNOVACIÓN, APRENDIZAJE Y MEJORA','S1 PI4 APRENDIZAJE, INNOVACIÓN Y MEJORA SOSTENIDA (9-10)',4.8,22),
  ('9004','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',3.0,1),
  ('9004','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',3.0,2),
  ('9004','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',3.0,3),
  ('9004','Relación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',2.0,4),
  ('9004','Relación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',2.0,5),
  ('9004','Relación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',4.0,6),
  ('9004','Relación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('9004','Relación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.0,8),
  ('9004','Relación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',1.0,9),
  ('9004','Relación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.0,10),
  ('9004','Relación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',2.0,11),
  ('9004','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',2.0,12),
  ('9004','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',2.0,13),
  ('9004','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',2.0,14),
  ('9004','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',1.0,15),
  ('9004','Relación','PE6 GESTIÓN DEL ÉXITO SOSTENIDO - S1 PE6 ESTRATEGIA, MISIÓN, VISIÓN Y VALORES (5)','PE6 GESTIÓN DEL ÉXITO SOSTENIDO','S1 PE6 ESTRATEGIA, MISIÓN, VISIÓN Y VALORES (5)',6.0,16),
  ('9004','Relación','PE6 GESTIÓN DEL ÉXITO SOSTENIDO - S2 PE6 ENTORNO E IDENTIDAD DE LA ORGANIZACIÓN (4)','PE6 GESTIÓN DEL ÉXITO SOSTENIDO','S2 PE6 ENTORNO E IDENTIDAD DE LA ORGANIZACIÓN (4)',4.0,17),
  ('9004','Relación','PE7 AUTOEVALUACIÓN Y MADUREZ - S1 PE7 AUTOEVALUACIÓN DE LA MADUREZ (Anexo A)','PE7 AUTOEVALUACIÓN Y MADUREZ','S1 PE7 AUTOEVALUACIÓN DE LA MADUREZ (Anexo A)',6.0,18),
  ('9004','Relación','PE7 AUTOEVALUACIÓN Y MADUREZ - S2 PE7 IDENTIFICACIÓN DE OPORTUNIDADES Y PRIORIZACIÓN (10)','PE7 AUTOEVALUACIÓN Y MADUREZ','S2 PE7 IDENTIFICACIÓN DE OPORTUNIDADES Y PRIORIZACIÓN (10)',4.0,19),
  ('9004','Relación','PA14 GESTIÓN DE RECURSOS (9004) - S1 PA14 RECURSOS FINANCIEROS, CONOCIMIENTO Y TECNOLOGÍA (7)','PA14 GESTIÓN DE RECURSOS (9004)','S1 PA14 RECURSOS FINANCIEROS, CONOCIMIENTO Y TECNOLOGÍA (7)',5.0,20),
  ('9004','Relación','PA15 GESTIÓN DE PARTES INTERESADAS - S1 PA15 NECESIDADES Y EXPECTATIVAS DE LAS PARTES INTERESADAS (4.2)','PA15 GESTIÓN DE PARTES INTERESADAS','S1 PA15 NECESIDADES Y EXPECTATIVAS DE LAS PARTES INTERESADAS (4.2)',4.0,21),
  ('9004','Relación','PI4 INNOVACIÓN, APRENDIZAJE Y MEJORA - S1 PI4 APRENDIZAJE, INNOVACIÓN Y MEJORA SOSTENIDA (9-10)','PI4 INNOVACIÓN, APRENDIZAJE Y MEJORA','S1 PI4 APRENDIZAJE, INNOVACIÓN Y MEJORA SOSTENIDA (9-10)',6.0,22),
  ('9004','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',3.0,1),
  ('9004','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',3.0,2),
  ('9004','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',3.0,3),
  ('9004','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',2.0,4),
  ('9004','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',2.0,5),
  ('9004','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',2.0,6),
  ('9004','Implicación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('9004','Implicación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.0,8),
  ('9004','Implicación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',2.0,9),
  ('9004','Implicación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.0,10),
  ('9004','Implicación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',2.0,11),
  ('9004','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',2.0,12),
  ('9004','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',2.0,13),
  ('9004','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',2.0,14),
  ('9004','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',1.0,15),
  ('9004','Implicación','PE6 GESTIÓN DEL ÉXITO SOSTENIDO - S1 PE6 ESTRATEGIA, MISIÓN, VISIÓN Y VALORES (5)','PE6 GESTIÓN DEL ÉXITO SOSTENIDO','S1 PE6 ESTRATEGIA, MISIÓN, VISIÓN Y VALORES (5)',6.6,16),
  ('9004','Implicación','PE6 GESTIÓN DEL ÉXITO SOSTENIDO - S2 PE6 ENTORNO E IDENTIDAD DE LA ORGANIZACIÓN (4)','PE6 GESTIÓN DEL ÉXITO SOSTENIDO','S2 PE6 ENTORNO E IDENTIDAD DE LA ORGANIZACIÓN (4)',4.4,17),
  ('9004','Implicación','PE7 AUTOEVALUACIÓN Y MADUREZ - S1 PE7 AUTOEVALUACIÓN DE LA MADUREZ (Anexo A)','PE7 AUTOEVALUACIÓN Y MADUREZ','S1 PE7 AUTOEVALUACIÓN DE LA MADUREZ (Anexo A)',6.6,18),
  ('9004','Implicación','PE7 AUTOEVALUACIÓN Y MADUREZ - S2 PE7 IDENTIFICACIÓN DE OPORTUNIDADES Y PRIORIZACIÓN (10)','PE7 AUTOEVALUACIÓN Y MADUREZ','S2 PE7 IDENTIFICACIÓN DE OPORTUNIDADES Y PRIORIZACIÓN (10)',4.4,19),
  ('9004','Implicación','PA14 GESTIÓN DE RECURSOS (9004) - S1 PA14 RECURSOS FINANCIEROS, CONOCIMIENTO Y TECNOLOGÍA (7)','PA14 GESTIÓN DE RECURSOS (9004)','S1 PA14 RECURSOS FINANCIEROS, CONOCIMIENTO Y TECNOLOGÍA (7)',5.5,20),
  ('9004','Implicación','PA15 GESTIÓN DE PARTES INTERESADAS - S1 PA15 NECESIDADES Y EXPECTATIVAS DE LAS PARTES INTERESADAS (4.2)','PA15 GESTIÓN DE PARTES INTERESADAS','S1 PA15 NECESIDADES Y EXPECTATIVAS DE LAS PARTES INTERESADAS (4.2)',4.4,21),
  ('9004','Implicación','PI4 INNOVACIÓN, APRENDIZAJE Y MEJORA - S1 PI4 APRENDIZAJE, INNOVACIÓN Y MEJORA SOSTENIDA (9-10)','PI4 INNOVACIÓN, APRENDIZAJE Y MEJORA','S1 PI4 APRENDIZAJE, INNOVACIÓN Y MEJORA SOSTENIDA (9-10)',6.6,22),
  ('9004','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',3.0,1),
  ('9004','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',3.0,2),
  ('9004','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',3.0,3),
  ('9004','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',2.0,4),
  ('9004','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',2.0,5),
  ('9004','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',2.0,6),
  ('9004','Compromiso','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',6.0,7),
  ('9004','Compromiso','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.0,8),
  ('9004','Compromiso','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',2.0,9),
  ('9004','Compromiso','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.0,10),
  ('9004','Compromiso','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',2.0,11),
  ('9004','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',2.0,12),
  ('9004','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',2.0,13),
  ('9004','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',2.0,14),
  ('9004','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',1.0,15),
  ('9004','Compromiso','PE6 GESTIÓN DEL ÉXITO SOSTENIDO - S1 PE6 ESTRATEGIA, MISIÓN, VISIÓN Y VALORES (5)','PE6 GESTIÓN DEL ÉXITO SOSTENIDO','S1 PE6 ESTRATEGIA, MISIÓN, VISIÓN Y VALORES (5)',7.2,16),
  ('9004','Compromiso','PE6 GESTIÓN DEL ÉXITO SOSTENIDO - S2 PE6 ENTORNO E IDENTIDAD DE LA ORGANIZACIÓN (4)','PE6 GESTIÓN DEL ÉXITO SOSTENIDO','S2 PE6 ENTORNO E IDENTIDAD DE LA ORGANIZACIÓN (4)',4.8,17),
  ('9004','Compromiso','PE7 AUTOEVALUACIÓN Y MADUREZ - S1 PE7 AUTOEVALUACIÓN DE LA MADUREZ (Anexo A)','PE7 AUTOEVALUACIÓN Y MADUREZ','S1 PE7 AUTOEVALUACIÓN DE LA MADUREZ (Anexo A)',7.2,18),
  ('9004','Compromiso','PE7 AUTOEVALUACIÓN Y MADUREZ - S2 PE7 IDENTIFICACIÓN DE OPORTUNIDADES Y PRIORIZACIÓN (10)','PE7 AUTOEVALUACIÓN Y MADUREZ','S2 PE7 IDENTIFICACIÓN DE OPORTUNIDADES Y PRIORIZACIÓN (10)',4.8,19),
  ('9004','Compromiso','PA14 GESTIÓN DE RECURSOS (9004) - S1 PA14 RECURSOS FINANCIEROS, CONOCIMIENTO Y TECNOLOGÍA (7)','PA14 GESTIÓN DE RECURSOS (9004)','S1 PA14 RECURSOS FINANCIEROS, CONOCIMIENTO Y TECNOLOGÍA (7)',6.0,20),
  ('9004','Compromiso','PA15 GESTIÓN DE PARTES INTERESADAS - S1 PA15 NECESIDADES Y EXPECTATIVAS DE LAS PARTES INTERESADAS (4.2)','PA15 GESTIÓN DE PARTES INTERESADAS','S1 PA15 NECESIDADES Y EXPECTATIVAS DE LAS PARTES INTERESADAS (4.2)',4.8,21),
  ('9004','Compromiso','PI4 INNOVACIÓN, APRENDIZAJE Y MEJORA - S1 PI4 APRENDIZAJE, INNOVACIÓN Y MEJORA SOSTENIDA (9-10)','PI4 INNOVACIÓN, APRENDIZAJE Y MEJORA','S1 PI4 APRENDIZAJE, INNOVACIÓN Y MEJORA SOSTENIDA (9-10)',7.2,22),
  ('9004','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',1.8,1),
  ('9004','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',1.8,2),
  ('9004','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',1.8,3),
  ('9004','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',1.2,4),
  ('9004','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',1.2,5),
  ('9004','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',1.2,6),
  ('9004','Implantación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',2.4,7),
  ('9004','Implantación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',1.8,8),
  ('9004','Implantación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',1.2,9),
  ('9004','Implantación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',1.2,10),
  ('9004','Implantación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',1.2,11),
  ('9004','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',1.2,12),
  ('9004','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',1.2,13),
  ('9004','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',1.2,14),
  ('9004','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',0.6,15),
  ('9004','Implantación','PE6 GESTIÓN DEL ÉXITO SOSTENIDO - S1 PE6 ESTRATEGIA, MISIÓN, VISIÓN Y VALORES (5)','PE6 GESTIÓN DEL ÉXITO SOSTENIDO','S1 PE6 ESTRATEGIA, MISIÓN, VISIÓN Y VALORES (5)',3.96,16),
  ('9004','Implantación','PE6 GESTIÓN DEL ÉXITO SOSTENIDO - S2 PE6 ENTORNO E IDENTIDAD DE LA ORGANIZACIÓN (4)','PE6 GESTIÓN DEL ÉXITO SOSTENIDO','S2 PE6 ENTORNO E IDENTIDAD DE LA ORGANIZACIÓN (4)',2.64,17),
  ('9004','Implantación','PE7 AUTOEVALUACIÓN Y MADUREZ - S1 PE7 AUTOEVALUACIÓN DE LA MADUREZ (Anexo A)','PE7 AUTOEVALUACIÓN Y MADUREZ','S1 PE7 AUTOEVALUACIÓN DE LA MADUREZ (Anexo A)',3.96,18),
  ('9004','Implantación','PE7 AUTOEVALUACIÓN Y MADUREZ - S2 PE7 IDENTIFICACIÓN DE OPORTUNIDADES Y PRIORIZACIÓN (10)','PE7 AUTOEVALUACIÓN Y MADUREZ','S2 PE7 IDENTIFICACIÓN DE OPORTUNIDADES Y PRIORIZACIÓN (10)',2.64,19),
  ('9004','Implantación','PA14 GESTIÓN DE RECURSOS (9004) - S1 PA14 RECURSOS FINANCIEROS, CONOCIMIENTO Y TECNOLOGÍA (7)','PA14 GESTIÓN DE RECURSOS (9004)','S1 PA14 RECURSOS FINANCIEROS, CONOCIMIENTO Y TECNOLOGÍA (7)',3.3,20),
  ('9004','Implantación','PA15 GESTIÓN DE PARTES INTERESADAS - S1 PA15 NECESIDADES Y EXPECTATIVAS DE LAS PARTES INTERESADAS (4.2)','PA15 GESTIÓN DE PARTES INTERESADAS','S1 PA15 NECESIDADES Y EXPECTATIVAS DE LAS PARTES INTERESADAS (4.2)',2.64,21),
  ('9004','Implantación','PI4 INNOVACIÓN, APRENDIZAJE Y MEJORA - S1 PI4 APRENDIZAJE, INNOVACIÓN Y MEJORA SOSTENIDA (9-10)','PI4 INNOVACIÓN, APRENDIZAJE Y MEJORA','S1 PI4 APRENDIZAJE, INNOVACIÓN Y MEJORA SOSTENIDA (9-10)',3.96,22),
  ('21001','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',3.0,1),
  ('21001','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',3.0,2),
  ('21001','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',3.0,3),
  ('21001','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',2.0,4),
  ('21001','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',2.0,5),
  ('21001','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',4.0,6),
  ('21001','Apoyo','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('21001','Apoyo','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.0,8),
  ('21001','Apoyo','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',1.0,9),
  ('21001','Apoyo','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.0,10),
  ('21001','Apoyo','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',2.0,11),
  ('21001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',2.0,12),
  ('21001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',2.0,13),
  ('21001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',2.0,14),
  ('21001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',1.0,15),
  ('21001','Apoyo','PO1 PROCESOS EDUCATIVOS - S1 PO1 DISEÑO Y DESARROLLO DE PRODUCTOS Y SERVICIOS EDUCATIVOS (8.3)','PO1 PROCESOS EDUCATIVOS','S1 PO1 DISEÑO Y DESARROLLO DE PRODUCTOS Y SERVICIOS EDUCATIVOS (8.3)',6.4,16),
  ('21001','Apoyo','PO1 PROCESOS EDUCATIVOS - S2 PO1 PRESTACIÓN DEL SERVICIO EDUCATIVO Y ENTREGA (8.5)','PO1 PROCESOS EDUCATIVOS','S2 PO1 PRESTACIÓN DEL SERVICIO EDUCATIVO Y ENTREGA (8.5)',4.8,17),
  ('21001','Apoyo','PO1 PROCESOS EDUCATIVOS - S3 PO1 EVALUACIÓN DEL APRENDIZAJE DE LOS ESTUDIANTES (8.6)','PO1 PROCESOS EDUCATIVOS','S3 PO1 EVALUACIÓN DEL APRENDIZAJE DE LOS ESTUDIANTES (8.6)',4.0,18),
  ('21001','Apoyo','PA16 NECESIDADES DE EDUCANDOS Y BENEFICIARIOS - S1 PA16 REQUISITOS DE EDUCANDOS Y OTROS BENEFICIARIOS (8.2)','PA16 NECESIDADES DE EDUCANDOS Y BENEFICIARIOS','S1 PA16 REQUISITOS DE EDUCANDOS Y OTROS BENEFICIARIOS (8.2)',4.0,19),
  ('21001','Apoyo','PA17 ACCESIBILIDAD Y EQUIDAD - S1 PA17 ACCESIBILIDAD, EQUIDAD Y NECESIDADES ESPECIALES (4.4)','PA17 ACCESIBILIDAD Y EQUIDAD','S1 PA17 ACCESIBILIDAD, EQUIDAD Y NECESIDADES ESPECIALES (4.4)',3.2,20),
  ('21001','Apoyo','PA18 PROTECCIÓN DE DATOS DE EDUCANDOS - S1 PA18 PRIVACIDAD Y PROTECCIÓN DE DATOS DE EDUCANDOS (4.4)','PA18 PROTECCIÓN DE DATOS DE EDUCANDOS','S1 PA18 PRIVACIDAD Y PROTECCIÓN DE DATOS DE EDUCANDOS (4.4)',3.2,21),
  ('21001','Apoyo','PE8 RESPONSABILIDAD SOCIAL EDUCATIVA - S1 PE8 RESPONSABILIDAD SOCIAL Y ÉTICA DE LA ORG EDUCATIVA (4.4)','PE8 RESPONSABILIDAD SOCIAL EDUCATIVA','S1 PE8 RESPONSABILIDAD SOCIAL Y ÉTICA DE LA ORG EDUCATIVA (4.4)',3.2,22),
  ('21001','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',3.0,1),
  ('21001','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',3.0,2),
  ('21001','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',3.0,3),
  ('21001','Relación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',2.0,4),
  ('21001','Relación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',2.0,5),
  ('21001','Relación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',4.0,6),
  ('21001','Relación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('21001','Relación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.0,8),
  ('21001','Relación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',1.0,9),
  ('21001','Relación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.0,10),
  ('21001','Relación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',2.0,11),
  ('21001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',2.0,12),
  ('21001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',2.0,13),
  ('21001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',2.0,14),
  ('21001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',1.0,15),
  ('21001','Relación','PO1 PROCESOS EDUCATIVOS - S1 PO1 DISEÑO Y DESARROLLO DE PRODUCTOS Y SERVICIOS EDUCATIVOS (8.3)','PO1 PROCESOS EDUCATIVOS','S1 PO1 DISEÑO Y DESARROLLO DE PRODUCTOS Y SERVICIOS EDUCATIVOS (8.3)',8.0,16),
  ('21001','Relación','PO1 PROCESOS EDUCATIVOS - S2 PO1 PRESTACIÓN DEL SERVICIO EDUCATIVO Y ENTREGA (8.5)','PO1 PROCESOS EDUCATIVOS','S2 PO1 PRESTACIÓN DEL SERVICIO EDUCATIVO Y ENTREGA (8.5)',6.0,17),
  ('21001','Relación','PO1 PROCESOS EDUCATIVOS - S3 PO1 EVALUACIÓN DEL APRENDIZAJE DE LOS ESTUDIANTES (8.6)','PO1 PROCESOS EDUCATIVOS','S3 PO1 EVALUACIÓN DEL APRENDIZAJE DE LOS ESTUDIANTES (8.6)',5.0,18),
  ('21001','Relación','PA16 NECESIDADES DE EDUCANDOS Y BENEFICIARIOS - S1 PA16 REQUISITOS DE EDUCANDOS Y OTROS BENEFICIARIOS (8.2)','PA16 NECESIDADES DE EDUCANDOS Y BENEFICIARIOS','S1 PA16 REQUISITOS DE EDUCANDOS Y OTROS BENEFICIARIOS (8.2)',5.0,19),
  ('21001','Relación','PA17 ACCESIBILIDAD Y EQUIDAD - S1 PA17 ACCESIBILIDAD, EQUIDAD Y NECESIDADES ESPECIALES (4.4)','PA17 ACCESIBILIDAD Y EQUIDAD','S1 PA17 ACCESIBILIDAD, EQUIDAD Y NECESIDADES ESPECIALES (4.4)',4.0,20),
  ('21001','Relación','PA18 PROTECCIÓN DE DATOS DE EDUCANDOS - S1 PA18 PRIVACIDAD Y PROTECCIÓN DE DATOS DE EDUCANDOS (4.4)','PA18 PROTECCIÓN DE DATOS DE EDUCANDOS','S1 PA18 PRIVACIDAD Y PROTECCIÓN DE DATOS DE EDUCANDOS (4.4)',4.0,21),
  ('21001','Relación','PE8 RESPONSABILIDAD SOCIAL EDUCATIVA - S1 PE8 RESPONSABILIDAD SOCIAL Y ÉTICA DE LA ORG EDUCATIVA (4.4)','PE8 RESPONSABILIDAD SOCIAL EDUCATIVA','S1 PE8 RESPONSABILIDAD SOCIAL Y ÉTICA DE LA ORG EDUCATIVA (4.4)',4.0,22),
  ('21001','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',3.0,1),
  ('21001','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',3.0,2),
  ('21001','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',3.0,3),
  ('21001','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',2.0,4),
  ('21001','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',2.0,5),
  ('21001','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',2.0,6),
  ('21001','Implicación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('21001','Implicación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.0,8),
  ('21001','Implicación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',2.0,9),
  ('21001','Implicación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.0,10),
  ('21001','Implicación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',2.0,11),
  ('21001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',2.0,12),
  ('21001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',2.0,13),
  ('21001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',2.0,14),
  ('21001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',1.0,15),
  ('21001','Implicación','PO1 PROCESOS EDUCATIVOS - S1 PO1 DISEÑO Y DESARROLLO DE PRODUCTOS Y SERVICIOS EDUCATIVOS (8.3)','PO1 PROCESOS EDUCATIVOS','S1 PO1 DISEÑO Y DESARROLLO DE PRODUCTOS Y SERVICIOS EDUCATIVOS (8.3)',8.8,16),
  ('21001','Implicación','PO1 PROCESOS EDUCATIVOS - S2 PO1 PRESTACIÓN DEL SERVICIO EDUCATIVO Y ENTREGA (8.5)','PO1 PROCESOS EDUCATIVOS','S2 PO1 PRESTACIÓN DEL SERVICIO EDUCATIVO Y ENTREGA (8.5)',6.6,17),
  ('21001','Implicación','PO1 PROCESOS EDUCATIVOS - S3 PO1 EVALUACIÓN DEL APRENDIZAJE DE LOS ESTUDIANTES (8.6)','PO1 PROCESOS EDUCATIVOS','S3 PO1 EVALUACIÓN DEL APRENDIZAJE DE LOS ESTUDIANTES (8.6)',5.5,18),
  ('21001','Implicación','PA16 NECESIDADES DE EDUCANDOS Y BENEFICIARIOS - S1 PA16 REQUISITOS DE EDUCANDOS Y OTROS BENEFICIARIOS (8.2)','PA16 NECESIDADES DE EDUCANDOS Y BENEFICIARIOS','S1 PA16 REQUISITOS DE EDUCANDOS Y OTROS BENEFICIARIOS (8.2)',5.5,19),
  ('21001','Implicación','PA17 ACCESIBILIDAD Y EQUIDAD - S1 PA17 ACCESIBILIDAD, EQUIDAD Y NECESIDADES ESPECIALES (4.4)','PA17 ACCESIBILIDAD Y EQUIDAD','S1 PA17 ACCESIBILIDAD, EQUIDAD Y NECESIDADES ESPECIALES (4.4)',4.4,20),
  ('21001','Implicación','PA18 PROTECCIÓN DE DATOS DE EDUCANDOS - S1 PA18 PRIVACIDAD Y PROTECCIÓN DE DATOS DE EDUCANDOS (4.4)','PA18 PROTECCIÓN DE DATOS DE EDUCANDOS','S1 PA18 PRIVACIDAD Y PROTECCIÓN DE DATOS DE EDUCANDOS (4.4)',4.4,21),
  ('21001','Implicación','PE8 RESPONSABILIDAD SOCIAL EDUCATIVA - S1 PE8 RESPONSABILIDAD SOCIAL Y ÉTICA DE LA ORG EDUCATIVA (4.4)','PE8 RESPONSABILIDAD SOCIAL EDUCATIVA','S1 PE8 RESPONSABILIDAD SOCIAL Y ÉTICA DE LA ORG EDUCATIVA (4.4)',4.4,22),
  ('21001','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',3.0,1),
  ('21001','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',3.0,2),
  ('21001','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',3.0,3),
  ('21001','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',2.0,4),
  ('21001','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',2.0,5),
  ('21001','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',2.0,6),
  ('21001','Compromiso','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',6.0,7),
  ('21001','Compromiso','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.0,8),
  ('21001','Compromiso','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',2.0,9),
  ('21001','Compromiso','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.0,10),
  ('21001','Compromiso','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',2.0,11),
  ('21001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',2.0,12),
  ('21001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',2.0,13),
  ('21001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',2.0,14),
  ('21001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',1.0,15),
  ('21001','Compromiso','PO1 PROCESOS EDUCATIVOS - S1 PO1 DISEÑO Y DESARROLLO DE PRODUCTOS Y SERVICIOS EDUCATIVOS (8.3)','PO1 PROCESOS EDUCATIVOS','S1 PO1 DISEÑO Y DESARROLLO DE PRODUCTOS Y SERVICIOS EDUCATIVOS (8.3)',9.6,16),
  ('21001','Compromiso','PO1 PROCESOS EDUCATIVOS - S2 PO1 PRESTACIÓN DEL SERVICIO EDUCATIVO Y ENTREGA (8.5)','PO1 PROCESOS EDUCATIVOS','S2 PO1 PRESTACIÓN DEL SERVICIO EDUCATIVO Y ENTREGA (8.5)',7.2,17),
  ('21001','Compromiso','PO1 PROCESOS EDUCATIVOS - S3 PO1 EVALUACIÓN DEL APRENDIZAJE DE LOS ESTUDIANTES (8.6)','PO1 PROCESOS EDUCATIVOS','S3 PO1 EVALUACIÓN DEL APRENDIZAJE DE LOS ESTUDIANTES (8.6)',6.0,18),
  ('21001','Compromiso','PA16 NECESIDADES DE EDUCANDOS Y BENEFICIARIOS - S1 PA16 REQUISITOS DE EDUCANDOS Y OTROS BENEFICIARIOS (8.2)','PA16 NECESIDADES DE EDUCANDOS Y BENEFICIARIOS','S1 PA16 REQUISITOS DE EDUCANDOS Y OTROS BENEFICIARIOS (8.2)',6.0,19),
  ('21001','Compromiso','PA17 ACCESIBILIDAD Y EQUIDAD - S1 PA17 ACCESIBILIDAD, EQUIDAD Y NECESIDADES ESPECIALES (4.4)','PA17 ACCESIBILIDAD Y EQUIDAD','S1 PA17 ACCESIBILIDAD, EQUIDAD Y NECESIDADES ESPECIALES (4.4)',4.8,20),
  ('21001','Compromiso','PA18 PROTECCIÓN DE DATOS DE EDUCANDOS - S1 PA18 PRIVACIDAD Y PROTECCIÓN DE DATOS DE EDUCANDOS (4.4)','PA18 PROTECCIÓN DE DATOS DE EDUCANDOS','S1 PA18 PRIVACIDAD Y PROTECCIÓN DE DATOS DE EDUCANDOS (4.4)',4.8,21),
  ('21001','Compromiso','PE8 RESPONSABILIDAD SOCIAL EDUCATIVA - S1 PE8 RESPONSABILIDAD SOCIAL Y ÉTICA DE LA ORG EDUCATIVA (4.4)','PE8 RESPONSABILIDAD SOCIAL EDUCATIVA','S1 PE8 RESPONSABILIDAD SOCIAL Y ÉTICA DE LA ORG EDUCATIVA (4.4)',4.8,22),
  ('21001','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',1.8,1),
  ('21001','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',1.8,2),
  ('21001','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',1.8,3),
  ('21001','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',1.2,4),
  ('21001','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',1.2,5),
  ('21001','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',1.2,6),
  ('21001','Implantación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',2.4,7),
  ('21001','Implantación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',1.8,8),
  ('21001','Implantación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',1.2,9),
  ('21001','Implantación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',1.2,10),
  ('21001','Implantación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',1.2,11),
  ('21001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',1.2,12),
  ('21001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',1.2,13),
  ('21001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',1.2,14),
  ('21001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',0.6,15),
  ('21001','Implantación','PO1 PROCESOS EDUCATIVOS - S1 PO1 DISEÑO Y DESARROLLO DE PRODUCTOS Y SERVICIOS EDUCATIVOS (8.3)','PO1 PROCESOS EDUCATIVOS','S1 PO1 DISEÑO Y DESARROLLO DE PRODUCTOS Y SERVICIOS EDUCATIVOS (8.3)',5.28,16),
  ('21001','Implantación','PO1 PROCESOS EDUCATIVOS - S2 PO1 PRESTACIÓN DEL SERVICIO EDUCATIVO Y ENTREGA (8.5)','PO1 PROCESOS EDUCATIVOS','S2 PO1 PRESTACIÓN DEL SERVICIO EDUCATIVO Y ENTREGA (8.5)',3.96,17),
  ('21001','Implantación','PO1 PROCESOS EDUCATIVOS - S3 PO1 EVALUACIÓN DEL APRENDIZAJE DE LOS ESTUDIANTES (8.6)','PO1 PROCESOS EDUCATIVOS','S3 PO1 EVALUACIÓN DEL APRENDIZAJE DE LOS ESTUDIANTES (8.6)',3.3,18),
  ('21001','Implantación','PA16 NECESIDADES DE EDUCANDOS Y BENEFICIARIOS - S1 PA16 REQUISITOS DE EDUCANDOS Y OTROS BENEFICIARIOS (8.2)','PA16 NECESIDADES DE EDUCANDOS Y BENEFICIARIOS','S1 PA16 REQUISITOS DE EDUCANDOS Y OTROS BENEFICIARIOS (8.2)',3.3,19),
  ('21001','Implantación','PA17 ACCESIBILIDAD Y EQUIDAD - S1 PA17 ACCESIBILIDAD, EQUIDAD Y NECESIDADES ESPECIALES (4.4)','PA17 ACCESIBILIDAD Y EQUIDAD','S1 PA17 ACCESIBILIDAD, EQUIDAD Y NECESIDADES ESPECIALES (4.4)',2.64,20),
  ('21001','Implantación','PA18 PROTECCIÓN DE DATOS DE EDUCANDOS - S1 PA18 PRIVACIDAD Y PROTECCIÓN DE DATOS DE EDUCANDOS (4.4)','PA18 PROTECCIÓN DE DATOS DE EDUCANDOS','S1 PA18 PRIVACIDAD Y PROTECCIÓN DE DATOS DE EDUCANDOS (4.4)',2.64,21),
  ('21001','Implantación','PE8 RESPONSABILIDAD SOCIAL EDUCATIVA - S1 PE8 RESPONSABILIDAD SOCIAL Y ÉTICA DE LA ORG EDUCATIVA (4.4)','PE8 RESPONSABILIDAD SOCIAL EDUCATIVA','S1 PE8 RESPONSABILIDAD SOCIAL Y ÉTICA DE LA ORG EDUCATIVA (4.4)',2.64,22),
  ('42001','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',3.0,1),
  ('42001','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',3.5,2),
  ('42001','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',3.5,3),
  ('42001','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',3.0,4),
  ('42001','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',3.0,5),
  ('42001','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',2.0,6),
  ('42001','Apoyo','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',2.0,7),
  ('42001','Apoyo','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',2.0,8),
  ('42001','Apoyo','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',1.5,9),
  ('42001','Apoyo','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.0,10),
  ('42001','Apoyo','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',2.0,11),
  ('42001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',1.0,12),
  ('42001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',1.0,13),
  ('42001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',1.5,14),
  ('42001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',1.0,15),
  ('42001','Apoyo','PA5 GESTIÓN DE SEGURIDAD - S2 PA5 GESTION SEGURIDAD LÓGICA','PA5 GESTIÓN DE SEGURIDAD','S2 PA5 GESTION SEGURIDAD LÓGICA',1.0,16),
  ('42001','Apoyo','PA5 GESTIÓN DE SEGURIDAD - S4 PA5 GESTIÓN SEGURIDAD DATOS','PA5 GESTIÓN DE SEGURIDAD','S4 PA5 GESTIÓN SEGURIDAD DATOS',1.5,17),
  ('42001','Apoyo','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',1.0,18),
  ('42001','Apoyo','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',1.0,19),
  ('42001','Apoyo','PE5 GESTIÓN DE POLÍTICAS Y GOBERNANZA DE IA - S1 PE5 POLÍTICA DE IA Y ALINEAMIENTO (A.2)','PE5 GESTIÓN DE POLÍTICAS Y GOBERNANZA DE IA','S1 PE5 POLÍTICA DE IA Y ALINEAMIENTO (A.2)',3.5,20),
  ('42001','Apoyo','PE5 GESTIÓN DE POLÍTICAS Y GOBERNANZA DE IA - S2 PE5 EVALUACIÓN DE IMPACTOS DEL SISTEMA DE IA (A.5)','PE5 GESTIÓN DE POLÍTICAS Y GOBERNANZA DE IA','S2 PE5 EVALUACIÓN DE IMPACTOS DEL SISTEMA DE IA (A.5)',4.5,21),
  ('42001','Apoyo','PI3 CICLO DE VIDA DEL SISTEMA DE IA - S1 PI3 OBJETIVOS Y DISEÑO RESPONSABLE (A.6.1)','PI3 CICLO DE VIDA DEL SISTEMA DE IA','S1 PI3 OBJETIVOS Y DISEÑO RESPONSABLE (A.6.1)',3.5,22),
  ('42001','Apoyo','PI3 CICLO DE VIDA DEL SISTEMA DE IA - S2 PI3 REQUISITOS Y ESPECIFICACIÓN (A.6.2.2)','PI3 CICLO DE VIDA DEL SISTEMA DE IA','S2 PI3 REQUISITOS Y ESPECIFICACIÓN (A.6.2.2)',3.5,23),
  ('42001','Apoyo','PI3 CICLO DE VIDA DEL SISTEMA DE IA - S3 PI3 VERIFICACIÓN Y VALIDACIÓN (A.6.2.4)','PI3 CICLO DE VIDA DEL SISTEMA DE IA','S3 PI3 VERIFICACIÓN Y VALIDACIÓN (A.6.2.4)',3.5,24),
  ('42001','Apoyo','PI3 CICLO DE VIDA DEL SISTEMA DE IA - S4 PI3 DESPLIEGUE Y OPERACIÓN/SEGUIMIENTO (A.6.2.5-6)','PI3 CICLO DE VIDA DEL SISTEMA DE IA','S4 PI3 DESPLIEGUE Y OPERACIÓN/SEGUIMIENTO (A.6.2.5-6)',3.5,25),
  ('42001','Apoyo','PA10 GESTIÓN DE DATOS PARA IA - S1 PA10 CALIDAD, PROCEDENCIA Y PREPARACIÓN DE DATOS (A.7)','PA10 GESTIÓN DE DATOS PARA IA','S1 PA10 CALIDAD, PROCEDENCIA Y PREPARACIÓN DE DATOS (A.7)',3.5,26),
  ('42001','Apoyo','PA11 INFORMACIÓN A PARTES INTERESADAS - S1 PA11 DOCUMENTACIÓN A USUARIOS E INCIDENTES (A.8)','PA11 INFORMACIÓN A PARTES INTERESADAS','S1 PA11 DOCUMENTACIÓN A USUARIOS E INCIDENTES (A.8)',2.0,27),
  ('42001','Apoyo','PA12 USO RESPONSABLE DE SISTEMAS DE IA - S1 PA12 PROCESOS Y OBJETIVOS DE USO RESPONSABLE (A.9)','PA12 USO RESPONSABLE DE SISTEMAS DE IA','S1 PA12 PROCESOS Y OBJETIVOS DE USO RESPONSABLE (A.9)',3.0,28),
  ('42001','Apoyo','PA13 RELACIONES CON TERCEROS Y CLIENTES - S1 PA13 RESPONSABILIDADES, PROVEEDORES Y CLIENTES (A.10)','PA13 RELACIONES CON TERCEROS Y CLIENTES','S1 PA13 RESPONSABILIDADES, PROVEEDORES Y CLIENTES (A.10)',2.0,29),
  ('42001','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',4.0,1),
  ('42001','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',5.0,2),
  ('42001','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',5.0,3),
  ('42001','Relación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',4.0,4),
  ('42001','Relación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',4.0,5),
  ('42001','Relación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',3.5,6),
  ('42001','Relación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',3.5,7),
  ('42001','Relación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.5,8),
  ('42001','Relación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',2.5,9),
  ('42001','Relación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',3.5,10),
  ('42001','Relación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',3.5,11),
  ('42001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',1.5,12),
  ('42001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',1.5,13),
  ('42001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',2.5,14),
  ('42001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',1.5,15),
  ('42001','Relación','PA5 GESTIÓN DE SEGURIDAD - S2 PA5 GESTION SEGURIDAD LÓGICA','PA5 GESTIÓN DE SEGURIDAD','S2 PA5 GESTION SEGURIDAD LÓGICA',1.5,16),
  ('42001','Relación','PA5 GESTIÓN DE SEGURIDAD - S4 PA5 GESTIÓN SEGURIDAD DATOS','PA5 GESTIÓN DE SEGURIDAD','S4 PA5 GESTIÓN SEGURIDAD DATOS',2.5,17),
  ('42001','Relación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',1.5,18),
  ('42001','Relación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',1.5,19),
  ('42001','Relación','PE5 GESTIÓN DE POLÍTICAS Y GOBERNANZA DE IA - S1 PE5 POLÍTICA DE IA Y ALINEAMIENTO (A.2)','PE5 GESTIÓN DE POLÍTICAS Y GOBERNANZA DE IA','S1 PE5 POLÍTICA DE IA Y ALINEAMIENTO (A.2)',5.0,20),
  ('42001','Relación','PE5 GESTIÓN DE POLÍTICAS Y GOBERNANZA DE IA - S2 PE5 EVALUACIÓN DE IMPACTOS DEL SISTEMA DE IA (A.5)','PE5 GESTIÓN DE POLÍTICAS Y GOBERNANZA DE IA','S2 PE5 EVALUACIÓN DE IMPACTOS DEL SISTEMA DE IA (A.5)',7.0,21),
  ('42001','Relación','PI3 CICLO DE VIDA DEL SISTEMA DE IA - S1 PI3 OBJETIVOS Y DISEÑO RESPONSABLE (A.6.1)','PI3 CICLO DE VIDA DEL SISTEMA DE IA','S1 PI3 OBJETIVOS Y DISEÑO RESPONSABLE (A.6.1)',5.0,22),
  ('42001','Relación','PI3 CICLO DE VIDA DEL SISTEMA DE IA - S2 PI3 REQUISITOS Y ESPECIFICACIÓN (A.6.2.2)','PI3 CICLO DE VIDA DEL SISTEMA DE IA','S2 PI3 REQUISITOS Y ESPECIFICACIÓN (A.6.2.2)',5.0,23),
  ('42001','Relación','PI3 CICLO DE VIDA DEL SISTEMA DE IA - S3 PI3 VERIFICACIÓN Y VALIDACIÓN (A.6.2.4)','PI3 CICLO DE VIDA DEL SISTEMA DE IA','S3 PI3 VERIFICACIÓN Y VALIDACIÓN (A.6.2.4)',5.0,24),
  ('42001','Relación','PI3 CICLO DE VIDA DEL SISTEMA DE IA - S4 PI3 DESPLIEGUE Y OPERACIÓN/SEGUIMIENTO (A.6.2.5-6)','PI3 CICLO DE VIDA DEL SISTEMA DE IA','S4 PI3 DESPLIEGUE Y OPERACIÓN/SEGUIMIENTO (A.6.2.5-6)',5.0,25),
  ('42001','Relación','PA10 GESTIÓN DE DATOS PARA IA - S1 PA10 CALIDAD, PROCEDENCIA Y PREPARACIÓN DE DATOS (A.7)','PA10 GESTIÓN DE DATOS PARA IA','S1 PA10 CALIDAD, PROCEDENCIA Y PREPARACIÓN DE DATOS (A.7)',5.0,26),
  ('42001','Relación','PA11 INFORMACIÓN A PARTES INTERESADAS - S1 PA11 DOCUMENTACIÓN A USUARIOS E INCIDENTES (A.8)','PA11 INFORMACIÓN A PARTES INTERESADAS','S1 PA11 DOCUMENTACIÓN A USUARIOS E INCIDENTES (A.8)',3.5,27),
  ('42001','Relación','PA12 USO RESPONSABLE DE SISTEMAS DE IA - S1 PA12 PROCESOS Y OBJETIVOS DE USO RESPONSABLE (A.9)','PA12 USO RESPONSABLE DE SISTEMAS DE IA','S1 PA12 PROCESOS Y OBJETIVOS DE USO RESPONSABLE (A.9)',4.0,28),
  ('42001','Relación','PA13 RELACIONES CON TERCEROS Y CLIENTES - S1 PA13 RESPONSABILIDADES, PROVEEDORES Y CLIENTES (A.10)','PA13 RELACIONES CON TERCEROS Y CLIENTES','S1 PA13 RESPONSABILIDADES, PROVEEDORES Y CLIENTES (A.10)',3.5,29),
  ('42001','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',4.5,1),
  ('42001','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',5.5,2),
  ('42001','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',5.5,3),
  ('42001','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',4.5,4),
  ('42001','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',4.5,5),
  ('42001','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',3.5,6),
  ('42001','Implicación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',3.5,7),
  ('42001','Implicación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.5,8),
  ('42001','Implicación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',2.5,9),
  ('42001','Implicación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',3.5,10),
  ('42001','Implicación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',3.5,11),
  ('42001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',2.0,12),
  ('42001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',2.0,13),
  ('42001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',2.5,14),
  ('42001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',2.0,15),
  ('42001','Implicación','PA5 GESTIÓN DE SEGURIDAD - S2 PA5 GESTION SEGURIDAD LÓGICA','PA5 GESTIÓN DE SEGURIDAD','S2 PA5 GESTION SEGURIDAD LÓGICA',2.0,16),
  ('42001','Implicación','PA5 GESTIÓN DE SEGURIDAD - S4 PA5 GESTIÓN SEGURIDAD DATOS','PA5 GESTIÓN DE SEGURIDAD','S4 PA5 GESTIÓN SEGURIDAD DATOS',2.5,17),
  ('42001','Implicación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',2.0,18),
  ('42001','Implicación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',2.0,19),
  ('42001','Implicación','PE5 GESTIÓN DE POLÍTICAS Y GOBERNANZA DE IA - S1 PE5 POLÍTICA DE IA Y ALINEAMIENTO (A.2)','PE5 GESTIÓN DE POLÍTICAS Y GOBERNANZA DE IA','S1 PE5 POLÍTICA DE IA Y ALINEAMIENTO (A.2)',5.5,20),
  ('42001','Implicación','PE5 GESTIÓN DE POLÍTICAS Y GOBERNANZA DE IA - S2 PE5 EVALUACIÓN DE IMPACTOS DEL SISTEMA DE IA (A.5)','PE5 GESTIÓN DE POLÍTICAS Y GOBERNANZA DE IA','S2 PE5 EVALUACIÓN DE IMPACTOS DEL SISTEMA DE IA (A.5)',7.0,21),
  ('42001','Implicación','PI3 CICLO DE VIDA DEL SISTEMA DE IA - S1 PI3 OBJETIVOS Y DISEÑO RESPONSABLE (A.6.1)','PI3 CICLO DE VIDA DEL SISTEMA DE IA','S1 PI3 OBJETIVOS Y DISEÑO RESPONSABLE (A.6.1)',5.5,22),
  ('42001','Implicación','PI3 CICLO DE VIDA DEL SISTEMA DE IA - S2 PI3 REQUISITOS Y ESPECIFICACIÓN (A.6.2.2)','PI3 CICLO DE VIDA DEL SISTEMA DE IA','S2 PI3 REQUISITOS Y ESPECIFICACIÓN (A.6.2.2)',5.5,23),
  ('42001','Implicación','PI3 CICLO DE VIDA DEL SISTEMA DE IA - S3 PI3 VERIFICACIÓN Y VALIDACIÓN (A.6.2.4)','PI3 CICLO DE VIDA DEL SISTEMA DE IA','S3 PI3 VERIFICACIÓN Y VALIDACIÓN (A.6.2.4)',5.5,24),
  ('42001','Implicación','PI3 CICLO DE VIDA DEL SISTEMA DE IA - S4 PI3 DESPLIEGUE Y OPERACIÓN/SEGUIMIENTO (A.6.2.5-6)','PI3 CICLO DE VIDA DEL SISTEMA DE IA','S4 PI3 DESPLIEGUE Y OPERACIÓN/SEGUIMIENTO (A.6.2.5-6)',5.5,25),
  ('42001','Implicación','PA10 GESTIÓN DE DATOS PARA IA - S1 PA10 CALIDAD, PROCEDENCIA Y PREPARACIÓN DE DATOS (A.7)','PA10 GESTIÓN DE DATOS PARA IA','S1 PA10 CALIDAD, PROCEDENCIA Y PREPARACIÓN DE DATOS (A.7)',5.5,26),
  ('42001','Implicación','PA11 INFORMACIÓN A PARTES INTERESADAS - S1 PA11 DOCUMENTACIÓN A USUARIOS E INCIDENTES (A.8)','PA11 INFORMACIÓN A PARTES INTERESADAS','S1 PA11 DOCUMENTACIÓN A USUARIOS E INCIDENTES (A.8)',3.5,27),
  ('42001','Implicación','PA12 USO RESPONSABLE DE SISTEMAS DE IA - S1 PA12 PROCESOS Y OBJETIVOS DE USO RESPONSABLE (A.9)','PA12 USO RESPONSABLE DE SISTEMAS DE IA','S1 PA12 PROCESOS Y OBJETIVOS DE USO RESPONSABLE (A.9)',4.5,28),
  ('42001','Implicación','PA13 RELACIONES CON TERCEROS Y CLIENTES - S1 PA13 RESPONSABILIDADES, PROVEEDORES Y CLIENTES (A.10)','PA13 RELACIONES CON TERCEROS Y CLIENTES','S1 PA13 RESPONSABILIDADES, PROVEEDORES Y CLIENTES (A.10)',3.5,29),
  ('42001','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',5.0,1),
  ('42001','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',6.0,2),
  ('42001','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',6.0,3),
  ('42001','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',5.0,4),
  ('42001','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',5.0,5),
  ('42001','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',4.0,6),
  ('42001','Compromiso','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('42001','Compromiso','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',4.0,8),
  ('42001','Compromiso','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',3.0,9),
  ('42001','Compromiso','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',4.0,10),
  ('42001','Compromiso','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',4.0,11),
  ('42001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',2.0,12),
  ('42001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',2.0,13),
  ('42001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',3.0,14),
  ('42001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',2.0,15),
  ('42001','Compromiso','PA5 GESTIÓN DE SEGURIDAD - S2 PA5 GESTION SEGURIDAD LÓGICA','PA5 GESTIÓN DE SEGURIDAD','S2 PA5 GESTION SEGURIDAD LÓGICA',2.0,16),
  ('42001','Compromiso','PA5 GESTIÓN DE SEGURIDAD - S4 PA5 GESTIÓN SEGURIDAD DATOS','PA5 GESTIÓN DE SEGURIDAD','S4 PA5 GESTIÓN SEGURIDAD DATOS',3.0,17),
  ('42001','Compromiso','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',2.0,18),
  ('42001','Compromiso','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',2.0,19),
  ('42001','Compromiso','PE5 GESTIÓN DE POLÍTICAS Y GOBERNANZA DE IA - S1 PE5 POLÍTICA DE IA Y ALINEAMIENTO (A.2)','PE5 GESTIÓN DE POLÍTICAS Y GOBERNANZA DE IA','S1 PE5 POLÍTICA DE IA Y ALINEAMIENTO (A.2)',6.0,20),
  ('42001','Compromiso','PE5 GESTIÓN DE POLÍTICAS Y GOBERNANZA DE IA - S2 PE5 EVALUACIÓN DE IMPACTOS DEL SISTEMA DE IA (A.5)','PE5 GESTIÓN DE POLÍTICAS Y GOBERNANZA DE IA','S2 PE5 EVALUACIÓN DE IMPACTOS DEL SISTEMA DE IA (A.5)',8.0,21),
  ('42001','Compromiso','PI3 CICLO DE VIDA DEL SISTEMA DE IA - S1 PI3 OBJETIVOS Y DISEÑO RESPONSABLE (A.6.1)','PI3 CICLO DE VIDA DEL SISTEMA DE IA','S1 PI3 OBJETIVOS Y DISEÑO RESPONSABLE (A.6.1)',6.0,22),
  ('42001','Compromiso','PI3 CICLO DE VIDA DEL SISTEMA DE IA - S2 PI3 REQUISITOS Y ESPECIFICACIÓN (A.6.2.2)','PI3 CICLO DE VIDA DEL SISTEMA DE IA','S2 PI3 REQUISITOS Y ESPECIFICACIÓN (A.6.2.2)',6.0,23),
  ('42001','Compromiso','PI3 CICLO DE VIDA DEL SISTEMA DE IA - S3 PI3 VERIFICACIÓN Y VALIDACIÓN (A.6.2.4)','PI3 CICLO DE VIDA DEL SISTEMA DE IA','S3 PI3 VERIFICACIÓN Y VALIDACIÓN (A.6.2.4)',6.0,24),
  ('42001','Compromiso','PI3 CICLO DE VIDA DEL SISTEMA DE IA - S4 PI3 DESPLIEGUE Y OPERACIÓN/SEGUIMIENTO (A.6.2.5-6)','PI3 CICLO DE VIDA DEL SISTEMA DE IA','S4 PI3 DESPLIEGUE Y OPERACIÓN/SEGUIMIENTO (A.6.2.5-6)',6.0,25),
  ('42001','Compromiso','PA10 GESTIÓN DE DATOS PARA IA - S1 PA10 CALIDAD, PROCEDENCIA Y PREPARACIÓN DE DATOS (A.7)','PA10 GESTIÓN DE DATOS PARA IA','S1 PA10 CALIDAD, PROCEDENCIA Y PREPARACIÓN DE DATOS (A.7)',6.0,26),
  ('42001','Compromiso','PA11 INFORMACIÓN A PARTES INTERESADAS - S1 PA11 DOCUMENTACIÓN A USUARIOS E INCIDENTES (A.8)','PA11 INFORMACIÓN A PARTES INTERESADAS','S1 PA11 DOCUMENTACIÓN A USUARIOS E INCIDENTES (A.8)',4.0,27),
  ('42001','Compromiso','PA12 USO RESPONSABLE DE SISTEMAS DE IA - S1 PA12 PROCESOS Y OBJETIVOS DE USO RESPONSABLE (A.9)','PA12 USO RESPONSABLE DE SISTEMAS DE IA','S1 PA12 PROCESOS Y OBJETIVOS DE USO RESPONSABLE (A.9)',5.0,28),
  ('42001','Compromiso','PA13 RELACIONES CON TERCEROS Y CLIENTES - S1 PA13 RESPONSABILIDADES, PROVEEDORES Y CLIENTES (A.10)','PA13 RELACIONES CON TERCEROS Y CLIENTES','S1 PA13 RESPONSABILIDADES, PROVEEDORES Y CLIENTES (A.10)',4.0,29),
  ('42001','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',2.7,1),
  ('42001','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',3.3,2),
  ('42001','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',3.3,3),
  ('42001','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',2.7,4),
  ('42001','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',2.7,5),
  ('42001','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',2.1,6),
  ('42001','Implantación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',2.1,7),
  ('42001','Implantación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',2.1,8),
  ('42001','Implantación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',1.5,9),
  ('42001','Implantación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.1,10),
  ('42001','Implantación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',2.1,11),
  ('42001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',1.2,12),
  ('42001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',1.2,13),
  ('42001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',1.5,14),
  ('42001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',1.2,15),
  ('42001','Implantación','PA5 GESTIÓN DE SEGURIDAD - S2 PA5 GESTION SEGURIDAD LÓGICA','PA5 GESTIÓN DE SEGURIDAD','S2 PA5 GESTION SEGURIDAD LÓGICA',1.2,16),
  ('42001','Implantación','PA5 GESTIÓN DE SEGURIDAD - S4 PA5 GESTIÓN SEGURIDAD DATOS','PA5 GESTIÓN DE SEGURIDAD','S4 PA5 GESTIÓN SEGURIDAD DATOS',1.5,17),
  ('42001','Implantación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',1.2,18),
  ('42001','Implantación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',1.2,19),
  ('42001','Implantación','PE5 GESTIÓN DE POLÍTICAS Y GOBERNANZA DE IA - S1 PE5 POLÍTICA DE IA Y ALINEAMIENTO (A.2)','PE5 GESTIÓN DE POLÍTICAS Y GOBERNANZA DE IA','S1 PE5 POLÍTICA DE IA Y ALINEAMIENTO (A.2)',3.3,20),
  ('42001','Implantación','PE5 GESTIÓN DE POLÍTICAS Y GOBERNANZA DE IA - S2 PE5 EVALUACIÓN DE IMPACTOS DEL SISTEMA DE IA (A.5)','PE5 GESTIÓN DE POLÍTICAS Y GOBERNANZA DE IA','S2 PE5 EVALUACIÓN DE IMPACTOS DEL SISTEMA DE IA (A.5)',4.2,21),
  ('42001','Implantación','PI3 CICLO DE VIDA DEL SISTEMA DE IA - S1 PI3 OBJETIVOS Y DISEÑO RESPONSABLE (A.6.1)','PI3 CICLO DE VIDA DEL SISTEMA DE IA','S1 PI3 OBJETIVOS Y DISEÑO RESPONSABLE (A.6.1)',3.3,22),
  ('42001','Implantación','PI3 CICLO DE VIDA DEL SISTEMA DE IA - S2 PI3 REQUISITOS Y ESPECIFICACIÓN (A.6.2.2)','PI3 CICLO DE VIDA DEL SISTEMA DE IA','S2 PI3 REQUISITOS Y ESPECIFICACIÓN (A.6.2.2)',3.3,23),
  ('42001','Implantación','PI3 CICLO DE VIDA DEL SISTEMA DE IA - S3 PI3 VERIFICACIÓN Y VALIDACIÓN (A.6.2.4)','PI3 CICLO DE VIDA DEL SISTEMA DE IA','S3 PI3 VERIFICACIÓN Y VALIDACIÓN (A.6.2.4)',3.3,24),
  ('42001','Implantación','PI3 CICLO DE VIDA DEL SISTEMA DE IA - S4 PI3 DESPLIEGUE Y OPERACIÓN/SEGUIMIENTO (A.6.2.5-6)','PI3 CICLO DE VIDA DEL SISTEMA DE IA','S4 PI3 DESPLIEGUE Y OPERACIÓN/SEGUIMIENTO (A.6.2.5-6)',3.3,25),
  ('42001','Implantación','PA10 GESTIÓN DE DATOS PARA IA - S1 PA10 CALIDAD, PROCEDENCIA Y PREPARACIÓN DE DATOS (A.7)','PA10 GESTIÓN DE DATOS PARA IA','S1 PA10 CALIDAD, PROCEDENCIA Y PREPARACIÓN DE DATOS (A.7)',3.3,26),
  ('42001','Implantación','PA11 INFORMACIÓN A PARTES INTERESADAS - S1 PA11 DOCUMENTACIÓN A USUARIOS E INCIDENTES (A.8)','PA11 INFORMACIÓN A PARTES INTERESADAS','S1 PA11 DOCUMENTACIÓN A USUARIOS E INCIDENTES (A.8)',2.1,27),
  ('42001','Implantación','PA12 USO RESPONSABLE DE SISTEMAS DE IA - S1 PA12 PROCESOS Y OBJETIVOS DE USO RESPONSABLE (A.9)','PA12 USO RESPONSABLE DE SISTEMAS DE IA','S1 PA12 PROCESOS Y OBJETIVOS DE USO RESPONSABLE (A.9)',2.7,28),
  ('42001','Implantación','PA13 RELACIONES CON TERCEROS Y CLIENTES - S1 PA13 RESPONSABILIDADES, PROVEEDORES Y CLIENTES (A.10)','PA13 RELACIONES CON TERCEROS Y CLIENTES','S1 PA13 RESPONSABILIDADES, PROVEEDORES Y CLIENTES (A.10)',2.1,29),
  ('56001','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',4.0,1),
  ('56001','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',4.0,2),
  ('56001','Apoyo','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',12.0,3),
  ('56001','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',6.0,4),
  ('56001','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',6.0,5),
  ('56001','Apoyo','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',4.0,6),
  ('56001','Apoyo','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('56001','Apoyo','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.0,8),
  ('56001','Apoyo','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',6.0,9),
  ('56001','Apoyo','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',4.0,10),
  ('56001','Apoyo','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',2.0,11),
  ('56001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',2.0,12),
  ('56001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',2.0,13),
  ('56001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',2.0,14),
  ('56001','Apoyo','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',2.0,15),
  ('56001','Apoyo','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',2.0,16),
  ('56001','Apoyo','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',2.0,17),
  ('56001','Apoyo','PE4 GESTIÓN DE LA CARTERA DE INNOVACIÓN - S1 PE4 DISEÑO Y MANTENIMIENTO DEL PORTAFOLIO','PE4 GESTIÓN DE LA CARTERA DE INNOVACIÓN','S1 PE4 DISEÑO Y MANTENIMIENTO DEL PORTAFOLIO',8.0,18),
  ('56001','Apoyo','PI1 PROCESO DE INNOVACIÓN - S1 PI1 IDENTIFICACIÓN DE OPORTUNIDADES (8.3.2)','PI1 PROCESO DE INNOVACIÓN','S1 PI1 IDENTIFICACIÓN DE OPORTUNIDADES (8.3.2)',6.0,19),
  ('56001','Apoyo','PI1 PROCESO DE INNOVACIÓN - S2 PI1 CREACIÓN DE CONCEPTOS (8.3.3)','PI1 PROCESO DE INNOVACIÓN','S2 PI1 CREACIÓN DE CONCEPTOS (8.3.3)',6.0,20),
  ('56001','Apoyo','PI1 PROCESO DE INNOVACIÓN - S3 PI1 VALIDACIÓN DE CONCEPTOS (8.3.4)','PI1 PROCESO DE INNOVACIÓN','S3 PI1 VALIDACIÓN DE CONCEPTOS (8.3.4)',6.0,21),
  ('56001','Apoyo','PI1 PROCESO DE INNOVACIÓN - S4 PI1 DESARROLLO DE SOLUCIONES (8.3.5)','PI1 PROCESO DE INNOVACIÓN','S4 PI1 DESARROLLO DE SOLUCIONES (8.3.5)',6.0,22),
  ('56001','Apoyo','PI1 PROCESO DE INNOVACIÓN - S5 PI1 IMPLEMENTACIÓN Y CAPTURA DE VALOR (8.3.6)','PI1 PROCESO DE INNOVACIÓN','S5 PI1 IMPLEMENTACIÓN Y CAPTURA DE VALOR (8.3.6)',6.0,23),
  ('56001','Apoyo','PI2 GESTIÓN DE INICIATIVAS DE INNOVACIÓN - S1 PI2 FICHA DE INICIATIVA Y CRITERIOS GO/KILL (8.2)','PI2 GESTIÓN DE INICIATIVAS DE INNOVACIÓN','S1 PI2 FICHA DE INICIATIVA Y CRITERIOS GO/KILL (8.2)',4.0,24),
  ('56001','Apoyo','PI2 GESTIÓN DE INICIATIVAS DE INNOVACIÓN - S2 PI2 SEGUIMIENTO Y TRAZABILIDAD','PI2 GESTIÓN DE INICIATIVAS DE INNOVACIÓN','S2 PI2 SEGUIMIENTO Y TRAZABILIDAD',4.0,25),
  ('56001','Apoyo','PA8 GESTIÓN DE PI Y VIGILANCIA - S1 PA8 GESTIÓN DE LA PROPIEDAD INTELECTUAL','PA8 GESTIÓN DE PI Y VIGILANCIA','S1 PA8 GESTIÓN DE LA PROPIEDAD INTELECTUAL',4.0,26),
  ('56001','Apoyo','PA8 GESTIÓN DE PI Y VIGILANCIA - S2 PA8 VIGILANCIA TECNOLÓGICA Y CONOCIMIENTO','PA8 GESTIÓN DE PI Y VIGILANCIA','S2 PA8 VIGILANCIA TECNOLÓGICA Y CONOCIMIENTO',4.0,27),
  ('56001','Apoyo','PA9 GESTIÓN DE ALIANZAS Y COLABORACIONES - S1 PA9 MARCO DE ALIANZAS Y SELECCIÓN DE SOCIOS','PA9 GESTIÓN DE ALIANZAS Y COLABORACIONES','S1 PA9 MARCO DE ALIANZAS Y SELECCIÓN DE SOCIOS',4.0,28),
  ('56001','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',4.0,1),
  ('56001','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',4.0,2),
  ('56001','Relación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',12.0,3),
  ('56001','Relación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',6.0,4),
  ('56001','Relación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',6.0,5),
  ('56001','Relación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',4.0,6),
  ('56001','Relación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('56001','Relación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.0,8),
  ('56001','Relación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',6.0,9),
  ('56001','Relación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',4.0,10),
  ('56001','Relación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',2.0,11),
  ('56001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',2.0,12),
  ('56001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',2.0,13),
  ('56001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',2.0,14),
  ('56001','Relación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',2.0,15),
  ('56001','Relación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',2.0,16),
  ('56001','Relación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',2.0,17),
  ('56001','Relación','PE4 GESTIÓN DE LA CARTERA DE INNOVACIÓN - S1 PE4 DISEÑO Y MANTENIMIENTO DEL PORTAFOLIO','PE4 GESTIÓN DE LA CARTERA DE INNOVACIÓN','S1 PE4 DISEÑO Y MANTENIMIENTO DEL PORTAFOLIO',8.0,18),
  ('56001','Relación','PI1 PROCESO DE INNOVACIÓN - S1 PI1 IDENTIFICACIÓN DE OPORTUNIDADES (8.3.2)','PI1 PROCESO DE INNOVACIÓN','S1 PI1 IDENTIFICACIÓN DE OPORTUNIDADES (8.3.2)',6.0,19),
  ('56001','Relación','PI1 PROCESO DE INNOVACIÓN - S2 PI1 CREACIÓN DE CONCEPTOS (8.3.3)','PI1 PROCESO DE INNOVACIÓN','S2 PI1 CREACIÓN DE CONCEPTOS (8.3.3)',6.0,20),
  ('56001','Relación','PI1 PROCESO DE INNOVACIÓN - S3 PI1 VALIDACIÓN DE CONCEPTOS (8.3.4)','PI1 PROCESO DE INNOVACIÓN','S3 PI1 VALIDACIÓN DE CONCEPTOS (8.3.4)',6.0,21),
  ('56001','Relación','PI1 PROCESO DE INNOVACIÓN - S4 PI1 DESARROLLO DE SOLUCIONES (8.3.5)','PI1 PROCESO DE INNOVACIÓN','S4 PI1 DESARROLLO DE SOLUCIONES (8.3.5)',6.0,22),
  ('56001','Relación','PI1 PROCESO DE INNOVACIÓN - S5 PI1 IMPLEMENTACIÓN Y CAPTURA DE VALOR (8.3.6)','PI1 PROCESO DE INNOVACIÓN','S5 PI1 IMPLEMENTACIÓN Y CAPTURA DE VALOR (8.3.6)',6.0,23),
  ('56001','Relación','PI2 GESTIÓN DE INICIATIVAS DE INNOVACIÓN - S1 PI2 FICHA DE INICIATIVA Y CRITERIOS GO/KILL (8.2)','PI2 GESTIÓN DE INICIATIVAS DE INNOVACIÓN','S1 PI2 FICHA DE INICIATIVA Y CRITERIOS GO/KILL (8.2)',4.0,24),
  ('56001','Relación','PI2 GESTIÓN DE INICIATIVAS DE INNOVACIÓN - S2 PI2 SEGUIMIENTO Y TRAZABILIDAD','PI2 GESTIÓN DE INICIATIVAS DE INNOVACIÓN','S2 PI2 SEGUIMIENTO Y TRAZABILIDAD',4.0,25),
  ('56001','Relación','PA8 GESTIÓN DE PI Y VIGILANCIA - S1 PA8 GESTIÓN DE LA PROPIEDAD INTELECTUAL','PA8 GESTIÓN DE PI Y VIGILANCIA','S1 PA8 GESTIÓN DE LA PROPIEDAD INTELECTUAL',4.0,26),
  ('56001','Relación','PA8 GESTIÓN DE PI Y VIGILANCIA - S2 PA8 VIGILANCIA TECNOLÓGICA Y CONOCIMIENTO','PA8 GESTIÓN DE PI Y VIGILANCIA','S2 PA8 VIGILANCIA TECNOLÓGICA Y CONOCIMIENTO',4.0,27),
  ('56001','Relación','PA9 GESTIÓN DE ALIANZAS Y COLABORACIONES - S1 PA9 MARCO DE ALIANZAS Y SELECCIÓN DE SOCIOS','PA9 GESTIÓN DE ALIANZAS Y COLABORACIONES','S1 PA9 MARCO DE ALIANZAS Y SELECCIÓN DE SOCIOS',4.0,28),
  ('56001','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',4.0,1),
  ('56001','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',4.0,2),
  ('56001','Implicación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',12.0,3),
  ('56001','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',6.0,4),
  ('56001','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',6.0,5),
  ('56001','Implicación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',4.0,6),
  ('56001','Implicación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('56001','Implicación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.0,8),
  ('56001','Implicación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',6.0,9),
  ('56001','Implicación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',4.0,10),
  ('56001','Implicación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',2.0,11),
  ('56001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',2.0,12),
  ('56001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',2.0,13),
  ('56001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',2.0,14),
  ('56001','Implicación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',2.0,15),
  ('56001','Implicación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',2.0,16),
  ('56001','Implicación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',2.0,17),
  ('56001','Implicación','PE4 GESTIÓN DE LA CARTERA DE INNOVACIÓN - S1 PE4 DISEÑO Y MANTENIMIENTO DEL PORTAFOLIO','PE4 GESTIÓN DE LA CARTERA DE INNOVACIÓN','S1 PE4 DISEÑO Y MANTENIMIENTO DEL PORTAFOLIO',8.0,18),
  ('56001','Implicación','PI1 PROCESO DE INNOVACIÓN - S1 PI1 IDENTIFICACIÓN DE OPORTUNIDADES (8.3.2)','PI1 PROCESO DE INNOVACIÓN','S1 PI1 IDENTIFICACIÓN DE OPORTUNIDADES (8.3.2)',6.0,19),
  ('56001','Implicación','PI1 PROCESO DE INNOVACIÓN - S2 PI1 CREACIÓN DE CONCEPTOS (8.3.3)','PI1 PROCESO DE INNOVACIÓN','S2 PI1 CREACIÓN DE CONCEPTOS (8.3.3)',6.0,20),
  ('56001','Implicación','PI1 PROCESO DE INNOVACIÓN - S3 PI1 VALIDACIÓN DE CONCEPTOS (8.3.4)','PI1 PROCESO DE INNOVACIÓN','S3 PI1 VALIDACIÓN DE CONCEPTOS (8.3.4)',6.0,21),
  ('56001','Implicación','PI1 PROCESO DE INNOVACIÓN - S4 PI1 DESARROLLO DE SOLUCIONES (8.3.5)','PI1 PROCESO DE INNOVACIÓN','S4 PI1 DESARROLLO DE SOLUCIONES (8.3.5)',6.0,22),
  ('56001','Implicación','PI1 PROCESO DE INNOVACIÓN - S5 PI1 IMPLEMENTACIÓN Y CAPTURA DE VALOR (8.3.6)','PI1 PROCESO DE INNOVACIÓN','S5 PI1 IMPLEMENTACIÓN Y CAPTURA DE VALOR (8.3.6)',6.0,23),
  ('56001','Implicación','PI2 GESTIÓN DE INICIATIVAS DE INNOVACIÓN - S1 PI2 FICHA DE INICIATIVA Y CRITERIOS GO/KILL (8.2)','PI2 GESTIÓN DE INICIATIVAS DE INNOVACIÓN','S1 PI2 FICHA DE INICIATIVA Y CRITERIOS GO/KILL (8.2)',4.0,24),
  ('56001','Implicación','PI2 GESTIÓN DE INICIATIVAS DE INNOVACIÓN - S2 PI2 SEGUIMIENTO Y TRAZABILIDAD','PI2 GESTIÓN DE INICIATIVAS DE INNOVACIÓN','S2 PI2 SEGUIMIENTO Y TRAZABILIDAD',4.0,25),
  ('56001','Implicación','PA8 GESTIÓN DE PI Y VIGILANCIA - S1 PA8 GESTIÓN DE LA PROPIEDAD INTELECTUAL','PA8 GESTIÓN DE PI Y VIGILANCIA','S1 PA8 GESTIÓN DE LA PROPIEDAD INTELECTUAL',4.0,26),
  ('56001','Implicación','PA8 GESTIÓN DE PI Y VIGILANCIA - S2 PA8 VIGILANCIA TECNOLÓGICA Y CONOCIMIENTO','PA8 GESTIÓN DE PI Y VIGILANCIA','S2 PA8 VIGILANCIA TECNOLÓGICA Y CONOCIMIENTO',4.0,27),
  ('56001','Implicación','PA9 GESTIÓN DE ALIANZAS Y COLABORACIONES - S1 PA9 MARCO DE ALIANZAS Y SELECCIÓN DE SOCIOS','PA9 GESTIÓN DE ALIANZAS Y COLABORACIONES','S1 PA9 MARCO DE ALIANZAS Y SELECCIÓN DE SOCIOS',4.0,28),
  ('56001','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',4.0,1),
  ('56001','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',4.0,2),
  ('56001','Compromiso','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',12.0,3),
  ('56001','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',6.0,4),
  ('56001','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',6.0,5),
  ('56001','Compromiso','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',4.0,6),
  ('56001','Compromiso','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',4.0,7),
  ('56001','Compromiso','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',3.0,8),
  ('56001','Compromiso','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',6.0,9),
  ('56001','Compromiso','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',4.0,10),
  ('56001','Compromiso','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',2.0,11),
  ('56001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',2.0,12),
  ('56001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',2.0,13),
  ('56001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',2.0,14),
  ('56001','Compromiso','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',2.0,15),
  ('56001','Compromiso','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',2.0,16),
  ('56001','Compromiso','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',2.0,17),
  ('56001','Compromiso','PE4 GESTIÓN DE LA CARTERA DE INNOVACIÓN - S1 PE4 DISEÑO Y MANTENIMIENTO DEL PORTAFOLIO','PE4 GESTIÓN DE LA CARTERA DE INNOVACIÓN','S1 PE4 DISEÑO Y MANTENIMIENTO DEL PORTAFOLIO',8.0,18),
  ('56001','Compromiso','PI1 PROCESO DE INNOVACIÓN - S1 PI1 IDENTIFICACIÓN DE OPORTUNIDADES (8.3.2)','PI1 PROCESO DE INNOVACIÓN','S1 PI1 IDENTIFICACIÓN DE OPORTUNIDADES (8.3.2)',6.0,19),
  ('56001','Compromiso','PI1 PROCESO DE INNOVACIÓN - S2 PI1 CREACIÓN DE CONCEPTOS (8.3.3)','PI1 PROCESO DE INNOVACIÓN','S2 PI1 CREACIÓN DE CONCEPTOS (8.3.3)',6.0,20),
  ('56001','Compromiso','PI1 PROCESO DE INNOVACIÓN - S3 PI1 VALIDACIÓN DE CONCEPTOS (8.3.4)','PI1 PROCESO DE INNOVACIÓN','S3 PI1 VALIDACIÓN DE CONCEPTOS (8.3.4)',6.0,21),
  ('56001','Compromiso','PI1 PROCESO DE INNOVACIÓN - S4 PI1 DESARROLLO DE SOLUCIONES (8.3.5)','PI1 PROCESO DE INNOVACIÓN','S4 PI1 DESARROLLO DE SOLUCIONES (8.3.5)',6.0,22),
  ('56001','Compromiso','PI1 PROCESO DE INNOVACIÓN - S5 PI1 IMPLEMENTACIÓN Y CAPTURA DE VALOR (8.3.6)','PI1 PROCESO DE INNOVACIÓN','S5 PI1 IMPLEMENTACIÓN Y CAPTURA DE VALOR (8.3.6)',6.0,23),
  ('56001','Compromiso','PI2 GESTIÓN DE INICIATIVAS DE INNOVACIÓN - S1 PI2 FICHA DE INICIATIVA Y CRITERIOS GO/KILL (8.2)','PI2 GESTIÓN DE INICIATIVAS DE INNOVACIÓN','S1 PI2 FICHA DE INICIATIVA Y CRITERIOS GO/KILL (8.2)',4.0,24),
  ('56001','Compromiso','PI2 GESTIÓN DE INICIATIVAS DE INNOVACIÓN - S2 PI2 SEGUIMIENTO Y TRAZABILIDAD','PI2 GESTIÓN DE INICIATIVAS DE INNOVACIÓN','S2 PI2 SEGUIMIENTO Y TRAZABILIDAD',4.0,25),
  ('56001','Compromiso','PA8 GESTIÓN DE PI Y VIGILANCIA - S1 PA8 GESTIÓN DE LA PROPIEDAD INTELECTUAL','PA8 GESTIÓN DE PI Y VIGILANCIA','S1 PA8 GESTIÓN DE LA PROPIEDAD INTELECTUAL',4.0,26),
  ('56001','Compromiso','PA8 GESTIÓN DE PI Y VIGILANCIA - S2 PA8 VIGILANCIA TECNOLÓGICA Y CONOCIMIENTO','PA8 GESTIÓN DE PI Y VIGILANCIA','S2 PA8 VIGILANCIA TECNOLÓGICA Y CONOCIMIENTO',4.0,27),
  ('56001','Compromiso','PA9 GESTIÓN DE ALIANZAS Y COLABORACIONES - S1 PA9 MARCO DE ALIANZAS Y SELECCIÓN DE SOCIOS','PA9 GESTIÓN DE ALIANZAS Y COLABORACIONES','S1 PA9 MARCO DE ALIANZAS Y SELECCIÓN DE SOCIOS',4.0,28),
  ('56001','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S1 PE1 GESTIÓN DEL CONTEXTO Y GI','PE1 PLANIFICACIÓN ESTRATÉGICA','S1 PE1 GESTIÓN DEL CONTEXTO Y GI',2.4,1),
  ('56001','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S2 PE1 GESTIÓN DE RIESGOS','PE1 PLANIFICACIÓN ESTRATÉGICA','S2 PE1 GESTIÓN DE RIESGOS',2.4,2),
  ('56001','Implantación','PE1 PLANIFICACIÓN ESTRATÉGICA - S3 PE1 GESTIÓN DE EST, POLT Y OBJ','PE1 PLANIFICACIÓN ESTRATÉGICA','S3 PE1 GESTIÓN DE EST, POLT Y OBJ',7.2,3),
  ('56001','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S1 PE2 ANÁLISIS DE DATOS','PE2 EVALUACIÓN DESEMPEÑO','S1 PE2 ANÁLISIS DE DATOS',3.6,4),
  ('56001','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S2 PE2 AUDITORÍA INTERNA','PE2 EVALUACIÓN DESEMPEÑO','S2 PE2 AUDITORÍA INTERNA',3.6,5),
  ('56001','Implantación','PE2 EVALUACIÓN DESEMPEÑO - S3 PE2 REVISIÓN POR LA DIRECCIÓN','PE2 EVALUACIÓN DESEMPEÑO','S3 PE2 REVISIÓN POR LA DIRECCIÓN',2.4,6),
  ('56001','Implantación','PE3 MEJORA CONTINUA - S1 PE3 GESTIÓN DE NO CONFORMIDADES','PE3 MEJORA CONTINUA','S1 PE3 GESTIÓN DE NO CONFORMIDADES',2.4,7),
  ('56001','Implantación','PA1 GESTIÓN DE PERSONAS - S1 PA1 GESTIÓN DE PUESTOS Y ROLES','PA1 GESTIÓN DE PERSONAS','S1 PA1 GESTIÓN DE PUESTOS Y ROLES',1.8,8),
  ('56001','Implantación','PA1 GESTIÓN DE PERSONAS - S2 PA1 DESARROLLO PERSONAS','PA1 GESTIÓN DE PERSONAS','S2 PA1 DESARROLLO PERSONAS',3.6,9),
  ('56001','Implantación','PA3 GESTIÓN DEL CONOCIMIENTO - S1 PA3 GESTIÓN INFORMAC. DOC.','PA3 GESTIÓN DEL CONOCIMIENTO','S1 PA3 GESTIÓN INFORMAC. DOC.',2.4,10),
  ('56001','Implantación','PA3 GESTIÓN DEL CONOCIMIENTO - S2 PA3 CONTROL LEGAL','PA3 GESTIÓN DEL CONOCIMIENTO','S2 PA3 CONTROL LEGAL',1.2,11),
  ('56001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS','PA4 GESTIÓN INFRAESTRUCTURAS','S1 PA4 MANTENIMIENTO INFRAESTRUCTURAS',1.2,12),
  ('56001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S2 PA4 LICENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S2 PA4 LICENCIAS',1.2,13),
  ('56001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S3 PA4 GESTIÓN DE ACTIVOS','PA4 GESTIÓN INFRAESTRUCTURAS','S3 PA4 GESTIÓN DE ACTIVOS',1.2,14),
  ('56001','Implantación','PA4 GESTIÓN INFRAESTRUCTURAS - S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS','PA4 GESTIÓN INFRAESTRUCTURAS','S4 PA4 SEGURIDAD FÍSICA Y GESTION DE EMERGENCIAS',1.2,15),
  ('56001','Implantación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S1 PA6 HOMOLOGACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S1 PA6 HOMOLOGACIÓN PROVEEDORES',1.2,16),
  ('56001','Implantación','PA6 GESTIÓN DE PARTES SUBCONTRATADAS - S2 PA6 EVALUACIÓN PROVEEDORES','PA6 GESTIÓN DE PARTES SUBCONTRATADAS','S2 PA6 EVALUACIÓN PROVEEDORES',1.2,17),
  ('56001','Implantación','PE4 GESTIÓN DE LA CARTERA DE INNOVACIÓN - S1 PE4 DISEÑO Y MANTENIMIENTO DEL PORTAFOLIO','PE4 GESTIÓN DE LA CARTERA DE INNOVACIÓN','S1 PE4 DISEÑO Y MANTENIMIENTO DEL PORTAFOLIO',4.8,18),
  ('56001','Implantación','PI1 PROCESO DE INNOVACIÓN - S1 PI1 IDENTIFICACIÓN DE OPORTUNIDADES (8.3.2)','PI1 PROCESO DE INNOVACIÓN','S1 PI1 IDENTIFICACIÓN DE OPORTUNIDADES (8.3.2)',3.6,19),
  ('56001','Implantación','PI1 PROCESO DE INNOVACIÓN - S2 PI1 CREACIÓN DE CONCEPTOS (8.3.3)','PI1 PROCESO DE INNOVACIÓN','S2 PI1 CREACIÓN DE CONCEPTOS (8.3.3)',3.6,20),
  ('56001','Implantación','PI1 PROCESO DE INNOVACIÓN - S3 PI1 VALIDACIÓN DE CONCEPTOS (8.3.4)','PI1 PROCESO DE INNOVACIÓN','S3 PI1 VALIDACIÓN DE CONCEPTOS (8.3.4)',3.6,21),
  ('56001','Implantación','PI1 PROCESO DE INNOVACIÓN - S4 PI1 DESARROLLO DE SOLUCIONES (8.3.5)','PI1 PROCESO DE INNOVACIÓN','S4 PI1 DESARROLLO DE SOLUCIONES (8.3.5)',3.6,22),
  ('56001','Implantación','PI1 PROCESO DE INNOVACIÓN - S5 PI1 IMPLEMENTACIÓN Y CAPTURA DE VALOR (8.3.6)','PI1 PROCESO DE INNOVACIÓN','S5 PI1 IMPLEMENTACIÓN Y CAPTURA DE VALOR (8.3.6)',3.6,23),
  ('56001','Implantación','PI2 GESTIÓN DE INICIATIVAS DE INNOVACIÓN - S1 PI2 FICHA DE INICIATIVA Y CRITERIOS GO/KILL (8.2)','PI2 GESTIÓN DE INICIATIVAS DE INNOVACIÓN','S1 PI2 FICHA DE INICIATIVA Y CRITERIOS GO/KILL (8.2)',2.4,24),
  ('56001','Implantación','PI2 GESTIÓN DE INICIATIVAS DE INNOVACIÓN - S2 PI2 SEGUIMIENTO Y TRAZABILIDAD','PI2 GESTIÓN DE INICIATIVAS DE INNOVACIÓN','S2 PI2 SEGUIMIENTO Y TRAZABILIDAD',2.4,25),
  ('56001','Implantación','PA8 GESTIÓN DE PI Y VIGILANCIA - S1 PA8 GESTIÓN DE LA PROPIEDAD INTELECTUAL','PA8 GESTIÓN DE PI Y VIGILANCIA','S1 PA8 GESTIÓN DE LA PROPIEDAD INTELECTUAL',2.4,26),
  ('56001','Implantación','PA8 GESTIÓN DE PI Y VIGILANCIA - S2 PA8 VIGILANCIA TECNOLÓGICA Y CONOCIMIENTO','PA8 GESTIÓN DE PI Y VIGILANCIA','S2 PA8 VIGILANCIA TECNOLÓGICA Y CONOCIMIENTO',2.4,27),
  ('56001','Implantación','PA9 GESTIÓN DE ALIANZAS Y COLABORACIONES - S1 PA9 MARCO DE ALIANZAS Y SELECCIÓN DE SOCIOS','PA9 GESTIÓN DE ALIANZAS Y COLABORACIONES','S1 PA9 MARCO DE ALIANZAS Y SELECCIÓN DE SOCIOS',2.4,28),
  ('une158101','Apoyo','PR1 DIAGNÓSTICO Y PLANIFICACIÓN - S1 PR1 DIAGNÓSTICO - ANÁLISIS INICIAL (incl. GAP)','PR1 DIAGNÓSTICO Y PLANIFICACIÓN','S1 PR1 DIAGNÓSTICO - ANÁLISIS INICIAL (incl. GAP)',6.4,1),
  ('une158101','Apoyo','PR2 SISTEMA DE GESTIÓN - S1 PR2 DIRECCIÓN - POLÍTICA DE DIRECCIÓN DE PERSONAS (7.1)','PR2 SISTEMA DE GESTIÓN','S1 PR2 DIRECCIÓN - POLÍTICA DE DIRECCIÓN DE PERSONAS (7.1)',3.2,2),
  ('une158101','Apoyo','PR2 SISTEMA DE GESTIÓN - S2 PR2 PLANIFICACIÓN OPERATIVA DEL SERVICIO (8.1)','PR2 SISTEMA DE GESTIÓN','S2 PR2 PLANIFICACIÓN OPERATIVA DEL SERVICIO (8.1)',6.4,3),
  ('une158101','Apoyo','PR3 INCORPORACIÓN DE USUARIOS - S1 PR3 DOCUMENTACIÓN INFORMATIVA (4.1.1)','PR3 INCORPORACIÓN DE USUARIOS','S1 PR3 DOCUMENTACIÓN INFORMATIVA (4.1.1)',4.0,4),
  ('une158101','Apoyo','PR3 INCORPORACIÓN DE USUARIOS - S2 PR3 PROTOCOLO ATENCIÓN AL CLIENTE (4.1.1.1)','PR3 INCORPORACIÓN DE USUARIOS','S2 PR3 PROTOCOLO ATENCIÓN AL CLIENTE (4.1.1.1)',3.2,5),
  ('une158101','Apoyo','PR3 INCORPORACIÓN DE USUARIOS - S3 PR3 PROTOCOLO DE INGRESO Y ACOGIDA (4.1.2)','PR3 INCORPORACIÓN DE USUARIOS','S3 PR3 PROTOCOLO DE INGRESO Y ACOGIDA (4.1.2)',4.8,6),
  ('une158101','Apoyo','PR3 INCORPORACIÓN DE USUARIOS - S4 PR3 INSTRUMENTOS DE VALORACIÓN INTEGRAL (4.1.2.2)','PR3 INCORPORACIÓN DE USUARIOS','S4 PR3 INSTRUMENTOS DE VALORACIÓN INTEGRAL (4.1.2.2)',4.8,7),
  ('une158101','Apoyo','PR4 ATENCIÓN AL USUARIO - S1 PR4 DERECHOS, DEBERES Y PROTOCOLOS (5.1)','PR4 ATENCIÓN AL USUARIO','S1 PR4 DERECHOS, DEBERES Y PROTOCOLOS (5.1)',6.4,8),
  ('une158101','Apoyo','PR4 ATENCIÓN AL USUARIO - S2 PR4 PLAN DE ATENCIÓN INDIVIDUAL - PAI (5.3)','PR4 ATENCIÓN AL USUARIO','S2 PR4 PLAN DE ATENCIÓN INDIVIDUAL - PAI (5.3)',6.4,9),
  ('une158101','Apoyo','PR4 ATENCIÓN AL USUARIO - S3 PR4 ATENCIÓN Y CUIDADOS PERSONALES (5.4)','PR4 ATENCIÓN AL USUARIO','S3 PR4 ATENCIÓN Y CUIDADOS PERSONALES (5.4)',4.8,10),
  ('une158101','Apoyo','PR4 ATENCIÓN AL USUARIO - S4 PR4 ATENCIÓN SANITARIA - PROTOCOLOS CLÍNICOS (5.5)','PR4 ATENCIÓN AL USUARIO','S4 PR4 ATENCIÓN SANITARIA - PROTOCOLOS CLÍNICOS (5.5)',8.0,11),
  ('une158101','Apoyo','PR4 ATENCIÓN AL USUARIO - S5 PR4 ATENCIÓN PSICOSOCIAL - PLAN Y PROTOCOLOS (5.6)','PR4 ATENCIÓN AL USUARIO','S5 PR4 ATENCIÓN PSICOSOCIAL - PLAN Y PROTOCOLOS (5.6)',4.8,12),
  ('une158101','Apoyo','PR5 BAJA EN EL SERVICIO - S1 PR5 PROTOCOLO DE FINALIZACIÓN, FALLECIMIENTO Y DUELO (6.1)','PR5 BAJA EN EL SERVICIO','S1 PR5 PROTOCOLO DE FINALIZACIÓN, FALLECIMIENTO Y DUELO (6.1)',3.2,13),
  ('une158101','Apoyo','PR6 CERTIFICACIÓN - S1 PR6 ACOMPAÑAMIENTO AUDITORÍA EXTERNA','PR6 CERTIFICACIÓN','S1 PR6 ACOMPAÑAMIENTO AUDITORÍA EXTERNA',6.4,14),
  ('une158101','Relación','PR1 DIAGNÓSTICO Y PLANIFICACIÓN - S1 PR1 DIAGNÓSTICO - ANÁLISIS INICIAL (incl. GAP)','PR1 DIAGNÓSTICO Y PLANIFICACIÓN','S1 PR1 DIAGNÓSTICO - ANÁLISIS INICIAL (incl. GAP)',8.0,1),
  ('une158101','Relación','PR2 SISTEMA DE GESTIÓN - S1 PR2 DIRECCIÓN - POLÍTICA DE DIRECCIÓN DE PERSONAS (7.1)','PR2 SISTEMA DE GESTIÓN','S1 PR2 DIRECCIÓN - POLÍTICA DE DIRECCIÓN DE PERSONAS (7.1)',4.0,2),
  ('une158101','Relación','PR2 SISTEMA DE GESTIÓN - S2 PR2 PLANIFICACIÓN OPERATIVA DEL SERVICIO (8.1)','PR2 SISTEMA DE GESTIÓN','S2 PR2 PLANIFICACIÓN OPERATIVA DEL SERVICIO (8.1)',8.0,3),
  ('une158101','Relación','PR3 INCORPORACIÓN DE USUARIOS - S1 PR3 DOCUMENTACIÓN INFORMATIVA (4.1.1)','PR3 INCORPORACIÓN DE USUARIOS','S1 PR3 DOCUMENTACIÓN INFORMATIVA (4.1.1)',5.0,4),
  ('une158101','Relación','PR3 INCORPORACIÓN DE USUARIOS - S2 PR3 PROTOCOLO ATENCIÓN AL CLIENTE (4.1.1.1)','PR3 INCORPORACIÓN DE USUARIOS','S2 PR3 PROTOCOLO ATENCIÓN AL CLIENTE (4.1.1.1)',4.0,5),
  ('une158101','Relación','PR3 INCORPORACIÓN DE USUARIOS - S3 PR3 PROTOCOLO DE INGRESO Y ACOGIDA (4.1.2)','PR3 INCORPORACIÓN DE USUARIOS','S3 PR3 PROTOCOLO DE INGRESO Y ACOGIDA (4.1.2)',6.0,6),
  ('une158101','Relación','PR3 INCORPORACIÓN DE USUARIOS - S4 PR3 INSTRUMENTOS DE VALORACIÓN INTEGRAL (4.1.2.2)','PR3 INCORPORACIÓN DE USUARIOS','S4 PR3 INSTRUMENTOS DE VALORACIÓN INTEGRAL (4.1.2.2)',6.0,7),
  ('une158101','Relación','PR4 ATENCIÓN AL USUARIO - S1 PR4 DERECHOS, DEBERES Y PROTOCOLOS (5.1)','PR4 ATENCIÓN AL USUARIO','S1 PR4 DERECHOS, DEBERES Y PROTOCOLOS (5.1)',8.0,8),
  ('une158101','Relación','PR4 ATENCIÓN AL USUARIO - S2 PR4 PLAN DE ATENCIÓN INDIVIDUAL - PAI (5.3)','PR4 ATENCIÓN AL USUARIO','S2 PR4 PLAN DE ATENCIÓN INDIVIDUAL - PAI (5.3)',8.0,9),
  ('une158101','Relación','PR4 ATENCIÓN AL USUARIO - S3 PR4 ATENCIÓN Y CUIDADOS PERSONALES (5.4)','PR4 ATENCIÓN AL USUARIO','S3 PR4 ATENCIÓN Y CUIDADOS PERSONALES (5.4)',6.0,10),
  ('une158101','Relación','PR4 ATENCIÓN AL USUARIO - S4 PR4 ATENCIÓN SANITARIA - PROTOCOLOS CLÍNICOS (5.5)','PR4 ATENCIÓN AL USUARIO','S4 PR4 ATENCIÓN SANITARIA - PROTOCOLOS CLÍNICOS (5.5)',10.0,11),
  ('une158101','Relación','PR4 ATENCIÓN AL USUARIO - S5 PR4 ATENCIÓN PSICOSOCIAL - PLAN Y PROTOCOLOS (5.6)','PR4 ATENCIÓN AL USUARIO','S5 PR4 ATENCIÓN PSICOSOCIAL - PLAN Y PROTOCOLOS (5.6)',6.0,12),
  ('une158101','Relación','PR5 BAJA EN EL SERVICIO - S1 PR5 PROTOCOLO DE FINALIZACIÓN, FALLECIMIENTO Y DUELO (6.1)','PR5 BAJA EN EL SERVICIO','S1 PR5 PROTOCOLO DE FINALIZACIÓN, FALLECIMIENTO Y DUELO (6.1)',4.0,13),
  ('une158101','Relación','PR6 CERTIFICACIÓN - S1 PR6 ACOMPAÑAMIENTO AUDITORÍA EXTERNA','PR6 CERTIFICACIÓN','S1 PR6 ACOMPAÑAMIENTO AUDITORÍA EXTERNA',8.0,14),
  ('une158101','Implicación','PR1 DIAGNÓSTICO Y PLANIFICACIÓN - S1 PR1 DIAGNÓSTICO - ANÁLISIS INICIAL (incl. GAP)','PR1 DIAGNÓSTICO Y PLANIFICACIÓN','S1 PR1 DIAGNÓSTICO - ANÁLISIS INICIAL (incl. GAP)',8.8,1),
  ('une158101','Implicación','PR2 SISTEMA DE GESTIÓN - S1 PR2 DIRECCIÓN - POLÍTICA DE DIRECCIÓN DE PERSONAS (7.1)','PR2 SISTEMA DE GESTIÓN','S1 PR2 DIRECCIÓN - POLÍTICA DE DIRECCIÓN DE PERSONAS (7.1)',4.4,2),
  ('une158101','Implicación','PR2 SISTEMA DE GESTIÓN - S2 PR2 PLANIFICACIÓN OPERATIVA DEL SERVICIO (8.1)','PR2 SISTEMA DE GESTIÓN','S2 PR2 PLANIFICACIÓN OPERATIVA DEL SERVICIO (8.1)',8.8,3),
  ('une158101','Implicación','PR3 INCORPORACIÓN DE USUARIOS - S1 PR3 DOCUMENTACIÓN INFORMATIVA (4.1.1)','PR3 INCORPORACIÓN DE USUARIOS','S1 PR3 DOCUMENTACIÓN INFORMATIVA (4.1.1)',5.5,4),
  ('une158101','Implicación','PR3 INCORPORACIÓN DE USUARIOS - S2 PR3 PROTOCOLO ATENCIÓN AL CLIENTE (4.1.1.1)','PR3 INCORPORACIÓN DE USUARIOS','S2 PR3 PROTOCOLO ATENCIÓN AL CLIENTE (4.1.1.1)',4.4,5),
  ('une158101','Implicación','PR3 INCORPORACIÓN DE USUARIOS - S3 PR3 PROTOCOLO DE INGRESO Y ACOGIDA (4.1.2)','PR3 INCORPORACIÓN DE USUARIOS','S3 PR3 PROTOCOLO DE INGRESO Y ACOGIDA (4.1.2)',6.6,6),
  ('une158101','Implicación','PR3 INCORPORACIÓN DE USUARIOS - S4 PR3 INSTRUMENTOS DE VALORACIÓN INTEGRAL (4.1.2.2)','PR3 INCORPORACIÓN DE USUARIOS','S4 PR3 INSTRUMENTOS DE VALORACIÓN INTEGRAL (4.1.2.2)',6.6,7),
  ('une158101','Implicación','PR4 ATENCIÓN AL USUARIO - S1 PR4 DERECHOS, DEBERES Y PROTOCOLOS (5.1)','PR4 ATENCIÓN AL USUARIO','S1 PR4 DERECHOS, DEBERES Y PROTOCOLOS (5.1)',8.8,8),
  ('une158101','Implicación','PR4 ATENCIÓN AL USUARIO - S2 PR4 PLAN DE ATENCIÓN INDIVIDUAL - PAI (5.3)','PR4 ATENCIÓN AL USUARIO','S2 PR4 PLAN DE ATENCIÓN INDIVIDUAL - PAI (5.3)',8.8,9),
  ('une158101','Implicación','PR4 ATENCIÓN AL USUARIO - S3 PR4 ATENCIÓN Y CUIDADOS PERSONALES (5.4)','PR4 ATENCIÓN AL USUARIO','S3 PR4 ATENCIÓN Y CUIDADOS PERSONALES (5.4)',6.6,10),
  ('une158101','Implicación','PR4 ATENCIÓN AL USUARIO - S4 PR4 ATENCIÓN SANITARIA - PROTOCOLOS CLÍNICOS (5.5)','PR4 ATENCIÓN AL USUARIO','S4 PR4 ATENCIÓN SANITARIA - PROTOCOLOS CLÍNICOS (5.5)',11.0,11),
  ('une158101','Implicación','PR4 ATENCIÓN AL USUARIO - S5 PR4 ATENCIÓN PSICOSOCIAL - PLAN Y PROTOCOLOS (5.6)','PR4 ATENCIÓN AL USUARIO','S5 PR4 ATENCIÓN PSICOSOCIAL - PLAN Y PROTOCOLOS (5.6)',6.6,12),
  ('une158101','Implicación','PR5 BAJA EN EL SERVICIO - S1 PR5 PROTOCOLO DE FINALIZACIÓN, FALLECIMIENTO Y DUELO (6.1)','PR5 BAJA EN EL SERVICIO','S1 PR5 PROTOCOLO DE FINALIZACIÓN, FALLECIMIENTO Y DUELO (6.1)',4.4,13),
  ('une158101','Implicación','PR6 CERTIFICACIÓN - S1 PR6 ACOMPAÑAMIENTO AUDITORÍA EXTERNA','PR6 CERTIFICACIÓN','S1 PR6 ACOMPAÑAMIENTO AUDITORÍA EXTERNA',8.8,14),
  ('une158101','Compromiso','PR1 DIAGNÓSTICO Y PLANIFICACIÓN - S1 PR1 DIAGNÓSTICO - ANÁLISIS INICIAL (incl. GAP)','PR1 DIAGNÓSTICO Y PLANIFICACIÓN','S1 PR1 DIAGNÓSTICO - ANÁLISIS INICIAL (incl. GAP)',9.6,1),
  ('une158101','Compromiso','PR2 SISTEMA DE GESTIÓN - S1 PR2 DIRECCIÓN - POLÍTICA DE DIRECCIÓN DE PERSONAS (7.1)','PR2 SISTEMA DE GESTIÓN','S1 PR2 DIRECCIÓN - POLÍTICA DE DIRECCIÓN DE PERSONAS (7.1)',4.8,2),
  ('une158101','Compromiso','PR2 SISTEMA DE GESTIÓN - S2 PR2 PLANIFICACIÓN OPERATIVA DEL SERVICIO (8.1)','PR2 SISTEMA DE GESTIÓN','S2 PR2 PLANIFICACIÓN OPERATIVA DEL SERVICIO (8.1)',9.6,3),
  ('une158101','Compromiso','PR3 INCORPORACIÓN DE USUARIOS - S1 PR3 DOCUMENTACIÓN INFORMATIVA (4.1.1)','PR3 INCORPORACIÓN DE USUARIOS','S1 PR3 DOCUMENTACIÓN INFORMATIVA (4.1.1)',6.0,4),
  ('une158101','Compromiso','PR3 INCORPORACIÓN DE USUARIOS - S2 PR3 PROTOCOLO ATENCIÓN AL CLIENTE (4.1.1.1)','PR3 INCORPORACIÓN DE USUARIOS','S2 PR3 PROTOCOLO ATENCIÓN AL CLIENTE (4.1.1.1)',4.8,5),
  ('une158101','Compromiso','PR3 INCORPORACIÓN DE USUARIOS - S3 PR3 PROTOCOLO DE INGRESO Y ACOGIDA (4.1.2)','PR3 INCORPORACIÓN DE USUARIOS','S3 PR3 PROTOCOLO DE INGRESO Y ACOGIDA (4.1.2)',7.2,6),
  ('une158101','Compromiso','PR3 INCORPORACIÓN DE USUARIOS - S4 PR3 INSTRUMENTOS DE VALORACIÓN INTEGRAL (4.1.2.2)','PR3 INCORPORACIÓN DE USUARIOS','S4 PR3 INSTRUMENTOS DE VALORACIÓN INTEGRAL (4.1.2.2)',7.2,7),
  ('une158101','Compromiso','PR4 ATENCIÓN AL USUARIO - S1 PR4 DERECHOS, DEBERES Y PROTOCOLOS (5.1)','PR4 ATENCIÓN AL USUARIO','S1 PR4 DERECHOS, DEBERES Y PROTOCOLOS (5.1)',9.6,8),
  ('une158101','Compromiso','PR4 ATENCIÓN AL USUARIO - S2 PR4 PLAN DE ATENCIÓN INDIVIDUAL - PAI (5.3)','PR4 ATENCIÓN AL USUARIO','S2 PR4 PLAN DE ATENCIÓN INDIVIDUAL - PAI (5.3)',9.6,9),
  ('une158101','Compromiso','PR4 ATENCIÓN AL USUARIO - S3 PR4 ATENCIÓN Y CUIDADOS PERSONALES (5.4)','PR4 ATENCIÓN AL USUARIO','S3 PR4 ATENCIÓN Y CUIDADOS PERSONALES (5.4)',7.2,10),
  ('une158101','Compromiso','PR4 ATENCIÓN AL USUARIO - S4 PR4 ATENCIÓN SANITARIA - PROTOCOLOS CLÍNICOS (5.5)','PR4 ATENCIÓN AL USUARIO','S4 PR4 ATENCIÓN SANITARIA - PROTOCOLOS CLÍNICOS (5.5)',12.0,11),
  ('une158101','Compromiso','PR4 ATENCIÓN AL USUARIO - S5 PR4 ATENCIÓN PSICOSOCIAL - PLAN Y PROTOCOLOS (5.6)','PR4 ATENCIÓN AL USUARIO','S5 PR4 ATENCIÓN PSICOSOCIAL - PLAN Y PROTOCOLOS (5.6)',7.2,12),
  ('une158101','Compromiso','PR5 BAJA EN EL SERVICIO - S1 PR5 PROTOCOLO DE FINALIZACIÓN, FALLECIMIENTO Y DUELO (6.1)','PR5 BAJA EN EL SERVICIO','S1 PR5 PROTOCOLO DE FINALIZACIÓN, FALLECIMIENTO Y DUELO (6.1)',4.8,13),
  ('une158101','Compromiso','PR6 CERTIFICACIÓN - S1 PR6 ACOMPAÑAMIENTO AUDITORÍA EXTERNA','PR6 CERTIFICACIÓN','S1 PR6 ACOMPAÑAMIENTO AUDITORÍA EXTERNA',9.6,14),
  ('une158101','Implantación','PR1 DIAGNÓSTICO Y PLANIFICACIÓN - S1 PR1 DIAGNÓSTICO - ANÁLISIS INICIAL (incl. GAP)','PR1 DIAGNÓSTICO Y PLANIFICACIÓN','S1 PR1 DIAGNÓSTICO - ANÁLISIS INICIAL (incl. GAP)',5.28,1),
  ('une158101','Implantación','PR2 SISTEMA DE GESTIÓN - S1 PR2 DIRECCIÓN - POLÍTICA DE DIRECCIÓN DE PERSONAS (7.1)','PR2 SISTEMA DE GESTIÓN','S1 PR2 DIRECCIÓN - POLÍTICA DE DIRECCIÓN DE PERSONAS (7.1)',2.64,2),
  ('une158101','Implantación','PR2 SISTEMA DE GESTIÓN - S2 PR2 PLANIFICACIÓN OPERATIVA DEL SERVICIO (8.1)','PR2 SISTEMA DE GESTIÓN','S2 PR2 PLANIFICACIÓN OPERATIVA DEL SERVICIO (8.1)',5.28,3),
  ('une158101','Implantación','PR3 INCORPORACIÓN DE USUARIOS - S1 PR3 DOCUMENTACIÓN INFORMATIVA (4.1.1)','PR3 INCORPORACIÓN DE USUARIOS','S1 PR3 DOCUMENTACIÓN INFORMATIVA (4.1.1)',3.3,4),
  ('une158101','Implantación','PR3 INCORPORACIÓN DE USUARIOS - S2 PR3 PROTOCOLO ATENCIÓN AL CLIENTE (4.1.1.1)','PR3 INCORPORACIÓN DE USUARIOS','S2 PR3 PROTOCOLO ATENCIÓN AL CLIENTE (4.1.1.1)',2.64,5),
  ('une158101','Implantación','PR3 INCORPORACIÓN DE USUARIOS - S3 PR3 PROTOCOLO DE INGRESO Y ACOGIDA (4.1.2)','PR3 INCORPORACIÓN DE USUARIOS','S3 PR3 PROTOCOLO DE INGRESO Y ACOGIDA (4.1.2)',3.96,6),
  ('une158101','Implantación','PR3 INCORPORACIÓN DE USUARIOS - S4 PR3 INSTRUMENTOS DE VALORACIÓN INTEGRAL (4.1.2.2)','PR3 INCORPORACIÓN DE USUARIOS','S4 PR3 INSTRUMENTOS DE VALORACIÓN INTEGRAL (4.1.2.2)',3.96,7),
  ('une158101','Implantación','PR4 ATENCIÓN AL USUARIO - S1 PR4 DERECHOS, DEBERES Y PROTOCOLOS (5.1)','PR4 ATENCIÓN AL USUARIO','S1 PR4 DERECHOS, DEBERES Y PROTOCOLOS (5.1)',5.28,8),
  ('une158101','Implantación','PR4 ATENCIÓN AL USUARIO - S2 PR4 PLAN DE ATENCIÓN INDIVIDUAL - PAI (5.3)','PR4 ATENCIÓN AL USUARIO','S2 PR4 PLAN DE ATENCIÓN INDIVIDUAL - PAI (5.3)',5.28,9),
  ('une158101','Implantación','PR4 ATENCIÓN AL USUARIO - S3 PR4 ATENCIÓN Y CUIDADOS PERSONALES (5.4)','PR4 ATENCIÓN AL USUARIO','S3 PR4 ATENCIÓN Y CUIDADOS PERSONALES (5.4)',3.96,10),
  ('une158101','Implantación','PR4 ATENCIÓN AL USUARIO - S4 PR4 ATENCIÓN SANITARIA - PROTOCOLOS CLÍNICOS (5.5)','PR4 ATENCIÓN AL USUARIO','S4 PR4 ATENCIÓN SANITARIA - PROTOCOLOS CLÍNICOS (5.5)',6.6,11),
  ('une158101','Implantación','PR4 ATENCIÓN AL USUARIO - S5 PR4 ATENCIÓN PSICOSOCIAL - PLAN Y PROTOCOLOS (5.6)','PR4 ATENCIÓN AL USUARIO','S5 PR4 ATENCIÓN PSICOSOCIAL - PLAN Y PROTOCOLOS (5.6)',3.96,12),
  ('une158101','Implantación','PR5 BAJA EN EL SERVICIO - S1 PR5 PROTOCOLO DE FINALIZACIÓN, FALLECIMIENTO Y DUELO (6.1)','PR5 BAJA EN EL SERVICIO','S1 PR5 PROTOCOLO DE FINALIZACIÓN, FALLECIMIENTO Y DUELO (6.1)',2.64,13),
  ('une158101','Implantación','PR6 CERTIFICACIÓN - S1 PR6 ACOMPAÑAMIENTO AUDITORÍA EXTERNA','PR6 CERTIFICACIÓN','S1 PR6 ACOMPAÑAMIENTO AUDITORÍA EXTERNA',5.28,14);

commit;

-- ══════════════ migracion-v30-normas-nuevas.sql ══════════════

-- ============================================================
-- migracion-v30-normas-nuevas.sql
-- Añade 3 normas a normas_catalogo (sin tareas todavía; se cargarán
-- desde la pantalla de Sistemas o con un seed posterior):
--   · UNE 66181 (formación virtual)
--   · Plan de Igualdad
--   · Madrid Excelente
-- ============================================================

insert into normas_catalogo (id, nombre, descripcion, nivel, h_apoyo, activa) values
  ('une66181',        'UNE 66181',        'Calidad de la formación virtual',                'J3', 30, true),
  ('igualdad',        'Plan de Igualdad',  'Plan de igualdad de empresa',                    'J3', 30, true),
  ('madridexcelente', 'Madrid Excelente',  'Marca de garantía de la Comunidad de Madrid',    'J3', 30, true)
on conflict (id) do update
  set nombre = excluded.nombre,
      descripcion = excluded.descripcion,
      nivel = excluded.nivel,
      h_apoyo = excluded.h_apoyo,
      activa = excluded.activa;


-- ══════════════ migracion-v31-tipo-consulta.sql ══════════════

-- ============================================================
-- migracion-v31-tipo-consulta.sql
-- Amplía el CHECK de 'tipo' en presupuestos para admitir 'consulta'
-- (solicitudes de información desde "¿Quieres otra norma?").
-- ============================================================

ALTER TABLE presupuestos DROP CONSTRAINT IF EXISTS presupuestos_tipo_check;
ALTER TABLE presupuestos
  ADD CONSTRAINT presupuestos_tipo_check
  CHECK (tipo IN ('mes', 'bolsa', 'fraccionado', 'consulta'));


-- ══════════════ migracion-v32-presupuestos-integral.sql ══════════════

-- ============================================================
-- migracion-v32-presupuestos-integral.sql
-- Deja la tabla 'presupuestos' lista para TODOS los flujos del
-- generador de ofertas y del formulario de solicitud de info.
-- Es idempotente: se puede ejecutar varias veces sin romper nada.
--
-- Resuelve el fallo silencioso de alta en base de datos:
--   · columnas que faltaban (cif, cargo, numero_oferta, comercial,
--     requerimiento, url_pdf, url_pptx)
--   · NOT NULL en modelo/precio/email que bloqueaban las consultas
--   · CHECK de 'tipo' ampliado a mes/bolsa/fraccionado/consulta
-- ============================================================

-- 1) Columnas nuevas (si no existen)
alter table presupuestos add column if not exists cif           text;
alter table presupuestos add column if not exists cargo         text;
alter table presupuestos add column if not exists numero_oferta text;
alter table presupuestos add column if not exists comercial     text default 'Alejandro';
alter table presupuestos add column if not exists requerimiento text;
alter table presupuestos add column if not exists url_pdf       text;
alter table presupuestos add column if not exists url_pptx      text;

-- 2) Quitar NOT NULL de campos que no siempre vienen (solicitudes de info)
alter table presupuestos alter column email  drop not null;
alter table presupuestos alter column modelo drop not null;
alter table presupuestos alter column precio drop not null;

-- 3) CHECK de 'tipo' ampliado (mes, bolsa, fraccionado, consulta)
alter table presupuestos drop constraint if exists presupuestos_tipo_check;
alter table presupuestos
  add constraint presupuestos_tipo_check
  check (tipo in ('mes','bolsa','fraccionado','consulta'));

-- 4) Índice por número de oferta (búsquedas en el CRM)
create index if not exists idx_presupuestos_numero on presupuestos(numero_oferta);

-- 5) Asegurar que la política de insert existe (anónimo + interno)
drop policy if exists presupuestos_anon_insert on presupuestos;
create policy presupuestos_anon_insert on presupuestos for insert with check (true);


-- ══════════════ migracion-v33-fix-policy-users.sql ══════════════

-- ============================================================
-- migracion-v33-fix-policy-users.sql  (REFORZADA)
-- Arregla los dos errores encadenados al crear ofertas:
--   1) "permission denied for table users"  -> política de SELECT que leía auth.users
--   2) "new row violates row-level security policy" -> insert no permitido / select de vuelta bloqueado
--
-- Estrategia: políticas explícitas por rol (anon, authenticated) y separar el
-- SELECT de vuelta del INSERT para que el alta pública nunca se bloquee.
-- Idempotente: re-ejecutable sin problemas.
-- ============================================================

-- Aseguramos que RLS está activado (pero con políticas correctas).
alter table presupuestos enable row level security;

-- ---------- Limpiamos políticas previas de presupuestos ----------
drop policy if exists presupuestos_anon_insert on presupuestos;
drop policy if exists presupuestos_owner_read on presupuestos;
drop policy if exists presupuestos_insert_all on presupuestos;
drop policy if exists presupuestos_select_own on presupuestos;
drop policy if exists presupuestos_update_team on presupuestos;

-- ---------- INSERT: cualquiera (anónimo o autenticado) puede crear ----------
-- Generador público y portal interno dan de alta ofertas/consultas.
create policy presupuestos_insert_all on presupuestos
  for insert
  to anon, authenticated
  with check (true);

-- ---------- SELECT: dueño por email del JWT, dueño por user_id, o equipo ----------
-- NO consultamos auth.users (eso causaba "permission denied for table users").
-- Importante: que el alta NO dependa de poder leer la fila de vuelta.
create policy presupuestos_select_own on presupuestos
  for select
  to anon, authenticated
  using (
    user_id = auth.uid()
    or email = (auth.jwt() ->> 'email')
    or coalesce(mi_rol(), '') in ('consultor', 'admin', 'superadmin', 'gestion')
  );

-- ---------- UPDATE: solo equipo interno ----------
create policy presupuestos_update_team on presupuestos
  for update
  to authenticated
  using (coalesce(mi_rol(), '') in ('consultor', 'admin', 'superadmin', 'gestion'))
  with check (coalesce(mi_rol(), '') in ('consultor', 'admin', 'superadmin', 'gestion'));

-- ---------- Permisos de tabla (grant) para los roles de la API ----------
-- RLS filtra filas, pero el rol necesita el privilegio base sobre la tabla.
grant insert, select on presupuestos to anon, authenticated;
grant update on presupuestos to authenticated;


-- ══════════════ migracion-v34-solicitudes-brochure.sql ══════════════

-- migracion-v34-solicitudes-brochure.sql
-- Tabla para almacenar las solicitudes de brochure descargable desde el blog público.
-- Cada fila es un lead que ha rellenado el formulario para recibir un brochure por email.

create table if not exists public.solicitudes_brochure (
  id           uuid primary key default gen_random_uuid(),
  creado_en    timestamptz not null default now(),
  nombre       text not null,
  email        text not null,
  empresa      text,
  telefono     text,
  norma_slug   text not null,          -- ej. 'iso-27001'
  norma_code   text,                   -- ej. 'ISO 27001'
  idioma       text default 'es',      -- es | en | ar
  consent_rgpd boolean not null default false,
  origen       text default 'blog',    -- de dónde vino (blog, home, etc.)
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  ip_hash      text,                   -- opcional, para control anti-spam (no PII en claro)
  enviado_email boolean default false, -- si el email con el brochure se envió con éxito
  brevo_ok     boolean default false   -- si el alta/actualización en Brevo fue correcta
);

create index if not exists idx_solicitudes_brochure_email on public.solicitudes_brochure (email);
create index if not exists idx_solicitudes_brochure_norma on public.solicitudes_brochure (norma_slug);
create index if not exists idx_solicitudes_brochure_fecha on public.solicitudes_brochure (creado_en desc);

-- RLS: nadie lee desde el cliente anónimo; la inserción la hace la Netlify Function
-- usando la service_role key (que salta RLS). Dejamos RLS activado y sin políticas
-- de SELECT para anon/authenticated, de modo que los leads no sean legibles públicamente.
alter table public.solicitudes_brochure enable row level security;

-- (Opcional) Permitir que un rol interno de la app lea las solicitudes.
-- Ajusta el email/claim según tu modelo de permisos.
drop policy if exists "solicitudes_brochure_select_interno" on public.solicitudes_brochure;
create policy "solicitudes_brochure_select_interno"
  on public.solicitudes_brochure
  for select
  to authenticated
  using (
    (auth.jwt() ->> 'email') in (
      'alejandro@tuconsultor.com',
      'fatima@tuconsultor.com',
      'hola@tuconsultor.com'
    )
  );

-- No creamos política de INSERT para anon/authenticated a propósito:
-- la escritura se hace exclusivamente desde el backend con service_role.
grant select on public.solicitudes_brochure to authenticated;


-- ══════════════ migracion-v35-accesos-consultores.sql ══════════════

-- migracion-v35-accesos-consultores.sql
-- Refuerza el control de accesos: campo 'activo' en perfiles, metadatos para el panel
-- de administración, y una política que impide operar a usuarios desactivados.

-- 1) Campos nuevos en perfiles
alter table public.perfiles add column if not exists activo boolean not null default true;
alter table public.perfiles add column if not exists email text;          -- copia legible del email (auth.users)
alter table public.perfiles add column if not exists nivel text            -- J1/J2/J3/Senior (para consultores)
  check (nivel is null or nivel in ('J1','J2','J3','Senior'));
alter table public.perfiles add column if not exists invitado_en timestamptz;
alter table public.perfiles add column if not exists ultimo_acceso timestamptz;

-- 2) Sincronizar email desde auth.users al crear el perfil (trigger existente ampliado)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, rol, nombre, empresa, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'rol', 'cliente'),  -- permite fijar rol en la invitación
    new.raw_user_meta_data->>'nombre',
    new.raw_user_meta_data->>'empresa',
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end; $$;

-- 3) Helper: ¿el usuario actual está activo?
create or replace function public.estoy_activo()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select activo from public.perfiles where id = auth.uid()), false);
$$;

-- 4) Helper: ¿soy superadmin? (para políticas del panel)
create or replace function public.soy_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select rol = 'superadmin' and activo from public.perfiles where id = auth.uid()), false);
$$;

-- 5) El superadmin puede leer y actualizar todos los perfiles (para el panel de accesos)
drop policy if exists perfiles_superadmin_all on public.perfiles;
create policy perfiles_superadmin_all on public.perfiles
  for all
  using (public.soy_superadmin())
  with check (public.soy_superadmin());

-- 6) Marcar el último acceso (llamable desde la app tras el login)
create or replace function public.marcar_acceso()
returns void language sql security definer set search_path = public as $$
  update public.perfiles set ultimo_acceso = now() where id = auth.uid();
$$;

-- ── NOTA OPERATIVA ────────────────────────────────────────────────────────────
-- El bloqueo efectivo de un usuario desactivado se hace en el backend (Netlify
-- Function admin-usuarios) usando la Admin API: al desactivar, se hace ban del
-- usuario en auth.users (ban_duration) para que no pueda iniciar sesión, y se
-- pone activo=false. Al reactivar, se quita el ban y activo=true.
-- Aquí dejamos además estos helpers por si se quieren usar en políticas RLS de
-- otras tablas (p.ej. exigir estoy_activo() en operaciones sensibles).

-- 7) Asegurar que Alejandro es superadmin activo (ajusta el email si procede)
update public.perfiles p
set rol = 'superadmin', activo = true
from auth.users u
where p.id = u.id and u.email = 'alejandro@tuconsultor.com';


-- ══════════════ migracion-v36-fix-cliente-tareas-cache.sql ══════════════

-- =============================================================================
-- CONSULTIFY · Reparación v36 · Columnas de cliente_tareas + recarga de schema
-- -----------------------------------------------------------------------------
-- Soluciona: "Could not find the 'bloques_ejecucion' column of 'cliente_tareas'
-- in the schema cache" al distribuir la agenda.
--
-- Causa: la columna no existe en la BD (migración v21 no ejecutada) o PostgREST
-- tiene el schema cache desactualizado. Este script es IDEMPOTENTE: se puede
-- ejecutar tantas veces como haga falta sin romper nada.
--
-- Cómo ejecutarlo: Supabase → SQL Editor → pega esto → Run.
-- =============================================================================

begin;

-- 1) Asegurar TODAS las columnas jsonb/flags que usa la distribución de agenda.
--    (add column if not exists no falla si ya existen.)
alter table public.cliente_tareas
  add column if not exists bloques_ejecucion jsonb not null default '[]'::jsonb;

alter table public.cliente_tareas
  add column if not exists seguimientos jsonb not null default '[]'::jsonb;

alter table public.cliente_tareas
  add column if not exists normas_integradas jsonb not null default '[]'::jsonb;

alter table public.cliente_tareas
  add column if not exists editada_manual boolean not null default false;

-- Columnas de fecha/estado que el insert también usa (por si acaso faltara alguna):
alter table public.cliente_tareas
  add column if not exists fecha_estimada date;
alter table public.cliente_tareas
  add column if not exists fecha_real date;
alter table public.cliente_tareas
  add column if not exists hecha boolean not null default false;

comment on column public.cliente_tareas.bloques_ejecucion is
  'Bloques de ejecución [{"fecha":"YYYY-MM-DD","horas":4}]. Una tarea de 20h = 5 bloques.';

commit;

-- 2) Verificación rápida: lista las columnas actuales de cliente_tareas.
--    (Deberías ver bloques_ejecucion, seguimientos, normas_integradas, etc.)
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'cliente_tareas'
order by ordinal_position;

-- 3) Forzar la recarga del schema cache de PostgREST.
--    El NOTIFY es la vía oficial; si el cache siguiera obsoleto tras esto,
--    ve a Supabase → Settings → API → "Restart server" / "Reload schema",
--    o Database → Extensions y guarda para provocar un reload.
notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');


-- ══════════════ migracion-v37-procesos-internos.sql ══════════════

-- =============================================================================
-- CONSULTIFY · Migración v37
-- 1) Catálogo de procesos internos (editable desde el portal)
-- 2) Tipo 'proceso_interno' en cliente_tareas + vínculo al proceso interno
-- 3) Colaboradores invitados en tareas (gestión manual)
-- =============================================================================

begin;

-- ── 1 · Catálogo de procesos internos ────────────────────────────────────────
-- Procesos de trabajo internos de la consultora (no ligados a un cliente):
-- p.ej. "Reunión de equipo", "Formación interna", "Mejora de plantillas", etc.
create table if not exists public.procesos_internos (
  id          uuid primary key default gen_random_uuid(),
  creado_en   timestamptz not null default now(),
  codigo      text unique,                    -- opcional, p.ej. 'PI-FORM'
  nombre      text not null,
  descripcion text,
  color       text default '#0A2A6C',         -- para pintarlo en el calendario
  activo      boolean not null default true,
  orden       int default 100,
  creado_por  uuid references auth.users(id) on delete set null
);

create index if not exists idx_procesos_internos_activo on public.procesos_internos (activo, orden);

-- Semilla mínima (puedes editarla o borrarla desde el portal)
insert into public.procesos_internos (nombre, codigo, descripcion, orden) values
  ('Reunión de equipo',        'PI-REU',  'Reuniones internas del equipo de consultoría', 10),
  ('Formación interna',        'PI-FORM', 'Formación y desarrollo del equipo', 20),
  ('Mejora de metodología',    'PI-MET',  'Mejora de plantillas, procesos y herramientas internas', 30),
  ('Comercial / propuestas',   'PI-COM',  'Preparación de ofertas y actividad comercial no facturable', 40),
  ('Administración interna',   'PI-ADM',  'Tareas administrativas y de gestión propias', 50)
on conflict (codigo) do nothing;

-- ── 2 · cliente_tareas: soportar 'proceso_interno' ──────────────────────────
-- La columna 'tipo' ya existe; añadimos el vínculo opcional al proceso interno.
-- Cuando tipo='proceso_interno', proyecto_id/cliente_id pueden ir a NULL y en su
-- lugar se rellena proceso_interno_id.
alter table public.cliente_tareas
  add column if not exists proceso_interno_id uuid references public.procesos_internos(id) on delete set null;

-- ── 3 · Colaboradores invitados a una tarea (gestión manual) ────────────────
-- Lista de perfiles internos invitados a colaborar en una tarea concreta.
alter table public.cliente_tareas
  add column if not exists colaboradores jsonb not null default '[]'::jsonb;
comment on column public.cliente_tareas.colaboradores is
  'IDs/estructura de colaboradores invitados: [{"id":"<uuid>","nombre":"...","email":"..."}]';

commit;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.procesos_internos enable row level security;

-- Equipo interno (no cliente) puede leer el catálogo.
drop policy if exists procesos_internos_select on public.procesos_internos;
create policy procesos_internos_select on public.procesos_internos
  for select to authenticated
  using (public.mi_rol() in ('superadmin','admin','consultor','gestion'));

-- Solo superadmin/admin pueden crear/editar/borrar procesos internos.
drop policy if exists procesos_internos_write on public.procesos_internos;
create policy procesos_internos_write on public.procesos_internos
  for all to authenticated
  using (public.mi_rol() in ('superadmin','admin'))
  with check (public.mi_rol() in ('superadmin','admin'));

grant select, insert, update, delete on public.procesos_internos to authenticated;

-- Recargar el schema cache de PostgREST
notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');


-- ══════════════ migracion-v38-agenda-procesos-colaboradores.sql ══════════════

-- =============================================================================
-- CONSULTIFY · Migración v38
-- Las tareas MANUALES de la agenda se guardan en 'agenda_tareas'. Al añadir el
-- tipo 'proceso_interno' y los colaboradores, el modal intenta escribir estas
-- columnas en agenda_tareas, pero solo existían en cliente_tareas → el guardado
-- fallaba con "No se pudo guardar la tarea".
-- Esta migración añade esas columnas a agenda_tareas. Idempotente.
-- =============================================================================

begin;

alter table public.agenda_tareas
  add column if not exists proceso_interno_id uuid references public.procesos_internos(id) on delete set null;

alter table public.agenda_tareas
  add column if not exists colaboradores jsonb not null default '[]'::jsonb;

comment on column public.agenda_tareas.colaboradores is
  'Colaboradores invitados a la tarea: [{"id":"<uuid>","nombre":"...","email":"..."}]';

commit;

-- Recargar el schema cache de PostgREST
notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');


-- ══════════════ migracion-v39-rol-director-reset.sql ══════════════

-- =============================================================================
-- CONSULTIFY · Migración v39
--   1) Nuevo rol 'director' (Director de Proyecto), separado de 'consultor'
--   2) Reset de usuarios: elimina TODOS menos alejandro@tuconsultor.com
--   3) Políticas que daban acceso a 'consultor' ahora también a 'director'
--
-- ⚠️ EL PASO 2 ES IRREVERSIBLE. Borra usuarios de auth y sus perfiles.
--    Ejecuta con conocimiento de causa. Haz copia de seguridad si dudas.
-- =============================================================================

begin;

-- ── 1 · Ampliar el check de roles para incluir 'director' ───────────────────
alter table public.perfiles drop constraint if exists perfiles_rol_check;
alter table public.perfiles add constraint perfiles_rol_check
  check (rol in ('cliente','consultor','director','gestion','admin','superadmin'));

commit;

-- ── 2 · RESET DE USUARIOS: eliminar todos menos Alejandro ───────────────────
-- Borrar de auth.users dispara el borrado en cascada de public.perfiles
-- (perfiles.id referencia auth.users con on delete cascade en el esquema).
-- Si tu FK no fuese en cascada, el segundo delete limpia los perfiles huérfanos.
delete from auth.users
where email <> 'alejandro@tuconsultor.com';

-- Por si quedara algún perfil sin usuario asociado:
delete from public.perfiles
where id not in (select id from auth.users);

-- Asegurar que Alejandro es superadmin activo tras el reset.
update public.perfiles p
set rol = 'superadmin', activo = true
from auth.users u
where p.id = u.id and u.email = 'alejandro@tuconsultor.com';

-- ── 3 · Políticas: 'director' obtiene el mismo acceso que 'consultor' ───────
-- Recreamos automáticamente toda política cuya expresión mencione el rol
-- 'consultor', añadiendo 'director' al mismo listado. Es seguro e idempotente:
-- reconstruye la política con la expresión equivalente + director.
do $$
declare
  pol record;
  nueva_using text;
  nueva_check text;
begin
  for pol in
    select schemaname, tablename, policyname, cmd, roles, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual,'') like '%''consultor''%' or coalesce(with_check,'') like '%''consultor''%')
      and coalesce(qual,'') not like '%''director''%'
      and coalesce(with_check,'') not like '%''director''%'
  loop
    -- Sustituye la lista in ('consultor'...) por la misma + 'director'
    nueva_using := replace(coalesce(pol.qual,''), '''consultor''', '''consultor'',''director''');
    nueva_check := replace(coalesce(pol.with_check,''), '''consultor''', '''consultor'',''director''');

    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);

    if pol.cmd = 'SELECT' then
      execute format('create policy %I on public.%I for select using (%s)',
        pol.policyname, pol.tablename, nueva_using);
    elsif pol.cmd = 'INSERT' then
      execute format('create policy %I on public.%I for insert with check (%s)',
        pol.policyname, pol.tablename, coalesce(nullif(nueva_check,''), nueva_using));
    elsif pol.cmd = 'UPDATE' then
      execute format('create policy %I on public.%I for update using (%s) with check (%s)',
        pol.policyname, pol.tablename, nueva_using, coalesce(nullif(nueva_check,''), nueva_using));
    elsif pol.cmd = 'DELETE' then
      execute format('create policy %I on public.%I for delete using (%s)',
        pol.policyname, pol.tablename, nueva_using);
    else -- ALL
      execute format('create policy %I on public.%I for all using (%s) with check (%s)',
        pol.policyname, pol.tablename, nueva_using, coalesce(nullif(nueva_check,''), nueva_using));
    end if;

    raise notice 'Política actualizada con director: %.%', pol.tablename, pol.policyname;
  end loop;
end $$;

-- ── 4 · Recargar el schema cache ────────────────────────────────────────────
notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');

-- ── 5 · COMPROBACIÓN ────────────────────────────────────────────────────────
-- Debe quedar SOLO Alejandro, con rol superadmin.
select u.email, p.rol, p.activo
from auth.users u
left join public.perfiles p on p.id = u.id
order by u.email;


-- ══════════════ migracion-v40b-reset-equipo-fk.sql ══════════════

-- =============================================================================
-- CONSULTIFY · Reset del EQUIPO (consultores) — versión que resuelve las FK
-- -----------------------------------------------------------------------------
-- Error que corrige:
--   "update or delete on table consultores violates foreign key constraint
--    clientes_consultor_1_id_fkey on table clientes"
--
-- Causa: varias columnas (clientes.consultor_1_id, consultor_2_id, etc.) apuntan
-- a consultores SIN 'on delete set null', así que Postgres bloquea el borrado.
--
-- Solución: antes de borrar, ponemos a NULL automáticamente TODAS las columnas
-- de CUALQUIER tabla que referencien a los consultores que vamos a eliminar.
-- Luego borramos el equipo y dejamos solo la ficha de Alejandro.
--
-- Ejecuta este bloque tal cual. Es idempotente.
-- =============================================================================

do $$
declare
  fk record;
  ale_id uuid;
begin
  -- id de la ficha de consultor de Alejandro, si existe, para conservarla.
  select c.id into ale_id
  from public.consultores c
  join auth.users u on u.id = c.user_id
  where u.email = 'alejandro@tuconsultor.com'
  limit 1;

  -- Recorre TODAS las claves foráneas que apuntan a public.consultores y pone a
  -- NULL esas columnas en las filas que referencian a un consultor que NO es el
  -- de Alejandro (o todas, si Alejandro aún no tiene ficha).
  for fk in
    select
      con.conrelid::regclass  as tabla_origen,
      att.attname             as columna
    from pg_constraint con
    join pg_attribute att
      on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
    where con.confrelid = 'public.consultores'::regclass
      and con.contype = 'f'
  loop
    begin
      if ale_id is null then
        execute format('update %s set %I = null where %I is not null',
                       fk.tabla_origen, fk.columna, fk.columna);
      else
        execute format('update %s set %I = null where %I is not null and %I <> %L',
                       fk.tabla_origen, fk.columna, fk.columna, fk.columna, ale_id);
      end if;
      raise notice 'Desvinculado: %.% ', fk.tabla_origen, fk.columna;
    exception when others then
      raise notice 'No se pudo desvincular %.% (%);', fk.tabla_origen, fk.columna, sqlerrm;
    end;
  end loop;

  -- Ahora sí: borrar todos los consultores menos el de Alejandro.
  if ale_id is null then
    delete from public.consultores;
  else
    delete from public.consultores where id <> ale_id;
  end if;
end $$;

-- Si Alejandro NO tenía ficha de consultor, crearla ahora vinculada a su login.
insert into public.consultores (nombre, nivel, normas, capacidad_clientes, activo, user_id)
select 'Alejandro', 'Senior', '{}', 12, true, u.id
from auth.users u
where u.email = 'alejandro@tuconsultor.com'
  and not exists (
    select 1 from public.consultores c where c.user_id = u.id
  );

-- Comprobación: debe quedar SOLO Alejandro en el equipo.
select nombre, nivel, activo from public.consultores order by nombre;


-- ══════════════ migracion-v40-reset-completo.sql ══════════════

-- =============================================================================
-- CONSULTIFY · Migración v40 · RESET COMPLETO A CERO + gate de políticas
-- -----------------------------------------------------------------------------
-- Deja SOLO a Alejandro, tanto en accesos (perfiles/auth) como en el equipo
-- de la agenda (tabla consultores). Añade el campo para exigir aceptar las
-- políticas de seguridad y confidencialidad en el primer login.
--
-- ⚠️ IRREVERSIBLE. Haz copia de seguridad si tienes dudas.
--    Cambia el email si el tuyo no es alejandro@tuconsultor.com.
-- =============================================================================

-- ── 0 · Parámetro: tu email de superadmin ───────────────────────────────────
-- (se usa en todos los pasos; edítalo aquí una sola vez si hace falta)

begin;

-- ── 1 · Rol 'director' permitido + campo de políticas en perfiles ───────────
alter table public.perfiles drop constraint if exists perfiles_rol_check;
alter table public.perfiles add constraint perfiles_rol_check
  check (rol in ('cliente','consultor','director','gestion','admin','superadmin'));

alter table public.perfiles
  add column if not exists politicas_aceptadas_en timestamptz;

commit;

-- ── 2 · RESET DE ACCESOS: borrar todos los usuarios menos Alejandro ─────────
-- Borrar auth.users cae en cascada sobre perfiles (FK on delete cascade).
delete from auth.users
where email <> 'alejandro@tuconsultor.com';

-- Limpieza de perfiles huérfanos por si alguna FK no fuese en cascada.
delete from public.perfiles
where id not in (select id from auth.users);

-- Alejandro = superadmin activo.
update public.perfiles p
set rol = 'superadmin', activo = true
from auth.users u
where p.id = u.id and u.email = 'alejandro@tuconsultor.com';

-- ── 3 · RESET DEL EQUIPO DE AGENDA (tabla consultores) ──────────────────────
-- Varias columnas (clientes.consultor_1_id, consultor_2_id, etc.) apuntan a
-- consultores SIN 'on delete set null', lo que bloquearía el borrado. Antes de
-- borrar, ponemos a NULL automáticamente TODA columna que referencie a los
-- consultores que se van a eliminar. Luego borramos y dejamos solo a Alejandro.
do $$
declare fk record; ale_id uuid;
begin
  select c.id into ale_id
  from public.consultores c
  join auth.users u on u.id = c.user_id
  where u.email = 'alejandro@tuconsultor.com' limit 1;

  for fk in
    select con.conrelid::regclass as tabla_origen, att.attname as columna
    from pg_constraint con
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
    where con.confrelid = 'public.consultores'::regclass and con.contype = 'f'
  loop
    begin
      if ale_id is null then
        execute format('update %s set %I = null where %I is not null', fk.tabla_origen, fk.columna, fk.columna);
      else
        execute format('update %s set %I = null where %I is not null and %I <> %L', fk.tabla_origen, fk.columna, fk.columna, fk.columna, ale_id);
      end if;
    exception when others then
      raise notice 'No se pudo desvincular %.% (%);', fk.tabla_origen, fk.columna, sqlerrm;
    end;
  end loop;

  if ale_id is null then
    delete from public.consultores;
  else
    delete from public.consultores where id <> ale_id;
  end if;
end $$;

-- Crear la ficha de Alejandro si no existía (vinculada a su usuario).
insert into public.consultores (nombre, nivel, normas, capacidad_clientes, activo, user_id)
select 'Alejandro', 'Senior', '{}', 12, true, u.id
from auth.users u
where u.email = 'alejandro@tuconsultor.com'
  and not exists (select 1 from public.consultores c where c.user_id = u.id);

-- ── 4 · Políticas RLS: 'director' hereda el acceso de 'consultor' ───────────
do $$
declare pol record; nueva_using text; nueva_check text;
begin
  for pol in
    select schemaname, tablename, policyname, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual,'') like '%''consultor''%' or coalesce(with_check,'') like '%''consultor''%')
      and coalesce(qual,'') not like '%''director''%'
      and coalesce(with_check,'') not like '%''director''%'
  loop
    nueva_using := replace(coalesce(pol.qual,''), '''consultor''', '''consultor'',''director''');
    nueva_check := replace(coalesce(pol.with_check,''), '''consultor''', '''consultor'',''director''');
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
    if pol.cmd = 'SELECT' then
      execute format('create policy %I on public.%I for select using (%s)', pol.policyname, pol.tablename, nueva_using);
    elsif pol.cmd = 'INSERT' then
      execute format('create policy %I on public.%I for insert with check (%s)', pol.policyname, pol.tablename, coalesce(nullif(nueva_check,''), nueva_using));
    elsif pol.cmd = 'UPDATE' then
      execute format('create policy %I on public.%I for update using (%s) with check (%s)', pol.policyname, pol.tablename, nueva_using, coalesce(nullif(nueva_check,''), nueva_using));
    elsif pol.cmd = 'DELETE' then
      execute format('create policy %I on public.%I for delete using (%s)', pol.policyname, pol.tablename, nueva_using);
    else
      execute format('create policy %I on public.%I for all using (%s) with check (%s)', pol.policyname, pol.tablename, nueva_using, coalesce(nullif(nueva_check,''), nueva_using));
    end if;
  end loop;
end $$;

-- ── 5 · RPC para que el usuario marque que aceptó las políticas ─────────────
create or replace function public.aceptar_politicas()
returns void language sql security definer set search_path = public as $$
  update public.perfiles set politicas_aceptadas_en = now() where id = auth.uid();
$$;
grant execute on function public.aceptar_politicas() to authenticated;

-- ── 6 · Recargar cache ──────────────────────────────────────────────────────
notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');

-- ── 7 · COMPROBACIÓN: en ambas tablas debe quedar SOLO Alejandro ────────────
select 'ACCESOS (perfiles)' as tabla, u.email as nombre, p.rol as detalle,
       p.activo::text as activo, p.politicas_aceptadas_en::text as extra
from auth.users u left join public.perfiles p on p.id = u.id
union all
select 'EQUIPO (consultores)' as tabla, c.nombre, c.nivel,
       c.activo::text, null::text
from public.consultores c
order by tabla, nombre;


-- ══════════════ migracion-v41-holded-vinculacion.sql ══════════════

-- =============================================================================
-- CONSULTIFY · Migración v41 · Vinculación con Holded
-- Añade a 'clientes' los campos para enlazar cada cliente con su contacto de
-- Holded. El vínculo se hace por CIF (columna 'code' del contacto en Holded).
-- =============================================================================

begin;

alter table public.clientes
  add column if not exists holded_id text;             -- id interno del contacto en Holded
alter table public.clientes
  add column if not exists holded_sincronizado_en timestamptz; -- última sincronización
alter table public.clientes
  add column if not exists cif_matriz text;            -- CIF de la empresa matriz (identificador visible)

comment on column public.clientes.holded_id is 'ID del contacto correspondiente en Holded (para sincronización)';
comment on column public.clientes.cif_matriz is 'CIF de la empresa matriz; identificador de negocio del cliente';

-- Índice para buscar rápido por CIF (evita duplicados al sincronizar).
create index if not exists idx_clientes_cif on public.clientes (cif);
create index if not exists idx_clientes_holded on public.clientes (holded_id);

commit;

notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');


-- ══════════════ migracion-v42-unificar-equipo-accesos.sql ══════════════

-- =============================================================================
-- CONSULTIFY · Migración v42 · Unificar EQUIPO y ACCESOS
-- -----------------------------------------------------------------------------
-- Decisión: "usar solo acceso". El equipo de la agenda pasa a derivarse de los
-- PERFILES con acceso. La tabla 'consultores' se sustituye por una VISTA sobre
-- 'perfiles', de modo que el código de la app (listTable('consultores')) sigue
-- funcionando sin cambios, pero la fuente única de verdad es 'perfiles'.
--
-- ⚠️ Requiere haber hecho el reset (solo Alejandro). Si tienes consultores con
--    datos que conservar, migra primero sus datos a perfiles.
-- =============================================================================

begin;

-- ── 1 · Campos de agenda en perfiles ────────────────────────────────────────
alter table public.perfiles add column if not exists nivel text
  check (nivel is null or nivel in ('J1','J2','J3','Senior'));
alter table public.perfiles add column if not exists normas text[] not null default '{}';
alter table public.perfiles add column if not exists capacidad_clientes int not null default 12;
alter table public.perfiles add column if not exists apellidos text;

-- ── 2 · Migrar referencias de clientes: consultores.id → perfiles.id ────────
-- Las columnas de clientes que apuntan a consultores deben pasar a apuntar a
-- perfiles. Como el equipo está vacío salvo Alejandro, ponemos a NULL las
-- referencias colgantes (se reasignarán al recrear el equipo) y quitamos las FK
-- antiguas hacia consultores para poder sustituir la tabla por una vista.
do $$
declare fk record;
begin
  for fk in
    select con.conname, con.conrelid::regclass as tabla
    from pg_constraint con
    where con.confrelid = 'public.consultores'::regclass and con.contype = 'f'
  loop
    execute format('alter table %s drop constraint if exists %I', fk.tabla, fk.conname);
    raise notice 'FK eliminada: % en %', fk.conname, fk.tabla;
  end loop;
end $$;

-- ── 3 · Sustituir la tabla consultores por una VISTA sobre perfiles ─────────
-- Guardamos el nombre viejo por si hay que revertir.
alter table if exists public.consultores rename to consultores_old_backup;

-- Vista: equipo = perfiles con rol de equipo y activos. El id de la vista es el
-- id del perfil (= id de auth.users), así todo lo que enlace por id sigue igual.
create or replace view public.consultores as
select
  p.id,
  coalesce(p.nombre, split_part(p.email, '@', 1)) as nombre,
  p.apellidos,
  coalesce(p.nivel, 'Senior') as nivel,
  p.normas,
  p.capacidad_clientes,
  p.activo,
  p.id as user_id,
  p.rol,
  p.email
from public.perfiles p
where p.rol in ('director','consultor','admin','superadmin')
  and p.activo = true;

-- Permisos de lectura de la vista.
grant select on public.consultores to authenticated, anon;

commit;

-- ── 4 · Recargar cache ──────────────────────────────────────────────────────
notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');

-- ── 5 · COMPROBACIÓN ────────────────────────────────────────────────────────
-- El equipo (vista) debe mostrar exactamente los perfiles con acceso de equipo.
select id, nombre, nivel, rol, activo from public.consultores order by nombre;


-- ══════════════ migracion-v43-semaforo-cobros.sql ══════════════

-- =============================================================================
-- CONSULTIFY · Migración v43 · Semáforo de cobros (facturas Holded)
-- Añade a 'clientes' el estado de cobros calculado desde Holded (1 vez/día).
--   estado_cobros: 'verde' | 'amarillo' | 'rojo' | null (sin datos)
--   cobros_actualizado_en: cuándo se consultó por última vez
--   cobros_detalle: resumen (nº vencidas, nº pendientes, importe)
-- =============================================================================

begin;

alter table public.clientes add column if not exists estado_cobros text
  check (estado_cobros is null or estado_cobros in ('verde','amarillo','rojo'));
alter table public.clientes add column if not exists cobros_actualizado_en timestamptz;
alter table public.clientes add column if not exists cobros_detalle jsonb;

comment on column public.clientes.estado_cobros is 'Semáforo de cobros desde Holded: verde=al día, amarillo=pendientes no vencidas, rojo=vencidas';

commit;

notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');


-- ══════════════ migracion-v44-contacto-brevo.sql ══════════════

-- =============================================================================
-- CONSULTIFY · Migración v44 · Contacto separado (nombre/apellidos) + Brevo
--   - contacto_apellidos: apellidos del contacto (el campo 'contacto' pasa a ser
--     el nombre de pila; se conserva para compatibilidad).
--   - brevo_id / brevo_sincronizado_en: vínculo con el contacto en Brevo.
-- =============================================================================

begin;

alter table public.clientes add column if not exists contacto_apellidos text;
alter table public.clientes add column if not exists brevo_id text;
alter table public.clientes add column if not exists brevo_sincronizado_en timestamptz;

comment on column public.clientes.contacto is 'Nombre de pila del contacto principal';
comment on column public.clientes.contacto_apellidos is 'Apellidos del contacto principal';

commit;

notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');


-- ══════════════ migracion-v45-blog.sql ══════════════

-- =============================================================================
-- CONSULTIFY · Migración v45 · Blog público (publicación automática por fecha)
-- -----------------------------------------------------------------------------
-- Tabla blog_posts. La publicación automática se logra con la política RLS de
-- SELECT: un post solo es visible cuando su fecha_publicacion <= hoy y no es
-- borrador. Así, sin cron ni funciones, el post del día 13 aparece el día 13.
-- =============================================================================

begin;

create table if not exists public.blog_posts (
  id                bigint generated by default as identity primary key,
  slug              text unique not null,
  titulo            text,
  extracto          text,
  contenido_html    text,
  cta               text,
  pilar             text,
  autor             text default 'TuConsultor',
  fecha_publicacion date not null,
  estado            text default 'programado',
  tags              text[],
  creado_en         timestamptz default now()
);

create index if not exists idx_blog_posts_fecha on public.blog_posts (fecha_publicacion desc);
create index if not exists idx_blog_posts_slug on public.blog_posts (slug);

-- ── RLS: solo posts ya publicados (fecha <= hoy) y no borradores ────────────
alter table public.blog_posts enable row level security;

-- La política NO consulta auth.users (esquema protegido). Solo compara fechas
-- y estado, así que vale igual para anónimos y autenticados.
drop policy if exists blog_posts_select_publicos on public.blog_posts;
create policy blog_posts_select_publicos on public.blog_posts
  for select
  to anon, authenticated
  using (fecha_publicacion <= current_date and estado <> 'borrador');

-- Grants explícitos de lectura.
grant select on public.blog_posts to anon, authenticated;

commit;

-- Recargar cache de PostgREST.
notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');


-- ══════════════ migracion-v46-borrar-ofertas.sql ══════════════

-- =============================================================================
-- CONSULTIFY · Migración v46 · Eliminar ofertas (solo administradores)
-- -----------------------------------------------------------------------------
-- Sin política de DELETE, la RLS bloquea cualquier borrado. Añadimos una que
-- permite eliminar ofertas ÚNICAMENTE a superadmin y admin.
--
-- Nota de seguridad: la protección real vive aquí (base de datos). Ocultar el
-- botón en la interfaz no basta; esta política impide el borrado por API a
-- cualquiera que no sea administrador.
-- =============================================================================

begin;

drop policy if exists presupuestos_delete_admin on public.presupuestos;

create policy presupuestos_delete_admin on public.presupuestos
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.perfiles p
      where p.id = auth.uid()
        and p.activo
        and p.rol in ('superadmin', 'admin')
    )
  );

commit;

notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');


-- ══════════════ migracion-v47-borrar-clientes.sql ══════════════

-- =============================================================================
-- CONSULTIFY · Migración v47 · Eliminar clientes (solo administradores)
-- -----------------------------------------------------------------------------
-- Igual que con las ofertas: sin política de DELETE la RLS bloquea el borrado.
-- Permitimos eliminar clientes solo a superadmin y admin.
-- =============================================================================

begin;

drop policy if exists clientes_delete_admin on public.clientes;

create policy clientes_delete_admin on public.clientes
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.perfiles p
      where p.id = auth.uid()
        and p.activo
        and p.rol in ('superadmin', 'admin')
    )
  );

commit;

notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');


-- ══════════════ migracion-v48-empresas-contactos.sql ══════════════

-- =============================================================================
-- CONSULTIFY · Migración v48 · Modelo CRM: Empresas + Contactos (FASE 1)
-- -----------------------------------------------------------------------------
-- Crea el nuevo modelo de datos SIN tocar la tabla 'clientes' existente.
-- Todo lo viejo sigue funcionando; estas tablas conviven hasta que la Fase 3
-- redirija proyectos/ofertas/cobros al nuevo modelo.
--
--   empresas            → organizaciones (cliente / proveedor / ambos)
--   contactos           → personas (lista propia; se sincronizan a Brevo)
--   empresa_contactos   → puente N:M (un contacto puede estar en varias empresas)
--
-- Después copia (NO mueve) los datos actuales de 'clientes':
--   cada cliente  → una empresa tipo 'cliente'
--   su contacto/email/teléfono → primer contacto vinculado a esa empresa
-- =============================================================================

begin;

-- ---------- 1 · EMPRESAS ----------
create table if not exists public.empresas (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  cif           text,
  es_cliente    boolean not null default false,
  es_proveedor  boolean not null default false,
  direccion     text,
  codigo        text,                         -- código interno tipo CL-0001 (si aplica)
  holded_id     text,                         -- vínculo con Holded (si viene de ahí)
  cliente_id_old uuid,                        -- traza al registro original en 'clientes'
  notas         text,
  creado        timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists empresas_cif_idx on public.empresas (cif);
create index if not exists empresas_tipo_idx on public.empresas (es_cliente, es_proveedor);

-- ---------- 2 · CONTACTOS ----------
create table if not exists public.contactos (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null default '',
  apellidos        text,
  cargo            text,
  email            text,
  telefono         text,
  -- Consentimiento RGPD para comunicaciones comerciales (marketing / blog):
  consentimiento_marketing boolean not null default false,
  consentimiento_fecha     timestamptz,
  -- Sincronización con Brevo:
  brevo_id                 text,
  brevo_sincronizado_en    timestamptz,
  notas            text,
  creado           timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists contactos_email_idx on public.contactos (email);

-- ---------- 3 · PUENTE empresa ↔ contacto (N:M) ----------
create table if not exists public.empresa_contactos (
  id           uuid primary key default gen_random_uuid(),
  empresa_id   uuid not null references public.empresas(id) on delete cascade,
  contacto_id  uuid not null references public.contactos(id) on delete cascade,
  cargo        text,                          -- cargo del contacto EN esa empresa concreta
  principal    boolean not null default false,-- contacto principal de la empresa
  creado       timestamptz default now(),
  unique (empresa_id, contacto_id)
);
create index if not exists empresa_contactos_empresa_idx on public.empresa_contactos (empresa_id);
create index if not exists empresa_contactos_contacto_idx on public.empresa_contactos (contacto_id);

-- =============================================================================
-- 4 · COPIA de datos desde 'clientes' (idempotente y SIN ambigüedad)
--     Estrategia segura: cada cliente genera EXACTAMENTE una empresa, un contacto
--     y un vínculo. La traza cliente_id_old garantiza que no se duplica al
--     re-ejecutar. La deduplicación de contactos que comparten email se deja
--     como paso posterior opcional (script aparte), para no arriesgar aquí.
-- =============================================================================

-- 4.1 · Cada cliente → una empresa tipo 'cliente'
--        (la tabla 'clientes' no tiene columna 'direccion', así que la empresa
--         se crea sin dirección; se podrá rellenar luego desde la ficha.)
insert into public.empresas (nombre, cif, es_cliente, es_proveedor, codigo, holded_id, cliente_id_old, creado)
select
  c.empresa,
  coalesce(c.cif_matriz, c.cif),
  true, false,
  c.codigo, c.holded_id,
  c.id, c.creado
from public.clientes c
where not exists (select 1 from public.empresas e where e.cliente_id_old = c.id);

-- 4.2 · Un contacto por cliente, con traza al vínculo mediante la empresa.
--        Usamos un identificador estable: el email o, si falta, el propio cif.
--        Guardamos la traza en empresa_contactos.cargo temporalmente NO; en su
--        lugar detectamos duplicados por la relación empresa↔contacto ya creada.
with clientes_sin_migrar as (
  select c.*
  from public.clientes c
  join public.empresas e on e.cliente_id_old = c.id
  where not exists (
    select 1 from public.empresa_contactos ec where ec.empresa_id = e.id
  )
)
insert into public.contactos (nombre, apellidos, email, telefono, brevo_id, brevo_sincronizado_en, creado)
select
  coalesce(nullif(trim(csm.contacto), ''), csm.empresa),
  csm.contacto_apellidos,
  csm.email,
  csm.telefono,
  csm.brevo_id,
  csm.brevo_sincronizado_en,
  csm.creado
from clientes_sin_migrar csm;

-- 4.3 · Vincular: emparejamos por orden de creación empresa↔contacto recién hechos.
--        Como cada cliente sin migrar generó justo un contacto en 4.2, los unimos
--        por la clave natural (empresa del cliente + datos del contacto).
insert into public.empresa_contactos (empresa_id, contacto_id, principal)
select distinct on (e.id) e.id, ct.id, true
from public.clientes c
join public.empresas e on e.cliente_id_old = c.id
join public.contactos ct
  on ct.email is not distinct from c.email
 and ct.nombre = coalesce(nullif(trim(c.contacto), ''), c.empresa)
 and ct.telefono is not distinct from c.telefono
where not exists (
  select 1 from public.empresa_contactos ec where ec.empresa_id = e.id
)
order by e.id, ct.creado;

commit;

-- =============================================================================
-- 5 · RLS · lectura/escritura para el equipo (no clientes)
-- =============================================================================
alter table public.empresas          enable row level security;
alter table public.contactos         enable row level security;
alter table public.empresa_contactos enable row level security;

-- Lectura para cualquier usuario autenticado del equipo
drop policy if exists empresas_select on public.empresas;
create policy empresas_select on public.empresas for select to authenticated using (true);
drop policy if exists contactos_select on public.contactos;
create policy contactos_select on public.contactos for select to authenticated using (true);
drop policy if exists empresa_contactos_select on public.empresa_contactos;
create policy empresa_contactos_select on public.empresa_contactos for select to authenticated using (true);

-- Escritura (insert/update/delete) para roles del equipo
do $$
declare t text;
begin
  foreach t in array array['empresas','contactos','empresa_contactos'] loop
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format($f$
      create policy %I_write on public.%I for all to authenticated
      using (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo
                     and p.rol in ('superadmin','admin','consultor','gestion')))
      with check (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo
                     and p.rol in ('superadmin','admin','consultor','gestion')))
    $f$, t, t);
  end loop;
end $$;

notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');

-- =============================================================================
-- 6 · VERIFICACIÓN (ejecuta estas consultas tras la migración)
-- =============================================================================
-- select count(*) as empresas from public.empresas;
-- select count(*) as contactos from public.contactos;
-- select count(*) as vinculos from public.empresa_contactos;
-- -- Deben coincidir aprox. con el nº de clientes que tenías.


-- ══════════════ migracion-v49-mapa-procesos.sql ══════════════

-- =============================================================================
-- CONSULTIFY · Migración v49 · Mapa de procesos (bandas + subprocesos)
-- -----------------------------------------------------------------------------
-- Amplía procesos_internos para poder pintar un mapa por bandas:
--   banda: 'estrategico' | 'clave' | 'soporte'
--   orden: ya existía (posición dentro de la banda)
-- Crea procesos_subprocesos (subprocesos dentro de cada proceso).
-- Siembra procesos de ejemplo típicos de una consultora (idempotente por código).
-- =============================================================================

begin;

-- 1 · Campo banda en procesos_internos
alter table public.procesos_internos
  add column if not exists banda text not null default 'clave'
  check (banda in ('estrategico', 'clave', 'soporte'));

alter table public.procesos_internos
  add column if not exists responsable text;

-- 2 · Subprocesos
create table if not exists public.procesos_subprocesos (
  id          uuid primary key default gen_random_uuid(),
  proceso_id  uuid not null references public.procesos_internos(id) on delete cascade,
  codigo      text,
  nombre      text not null default '',
  responsable text,
  orden       int default 100,
  creado_en   timestamptz default now()
);
create index if not exists procesos_subprocesos_proc_idx on public.procesos_subprocesos (proceso_id);

alter table public.procesos_subprocesos enable row level security;
drop policy if exists procesos_subprocesos_select on public.procesos_subprocesos;
create policy procesos_subprocesos_select on public.procesos_subprocesos
  for select to authenticated using (true);
drop policy if exists procesos_subprocesos_write on public.procesos_subprocesos;
create policy procesos_subprocesos_write on public.procesos_subprocesos
  for all to authenticated
  using (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo
                 and p.rol in ('superadmin','admin','consultor','gestion')))
  with check (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo
                 and p.rol in ('superadmin','admin','consultor','gestion')));

-- 3 · Procesos de ejemplo (solo se insertan si no existe ese código)
insert into public.procesos_internos (codigo, nombre, banda, responsable, orden, color)
values
  -- Estratégicos
  ('PE-DIR', 'Dirección y estrategia',        'estrategico', 'Dirección',        10, '#061B45'),
  ('PE-COM', 'Comercial y captación',         'estrategico', 'Jefe de cuenta',   20, '#061B45'),
  ('PE-MEJ', 'Mejora e innovación',           'estrategico', 'Calidad',          30, '#061B45'),
  -- Clave
  ('PC-OFE', 'Elaboración de ofertas',        'clave',       'Comercial',        10, '#0A2A6C'),
  ('PC-PROY','Ejecución de proyectos',        'clave',       'Director de proyecto', 20, '#0A2A6C'),
  ('PC-AUD', 'Auditoría y certificación',     'clave',       'Consultor',        30, '#0A2A6C'),
  ('PC-SEG', 'Seguimiento al cliente',        'clave',       'Director de proyecto', 40, '#0A2A6C'),
  -- Soporte
  ('PS-RRHH','Personas y formación',          'soporte',     'Administración',   10, '#F5A623'),
  ('PS-IT',  'Sistemas y tecnología',         'soporte',     'IT',               20, '#F5A623'),
  ('PS-ADM', 'Administración y finanzas',     'soporte',     'Administración',   30, '#F5A623'),
  ('PS-RGPD','Cumplimiento y protección de datos', 'soporte', 'DPD',             40, '#F5A623')
on conflict (codigo) do nothing;

-- 4 · Algunos subprocesos de ejemplo (idempotente aproximado por proceso+nombre)
insert into public.procesos_subprocesos (proceso_id, codigo, nombre, responsable, orden)
select p.id, v.codigo, v.nombre, v.responsable, v.orden
from (values
  ('PC-PROY', 'PC-PROY.1', 'Planificación del proyecto', 'Director de proyecto', 10),
  ('PC-PROY', 'PC-PROY.2', 'Documentación del sistema',  'Consultor',            20),
  ('PC-PROY', 'PC-PROY.3', 'Formación al cliente',        'Consultor',            30),
  ('PC-AUD',  'PC-AUD.1',  'Auditoría interna',           'Consultor',            10),
  ('PC-AUD',  'PC-AUD.2',  'Acompañamiento a certificación','Director de proyecto',20)
) as v(pcod, codigo, nombre, responsable, orden)
join public.procesos_internos p on p.codigo = v.pcod
where not exists (
  select 1 from public.procesos_subprocesos s
  where s.proceso_id = p.id and s.nombre = v.nombre
);

commit;

notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');


-- ══════════════ migracion-v50-mapa-procesos-pro.sql ══════════════

-- =============================================================================
-- CONSULTIFY · Migración v50 · Mapa de procesos PRO
--   · Bandas flexibles (tabla propia, se pueden añadir/quitar, cada una con prefijo)
--   · Procesos con código automático (prefijo de banda + número)
--   · Subprocesos con código automático (S01, S02… + código del proceso)
--   · Riesgos por subproceso (probabilidad × impacto = nivel + control)
--
-- Es idempotente y compatible tanto si se ejecutó la v49 como si no.
-- =============================================================================

begin;

-- ---------- 1 · BANDAS (tipos de proceso, flexibles) ----------
create table if not exists public.procesos_bandas (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  prefijo     text not null,                 -- p.ej. 'ESTR', 'CLAVE', 'APOYO'
  color       text not null default '#0A2A6C',
  orden       int not null default 100,
  creado_en   timestamptz default now()
);

-- Sembrar las tres bandas base (solo si la tabla está vacía)
insert into public.procesos_bandas (titulo, prefijo, color, orden)
select * from (values
  ('Procesos estratégicos',        'ESTR',  '#061B45', 10),
  ('Procesos clave',               'CLAVE', '#0A2A6C', 20),
  ('Procesos de apoyo y soporte',  'APOYO', '#F5A623', 30)
) as v(titulo, prefijo, color, orden)
where not exists (select 1 from public.procesos_bandas);

-- ---------- 2 · PROCESOS: vincular a banda_id + código auto ----------
alter table public.procesos_internos
  add column if not exists banda_id uuid references public.procesos_bandas(id) on delete set null;
alter table public.procesos_internos
  add column if not exists responsable text;

-- Si viene de la v49 (columna 'banda' de texto), mapear al nuevo banda_id.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name='procesos_internos' and column_name='banda') then
    update public.procesos_internos p set banda_id = b.id
    from public.procesos_bandas b
    where p.banda_id is null and (
      (p.banda = 'estrategico' and b.prefijo = 'ESTR') or
      (p.banda = 'clave'       and b.prefijo = 'CLAVE') or
      (p.banda = 'soporte'     and b.prefijo = 'APOYO')
    );
  end if;
end $$;

-- Los procesos sin banda → a la primera banda (clave/estratégica) por defecto
update public.procesos_internos p
set banda_id = (select id from public.procesos_bandas order by orden limit 1)
where p.banda_id is null;

-- ---------- 3 · SUBPROCESOS (crea si no existe; de la v49) ----------
create table if not exists public.procesos_subprocesos (
  id          uuid primary key default gen_random_uuid(),
  proceso_id  uuid not null references public.procesos_internos(id) on delete cascade,
  codigo      text,
  nombre      text not null default '',
  responsable text,
  orden       int default 100,
  creado_en   timestamptz default now()
);
create index if not exists procesos_subprocesos_proc_idx on public.procesos_subprocesos (proceso_id);

-- ---------- 4 · RIESGOS por subproceso ----------
-- nivel = probabilidad (1-5) × impacto (1-5) = 1..25, clasificado en bajo/medio/alto.
create table if not exists public.procesos_riesgos (
  id            uuid primary key default gen_random_uuid(),
  subproceso_id uuid not null references public.procesos_subprocesos(id) on delete cascade,
  descripcion   text not null default '',
  probabilidad  int  not null default 1 check (probabilidad between 1 and 5),
  impacto       int  not null default 1 check (impacto between 1 and 5),
  control       text,                          -- medida de control / acción
  creado_en     timestamptz default now()
);
create index if not exists procesos_riesgos_sub_idx on public.procesos_riesgos (subproceso_id);

-- ---------- 5 · RLS ----------
do $$
declare t text;
begin
  foreach t in array array['procesos_bandas','procesos_subprocesos','procesos_riesgos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('create policy %I_select on public.%I for select to authenticated using (true)', t, t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format($f$
      create policy %I_write on public.%I for all to authenticated
      using (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo
                     and p.rol in ('superadmin','admin','consultor','gestion')))
      with check (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo
                     and p.rol in ('superadmin','admin','consultor','gestion')))
    $f$, t, t);
  end loop;
end $$;

commit;

notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');

-- Verificación:
-- select titulo, prefijo from public.procesos_bandas order by orden;
-- select count(*) from public.procesos_internos where banda_id is not null;


-- ══════════════ migracion-v51-fases-procesos.sql ══════════════

-- =============================================================================
-- CONSULTIFY · Migración v51 · Fases del proceso (Pre · Ongoing · Post)
-- -----------------------------------------------------------------------------
-- Cada proceso puede estar en una o varias fases del ciclo:
--   pre     = antes / preparación
--   ongoing = durante / ejecución
--   post    = después / cierre y seguimiento
-- Se guarda como array de texto. Por defecto 'ongoing'.
-- =============================================================================

begin;

alter table public.procesos_internos
  add column if not exists fases text[] not null default array['ongoing']::text[];

-- Los procesos existentes sin fase se dejan en 'ongoing' (ya es el default).
update public.procesos_internos
set fases = array['ongoing']::text[]
where fases is null or array_length(fases, 1) is null;

commit;

notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');


-- ══════════════ CONSOLIDADO_v94.sql ══════════════

-- =============================================================================
-- CONSULTIFY · SQL CONSOLIDADO (ejecutar de una vez en Supabase → SQL Editor)
-- Pone la base de datos al día con todo lo necesario para la app v94:
--   1) Roles ampliados (superadmin, gestion) + tu alta como superadmin
--   2) Columnas de cliente_tareas (bloques_ejecucion, colaboradores, etc.)
--   3) Catálogo de procesos internos
--   4) Función marcar_acceso + campos de accesos
-- Es IDEMPOTENTE: puedes ejecutarlo varias veces sin romper nada.
-- =============================================================================

begin;

-- ── 1 · ROLES ────────────────────────────────────────────────────────────────
-- Permitir los 5 roles (el esquema base solo tenía cliente/consultor/admin).
alter table public.perfiles drop constraint if exists perfiles_rol_check;
alter table public.perfiles add constraint perfiles_rol_check
  check (rol in ('cliente','consultor','gestion','admin','superadmin'));

-- Campos de accesos / login duro.
alter table public.perfiles add column if not exists activo boolean not null default true;
alter table public.perfiles add column if not exists email text;
alter table public.perfiles add column if not exists nivel text
  check (nivel is null or nivel in ('J1','J2','J3','Senior'));
alter table public.perfiles add column if not exists invitado_en timestamptz;
alter table public.perfiles add column if not exists ultimo_acceso timestamptz;

-- ── 2 · COLUMNAS DE cliente_tareas ──────────────────────────────────────────
alter table public.cliente_tareas add column if not exists bloques_ejecucion jsonb not null default '[]'::jsonb;
alter table public.cliente_tareas add column if not exists seguimientos jsonb not null default '[]'::jsonb;
alter table public.cliente_tareas add column if not exists normas_integradas jsonb not null default '[]'::jsonb;
alter table public.cliente_tareas add column if not exists editada_manual boolean not null default false;
alter table public.cliente_tareas add column if not exists colaboradores jsonb not null default '[]'::jsonb;
alter table public.cliente_tareas add column if not exists fecha_estimada date;
alter table public.cliente_tareas add column if not exists fecha_real date;
alter table public.cliente_tareas add column if not exists hecha boolean not null default false;

-- ── 3 · CATÁLOGO DE PROCESOS INTERNOS ───────────────────────────────────────
create table if not exists public.procesos_internos (
  id          uuid primary key default gen_random_uuid(),
  creado_en   timestamptz not null default now(),
  codigo      text unique,
  nombre      text not null,
  descripcion text,
  color       text default '#0A2A6C',
  activo      boolean not null default true,
  orden       int default 100,
  creado_por  uuid references auth.users(id) on delete set null
);
create index if not exists idx_procesos_internos_activo on public.procesos_internos (activo, orden);

insert into public.procesos_internos (nombre, codigo, descripcion, orden) values
  ('Reunión de equipo',        'PI-REU',  'Reuniones internas del equipo de consultoría', 10),
  ('Formación interna',        'PI-FORM', 'Formación y desarrollo del equipo', 20),
  ('Mejora de metodología',    'PI-MET',  'Mejora de plantillas, procesos y herramientas internas', 30),
  ('Comercial / propuestas',   'PI-COM',  'Preparación de ofertas y actividad comercial no facturable', 40),
  ('Administración interna',   'PI-ADM',  'Tareas administrativas y de gestión propias', 50)
on conflict (codigo) do nothing;

-- Vínculo tarea → proceso interno (cuando tipo = 'proceso_interno')
alter table public.cliente_tareas
  add column if not exists proceso_interno_id uuid references public.procesos_internos(id) on delete set null;

-- Las tareas MANUALES viven en agenda_tareas: necesitan las mismas columnas.
alter table public.agenda_tareas
  add column if not exists proceso_interno_id uuid references public.procesos_internos(id) on delete set null;
alter table public.agenda_tareas
  add column if not exists colaboradores jsonb not null default '[]'::jsonb;

-- ── 4 · FUNCIONES DE APOYO ──────────────────────────────────────────────────
create or replace function public.mi_rol()
returns text language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid();
$$;

create or replace function public.soy_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select rol = 'superadmin' and activo from public.perfiles where id = auth.uid()), false);
$$;

create or replace function public.marcar_acceso()
returns void language sql security definer set search_path = public as $$
  update public.perfiles set ultimo_acceso = now() where id = auth.uid();
$$;

commit;

-- ── 5 · RLS ──────────────────────────────────────────────────────────────────
alter table public.procesos_internos enable row level security;

drop policy if exists procesos_internos_select on public.procesos_internos;
create policy procesos_internos_select on public.procesos_internos
  for select to authenticated
  using (public.mi_rol() in ('superadmin','admin','consultor','gestion'));

drop policy if exists procesos_internos_write on public.procesos_internos;
create policy procesos_internos_write on public.procesos_internos
  for all to authenticated
  using (public.mi_rol() in ('superadmin','admin'))
  with check (public.mi_rol() in ('superadmin','admin'));

grant select, insert, update, delete on public.procesos_internos to authenticated;

drop policy if exists perfiles_superadmin_all on public.perfiles;
create policy perfiles_superadmin_all on public.perfiles
  for all
  using (public.soy_superadmin())
  with check (public.soy_superadmin());

-- ── 6 · TU ALTA COMO SUPERADMIN (ajusta el email si procede) ────────────────
-- Actualiza si ya tienes perfil…
update public.perfiles p
set rol = 'superadmin', activo = true
from auth.users u
where p.id = u.id and u.email = 'alejandro@tuconsultor.com';

-- …y crea el perfil si por lo que sea no existía.
insert into public.perfiles (id, rol, activo, nombre, email)
select u.id, 'superadmin', true, 'Alejandro', u.email
from auth.users u
where u.email = 'alejandro@tuconsultor.com'
on conflict (id) do update set rol = 'superadmin', activo = true;

-- ── 7 · RECARGA DEL SCHEMA CACHE (evita "column ... in schema cache") ───────
notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');

-- ── 8 · COMPROBACIÓN FINAL ──────────────────────────────────────────────────
-- Debe devolver tu email con rol=superadmin y activo=true.
select u.email, p.rol, p.activo
from auth.users u
left join public.perfiles p on p.id = u.id
where u.email = 'alejandro@tuconsultor.com';


-- ══════════════ seed-blog-2026.sql ══════════════

-- =============================================================================
-- CONSULTIFY · SEED · Blog posts 2026 (36 artículos)
-- Ejecutar DESPUÉS de la migración v45. Idempotente por slug (on conflict).
-- Textos y fechas SIN modificar respecto al JSON original.
-- =============================================================================

begin;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('errores-auditoria-interna-iso-9001', '5 errores que hacen suspender una auditoría interna ISO 9001', 'El 80% de las no conformidades que vemos se repiten. Estas son las cinco de siempre.', '<p>El 80% de las no conformidades que encontramos en auditorías internas se repiten empresa tras empresa. No son fallos exóticos: son los cinco de siempre.</p><ul><li><strong>1. Auditar con la norma en la mano y sin leer los procesos.</strong> La auditoría interna evalúa TU sistema, no la norma en abstracto.</li><li><strong>2. Objetivos sin seguimiento.</strong> Se definen en enero y nadie los vuelve a mirar hasta diciembre.</li><li><strong>3. Acciones correctivas sin análisis de causa.</strong> Corregir el síntoma no cierra la no conformidad, la aplaza.</li><li><strong>4. Registros de formación incompletos.</strong> La competencia hay que poder demostrarla, no solo afirmarla.</li><li><strong>5. Revisión por la dirección de trámite.</strong> Un acta copiada del año anterior se detecta en dos minutos.</li></ul><p>La buena noticia: los cinco se resuelven con método, no con más papeleo.</p>', '¿Quieres que revisemos tu sistema antes de la próxima auditoría? Escríbenos a hola@tuconsultor.com.', 'P5 CONSEJOS', 'TuConsultor', '2026-07-13', 'programado', '{"consejos"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('iso-42001-explicada', 'ISO 42001 explicada en 2 minutos: la norma de gestión de IA', 'Tu empresa ya usa IA. ¿Tienes un sistema para gestionarla?', '<p>Tu empresa ya usa inteligencia artificial, aunque no lo hayas formalizado: redacción de textos, análisis de datos, atención al cliente. La pregunta es si la usas con control o con suerte.</p><p>La <strong>ISO/IEC 42001</strong> es la primera norma internacional certificable de sistemas de gestión de IA. Funciona igual que la 9001 que ya conoces: contexto, riesgos, objetivos, controles operativos, auditoría y mejora, pero aplicado al ciclo de vida de los sistemas de IA.</p><p>¿Qué aporta en la práctica?</p><ul><li>Un inventario de dónde y cómo se usa IA en la organización.</li><li>Evaluación de impactos: sesgos, privacidad, transparencia, seguridad.</li><li>Roles y responsabilidades claros cuando la IA toma o apoya decisiones.</li><li>Confianza demostrable ante clientes y administración.</li></ul><p>Si ya tienes 9001 o 27001, el 60% del camino está andado: la estructura de alto nivel es la misma.</p>', '¿Usáis IA en procesos y queréis ordenarla? Hablemos: hola@tuconsultor.com.', 'P1 EDUCATIVO', 'TuConsultor', '2026-07-15', 'programado', '{"educativo"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('pyme-industrial-certificacion-6-meses', 'Cómo una pyme industrial pasó su primera certificación ISO 9001 en 6 meses', 'Llegaron sin un solo procedimiento escrito. Seis meses después: certificado sin no conformidades mayores.', '<p>Cuando empezamos a trabajar con esta pyme industrial madrileña no tenían un solo procedimiento escrito. Tenían algo mejor: procesos reales que funcionaban en la cabeza de su gente. Nuestro trabajo no fue inventar un sistema, fue escribir el que ya existía y reforzar lo que cojeaba.</p><p>El plan en 6 meses:</p><ul><li><strong>Mes 1-2:</strong> diagnóstico, mapa de procesos y análisis de contexto. Solo lo imprescindible.</li><li><strong>Mes 3-4:</strong> documentación ligera (una página por proceso donde fue posible) y formación al equipo.</li><li><strong>Mes 5:</strong> auditoría interna y revisión por la dirección con datos reales.</li><li><strong>Mes 6:</strong> auditoría de certificación. Resultado: cero no conformidades mayores.</li></ul><p>La clave no fue correr: fue no fabricar burocracia que luego nadie mantiene.</p>', '¿Tu empresa necesita certificarse sin ahogarse en papeles? Cuéntanos tu caso.', 'P2 CASOS', 'TuConsultor', '2026-07-16', 'programado', '{"casos"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('checklist-revision-por-la-direccion', 'Checklist: qué preparar antes de la revisión por la dirección', 'La revisión por la dirección no es una reunión más. Es LA reunión.', '<p>La revisión por la dirección no es una reunión más: es el momento en que el sistema de gestión y la estrategia de la empresa se miran a la cara. Esto es lo que debe estar sobre la mesa antes de empezar:</p><ul><li>Estado de las acciones de la revisión anterior (todas, no solo las cerradas).</li><li>Cambios en el contexto: mercado, legislación, clientes, riesgos nuevos.</li><li>Resultados de indicadores y grado de cumplimiento de objetivos.</li><li>Satisfacción del cliente y reclamaciones, con datos, no impresiones.</li><li>Resultados de auditorías internas y externas.</li><li>No conformidades y estado de las acciones correctivas.</li><li>Desempeño de proveedores externos.</li><li>Adecuación de recursos: ¿falta gente, formación, herramientas?</li></ul><p>Y la salida más importante: <strong>decisiones</strong>. Una revisión sin decisiones es un acta, no una revisión.</p>', 'Guarda esta lista para tu próxima revisión. ¿Dudas? hola@tuconsultor.com.', 'P5 CONSEJOS', 'TuConsultor', '2026-07-20', 'programado', '{"consejos"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('ia-consultor-calidad', 'La IA no va a sustituir al consultor de calidad. Va a sustituir al que no la use', 'Llevo 20 años en consultoría ISO. Esto es lo que está cambiando de verdad.', '<p>Llevo 20 años en consultoría de sistemas de gestión y nunca había visto un cambio tan rápido como el de los últimos dos años.</p><p>La IA ya redacta borradores de procedimientos, analiza indicadores y prepara auditorías. Lo hace en minutos. ¿Significa eso el fin del consultor? No: significa el fin del consultor que solo aportaba eso.</p><p>Lo que la IA no hace (todavía) es lo que siempre fue el valor real del oficio: entender el negocio del cliente, detectar lo que no está escrito, negociar con una dirección escéptica, y distinguir entre un sistema que funciona y uno que solo parece que funciona.</p><p>En TuConsultor hemos construido nuestra propia plataforma, <strong>Consultify</strong>, precisamente para automatizar lo automatizable y dedicar las horas de consultor a lo que de verdad las necesita.</p><p>La herramienta cambia. El criterio, no.</p>', '¿Cómo lo ves tú? Nos encantará leer tu opinión.', 'P3 OPINIÓN', 'TuConsultor', '2026-07-22', 'programado', '{"opinion"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('quienes-somos-tuconsultor', 'Desde 2006 gestionando con el corazón: quiénes somos', 'Detrás de cada certificado hay un equipo. Este es el nuestro.', '<p>Detrás de cada certificado que ayudamos a conseguir hay un equipo que lleva desde 2006 haciendo lo mismo con la misma ilusión: ayudar a pymes a gestionar mejor.</p><p>Somos <strong>TuConsultor</strong>, consultora madrileña especializada en sistemas de gestión: ISO 9001, 14001, 45001, 27001, 42001, EFQM y más. Trabajamos con cinco modelos de colaboración distintos, desde el apoyo puntual hasta la implantación completa, porque no todas las empresas necesitan lo mismo.</p><p>En 2026 dimos un paso más y construimos <strong>Consultify</strong>, nuestra propia plataforma de gestión de proyectos de consultoría, porque ninguna herramienta del mercado encajaba con nuestra forma de trabajar.</p><p>Lo que no ha cambiado en veinte años: hablamos claro, contamos también lo que no funciona y medimos nuestro éxito por las auditorías que superan nuestros clientes, no por las horas que facturamos.</p>', 'Conócenos en tuconsultor.com o escríbenos a hola@tuconsultor.com.', 'P4 MARCA', 'TuConsultor', '2026-07-23', 'programado', '{"marca"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('7-indicadores-sistema-gestion', '7 indicadores que todo sistema de gestión debería medir (y casi nadie mide)', 'Medir por medir no sirve. Estos 7 KPI sí mueven la aguja.', '<p>Medir por medir no sirve de nada. La mayoría de cuadros de indicadores que vemos están llenos de métricas que nadie usa para decidir. Estos siete sí mueven la aguja:</p><ul><li><strong>Coste de la no calidad:</strong> reprocesos, devoluciones, garantías. El indicador que más duele y más motiva.</li><li><strong>Tiempo de cierre de no conformidades:</strong> mide la salud real de tu mejora continua.</li><li><strong>% de acciones correctivas eficaces</strong> (que no reaparecen en 12 meses).</li><li><strong>Tasa de reclamaciones por pedido/proyecto</strong>, no en valor absoluto.</li><li><strong>Cumplimiento de plazos de entrega</strong>, medido contra la fecha comprometida original.</li><li><strong>Rotación y absentismo:</strong> el sistema también gestiona personas.</li><li><strong>% de objetivos con seguimiento al día:</strong> el meta-indicador que delata sistemas abandonados.</li></ul><p>Regla de oro: si un indicador lleva dos revisiones sin provocar ninguna decisión, elimínalo o cámbialo.</p>', '¿Cuál añadirías tú? Escríbenos y lo debatimos.', 'P5 CONSEJOS', 'TuConsultor', '2026-07-27', 'programado', '{"consejos"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('iso-9001-vs-efqm', 'ISO 9001 vs EFQM: ¿cuál necesita tu empresa?', 'No son competidoras. Son etapas distintas del mismo camino.', '<p>Nos lo preguntan constantemente: ¿ISO 9001 o EFQM? La respuesta corta: no son competidoras, son etapas distintas del mismo camino.</p><p><strong>ISO 9001</strong> es una norma certificable de requisitos mínimos: define lo que un sistema de gestión de calidad debe tener. Es binaria: cumples o no cumples. Es la puerta de entrada y, en muchos sectores, un requisito comercial.</p><p><strong>EFQM</strong> es un modelo de excelencia: no certifica mínimos, evalúa madurez. Con la lógica RADAR puntúa de 0 a 1000 cómo de bien diriges, ejecutas y obtienes resultados. Sirve para saber dónde estás y hacia dónde mejorar, incluso si ya llevas años certificado.</p><p>Nuestra recomendación habitual: 9001 primero para ordenar la casa; EFQM cuando el sistema ya rueda y quieres pasar de "cumplir" a "destacar". El modelo EFQM 2025, además, pone el foco en transformación, sostenibilidad y datos: muy alineado con lo que las pymes necesitan ahora.</p>', '¿Quieres saber en qué punto está tu organización? Hacemos diagnósticos EFQM.', 'P1 EDUCATIVO', 'TuConsultor', '2026-07-29', 'programado', '{"educativo"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('de-47-no-conformidades-a-3', 'De 47 no conformidades a 3: un año de mejora continua real', 'Heredamos un sistema con 47 no conformidades abiertas. Así lo ordenamos.', '<p>Cuando este cliente llegó a nosotros, su sistema arrastraba <strong>47 no conformidades abiertas</strong>, algunas con más de dos años de antigüedad. El sistema no estaba roto: estaba atascado.</p><p>Lo que hicimos, por orden:</p><ul><li><strong>Triaje honesto.</strong> De las 47, doce eran duplicadas o ya resueltas sin registrar. Quedaron 35 reales.</li><li><strong>Análisis de causa en serio.</strong> Agrupadas por causa raíz, las 35 se redujeron a 9 problemas de fondo. Casi todos apuntaban a dos procesos.</li><li><strong>Un responsable y una fecha por acción.</strong> Nada de "el departamento". Un nombre.</li><li><strong>Seguimiento quincenal de 20 minutos.</strong> Corto, incómodo y eficaz.</li></ul><p>Doce meses después: 3 no conformidades abiertas, todas del último trimestre y en plazo. La auditoría de seguimiento lo destacó como punto fuerte.</p><p>La mejora continua no es una cláusula. Es una rutina.</p>', '¿Tu sistema acumula no conformidades? Podemos ayudarte a desatascarlo.', 'P2 CASOS', 'TuConsultor', '2026-07-30', 'programado', '{"casos"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('gestion-riesgos-iso-util', 'Gestión de riesgos ISO: cómo hacerla útil y no un Excel muerto', 'Tu matriz de riesgos no debería actualizarse solo la semana antes de la auditoría.', '<p>Confesión de auditor: sabemos perfectamente cuándo una matriz de riesgos se actualizó la semana antes de la auditoría. Se nota. Para que la gestión de riesgos sirva de algo:</p><ul><li><strong>Menos riesgos, mejor pensados.</strong> Diez riesgos relevantes valen más que cincuenta genéricos copiados de una plantilla.</li><li><strong>Vincula cada riesgo a un proceso y a un dueño.</strong> Un riesgo sin responsable es un párrafo, no un riesgo.</li><li><strong>Acciones con fecha, no "controles" eternos.</strong> Si la acción de mitigación lleva tres años "en curso", no existe.</li><li><strong>Revísala cuando pase algo, no por calendario.</strong> Un cliente nuevo grande, una norma nueva, un incidente: eso dispara la revisión.</li><li><strong>Úsala en la revisión por la dirección.</strong> Si los riesgos no aparecen cuando se toman decisiones, el Excel está muerto.</li></ul><p>El objetivo no es tener una matriz bonita. Es que ningún problema previsible te pille por sorpresa.</p>', 'Guarda este método y aplícalo en tu próxima revisión de riesgos.', 'P5 CONSEJOS', 'TuConsultor', '2026-08-03', 'programado', '{"consejos"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('mayor-freno-para-certificarse', '¿Cuál es el mayor freno para certificarse? Preguntamos a gerentes de pyme', 'Pregunta honesta a gerentes de pyme: ¿qué os frena de verdad?', '<p>Llevamos meses haciendo la misma pregunta a gerentes de pymes que aún no se han certificado: <strong>¿qué os frena de verdad?</strong> Las respuestas se repiten:</p><ul><li><strong>"El papeleo"</strong> — el miedo a que la ISO burocratice la empresa. Es el freno número uno y el mito más extendido.</li><li><strong>"El coste"</strong> — consultoría más certificadora más horas internas. Legítimo, aunque casi nadie calcula el coste de NO tener sistema.</li><li><strong>"No tenemos tiempo"</strong> — que suele significar "no tenemos a nadie que lo lidere".</li><li><strong>"No sabemos por dónde empezar"</strong> — el más fácil de resolver y el que más parálisis genera.</li></ul><p>Nuestra lectura honesta: los cuatro frenos son reales, pero los cuatro se resuelven con el mismo antídoto: un sistema diseñado a la medida de la empresa, no una plantilla genérica de 200 páginas.</p><p>¿Cuál es tu freno? Nos interesa de verdad la respuesta.</p>', 'Cuéntanos qué te frena: hola@tuconsultor.com. Sin compromiso y sin argumentario de venta.', 'P3 OPINIÓN', 'TuConsultor', '2026-08-05', 'programado', '{"opinion"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('consultify-9-normas-5-modelos', 'Así gestionamos 9 normas y 5 modelos de consultoría con Consultify', 'Construimos nuestra propia plataforma porque ninguna herramienta encajaba. Esto es Consultify.', '<p>Durante años gestionamos nuestros proyectos de consultoría con hojas de cálculo, carpetas compartidas y memoria. Funcionaba, hasta que dejó de funcionar: 9 normas distintas, 5 modelos de servicio, decenas de clientes simultáneos y un equipo creciendo.</p><p>Ninguna herramienta del mercado encajaba con la forma de trabajar de una consultora ISO. Así que construimos la nuestra: <strong>Consultify</strong>.</p><p>Qué hace por nosotros cada día:</p><ul><li>Planifica proyectos por norma, modelo y consultor, con horas previstas y efectivas.</li><li>Controla la facturación y el estado de cobros con un semáforo conectado a nuestra contabilidad.</li><li>Mantiene el catálogo de tareas por proceso y subproceso para las 9 normas que trabajamos.</li><li>Sincroniza clientes con nuestras herramientas de comunicación automáticamente.</li></ul><p>Lo construimos para nosotros, pensando en cómo trabaja una consultora de verdad. Y se nota.</p>', '¿Quieres verla por dentro? Pide una demo en consultify.pro.', 'P4 MARCA', 'TuConsultor', '2026-08-06', 'programado', '{"marca"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('como-redactar-no-conformidad', 'Cómo redactar una no conformidad que de verdad sirva para mejorar', '"Falta de compromiso" no es una no conformidad. Es una excusa mal escrita.', '<p>"Falta de compromiso del personal" no es una no conformidad: es una excusa mal escrita. Una no conformidad útil tiene tres partes, siempre:</p><ul><li><strong>Evidencia:</strong> el hecho objetivo y verificable. "En el pedido 2026-0341 no consta el registro de inspección final."</li><li><strong>Requisito incumplido:</strong> qué punto de la norma o de tu propio procedimiento se incumple. "El procedimiento PC-05 exige inspección final documentada."</li><li><strong>Naturaleza del incumplimiento:</strong> la conexión entre ambas, sin juicios de valor ni culpables.</li></ul><p>Lo que nunca debe llevar: nombres propios, adjetivos ("grave", "inaceptable"), causas presupuestas ("por falta de formación") ni soluciones ("se debería..."). La causa se investiga después; la solución la decide el dueño del proceso.</p><p>Una no conformidad bien redactada se cierra sola en la mitad de tiempo, porque nadie discute hechos.</p>', 'Guarda esta estructura y úsala en tu próxima auditoría interna.', 'P5 CONSEJOS', 'TuConsultor', '2026-08-10', 'programado', '{"consejos"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('iso-27001-ens-administracion', 'ISO 27001 + ENS: lo que toda empresa que trabaja con la administración debe saber', 'Si facturas a la administración pública, el ENS ya no es opcional.', '<p>Si tu empresa presta servicios a la administración pública española que impliquen tratar su información o sus sistemas, el <strong>Esquema Nacional de Seguridad (ENS)</strong> no es opcional: es un requisito legal, y cada vez más pliegos lo exigen certificado.</p><p>¿Y la ISO 27001? Es la norma internacional de seguridad de la información, certificable y reconocida mundialmente. Se solapan mucho, pero no son lo mismo:</p><ul><li>El <strong>ENS</strong> es obligatorio para el sector público y sus proveedores, con categorías Básica, Media y Alta según el sistema.</li><li>La <strong>27001</strong> es voluntaria, comercialmente muy valorada, y estructura la seguridad como sistema de gestión.</li></ul><p>La buena noticia: si haces bien una, la otra está al 70%. El análisis de riesgos, los controles y la documentación se comparten en gran medida. Nuestra recomendación para proveedores de la administración: abordarlas juntas y en un solo proyecto. Se ahorra tiempo, dinero y esquizofrenia documental.</p>', '¿Te piden ENS en un pliego y no sabes por dónde empezar? Escríbenos.', 'P1 EDUCATIVO', 'TuConsultor', '2026-08-12', 'programado', '{"educativo"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('integrar-9001-14001-45001', 'Integrar ISO 9001 + 14001 + 45001: menos papeles, un solo sistema', 'Tres normas no significan tres sistemas. Significan uno bien hecho.', '<p>Este cliente llegó con tres sistemas paralelos: uno de calidad, uno de medio ambiente y uno de seguridad y salud. Tres manuales, tres juegos de procedimientos, tres auditorías internas y un equipo agotado de mantener triplicado lo que era lo mismo.</p><p>Las tres normas comparten estructura (la llamada estructura de alto nivel): contexto, liderazgo, planificación, soporte, operación, evaluación y mejora. Lo que hicimos fue, sencillamente, tomárnoslo en serio:</p><ul><li>Un único análisis de contexto y partes interesadas con las tres perspectivas.</li><li>Una sola matriz de riesgos con columnas de calidad, ambiente y seguridad.</li><li>Procedimientos integrados: un solo control documental, una sola gestión de no conformidades.</li><li>Una auditoría interna integrada y una única revisión por la dirección.</li></ul><p>Resultado: la documentación se redujo un 40% y la auditoría de certificación integrada costó menos que dos de las tres que hacían antes por separado.</p>', '¿Mantienes sistemas duplicados? Calculamos cuánto podrías simplificar.', 'P2 CASOS', 'TuConsultor', '2026-08-13', 'programado', '{"casos"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('5-documentos-auditor', 'Los 5 documentos que tu auditor va a pedir sí o sí', 'Da igual la norma: estos 5 documentos salen en todas las auditorías.', '<p>Da igual que sea 9001, 14001 o 27001: hay cinco documentos que el auditor va a pedir en los primeros treinta minutos. Tenerlos impecables marca el tono de toda la auditoría:</p><ul><li><strong>El análisis de contexto y partes interesadas.</strong> Actualizado este año, no el de la implantación.</li><li><strong>Los objetivos con su seguimiento.</strong> Con datos de verdad, no casillas de "en curso".</li><li><strong>El informe de la última auditoría interna</strong> y el estado de sus hallazgos.</li><li><strong>El acta de la revisión por la dirección</strong>, con decisiones reconocibles.</li><li><strong>El registro de no conformidades y acciones correctivas</strong> del periodo.</li></ul><p>¿Por qué estos cinco? Porque juntos cuentan la historia completa: si el sistema piensa (contexto), quiere (objetivos), se vigila (auditoría), decide (revisión) y aprende (acciones). Un sistema que tiene esto vivo, tiene casi todo lo demás bien.</p>', 'Guarda esta lista y revísala 90 días antes de tu próxima auditoría.', 'P5 CONSEJOS', 'TuConsultor', '2026-08-17', 'programado', '{"consejos"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('efqm-2025-que-cambia', 'EFQM 2025: qué cambia y por qué importa a las pymes', 'El nuevo modelo EFQM no es solo para grandes. Te explico por qué.', '<p>Existe la creencia de que el modelo EFQM es cosa de grandes corporaciones con departamentos de excelencia. El modelo 2025 desmonta esa idea, y creemos que las pymes deberían prestarle atención.</p><p>Lo esencial del EFQM 2025:</p><ul><li>Mantiene la estructura de <strong>7 criterios</strong> en tres bloques: Dirección, Ejecución y Resultados.</li><li>Refuerza el peso de la <strong>transformación</strong>: no evalúa solo cómo gestionas hoy, sino cómo te preparas para mañana.</li><li>Integra de lleno <strong>sostenibilidad y tecnología</strong> como ejes transversales, no como anexos.</li><li>La lógica <strong>RADAR</strong> sigue siendo el corazón: enfoques, despliegue, evaluación y revisión, con puntuación de 0 a 1000.</li></ul><p>¿Por qué le importa a una pyme? Porque una autoevaluación EFQM bien hecha es el diagnóstico estratégico más completo que existe por su coste: te dice exactamente dónde estás fuerte, dónde cojeas y qué priorizar, con un lenguaje que la dirección entiende.</p>', 'Hacemos autoevaluaciones EFQM 2025 con informe ejecutivo. Pregúntanos.', 'P3 OPINIÓN', 'TuConsultor', '2026-08-19', 'programado', '{"opinion"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('20-anos-lecciones', '20 años de consultoría: lo que aprendimos de nuestros errores', 'No siempre acertamos. Estas son 3 lecciones que nos costaron caras.', '<p>Veinte años de consultoría dan para muchos aciertos y para algunos errores que preferiríamos no haber cometido. Contamos tres, porque nos hicieron mejores:</p><ul><li><strong>Aceptar proyectos con la dirección desconectada.</strong> Al principio pensábamos que podíamos compensarlo con esfuerzo. No. Si la dirección no lidera, el sistema nace muerto. Hoy lo evaluamos antes de firmar.</li><li><strong>Documentar de más.</strong> En nuestros primeros años entregábamos manuales enciclopédicos. Aprendimos que cada página que el cliente no usa es una página que trabaja contra el sistema. Hoy nuestro estándar es: lo mínimo que funcione.</li><li><strong>Callar diagnósticos incómodos.</strong> Una vez suavizamos un informe para no incomodar. El problema estalló seis meses después, más caro. Desde entonces, la honestidad en el diagnóstico es innegociable, aunque duela.</li></ul><p>La experiencia no es acumular años: es acumular lecciones y cambiar por ellas.</p>', '¿Cuál ha sido tu mayor lección gestionando? Nos encantaría leerla.', 'P4 MARCA', 'TuConsultor', '2026-08-20', 'programado', '{"marca"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('plan-igualdad-checklist', 'Plan de Igualdad: checklist de obligaciones para empresas de más de 50 empleados', 'Si tienes más de 50 empleados y no tienes plan de igualdad, tienes un problema.', '<p>Si tu empresa tiene más de 50 personas en plantilla y no tiene plan de igualdad registrado, tiene un incumplimiento legal con sanciones que pueden superar los 7.500 euros, además de la exclusión de contratación pública. El checklist de mínimos:</p><ul><li><strong>Constituir la comisión negociadora</strong> con la representación legal de las personas trabajadoras.</li><li><strong>Diagnóstico de situación:</strong> datos de plantilla, retribuciones, promoción, formación y conciliación desagregados por sexo.</li><li><strong>Auditoría retributiva</strong> y registro salarial: obligatorios y con metodología concreta.</li><li><strong>Plan con objetivos, medidas, plazos e indicadores</strong> de seguimiento.</li><li><strong>Registro oficial (REGCON)</strong>: sin registro, el plan no existe legalmente.</li><li><strong>Seguimiento y evaluación periódica</strong>, no cajón y olvido.</li></ul><p>Vigencia máxima: 4 años. Si el tuyo se firmó en 2022, toca renovarlo ya.</p>', '¿Necesitas diagnóstico o renovación del plan? Te acompañamos en todo el proceso.', 'P5 CONSEJOS', 'TuConsultor', '2026-08-24', 'programado', '{"consejos"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('iso-56001-innovacion', 'ISO 56001: gestionar la innovación también se certifica', 'Innovar sin sistema es tener suerte. Innovar con sistema es tener método.', '<p>Muchas empresas innovan por chispazos: una idea del gerente, un cliente que pide algo nuevo, una urgencia que fuerza una solución. Funciona... hasta que deja de funcionar. Innovar sin sistema es tener suerte; innovar con sistema es tener método.</p><p>La <strong>ISO 56001</strong> es la norma certificable de sistemas de gestión de la innovación. No te dice qué innovar: te da la estructura para que la innovación no dependa del azar:</p><ul><li>Un proceso para captar oportunidades e ideas de forma sistemática.</li><li>Criterios para decidir en qué ideas invertir y cuáles descartar (esto es lo que casi nadie tiene).</li><li>Gestión de la incertidumbre: en innovación, fallar controladamente es parte del método.</li><li>Indicadores de innovación de verdad, más allá de "número de ideas del buzón".</li></ul><p>Además, un sistema de gestión de innovación certificado refuerza deducciones fiscales de I+D+i y puntúa en licitaciones y ayudas. Método que además sale rentable.</p>', '¿Tu empresa innova con método o con suerte? Hablemos de la 56001.', 'P1 EDUCATIVO', 'TuConsultor', '2026-08-26', 'programado', '{"educativo"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('auditoria-externa-a-la-primera', 'Auditoría externa superada a la primera: qué hizo diferente este cliente', 'No fue magia. Fueron 3 hábitos mantenidos durante 12 meses.', '<p>Este cliente superó su auditoría de certificación a la primera, sin no conformidades. No fue magia ni fue suerte: fueron tres hábitos mantenidos durante doce meses.</p><ul><li><strong>Quince minutos semanales de sistema.</strong> Cada lunes, la responsable de calidad revisaba tres cosas: no conformidades abiertas, indicadores fuera de rango y acciones pendientes. Quince minutos. Cincuenta y dos semanas.</li><li><strong>El sistema en las reuniones que ya existían.</strong> No crearon "reuniones de calidad": añadieron cinco minutos de sistema a la reunión de producción de los jueves. La calidad dejó de ser un mundo aparte.</li><li><strong>Registrar en el momento, no a final de mes.</strong> La regla era simple: lo que no se registra hoy, se inventa mañana. Y lo inventado se nota en auditoría.</li></ul><p>El auditor lo escribió textualmente en su informe: "sistema plenamente integrado en la operativa". Esa frase vale más que el certificado.</p>', '¿Quieres implantar estos hábitos en tu empresa? Es más fácil de lo que parece.', 'P2 CASOS', 'TuConsultor', '2026-08-27', 'programado', '{"casos"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('como-elegir-consultora-iso', 'Cómo elegir consultora ISO: 6 preguntas antes de firmar', 'No todas las consultoras trabajan igual. Estas preguntas separan el grano de la paja.', '<p>Sí, somos consultora y vamos a decirte cómo elegir consultora. Precisamente por eso: estas seis preguntas separan el grano de la paja, y no nos da miedo que nos las hagan.</p><ul><li><strong>¿Quién va a llevar mi proyecto exactamente?</strong> Nombre y experiencia. Que no te venda un senior y te envíe a un junior sin supervisión.</li><li><strong>¿La documentación será a medida o plantilla?</strong> Pide ver un ejemplo de un procedimiento real (anonimizado).</li><li><strong>¿Cuántas horas incluye y cómo se reparten?</strong> Desconfía de presupuestos sin desglose de dedicación.</li><li><strong>¿Qué pasa si la auditoría va mal?</strong> Una consultora seria te acompaña en el cierre de no conformidades sin coste extra abusivo.</li><li><strong>¿Me puedes dar referencias de mi sector?</strong> Y llámalas de verdad.</li><li><strong>¿Qué necesitas de mí?</strong> Si la respuesta es "casi nada", huye: un sistema sin implicación del cliente es un sistema de cartón.</li></ul>', 'Guárdalas para tu próxima reunión comercial. Con nosotros incluida.', 'P5 CONSEJOS', 'TuConsultor', '2026-08-31', 'programado', '{"consejos"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('precio-certificacion-barato-caro', 'El precio de una certificación: por qué lo barato sale caro', '"¿Cuánto cuesta el certificado?" es la pregunta equivocada. Te explico cuál es la correcta.', '<p>"¿Cuánto cuesta el certificado?" es la pregunta que más recibimos y es la pregunta equivocada. La correcta es: <strong>¿cuánto cuesta tener un sistema que funcione?</strong> El certificado es la consecuencia, no el producto.</p><p>Cuando un presupuesto de consultoría es sospechosamente barato, el ahorro sale de algún sitio: plantillas genéricas que no reflejan tu empresa, un consultor sin experiencia haciendo diez proyectos a la vez, o un sistema diseñado para engañar al auditor en lugar de servir al negocio.</p><p>Y ese ahorro se paga después: horas internas corrigiendo documentación inútil, no conformidades en auditoría, y lo peor, un sistema que la plantilla percibe como teatro y que muere en dos años.</p><p>Nuestra posición es transparente: trabajamos con tarifas por perfil de consultor y horas planificadas por proceso, con desglose completo en la oferta. Se puede comparar. Y eso es exactamente lo que recomendamos hacer.</p>', 'Pide presupuesto desglosado, a nosotros y a quien quieras. Luego compara.', 'P3 OPINIÓN', 'TuConsultor', '2026-09-02', 'programado', '{"opinion"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('un-dia-con-nuestras-consultoras', 'Un día con nuestras consultoras: cómo es un proyecto por dentro', 'Spoiler: hay menos papeleo y más conversaciones de las que imaginas.', '<p>¿Cómo es realmente el trabajo de una consultora de sistemas de gestión? Spoiler: hay menos papeleo y más conversaciones de las que imaginas.</p><p>Una jornada tipo en un proyecto de implantación:</p><ul><li><strong>9:00 — Sesión con el responsable de producción.</strong> No para escribir un procedimiento: para entender cómo trabaja de verdad antes de escribir nada.</li><li><strong>11:00 — Revisión de indicadores con gerencia.</strong> Media hora de datos y decisiones. Aquí es donde el sistema demuestra si sirve.</li><li><strong>12:30 — Redacción y registro en Consultify.</strong> Las horas del proyecto, las tareas por subproceso y el avance quedan registrados en nuestra plataforma en el momento.</li><li><strong>15:00 — Preparación de auditoría interna de otro cliente.</strong> Checklist, muestreo y agenda.</li></ul><p>El oficio consiste en escuchar mucho, escribir poco y bien, y conseguir que el sistema viva en la operativa, no en una carpeta.</p>', '¿Quieres formar parte del equipo o trabajar con nosotros? hola@tuconsultor.com.', 'P4 MARCA', 'TuConsultor', '2026-09-03', 'programado', '{"marca"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('auditoria-interna-8-horas', 'Auditoría interna: cómo hacerla en 8 horas sin morir en el intento', 'Una auditoría interna no necesita 3 semanas. Necesita método.', '<p>Una auditoría interna de una pyme no necesita tres semanas: necesita método. Así la resolvemos en una jornada de 8 horas para un sistema de un solo centro:</p><ul><li><strong>Antes (2 h, otro día):</strong> revisar documentación, resultados anteriores y preparar el plan de muestreo. La auditoría se gana en la preparación.</li><li><strong>9:00-9:30 — Reunión de apertura</strong> corta: agenda, alcance y reglas del juego.</li><li><strong>9:30-13:30 — Procesos operativos.</strong> En el puesto de trabajo, con la gente que hace el trabajo. Evidencias reales, no entrevistas de despacho.</li><li><strong>14:30-16:00 — Procesos de dirección y soporte:</strong> objetivos, indicadores, formación, compras.</li><li><strong>16:00-17:00 — Contraste de hallazgos y reunión de cierre.</strong> Sin sorpresas: todo hallazgo se ha comentado ya con el auditado.</li></ul><p>El informe, en 48 horas máximo. Un informe que llega un mes tarde es arqueología, no auditoría.</p>', 'También hacemos auditorías internas externalizadas. Pregúntanos.', 'P5 CONSEJOS', 'TuConsultor', '2026-09-07', 'programado', '{"consejos"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('madrid-excelente-que-es', 'Madrid Excelente: qué es y qué aporta el sello', 'Hay un sello que mide gestión, clientes y compromiso social. Y pocas empresas lo conocen.', '<p>Hay un sello de calidad que evalúa la excelencia en la gestión, la satisfacción de los clientes y el compromiso social de las empresas madrileñas, y que sorprendentemente pocas pymes conocen: <strong>Madrid Excelente</strong>, la marca de garantía del Gobierno de la Comunidad de Madrid.</p><p>Qué evalúa, en esencia:</p><ul><li>La calidad de la gestión: estrategia, procesos, resultados.</li><li>La orientación al cliente y su satisfacción demostrable.</li><li>El compromiso social y con el territorio: empleo, conciliación, sostenibilidad.</li></ul><p>Qué aporta: diferenciación frente a competidores, uso de la marca en comunicación comercial, y una evaluación externa rigurosa que sirve de diagnóstico. Para empresas que ya tienen ISO 9001 o han trabajado con EFQM, el salto es asumible: buena parte de las evidencias ya existen.</p><p>Si tu empresa opera en la Comunidad de Madrid y presume de hacer las cosas bien, este sello es la forma de demostrarlo con respaldo institucional.</p>', '¿Quieres saber si tu empresa está preparada? Hacemos el pre-diagnóstico.', 'P1 EDUCATIVO', 'TuConsultor', '2026-09-09', 'programado', '{"educativo"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('certificacion-multinorma-4-sistemas', 'Certificación multinorma: el caso de un cliente con 4 sistemas integrados', '9001 + 27001 + 45001 + 14001 en una sola auditoría integrada. Se puede.', '<p>Cuatro normas (9001, 14001, 45001 y 27001), una sola auditoría integrada, un solo sistema. Se puede, y este cliente tecnológico-industrial lo demuestra.</p><p>Las claves del proyecto:</p><ul><li><strong>Un mapa de procesos único.</strong> Cada proceso identifica sus requisitos de calidad, ambiente, seguridad laboral y seguridad de la información. Nadie gestiona "cuatro sistemas": gestiona su proceso.</li><li><strong>Riesgos en una sola matriz</strong> con las cuatro dimensiones. Un riesgo de subcontratación, por ejemplo, se evalúa a la vez en las cuatro perspectivas.</li><li><strong>Calendario único de auditorías internas</strong>, con auditores cruzados por competencia.</li><li><strong>Una revisión por la dirección</strong> anual de tres horas, no cuatro reuniones clónicas.</li></ul><p>Resultado en números: la auditoría externa integrada duró 6 jornadas frente a las 10-11 que habrían sumado por separado, con el ahorro correspondiente en coste de certificadora y en desgaste interno.</p><p>La integración no es una técnica avanzada. Es sentido común aplicado con rigor.</p>', '¿Cuántas normas gestionas y en cuántos sistemas? Si la respuesta no es "uno", hablemos.', 'P2 CASOS', 'TuConsultor', '2026-09-10', 'programado', '{"casos"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('contexto-partes-interesadas-1-pagina', 'Contexto y partes interesadas: cómo hacerlo en 1 página', 'El análisis de contexto no necesita 20 páginas. Necesita 1 bien pensada.', '<p>Hemos visto análisis de contexto de 20 páginas que no dicen nada y análisis de una página que sostienen todo el sistema. El formato que usamos y regalamos:</p><p><strong>Una tabla, cuatro columnas:</strong></p><ul><li><strong>Factor / Parte interesada:</strong> qué o quién. Ejemplo: "cliente principal (40% facturación)", "nueva normativa de envases", "dificultad para contratar oficiales".</li><li><strong>Qué espera o cómo afecta:</strong> en una frase concreta, sin literatura.</li><li><strong>Relevancia:</strong> alta / media / baja. Sé honesto: no todo es alto.</li><li><strong>Qué hacemos al respecto:</strong> la conexión con riesgos, objetivos o procesos. Esta columna es la que convierte el análisis en herramienta.</li></ul><p>Reglas: máximo 12-15 filas (si tienes 40, no has priorizado), revisión anual o cuando pase algo gordo, y prohibido copiar el del año pasado sin releerlo.</p><p>El auditor no mide el peso del documento. Mide si la empresa se conoce a sí misma.</p>', 'Guarda la plantilla. Y si quieres la nuestra en Excel, pídenosla gratis.', 'P5 CONSEJOS', 'TuConsultor', '2026-09-14', 'programado', '{"consejos"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('sistemas-gestion-ia-automatizacion', 'Sistemas de gestión con IA: lo que ya estamos automatizando (y lo que no)', 'La IA ya redacta procedimientos. La pregunta es: ¿debería?', '<p>La IA ya es capaz de redactar un procedimiento completo en treinta segundos. La pregunta interesante no es si puede, sino si debe, y para qué.</p><p><strong>Lo que ya automatizamos con criterio:</strong></p><ul><li>Borradores de documentación a partir de entrevistas reales con el cliente. La IA redacta; el consultor y el cliente corrigen lo que no refleja la realidad.</li><li>Análisis de indicadores: detección de tendencias y desviaciones que a ojo se escapan.</li><li>Preparación de auditorías: checklists por norma y muestreos.</li><li>Gestión operativa de proyectos en nuestra plataforma Consultify.</li></ul><p><strong>Lo que nos negamos a automatizar:</strong> el diagnóstico inicial, las conversaciones con la dirección, la decisión de qué es relevante para cada negocio, y la firma de un informe de auditoría. Ahí es donde un texto plausible pero equivocado hace daño de verdad.</p><p>La regla que nos funciona: la IA acelera todo lo que ya sabes hacer bien. Y amplifica todo lo que haces mal.</p>', '¿Usarías IA en tu sistema de gestión? Nos interesa tu opinión.', 'P3 OPINIÓN', 'TuConsultor', '2026-09-16', 'programado', '{"opinion"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('novedades-consultify-trimestre', 'Semáforo de cobros, sincronización de clientes, planificación: novedades de Consultify', 'Seguimos construyendo. Esto es lo nuevo de nuestra plataforma este trimestre.', '<p>Seguimos construyendo Consultify, nuestra plataforma de gestión para consultoría, y este trimestre han llegado tres novedades de las que estamos especialmente orgullosos:</p><ul><li><strong>Semáforo de cobros conectado a la contabilidad.</strong> Cada cliente muestra en verde, amarillo o rojo el estado de sus facturas, con actualización diaria automática. Se acabó perseguir Excel de cobros.</li><li><strong>Sincronización automática de clientes</strong> con nuestra plataforma de comunicación: cada alta o cambio se refleja al instante, sin dobles capturas.</li><li><strong>Planificación por modelos de servicio:</strong> los cuatro modelos de colaboración se ven y editan lado a lado por norma, con las horas por proceso y perfil de consultor.</li></ul><p>Todo nace de la misma filosofía: cada hora que no gastamos en administración es una hora más de consultoría real para nuestros clientes.</p><p>Y sí, lo construimos nosotros. Con mucho café y mucho cariño, en Madrid.</p>', '¿Quieres ver Consultify por dentro? Pide una demo en consultify.pro.', 'P4 MARCA', 'TuConsultor', '2026-09-17', 'programado', '{"marca"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('objetivos-calidad-5-ejemplos', 'Objetivos de calidad que no dan vergüenza: 5 ejemplos reales', '"Mejorar la satisfacción del cliente" no es un objetivo. Es un deseo.', '<p>"Mejorar la satisfacción del cliente" no es un objetivo: es un deseo. Un objetivo de verdad tiene meta numérica, plazo, responsable y plan. Cinco ejemplos reales (adaptados) que sí funcionan:</p><ul><li><strong>Reducir las reclamaciones por errores de envío del 2,1% al 1,2%</strong> de los pedidos antes del 31/12, rediseñando el control de expediciones. Responsable: jefe de logística.</li><li><strong>Bajar el plazo medio de respuesta a ofertas de 9 a 4 días laborables</strong> en el primer semestre, con plantillas y aprobación delegada.</li><li><strong>Conseguir que el 100% de las no conformidades se cierren en menos de 45 días</strong> (hoy: media de 92).</li><li><strong>Reducir el consumo eléctrico por unidad producida un 8%</strong> este ejercicio (objetivo integrado con 14001).</li><li><strong>Formar e independizar a un segundo auditor interno</strong> antes de junio, para eliminar el cuello de botella actual.</li></ul><p>El test: si en la revisión de junio no puedes decir cuánto llevas conseguido con un número, no era un objetivo.</p>', 'Guarda estos ejemplos para tu próxima definición de objetivos.', 'P5 CONSEJOS', 'TuConsultor', '2026-09-21', 'programado', '{"consejos"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('iso-45001-mas-alla-cumplimiento', 'ISO 45001: seguridad y salud más allá del cumplimiento legal', 'La prevención de riesgos laborales ya la tienes. La 45001 es otra cosa.', '<p>"Ya tenemos prevención de riesgos, ¿para qué la 45001?" Es la objeción más habitual y nace de una confusión: la prevención legal (plan de prevención, evaluaciones, vigilancia de la salud) es el suelo obligatorio. La <strong>ISO 45001</strong> es un sistema de gestión: otra cosa.</p><p>Las diferencias que importan:</p><ul><li>La ley te exige evaluar riesgos; la 45001 te exige además <strong>gestionar oportunidades</strong> de mejora de la seguridad y salud, y demostrar mejora continua.</li><li>La ley se centra en el cumplimiento; la norma exige <strong>liderazgo visible de la dirección</strong> y consulta y participación real de la plantilla, con evidencias.</li><li>La 45001 integra la seguridad en la operación diaria: compras, subcontratas, cambios, emergencias, no como servicio externo que visita dos veces al año.</li></ul><p>El resultado medible en las empresas que la implantan bien: menos siniestralidad, menos absentismo y mejor posición en licitaciones y homologaciones de cliente donde cada vez más se exige.</p>', '¿Tienes la prevención externalizada y desconectada del negocio? Hablemos.', 'P1 EDUCATIVO', 'TuConsultor', '2026-09-23', 'programado', '{"educativo"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('sistema-abandonado-2-anos', 'Lo que pasa cuando un sistema se abandona 2 años (historia real)', 'Nos llamaron 3 semanas antes de la auditoría de renovación. El sistema llevaba 2 años parado.', '<p>Nos llamaron tres semanas antes de su auditoría de renovación. El responsable de calidad se había ido hacía dos años y nadie había asumido el sistema: sin auditorías internas, sin revisión por la dirección, con indicadores congelados en 2024.</p><p>Fuimos honestos desde el minuto uno: en tres semanas no se reconstruyen dos años, y maquillar registros ni es ético ni funciona (los auditores lo detectan siempre). Lo que sí se podía hacer:</p><ul><li>Aplazar la auditoría seis semanas negociando con la certificadora. Se aceptó.</li><li>Hacer de verdad, aunque comprimido, lo esencial: auditoría interna real, revisión por la dirección real, plan de acciones honesto que reconociera el parón.</li><li>Presentarse con transparencia: "el sistema estuvo desatendido, esto es lo que hemos hecho y este es el plan".</li></ul><p>Resultado: renovación con dos no conformidades menores y una felicitación del auditor por la honestidad del enfoque. Y una lección para el cliente: el sistema ahora tiene dos responsables, no uno.</p>', '¿Tu sistema lleva tiempo parado? Aún hay solución, pero cuanto antes, mejor.', 'P2 CASOS', 'TuConsultor', '2026-09-24', 'programado', '{"casos"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('cuenta-atras-90-dias-auditoria', 'Preparar la auditoría de certificación: cuenta atrás de 90 días', '90, 60, 30 días: qué hacer en cada hito antes de la auditoría.', '<p>La auditoría de certificación no se prepara la semana antes. Se prepara con una cuenta atrás de 90 días:</p><p><strong>Día -90:</strong></p><ul><li>Auditoría interna completa de todo el alcance. Es tu ensayo general: cuanto más exigente, mejor.</li><li>Verificar que hay registros de al menos 3 meses de funcionamiento real del sistema.</li></ul><p><strong>Día -60:</strong></p><ul><li>Cerrar las acciones derivadas de la auditoría interna (las importantes, con evidencias).</li><li>Celebrar la revisión por la dirección con todos los elementos de entrada.</li><li>Confirmar con la certificadora alcance, fechas y agenda de la fase 1.</li></ul><p><strong>Día -30:</strong></p><ul><li>Resolver los hallazgos de la fase 1 documental.</li><li>Sesión breve con el equipo: qué es una auditoría, qué preguntarán, y la regla de oro (responder con la verdad y con evidencias, no con lo que "queda bien").</li></ul><p><strong>Día -7:</strong> logística, agenda interna y tranquilidad. Si los 90 días se hicieron, la auditoría es un trámite exigente, no un examen sorpresa.</p>', 'Guarda esta cuenta atrás. Y si quieres que la ejecutemos contigo, aquí estamos.', 'P5 CONSEJOS', 'TuConsultor', '2026-09-28', 'programado', '{"consejos"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('calidad-no-es-burocracia', 'Calidad no es burocracia: contra el mito del papeleo ISO', '"La ISO es papeleo" es la frase que más escucho. Y la que más rabia me da.', '<p>"La ISO es puro papeleo." Es la frase que más escuchamos en primeras reuniones, y la que más rabia nos da. No porque sea mentira siempre, sino porque a veces es verdad, y la culpa no es de la norma.</p><p>La ISO 9001 actual exige muy poca documentación obligatoria. Muchísima menos de lo que la gente cree. El papeleo asfixiante viene de otro sitio:</p><ul><li>De consultoras que venden manuales de 200 páginas porque el kilo de papel aparenta valor.</li><li>De la creencia de que "por si acaso el auditor lo pide" justifica cualquier registro.</li><li>De sistemas heredados que nadie se atreve a podar.</li></ul><p>Nuestra experiencia tras cientos de auditorías: los mejores sistemas que hemos visto caben en poco más de una carpeta, y las empresas que los tienen no distinguen entre "trabajar" y "cumplir la ISO" porque son la misma cosa.</p><p>Si tu sistema te estorba, el problema no es la calidad. Es el diseño de tu sistema. Y eso tiene arreglo: se llama simplificación, y es de nuestros proyectos favoritos.</p>', '¿Tu sistema pesa demasiado? Pide una revisión de simplificación.', 'P3 OPINIÓN', 'TuConsultor', '2026-09-30', 'programado', '{"opinion"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

insert into public.blog_posts (slug, titulo, extracto, contenido_html, cta, pilar, autor, fecha_publicacion, estado, tags)
values ('balance-q3-2026', 'Q3 2026 en TuConsultor: certificaciones, aprendizajes y lo que viene', 'Trimestre cerrado. Estos son los números y las lecciones.', '<p>Cerramos el tercer trimestre de 2026 y, como cada trimestre, toca ejercicio de transparencia: números, lecciones y lo que viene.</p><p><strong>Lo que ha dado de sí el trimestre:</strong> nuevos proyectos de certificación en marcha, auditorías acompañadas superadas, y un verano en el que Consultify, nuestra plataforma, ha seguido creciendo con el semáforo de cobros y la sincronización automática de clientes.</p><p><strong>La lección del trimestre:</strong> las normas "nuevas" ya no son nicho. Las consultas sobre ISO 42001 (gestión de IA) y sobre planes de igualdad se han multiplicado, y la conversación con los clientes está cambiando: ya no preguntan solo "qué necesito para certificarme", sino "cómo hago que esto sirva de verdad". Nos encanta ese cambio.</p><p><strong>Lo que viene en Q4:</strong> más contenido práctico en este blog cada semana, novedades de plataforma y la campaña de renovaciones de final de año, que ya está en marcha.</p><p>Gracias por leernos y por confiar. Desde 2006, gestionando con el corazón.</p>', '¿Arrancamos juntos el Q4? hola@tuconsultor.com.', 'P4 MARCA', 'TuConsultor', '2026-10-01', 'programado', '{"marca"}')
on conflict (slug) do update set
  titulo=excluded.titulo, extracto=excluded.extracto, contenido_html=excluded.contenido_html,
  cta=excluded.cta, pilar=excluded.pilar, autor=excluded.autor,
  fecha_publicacion=excluded.fecha_publicacion, estado=excluded.estado, tags=excluded.tags;

commit;

-- Comprobación: nº de posts y rango de fechas
select count(*) as total, min(fecha_publicacion) as primera, max(fecha_publicacion) as ultima from public.blog_posts;

-- ══════════════ admin-alejandro.sql ══════════════

-- ============================================================
-- ACCESO SUPERADMIN · alejandro@tuconsultor.com
-- Proyecto Supabase: consultify
--
-- REQUISITO PREVIO: el usuario debe existir en auth.users.
-- Dos formas de crearlo (elige una):
--   a) Regístrate tú mismo en https://consultify.pro/app/acceso
--   b) En el panel: Authentication → Users → Add user →
--      email alejandro@tuconsultor.com + contraseña
--      (marca "Auto Confirm User" para no esperar el email)
--
-- Después ejecuta este script en SQL Editor.
-- ============================================================

-- 1) Ascender a admin (idempotente: puedes ejecutarlo varias veces)
update public.perfiles
set    rol     = 'admin',
       nombre  = coalesce(nullif(nombre, ''), 'Alejandro'),
       empresa = coalesce(nullif(empresa, ''), 'TuConsultor')
where  id = (select id from auth.users where email = 'alejandro@tuconsultor.com');

-- 2) Red de seguridad: si el usuario existe en auth pero el trigger
--    aún no le creó perfil (caso raro), créalo ya como admin.
insert into public.perfiles (id, rol, nombre, empresa)
select id, 'admin', 'Alejandro', 'TuConsultor'
from   auth.users
where  email = 'alejandro@tuconsultor.com'
  and  not exists (select 1 from public.perfiles p where p.id = auth.users.id);

-- 3) Comprobación: debe devolver una fila con rol = admin
select u.email, p.rol, p.nombre, p.empresa
from   auth.users u
join   public.perfiles p on p.id = u.id
where  u.email = 'alejandro@tuconsultor.com';
