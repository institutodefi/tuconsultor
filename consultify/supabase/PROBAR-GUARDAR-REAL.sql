-- ═══════════════════════════════════════════════════════════════════════════
-- INTENTAR GUARDAR DE VERDAD Y VER EL ERROR EXACTO
--
-- Devuelve una TABLA, no mensajes: el editor de Supabase no enseña los avisos
-- de `raise notice`, se los traga y solo muestra el último select. Por eso la
-- versión anterior parecía no decir nada.
--
-- Prueba el UPDATE campo a campo sobre una empresa real y devuelve el mensaje
-- literal de la base en cada paso. No cambia nada de valor: escribe cada campo
-- con el valor que ya tenía.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function pg_temp.probar_guardado()
returns table (paso int, que text, resultado text, error_literal text)
language plpgsql as $$
declare eid uuid; nom text; e text; det text;
begin
  select id, nombre into eid, nom from public.empresas order by creado desc nulls last limit 1;
  if eid is null then
    return query select 0, 'No hay empresas en la tabla', '—', '—';
    return;
  end if;

  return query select 0, 'Empresa de prueba', nom, left(eid::text, 8);

  -- 1 · dirección
  begin
    update public.empresas set direccion = direccion where id = eid;
    return query select 1, 'Dirección sola', '✓', ''::text;
  exception when others then
    get stacked diagnostics e = message_text, det = pg_exception_detail;
    return query select 1, 'Dirección sola', '✗', e || ' | ' || coalesce(det,'');
  end;

  -- 2 · todos los fiscales
  begin
    update public.empresas
       set direccion = direccion, poblacion = poblacion, cp = cp,
           provincia = provincia, pais = pais, vat_id = vat_id, nombre_comercial = nombre_comercial
     where id = eid;
    return query select 2, 'Todos los fiscales', '✓', ''::text;
  exception when others then
    get stacked diagnostics e = message_text, det = pg_exception_detail;
    return query select 2, 'Todos los fiscales', '✗', e || ' | ' || coalesce(det,'');
  end;

  -- 3 · estado comercial, con el valor que ya tiene
  begin
    update public.empresas set estado_comercial = estado_comercial where id = eid;
    return query select 3, 'estado_comercial (vale: ' ||
      coalesce((select coalesce(estado_comercial,'NULO') from public.empresas where id = eid), '?') || ')',
      '✓', ''::text;
  exception when others then
    get stacked diagnostics e = message_text;
    return query select 3, 'estado_comercial', '✗', e;
  end;

  -- 4 · Holded
  begin
    update public.empresas
       set holded_id = holded_id, holded_datos = holded_datos, holded_sincronizado_en = now()
     where id = eid;
    return query select 4, 'Campos de Holded', '✓', ''::text;
  exception when others then
    get stacked diagnostics e = message_text;
    return query select 4, 'Campos de Holded', '✗', e;
  end;

  -- 5 · updated_at
  begin
    update public.empresas set updated_at = now() where id = eid;
    return query select 5, 'updated_at', '✓', ''::text;
  exception when others then
    get stacked diagnostics e = message_text;
    return query select 5, 'updated_at', '✗', e;
  end;

  -- 6 · matriz (dispara el control de ciclos)
  begin
    update public.empresas set empresa_matriz_id = empresa_matriz_id where id = eid;
    return query select 6, 'empresa_matriz_id', '✓', ''::text;
  exception when others then
    get stacked diagnostics e = message_text;
    return query select 6, 'empresa_matriz_id', '✗', e;
  end;

  -- 7 · el payload COMPLETO de la ficha, tal cual lo manda
  begin
    update public.empresas set
      nombre = nombre, nombre_comercial = nombre_comercial, cif = cif, vat_id = vat_id,
      es_cliente = es_cliente, es_proveedor = es_proveedor, estado_comercial = estado_comercial,
      direccion = direccion, poblacion = poblacion, cp = cp, provincia = provincia, pais = pais,
      email = email, telefono = telefono, movil = movil, web = web, notas = notas,
      empresa_matriz_id = empresa_matriz_id, holded_id = holded_id, holded_datos = holded_datos,
      holded_sincronizado_en = holded_sincronizado_en, updated_at = now()
     where id = eid;
    return query select 7, 'PAYLOAD COMPLETO de la ficha', '✓', ''::text;
  exception when others then
    get stacked diagnostics e = message_text, det = pg_exception_detail;
    return query select 7, 'PAYLOAD COMPLETO de la ficha', '✗', e || ' | ' || coalesce(det,'');
  end;
end $$;

select * from pg_temp.probar_guardado()

union all

-- Y el valor actual de estado_comercial en TODAS las empresas: si alguna tiene
-- un valor que la restricción no admite, esa fila no se puede guardar aunque no
-- se toque ese campo.
select 100, 'estado_comercial en uso: ' || coalesce(estado_comercial, 'NULO'),
       count(*)::text || ' empresa(s)',
       case when estado_comercial is null
              or estado_comercial in ('potencial','activo','inactivo','perdido')
            then 'válido' else '✗ NO LO ADMITE LA RESTRICCIÓN' end
  from public.empresas
 group by estado_comercial

order by 1;
