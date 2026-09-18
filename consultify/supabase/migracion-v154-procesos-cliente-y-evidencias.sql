-- ════════════════════════════════════════════════════════════════════════════
-- v154 · EL PROCESO COMO UNIDAD: EVIDENCIAS, ENTRADAS/SALIDAS Y EL MAPA DEL CLIENTE
--
-- Hasta ahora el catálogo sabía QUÉ hay que hacer (tarea, subtareas, horas por
-- modelo) pero no QUÉ hay que enseñar cuando llegue el auditor. Y el SxxPxx
-- del cliente era una etiqueta de texto: no apuntaba a nada.
--
-- Tres piezas:
--
-- 1 · El catálogo gana evidencias, entradas y salidas por subproceso. Mismo
--     patrón que las subtareas, que ya funciona: se define una vez y se hereda.
--
-- 2 · `cliente_procesos` es el mapa de procesos DEL CLIENTE. Nace copiado del
--     catálogo al arrancar el proyecto y a partir de ahí es suyo: puede
--     renombrar, añadir los procesos de su casa y desactivar los que no le
--     apliquen. Sin esta tabla, «el proceso del cliente» no existe: solo hay un
--     texto repetido en cada tarea.
--
-- 3 · `cliente_evidencias` es lo que de verdad se pide y se comprueba: un
--     documento aportado contra una evidencia esperada, con el veredicto de la
--     revisión por IA guardado al lado. El veredicto se guarda, no se recalcula
--     cada vez que se abre la pantalla: cuesta dinero y tiene que poder
--     auditarse quién lo vio y cuándo.
--
-- ⚠ La IA propone, no decide. `estado` (lo que dice la persona) y `ia_veredicto`
--   (lo que opinó el modelo) son columnas distintas a propósito.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1 · El catálogo ─────────────────────────────────────────────────────────
alter table tareas_catalogo
  add column if not exists evidencias jsonb not null default '[]'::jsonb,
  add column if not exists entradas   text,
  add column if not exists salidas    text;

comment on column tareas_catalogo.evidencias is
  'Evidencias esperadas del subproceso: [{titulo, definicion, requisito, obligatoria}]. Se heredan al cliente al programar el proyecto, igual que las subtareas.';
comment on column tareas_catalogo.entradas is 'Qué entra al proceso: de dónde viene el trabajo.';
comment on column tareas_catalogo.salidas  is 'Qué sale del proceso: qué queda hecho y quién lo recibe.';

-- ── 2 · El mapa de procesos del cliente ─────────────────────────────────────
create table if not exists cliente_procesos (
  id            uuid primary key default gen_random_uuid(),
  cliente_id    uuid not null references clientes(id) on delete cascade,
  proyecto_id   uuid references proyectos_cliente(id) on delete set null,
  codigo        text,          -- S1 PA5
  proceso       text not null, -- PA5 GESTIÓN DE SEGURIDAD
  subproceso    text,          -- S1 PA5 GESTIÓN DE LA SEGURIDAD OPERACIONAL
  -- Cómo lo llama el cliente, si le cambia el nombre. El código no cambia:
  -- es la trazabilidad con el catálogo y con la norma.
  nombre        text,
  descripcion   text,
  entradas      text,
  salidas       text,
  responsable   text,
  normas        text[] not null default '{}',
  orden         integer,
  origen_catalogo_id uuid references tareas_catalogo(id) on delete set null,
  activo        boolean not null default true,
  creado        timestamptz not null default now(),
  actualizado   timestamptz not null default now()
);

create index if not exists cliente_procesos_cliente_idx  on cliente_procesos (cliente_id);
create index if not exists cliente_procesos_proyecto_idx on cliente_procesos (proyecto_id);
-- Un subproceso no se duplica dentro del mismo proyecto. Con `proyecto_id`
-- nulo (procesos del cliente que no cuelgan de un proyecto) el índice parcial
-- lo trata aparte, que es lo correcto: `unique` con nulos no agrupa.
create unique index if not exists cliente_procesos_unico
  on cliente_procesos (cliente_id, coalesce(proyecto_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(subproceso, proceso));

drop trigger if exists cliente_procesos_actualizado on cliente_procesos;
create trigger cliente_procesos_actualizado
  before update on cliente_procesos
  for each row execute function tocar_actualizado();

-- La tarea del cliente sabe a qué proceso suyo pertenece.
alter table cliente_tareas
  add column if not exists cliente_proceso_id uuid references cliente_procesos(id) on delete set null;
create index if not exists cliente_tareas_proceso_idx on cliente_tareas (cliente_proceso_id);

-- ── 3 · Las evidencias del cliente ──────────────────────────────────────────
create table if not exists cliente_evidencias (
  id                 uuid primary key default gen_random_uuid(),
  cliente_id         uuid not null references clientes(id) on delete cascade,
  cliente_proceso_id uuid references cliente_procesos(id) on delete cascade,
  cliente_tarea_id   uuid references cliente_tareas(id) on delete set null,
  titulo             text not null,
  definicion         text,
  norma_id           text,
  requisito          text,       -- el apartado que la motiva: 7.5.3, 9.2.2…
  obligatoria        boolean not null default true,

  -- Lo que dice la PERSONA.
  estado             text not null default 'pendiente'
                     check (estado in ('pendiente', 'aportada', 'validada', 'rechazada', 'no_aplica')),
  documento_id       uuid references cliente_documentos(id) on delete set null,
  notas              text,

  -- Lo que opinó la IA, guardado y fechado. Se conserva aunque cambie el
  -- documento: así se ve que el veredicto es de antes y hay que repetirlo.
  ia_veredicto       text check (ia_veredicto in ('cumple', 'parcial', 'no_cumple')),
  ia_motivo          text,
  ia_faltas          jsonb not null default '[]'::jsonb,
  ia_requisito       text,       -- el contraste con el apartado de la norma
  ia_caduca_el       date,
  ia_vigente         boolean,
  ia_modelo          text,
  ia_revisado_en     timestamptz,
  ia_documento_id    uuid,       -- sobre qué documento se emitió el veredicto

  orden              integer,
  creado             timestamptz not null default now(),
  actualizado        timestamptz not null default now()
);

create index if not exists cliente_evidencias_cliente_idx  on cliente_evidencias (cliente_id);
create index if not exists cliente_evidencias_proceso_idx  on cliente_evidencias (cliente_proceso_id);
create index if not exists cliente_evidencias_pendientes_idx on cliente_evidencias (cliente_id, estado)
  where estado in ('pendiente', 'rechazada');

drop trigger if exists cliente_evidencias_actualizado on cliente_evidencias;
create trigger cliente_evidencias_actualizado
  before update on cliente_evidencias
  for each row execute function tocar_actualizado();

comment on table cliente_evidencias is
  'Lo que hay que enseñar en auditoría y si está. `estado` es lo que dice la persona; `ia_*` es lo que opinó el modelo al revisar el documento. Son cosas distintas a propósito: la IA propone, no decide.';

-- ── 4 · Permisos ────────────────────────────────────────────────────────────
alter table cliente_procesos   enable row level security;
alter table cliente_evidencias enable row level security;

drop policy if exists cliente_procesos_equipo on cliente_procesos;
create policy cliente_procesos_equipo on cliente_procesos
  for all to authenticated
  using (exists (select 1 from perfiles p where p.id = auth.uid() and coalesce(p.activo, true)
                 and p.rol = any (array['superadmin','admin','director','consultor','gestion','comercial'])))
  with check (exists (select 1 from perfiles p where p.id = auth.uid() and coalesce(p.activo, true)
                 and p.rol = any (array['superadmin','admin','director','consultor','gestion','comercial'])));

drop policy if exists cliente_evidencias_equipo on cliente_evidencias;
create policy cliente_evidencias_equipo on cliente_evidencias
  for all to authenticated
  using (exists (select 1 from perfiles p where p.id = auth.uid() and coalesce(p.activo, true)
                 and p.rol = any (array['superadmin','admin','director','consultor','gestion','comercial'])))
  with check (exists (select 1 from perfiles p where p.id = auth.uid() and coalesce(p.activo, true)
                 and p.rol = any (array['superadmin','admin','director','consultor','gestion','comercial'])));

grant select, insert, update, delete on cliente_procesos   to authenticated;
grant select, insert, update, delete on cliente_evidencias to authenticated;
