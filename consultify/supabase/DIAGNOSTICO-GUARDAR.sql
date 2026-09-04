-- ═══════════════════════════════════════════════════════════════════════════
-- ¿POR QUÉ NO PUEDO GUARDAR LOS DATOS DE UNA EMPRESA?
--
-- Pégalo entero en el editor SQL de Supabase. No cambia nada: solo mira.
--
-- ⚠ IMPORTANTE: pon tu correo en la primera línea antes de ejecutarlo.
-- ═══════════════════════════════════════════════════════════════════════════

with yo as (
  select 'alejandro@tuconsultor.com'::text as mi_email    -- ← CAMBIA ESTO
),
perfil as (
  select p.id, p.rol, p.activo, u.email
    from auth.users u
    left join public.perfiles p on p.id = u.id
   where lower(u.email) = lower((select mi_email from yo))
),
todo as (
  select 1 as n, 'Mi usuario existe en auth' as comprobacion,
         coalesce((select email from perfil), '✗ NO existe ese correo en auth.users') as resultado
  union all
  select 2, 'Tengo perfil en public.perfiles',
         coalesce((select 'sí, id ' || left(id::text, 8) from perfil where id is not null),
                  '✗ NO TENGO PERFIL — esta es la causa: sin fila en perfiles, ninguna política te deja escribir')
  union all
  select 3, 'Mi rol',
         coalesce((select coalesce(rol, '(nulo)') from perfil), '—')
  union all
  select 4, 'Mi perfil está activo',
         coalesce((select case when activo is null then '✗ NULL — la política antigua fallaba con esto'
                               when activo then 'sí' else '✗ NO, está desactivado' end from perfil), '—')
  union all
  select 5, '¿Mi rol puede escribir en empresas?',
         case when (select rol from perfil) in ('superadmin','admin','director','consultor','gestion')
              then 'sí' else '✗ NO — el rol «' || coalesce((select rol from perfil),'?') || '» no está en la política' end
  union all
  select 6, 'RLS activa en empresas',
         case when (select relrowsecurity from pg_class where oid='public.empresas'::regclass) then 'sí' else 'no' end
  union all
  select 7, 'Políticas de escritura sobre empresas',
         coalesce((select string_agg(polname || ' [' || polcmd::text || ']', ', ')
                     from pg_policy where polrelid='public.empresas'::regclass and polcmd <> 'r'),
                  '✗ NINGUNA — con RLS activa y sin política de escritura, nadie puede guardar')
  union all
  select 8, '¿La política incluye a director?',
         case when exists (select 1 from pg_policy where polrelid='public.empresas'::regclass
                            and pg_get_expr(polqual, polrelid) like '%director%')
              then 'sí' else '✗ no' end
  union all
  select 9, '¿Tolera activo NULL?',
         case when exists (select 1 from pg_policy where polrelid='public.empresas'::regclass
                            and pg_get_expr(polqual, polrelid) ilike '%coalesce(p.activo%')
              then 'sí' else '✗ no — la v86 no está aplicada' end
  union all
  select 10, 'Permiso de tabla para authenticated',
         coalesce((select string_agg(privilege_type, ', ' order by privilege_type)
                     from information_schema.role_table_grants
                    where table_name='empresas' and grantee='authenticated'),
                  '✗ NINGUNO — falta el GRANT, la RLS ni llega a evaluarse')
  union all
  select 11, 'Columnas de empresas que la ficha necesita y NO existen',
         coalesce((select string_agg(c, ', ') from unnest(array[
            'nombre','nombre_comercial','cif','vat_id','es_cliente','es_proveedor','estado_comercial',
            'direccion','poblacion','cp','provincia','pais','email','telefono','movil','web',
            'notas','empresa_matriz_id','holded_id','holded_datos','holded_sincronizado_en','updated_at']) c
          where not exists (select 1 from information_schema.columns
                             where table_name='empresas' and column_name=c)),
          '✓ están todas')
  union all
  select 12, 'Restricciones CHECK en empresas',
         coalesce((select string_agg(conname, ', ') from pg_constraint
                    where conrelid='public.empresas'::regclass and contype='c'), 'ninguna')
  union all
  select 13, 'Disparadores en empresas (pueden estar bloqueando)',
         coalesce((select string_agg(tgname, ', ') from pg_trigger
                    where tgrelid='public.empresas'::regclass and not tgisinternal), 'ninguno')
)
select n, comprobacion, resultado from todo order by n;
