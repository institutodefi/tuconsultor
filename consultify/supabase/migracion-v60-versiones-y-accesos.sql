-- ═══════════════════════════════════════════════════════════════════════════
-- v60 · BACKLOG DE VERSIONES Y REGISTRO DE ACCESOS
--
-- Dos tablas para la zona de superadministración:
--
--   versiones         → qué se ha desplegado, cuándo y qué cambió
--   registro_accesos  → quién entra, cuándo y qué toca
--
-- El registro de accesos no es un capricho: es un requisito explícito del ENS
-- (medida op.exp.8, registro de la actividad) y de la ISO 27001 (A.8.15,
-- registros de eventos). Si vendéis ambas cosas, conviene tenerlo en casa.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══ 1 · BACKLOG DE VERSIONES ══════════════════════════════════════════════
create table if not exists public.versiones (
  id          uuid primary key default gen_random_uuid(),
  numero      text not null,                       -- v85, v86…
  titulo      text not null,
  notas       text,                                -- qué cambió, en prosa
  tipo        text not null default 'funcionalidad'
                check (tipo in ('funcionalidad','correccion','seguridad','contenido','datos')),
  estado      text not null default 'pendiente'
                check (estado in ('pendiente','desplegada','revertida')),
  fecha       date,                                -- fecha de despliegue
  creada_por  uuid references public.perfiles(id) on delete set null,
  creado      timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists versiones_orden_idx on public.versiones (fecha desc nulls first, creado desc);
create unique index if not exists versiones_numero_unico on public.versiones (numero);

create or replace function public.versiones_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists versiones_touch on public.versiones;
create trigger versiones_touch before update on public.versiones
  for each row execute function public.versiones_touch();

-- ═══ 2 · REGISTRO DE ACCESOS ═══════════════════════════════════════════════
create table if not exists public.registro_accesos (
  id          uuid primary key default gen_random_uuid(),
  perfil_id   uuid references public.perfiles(id) on delete set null,
  email       text,                                -- se guarda aparte: si el
                                                   -- perfil se borra, el rastro queda
  accion      text not null
                check (accion in ('entrada','salida','entrada_fallida','crear','editar','borrar','exportar','ver')),
  entidad     text,                                -- 'empresas', 'ofertas'…
  entidad_id  text,
  detalle     text,
  agente      text,                                -- navegador
  creado      timestamptz not null default now()
);

create index if not exists registro_accesos_fecha_idx on public.registro_accesos (creado desc);
create index if not exists registro_accesos_perfil_idx on public.registro_accesos (perfil_id, creado desc);
create index if not exists registro_accesos_accion_idx on public.registro_accesos (accion, creado desc);

-- ═══ 3 · RLS ═══════════════════════════════════════════════════════════════
alter table public.versiones enable row level security;
alter table public.registro_accesos enable row level security;

-- Versiones: las lee todo el equipo, las escribe dirección y administración.
drop policy if exists versiones_lectura on public.versiones;
create policy versiones_lectura on public.versiones for select to authenticated using (true);

drop policy if exists versiones_escritura on public.versiones;
create policy versiones_escritura on public.versiones for all to authenticated
  using (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo is true
                   and p.rol in ('superadmin','admin','director')))
  with check (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo is true
                   and p.rol in ('superadmin','admin','director')));

-- Registro de accesos: CUALQUIERA autenticado puede escribir su propia línea
-- (es lo que permite registrar la entrada), pero SOLO la superadministración
-- puede leerlo. Un registro que todo el mundo puede leer no sirve de control.
drop policy if exists registro_insercion on public.registro_accesos;
create policy registro_insercion on public.registro_accesos for insert to authenticated
  with check (perfil_id = auth.uid() or perfil_id is null);

drop policy if exists registro_lectura on public.registro_accesos;
create policy registro_lectura on public.registro_accesos for select to authenticated
  using (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo is true
                   and p.rol = 'superadmin'));

-- Nadie lo edita ni lo borra desde la aplicación: un registro que se puede
-- alterar no prueba nada. La limpieza se hace con la función de abajo.
drop policy if exists registro_sin_cambios on public.registro_accesos;

-- ═══ 4 · RETENCIÓN ═════════════════════════════════════════════════════════
-- El ENS pide conservar los registros, no guardarlos para siempre. Doce meses
-- es un plazo razonable; ejecútala cuando quieras (o desde un cron de Supabase).
create or replace function public.limpiar_registro_accesos(meses integer default 12)
returns integer language plpgsql security definer as $$
declare n integer;
begin
  delete from public.registro_accesos where creado < now() - (meses || ' months')::interval;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.limpiar_registro_accesos(integer) from public;
grant execute on function public.limpiar_registro_accesos(integer) to service_role;

notify pgrst, 'reload schema';

select 'v60 aplicada' as ok;
