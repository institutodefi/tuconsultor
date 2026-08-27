-- ═══════════════════════════════════════════════════════════════════════════
-- v95 · DE QUÉ CONTRATO VIENE CADA PROYECTO
--
-- `proyectos_cliente` no guardaba de dónde salía el proyecto. Sin ese dato no
-- se puede responder a la pregunta que importa: **qué contratos están firmados
-- y todavía no tienen proyecto abierto**, que es trabajo vendido que nadie ha
-- arrancado.
--
-- También se añade `oferta_id`: hay proyectos que arrancan con la oferta
-- aceptada y el contrato aún sin firmar, y conviene poder trazarlos igual.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.proyectos_cliente
  add column if not exists contrato_id uuid references public.contratos(id) on delete set null,
  add column if not exists oferta_id   uuid references public.presupuestos(id) on delete set null;

comment on column public.proyectos_cliente.contrato_id is
  'Contrato del que nace el proyecto. De aquí sale el aviso de contratos firmados sin proyecto.';
comment on column public.proyectos_cliente.oferta_id is
  'Oferta del que nace el proyecto, cuando se arranca antes de firmar el contrato.';

create index if not exists proyectos_cliente_contrato on public.proyectos_cliente (contrato_id);
create index if not exists proyectos_cliente_oferta   on public.proyectos_cliente (oferta_id);

-- ── Relleno de lo ya existente ─────────────────────────────────────────────
-- Se vinculan solo los casos SEGUROS: un cliente con exactamente un contrato
-- firmado y exactamente un proyecto. Con dos de cualquiera de los dos, no hay
-- forma de saber cuál va con cuál, y adivinar dejaría datos falsos que después
-- nadie sabría distinguir de los buenos.
with unicos as (
  select p.id as proyecto_id, c.id as contrato_id
    from public.proyectos_cliente p
    join public.clientes cl on cl.id = p.cliente_id
    join public.contratos c
      on upper(regexp_replace(coalesce(c.cliente_cif, ''), '[\s.-]', '', 'g'))
       = upper(regexp_replace(coalesce(cl.cif, ''), '[\s.-]', '', 'g'))
     and c.estado = 'firmado'
   where p.contrato_id is null
     and coalesce(cl.cif, '') <> ''
   group by p.id, c.id
  having count(*) = 1
)
update public.proyectos_cliente p
   set contrato_id = u.contrato_id
  from unicos u
 where p.id = u.proyecto_id
   and (select count(*) from public.proyectos_cliente x where x.cliente_id = p.cliente_id) = 1;

-- ── Vista: contratos firmados sin proyecto ─────────────────────────────────
-- La misma pregunta desde SQL, para informes o avisos programados, sin
-- reimplementar la regla en cada sitio.
create or replace view public.v_contratos_sin_proyecto as
select c.id, c.numero, c.cliente_empresa, c.cliente_cif, c.modelo, c.normas,
       c.fecha_contrato, c.importe, c.tipo,
       (current_date - c.fecha_contrato) as dias_desde_firma
  from public.contratos c
 where c.estado = 'firmado'
   and not exists (
     select 1 from public.proyectos_cliente p where p.contrato_id = c.id
   );

grant select on public.v_contratos_sin_proyecto to authenticated;

notify pgrst, 'reload schema';

select 'v95 aplicada' as ok;
