-- ═══════════════════════════════════════════════════════════════════════════
-- v101 · EL HISTÓRICO DE ESTADOS SE PUEDE ESCRIBIR
--
-- Error al marcar una oferta como aceptada:
--
--   new row violates row-level security policy for table "presupuesto_estados"
--
-- CAUSA. La v82 creó `presupuesto_estados` con RLS activado y **solo una
-- política de SELECT**. El trigger que escribe el histórico,
-- `registrar_estado_presupuesto()`, no es `security definer`, así que el INSERT
-- se ejecuta con los permisos de quien guarda y RLS lo rechaza.
--
-- Resultado: cualquier cambio de estado de una oferta fallaba. No solo
-- «aceptada»: también rechazar, anular o caducar.
--
-- SOLUCIÓN. La función pasa a `security definer`. El histórico se escribe
-- siempre, desde el trigger, y NO se añade una política de INSERT: si la
-- hubiera, cualquiera con sesión podría meter filas falsas en el histórico
-- directamente. Un registro de auditoría que el propio auditado puede escribir
-- a mano no sirve de nada.
--
-- Nota sobre v82: ya creó `estado`, `estado_en`, `estado_por`, `aceptada_en`,
-- `rechazada_en` y `valida_hasta`. Aquí solo se añade `aceptada_por`, que es lo
-- que faltaba para saber QUIÉN dio la oferta por aceptada; el trigger ya
-- rellena `aceptada_en` solo.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Quién la dio por aceptada ──────────────────────────────────────────
alter table public.presupuestos
  add column if not exists aceptada_por uuid references public.perfiles(id) on delete set null;

comment on column public.presupuestos.aceptada_por is
  'Quién dio la oferta por aceptada. Es una afirmación sobre la voluntad del cliente: tiene que tener autor.';

-- ── 2 · El trigger del histórico, con permisos propios ──────────────────────
-- Mismo cuerpo que en v82; lo único que cambia es `security definer` y el
-- `search_path`, que conviene fijar en toda función con permisos elevados para
-- que no dependa del esquema de quien la llame.
create or replace function public.registrar_estado_presupuesto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' and new.estado is distinct from old.estado then
    insert into public.presupuesto_estados (presupuesto_id, estado_antes, estado_despues, motivo, actor, actor_id)
    values (new.id, old.estado, new.estado, new.motivo_rechazo,
            case when new.estado_por is null then 'sistema' else 'equipo' end, new.estado_por);

    new.estado_en := now();
    if new.estado = 'aceptada'  then new.aceptada_en  := coalesce(new.aceptada_en, now()); end if;
    if new.estado = 'rechazada' then new.rechazada_en := coalesce(new.rechazada_en, now()); end if;
  end if;
  return new;
end $$;

-- ── 3 · Relleno de lo ya aceptado ──────────────────────────────────────────
-- `aceptada_en` la rellena el trigger desde v82, pero las ofertas que ya
-- estaban aceptadas antes de aquello pueden no tenerla. Se usa `creado`, que es
-- lo único verificable: `presupuestos` no guarda fecha de modificación.
--
-- Para esas, `aceptada_en` será la fecha de EMISIÓN, no la de aceptación. De
-- las nuevas en adelante sí es la real.
--
-- `aceptada_por` se deja vacío a propósito: atribuir a alguien una acción que
-- quizá no hizo es peor que reconocer que no se sabe.
update public.presupuestos
   set aceptada_en = creado
 where estado = 'aceptada' and aceptada_en is null and creado is not null;

create index if not exists presupuestos_aceptadas
  on public.presupuestos (aceptada_en desc) where estado = 'aceptada';

notify pgrst, 'reload schema';

select 'v101 aplicada' as ok,
       count(*) filter (where estado = 'aceptada') as ofertas_aceptadas
  from public.presupuestos;
