-- ═══════════════════════════════════════════════════════════════════════════
-- v78 · DIRECCIÓN TAMBIÉN VE LAS OFERTAS
--
-- La política de lectura de `presupuestos` nombra a consultoría, administración,
-- superadministración y equipo de gestión, pero NO a dirección. Un director
-- entraba al histórico y lo veía vacío, sin ningún aviso: no es que no hubiera
-- ofertas, es que no podía verlas.
--
-- Es un olvido de cuando se añadió el rol `director`, no una decisión.
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists presupuestos_select_own on public.presupuestos;
create policy presupuestos_select_own on public.presupuestos
  for select to anon, authenticated
  using (
    user_id = auth.uid()
    or email = (auth.jwt() ->> 'email')
    or coalesce(public.mi_rol(), '') in ('consultor','admin','superadmin','gestion','director')
  );

drop policy if exists presupuestos_update_team on public.presupuestos;
create policy presupuestos_update_team on public.presupuestos
  for update to authenticated
  using (coalesce(public.mi_rol(), '') in ('consultor','admin','superadmin','gestion','director'))
  with check (coalesce(public.mi_rol(), '') in ('consultor','admin','superadmin','gestion','director'));

-- Borrar una oferta emitida no es para cualquiera: deja al cliente con un PDF
-- cuyo número ya no existe en el sistema.
drop policy if exists presupuestos_delete_mando on public.presupuestos;
create policy presupuestos_delete_mando on public.presupuestos
  for delete to authenticated
  using (coalesce(public.mi_rol(), '') in ('superadmin','admin','director'));

grant delete on public.presupuestos to authenticated;

notify pgrst, 'reload schema';

select 'v78 aplicada' as ok;
