-- ════════════════════════════════════════════════════════════════════════════
-- v153 · EMBUDO DE OPORTUNIDADES · y el rol comercial en las políticas RLS
--
-- Dos cosas, y la segunda es un fallo de la v152 que había que cazar antes de
-- que se notara en producción.
--
-- 1 · EL FALLO DE LA v152. Añadimos el rol `comercial` a la aplicación, pero
--     las políticas RLS de la base enumeran los roles UNA A UNA. Hay 41 que
--     nombran a 'gestion' y ninguna nombraba a 'comercial': un usuario con el
--     rol nuevo habría visto las pantallas y le habría fallado cada guardado
--     con un error de permisos que no dice nada. Aquí se arregla para las
--     tablas que un comercial necesita de verdad, y solo para esas: el CRM y
--     lo que hace falta para generar una oferta. Nada de proyectos, sesiones
--     ni horas: eso es entrega.
--
-- 2 · EL EMBUDO. Lo que Rafael pedía y no existía. Ojo con lo que SÍ existía,
--     porque no es lo mismo:
--       · `empresas.estado_comercial` es el estado del CICLO DE VIDA de una
--         empresa (potencial, activo, inactivo, perdido). Una empresa puede
--         ser cliente activo y a la vez tener una oportunidad abierta.
--       · `presupuestos.estado` es el estado de UNA OFERTA ya emitida
--         (emitida, aceptada, rechazada). El embudo empezaba cuando ya habías
--         hecho la propuesta: justo después de la parte difícil.
--     La oportunidad es lo de antes: el trato que se está trabajando, con su
--     fase, su importe y su fecha de cierre. Cuando se convierte en oferta,
--     se enlaza con el presupuesto y deja de ser una estimación.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1 · El rol comercial, en las políticas que le hacen falta ───────────────
-- Se reescribe cada política añadiendo 'comercial' junto a 'gestion', sin
-- tocar nada más de su definición. Programático a propósito: hacerlo a mano en
-- once políticas es once ocasiones de equivocarse.
do $$
declare
  p record;
  qual text; chk text; cmd text; roles text;
  tablas text[] := array[
    'empresas', 'contactos', 'empresa_contactos', 'leads',
    'clientes', 'cliente_contactos',
    'presupuestos', 'presupuesto_ajustes', 'presupuesto_estados',
    'parametros_precio', 'normas_catalogo', 'tareas_catalogo', 'reglas_comerciales'
  ];
begin
  for p in
    select c.relname as tabla, pol.polname as nombre, pol.polcmd as cmd,
           pg_get_expr(pol.polqual, pol.polrelid) as qual,
           pg_get_expr(pol.polwithcheck, pol.polrelid) as chk,
           (select string_agg(quote_ident(rolname), ', ') from pg_roles where oid = any(pol.polroles)) as roles
    from pg_policy pol join pg_class c on c.oid = pol.polrelid
    where c.relname = any(tablas)
      and (pg_get_expr(pol.polqual, pol.polrelid) like '%''gestion''::text%'
        or pg_get_expr(pol.polwithcheck, pol.polrelid) like '%''gestion''::text%')
      and coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') not like '%''comercial''::text%'
  loop
    qual := replace(coalesce(p.qual, ''), '''gestion''::text', '''gestion''::text, ''comercial''::text');
    chk  := replace(coalesce(p.chk,  ''), '''gestion''::text', '''gestion''::text, ''comercial''::text');
    cmd  := case p.cmd when 'r' then 'select' when 'w' then 'update'
                       when 'a' then 'insert' when 'd' then 'delete' else 'all' end;
    roles := coalesce(p.roles, 'authenticated');

    execute format('drop policy %I on public.%I', p.nombre, p.tabla);
    execute format('create policy %I on public.%I for %s to %s %s %s',
      p.nombre, p.tabla, cmd, roles,
      case when nullif(qual, '') is not null and cmd <> 'insert' then 'using (' || qual || ')' else '' end,
      case when nullif(chk, '') is not null then 'with check (' || chk || ')' else '' end);
    raise notice 'política reescrita: %.%', p.tabla, p.nombre;
  end loop;
end $$;

-- ── 2 · Las oportunidades ───────────────────────────────────────────────────
create table if not exists oportunidades (
  id              uuid primary key default gen_random_uuid(),
  empresa_id      uuid not null references empresas(id) on delete cascade,
  contacto_id     uuid references contactos(id) on delete set null,
  titulo          text not null,
  -- Las fases. 'nueva' es el buzón de entrada: algo que ha entrado y todavía
  -- no se ha mirado. Las dos últimas son terminales.
  fase            text not null default 'nueva'
                  check (fase in ('nueva', 'contactada', 'cualificada', 'propuesta', 'negociacion', 'ganada', 'perdida')),
  importe         numeric(12,2),
  -- Probabilidad de cierre, para la previsión ponderada. Por defecto la que
  -- corresponde a la fase; se puede ajustar a mano cuando se sabe más.
  probabilidad    integer check (probabilidad between 0 and 100),
  fecha_cierre    date,
  origen          text,
  responsable_id  uuid references perfiles(id) on delete set null,
  -- Cuando la oportunidad se convierte en oferta, aquí queda el enlace: deja
  -- de ser una estimación y pasa a tener un número de verdad.
  presupuesto_id  uuid references presupuestos(id) on delete set null,
  motivo_perdida  text,
  notas           text,
  creado          timestamptz not null default now(),
  actualizado     timestamptz not null default now(),
  cerrada_en      timestamptz
);

create index if not exists oportunidades_empresa_idx     on oportunidades (empresa_id);
create index if not exists oportunidades_responsable_idx on oportunidades (responsable_id);
-- El índice que de verdad se usa: el tablero pide las abiertas por fase.
create index if not exists oportunidades_abiertas_idx    on oportunidades (fase, fecha_cierre)
  where fase not in ('ganada', 'perdida');

drop trigger if exists oportunidades_actualizado on oportunidades;
create trigger oportunidades_actualizado
  before update on oportunidades
  for each row execute function tocar_actualizado();

-- Cerrar es un hecho con fecha: se pone sola al pasar a ganada o perdida, y se
-- borra si la oportunidad vuelve a abrirse. Dejarlo a mano es garantizar que
-- la mitad de las filas mientan.
create or replace function oportunidad_marcar_cierre()
returns trigger language plpgsql as $$
begin
  if new.fase in ('ganada', 'perdida') and (old.fase is distinct from new.fase) then
    new.cerrada_en := now();
  elsif new.fase not in ('ganada', 'perdida') then
    new.cerrada_en := null;
  end if;
  return new;
end $$;

drop trigger if exists oportunidades_cierre on oportunidades;
create trigger oportunidades_cierre
  before insert or update on oportunidades
  for each row execute function oportunidad_marcar_cierre();

comment on table oportunidades is
  'El embudo comercial: el trato que se está trabajando, ANTES de que exista una oferta. No confundir con empresas.estado_comercial (ciclo de vida de la empresa) ni con presupuestos.estado (estado de una oferta ya emitida).';

-- ── 3 · Permisos ────────────────────────────────────────────────────────────
alter table oportunidades enable row level security;

-- Todo el equipo las ve: esconderle el embudo a dirección o a quien va a
-- ejecutar el proyecto no protege nada y complica el trabajo.
drop policy if exists oportunidades_select on oportunidades;
create policy oportunidades_select on oportunidades
  for select to authenticated using (true);

-- Escriben quienes venden y quienes mandan.
drop policy if exists oportunidades_write on oportunidades;
create policy oportunidades_write on oportunidades
  for all to authenticated
  using (exists (select 1 from perfiles p where p.id = auth.uid() and coalesce(p.activo, true)
                 and p.rol = any (array['superadmin', 'admin', 'director', 'comercial', 'gestion'])))
  with check (exists (select 1 from perfiles p where p.id = auth.uid() and coalesce(p.activo, true)
                 and p.rol = any (array['superadmin', 'admin', 'director', 'comercial', 'gestion'])));

grant select, insert, update, delete on oportunidades to authenticated;
