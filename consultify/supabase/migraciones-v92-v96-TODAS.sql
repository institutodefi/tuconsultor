-- ═══════════════════════════════════════════════════════════════════════════
-- TUCONSULTOR · MIGRACIONES v92 → v96
--
-- Pégalo ENTERO en el editor SQL de Supabase y ejecútalo de una vez.
-- Es SQL puro: no lleva Markdown ni comentarios de documentación.
--
-- Se puede ejecutar varias veces sin romper nada: todo va con
-- `if not exists` / `create or replace` / `drop constraint if exists`.
--
-- Qué añade cada bloque:
--   v92  fecha_fin y renovacion_emitida en proyectos → semáforo de renovación
--   v93  fecha_emision y fecha_primer_pago en ofertas
--   v94  fecha_fin de la oferta, separada de la certificación
--   v95  contrato_id y oferta_id en proyectos → alta desde oferta o contrato
--   v96  precios_sistema, cliente_antiguo y aplicar_reglas → tarifa pactada
--
-- Al terminar debe salir una fila con 'MIGRACIONES v92-v96 APLICADAS'.
-- ═══════════════════════════════════════════════════════════════════════════

begin;


-- ───────────────────────────────────────────────────────────────────────
-- migracion-v92-fechas-fin-proyecto.sql
-- ───────────────────────────────────────────────────────────────────────
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



-- ───────────────────────────────────────────────────────────────────────
-- migracion-v93-fechas-oferta.sql
-- ───────────────────────────────────────────────────────────────────────
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



-- ───────────────────────────────────────────────────────────────────────
-- migracion-v94-fin-contrato-oferta.sql
-- ───────────────────────────────────────────────────────────────────────
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



-- ───────────────────────────────────────────────────────────────────────
-- migracion-v95-proyecto-desde-contrato.sql
-- ───────────────────────────────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- v95 · DE QUÉ CONTRATO VIENE CADA PROYECTO
--
-- `proyectos_cliente` no guardaba de dónde salía el proyecto. Sin ese dato no
-- se puede responder a la pregunta que importa: **qué contratos están firmados
-- y todavía no tienen proyecto abierto**, que es trabajo vendido que nadie ha
-- arrancado.
--
-- También se añade `oferta_id`: hay proyectos que arrancan con la oferta
-- aceptada y el contrato aún sin firmar, y conviene poder trazarlos igual.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.proyectos_cliente
  add column if not exists contrato_id uuid references public.contratos(id) on delete set null,
  add column if not exists oferta_id   uuid references public.presupuestos(id) on delete set null;

comment on column public.proyectos_cliente.contrato_id is
  'Contrato del que nace el proyecto. De aquí sale el aviso de contratos firmados sin proyecto.';
comment on column public.proyectos_cliente.oferta_id is
  'Oferta del que nace el proyecto, cuando se arranca antes de firmar el contrato.';

create index if not exists proyectos_cliente_contrato on public.proyectos_cliente (contrato_id);
create index if not exists proyectos_cliente_oferta   on public.proyectos_cliente (oferta_id);

-- ── Relleno de lo ya existente ─────────────────────────────────────────────
-- Se vinculan solo los casos SEGUROS: un cliente con exactamente un contrato
-- firmado y exactamente un proyecto. Con dos de cualquiera de los dos, no hay
-- forma de saber cuál va con cuál, y adivinar dejaría datos falsos que después
-- nadie sabría distinguir de los buenos.
with unicos as (
  select p.id as proyecto_id, c.id as contrato_id
    from public.proyectos_cliente p
    join public.clientes cl on cl.id = p.cliente_id
    join public.contratos c
      on upper(regexp_replace(coalesce(c.cliente_cif, ''), '[\s.-]', '', 'g'))
       = upper(regexp_replace(coalesce(cl.cif, ''), '[\s.-]', '', 'g'))
     and c.estado = 'firmado'
   where p.contrato_id is null
     and coalesce(cl.cif, '') <> ''
   group by p.id, c.id
  having count(*) = 1
)
update public.proyectos_cliente p
   set contrato_id = u.contrato_id
  from unicos u
 where p.id = u.proyecto_id
   and (select count(*) from public.proyectos_cliente x where x.cliente_id = p.cliente_id) = 1;

-- ── Vista: contratos firmados sin proyecto ─────────────────────────────────
-- La misma pregunta desde SQL, para informes o avisos programados, sin
-- reimplementar la regla en cada sitio.
create or replace view public.v_contratos_sin_proyecto as
select c.id, c.numero, c.cliente_empresa, c.cliente_cif, c.modelo, c.normas,
       c.fecha_contrato, c.importe, c.tipo,
       (current_date - c.fecha_contrato) as dias_desde_firma
  from public.contratos c
 where c.estado = 'firmado'
   and not exists (
     select 1 from public.proyectos_cliente p where p.contrato_id = c.id
   );

grant select on public.v_contratos_sin_proyecto to authenticated;



-- ───────────────────────────────────────────────────────────────────────
-- migracion-v96-precios-por-sistema.sql
-- ───────────────────────────────────────────────────────────────────────
-- ═══════════════════════════════════════════════════════════════════════════
-- v96 · TARIFA PACTADA POR SISTEMA Y REGLAS COMERCIALES EN LA OFERTA
--
-- Desde v207 la cuota de los modelos recurrentes se forma sumando el precio de
-- cada sistema. Dos decisiones que se toman al ofertar y que hasta ahora no se
-- guardaban en ninguna parte:
--
--   · `precios_sistema`  precio pactado de cada sistema, para clientes antiguos
--                        con tarifa heredada. Sin guardarlo, al regenerar la
--                        oferta el motor volvía a aplicar el catálogo y el
--                        documento salía con otro importe del que se envió.
--
--   · `aplicar_reglas`   si esta oferta se calculó con las reglas comerciales
--                        activas o con el precio de catálogo limpio. Sin este
--                        dato no hay forma de reproducir el precio meses
--                        después, cuando la campaña ya no exista.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.presupuestos
  add column if not exists precios_sistema  jsonb,
  add column if not exists cliente_antiguo  boolean not null default false,
  add column if not exists aplicar_reglas   boolean not null default true;

comment on column public.presupuestos.precios_sistema is
  'Precio pactado por sistema, {"9001": 300}. Manda sobre el catálogo al recalcular y al regenerar.';
comment on column public.presupuestos.cliente_antiguo is
  'La oferta usa tarifa heredada. Sirve para localizarlas y para explicar por qué el precio no sigue el catálogo.';
comment on column public.presupuestos.aplicar_reglas is
  'Si las reglas comerciales vigentes se aplicaron a esta oferta.';

-- El precio pactado solo tiene sentido si la oferta está marcada como de
-- cliente antiguo: si no, es un descuento sin trazabilidad.
alter table public.presupuestos drop constraint if exists presupuestos_precios_sistema_ok;
alter table public.presupuestos add constraint presupuestos_precios_sistema_ok check (
  precios_sistema is null or cliente_antiguo = true);

create index if not exists presupuestos_cliente_antiguo
  on public.presupuestos (cliente_antiguo) where cliente_antiguo = true;



commit;

-- Recarga del esquema para que PostgREST vea las columnas nuevas.
notify pgrst, 'reload schema';

select 'MIGRACIONES v92-v96 APLICADAS' as resultado;
