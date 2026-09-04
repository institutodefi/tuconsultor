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

notify pgrst, 'reload schema';

select 'v96 aplicada' as ok;
