-- ═══════════════════════════════════════════════════════════════════════════
-- v91 · CÓDIGOS POR SUBPROCESO (máx. 10 caracteres) Y AYUDA POR TAREA
--
-- El código pasa de NORMA-NN a SUBPROCESO-NN, con un TOPE de 10 caracteres:
-- 7 del subproceso + guion + 2 del número. «DOCUMENT-01» no cabe; queda
-- «DOCUMEN-01». Si la tarea no tiene subproceso, se usa la norma (9001-01),
-- que también cabe.
--
-- El código es lo que se VE en la planificación; el título y la ayuda salen
-- al pasar el cursor o al abrir la ficha.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.tareas_programadas
  add column if not exists subproceso text,
  add column if not exists ayuda text;   -- la pantalla de ayuda, editable solo por consultores/administración

comment on column public.tareas_programadas.subproceso is
  'Subproceso del sistema de gestión (p. ej. DOCUMEN, AUDITOR). Base del código.';
comment on column public.tareas_programadas.ayuda is
  'Texto de ayuda de la tarea. Consultores y administración lo editan; las empresas lo leen.';

/** Normaliza el subproceso a su parte útil: mayúsculas, solo A-Z0-9, 7 máx. */
create or replace function public.subproceso_norm(p text)
returns text language sql immutable as $$
  select nullif(left(regexp_replace(upper(coalesce(p,'')), '[^A-Z0-9]', '', 'g'), 7), '');
$$;

/** Código de la siguiente tarea del contexto: SUBPROCESO(7)-NN o NORMA-NN.
    Numeración por contexto+subproceso, así cada subproceso lleva su serie. */
create or replace function public.codigo_tarea(p_contexto uuid, p_subproceso text default null)
returns text language plpgsql stable as $$
declare base text; n int;
begin
  select coalesce(public.subproceso_norm(p_subproceso), c.norma) into base
    from public.proyecto_contextos c where c.id = p_contexto;
  select count(*) + 1 into n
    from public.tareas_programadas t
   where t.contexto_id = p_contexto
     and coalesce(public.subproceso_norm(t.subproceso),
                  (select norma from public.proyecto_contextos where id = p_contexto)) = base;
  return base || '-' || lpad(least(n, 99)::text, 2, '0');
end $$;

/** Recodifica TODO un proyecto: por contexto y subproceso, en orden de fecha.
    Deja los códigos en el formato nuevo de una sola llamada. */
create or replace function public.recodificar_tareas(p_proyecto uuid)
returns int language plpgsql as $$
declare n int := 0; r record;
begin
  for r in
    select t.id,
           coalesce(public.subproceso_norm(t.subproceso), c.norma) as base,
           row_number() over (partition by c.id, coalesce(public.subproceso_norm(t.subproceso), c.norma)
                              order by t.fecha nulls last, t.creado) as num
      from public.tareas_programadas t
      join public.proyecto_contextos c on c.id = t.contexto_id
     where c.proyecto_id = p_proyecto
  loop
    update public.tareas_programadas
       set codigo = r.base || '-' || lpad(least(r.num, 99)::text, 2, '0')
     where id = r.id and codigo is distinct from r.base || '-' || lpad(least(r.num, 99)::text, 2, '0');
    n := n + 1;
  end loop;
  return n;
end $$;

/** Recodifica la cartera ENTERA al formato nuevo. Para la migración inicial. */
create or replace function public.recodificar_todo()
returns int language plpgsql as $$
declare total int := 0; p record;
begin
  for p in select distinct c.proyecto_id from public.proyecto_contextos c loop
    total := total + public.recodificar_tareas(p.proyecto_id);
  end loop;
  return total;
end $$;

grant execute on function public.subproceso_norm(text),
  public.codigo_tarea(uuid, text), public.recodificar_tareas(uuid),
  public.recodificar_todo() to authenticated;

-- La escritura de `ayuda` queda en manos de consultores/administración: la
-- política de la tabla ya limita a esos roles; las empresas ven la ayuda a
-- través de la zona cliente, que es de solo lectura por construcción.

-- ── Recodificación inicial de todo lo existente ──
select public.recodificar_todo() as tareas_recodificadas;

notify pgrst, 'reload schema';
select 'v91 aplicada' as ok;
