-- ═══════════════════════════════════════════════════════════════════════════
-- ¿POR QUÉ NO SE PUEDE CREAR UNA EMPRESA?
--
-- Actualizar funciona pero crear no. La diferencia entre las dos operaciones
-- suele estar en las columnas OBLIGATORIAS sin valor por defecto: al actualizar
-- no hacen falta, al insertar sí.
--
-- Esto lo comprueba y, además, INTENTA el alta de verdad para devolver el error
-- literal. Lo que cree lo borra al final.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function pg_temp.probar_alta()
returns table (n int, que text, resultado text)
language plpgsql as $$
declare e text; det text; nid uuid;
begin
  -- 1 · Columnas obligatorias sin valor por defecto
  return query
  select 1, 'Columnas obligatorias SIN valor por defecto',
         coalesce((select string_agg(column_name, ', ' order by ordinal_position)
                     from information_schema.columns
                    where table_name = 'empresas' and is_nullable = 'NO'
                      and column_default is null and column_name <> 'id'),
                  'ninguna · no es eso');

  -- 2 · Alta mínima, como la que hace la ficha
  begin
    insert into public.empresas (nombre, cif, es_cliente, es_proveedor, estado_comercial, pais)
    values ('__PRUEBA_ALTA__', 'G28494912', true, false, 'potencial', 'España')
    returning id into nid;
    delete from public.empresas where id = nid;
    return query select 2, 'Alta mínima (6 campos)', '✓ funciona';
  exception when others then
    get stacked diagnostics e = message_text, det = pg_exception_detail;
    return query select 2, 'Alta mínima (6 campos)', '✗ ' || e || ' | ' || coalesce(det, '');
  end;

  -- 3 · Alta con TODO lo que manda la ficha
  begin
    insert into public.empresas (
      nombre, nombre_comercial, cif, vat_id, es_cliente, es_proveedor, estado_comercial,
      direccion, poblacion, cp, provincia, pais, email, telefono, movil, web,
      notas, empresa_matriz_id, holded_id, holded_datos, holded_sincronizado_en, updated_at)
    values ('__PRUEBA_ALTA2__', 'Prueba', 'G28494912', null, true, false, 'potencial',
      'C/ Prueba 1', 'Madrid', '28013', 'Madrid', 'España', null, null, null, null,
      null, null, null, null, null, now())
    returning id into nid;
    delete from public.empresas where id = nid;
    return query select 3, 'Alta con el payload completo', '✓ funciona';
  exception when others then
    get stacked diagnostics e = message_text, det = pg_exception_detail;
    return query select 3, 'Alta con el payload completo', '✗ ' || e || ' | ' || coalesce(det, '');
  end;

  -- 4 · ¿Hay política de INSERT y qué exige?
  return query
  select 4, 'Política que gobierna el INSERT',
         coalesce((select string_agg(polname || ' → ' || coalesce(pg_get_expr(polwithcheck, polrelid), '(sin with check)'), ' ;; ')
                     from pg_policy
                    where polrelid = 'public.empresas'::regclass
                      and polcmd in ('a', '*')), '✗ NINGUNA — con RLS activa, nadie puede insertar');

  -- 5 · Disparadores que actúan al insertar
  return query
  select 5, 'Disparadores en INSERT',
         coalesce((select string_agg(tgname, ', ') from pg_trigger
                    where tgrelid = 'public.empresas'::regclass and not tgisinternal
                      and (tgtype & 4) > 0), 'ninguno');

  -- 6 · Índices únicos que podrían chocar
  return query
  select 6, 'Índices únicos en empresas',
         coalesce((select string_agg(indexname, ', ') from pg_indexes
                    where tablename = 'empresas' and indexdef ilike '%unique%'), 'ninguno');
end $$;

select * from pg_temp.probar_alta() order by n;
