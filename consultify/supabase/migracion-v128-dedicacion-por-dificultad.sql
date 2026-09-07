-- =============================================================================
-- MIGRACIÓN v128 · Dedicación estimada por dificultad en proyectos ya abiertos
--
-- Toda oferta lleva ya un reparto de la carga por nivel: si nadie lo ajusta,
-- el de su dificultad (baja J1 80 % + Senior 20 %, media J2 80 % + Senior
-- 20 %, alta J3 80 % + Senior 20 %). Ese reparto viaja al proyecto
-- (proyectos_cliente.reparto_niveles) y de ahí salen las horas de cada
-- persona del equipo en el control de horas y la programación.
--
-- Los proyectos abiertos antes no lo tienen y sus horas se iban enteras a
-- quien ejecuta (CECE: Laura 472 h, Fátima 0). Aquí se rellena: con el
-- reparto de su oferta si lo tenía; si no, con el de la dificultad de la
-- oferta (o media si no hay oferta). Se puede afinar después en la ficha.
--
-- Después de v127. Idempotente (solo toca los que están a null).
-- =============================================================================
begin;

-- La oferta de cada proyecto: la enlazada (oferta_id) o, si no, la aceptada
-- más reciente del mismo cliente (por correo) y modelo.
with oferta_de as (
  select pc.id as proyecto_id,
         coalesce(pc.oferta_id,
           (select p.id from public.presupuestos p, public.clientes c
             where c.id = pc.cliente_id and p.estado = 'aceptada'
               and lower(btrim(coalesce(p.email, ''))) = lower(btrim(coalesce(c.email, '-')))
               and coalesce(p.modelo, '') = coalesce(pc.modelo, '')
             order by p.creado desc limit 1)) as oferta_id
    from public.proyectos_cliente pc
   where pc.reparto_niveles is null
)
update public.proyectos_cliente pc
   set reparto_niveles = coalesce(
     (select p.reparto_niveles from public.presupuestos p where p.id = o.oferta_id and p.reparto_niveles is not null),
     case coalesce((select lower(p.complejidad) from public.presupuestos p where p.id = o.oferta_id), 'media')
       when 'baja' then '{"J1": 80, "J2": 0, "J3": 0, "Senior": 20}'::jsonb
       when 'alta' then '{"J1": 0, "J2": 0, "J3": 80, "Senior": 20}'::jsonb
       else            '{"J1": 0, "J2": 80, "J3": 0, "Senior": 20}'::jsonb
     end)
  from oferta_de o
 where o.proyecto_id = pc.id and pc.reparto_niveles is null;

-- Las ofertas internas vivas sin reparto toman también el de su dificultad,
-- para que al regenerar el documento o abrir el proyecto salga lo mismo.
update public.presupuestos p
   set reparto_niveles = case lower(coalesce(p.complejidad, 'media'))
       when 'baja' then '{"J1": 80, "J2": 0, "J3": 0, "Senior": 20}'::jsonb
       when 'alta' then '{"J1": 0, "J2": 0, "J3": 80, "Senior": 20}'::jsonb
       else            '{"J1": 0, "J2": 80, "J3": 0, "Senior": 20}'::jsonb
     end
 where p.reparto_niveles is null
   and coalesce(p.estado, '') not in ('rechazada', 'caducada', 'anulada')
   and p.comercial is not null;   -- las emitidas por el equipo; las de la web siguen en automático

commit;
