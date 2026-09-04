-- ═══════════════════════════════════════════════════════════════════════════
-- v90 · BASE DEL NUEVO FLUJO DE PLANIFICACIÓN
--
-- El flujo que define el consultor, en este orden:
--   1 · Modelo del proyecto (Implantación / Apoyo / Relación-Implicación-
--       Compromiso) y FECHA LÍMITE.
--   2 · Normas, TODAS opcionales — incluida la 9001, que hasta ahora venía
--       obligada.
--   3 · Tareas con código SENCILLO, programadas a mano por el consultor.
--
-- Principio que gobierna todo: NO se integra nada. Si un proyecto lleva tres
-- sistemas, lleva tres contextos y las tareas de los tres se programan, aunque
-- el consultor luego las despache juntas. Integrar contextos esconde trabajo:
-- el papel diría «una tarea» donde el sistema exige tres evidencias.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · La 9001 deja de ser obligatoria ────────────────────────────────────
-- Estaba forzada en el generador; en la base no hay restricción que la exija,
-- así que basta con garantizar que ninguna función la añade sola.
-- (El cambio real es de interfaz: se documenta aquí para que quede en el
-- historial de migraciones.)

-- ── 2 · Fecha límite y contextos por norma ─────────────────────────────────
alter table public.proyectos_cliente
  add column if not exists fecha_limite date,
  add column if not exists modelo text
    check (modelo is null or modelo in ('implantacion','apoyo','relacion'));

comment on column public.proyectos_cliente.fecha_limite is
  'La fecha que gobierna los avisos de 30/60/90 días. No es la de certificación: es el tope que pacta el consultor.';

-- Cada norma de un proyecto es un CONTEXTO independiente.
create table if not exists public.proyecto_contextos (
  id          uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos_cliente(id) on delete cascade,
  norma       text not null,
  creado      timestamptz not null default now(),
  unique (proyecto_id, norma)
);

-- ── 3 · Tareas programadas: el corazón ─────────────────────────────────────
create table if not exists public.tareas_programadas (
  id           uuid primary key default gen_random_uuid(),
  contexto_id  uuid not null references public.proyecto_contextos(id) on delete cascade,
  codigo       text not null,             -- corto: se genera solo (ver función)
  titulo       text not null,
  descripcion  text,                      -- lo que se lee al pasar el cursor
  fecha        date,                      -- SIN fecha = sin programar todavía
  hora_inicio  time,
  duracion_min int check (duracion_min is null or duracion_min > 0),
  estado       text not null default 'pendiente'
                 check (estado in ('pendiente','programada','hecha','anulada')),
  hecha_en     timestamptz,
  horas_reales numeric(6,2),              -- lo ejecutado, para el planificado-vs-real
  consultor_id uuid,
  creado       timestamptz not null default now(),
  unique (contexto_id, codigo)
);
create index if not exists tareas_prog_fecha on public.tareas_programadas (fecha) where fecha is not null;
create index if not exists tareas_prog_contexto on public.tareas_programadas (contexto_id);

comment on table public.tareas_programadas is
  'Una fila por tarea Y por contexto: nunca se integra. Tres sistemas = tres filas, aunque el consultor las haga en la misma visita. Lo que hay aquí ES la agenda: no hay dos verdades.';

-- ── 4 · Código sencillo y legible ──────────────────────────────────────────
-- NORMA-NÚMERO: «9001-01», «27001-12». Corto para la vista compacta; la
-- descripción larga vive en `descripcion` y se enseña al pasar el cursor.
create or replace function public.codigo_tarea(p_contexto uuid)
returns text language sql stable as $$
  select c.norma || '-' || lpad((count(t.id) + 1)::text, 2, '0')
    from public.proyecto_contextos c
    left join public.tareas_programadas t on t.contexto_id = c.id
   where c.id = p_contexto
   group by c.norma;
$$;

/** Recodifica TODAS las tareas de un proyecto en orden de fecha (las sin fecha
    al final, por creación). Una sola llamada deja la numeración limpia. */
create or replace function public.recodificar_tareas(p_proyecto uuid)
returns int language plpgsql as $$
declare n int := 0; r record;
begin
  for r in
    select t.id, c.norma,
           row_number() over (partition by c.id order by t.fecha nulls last, t.creado) as num
      from public.tareas_programadas t
      join public.proyecto_contextos c on c.id = t.contexto_id
     where c.proyecto_id = p_proyecto
  loop
    update public.tareas_programadas
       set codigo = r.norma || '-' || lpad(r.num::text, 2, '0')
     where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- ── 5 · Los avisos de 30/60/90 días ────────────────────────────────────────
create or replace function public.pendiente_por_horizonte()
returns table (proyecto_id uuid, codigo_proyecto text, fecha_limite date,
               horizonte int, pendientes bigint) language sql stable as $$
  select p.id, p.codigo, p.fecha_limite,
         case when p.fecha_limite - current_date <= 30 then 30
              when p.fecha_limite - current_date <= 60 then 60
              else 90 end as horizonte,
         count(t.id) as pendientes
    from public.proyectos_cliente p
    join public.proyecto_contextos c on c.proyecto_id = p.id
    join public.tareas_programadas t on t.contexto_id = c.id
   where p.fecha_limite is not null
     and p.fecha_limite - current_date <= 90
     and t.estado in ('pendiente','programada')
   group by p.id, p.codigo, p.fecha_limite;
$$;

grant execute on function public.codigo_tarea(uuid), public.recodificar_tareas(uuid),
      public.pendiente_por_horizonte() to authenticated;

-- ═══ RLS ═══
do $$
declare t text;
begin
  foreach t in array array['proyecto_contextos','tareas_programadas'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_rw on public.%I', t, t);
    execute format($f$
      create policy %I_rw on public.%I for all to authenticated
      using (exists (select 1 from public.perfiles p where p.id = auth.uid()
                      and coalesce(p.activo,true)
                      and p.rol in ('superadmin','admin','director','consultor','gestion')))
      with check (exists (select 1 from public.perfiles p where p.id = auth.uid()
                      and coalesce(p.activo,true)
                      and p.rol in ('superadmin','admin','director','consultor','gestion')))
    $f$, t, t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
select 'v90 aplicada' as ok;
