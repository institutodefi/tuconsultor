-- v124 · Zona cliente del proyecto.
--
-- · proyectos_cliente.funciones: qué ve el cliente de su proyecto. Lo activa
--   el equipo desde la ficha: {"pm_tool": true, "datos_cliente": true,
--   "procesos": ["PE1","PA4"]}. Sin nada, solo sus datos y documentos.
-- · El cliente lee las sesiones de sus tareas y el equipo de sus proyectos
--   (para el Gantt y los responsables), y una vista con los nombres del
--   equipo, porque `perfiles` no se le enseña entera.
-- Aplicar después de la v123.

alter table public.proyectos_cliente
  add column if not exists funciones jsonb not null default '{}'::jsonb;
comment on column public.proyectos_cliente.funciones is 'Zona cliente: {"pm_tool":bool,"datos_cliente":bool,"procesos":["PE1",...]}.';

-- Sesiones de sus tareas (solo lectura).
drop policy if exists cliente_lee_sesiones_de_sus_tareas on public.tarea_sesiones;
create policy cliente_lee_sesiones_de_sus_tareas on public.tarea_sesiones
  for select using (
    exists (
      select 1 from public.cliente_tareas ct
      join public.clientes c on c.id = ct.cliente_id
      where ct.id = tarea_sesiones.cliente_tarea_id and c.user_id = auth.uid()
    )
  );

-- Equipo de sus proyectos (solo lectura).
drop policy if exists cliente_lee_equipo_de_sus_proyectos on public.proyecto_equipo;
create policy cliente_lee_equipo_de_sus_proyectos on public.proyecto_equipo
  for select using (
    exists (
      select 1 from public.proyectos_cliente pc
      join public.clientes c on c.id = pc.cliente_id
      where pc.id = proyecto_equipo.proyecto_id and c.user_id = auth.uid()
    )
  );

-- Nombres del equipo de cada proyecto, visibles para el cliente de ese
-- proyecto y para el equipo. Vista con seguridad del definidor: no expone
-- `perfiles` entera, solo nombre, apellidos y nivel de quien está asignado.
create or replace view public.equipo_visible_proyecto
  with (security_invoker = false) as
  select pe.proyecto_id, pe.perfil_id, pe.papel, p.nombre, p.apellidos, p.nivel
  from public.proyecto_equipo pe
  join public.perfiles p on p.id = pe.perfil_id
  where public.es_equipo()
     or exists (
       select 1 from public.proyectos_cliente pc
       join public.clientes c on c.id = pc.cliente_id
       where pc.id = pe.proyecto_id and c.user_id = auth.uid()
     );
grant select on public.equipo_visible_proyecto to authenticated;
