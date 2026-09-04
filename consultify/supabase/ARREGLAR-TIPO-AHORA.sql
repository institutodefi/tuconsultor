-- ═══════════════════════════════════════════════════════════════════════════
-- ARREGLAR YA LA RESTRICCIÓN DE `tipo`
--
-- Síntoma: al guardar una oferta,
--   new row for relation "presupuestos" violates check constraint
--   "presupuestos_tipo_check"
--
-- La aplicación ya manda 'proyecto' (v137), así que si sigue fallando es que la
-- restricción de tu base NO admite ese valor: la v72 y la v79 no llegaron a
-- aplicarse, o se aplicaron a medias.
--
-- Esto lo resuelve en un solo pegado y te dice qué encontró.
-- Es idempotente: puedes ejecutarlo las veces que quieras.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Qué admite ahora mismo ──
do $$
declare def text;
begin
  select pg_get_constraintdef(oid) into def
    from pg_constraint
   where conrelid = 'public.presupuestos'::regclass and conname = 'presupuestos_tipo_check';

  if def is null then
    raise notice 'ANTES: no hay restricción con ese nombre.';
  else
    raise notice 'ANTES: %', def;
  end if;
end $$;

-- ── 2 · Fuera la restricción, para poder tocar los datos ──
-- Se buscan TODAS las restricciones de tipo, no solo la del nombre esperado:
-- puede haberse creado con otro nombre en alguna instalación.
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
     where conrelid = 'public.presupuestos'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%tipo%'
  loop
    execute format('alter table public.presupuestos drop constraint %I', r.conname);
    raise notice 'quitada: %', r.conname;
  end loop;
end $$;

-- ── 3 · Normalizar lo que haya ──
-- El modelo manda: es el dato fiable.
update public.presupuestos
   set tipo = case
     when modelo = 'Implantación' then 'proyecto'
     when modelo = 'Apoyo'        then 'bolsa'
     when modelo in ('Relación','Implicación','Compromiso') then 'mes'
     when tipo in ('mes','bolsa','proyecto') then tipo
     else 'mes'
   end
 where tipo is null or tipo not in ('mes','bolsa','proyecto')
    or (modelo = 'Implantación' and tipo <> 'proyecto')
    or (modelo = 'Apoyo' and tipo <> 'bolsa');

-- ── 4 · Ponerla bien ──
alter table public.presupuestos
  add constraint presupuestos_tipo_check check (tipo in ('mes','bolsa','proyecto'));

-- ── 5 · Probar el alta real y decir si funciona ──
do $$
declare def text; e text;
begin
  select pg_get_constraintdef(oid) into def
    from pg_constraint
   where conrelid = 'public.presupuestos'::regclass and conname = 'presupuestos_tipo_check';
  raise notice 'AHORA: %', def;

  begin
    insert into public.presupuestos (numero_oferta, empresa, modelo, precio, tipo)
    values ('__PRUEBA_TIPO__', 'Prueba', 'Implantación', 1, 'proyecto');
    delete from public.presupuestos where numero_oferta = '__PRUEBA_TIPO__';
    raise notice '✓ Una oferta de IMPLANTACIÓN ya se puede guardar.';
  exception when others then
    get stacked diagnostics e = message_text;
    raise notice '✗ SIGUE FALLANDO: %', e;
  end;

  raise notice '--- reparto actual ---';
end $$;

select tipo, count(*) as ofertas, string_agg(distinct modelo, ', ') as modelos
  from public.presupuestos
 group by tipo
 order by 2 desc;
