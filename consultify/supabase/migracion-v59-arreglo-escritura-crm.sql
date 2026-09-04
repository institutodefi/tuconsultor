-- ═══════════════════════════════════════════════════════════════════════════
-- v59 · ARREGLO DE LA ESCRITURA EN EL CRM
--
-- Síntoma: no se pueden crear ni empresas ni contactos, mientras leer funciona.
-- Eso apunta siempre a la política de escritura, no a los datos.
--
-- La política que dejó la v48 es esta:
--     using (exists (select 1 from perfiles p
--                     where p.id = auth.uid() and p.activo
--                       and p.rol in ('superadmin','admin','consultor','gestion')))
--
-- Tiene dos defectos:
--   A · «director» NO está en la lista, pero la interfaz sí le muestra los
--       botones de edición. Un director ve el botón y recibe un rechazo.
--   B · `and p.activo` con activo = NULL da NULL, que no es verdadero: bloquea
--       exactamente igual que false, y sin ninguna pista.
--
-- Ejecuta primero el apartado 1 (solo mira, no cambia nada). Con eso ya sabrás
-- si el problema es tuyo o de la política. El apartado 2 arregla las dos cosas.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══ 1 · MIRAR (no cambia nada) ════════════════════════════════════════════

-- 1.1 · ¿Cómo está tu perfil? Sustituye el correo por el tuyo.
select id, email, rol, activo,
       case
         when activo is null then 'BLOQUEADO · activo es NULL'
         when activo = false then 'BLOQUEADO · activo es false'
         when rol not in ('superadmin','admin','consultor','gestion') then 'BLOQUEADO · rol fuera de la política'
         else 'puede escribir'
       end as veredicto
  from public.perfiles
 where email = 'alejandro@tuconsultor.com';

-- 1.2 · ¿Cuántos perfiles hay con activo NULL? (todos ellos están bloqueados)
select count(*) as perfiles_con_activo_null from public.perfiles where activo is null;

-- 1.3 · Políticas vigentes sobre las tablas del CRM
select tablename, policyname, cmd, roles
  from pg_policies
 where schemaname = 'public'
   and tablename in ('empresas','contactos','empresa_contactos','homologaciones')
 order by tablename, policyname;

-- 1.4 · ¿Están todas las columnas que la ficha necesita?
select column_name
  from information_schema.columns
 where table_schema = 'public' and table_name = 'empresas'
 order by column_name;


-- ═══ 2 · ARREGLAR ══════════════════════════════════════════════════════════

begin;

-- 2.1 · `activo` nunca más NULL: por defecto true y se normaliza lo existente.
update public.perfiles set activo = true where activo is null;
alter table public.perfiles alter column activo set default true;

-- 2.2 · Política de escritura corregida: se añade «director» y se usa
--       `p.activo is true` para que un NULL futuro no vuelva a bloquear en
--       silencio.
do $$
declare t text;
begin
  foreach t in array array['empresas','contactos','empresa_contactos'] loop
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format($f$
      create policy %I_write on public.%I for all to authenticated
      using (exists (select 1 from public.perfiles p
                      where p.id = auth.uid() and p.activo is true
                        and p.rol in ('superadmin','admin','director','consultor','gestion')))
      with check (exists (select 1 from public.perfiles p
                      where p.id = auth.uid() and p.activo is true
                        and p.rol in ('superadmin','admin','director','consultor','gestion')))
    $f$, t, t);
  end loop;
end $$;

-- 2.3 · Homologaciones y reglas comerciales, con el mismo criterio.
--       Van dentro de un guardián: estas tablas las crean las migraciones v56 y
--       v57, y si aún no se han ejecutado esto reventaba con
--       «relation "public.homologaciones" does not exist», abortando el script.
do $$
declare t text;
begin
  foreach t in array array['homologaciones','reglas_comerciales'] loop
    if to_regclass('public.' || t) is null then
      raise notice 'La tabla % no existe todavía: ejecuta la migración que la crea (v56 para homologaciones, v57 para reglas_comerciales) y vuelve a pasar este bloque.', t;
      continue;
    end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format($f$
      create policy %I_write on public.%I for all to authenticated
      using (exists (select 1 from public.perfiles p
                      where p.id = auth.uid() and p.activo is true
                        and p.rol in ('superadmin','admin','director','consultor','gestion')))
      with check (exists (select 1 from public.perfiles p
                      where p.id = auth.uid() and p.activo is true
                        and p.rol in ('superadmin','admin','director','consultor','gestion')))
    $f$, t, t);
  end loop;
end $$;

commit;

notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');


-- ═══ 3 · SI NO TIENES FILA EN `perfiles` ═══════════════════════════════════
-- La política exige una fila con tu id de auth. Si el apartado 1.1 no devolvió
-- nada, créala (sustituye el correo):
--
--   insert into public.perfiles (id, email, rol, activo)
--   select u.id, u.email, 'superadmin', true
--     from auth.users u
--    where u.email = 'alejandro@tuconsultor.com'
--   on conflict (id) do update
--      set rol = 'superadmin', activo = true;


-- ═══ 4 · COMPROBAR QUE YA ESCRIBE ══════════════════════════════════════════
-- Ejecutado desde el editor SQL usas el rol de servicio, que se salta la RLS,
-- así que esto NO prueba nada sobre tu usuario. La prueba de verdad es el botón
-- «Comprobar base de datos» de la pestaña Empresas, que escribe con tu sesión.

select 'v59 aplicada' as ok;
