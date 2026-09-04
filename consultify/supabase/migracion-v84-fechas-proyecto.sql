-- ═══════════════════════════════════════════════════════════════════════════
-- v84 · FECHAS DEL PROYECTO EN LA OFERTA
--
-- La oferta deja de pedir «meses» y pide dos fechas: inicio estimado y fecha de
-- certificación. Los meses se derivan. Es mejor dato: nadie sabe de memoria si
-- su proyecto son ocho meses, pero todo el mundo sabe cuándo tiene la auditoría.
--
-- Y sirve para planificar de verdad: con la fecha de certificación se pueden
-- colocar las tareas hacia atrás desde ella, en vez de repartirlas a ojo.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.presupuestos
  add column if not exists fecha_inicio date,
  add column if not exists fecha_certificacion date;

comment on column public.presupuestos.fecha_certificacion is
  'Cuándo hay que estar certificado. De aquí salen los meses y la planificación de tareas.';

-- Coherencia: certificar antes de empezar no tiene sentido.
alter table public.presupuestos drop constraint if exists presupuestos_fechas_ok;
alter table public.presupuestos add constraint presupuestos_fechas_ok check (
  fecha_inicio is null or fecha_certificacion is null or fecha_certificacion > fecha_inicio);

-- Relleno de lo ya emitido: si hay meses, se estima hacia adelante desde la
-- fecha de la oferta. Es una aproximación y por eso solo se aplica donde no hay
-- nada; lo nuevo entra con las fechas reales.
update public.presupuestos
   set fecha_inicio = creado::date,
       fecha_certificacion = (creado::date + (coalesce(meses, 12) || ' months')::interval)::date
 where fecha_inicio is null and creado is not null;

-- ── La regla, también en la base ───────────────────────────────────────────
-- La interfaz ya lo impide, pero una oferta puede entrar por la función del
-- servidor o por una carga. Si la regla vive solo en la pantalla, tarde o
-- temprano se la salta algo.
create or replace function public.validar_modelo_plazo(
  p_modelo text, p_normas text[], p_inicio date, p_certificacion date
) returns jsonb language plpgsql immutable as $$
declare
  meses int;
  planes int;
begin
  if p_inicio is not null and p_certificacion is not null then
    meses := (extract(year from age(p_certificacion, p_inicio)) * 12
            + extract(month from age(p_certificacion, p_inicio)))::int;
  end if;

  select count(*) into planes
    from unnest(coalesce(p_normas, '{}')) n
   where n ~ '^(igualdad|diversidad)(-seg)?$' or n = 'madridexcelente';

  if planes > 0 and p_modelo not in ('Apoyo','Implantación') then
    return jsonb_build_object('ok', false,
      'error', format('Un plan o marca de garantía no cabe en modelo %s: solo Apoyo o Implantación.', p_modelo));
  end if;

  if p_modelo in ('Relación','Implicación','Compromiso') and meses is not null and meses < 6 then
    return jsonb_build_object('ok', false,
      'error', format('Quedan %s meses hasta la certificación; el modelo %s necesita al menos 6.', meses, p_modelo));
  end if;

  return jsonb_build_object('ok', true, 'meses', meses);
end $$;

grant execute on function public.validar_modelo_plazo(text, text[], date, date) to authenticated;

notify pgrst, 'reload schema';

select 'v84 aplicada' as ok;
