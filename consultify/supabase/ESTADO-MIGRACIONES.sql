-- ═══════════════════════════════════════════════════════════════════════════
-- ESTADO DE LAS MIGRACIONES DEL CRM
--
-- Solo mira: no cambia nada. Dice qué está aplicado en esta base de datos y,
-- al final, en qué orden hay que ejecutar lo que falte.
--
-- Pégalo entero en el editor SQL de Supabase.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Tablas ─────────────────────────────────────────────────────────────
select 'TABLAS' as bloque, t as elemento,
       case when to_regclass('public.' || t) is null then '✗ NO EXISTE' else '✓ existe' end as estado,
       m as la_crea
  from (values
        ('empresas', 'v48'),
        ('contactos', 'v48'),
        ('empresa_contactos', 'v48'),
        ('homologaciones', 'v56'),
        ('reglas_comerciales', 'v57'),
        ('leads', 'v54'),
        ('perfiles', 'instalación')
       ) as x(t, m);

-- ── 2 · Columnas que la ficha de empresa da por hechas ─────────────────────
select 'COLUMNAS empresas' as bloque, c as elemento,
       case when exists (
              select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'empresas' and column_name = c
            ) then '✓ existe' else '✗ FALTA' end as estado,
       m as la_crea
  from (values
        ('cif', 'v48'), ('es_cliente', 'v48'), ('es_proveedor', 'v48'),
        ('nombre_comercial', 'v56'), ('email', 'v56'), ('telefono', 'v56'),
        ('movil', 'v56'), ('web', 'v56'), ('poblacion', 'v56'), ('cp', 'v56'),
        ('provincia', 'v56'), ('pais', 'v56'), ('vat_id', 'v56'),
        ('empresa_matriz_id', 'v56'), ('estado_comercial', 'v56'),
        ('holded_datos', 'v56'), ('holded_sincronizado_en', 'v56'),
        ('brevo_sincronizado_en', 'v56')
       ) as x(c, m);

-- ── 3 · Columna `rol` del puente empresa ↔ contacto (v56) ──────────────────
select 'COLUMNAS empresa_contactos' as bloque, 'rol' as elemento,
       case when exists (
              select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'empresa_contactos' and column_name = 'rol'
            ) then '✓ existe' else '✗ FALTA' end as estado,
       'v56' as la_crea;

-- ── 4 · Índice único del CIF (v58) ─────────────────────────────────────────
select 'ÍNDICES' as bloque, 'empresas_cif_unico' as elemento,
       case when exists (select 1 from pg_indexes
                          where schemaname = 'public' and indexname = 'empresas_cif_unico')
            then '✓ existe' else '✗ FALTA' end as estado,
       'v58' as la_crea;

-- ── 5 · ¿La política de escritura admite ya a «director»? (v59) ────────────
select 'POLÍTICAS' as bloque, tablename || ' · ' || policyname as elemento,
       case when qual like '%director%' then '✓ v59 aplicada' else '✗ política antigua (v48)' end as estado,
       'v59' as la_crea
  from pg_policies
 where schemaname = 'public'
   and tablename in ('empresas','contactos','empresa_contactos')
   and policyname like '%_write';

-- ── 6 · Perfiles bloqueados por `activo` en NULL ───────────────────────────
select 'PERFILES' as bloque,
       'activo en NULL' as elemento,
       case when count(*) = 0 then '✓ ninguno' else '✗ ' || count(*) || ' perfil(es) bloqueado(s)' end as estado,
       'v59 lo corrige' as la_crea
  from public.perfiles where activo is null;

-- ── 7 · Tu perfil ──────────────────────────────────────────────────────────
-- Cambia el correo si hace falta.
select 'MI PERFIL' as bloque, email as elemento,
       case
         when activo is null then '✗ BLOQUEADO · activo es NULL'
         when activo = false then '✗ BLOQUEADO · activo es false'
         when rol not in ('superadmin','admin','director','consultor','gestion') then '✗ BLOQUEADO · rol ' || rol
         else '✓ puede escribir · rol ' || rol
       end as estado,
       '' as la_crea
  from public.perfiles
 where email = 'alejandro@tuconsultor.com';


-- ═══════════════════════════════════════════════════════════════════════════
-- ORDEN DE EJECUCIÓN de lo que salga con ✗
--
--   1 · migracion-v56-crm-unificado.sql          ← columnas + homologaciones + rol
--   2 · migracion-v57-reglas-comerciales.sql     ← pestaña Reglas comerciales
--   3 · migracion-v58-cif-clave.sql              ← CIF obligatorio y único
--   4 · migracion-v59-arreglo-escritura-crm.sql  ← permisos de escritura
--
-- La v56 va PRIMERA sí o sí: las otras tres dan por hecho lo que ella crea.
-- Después de la última, en Supabase: Settings → API → Reload schema (o espera
-- un minuto), y luego pulsa «⚙ Comprobar base de datos» en la pestaña Empresas.
-- ═══════════════════════════════════════════════════════════════════════════
