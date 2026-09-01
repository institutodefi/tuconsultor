-- ═══════════════════════════════════════════════════════════════════════════
-- v108 · LOS PROYECTOS HEREDAN NORMAS Y MODELO DE SU OFERTA
--
-- Caso real: una oferta de CECE en modelo Relación con ISO 9001, 14001 y 27001.
-- Su proyecto apareció con solo 9001 y modelo «Apoyo», que son los valores por
-- defecto de la pantalla. La copia de normas y modelo del proyecto estaba
-- vacía, y nadie se dio cuenta hasta abrirlo.
--
-- La v103 ya hacía este relleno, pero solo cuando la copia estaba VACÍA de
-- verdad (`cardinality = 0`). No cubría el caso de un proyecto con `{9001}`
-- puesto por defecto, que es lo que ocurre cuando alguien abre el panel y
-- guarda sin darse cuenta.
--
-- Aquí se corrige eso: si el proyecto tiene menos normas que su oferta, o un
-- modelo distinto, se toma el de la oferta. La oferta es lo que se firmó.
--
-- Lo que NO se toca: un proyecto con MÁS normas que su oferta. Eso es una
-- ampliación deliberada —se añadió alcance sin reemitir— y sobreescribirla
-- borraría una decisión.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Normas ─────────────────────────────────────────────────────────────
update public.proyectos_cliente p
   set normas = o.normas
  from public.presupuestos o
 where o.id = p.oferta_id
   and o.normas is not null
   and cardinality(o.normas) > 0
   and (
     p.normas is null
     or cardinality(p.normas) = 0
     -- El proyecto se quedó corto: le faltan normas que la oferta sí tiene.
     or exists (select 1 from unnest(o.normas) n
                 where not (n = any(coalesce(p.normas, '{}'))))
   )
   -- Salvo que el proyecto tenga alguna que la oferta no: eso es ampliación.
   and not exists (select 1 from unnest(coalesce(p.normas, '{}')) n
                    where not (n = any(o.normas)));

-- ── 2 · Modelo ─────────────────────────────────────────────────────────────
-- Se compara sin tildes: «implantacion» y «Implantación» son el mismo modelo,
-- y cambiarlo sería solo ortografía, no una corrección real.
update public.proyectos_cliente p
   set modelo = o.modelo
  from public.presupuestos o
 where o.id = p.oferta_id
   and coalesce(o.modelo, '') <> ''
   and (p.modelo is null or p.modelo = ''
        or public.clave_modelo(p.modelo) <> public.clave_modelo(o.modelo));

-- ── 3 · Lo mismo llegando por el contrato ──────────────────────────────────
update public.proyectos_cliente p
   set normas = o.normas,
       modelo = coalesce(nullif(o.modelo, ''), p.modelo)
  from public.contratos c
  join public.presupuestos o on o.id = c.presupuesto_id
 where c.id = p.contrato_id
   and p.oferta_id is null
   and o.normas is not null
   and cardinality(o.normas) > 0
   and (p.normas is null or cardinality(p.normas) = 0
        or exists (select 1 from unnest(o.normas) n
                    where not (n = any(coalesce(p.normas, '{}')))));

-- ── 4 · Los meses, si el proyecto no los tiene ─────────────────────────────
update public.proyectos_cliente p
   set meses_estimados = o.meses
  from public.presupuestos o
 where o.id = p.oferta_id
   and o.meses is not null and o.meses > 0
   and (p.meses_estimados is null or p.meses_estimados = 0);

notify pgrst, 'reload schema';

-- Qué ha quedado: proyectos cuyas normas siguen sin coincidir con su oferta.
-- Si aparece alguno, es una ampliación deliberada y está bien que se quede.
select 'v108 aplicada' as ok,
       count(*) as proyectos_con_oferta,
       count(*) filter (
         where p.normas is distinct from o.normas)      as normas_distintas_a_la_oferta,
       count(*) filter (
         where public.clave_modelo(p.modelo)
             is distinct from public.clave_modelo(o.modelo)) as modelo_distinto
  from public.proyectos_cliente p
  join public.presupuestos o on o.id = p.oferta_id;
