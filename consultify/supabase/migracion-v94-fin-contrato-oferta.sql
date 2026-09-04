-- ═══════════════════════════════════════════════════════════════════════════
-- v94 · FIN DE CONTRATO EN LA OFERTA, SEPARADO DE LA CERTIFICACIÓN
--
-- Hasta ahora la oferta solo tenía `fecha_certificacion`, y de ella se sacaba
-- todo: el plazo de planificación y, de hecho, el final del encargo. Eso mezcla
-- dos cosas que no lo son:
--
--   · la CERTIFICACIÓN es la auditoría externa. Muchas veces todavía no tiene
--     fecha cuando se emite la oferta, porque depende de la agenda de la
--     entidad certificadora.
--   · el FIN DE CONTRATO son doce meses desde el inicio, la permanencia del
--     modelo. Se sabe siempre, en cuanto se sabe cuándo se arranca.
--
-- Al estar unidas, no se podía emitir una oferta sin fecha de auditoría.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.presupuestos
  add column if not exists fecha_fin date;

comment on column public.presupuestos.fecha_fin is
  'Fin del contrato ofertado. Doce meses desde el inicio salvo que se fije a mano. Independiente de fecha_certificacion.';

-- ── Relleno de lo ya emitido ───────────────────────────────────────────────
-- Doce meses desde el inicio. NO se usa la certificación: son cosas distintas y
-- copiar una en otra volvería a mezclarlas.
update public.presupuestos
   set fecha_fin = (fecha_inicio + interval '12 months')::date
 where fecha_fin is null and fecha_inicio is not null;

-- ── Coherencia ─────────────────────────────────────────────────────────────
alter table public.presupuestos drop constraint if exists presupuestos_fin_ok;
alter table public.presupuestos add constraint presupuestos_fin_ok check (
  fecha_inicio is null or fecha_fin is null or fecha_fin > fecha_inicio);

-- La certificación NO se restringe contra el fin de contrato: puede caer
-- después (auditoría al final del ciclo) o antes (certificación temprana y
-- resto del año en mantenimiento). Solo se exige que sea posterior al inicio.
alter table public.presupuestos drop constraint if exists presupuestos_cert_ok;
alter table public.presupuestos add constraint presupuestos_cert_ok check (
  fecha_inicio is null or fecha_certificacion is null or fecha_certificacion > fecha_inicio);

-- ── Por defecto al insertar ────────────────────────────────────────────────
-- Se amplía el trigger de v93 en lugar de crear otro: dos triggers BEFORE
-- INSERT sobre la misma tabla es una fuente de sorpresas.
create or replace function public.presupuestos_fechas_por_defecto()
returns trigger language plpgsql as $$
begin
  if new.fecha_emision is null then
    new.fecha_emision := coalesce(new.creado::date, current_date);
  end if;
  if new.fecha_primer_pago is null and new.fecha_inicio is not null then
    new.fecha_primer_pago := new.fecha_inicio;
  end if;
  if new.fecha_fin is null and new.fecha_inicio is not null then
    new.fecha_fin := (new.fecha_inicio + interval '12 months')::date;
  end if;
  return new;
end $$;

notify pgrst, 'reload schema';

select 'v94 aplicada' as ok;
