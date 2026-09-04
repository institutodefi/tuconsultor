-- ═══════════════════════════════════════════════════════════════════════════
-- v103 · LOS PROYECTOS RECUPERAN SU ALCANCE DESDE LA OFERTA
--
-- `proyectos_cliente` guarda una COPIA de `normas` y `modelo`. En los proyectos
-- creados antes de que el alta partiera de una oferta, esa copia quedó vacía:
-- en la cartera salían con «—» en Alcance y Modelo aunque su oferta sí los
-- tuviera.
--
-- Aquí se rellenan desde la oferta —o desde el contrato, si el proyecto se abrió
-- por esa vía—. Solo los que están VACÍOS: si alguien ajustó el alcance a mano
-- porque se amplió sin reemitir la oferta, sobreescribirlo borraría esa
-- decisión sin dejar rastro.
--
-- También se intenta reconstruir el vínculo `oferta_id` de los proyectos que no
-- lo tienen, pero solo en los casos SEGUROS: un cliente con exactamente una
-- oferta aceptada y exactamente un proyecto. Con dos de cualquiera de los dos no
-- hay forma de saber cuál va con cuál, y adivinar dejaría trazabilidad falsa,
-- que es peor que no tener ninguna.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Vincular proyectos huérfanos a su oferta, solo si es inequívoco ─────
-- `count(distinct …) over (…)` no existe en PostgreSQL, así que las dos
-- condiciones se cuentan en CTEs separadas y se cruzan al final.
with proyectos_por_cliente as (
  select cliente_id, count(*) as n_proyectos
    from public.proyectos_cliente
   group by cliente_id
),
ofertas_por_cliente as (
  select cl.id as cliente_id,
         count(*)              as n_ofertas,
         min(o.id::text)::uuid as oferta_id
    from public.clientes cl
    join public.presupuestos o
      on upper(regexp_replace(coalesce(o.cif, ''), '[\s.-]', '', 'g'))
       = upper(regexp_replace(coalesce(cl.cif, ''), '[\s.-]', '', 'g'))
     and o.estado = 'aceptada'
   where coalesce(cl.cif, '') <> ''
   group by cl.id
)
update public.proyectos_cliente p
   set oferta_id = oc.oferta_id
  from ofertas_por_cliente oc
  join proyectos_por_cliente pc on pc.cliente_id = oc.cliente_id
 where p.cliente_id = oc.cliente_id
   and p.oferta_id is null
   and p.contrato_id is null
   and oc.n_ofertas   = 1      -- una sola oferta aceptada de ese cliente
   and pc.n_proyectos = 1;     -- y un solo proyecto suyo

-- ── 2 · Rellenar el alcance vacío desde la oferta ───────────────────────────
update public.proyectos_cliente p
   set normas = o.normas
  from public.presupuestos o
 where o.id = p.oferta_id
   and (p.normas is null or cardinality(p.normas) = 0)
   and o.normas is not null
   and cardinality(o.normas) > 0;

update public.proyectos_cliente p
   set modelo = o.modelo
  from public.presupuestos o
 where o.id = p.oferta_id
   and (p.modelo is null or p.modelo = '')
   and coalesce(o.modelo, '') <> '';

-- ── 3 · Y desde el contrato, para los que se abrieron por esa vía ──────────
update public.proyectos_cliente p
   set normas = o.normas
  from public.contratos c
  join public.presupuestos o on o.id = c.presupuesto_id
 where c.id = p.contrato_id
   and p.oferta_id is null
   and (p.normas is null or cardinality(p.normas) = 0)
   and o.normas is not null
   and cardinality(o.normas) > 0;

update public.proyectos_cliente p
   set modelo = o.modelo
  from public.contratos c
  join public.presupuestos o on o.id = c.presupuesto_id
 where c.id = p.contrato_id
   and p.oferta_id is null
   and (p.modelo is null or p.modelo = '')
   and coalesce(o.modelo, '') <> '';

-- ── 4 · Vista con los datos ya cruzados ────────────────────────────────────
-- Para informes y consultas sueltas, sin tener que repetir el cruce de cuatro
-- tablas cada vez. El nombre comercial manda sobre la razón social: es el que
-- el equipo reconoce.
create or replace view public.v_proyectos_cartera as
select p.id,
       p.cliente_id,
       coalesce(nullif(e.nombre_comercial, ''), e.nombre, cl.empresa) as cliente,
       e.nombre                                                        as razon_social,
       coalesce(e.cif, cl.cif)                                         as cif,
       p.nombre,
       p.estado,
       coalesce(nullif(p.normas, '{}'), o.normas)                      as normas,
       coalesce(nullif(p.modelo, ''), o.modelo)                        as modelo,
       p.fecha_inicio, p.fecha_fin, p.fecha_limite,
       p.oferta_id, p.contrato_id,
       o.numero_oferta,
       o.precio                                                        as precio_ofertado,
       o.tipo                                                          as tipo_precio
  from public.proyectos_cliente p
  left join public.clientes cl on cl.id = p.cliente_id
  left join public.empresas e
    on upper(regexp_replace(coalesce(e.cif, ''), '[\s.-]', '', 'g'))
     = upper(regexp_replace(coalesce(cl.cif, ''), '[\s.-]', '', 'g'))
   and coalesce(cl.cif, '') <> ''
  left join public.presupuestos o
    on o.id = coalesce(p.oferta_id,
         (select c.presupuesto_id from public.contratos c where c.id = p.contrato_id));

grant select on public.v_proyectos_cartera to authenticated;

notify pgrst, 'reload schema';

select 'v103 aplicada' as ok,
       count(*) filter (where oferta_id is not null or contrato_id is not null) as con_origen,
       count(*) filter (where normas is not null and cardinality(normas) > 0)   as con_alcance,
       count(*) as total
  from public.proyectos_cliente;
