-- ═══════════════════════════════════════════════════════════════════════════
-- v113 · QUITAR LAS TAREAS DUPLICADAS Y SELLAR LA IDENTIDAD
--
-- CECE pasó de 88 tareas a 127. El volcado comprobaba si una tarea ya existía
-- comparando su TÍTULO, y el formato del título cambió —de
-- «… - Integrada 9001 14001» a «subproceso · norma»—. Al no reconocer las que
-- ya estaban, las insertó otra vez.
--
-- La identidad de una tarea no es su nombre: es la fila del catálogo de la que
-- sale. Aquí se borran las repetidas y se impide que vuelva a ocurrir.
--
-- Qué copia se conserva: la MÁS ANTIGUA, y de haber empate, la que tenga
-- sesiones programadas. Borrar una tarea con trabajo agendado dejaría sesiones
-- huérfanas y perdería horas ya ejecutadas.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Enlazar al catálogo lo que se pueda ────────────────────────────────
-- Sin `catalogo_id` no hay forma fiable de saber si dos filas son la misma.
update public.cliente_tareas t
   set catalogo_id = c.id
  from public.tareas_catalogo c
 where t.catalogo_id is null
   and c.norma_id = t.norma_id
   and public.clave_modelo(c.modelo) = public.clave_modelo(t.modelo)
   and coalesce(upper(trim(c.proceso)), '')    = coalesce(upper(trim(t.proceso)), '')
   and coalesce(upper(trim(c.subproceso)), '') = coalesce(upper(trim(t.subproceso)), '');

-- ── 2 · Borrar las repetidas ───────────────────────────────────────────────
with clasificadas as (
  select t.id,
         t.proyecto_id,
         -- La misma clave que usa la aplicación: catálogo si lo hay, y si no,
         -- norma + proceso + subproceso. El título nunca entra.
         coalesce(t.catalogo_id::text,
                  upper(trim(coalesce(t.norma_id, ''))) || '|'
               || upper(trim(coalesce(t.proceso, ''))) || '|'
               || upper(trim(coalesce(t.subproceso, '')))) as clave,
         (select count(*) from public.tarea_sesiones s
           where s.cliente_tarea_id = t.id and s.estado <> 'anulada') as n_sesiones,
         t.creado
    from public.cliente_tareas t
),
ordenadas as (
  select id, proyecto_id, clave,
         row_number() over (
           partition by proyecto_id, clave
           -- Primero la que tenga sesiones; entre iguales, la más antigua.
           order by n_sesiones desc, creado asc, id asc) as pos
    from clasificadas
)
delete from public.cliente_tareas t
 using ordenadas o
 where t.id = o.id and o.pos > 1;

-- ── 3 · Que no vuelva a pasar ──────────────────────────────────────────────
-- Una tarea del catálogo, una vez por proyecto. Con esto, aunque la aplicación
-- se equivoque, la base lo rechaza.
create unique index if not exists cliente_tareas_una_por_catalogo
  on public.cliente_tareas (proyecto_id, catalogo_id)
  where catalogo_id is not null;

-- Y para las que no tienen enlace, por su composición.
create unique index if not exists cliente_tareas_una_por_clave
  on public.cliente_tareas (
    proyecto_id,
    upper(trim(coalesce(norma_id, ''))),
    upper(trim(coalesce(proceso, ''))),
    upper(trim(coalesce(subproceso, ''))))
  where catalogo_id is null;

-- ── 4 · Títulos sin «Integrada» ────────────────────────────────────────────
-- Los títulos viejos llevaban «… - Integrada 9001 14001 27001», de cuando se
-- fusionaban tareas de varias normas. Ya no se integra nada: cada tarea es de
-- una norma. Se rehace el título con el formato actual.
update public.cliente_tareas t
   set titulo = trim(coalesce(nullif(trim(t.subproceso), ''), t.proceso, t.titulo))
              || case when coalesce(t.norma_id, '') <> '' then ' · ' || t.norma_id else '' end
 where t.titulo ilike '%integrada%';

-- Y se retira la marca, que ya no significa nada.
update public.cliente_tareas
   set integrada = false,
       normas_integradas = case when norma_id is not null then array[norma_id] else '{}' end
 where integrada is true;

notify pgrst, 'reload schema';

select 'v113 aplicada' as ok,
       count(*)                                          as tareas,
       count(*) filter (where catalogo_id is not null)   as enlazadas,
       count(*) filter (where titulo ilike '%integrada%') as con_integrada
  from public.cliente_tareas;
