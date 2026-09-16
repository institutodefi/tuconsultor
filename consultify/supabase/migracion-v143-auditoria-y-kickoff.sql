-- =============================================================================
-- CONSULTIFY · Migración v143 · Jornadas de acompañamiento a auditoría
--
-- El acompañamiento a la auditoría externa (600 €/jornada) se vendía «aparte»
-- de palabra: no había dónde anotarlo, así que no viajaba a la oferta ni a la
-- factura. Ahora se elige en el creador y se guarda con el presupuesto, tanto
-- si acompaña a un servicio como si es lo único que se contrata (modelo
-- «Auditoría»).
-- =============================================================================
begin;

alter table public.presupuestos
  add column if not exists jornadas_auditoria integer not null default 0
  check (jornadas_auditoria >= 0 and jornadas_auditoria <= 60);

comment on column public.presupuestos.jornadas_auditoria is
  'Jornadas de acompañamiento a la auditoría externa contratadas (600 €/jornada). Cargo único, aparte de la cuota.';

-- La situación «auditoria» (vender solo las jornadas) es una puerta más del
-- creador de ofertas: hay que dejarla pasar por la restricción de la v141.
alter table public.presupuestos drop constraint if exists presupuestos_situacion_check;
alter table public.presupuestos add constraint presupuestos_situacion_check
  check (situacion is null or situacion in ('desde_cero','certificado','urgente','auditoria'));

commit;

-- =============================================================================
-- v144 · Coordinación y kickoff en todos los sistemas
--
-- Tres horas de arranque (reunión con la dirección, interlocutores, calendario,
-- accesos) que se hacían siempre y no estaban en ningún sitio: ni se
-- planificaban ni se contaban. Las lleva un jefe de proyecto o un senior, así
-- que la tarea exige nivel y la ficha avisa si el responsable no lo da.
-- =============================================================================
begin;

alter table public.tareas_catalogo add column if not exists nivel text
  check (nivel is null or nivel in ('J1','J2','J3','Senior'));
alter table public.cliente_tareas add column if not exists nivel text
  check (nivel is null or nivel in ('J1','J2','J3','Senior'));
comment on column public.tareas_catalogo.nivel is
  'Nivel mínimo que debe hacer la tarea. Null = lo decide el reparto del proyecto.';
comment on column public.cliente_tareas.nivel is
  'Nivel exigido, heredado del catálogo. La ficha avisa si el responsable no lo cumple.';

insert into public.tareas_catalogo (norma_id, modelo, titulo, proceso, subproceso, tipo, horas_base, orden, nivel, definicion, subtareas)
select distinct t.norma_id, t.modelo,
       'Coordinación y kickoff del proyecto',
       'PO2 GESTIÓN DEL PROYECTO',
       'S0 PO2 COORDINACIÓN Y KICKOFF',
       'produccion', 3, 0, 'Senior',
       'Reunión de arranque con la dirección y el equipo del cliente: alcance, interlocutores, calendario, forma de trabajo y accesos. La lleva el jefe de proyecto o un senior, y de ella sale el plan que se ejecuta después.',
       '[{"texto":"Reunión de arranque con la dirección"},{"texto":"Interlocutores y responsables por proceso"},{"texto":"Calendario y hitos acordados"},{"texto":"Accesos a Orbita y forma de trabajo"},{"texto":"Acta de kickoff enviada"}]'::jsonb
from public.tareas_catalogo t
where not exists (
  select 1 from public.tareas_catalogo k
  where k.norma_id = t.norma_id and k.modelo = t.modelo
    and k.subproceso = 'S0 PO2 COORDINACIÓN Y KICKOFF');

commit;
