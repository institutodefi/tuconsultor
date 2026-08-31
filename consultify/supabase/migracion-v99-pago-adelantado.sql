-- ═══════════════════════════════════════════════════════════════════════════
-- v99 · PAGO ANUAL POR ADELANTADO (11 × 12) Y PERSONA DE CONTACTO
--
--   · `pago_adelantado`  la oferta se cobra por anticipado: once mensualidades
--                        por doce meses de servicio. No es un descuento sobre
--                        la cuota —la cuota no cambia— es un mes regalado a
--                        cambio del adelanto, y así hay que poder decirlo en la
--                        oferta.
--
--   · `contacto_id`      a qué persona del CRM se dirigió la oferta. Sin esto,
--                        al reeditarla desde el histórico no se sabía si el
--                        nombre escrito corresponde a alguien que sigue en la
--                        empresa, y no había forma de traer sus datos.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.presupuestos
  add column if not exists pago_adelantado boolean not null default false,
  add column if not exists contacto_id     uuid references public.contactos(id) on delete set null;

comment on column public.presupuestos.pago_adelantado is
  'Cobro anual anticipado: 11 mensualidades por 12 meses de servicio. Cambia el cuadro de facturación del PDF y del PPT.';
comment on column public.presupuestos.contacto_id is
  'Persona del CRM a la que se dirige la oferta. Permite traer sus datos al reeditarla.';

-- Solo tiene sentido en cuotas: en una implantación no hay mensualidades que
-- adelantar, y marcarlo ahí dejaría un cuadro de facturación incoherente.
alter table public.presupuestos drop constraint if exists presupuestos_adelantado_ok;
alter table public.presupuestos add constraint presupuestos_adelantado_ok check (
  pago_adelantado = false or tipo = 'mes');

create index if not exists presupuestos_contacto on public.presupuestos (contacto_id);
create index if not exists presupuestos_adelantado
  on public.presupuestos (pago_adelantado) where pago_adelantado;

notify pgrst, 'reload schema';

select 'v99 aplicada' as ok;
