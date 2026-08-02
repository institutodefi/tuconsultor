-- ═══════════════════════════════════════════════════════════════════════════
-- COMPROBAR QUE TODO ESTÁ EN SU SITIO
--
-- Un solo pegado. Verifica lo que dejaron las migraciones v71 a v85 y avisa de
-- lo que falte. El editor SQL solo enseña el último resultado, así que va todo
-- en una consulta con UNION ALL.
--
-- Columna «estado»: ✓ correcto · ✗ falta algo
-- ═══════════════════════════════════════════════════════════════════════════

with comprobaciones as (
  -- ── Tablas que deberían existir ──
  select 1 as n, 'Tabla: consentimientos (v71)' as que,
         case when to_regclass('public.consentimientos') is null then '✗ no existe' else '✓' end as estado
  union all select 2, 'Tabla: productos (v73)',
         case when to_regclass('public.productos') is null then '✗ no existe' else '✓' end
  union all select 3, 'Tabla: contratos (v83)',
         case when to_regclass('public.contratos') is null then '✗ no existe' else '✓' end
  union all select 4, 'Tabla: presupuesto_ajustes (v74)',
         case when to_regclass('public.presupuesto_ajustes') is null then '✗ no existe' else '✓' end
  union all select 5, 'Tabla: empresas_emisoras (v81)',
         case when to_regclass('public.empresas_emisoras') is null then '✗ no existe' else '✓' end

  -- ── Los dos productos, con el nombre bueno ──
  union all select 10, 'Productos dados de alta',
         coalesce((select string_agg(nombre, ' · ' order by orden) from public.productos where activo), '✗ ninguno')
  union all select 11, 'Ya NO existe el antiguo PTTool',
         case when exists (select 1 from public.productos where id = 'pttool')
              then '✗ sigue ahí' else '✓' end

  -- ── Las tres sociedades ──
  union all select 12, 'Sociedades emisoras',
         coalesce((select count(*)::text || ': ' || string_agg(cif, ', ' order by orden)
                     from public.empresas_emisoras where activa), '✗ ninguna')

  -- ── Columnas que el generador necesita para guardar ──
  union all select 20, 'Columnas de presupuestos que faltan',
         coalesce((select string_agg(c, ', ') from unnest(array[
            'emisora_id','estado','fases_plan','notas_oferta','notas_internas',
            'precio_catalogo','ajuste_oferta','contacto_nombre','contacto_apellidos',
            'complejidad','sedes','equipo','forma_pago','modelo_mantenimiento',
            'meses','fecha_inicio','fecha_certificacion']) c
          where not exists (select 1 from information_schema.columns
                             where table_name='presupuestos' and column_name=c)),
          '✓ están todas')

  -- ── El tipo, que ha dado guerra ──
  union all select 21, 'tipo admite «proyecto»',
         case when exists (select 1 from pg_constraint
                            where conrelid='public.presupuestos'::regclass
                              and conname='presupuestos_tipo_check'
                              and pg_get_constraintdef(oid) like '%proyecto%')
              then '✓' else '✗ NO lo admite: pasa ARREGLAR-TIPO-AHORA.sql' end

  union all select 22, 'email ya no es obligatorio',
         case when exists (select 1 from information_schema.columns
                            where table_name='presupuestos' and column_name='email' and is_nullable='NO')
              then '✗ sigue siendo obligatorio' else '✓' end

  union all select 23, 'Número de oferta único (v80)',
         case when exists (select 1 from pg_indexes
                            where tablename='presupuestos' and indexname='presupuestos_numero_unico')
              then '✓' else '✗ falta: revisa si hay números repetidos' end

  -- ── Funciones del flujo ──
  union all select 30, 'Funciones del flujo que faltan',
         coalesce((select string_agg(f, ', ') from unnest(array[
            'cambiar_estado_oferta','contrato_desde_oferta','activar_productos_contrato',
            'mis_espacios','mis_emisoras','validar_modelo_plazo','alta_desde_oferta']) f
          where not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                             where n.nspname='public' and p.proname=f)),
          '✓ están todas')

  -- ── Qué hay dentro ──
  union all select 40, 'Ofertas guardadas',
         (select count(*)::text from public.presupuestos where numero_oferta is not null)
  union all select 41, 'Ofertas por estado',
         coalesce((select string_agg(estado || ': ' || n, ' · ')
                     from (select estado, count(*) as n from public.presupuestos
                            where numero_oferta is not null group by estado) t), '—')
  union all select 42, 'Ofertas con implantación (las que fallaban)',
         (select count(*)::text from public.presupuestos where modelo='Implantación')
  union all select 43, 'Contratos',
         (select count(*)::text from public.contratos)
)
select n, que as comprobacion, estado from comprobaciones order by n;
