-- ═══════════════════════════════════════════════════════════════════════════
-- v118 · CERTIFICADOS DEL CLIENTE · FECHA DE AUDITORÍA EXTERNA DEL PROYECTO
--
-- Va detrás de la v117. Dos cosas:
--
-- ── 1 · Certificados ───────────────────────────────────────────────────────
-- Cada cliente tiene sus certificados: norma, entidad certificadora, alcance,
-- fecha de certificación y fecha de validez. Hasta ahora solo existía el PDF
-- en `cliente_documentos`, y los datos había que leerlos abriéndolo. Ahora
-- son una fila, con el documento enlazado si lo hay.
--
-- De estos datos sale el aviso del panel: un certificado exige auditoría
-- externa cada año (seguimiento) y, al vencer la validez, la recertificación.
-- La próxima auditoría se estima como el siguiente aniversario de la fecha de
-- certificación (cada 365 días), sin pasar de la fecha de validez.
--
-- ── 2 · Auditoría externa programada ───────────────────────────────────────
-- `proyectos_cliente.fecha_auditoria_externa`: la fecha en que está fijada
-- la próxima auditoría externa de ese proyecto. Vacía = sin programar, y el
-- panel lo dice así. No sustituye a la «certificación prevista» que viene de
-- la oferta (esa es la primera, la de la implantación): esta es la que se
-- pacta cada año con la certificadora.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Certificados ───────────────────────────────────────────────────────
create table if not exists public.cliente_certificados (
  id                  uuid primary key default gen_random_uuid(),
  cliente_id          uuid not null references public.clientes(id) on delete cascade,
  proyecto_id         uuid references public.proyectos_cliente(id) on delete set null,
  -- Id de norma del catálogo (9001, 27001, 27701…) o texto libre para lo que
  -- no esté en él (ENS, EFQM, un sello sectorial).
  norma               text not null,
  entidad             text,                       -- certificadora: AENOR, Bureau Veritas, OCA…
  numero              text,                       -- nº de certificado
  alcance             text,
  fecha_certificacion date,
  fecha_validez       date,
  documento_id        uuid references public.cliente_documentos(id) on delete set null,
  notas               text,
  creado              timestamptz not null default now(),
  creado_por          uuid default auth.uid(),
  constraint cliente_certificados_fechas check (fecha_validez is null or fecha_certificacion is null or fecha_validez >= fecha_certificacion)
);

create index if not exists cliente_certificados_cliente_idx on public.cliente_certificados (cliente_id);

comment on table public.cliente_certificados is
  'Certificados de cada cliente: norma, entidad, alcance, fecha de certificación y de validez. De aquí sale el aviso de auditoría externa del panel.';

alter table public.cliente_certificados enable row level security;

-- Lectura: el equipo, todos. El cliente, los suyos.
drop policy if exists cc_lectura on public.cliente_certificados;
create policy cc_lectura on public.cliente_certificados for select to authenticated
  using (
    coalesce(public.mi_rol(), '') in ('superadmin','admin','director','consultor','gestion')
    or exists (select 1 from public.clientes c where c.id = cliente_certificados.cliente_id and c.user_id = auth.uid())
  );

-- Escritura: solo el equipo. Un certificado lo verificamos nosotros.
drop policy if exists cc_escritura on public.cliente_certificados;
create policy cc_escritura on public.cliente_certificados for all to authenticated
  using (coalesce(public.mi_rol(), '') in ('superadmin','admin','director','consultor','gestion'))
  with check (coalesce(public.mi_rol(), '') in ('superadmin','admin','director','consultor','gestion'));

grant select, insert, update, delete on public.cliente_certificados to authenticated;

-- ── 2 · Auditoría externa programada ───────────────────────────────────────
alter table public.proyectos_cliente
  add column if not exists fecha_auditoria_externa date;

comment on column public.proyectos_cliente.fecha_auditoria_externa is
  'Fecha fijada para la próxima auditoría externa del proyecto. Vacía = sin programar.';

notify pgrst, 'reload schema';

-- ── Comprobación ───────────────────────────────────────────────────────────
select 'v118 aplicada' as ok;
select count(*) as certificados from public.cliente_certificados;                                 -- 0
select column_name from information_schema.columns
 where table_name = 'proyectos_cliente' and column_name = 'fecha_auditoria_externa';             -- 1 fila
