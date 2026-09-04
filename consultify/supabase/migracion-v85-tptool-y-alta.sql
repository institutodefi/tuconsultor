-- ═══════════════════════════════════════════════════════════════════════════
-- v85 · Orbita.TPTool + ALTA DE PRODUCTOS AL FIRMAR
--
-- 1 · El segundo producto pasa de PTTool a TPTool: Transformation Projects
--     Tool. Se distingue mejor de la plataforma (Orbita.PMTools) y del primero.
--
-- 2 · Cuando un contrato se firma, administración da de alta uno de los dos
--     productos o los dos, vinculados al proyecto. Y el proyecto queda colgado
--     del contrato: sin esa cadena, un cliente con acceso a una herramienta no
--     se puede rastrear hasta lo que firmó.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Renombrar el producto ──
-- Se crea el nuevo y se traslada lo que hubiera del anterior, en vez de un
-- update del id: hay claves ajenas apuntando y romperlas sería peor.
insert into public.productos (id, nombre, nombre_corto, descripcion, color, orden, activo) values
  ('tptool', 'Orbita.TPTool', 'TPTool',
   'Transformation Projects Tool. Los proyectos de transformación: alcance, fases, hitos, entregables y seguimiento.',
   '#F99001', 20, true)
on conflict (id) do update
  set nombre = excluded.nombre, nombre_corto = excluded.nombre_corto,
      descripcion = excluded.descripcion, color = excluded.color, orden = excluded.orden;

update public.productos
   set nombre = 'Orbita.MSTool', nombre_corto = 'MSTool',
       descripcion = 'Management System Tool. El sistema de gestión: procesos, documentación, auditorías, no conformidades y mejora.'
 where id = 'mstool';

-- Las herramientas del antiguo pasan al nuevo.
update public.producto_herramientas set producto_id = 'tptool' where producto_id = 'pttool';
update public.producto_herramientas set id = replace(id, 'pt-', 'tp-') where id like 'pt-%';

-- Y lo que tuvieran contratado los clientes.
update public.cliente_productos set producto_id = 'tptool' where producto_id = 'pttool';

delete from public.productos where id = 'pttool';

-- ── 2 · El proyecto, colgado del contrato ──
alter table public.proyectos_cliente
  add column if not exists contrato_id uuid references public.contratos(id) on delete set null,
  add column if not exists producto_id text references public.productos(id);

create index if not exists proyectos_contrato on public.proyectos_cliente (contrato_id);

comment on column public.proyectos_cliente.contrato_id is
  'Contrato del que nace este proyecto. Permite rastrear un acceso hasta lo que se firmó.';

-- ── 3 · Dar de alta los productos al firmar ────────────────────────────────
-- Una sola llamada: crea el proyecto, lo cuelga del contrato y abre los
-- productos que se indiquen. Hacerlo en tres pasos desde la interfaz deja
-- estados a medias cuando algo falla por el camino.
create or replace function public.activar_productos_contrato(
  p_contrato_id uuid,
  p_productos text[],              -- {'mstool'} · {'tptool'} · {'mstool','tptool'}
  p_nombre_proyecto text default null
) returns jsonb language plpgsql security definer as $$
declare c record; o record; cli_id uuid; proy_id uuid; abiertos text[] := '{}';
        prod text;
begin
  select * into c from public.contratos where id = p_contrato_id;
  if c is null then
    return jsonb_build_object('ok', false, 'error', 'El contrato no existe.');
  end if;
  if c.estado = 'anulado' then
    return jsonb_build_object('ok', false, 'error', 'El contrato está anulado.');
  end if;

  select * into o from public.presupuestos where id = c.presupuesto_id;

  -- La empresa cliente: por CIF, que es la clave de verdad.
  select id into cli_id from public.clientes
   where upper(regexp_replace(coalesce(cif,''), '[^A-Za-z0-9]', '', 'g'))
       = upper(regexp_replace(coalesce(c.cliente_cif,''), '[^A-Za-z0-9]', '', 'g'))
     and coalesce(c.cliente_cif,'') <> ''
   limit 1;

  if cli_id is null then
    insert into public.clientes (empresa, cif, email)
    values (c.cliente_empresa, c.cliente_cif, c.cliente_email)
    returning id into cli_id;
  end if;

  -- Un proyecto por contrato: si ya existe, se reutiliza.
  select id into proy_id from public.proyectos_cliente where contrato_id = p_contrato_id limit 1;
  if proy_id is null then
    insert into public.proyectos_cliente (cliente_id, contrato_id, nombre, estado)
    values (cli_id, p_contrato_id,
            coalesce(p_nombre_proyecto, c.objeto, 'Proyecto ' || c.numero), 'activo')
    returning id into proy_id;
  end if;

  -- Los productos que se abran.
  foreach prod in array coalesce(p_productos, '{}') loop
    if exists (select 1 from public.productos where id = prod and activo) then
      insert into public.cliente_productos (cliente_id, producto_id, activo, notas)
      values (cli_id, prod, true, 'Alta desde el contrato ' || c.numero)
      on conflict (cliente_id, producto_id) do update set activo = true;
      abiertos := abiertos || prod;
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'cliente_id', cli_id, 'proyecto_id', proy_id,
                            'productos', to_jsonb(abiertos), 'contrato', c.numero);
end $$;

grant execute on function public.activar_productos_contrato(uuid, text[], text) to authenticated;

notify pgrst, 'reload schema';

select 'v85 aplicada' as ok;
