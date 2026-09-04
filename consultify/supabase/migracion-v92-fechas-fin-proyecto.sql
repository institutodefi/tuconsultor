-- ═══════════════════════════════════════════════════════════════════════════
-- v92 · FECHA DE FIN DEL PROYECTO Y AVISO DE VENCIMIENTO
--
-- La tabla `proyectos` tenía `fecha_inicio` y `fecha_auditoria`, pero no una
-- fecha de fin de contrato. En los modelos recurrentes (Relación, Implicación,
-- Compromiso) el contrato dura doce meses y termina: sin fecha de fin no hay
-- forma de saber cuándo toca emitir la oferta de renovación, y se pasa.
--
-- Se añade `fecha_fin` y se deriva automáticamente cuando no se indica:
--   · recurrentes  → inicio + 12 meses (la duración del contrato)
--   · Implantación → fecha de auditoría, o inicio + 12 meses si no la hay
--   · Apoyo        → se deja en null: es una bolsa, no tiene vencimiento
--
-- Y se añade `renovacion_emitida` para no volver a avisar de un proyecto cuya
-- oferta de renovación ya se mandó. Sin esto, el aviso se queda encendido y en
-- dos semanas el equipo deja de mirarlo.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.proyectos
  add column if not exists fecha_fin date,
  add column if not exists renovacion_emitida date;

comment on column public.proyectos.fecha_fin is
  'Fin del contrato. En recurrentes, inicio + 12 meses. De aquí sale el aviso de renovación.';
comment on column public.proyectos.renovacion_emitida is
  'Fecha en que se emitió la oferta de renovación. Mientras esté a null, el aviso sigue activo.';

-- Coherencia: terminar antes de empezar no tiene sentido.
alter table public.proyectos drop constraint if exists proyectos_fechas_ok;
alter table public.proyectos add constraint proyectos_fechas_ok check (
  fecha_inicio is null or fecha_fin is null or fecha_fin > fecha_inicio);

-- ── Relleno de lo ya existente ─────────────────────────────────────────────
-- Solo donde no hay nada. Lo nuevo entra con su fecha real.
update public.proyectos
   set fecha_fin = case
     when modelo = 'Apoyo' then null
     when modelo = 'Implantación' then coalesce(fecha_auditoria, (fecha_inicio + interval '12 months')::date)
     else (fecha_inicio + interval '12 months')::date
   end
 where fecha_fin is null and fecha_inicio is not null;

-- ── Fecha de fin por defecto al insertar ───────────────────────────────────
-- La interfaz ya la calcula, pero un proyecto puede entrar por la función de
-- alta desde oferta o por una carga. Si la regla vive solo en la pantalla,
-- tarde o temprano se cuela un proyecto sin fecha de fin y no avisa de nada.
create or replace function public.proyectos_fecha_fin_por_defecto()
returns trigger language plpgsql as $$
begin
  if new.fecha_fin is null and new.fecha_inicio is not null then
    new.fecha_fin := case
      when new.modelo = 'Apoyo' then null
      when new.modelo = 'Implantación' then coalesce(new.fecha_auditoria, (new.fecha_inicio + interval '12 months')::date)
      else (new.fecha_inicio + interval '12 months')::date
    end;
  end if;
  return new;
end $$;

drop trigger if exists trg_proyectos_fecha_fin on public.proyectos;
create trigger trg_proyectos_fecha_fin
  before insert or update on public.proyectos
  for each row execute function public.proyectos_fecha_fin_por_defecto();

-- ═══════════════════════════════════════════════════════════════════════════
-- Lo mismo en `proyectos_cliente`
--
-- Conviven dos tablas: `proyectos` (la ficha contractual) y `proyectos_cliente`
-- (la operativa, de la que cuelgan las tareas). El panel de proyectos lee la
-- segunda, así que si la fecha de fin solo está en la primera, el panel no
-- puede avisar de nada. Se añade en las dos.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.proyectos_cliente
  add column if not exists fecha_fin date,
  add column if not exists renovacion_emitida date;

comment on column public.proyectos_cliente.fecha_fin is
  'Fin del contrato. En recurrentes, inicio + 12 meses. De aquí sale el aviso de renovación.';

alter table public.proyectos_cliente drop constraint if exists proyectos_cliente_fechas_ok;
alter table public.proyectos_cliente add constraint proyectos_cliente_fechas_ok check (
  fecha_inicio is null or fecha_fin is null or fecha_fin > fecha_inicio);

-- Relleno: aquí sí hay `meses_estimados`, que es mejor dato que suponer doce.
update public.proyectos_cliente
   set fecha_fin = case
     when modelo = 'Apoyo' then null
     when modelo = 'Implantación' then (fecha_inicio + (coalesce(meses_estimados, 3) || ' months')::interval)::date
     else (fecha_inicio + interval '12 months')::date
   end
 where fecha_fin is null and fecha_inicio is not null;

create or replace function public.proyectos_cliente_fecha_fin_por_defecto()
returns trigger language plpgsql as $$
begin
  if new.fecha_fin is null and new.fecha_inicio is not null then
    new.fecha_fin := case
      when new.modelo = 'Apoyo' then null
      when new.modelo = 'Implantación' then (new.fecha_inicio + (coalesce(new.meses_estimados, 3) || ' months')::interval)::date
      else (new.fecha_inicio + interval '12 months')::date
    end;
  end if;
  return new;
end $$;

drop trigger if exists trg_proyectos_cliente_fecha_fin on public.proyectos_cliente;
create trigger trg_proyectos_cliente_fecha_fin
  before insert or update on public.proyectos_cliente
  for each row execute function public.proyectos_cliente_fecha_fin_por_defecto();

create index if not exists idx_proyectos_cliente_fecha_fin on public.proyectos_cliente(fecha_fin);

-- ── Vista de proyectos activos con su semáforo ─────────────────────────────
-- El umbral vive aquí y en lib/proyectos.js. Si cambia, cambia en los dos: se
-- deja la vista para poder consultarlo desde SQL, informes o Metabase sin
-- reimplementar la regla.
create or replace view public.v_proyectos_vencimiento as
select
  p.id,
  p.cliente_id,
  p.modelo,
  p.estado,
  p.fecha_inicio,
  p.fecha_fin,
  p.renovacion_emitida,
  (p.fecha_fin - current_date) as dias_restantes,
  case
    when p.fecha_fin is null then 'sin_fecha'
    when p.fecha_fin < current_date then 'vencido'
    when p.fecha_fin - current_date <= 30 then 'rojo'
    when p.fecha_fin - current_date <= 60 then 'amarillo'
    else 'ok'
  end as semaforo
from public.proyectos p
where p.estado in ('implantación', 'activo');

grant select on public.v_proyectos_vencimiento to authenticated;

create index if not exists idx_proyectos_fecha_fin on public.proyectos(fecha_fin);

notify pgrst, 'reload schema';

select 'v92 aplicada' as ok;
