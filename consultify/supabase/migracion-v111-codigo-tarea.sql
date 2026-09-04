-- ═══════════════════════════════════════════════════════════════════════════
-- v111 · CÓDIGO Y NOMBRE PROPIOS DE CADA TAREA, SIN PERDER SU ORIGEN
--
-- Un proyecto como CECE tiene 65 tareas. Para hablar de ellas en una agenda
-- hace falta un código corto —«S1 PE1»— y un nombre que se entienda —«Gestión
-- del contexto»—. Eso lo pone quien planifica, según cómo se organice ese
-- cliente.
--
-- Pero la tarea NO puede perder de dónde viene. Sus horas teóricas salen del
-- catálogo de sistemas de gestión, y esa referencia es la que permite comparar
-- lo ejecutado con lo comprometido. Si al renombrar se rompiera el vínculo, la
-- comparación dejaría de existir justo cuando más se necesita.
--
-- Por eso son campos SEPARADOS:
--
--   codigo, titulo             lo que se ve y se edita
--   norma_id, proceso,         la referencia al catálogo, que no se toca
--   subproceso, catalogo_id
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.cliente_tareas
  add column if not exists codigo       text,
  -- Enlace directo a la fila del catálogo. Hasta ahora se buscaba por norma +
  -- proceso + subproceso, que se rompe si alguien renombra un subproceso.
  add column if not exists catalogo_id  uuid references public.tareas_catalogo(id) on delete set null,
  -- El título original, para poder volver atrás y para saber qué se renombró.
  add column if not exists titulo_origen text;

comment on column public.cliente_tareas.codigo is
  'Código corto para la agenda: «S1 PE1». Lo pone quien planifica.';
comment on column public.cliente_tareas.catalogo_id is
  'Fila del catálogo de la que sale. De ahí vienen las horas teóricas: no se edita.';
comment on column public.cliente_tareas.titulo_origen is
  'Cómo se llamaba en el catálogo. Se guarda al renombrar para no perder la referencia.';

-- Un código no se puede repetir dentro del mismo proyecto: si dos tareas son
-- «S1 PE1», el código deja de servir para lo único que sirve.
create unique index if not exists cliente_tareas_codigo_unico
  on public.cliente_tareas (proyecto_id, upper(trim(codigo)))
  where codigo is not null and trim(codigo) <> '';

create index if not exists cliente_tareas_catalogo on public.cliente_tareas (catalogo_id);

-- ── Enlazar lo que ya existe con su fila del catálogo ──────────────────────
-- Por norma, modelo, proceso y subproceso, comparando sin tildes ni
-- mayúsculas: es como se generaron, así que debería casar casi todo.
update public.cliente_tareas t
   set catalogo_id = c.id
  from public.tareas_catalogo c
 where t.catalogo_id is null
   and c.norma_id = t.norma_id
   and public.clave_modelo(c.modelo) = public.clave_modelo(t.modelo)
   and coalesce(upper(trim(c.proceso)), '')    = coalesce(upper(trim(t.proceso)), '')
   and coalesce(upper(trim(c.subproceso)), '') = coalesce(upper(trim(t.subproceso)), '');

-- ── Un código de partida para las que no lo tienen ─────────────────────────
-- «9001-01», «14001-02»… Corto y dice de qué sistema es. Quien planifique puede
-- cambiarlo por el suyo; esto solo evita que 65 tareas nazcan sin código.
with numeradas as (
  select id,
         norma_id,
         row_number() over (partition by proyecto_id, norma_id
                            order by coalesce(orden, 0), coalesce(num_tarea, 0), creado) as n
    from public.cliente_tareas
   where codigo is null or trim(codigo) = ''
)
update public.cliente_tareas t
   set codigo = nu.norma_id || '-' || lpad(nu.n::text, 2, '0')
  from numeradas nu
 where t.id = nu.id;

notify pgrst, 'reload schema';

select 'v111 aplicada' as ok,
       count(*)                                        as tareas,
       count(*) filter (where catalogo_id is not null) as enlazadas_al_catalogo,
       count(*) filter (where codigo is not null)      as con_codigo
  from public.cliente_tareas;
