-- ═══════════════════════════════════════════════════════════════════════════
-- ¿POR QUÉ SOLO SALE UNA OFERTA?
--
-- Pégalo entero en el editor SQL de Supabase. Ahí se ejecuta con el rol de
-- servicio, que se salta la seguridad de fila: verás lo que hay DE VERDAD en la
-- tabla, no lo que deja ver la política. Comparando ambas cosas se sabe si el
-- problema es que no se guardan o que no se leen.
--
-- El editor solo enseña el resultado de la última consulta, así que va todo en
-- una sola con UNION ALL.
-- ═══════════════════════════════════════════════════════════════════════════

select * from (
  select 1 as n, 'FILAS REALES EN LA TABLA' as concepto,
         count(*)::text as valor,
         coalesce(max(creado)::text, '—') as detalle
    from public.presupuestos

  union all
  select 2, 'Con número de oferta', count(*)::text,
         coalesce(string_agg(numero_oferta, ', ' order by creado desc), '—')
    from public.presupuestos where numero_oferta is not null

  union all
  select 3, 'Sin número de oferta (consultas del formulario)', count(*)::text, ''
    from public.presupuestos where numero_oferta is null

  union all
  select 4, 'Reparto por tipo', string_agg(distinct tipo, ', '), ''
    from public.presupuestos

  union all
  select 5, 'Con user_id (creadas con sesión)', count(*)::text, ''
    from public.presupuestos where user_id is not null

  union all
  select 6, 'Sin user_id (creadas sin sesión o desde la web)', count(*)::text, ''
    from public.presupuestos where user_id is null

  union all
  select 7, 'Mi rol según la base', coalesce(public.mi_rol(), '(sin perfil)'), ''

  union all
  select 8, 'Lo que VE mi sesión con la política puesta', count(*)::text, ''
    from public.presupuestos
   where user_id = auth.uid()
      or email = (auth.jwt() ->> 'email')
      or coalesce(public.mi_rol(), '') in ('consultor','admin','superadmin','gestion','director')

  union all
  select 9, 'Políticas de SELECT sobre la tabla',
         coalesce(string_agg(polname, ', '), '(ninguna)'), ''
    from pg_policy where polrelid = 'public.presupuestos'::regclass and polcmd = 'r'
) t order by n;
