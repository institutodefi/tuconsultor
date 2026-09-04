-- ═══════════════════════════════════════════════════════════════════════════
-- v110 · QUIÉN APRUEBA UNA OFERTA ANTES DE QUE SALGA
--
-- Una oferta emitida llega al cliente como precio en firme: no lleva «desde»
-- ni condicionales, y subirlo después no es una opción.
--
-- Por eso tiene que constar quién de TuConsultor la ha aprobado. No es
-- burocracia: es la persona a la que preguntar si mañana surge una duda sobre
-- por qué se ofertó ese importe, y la que respondió de que el alcance, las
-- sedes y la plantilla se habían valorado de verdad.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.presupuestos
  add column if not exists aprobada_por  uuid references public.perfiles(id) on delete set null,
  add column if not exists aprobada_en   timestamptz,
  add column if not exists aprobada_nota text;

comment on column public.presupuestos.aprobada_por is
  'Quién de TuConsultor aprueba el precio antes de emitir. La oferta sale en firme: tiene que tener responsable.';
comment on column public.presupuestos.aprobada_nota is
  'Por qué se aprueba a ese importe: complejidad, sedes, plantilla o lo que se haya valorado.';

create index if not exists presupuestos_aprobadas
  on public.presupuestos (aprobada_por) where aprobada_por is not null;

notify pgrst, 'reload schema';

select 'v110 aplicada' as ok;
