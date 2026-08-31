-- ═══════════════════════════════════════════════════════════════════════════
-- TUCONSULTOR · MIGRACIONES PENDIENTES v98 → v101
--
-- Pegalo ENTERO en el editor SQL de Supabase y ejecutalo de una vez.
-- SQL puro: sin Markdown. Se puede ejecutar varias veces sin romper nada.
--
--   v98   varios contactos directivos por empresa
--   v99   pago anual por adelantado (11x12) y persona de contacto en la oferta
--   v100  los precios admiten centimos
--   v101  el historico de estados se puede escribir  <-- ARREGLA "row-level security policy"
--
-- Al terminar debe salir 'MIGRACIONES v98-v101 APLICADAS'.
-- ═══════════════════════════════════════════════════════════════════════════

begin;


-- ─────────────────────────────────────────────────────────────────────
-- migracion-v98-varios-directivos.sql
-- ─────────────────────────────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- v98 · VARIOS CONTACTOS DIRECTIVOS POR EMPRESA
--
-- Desde v56 los tres roles nombrados —directivo, facturación, proyecto— eran
-- ÚNICOS por empresa:
--
--   create unique index empresa_contactos_rol_unico
--     on empresa_contactos (empresa_id, rol) where rol <> 'secundario';
--
-- Efecto: al asignar un segundo directivo, la interfaz degradaba al primero a
-- «secundario» para no violar el índice. En una empresa con dirección general,
-- dirección de calidad y responsable del sistema, solo una de las tres podía
-- constar como directiva; las demás quedaban mezcladas con los contactos
-- sueltos y se perdía quién manda de verdad.
--
-- Ahora DIRECTIVO admite varios. Facturación y proyecto siguen siendo únicos:
-- ahí la ambigüedad sí es un problema —a quién se manda la factura, con quién
-- se coordina el proyecto— y tener dos obligaría a elegir igualmente.
--
-- Sigue habiendo UN principal por empresa (`empresa_contactos_un_principal`,
-- de v69): es el que sale en los documentos y en la sincronización con Brevo.
-- Varios directivos, uno principal.
-- ═══════════════════════════════════════════════════════════════════════════

drop index if exists public.empresa_contactos_rol_unico;

-- Únicos: facturación y proyecto. Directivo y secundario, los que hagan falta.
create unique index if not exists empresa_contactos_rol_unico
  on public.empresa_contactos (empresa_id, rol)
  where rol in ('facturacion', 'proyecto');

comment on index public.empresa_contactos_rol_unico is
  'Facturación y proyecto: uno por empresa. Directivo y secundario admiten varios.';

-- ── Coherencia del principal ───────────────────────────────────────────────
-- El principal debe ser uno de los directivos: marcar como principal a un
-- contacto de facturación dejaría los documentos firmados por quien no manda.
-- Se corrige lo que hubiera quedado descolocado antes de poner la regla.
update public.empresa_contactos
   set principal = false
 where principal = true and rol <> 'directivo';

-- Y si una empresa se queda sin principal teniendo directivos, se asciende al
-- más antiguo: es el que llevaba más tiempo ocupando ese papel.
with sin_principal as (
  select ec.empresa_id
    from public.empresa_contactos ec
   where ec.rol = 'directivo'
   group by ec.empresa_id
  having count(*) filter (where ec.principal) = 0
), elegido as (
  select distinct on (ec.empresa_id) ec.id
    from public.empresa_contactos ec
    join sin_principal s on s.empresa_id = ec.empresa_id
   where ec.rol = 'directivo'
   order by ec.empresa_id, ec.creado nulls last, ec.id
)
update public.empresa_contactos ec
   set principal = true
  from elegido e
 where ec.id = e.id;


-- ─────────────────────────────────────────────────────────────────────
-- migracion-v99-pago-adelantado.sql
-- ─────────────────────────────────────────────────────────────────────
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


-- ─────────────────────────────────────────────────────────────────────
-- migracion-v100-precios-decimales.sql
-- ─────────────────────────────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- v100 · LOS PRECIOS ADMITEN CÉNTIMOS
--
-- Error en producción al guardar una oferta:
--
--   invalid input syntax for type integer: "537.3"
--
-- `presupuestos.precio` y las columnas de precio de `proyectos` son `int`, de
-- cuando todo importe salía redondeado al escalón de 25 €. Desde la v207 el
-- precio de los modelos recurrentes se forma sumando cada sistema y aplicando
-- un descuento por volumen del 5, 10 o 15 %: ese porcentaje **produce decimales
-- casi siempre**. 596,67 − 10 % = 537,00; otras combinaciones dan 537,30.
--
-- La alternativa era redondear en la aplicación, pero eso significa que la
-- oferta enseña un importe y la base guarda otro. Un céntimo de diferencia
-- entre lo ofertado y lo facturado es justo el tipo de detalle que un cliente
-- detecta y que obliga a dar explicaciones.
--
-- `contratos.importe` ya era `numeric(12,2)` desde la v83. Esto alinea las
-- demás: el importe de un contrato y el de la oferta de la que nace deben poder
-- ser exactamente el mismo número.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Ofertas ────────────────────────────────────────────────────────────────
alter table public.presupuestos
  alter column precio type numeric(12,2) using precio::numeric(12,2);

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'presupuestos'
                and column_name = 'precio_catalogo') then
    alter table public.presupuestos
      alter column precio_catalogo type numeric(12,2) using precio_catalogo::numeric(12,2);
  end if;
end $$;

comment on column public.presupuestos.precio is
  'Importe ofertado, con céntimos. El descuento por volumen (5/10/15 %) casi nunca da un entero.';

-- ── Proyectos ──────────────────────────────────────────────────────────────
-- Mismo motivo: el precio del proyecto sale de la oferta que lo originó.
do $$
declare t text; c text;
begin
  foreach t in array array['proyectos', 'proyectos_cliente'] loop
    foreach c in array array['precio_mes', 'precio_total'] loop
      if exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = t and column_name = c) then
        execute format('alter table public.%I alter column %I type numeric(12,2) using %I::numeric(12,2)', t, c, c);
      end if;
    end loop;
  end loop;
end $$;


-- ─────────────────────────────────────────────────────────────────────
-- migracion-v101-aceptacion-oferta.sql
-- ─────────────────────────────────────────────────────────────────────
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


commit;

notify pgrst, 'reload schema';

select 'MIGRACIONES v98-v101 APLICADAS' as resultado;
