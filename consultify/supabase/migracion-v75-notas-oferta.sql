-- ═══════════════════════════════════════════════════════════════════════════
-- v75 · NOTAS ACLARATORIAS DE LA OFERTA
--
-- Texto libre que se añade a la propuesta y sale en el PDF y en el PPT. Para lo
-- que no cabe en un campo: un alcance matizado, una exclusión pactada, un plazo
-- concreto, lo que se habló en la reunión.
--
-- Van en la oferta y no en las condiciones generales a propósito: las
-- condiciones son iguales para todos y estas notas son de este cliente.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.presupuestos
  add column if not exists notas_oferta text,
  add column if not exists notas_internas text;

comment on column public.presupuestos.notas_oferta is
  'Notas aclaratorias que SÍ salen en el PDF y el PPT que recibe el cliente.';
comment on column public.presupuestos.notas_internas is
  'Notas del equipo. NO salen en ningún documento. Para el margen de negociación y lo que no se enseña.';

notify pgrst, 'reload schema';

select 'v75 aplicada' as ok;
