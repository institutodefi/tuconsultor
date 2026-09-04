-- ═══════════════════════════════════════════════════════════════════════════
-- v114 · UNA TAREA POR FILA, CON CÓDIGO Y NOMBRE LIMPIOS
--
-- Sustituye y amplía a la v113 (que no llegó a aplicarse).
--
-- Qué pasaba
-- ──────────
-- El proyecto de CECE (9001 + 14001 + 27001, modelo Relación) mostraba 127
-- tareas cuando el catálogo de ese modelo define 65. Dos causas encadenadas:
--
--  1 · El volcado marca una tarea como «ya está» por su `catalogo_id`, pero
--      nunca lo rellenaba: `tareasDeCliente()` no arrastraba el `id` de la fila
--      del catálogo. Las tareas nacían sin enlace, no se reconocían y volvían a
--      insertarse en cada pasada. (Corregido en la aplicación.)
--
--  2 · Los títulos venían del formato antiguo —«CECE - Relación - PROCESO -
--      SUBPROCESO - Integrada 9001 14001 27001»—, de cuando se fusionaban
--      tareas de varias normas. Ya no se integra nada: cada tarea es de una
--      norma.
--
-- Qué hace este script
-- ────────────────────
--   0 · Copia de seguridad de la tabla, por si acaso.
--   1 · Enlaza cada tarea con su fila del catálogo.
--   2 · Borra las repetidas: se queda la que tenga sesiones programadas y,
--       entre iguales, la más antigua.
--   3 · Reescribe el título: solo el subproceso. Sin cliente, sin modelo,
--       sin «Integrada».
--   4 · Reescribe el código: «CECE-9001-01» → sigla del cliente, norma y
--       correlativo dentro de esa norma.
--   5 · Índices únicos para que no pueda repetirse.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0 · Copia de seguridad ────────────────────────────────────────────────
drop table if exists public.cliente_tareas_backup_v114;
create table public.cliente_tareas_backup_v114 as
  select * from public.cliente_tareas;

-- ── 1 · Enlazar al catálogo ───────────────────────────────────────────────
-- Sin `catalogo_id` no hay forma fiable de saber si dos filas son la misma.
update public.cliente_tareas t
   set catalogo_id = c.id
  from public.tareas_catalogo c
 where t.catalogo_id is null
   and c.norma_id = t.norma_id
   and public.clave_modelo(c.modelo) = public.clave_modelo(t.modelo)
   and coalesce(upper(trim(c.proceso)), '')    = coalesce(upper(trim(t.proceso)), '')
   and coalesce(upper(trim(c.subproceso)), '') = coalesce(upper(trim(t.subproceso)), '');

-- ── 2 · Borrar las repetidas ──────────────────────────────────────────────
-- La clave es SIEMPRE norma + proceso + subproceso, nunca el `catalogo_id`
-- solo: si una copia está enlazada y otra no, comparar por `catalogo_id`
-- las trataría como tareas distintas y no borraría nada. (Ese fue el fallo
-- de la v113.)
with clasificadas as (
  select t.id,
         t.proyecto_id,
         upper(trim(coalesce(t.norma_id, ''))) || '|'
      || upper(trim(coalesce(t.proceso, ''))) || '|'
      || upper(trim(coalesce(t.subproceso, ''))) as clave,
         (select count(*) from public.tarea_sesiones s
           where s.cliente_tarea_id = t.id and s.estado <> 'anulada') as n_sesiones,
         coalesce(t.editada_manual, false) as editada,
         t.creado
    from public.cliente_tareas t
   -- Las reuniones de coordinación se repiten a propósito (una por mes):
   -- no son duplicados.
   where coalesce(t.tipo, '') <> 'coordinacion'
),
ordenadas as (
  select id,
         row_number() over (
           partition by proyecto_id, clave
           -- Primero la que tenga trabajo agendado, luego la editada a mano;
           -- entre iguales, la más antigua.
           order by n_sesiones desc, editada desc, creado asc, id asc) as pos
    from clasificadas
)
delete from public.cliente_tareas t
 using ordenadas o
 where t.id = o.id and o.pos > 1;

-- ── 3 · Título: solo el subproceso ────────────────────────────────────────
-- El cliente, el modelo y la norma ya están en su columna y en el código.
-- Repetirlos en el título solo servía para que no cupiera en la pantalla.
update public.cliente_tareas t
   set titulo        = coalesce(nullif(trim(t.subproceso), ''), nullif(trim(t.proceso), ''), t.titulo),
       titulo_origen = coalesce(t.titulo_origen,
                                nullif(trim(t.subproceso), ''), nullif(trim(t.proceso), ''))
 where t.titulo is distinct from
       coalesce(nullif(trim(t.subproceso), ''), nullif(trim(t.proceso), ''), t.titulo);

-- Y se retira la marca de integrada, que ya no significa nada.
update public.cliente_tareas
   set integrada = false,
       normas_integradas = case when norma_id is not null then array[norma_id] else '{}' end
 where integrada is true or titulo ilike '%integrada%';

-- ── 4 · Código: «CECE-9001-01» ────────────────────────────────────────────
-- La sigla del cliente es la MISMA que usan los códigos de proyecto
-- (`sigla_cliente`, v86): cuatro letras, sin tildes ni forma jurídica.
-- «CECE» → CECE.
with numeradas as (
  select t.id,
         coalesce(nullif(public.sigla_cliente(cl.empresa), ''), 'CLI') as sigla,
         t.norma_id,
         row_number() over (partition by t.proyecto_id, t.norma_id
                            order by coalesce(t.orden, 0), coalesce(t.num_tarea, 0), t.creado) as n
    from public.cliente_tareas t
    left join public.clientes cl on cl.id = t.cliente_id
)
update public.cliente_tareas t
   set codigo = nu.sigla || '-' || coalesce(nu.norma_id, 'GEN') || '-' || lpad(nu.n::text, 2, '0')
  from numeradas nu
 where t.id = nu.id;

-- ── 5 · Que no vuelva a pasar ─────────────────────────────────────────────
-- Una tarea del catálogo, una vez por proyecto. Aunque la aplicación se
-- equivoque, la base lo rechaza.
drop index if exists public.cliente_tareas_una_por_catalogo;
drop index if exists public.cliente_tareas_una_por_clave;

create unique index cliente_tareas_una_por_clave
  on public.cliente_tareas (
    proyecto_id,
    upper(trim(coalesce(norma_id, ''))),
    upper(trim(coalesce(proceso, ''))),
    upper(trim(coalesce(subproceso, ''))))
  where coalesce(tipo, '') <> 'coordinacion';

notify pgrst, 'reload schema';

select 'v114 aplicada' as ok,
       count(*)                                           as tareas,
       count(*) filter (where catalogo_id is not null)    as enlazadas,
       count(*) filter (where titulo ilike '%integrada%') as con_integrada,
       count(*) filter (where codigo is not null)         as con_codigo
  from public.cliente_tareas;
