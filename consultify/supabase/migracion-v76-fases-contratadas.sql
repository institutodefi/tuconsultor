-- ═══════════════════════════════════════════════════════════════════════════
-- v76 · FASES CONTRATADAS DE CADA PLAN
--
-- Al quitar fases de un plan, el precio bajaba pero el PDF seguía enumerando
-- las siete: el alcance escrito no se correspondía con lo cobrado. Y al
-- regenerar una oferta no había forma de saber qué fases se habían contratado,
-- porque no se guardaban en ninguna parte.
--
-- Formato: {"igualdad": ["1","2","3"], "diversidad": ["1","2"]}
-- Sin fila o con null = todas las fases, que es como se comportaba antes.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.presupuestos
  add column if not exists fases_plan jsonb;

comment on column public.presupuestos.fases_plan is
  'Fases contratadas de cada plan. null = todas. Es lo que permite regenerar la oferta con su alcance real.';

-- ── Comprobación de que las ofertas llegan al histórico ────────────────────
-- Si algo falla al guardar, esto lo enseña: cuántas ofertas hay, de cuándo es
-- la última y cuántas se quedaron sin documento.
do $$
declare n int; ultima timestamptz; sin_doc int;
begin
  select count(*), max(creado) into n, ultima from public.presupuestos;
  select count(*) into sin_doc from public.presupuestos where url_pdf is null;
  raise notice '--- histórico de ofertas ---';
  raise notice '  ofertas guardadas: %', n;
  raise notice '  última: %', coalesce(ultima::text, 'ninguna');
  raise notice '  sin PDF generado: %', sin_doc;
  if n = 0 then
    raise notice '  ⚠ La tabla está vacía. Si estás generando ofertas, no se están guardando:';
    raise notice '    revisa las políticas de INSERT de `presupuestos` para el rol que las crea.';
  end if;
end $$;

-- Quién puede insertar hoy, para poder mirarlo de un vistazo.
do $$
declare r record;
begin
  raise notice '--- políticas de presupuestos ---';
  for r in select polname, polcmd from pg_policy where polrelid = 'public.presupuestos'::regclass loop
    raise notice '  % (%)', r.polname, r.polcmd;
  end loop;
end $$;

notify pgrst, 'reload schema';

select 'v76 aplicada' as ok;
