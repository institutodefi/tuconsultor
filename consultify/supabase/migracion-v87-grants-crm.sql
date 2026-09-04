-- ═══════════════════════════════════════════════════════════════════════════
-- v87 · LOS PERMISOS DE TABLA QUE FALTABAN
--
-- Los datos fiscales no se guardaban. La v86 arregló la política, pero eso no
-- bastaba: en PostgreSQL hacen falta DOS cosas para escribir en una tabla.
--
--   1 · El permiso de tabla (GRANT). Sin él ni siquiera se evalúa la política.
--   2 · La política de seguridad de fila (RLS).
--
-- Estaba la 2 y faltaba la 1. Es el orden en el que se comprueban, y por eso
-- arreglar solo la política no cambió nada.
--
-- Y por eso el síntoma era mudo: PostgREST devuelve un error de permisos que la
-- aplicación no siempre enseña, así que el formulario parecía no hacer nada.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare t text; faltaban text[] := '{}';
begin
  foreach t in array array[
    'empresas','contactos','empresa_contactos','clientes','proyectos_cliente',
    'presupuestos','contratos','presupuesto_ajustes','cliente_productos',
    'cliente_herramientas','miembros_cliente','reglas_comerciales','procesos_internos'
  ] loop
    if to_regclass('public.' || t) is null then continue; end if;

    -- ¿Tenía ya permiso de escritura?
    if not exists (
      select 1 from information_schema.role_table_grants
       where table_schema = 'public' and table_name = t
         and grantee = 'authenticated' and privilege_type = 'UPDATE'
    ) then
      faltaban := faltaban || t;
    end if;

    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;

  if array_length(faltaban, 1) > 0 then
    raise notice '>>> No se podía escribir en: %', array_to_string(faltaban, ', ');
    raise notice '>>> Ahí estaba el problema de guardar.';
  else
    raise notice 'Todas tenían ya sus permisos.';
  end if;
end $$;

-- Las secuencias, para que los INSERT con id automático funcionen.
do $$
declare s text;
begin
  for s in select sequence_name from information_schema.sequences where sequence_schema = 'public' loop
    execute format('grant usage, select on sequence public.%I to authenticated', s);
  end loop;
end $$;

grant usage on schema public to authenticated, anon;

-- ── Comprobación con una escritura real ────────────────────────────────────
do $$
declare eid uuid; e text;
begin
  insert into public.empresas (nombre, cif, es_cliente)
  values ('__PRUEBA_V87__', 'B00000099', true) returning id into eid;

  update public.empresas
     set direccion = 'C/ Prueba 1', poblacion = 'Madrid', cp = '28013',
         provincia = 'Madrid', pais = 'España', vat_id = 'ESB00000099',
         holded_id = 'prueba', holded_sincronizado_en = now()
   where id = eid;

  delete from public.empresas where id = eid;
  raise notice '✓ Escritura de datos fiscales: funciona.';
exception when others then
  get stacked diagnostics e = message_text;
  raise notice '✗ SIGUE FALLANDO: %', e;
end $$;

notify pgrst, 'reload schema';

select 'v87 aplicada' as ok;
