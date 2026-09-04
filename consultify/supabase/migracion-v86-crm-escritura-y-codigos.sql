-- ═══════════════════════════════════════════════════════════════════════════
-- v86 · GUARDAR DATOS FISCALES + CODIFICACIÓN OBLIGATORIA
--
-- 1 · No se podían guardar los datos fiscales de una empresa. Dos causas en la
--     política de escritura de `empresas`, `contactos` y `empresa_contactos`:
--
--       · Falta el rol `director`. Se escribió antes de que ese rol existiera.
--       · Usa `p.activo` a secas: si la columna está a NULL —y lo está en los
--         perfiles creados antes de que tuviera valor por defecto— la condición
--         no es verdadera, así que la escritura se deniega en silencio.
--
--     El síntoma es el peor posible: el formulario parece funcionar, pulsas
--     guardar y no pasa nada, porque la RLS deniega sin mensaje.
--
-- 2 · El código de proyecto pasa a ser obligatorio y único, con la función de
--     codificación en la BASE. Así, si mañana cambia el algoritmo, se recodifica
--     todo con un UPDATE en vez de a mano.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Escritura del CRM ──────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['empresas','contactos','empresa_contactos'] loop
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format($f$
      create policy %I_write on public.%I for all to authenticated
      using (exists (select 1 from public.perfiles p
                      where p.id = auth.uid()
                        and coalesce(p.activo, true)
                        and p.rol in ('superadmin','admin','director','consultor','gestion')))
      with check (exists (select 1 from public.perfiles p
                      where p.id = auth.uid()
                        and coalesce(p.activo, true)
                        and p.rol in ('superadmin','admin','director','consultor','gestion')))
    $f$, t, t);
  end loop;
end $$;

-- Los perfiles sin `activo` quedan activos: es lo que eran antes de existir la
-- columna, y dejarlos en NULL los deja fuera de todas las políticas.
update public.perfiles set activo = true where activo is null;

-- ── 2 · Codificación de proyectos ──────────────────────────────────────────
-- El algoritmo vive AQUÍ, no en la interfaz. Cambiarlo es cambiar esta función
-- y volver a lanzar el UPDATE del final: todos los proyectos se recodifican.
--
--   Formato:  CLIENTE(4)-AÑO(4)-SERVICIO(3)-NORMAS
--   Ejemplo:  ACAX-2026-IMP-9-14-27

create or replace function public.sigla_cliente(p_nombre text)
returns text language plpgsql immutable as $$
declare limpio text; palabras text[]; n int;
begin
  limpio := upper(unaccent_simple(coalesce(p_nombre, '')));
  limpio := regexp_replace(limpio, '\y(S\.?L\.?U?|S\.?A\.?|SLU|SCP|SCCL|AIE|UTE)\y', ' ', 'g');
  limpio := regexp_replace(limpio, '\y(DE|DEL|LA|LAS|EL|LOS|Y|PARA|POR|CON|EN)\y', ' ', 'g');
  limpio := regexp_replace(limpio, '[^A-Z0-9 ]', ' ', 'g');
  limpio := btrim(regexp_replace(limpio, '\s+', ' ', 'g'));
  if limpio = '' then return 'XXXX'; end if;

  palabras := string_to_array(limpio, ' ');
  n := array_length(palabras, 1);
  if n >= 4 then
    return substr(palabras[1],1,1) || substr(palabras[2],1,1) || substr(palabras[3],1,1) || substr(palabras[4],1,1);
  elsif n >= 2 then
    return substr(substr(palabras[1],1,2) || substr(palabras[2],1,2) || 'XXXX', 1, 4);
  end if;
  return substr(palabras[1] || 'XXXX', 1, 4);
end $$;

-- Quitar acentos sin depender de la extensión unaccent, que no siempre está.
create or replace function public.unaccent_simple(t text)
returns text language sql immutable as $$
  select translate(coalesce(t,''),
    'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
    'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC');
$$;

create or replace function public.codigo_proyecto(
  p_cliente text, p_anio int, p_modelo text, p_normas text[]
) returns text language plpgsql immutable as $$
declare serv text; ns text[] := '{}'; n text; corta text;
begin
  serv := case p_modelo
    when 'Implantación' then 'IMP' when 'Apoyo' then 'APO'
    when 'Relación' then 'REL' when 'Implicación' then 'IML'
    when 'Compromiso' then 'CMP' else 'XXX' end;

  foreach n in array coalesce(p_normas, '{}') loop
    corta := case n
      when '9001' then '9'   when '14001' then '14' when '27001' then '27'
      when '45001' then '45' when '42001' then '42' when '56001' then '56'
      when '21001' then '21' when '9004' then '9004'
      when '93200' then '932' when '158101' then '158' when '66181' then '661'
      when 'igualdad' then 'IG'  when 'igualdad-seg' then 'IGS'
      when 'diversidad' then 'DV' when 'diversidad-seg' then 'DVS'
      when 'madridexcelente' then 'ME'
      else upper(substr(n, 1, 3)) end;
    ns := ns || corta;
  end loop;

  return public.sigla_cliente(p_cliente) || '-' || coalesce(p_anio, extract(year from current_date)::int)::text
       || '-' || serv || case when array_length(ns,1) > 0 then '-' || array_to_string(ns, '-') else '' end;
end $$;

grant execute on function public.codigo_proyecto(text, int, text, text[]) to authenticated;
grant execute on function public.sigla_cliente(text) to authenticated;

-- ── 3 · El código, obligatorio y único ─────────────────────────────────────
alter table public.proyectos_cliente
  add column if not exists codigo text,
  add column if not exists creado timestamptz default now();

-- Se rellenan los que no lo tengan, antes de exigirlo.
with datos as (
  select p.id,
         public.codigo_proyecto(
           coalesce(cl.empresa, 'SIN CLIENTE'),
           extract(year from coalesce(p.creado, now()))::int,
           coalesce(o.modelo, c.modelo, 'Apoyo'),
           coalesce(o.normas, c.normas, '{}')) as cod
    from public.proyectos_cliente p
    left join public.clientes cl on cl.id = p.cliente_id
    left join public.contratos c on c.id = p.contrato_id
    left join public.presupuestos o on o.id = c.presupuesto_id
   where p.codigo is null
)
update public.proyectos_cliente p
   set codigo = d.cod
  from datos d
 where d.id = p.id;

-- Los que se quedaron sin cliente reconocible, con un código de respaldo:
-- mejor un código feo que una fila que impide poner la restricción.
update public.proyectos_cliente
   set codigo = 'XXXX-' || extract(year from coalesce(creado, now()))::int || '-XXX-' || substr(id::text, 1, 4)
 where codigo is null;

-- Si dos proyectos comparten código —mismo cliente, año, servicio y normas—
-- se desempata con un sufijo. Pasa cuando se contrata dos veces lo mismo.
with dups as (
  select id, codigo,
         row_number() over (partition by codigo order by creado, id) as n
    from public.proyectos_cliente
)
update public.proyectos_cliente p
   set codigo = p.codigo || '-' || lpad(d.n::text, 2, '0')
  from dups d
 where d.id = p.id and d.n > 1;

alter table public.proyectos_cliente alter column codigo set not null;
create unique index if not exists proyectos_codigo_unico on public.proyectos_cliente (codigo);

comment on column public.proyectos_cliente.codigo is
  'Código del proyecto: CLIENTE(4)-AÑO-SERVICIO(3)-NORMAS. Obligatorio y único. Se genera con public.codigo_proyecto().';

-- ── 4 · Recodificar TODO cuando cambie el algoritmo ────────────────────────
-- Cambias `codigo_proyecto()` y llamas a esto: se renumera la cartera entera.
drop function if exists public.recodificar_proyectos();
create function public.recodificar_proyectos()
returns table (proyecto_id uuid, codigo_antes text, codigo_ahora text)
language plpgsql security definer as $$
begin
  -- El índice único estorba mientras se recodifica: se quita y se repone.
  drop index if exists public.proyectos_codigo_unico;

  return query
  with nuevo as (
    select p.id as pid, p.codigo as cod_antes,
           public.codigo_proyecto(
             coalesce(cl.empresa, 'SIN CLIENTE'),
             extract(year from coalesce(p.creado, now()))::int,
             coalesce(o.modelo, c.modelo, 'Apoyo'),
             coalesce(o.normas, c.normas, '{}')) as cod_ahora
      from public.proyectos_cliente p
      left join public.clientes cl on cl.id = p.cliente_id
      left join public.contratos c on c.id = p.contrato_id
      left join public.presupuestos o on o.id = c.presupuesto_id
  ),
  numerado as (
    select pid, cod_antes, cod_ahora,
           row_number() over (partition by cod_ahora order by pid) as n
      from nuevo
  ),
  final as (
    select pid, cod_antes,
           case when n > 1 then cod_ahora || '-' || lpad(n::text,2,'0') else cod_ahora end as cod_ahora
      from numerado
  ),
  aplicado as (
    update public.proyectos_cliente p
       set codigo = f.cod_ahora
      from final f
     where f.pid = p.id and p.codigo is distinct from f.cod_ahora
     returning p.id as rid, f.cod_antes as ra, f.cod_ahora as rb
  )
  select rid, ra, rb from aplicado;

  create unique index proyectos_codigo_unico on public.proyectos_cliente (codigo);
end $$;

grant execute on function public.recodificar_proyectos() to authenticated;

-- El alta desde contrato pone el código sola.
create or replace function public.codigo_para_contrato(p_contrato_id uuid)
returns text language sql stable as $$
  select public.codigo_proyecto(
    coalesce(c.cliente_empresa, 'SIN CLIENTE'),
    extract(year from coalesce(c.fecha_contrato, current_date))::int,
    c.modelo, c.normas)
  from public.contratos c where c.id = p_contrato_id;
$$;

grant execute on function public.codigo_para_contrato(uuid) to authenticated;

notify pgrst, 'reload schema';

select 'v86 aplicada' as ok;


-- ── 5 · El alta desde contrato acepta el código ────────────────────────────
create or replace function public.activar_productos_contrato(
  p_contrato_id uuid, p_productos text[],
  p_nombre_proyecto text default null, p_codigo text default null
) returns jsonb language plpgsql security definer as $$
declare c record; cli_id uuid; proy_id uuid; abiertos text[] := '{}'; prod text; cod text;
begin
  select * into c from public.contratos where id = p_contrato_id;
  if c is null then return jsonb_build_object('ok', false, 'error', 'El contrato no existe.'); end if;
  if c.estado = 'anulado' then return jsonb_build_object('ok', false, 'error', 'El contrato está anulado.'); end if;

  select id into cli_id from public.clientes
   where upper(regexp_replace(coalesce(cif,''), '[^A-Za-z0-9]', '', 'g'))
       = upper(regexp_replace(coalesce(c.cliente_cif,''), '[^A-Za-z0-9]', '', 'g'))
     and coalesce(c.cliente_cif,'') <> '' limit 1;
  if cli_id is null then
    insert into public.clientes (empresa, cif, email)
    values (c.cliente_empresa, c.cliente_cif, c.cliente_email) returning id into cli_id;
  end if;

  select id into proy_id from public.proyectos_cliente where contrato_id = p_contrato_id limit 1;
  if proy_id is null then
    cod := coalesce(nullif(btrim(p_codigo), ''), public.codigo_para_contrato(p_contrato_id));
    -- Si ese código ya existe, se desempata en vez de fallar.
    if exists (select 1 from public.proyectos_cliente where codigo = cod) then
      cod := cod || '-' || lpad(((select count(*) from public.proyectos_cliente where codigo like cod || '%') + 1)::text, 2, '0');
    end if;
    insert into public.proyectos_cliente (cliente_id, contrato_id, nombre, codigo, estado)
    values (cli_id, p_contrato_id, coalesce(p_nombre_proyecto, c.objeto, 'Proyecto ' || c.numero), cod, 'activo')
    returning id into proy_id;
  end if;

  foreach prod in array coalesce(p_productos, '{}') loop
    if exists (select 1 from public.productos where id = prod and activo) then
      insert into public.cliente_productos (cliente_id, producto_id, activo, notas)
      values (cli_id, prod, true, 'Alta desde el contrato ' || c.numero)
      on conflict (cliente_id, producto_id) do update set activo = true;
      abiertos := abiertos || prod;
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'cliente_id', cli_id, 'proyecto_id', proy_id,
    'codigo', (select codigo from public.proyectos_cliente where id = proy_id),
    'productos', to_jsonb(abiertos), 'contrato', c.numero);
end $$;

grant execute on function public.activar_productos_contrato(uuid, text[], text, text) to authenticated;

notify pgrst, 'reload schema';
