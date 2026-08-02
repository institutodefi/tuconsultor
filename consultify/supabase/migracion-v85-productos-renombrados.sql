-- ═══════════════════════════════════════════════════════════════════════════
-- v85 · LOS DOS PRODUCTOS, CON SU NOMBRE DEFINITIVO
--
--   Orbita.PMTool  · Process and Management Tool
--   Orbita.TPTool  · Transformation Projects Tool
--
-- Sustituyen a los identificadores 'mstool' y 'pttool' de la v73. Se conservan
-- los mismos id para no romper lo que ya apunte a ellos; lo que cambia es el
-- nombre visible.
--
-- ⚠ AVISO DE NOMBRES. La plataforma se llama «Orbita.PMTools» y uno de los
-- productos pasa a llamarse «Orbita.PMTool». Se diferencian en una ese, y en
-- una factura o en un correo eso se confunde. Conviene decidir si la plataforma
-- debería llamarse de otra forma antes de que el nombre esté en documentos
-- firmados.
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.productos (id, nombre, nombre_corto, descripcion, color, orden, activo) values
  ('mstool', 'Orbita.PMTool', 'PMTool',
   'Process and Management Tool. El sistema de gestión de la organización: procesos, documentación, auditorías, no conformidades y mejora.',
   '#1FA1A6', 10, true),
  ('pttool', 'Orbita.TPTool', 'TPTool',
   'Transformation Projects Tool. Los proyectos de transformación: alcance, fases, hitos, entregables y seguimiento.',
   '#F99001', 20, true)
on conflict (id) do update
  set nombre = excluded.nombre, nombre_corto = excluded.nombre_corto,
      descripcion = excluded.descripcion, color = excluded.color, orden = excluded.orden;

-- Las herramientas conservan su id; solo se ajusta lo que se lee.
update public.producto_herramientas
   set nombre = 'Panel del sistema'  where id = 'ms-panel';
update public.producto_herramientas
   set nombre = 'Panel de proyectos' where id = 'pt-panel';

-- ── El producto se da de alta al firmar, vinculado al contrato ─────────────
-- Hasta ahora `cliente_productos` no sabía de dónde venía el alta. Si un
-- cliente pregunta por qué tiene acceso a algo, hay que poder responderlo.
alter table public.cliente_productos
  add column if not exists contrato_id uuid references public.contratos(id) on delete set null,
  add column if not exists proyecto_id uuid;

comment on column public.cliente_productos.contrato_id is
  'Contrato que dio derecho a este producto. Sin esto, un acceso concedido no se puede justificar.';

create index if not exists cliente_productos_contrato on public.cliente_productos (contrato_id);

-- ── Dar de alta los productos de un contrato firmado ──────────────────────
create or replace function public.activar_productos_contrato(
  p_contrato_id uuid, p_productos text[]
) returns jsonb language plpgsql security definer as $$
declare c record; cli uuid; n int := 0; pid text;
begin
  select * into c from public.contratos where id = p_contrato_id;
  if c is null then
    return jsonb_build_object('ok', false, 'error', 'El contrato no existe.');
  end if;

  -- El cliente sale del presupuesto del contrato, por su CIF.
  select cl.id into cli
    from public.presupuestos p
    join public.clientes cl on upper(cl.cif) = upper(p.cif)
   where p.id = c.presupuesto_id
   limit 1;

  if cli is null then
    return jsonb_build_object('ok', false,
      'error', 'No hay ninguna ficha de cliente con ese CIF. Créala antes de dar acceso.');
  end if;

  foreach pid in array coalesce(p_productos, '{}') loop
    insert into public.cliente_productos (cliente_id, producto_id, contrato_id, activo)
    values (cli, pid, p_contrato_id, true)
    on conflict (cliente_id, producto_id) do update
      set activo = true, contrato_id = excluded.contrato_id;
    n := n + 1;
  end loop;

  return jsonb_build_object('ok', true, 'cliente_id', cli, 'productos', n);
end $$;

grant execute on function public.activar_productos_contrato(uuid, text[]) to authenticated;

notify pgrst, 'reload schema';

select 'v85 aplicada' as ok;
