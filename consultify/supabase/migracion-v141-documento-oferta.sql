-- =============================================================================
-- CONSULTIFY · Migración v141 · El documento de la oferta, guardado (v141)
--
-- `documento`: la copia exacta de lo que se imprimió en el PDF, sin la lógica
-- (reglas, horas por nivel, márgenes, motivos de ajuste). Es lo que Órbita
-- enseña al cliente en «Mis propuestas» y en el enlace del correo, y lo que ve
-- el equipo en el visualizador: el mismo objeto, para que nadie vea una cosa
-- distinta de la que se envió.
-- `situacion`: la puerta de entrada del creador de ofertas (desde cero /
-- ya certificado / urgente).
-- =============================================================================
begin;

alter table public.presupuestos add column if not exists documento    jsonb;
alter table public.presupuestos add column if not exists documento_en timestamptz;
alter table public.presupuestos add column if not exists situacion    text
  check (situacion is null or situacion in ('desde_cero','certificado','urgente'));

comment on column public.presupuestos.documento is
  'Copia del documento emitido (r, cli, anexo) sin la lógica interna. La enseña Órbita al cliente y al equipo.';
comment on column public.presupuestos.situacion is
  'Puerta de entrada del creador: desde_cero (Implantación), certificado (Relación/Implicación/Compromiso), urgente (Apoyo, ≤ 3 meses).';

commit;
