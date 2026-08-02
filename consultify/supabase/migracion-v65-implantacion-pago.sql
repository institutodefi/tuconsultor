-- ═══════════════════════════════════════════════════════════════════════════
-- v65 · FORMA DE PAGO DE LA IMPLANTACIÓN Y MANTENIMIENTO POSTERIOR
--
-- La implantación deja de ser una cuota mensual: es un proyecto que se abona
-- de UNA de estas dos formas, y de ninguna otra.
--
--   · unico → un solo pago al inicio, con 5 % de descuento
--   · dos   → 50 % a la firma y 50 % antes del inicio de las auditorías
--
-- Y se guarda a qué modelo de mantenimiento pasa el sistema al terminar,
-- porque es la pregunta que llega tres meses después.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.presupuestos
  add column if not exists forma_pago text check (forma_pago in ('unico','dos')),
  add column if not exists modelo_mantenimiento text
    check (modelo_mantenimiento in ('Relación','Implicación','Compromiso'));

comment on column public.presupuestos.forma_pago is
  'Solo para implantaciones. unico = pago único con 5 % de descuento · dos = 50 % firma + 50 % antes de auditorías.';
comment on column public.presupuestos.modelo_mantenimiento is
  'Modelo al que pasa el sistema cuando termina la implantación. No incluye Apoyo: el fondo de horas no es mantenimiento recurrente.';

-- Una implantación sin forma de pago es una oferta a medio escribir.
-- No se fuerza sobre lo ya emitido: solo se avisa de cuántas quedan sueltas.
do $$
declare n int;
begin
  select count(*) into n from public.presupuestos
   where modelo = 'Implantación' and forma_pago is null;
  if n > 0 then
    raise notice 'Hay % implantación(es) ya emitidas sin forma de pago registrada. No se tocan: revísalas si necesitas el dato.', n;
  end if;
end $$;

notify pgrst, 'reload schema';

select 'v65 aplicada' as ok;
