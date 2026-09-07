-- =============================================================================
-- MIGRACIÓN v132 · `equipo_visible_proyecto` con columna id
--
-- La app lee todas las tablas ordenando por `id`; la vista no tenía esa
-- columna, la lectura fallaba y la zona de clientes se quedaba sin nombres:
-- las tareas programadas salían «por asignar». La app ya reintenta sin
-- ordenar, y la vista lleva ahora el id de la fila de proyecto_equipo.
--
-- Después de v131. Idempotente.
-- =============================================================================
begin;

drop view if exists public.equipo_visible_proyecto;
create view public.equipo_visible_proyecto with (security_invoker = false) as
  select pe.id, pe.proyecto_id, pe.perfil_id, pe.papel, p.nombre, p.apellidos, p.nivel
    from public.proyecto_equipo pe
    join public.perfiles p on p.id = pe.perfil_id
   where public.es_equipo()
      or exists (select 1 from public.proyectos_cliente pc where pc.id = pe.proyecto_id and public.es_mi_cliente(pc.cliente_id));
grant select on public.equipo_visible_proyecto to authenticated;
notify pgrst, 'reload schema';

commit;
