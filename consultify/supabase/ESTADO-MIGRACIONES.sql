-- ═══════════════════════════════════════════════════════════════════════════
-- ESTADO DE LAS MIGRACIONES DEL CRM
--
-- UNA SOLA consulta a propósito: el editor SQL de Supabase solo muestra el
-- resultado de la última instrucción, así que varios SELECT separados hacen que
-- se pierda todo menos el final. Aquí va todo unido y ordenado.
--
-- Solo lee. No cambia nada. Pégalo entero y ejecútalo.
-- Cambia el correo de la última línea si no es el tuyo.
-- ═══════════════════════════════════════════════════════════════════════════

with correo as (select 'alejandro@tuconsultor.com'::text as email),

tablas as (
  select 1 as orden, 'TABLA' as bloque, t as elemento, m as la_crea,
         case when to_regclass('public.' || t) is null then '✗ NO EXISTE' else '✓ existe' end as estado
    from (values ('empresas','v48'), ('contactos','v48'), ('empresa_contactos','v48'),
                 ('homologaciones','v56'), ('reglas_comerciales','v57'),
                 ('leads','v54'), ('perfiles','instalación')) as x(t, m)
),

columnas as (
  select 2 as orden, 'COLUMNA ' || tb as bloque, c as elemento, m as la_crea,
         case when exists (select 1 from information_schema.columns i
                            where i.table_schema = 'public' and i.table_name = tb and i.column_name = c)
              then '✓ existe' else '✗ FALTA' end as estado
    from (values
      ('empresas','cif','v48'), ('empresas','es_cliente','v48'), ('empresas','es_proveedor','v48'),
      ('empresas','nombre_comercial','v56'), ('empresas','email','v56'), ('empresas','telefono','v56'),
      ('empresas','movil','v56'), ('empresas','web','v56'), ('empresas','poblacion','v56'),
      ('empresas','cp','v56'), ('empresas','provincia','v56'), ('empresas','pais','v56'),
      ('empresas','vat_id','v56'), ('empresas','empresa_matriz_id','v56'),
      ('empresas','estado_comercial','v56'), ('empresas','holded_datos','v56'),
      ('empresas','holded_sincronizado_en','v56'), ('empresas','brevo_sincronizado_en','v56'),
      ('empresa_contactos','rol','v56'), ('contactos','consentimiento_marketing','v48')
    ) as y(tb, c, m)
),

indice as (
  select 3 as orden, 'ÍNDICE' as bloque, 'empresas_cif_unico' as elemento, 'v58' as la_crea,
         case when exists (select 1 from pg_indexes
                            where schemaname = 'public' and indexname = 'empresas_cif_unico')
              then '✓ existe' else '✗ FALTA' end as estado
),

politicas as (
  select 4 as orden, 'POLÍTICA' as bloque, tablename || ' · ' || policyname as elemento, 'v59' as la_crea,
         case when qual like '%director%' then '✓ v59 aplicada' else '✗ política antigua (v48)' end as estado
    from pg_policies
   where schemaname = 'public' and policyname like '%\_write'
     and tablename in ('empresas','contactos','empresa_contactos','homologaciones','reglas_comerciales')
),

perfiles_null as (
  select 5 as orden, 'PERFILES' as bloque, 'con activo en NULL' as elemento, 'v59 lo corrige' as la_crea,
         case when count(*) = 0 then '✓ ninguno'
              else '✗ ' || count(*) || ' bloqueado(s): activo NULL impide escribir' end as estado
    from public.perfiles where activo is null
),

mi_perfil as (
  select 6 as orden, 'MI PERFIL' as bloque, p.email as elemento, '' as la_crea,
         case when p.activo is null then '✗ BLOQUEADO · activo es NULL'
              when p.activo = false then '✗ BLOQUEADO · activo es false'
              when p.rol not in ('superadmin','admin','director','consultor','gestion')
                   then '✗ BLOQUEADO · rol ' || p.rol
              else '✓ puede escribir · rol ' || p.rol end as estado
    from public.perfiles p, correo c where p.email = c.email
),

-- Fila final: qué hay que ejecutar, deducido de lo anterior.
veredicto as (
  select 9 as orden, '➤ QUÉ EJECUTAR' as bloque,
         case
           when to_regclass('public.homologaciones') is null
             then 'v56 PRIMERO (falta homologaciones y columnas de empresas), luego v57, v58 y v59'
           when to_regclass('public.reglas_comerciales') is null
             then 'v57, luego v58 y v59'
           when not exists (select 1 from pg_indexes where indexname = 'empresas_cif_unico')
             then 'v58 y v59'
           when not exists (select 1 from pg_policies
                             where schemaname='public' and tablename='empresas'
                               and policyname like '%\_write' and qual like '%director%')
             then 'solo v59'
           else 'nada: todo aplicado. Recarga el esquema en Settings → API'
         end as elemento,
         '' as la_crea, '' as estado
)

select bloque, elemento, estado, la_crea from (
  select * from tablas       union all
  select * from columnas     union all
  select * from indice       union all
  select * from politicas    union all
  select * from perfiles_null union all
  select * from mi_perfil    union all
  select * from veredicto
) todo
order by orden, elemento;
