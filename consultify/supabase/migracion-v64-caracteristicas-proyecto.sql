-- ═══════════════════════════════════════════════════════════════════════════
-- v64 · TRES CARACTERÍSTICAS DEL PROYECTO EN LAS REGLAS COMERCIALES
--
--   1 · Complejidad          alta / media / baja
--   2 · Equipo consultor     perfiles presentes y número de personas (máx. 3)
--   3 · Sedes o alcances
--
-- Son CONDICIONES, no fórmulas. Que la complejidad alta encarezca un 20 % no
-- lo decide el código: lo decide una regla comercial que alguien escribe, firma
-- y fecha. Así el criterio queda registrado y se puede discutir.
--
-- Se guardan también en el presupuesto, porque una oferta sin saber para cuántas
-- sedes se hizo no se puede defender seis meses después.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Condiciones nuevas en las reglas ──
alter table public.reglas_comerciales
  add column if not exists complejidad   text[],       -- {alta,media}; vacío = cualquiera
  add column if not exists min_sedes     integer,
  add column if not exists max_sedes     integer,
  add column if not exists perfiles      text[],       -- {Senior,J3}; el equipo debe incluirlos TODOS
  add column if not exists min_personas  integer,
  add column if not exists max_personas  integer;

comment on column public.reglas_comerciales.complejidad is
  'Niveles de complejidad a los que aplica la regla. Vacío = cualquiera.';
comment on column public.reglas_comerciales.perfiles is
  'Perfiles que debe incluir el equipo estimado para que la regla aplique. Vacío = cualquiera.';

-- Coherencia de rangos.
alter table public.reglas_comerciales drop constraint if exists reglas_sedes_ok;
alter table public.reglas_comerciales add constraint reglas_sedes_ok check (
  min_sedes is null or max_sedes is null or max_sedes >= min_sedes);

alter table public.reglas_comerciales drop constraint if exists reglas_personas_ok;
alter table public.reglas_comerciales add constraint reglas_personas_ok check (
  (min_personas is null or max_personas is null or max_personas >= min_personas)
  and (max_personas is null or max_personas <= 3)
  and (min_personas is null or min_personas >= 0));

-- Complejidad: solo los tres valores previstos.
alter table public.reglas_comerciales drop constraint if exists reglas_complejidad_ok;
alter table public.reglas_comerciales add constraint reglas_complejidad_ok check (
  complejidad is null or complejidad <@ array['baja','media','alta']::text[]);

-- Perfiles: solo los cuatro niveles reales.
alter table public.reglas_comerciales drop constraint if exists reglas_perfiles_ok;
alter table public.reglas_comerciales add constraint reglas_perfiles_ok check (
  perfiles is null or perfiles <@ array['J1','J2','J3','Senior']::text[]);

-- ── 2 · Las mismas características, guardadas en cada presupuesto ──
alter table public.presupuestos
  add column if not exists complejidad text check (complejidad in ('baja','media','alta')),
  add column if not exists sedes       integer default 1 check (sedes >= 1),
  add column if not exists equipo      jsonb;          -- {"Senior":1,"J3":2,"J2":0,"J1":0}

comment on column public.presupuestos.equipo is
  'Equipo consultor estimado en el momento de ofertar. Máximo 3 personas.';

-- El tope de 3 personas también en la base: la interfaz puede fallar.
alter table public.presupuestos drop constraint if exists presupuestos_equipo_max3;
alter table public.presupuestos add constraint presupuestos_equipo_max3 check (
  equipo is null
  or (coalesce((equipo->>'Senior')::int,0) + coalesce((equipo->>'J3')::int,0)
    + coalesce((equipo->>'J2')::int,0) + coalesce((equipo->>'J1')::int,0)) <= 3);

notify pgrst, 'reload schema';

-- ═══ Ejemplos de regla, comentados ═══════════════════════════════════════════
-- insert into public.reglas_comerciales (nombre, tipo, unidad, valor, complejidad, notas) values
--   ('Complejidad alta · +20 %', 'recargo', 'porcentaje', 20, '{alta}',
--    'Sector regulado, varias sedes o sin sistema previo: más horas de campo y más iteraciones.');
--
-- insert into public.reglas_comerciales (nombre, tipo, unidad, valor, min_sedes, notas) values
--   ('A partir de 4 sedes · +12 %', 'recargo', 'porcentaje', 12, 4,
--    'Cada sede añade visitas, entrevistas y evidencias propias.');
--
-- insert into public.reglas_comerciales (nombre, tipo, unidad, valor, perfiles, notas) values
--   ('Equipo con Senior · 65 €/h', 'precio_hora', 'euros', 65, '{Senior}',
--    'Cuando el encargo exige dirección senior, la tarifa se unifica.');

select 'v64 aplicada' as ok;
