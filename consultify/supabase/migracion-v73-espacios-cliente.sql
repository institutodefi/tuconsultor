-- ═══════════════════════════════════════════════════════════════════════════
-- v73 · ZONA DE CLIENTES · FASE 1 · LOS DOS ESPACIOS
--
-- Orbita.MSTool  · Orbita Management System Tool
-- Orbita.PTTool  · Orbita Project Transformation Tool
--
-- Esta fase monta SOLO el modelo: qué productos existen, qué herramientas tiene
-- cada uno, y cuáles están activos para cada cliente. La pantalla viene después.
--
-- Lo que ya existe y no se toca: `miembros_cliente` (v55) resuelve a qué
-- clientes pertenece cada persona y con qué rol. Sobre eso se apoya todo.
--
-- Por qué dos tablas de activación y no una: un cliente contrata un PRODUCTO,
-- pero dentro puede tener unas herramientas sí y otras no. Si solo hubiera una,
-- activar una herramienta suelta obligaría a duplicar el producto entero.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Catálogo de productos ──
create table if not exists public.productos (
  id          text primary key,
  nombre      text not null,
  nombre_corto text not null,
  descripcion text,
  color       text not null default '#1FA1A6',
  orden       int  not null default 100,
  activo      boolean not null default true
);

insert into public.productos (id, nombre, nombre_corto, descripcion, color, orden) values
  ('mstool', 'Orbita.MSTool', 'MSTool',
   'Orbita Management System Tool. El sistema de gestión de la organización: procesos, documentación, auditorías, no conformidades y mejora.',
   '#1FA1A6', 10),
  ('pttool', 'Orbita.PTTool', 'PTTool',
   'Orbita Project Transformation Tool. Los proyectos de transformación: alcance, fases, hitos, entregables y seguimiento.',
   '#F99001', 20)
on conflict (id) do update
  set nombre = excluded.nombre, nombre_corto = excluded.nombre_corto,
      descripcion = excluded.descripcion, color = excluded.color, orden = excluded.orden;

-- ── 2 · Herramientas de cada producto ──
-- Se van añadiendo de una en una, según se construyan.
create table if not exists public.producto_herramientas (
  id          text primary key,
  producto_id text not null references public.productos(id) on delete cascade,
  nombre      text not null,
  descripcion text,
  ruta        text not null,          -- ruta dentro del portal de cliente
  icono       text,
  orden       int  not null default 100,
  activa      boolean not null default true,   -- false = existe pero aún no está lista
  unique (producto_id, ruta)
);

insert into public.producto_herramientas (id, producto_id, nombre, descripcion, ruta, icono, orden, activa) values
  ('ms-panel',     'mstool', 'Panel del sistema',    'Estado general del sistema de gestión.',            'panel',        'layout-dashboard', 10, true),
  ('ms-documentos','mstool', 'Documentación',        'Documentos del sistema, con su versión e histórico.','documentos',   'files',            20, false),
  ('ms-procesos',  'mstool', 'Procesos',             'Mapa de procesos y sus indicadores.',               'procesos',     'workflow',         30, false),
  ('ms-auditorias','mstool', 'Auditorías',           'Programa de auditorías internas y sus hallazgos.',  'auditorias',   'clipboard-check',  40, false),
  ('ms-noconf',    'mstool', 'No conformidades',     'Incidencias, acciones correctivas y su cierre.',    'no-conformidades','alert-triangle', 50, false),
  ('pt-panel',     'pttool', 'Panel del proyecto',   'Estado general del proyecto de transformación.',    'panel',        'layout-dashboard', 10, true),
  ('pt-fases',     'pttool', 'Fases y hitos',        'Fases contratadas, hitos y fechas.',                'fases',        'milestone',        20, false),
  ('pt-tareas',    'pttool', 'Tareas',               'Qué está hecho, qué falta y quién lo tiene.',       'tareas',       'list-checks',      30, false),
  ('pt-entregables','pttool','Entregables',          'Lo que se entrega en cada fase.',                   'entregables',  'package',          40, false),
  ('pt-agenda',    'pttool', 'Agenda compartida',    'Sesiones, auditorías y revisiones.',                'agenda',       'calendar-days',    50, false)
on conflict (id) do update
  set nombre = excluded.nombre, descripcion = excluded.descripcion, ruta = excluded.ruta,
      icono = excluded.icono, orden = excluded.orden, activa = excluded.activa;

-- ── 3 · Qué tiene contratado cada cliente ──
create table if not exists public.cliente_productos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes(id) on delete cascade,
  producto_id text not null references public.productos(id) on delete cascade,
  activo      boolean not null default true,
  desde       date not null default current_date,
  hasta       date,
  notas       text,
  creado      timestamptz not null default now(),
  unique (cliente_id, producto_id)
);
create index if not exists cliente_productos_cliente on public.cliente_productos (cliente_id) where activo;

-- ── 4 · Herramientas activas de ese cliente ──
-- Sin fila = se hereda lo que diga el catálogo. Con fila, manda la fila.
create table if not exists public.cliente_herramientas (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes(id) on delete cascade,
  herramienta_id text not null references public.producto_herramientas(id) on delete cascade,
  activa         boolean not null default true,
  unique (cliente_id, herramienta_id)
);

-- ═══ RLS ═══════════════════════════════════════════════════════════════════
alter table public.productos enable row level security;
alter table public.producto_herramientas enable row level security;
alter table public.cliente_productos enable row level security;
alter table public.cliente_herramientas enable row level security;

-- Los catálogos los lee cualquiera con sesión: no hay nada sensible en ellos.
drop policy if exists productos_lectura on public.productos;
create policy productos_lectura on public.productos for select to authenticated using (true);
drop policy if exists herramientas_lectura on public.producto_herramientas;
create policy herramientas_lectura on public.producto_herramientas for select to authenticated using (true);

-- Escribirlos, solo el equipo con mando.
drop policy if exists productos_escritura on public.productos;
create policy productos_escritura on public.productos for all to authenticated
  using (public.mi_rol() in ('superadmin','admin')) with check (public.mi_rol() in ('superadmin','admin'));
drop policy if exists herramientas_escritura on public.producto_herramientas;
create policy herramientas_escritura on public.producto_herramientas for all to authenticated
  using (public.mi_rol() in ('superadmin','admin')) with check (public.mi_rol() in ('superadmin','admin'));

-- Lo contratado: el equipo lo ve todo; cada cliente, SOLO lo suyo.
-- Que un cliente pueda ver qué tienen contratado otros sería una fuga.
drop policy if exists cp_equipo on public.cliente_productos;
create policy cp_equipo on public.cliente_productos for all to authenticated
  using (public.mi_rol() in ('superadmin','admin','director','consultor','gestion'))
  with check (public.mi_rol() in ('superadmin','admin','director','consultor','gestion'));

drop policy if exists cp_propias on public.cliente_productos;
create policy cp_propias on public.cliente_productos for select to authenticated
  using (exists (select 1 from public.miembros_cliente m
                  where m.cliente_id = cliente_productos.cliente_id and m.usuario_id = auth.uid()));

drop policy if exists ch_equipo on public.cliente_herramientas;
create policy ch_equipo on public.cliente_herramientas for all to authenticated
  using (public.mi_rol() in ('superadmin','admin','director','consultor','gestion'))
  with check (public.mi_rol() in ('superadmin','admin','director','consultor','gestion'));

drop policy if exists ch_propias on public.cliente_herramientas;
create policy ch_propias on public.cliente_herramientas for select to authenticated
  using (exists (select 1 from public.miembros_cliente m
                  where m.cliente_id = cliente_herramientas.cliente_id and m.usuario_id = auth.uid()));

-- ═══ Lo que necesita la pantalla, en una sola llamada ══════════════════════
-- Devuelve las empresas de quien ha entrado, su rol en cada una y las
-- herramientas activas. La barra lateral y el panel salen de aquí.
--
-- Dos formas de pertenecer, y las dos cuentan:
--   · `miembros_cliente` (v55) → varias empresas, con rol por empresa
--   · `clientes.user_id`       → el vínculo antiguo, una cuenta a una empresa
--
-- Si solo mirara la primera, las cuentas de cliente que ya existen entrarían y
-- no verían nada. Quien venga por el vínculo antiguo entra como usuario_cliente,
-- que es el rol más restrictivo: para darle más, se le añade en miembros_cliente.
create or replace function public.mis_espacios()
returns jsonb language sql stable security definer as $$
  with pertenencias as (
    select m.cliente_id, m.rol_cliente
      from public.miembros_cliente m
     where m.usuario_id = auth.uid()
    union
    select c.id, 'usuario_cliente'
      from public.clientes c
     where c.user_id = auth.uid()
       and not exists (select 1 from public.miembros_cliente m2
                        where m2.cliente_id = c.id and m2.usuario_id = auth.uid())
  )
  select coalesce(jsonb_agg(e order by e->>'nombre'), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'cliente_id', c.id,
      'nombre',     c.empresa,
      'cif',        c.cif,
      'rol',        pt.rol_cliente,
      'productos',  coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', p.id, 'nombre', p.nombre, 'corto', p.nombre_corto,
                 'color', p.color, 'orden', p.orden,
                 'herramientas', coalesce((
                   select jsonb_agg(jsonb_build_object('id', h.id, 'nombre', h.nombre, 'ruta', h.ruta,
                                                       'icono', h.icono, 'descripcion', h.descripcion)
                                    order by h.orden)
                     from public.producto_herramientas h
                     left join public.cliente_herramientas ch
                            on ch.herramienta_id = h.id and ch.cliente_id = c.id
                    where h.producto_id = p.id
                      and coalesce(ch.activa, h.activa) is true
                 ), '[]'::jsonb))
               order by p.orden)
          from public.cliente_productos cp
          join public.productos p on p.id = cp.producto_id
         where cp.cliente_id = c.id and cp.activo
           and (cp.hasta is null or cp.hasta >= current_date)
           and p.activo
      ), '[]'::jsonb)
    ) as e
    from pertenencias pt
    join public.clientes c on c.id = pt.cliente_id
  ) t;
$$;

revoke all on function public.mis_espacios() from public, anon;
grant execute on function public.mis_espacios() to authenticated;

notify pgrst, 'reload schema';

select 'v73 aplicada · fase 1 de la zona de clientes' as ok;
