-- ═══════════════════════════════════════════════════════════════════════════
-- v105 · EL CATÁLOGO DE TAREAS: LO LEEN TODOS, LO EDITA ADMINISTRACIÓN
--
-- `tareas_catalogo` tenía UNA sola política, `for all` con `es_equipo()`:
-- cualquiera del equipo podía cambiar las horas de cualquier tarea.
--
-- Y esas horas no son un dato de trabajo cualquiera: alimentan el motor de
-- precios. Cambiar las horas de «Auditoría interna» en modelo Compromiso mueve
-- el importe de todas las ofertas que se estén preparando en ese momento y de
-- las que se regeneren después. Es una decisión de negocio, no de ejecución.
--
-- A partir de aquí:
--   · LEER    dirección de proyecto, consultoría y gestión. Consultar qué tareas
--             define cada modelo es parte del trabajo diario.
--   · ESCRIBIR  Administración y Superadministración.
--
-- La comprobación de la interfaz sola no basta: estas tablas se pueden tocar
-- desde cualquier cliente con la sesión del usuario. La barrera tiene que estar
-- aquí.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.tareas_catalogo enable row level security;

-- Fuera la política que permitía todo a todo el equipo.
drop policy if exists tareas_catalogo_team_all on public.tareas_catalogo;

-- ── Lectura: todo el equipo ────────────────────────────────────────────────
drop policy if exists tareas_catalogo_lectura on public.tareas_catalogo;
create policy tareas_catalogo_lectura on public.tareas_catalogo
  for select to authenticated
  using (coalesce(public.mi_rol(), '') in
         ('superadmin','admin','director','consultor','gestion'));

-- ── Escritura: solo Administración ─────────────────────────────────────────
drop policy if exists tareas_catalogo_alta on public.tareas_catalogo;
create policy tareas_catalogo_alta on public.tareas_catalogo
  for insert to authenticated
  with check (coalesce(public.mi_rol(), '') in ('superadmin','admin'));

drop policy if exists tareas_catalogo_edicion on public.tareas_catalogo;
create policy tareas_catalogo_edicion on public.tareas_catalogo
  for update to authenticated
  using (coalesce(public.mi_rol(), '') in ('superadmin','admin'))
  with check (coalesce(public.mi_rol(), '') in ('superadmin','admin'));

drop policy if exists tareas_catalogo_borrado on public.tareas_catalogo;
create policy tareas_catalogo_borrado on public.tareas_catalogo
  for delete to authenticated
  using (coalesce(public.mi_rol(), '') in ('superadmin','admin'));

grant select on public.tareas_catalogo to authenticated;
grant insert, update, delete on public.tareas_catalogo to authenticated;

comment on table public.tareas_catalogo is
  'Catálogo maestro de tareas por norma y modelo. Sus horas alimentan el precio de las ofertas: lo lee todo el equipo, solo lo edita Administración.';

-- ── Lo mismo para el catálogo de normas ────────────────────────────────────
-- Por coherencia: si las horas están protegidas pero cualquiera puede añadir o
-- retirar una norma del catálogo, la protección se rodea por el otro lado.
do $$
begin
  if exists (select 1 from information_schema.tables
              where table_schema = 'public' and table_name = 'normas_catalogo') then
    execute 'alter table public.normas_catalogo enable row level security';
    execute 'drop policy if exists normas_catalogo_team_all on public.normas_catalogo';
    execute 'drop policy if exists normas_catalogo_lectura on public.normas_catalogo';
    execute $p$create policy normas_catalogo_lectura on public.normas_catalogo
      for select to authenticated
      using (coalesce(public.mi_rol(), '') in
             ('superadmin','admin','director','consultor','gestion'))$p$;
    execute 'drop policy if exists normas_catalogo_escritura on public.normas_catalogo';
    execute $p$create policy normas_catalogo_escritura on public.normas_catalogo
      for all to authenticated
      using (coalesce(public.mi_rol(), '') in ('superadmin','admin'))
      with check (coalesce(public.mi_rol(), '') in ('superadmin','admin'))$p$;
  end if;
end $$;

notify pgrst, 'reload schema';

select 'v105 aplicada' as ok;
