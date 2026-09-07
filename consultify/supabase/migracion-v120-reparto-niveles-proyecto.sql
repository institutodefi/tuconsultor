-- v120 · El reparto de la carga por nivel pasa de la oferta al proyecto.
--
-- Al abrir un proyecto desde una oferta aceptada se vuelca el reparto por
-- nivel con el que se ofertó (J1/J2/J3/Senior en %), para que quien asigna el
-- equipo sepa qué perfiles se previeron. Aplicar después de la v119.

alter table public.proyectos_cliente
  add column if not exists reparto_niveles jsonb;

comment on column public.proyectos_cliente.reparto_niveles is
  'Reparto de la carga por nivel previsto en la oferta ({"J1":60,"Senior":40}). Dato interno.';
