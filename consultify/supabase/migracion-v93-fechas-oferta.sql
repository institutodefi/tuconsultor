-- ═══════════════════════════════════════════════════════════════════════════
-- v93 · FECHAS DE LA OFERTA: EMISIÓN Y PRIMER PAGO
--
-- La oferta ya tenía `fecha_inicio` y `fecha_certificacion` (v84). Faltaban dos:
--
--   · fecha_emision      cuándo se emite la oferta. Hasta ahora el PDF ponía
--                        la fecha del DÍA EN QUE SE GENERABA el documento, así
--                        que regenerar una oferta de marzo en agosto la fechaba
--                        en agosto. Con la validez de 30 días que consta en las
--                        condiciones, eso reabría el plazo sin querer.
--
--   · fecha_primer_pago  cuándo se emite la primera factura. Por defecto, el
--                        mismo mes que el inicio del proyecto: el servicio se
--                        cobra desde que arranca. Se deja como campo propio
--                        porque hay casos en que no coinciden (arranque a
--                        mitad de mes que se factura al siguiente, o un
--                        anticipo antes de empezar).
--
-- De `fecha_primer_pago` arranca el cuadro de facturación del PDF.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.presupuestos
  add column if not exists fecha_emision date,
  add column if not exists fecha_primer_pago date;

comment on column public.presupuestos.fecha_emision is
  'Fecha de emisión de la oferta. De aquí sale la fecha del PDF y el cómputo de los 30 días de validez.';
comment on column public.presupuestos.fecha_primer_pago is
  'Fecha de la primera factura. Por defecto, el mes de inicio del proyecto. Arranca el cuadro de facturación.';

-- ── Relleno de lo ya emitido ───────────────────────────────────────────────
-- La emisión es la fecha de creación de la fila: es el dato real, y mejor que
-- la de hoy, que es lo que venía imprimiéndose.
update public.presupuestos
   set fecha_emision = creado::date
 where fecha_emision is null and creado is not null;

-- El primer pago, al mes de inicio. Si no hay inicio, no se inventa.
update public.presupuestos
   set fecha_primer_pago = fecha_inicio
 where fecha_primer_pago is null and fecha_inicio is not null;

-- ── Coherencia ─────────────────────────────────────────────────────────────
-- Cobrar antes de emitir la oferta no tiene sentido. Se admite el mismo día:
-- una oferta aceptada en el acto con arranque inmediato es un caso real.
alter table public.presupuestos drop constraint if exists presupuestos_pago_ok;
alter table public.presupuestos add constraint presupuestos_pago_ok check (
  fecha_emision is null or fecha_primer_pago is null or fecha_primer_pago >= fecha_emision);

-- ── Por defecto al insertar ────────────────────────────────────────────────
-- La pantalla ya los rellena, pero una oferta puede entrar por la función del
-- servidor o por una carga. Si la regla vive solo en la pantalla, tarde o
-- temprano se cuela una oferta sin fechas y el PDF vuelve a fecharse solo.
create or replace function public.presupuestos_fechas_por_defecto()
returns trigger language plpgsql as $$
begin
  if new.fecha_emision is null then
    new.fecha_emision := coalesce(new.creado::date, current_date);
  end if;
  if new.fecha_primer_pago is null and new.fecha_inicio is not null then
    new.fecha_primer_pago := new.fecha_inicio;
  end if;
  return new;
end $$;

drop trigger if exists trg_presupuestos_fechas on public.presupuestos;
create trigger trg_presupuestos_fechas
  before insert on public.presupuestos
  for each row execute function public.presupuestos_fechas_por_defecto();

create index if not exists idx_presupuestos_fecha_emision on public.presupuestos(fecha_emision);

notify pgrst, 'reload schema';

select 'v93 aplicada' as ok;
