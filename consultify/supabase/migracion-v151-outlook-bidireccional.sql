-- ════════════════════════════════════════════════════════════════════════════
-- v151 · SINCRONIZACIÓN BIDIRECCIONAL CON OUTLOOK (Microsoft Graph)
--
-- Hasta ahora Órbita publicaba un .ics de solo lectura: el calendario se leía,
-- no se escribía. Esto es lo otro: cada sesión es un evento REAL en el
-- calendario del consultor, y lo que él mueva o cancele allí vuelve aquí.
--
-- Decisiones que quedan grabadas en el esquema, no en la cabeza de nadie:
--
-- · Gana el último cambio. Para poder decidir hace falta saber CUÁNDO se tocó
--   cada lado: `tarea_sesiones.actualizado` (nuevo, con disparador) frente al
--   `lastModifiedDateTime` que devuelve Graph.
--
-- · El bucle se corta con `outlook_change_key`. Cada vez que escribimos en
--   Outlook guardamos el changeKey que nos devuelve; cuando llega el aviso de
--   ese mismo cambio, el changeKey coincide y se ignora. Sin esto, escribir
--   provoca un aviso que provoca una escritura, y así hasta el infinito.
--
-- · Borrar en Outlook NO borra la fila. La sesión pasa a `anulada`, que es el
--   estado que el resto del sistema ya entiende (el feed la excluye, las horas
--   no cuentan). Un clic accidental en un móvil no puede destruir el registro
--   de un trabajo hecho.
--
-- · Nadie sincroniza sin decirlo: `perfiles.outlook_sync` es false por defecto.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1 · Cuándo se tocó por última vez cada sesión ───────────────────────────
alter table tarea_sesiones add column if not exists actualizado timestamptz not null default now();

create or replace function tocar_actualizado()
returns trigger language plpgsql as $$
begin
  new.actualizado := now();
  return new;
end $$;

drop trigger if exists tarea_sesiones_actualizado on tarea_sesiones;
create trigger tarea_sesiones_actualizado
  before update on tarea_sesiones
  for each row execute function tocar_actualizado();

-- ── 2 · El enlace de cada sesión con su evento ──────────────────────────────
alter table tarea_sesiones
  add column if not exists outlook_event_id     text,
  add column if not exists outlook_change_key   text,
  add column if not exists outlook_sincronizado timestamptz,
  add column if not exists outlook_estado       text;   -- ok · error · huerfano

comment on column tarea_sesiones.outlook_change_key is
  'changeKey del evento tal y como quedó tras NUESTRA última escritura. Si un aviso trae este mismo valor, el cambio es nuestro y se ignora: así no se realimenta.';

create unique index if not exists tarea_sesiones_outlook_event_id_key
  on tarea_sesiones (outlook_event_id) where outlook_event_id is not null;

-- ── 3 · Quién sincroniza y con qué buzón ────────────────────────────────────
alter table perfiles
  add column if not exists outlook_sync boolean not null default false,
  add column if not exists outlook_upn  text;

comment on column perfiles.outlook_upn is
  'Cuenta de Microsoft 365 cuyo calendario se sincroniza. Si está vacía se usa `email`. Se separa porque el correo de acceso a Órbita y el del buzón no tienen por qué coincidir.';

-- ── 4 · Las suscripciones de Graph (los avisos de cambio) ───────────────────
-- Caducan a los ~3 días (4230 min es el máximo para calendario), así que hay
-- que renovarlas a diario. `delta_link` es el plan B: si se pierde un aviso,
-- la consulta delta trae lo que haya cambiado desde la última vez.
create table if not exists outlook_suscripciones (
  consultor_id    uuid primary key references perfiles(id) on delete cascade,
  subscription_id text unique,
  recurso         text,
  client_state    text,
  expira          timestamptz,
  delta_link      text,
  ultimo_error    text,
  actualizado     timestamptz not null default now()
);

-- ── 5 · Bitácora: qué se sincronizó, en qué dirección y cómo acabó ──────────
-- Sin esto, «me ha desaparecido una sesión» no tiene respuesta posible.
create table if not exists outlook_bitacora (
  id           bigserial primary key,
  momento      timestamptz not null default now(),
  direccion    text not null check (direccion in ('a_outlook', 'a_orbita')),
  sesion_id    uuid,
  consultor_id uuid,
  accion       text,      -- crear · actualizar · borrar · mover · ignorar
  resultado    text,      -- ok · error · omitido
  detalle      text
);
create index if not exists outlook_bitacora_momento_idx on outlook_bitacora (momento desc);
create index if not exists outlook_bitacora_sesion_idx  on outlook_bitacora (sesion_id);

-- ── 6 · Permisos ────────────────────────────────────────────────────────────
-- Las dos tablas nuevas son del backend: solo la clave de servicio escribe.
-- Con RLS activo y sin políticas, anon y authenticated no leen nada.
alter table outlook_suscripciones enable row level security;
alter table outlook_bitacora      enable row level security;

-- Excepción: cada persona puede ver el estado de SU suscripción, para que la
-- pantalla pueda decir «conectado» o «caducado» sin pasar por el backend.
drop policy if exists outlook_susc_propia on outlook_suscripciones;
create policy outlook_susc_propia on outlook_suscripciones
  for select to authenticated using (consultor_id = auth.uid());

grant select on outlook_suscripciones to authenticated;
