-- ═══════════════════════════════════════════════════════════════════════════
-- v83 · DEL OFERTA AL CONTRATO
--
--   oferta emitida → aceptada → CONTRATO
--
-- El contrato NO es la oferta con otro título. Es un documento distinto y con
-- otra función: la oferta propone y caduca a los 30 días; el contrato obliga a
-- las dos partes y dura lo que dure el servicio.
--
-- Por eso el contrato CONGELA lo que se aceptó. Si mañana cambia una tarifa o
-- se edita la oferta, el contrato firmado sigue diciendo lo que se firmó. Sin
-- eso, un contrato es un documento que cambia solo, que no es un contrato.
-- ═══════════════════════════════════════════════════════════════════════════

-- El presupuesto no guardaba la duración: solo vivía dentro del PDF. El
-- contrato la necesita, así que se añade aquí.
alter table public.presupuestos add column if not exists meses integer;

-- La emisora la crea la v81. Se asegura aquí para que esta migración no dependa
-- del orden en que se hayan aplicado.
alter table public.presupuestos add column if not exists emisora_id text;

create table if not exists public.contratos (
  id             uuid primary key default gen_random_uuid(),
  numero         text not null unique,
  presupuesto_id uuid not null references public.presupuestos(id) on delete restrict,

  -- Quién firma, por cada lado
  emisora_id     text,
  cliente_empresa text not null,
  cliente_cif    text,
  cliente_firmante text,
  cliente_cargo  text,
  cliente_email  text,

  -- Lo aceptado, congelado. No son referencias: son los datos.
  objeto         text not null,
  normas         text[] not null default '{}',
  modelo         text not null,
  importe        numeric(12,2) not null,
  tipo           text not null,
  iva            numeric(5,2) not null default 21,
  forma_pago     text,
  meses          integer,
  fases_plan     jsonb,
  condiciones    jsonb,          -- las condiciones tal como estaban al firmar
  notas          text,

  estado         text not null default 'borrador'
                   check (estado in ('borrador','enviado','firmado','anulado')),
  fecha_contrato date not null default current_date,
  firmado_en     timestamptz,
  anulado_en     timestamptz,
  motivo_anulacion text,

  url_pdf        text,
  creado         timestamptz not null default now(),
  creado_por     uuid
);

create index if not exists contratos_presupuesto on public.contratos (presupuesto_id);
create index if not exists contratos_estado on public.contratos (estado, fecha_contrato desc);

-- Una oferta, un contrato vivo. Si hay que rehacerlo, se anula el anterior:
-- dos contratos vigentes sobre la misma oferta es una discusión asegurada.
create unique index if not exists contratos_uno_vivo
  on public.contratos (presupuesto_id) where estado <> 'anulado';

comment on table public.contratos is
  'Contrato derivado de una oferta aceptada. Congela lo aceptado: no cambia aunque cambie la oferta o las tarifas.';

-- ── Numeración correlativa propia ──
-- No reutiliza la de las ofertas: son series distintas y mezclarlas hace que
-- «CON-2026-014» y «OFE-2026-014» parezcan lo mismo sin serlo.
create sequence if not exists public.contratos_seq;

create or replace function public.siguiente_numero_contrato() returns text
language plpgsql security definer as $$
declare n bigint; anio text := to_char(current_date, 'YYYY');
begin
  select nextval('public.contratos_seq') into n;
  return 'CON-' || anio || '-' || lpad(n::text, 4, '0');
end $$;

grant execute on function public.siguiente_numero_contrato() to authenticated;

-- ── Generar el contrato desde la oferta ────────────────────────────────────
create or replace function public.contrato_desde_oferta(p_presupuesto_id uuid)
returns jsonb language plpgsql security definer as $$
declare o record; existe record; nuevo_id uuid; num text;
begin
  select * into o from public.presupuestos where id = p_presupuesto_id;
  if o is null then
    return jsonb_build_object('ok', false, 'error', 'La oferta no existe.');
  end if;

  -- Solo desde aceptada. Un contrato sobre una oferta que el cliente no ha
  -- aceptado es un documento sin causa.
  if o.estado <> 'aceptada' then
    return jsonb_build_object('ok', false,
      'error', format('La oferta está en «%s». Solo se genera contrato desde una oferta aceptada.', o.estado));
  end if;

  select * into existe from public.contratos
   where presupuesto_id = p_presupuesto_id and estado <> 'anulado' limit 1;
  if existe.id is not null then
    return jsonb_build_object('ok', true, 'ya_existia', true,
      'contrato_id', existe.id, 'numero', existe.numero);
  end if;

  num := public.siguiente_numero_contrato();

  insert into public.contratos (
    numero, presupuesto_id, emisora_id,
    cliente_empresa, cliente_cif, cliente_firmante, cliente_cargo, cliente_email,
    objeto, normas, modelo, importe, tipo, forma_pago, meses, fases_plan, notas, creado_por
  ) values (
    num, o.id, coalesce(o.emisora_id, 'trescore'),
    o.empresa, o.cif,
    coalesce(nullif(btrim(coalesce(o.contacto_nombre,'') || ' ' || coalesce(o.contacto_apellidos,'')), ''), o.nombre),
    o.cargo, o.email,
    format('Prestación de servicios de consultoría · %s · modelo %s',
           array_to_string(o.normas, ', '), o.modelo),
    o.normas, o.modelo, o.precio, o.tipo, o.forma_pago, o.meses, o.fases_plan, o.notas_oferta,
    auth.uid()
  ) returning id into nuevo_id;

  return jsonb_build_object('ok', true, 'contrato_id', nuevo_id, 'numero', num);
end $$;

grant execute on function public.contrato_desde_oferta(uuid) to authenticated;

-- ── Anular ──
create or replace function public.anular_contrato(p_id uuid, p_motivo text)
returns jsonb language plpgsql security definer as $$
begin
  if coalesce(btrim(p_motivo), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'Anular un contrato exige decir por qué.');
  end if;
  update public.contratos
     set estado = 'anulado', anulado_en = now(), motivo_anulacion = p_motivo
   where id = p_id and estado <> 'anulado';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'No existe o ya estaba anulado.');
  end if;
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.anular_contrato(uuid, text) to authenticated;

-- ═══ RLS ═══════════════════════════════════════════════════════════════════
alter table public.contratos enable row level security;

drop policy if exists contratos_equipo on public.contratos;
create policy contratos_equipo on public.contratos for all to authenticated
  using (coalesce(public.mi_rol(),'') in ('superadmin','admin','director','gestion'))
  with check (coalesce(public.mi_rol(),'') in ('superadmin','admin','director','gestion'));

-- El cliente ve su contrato, no lo toca.
drop policy if exists contratos_cliente on public.contratos;
create policy contratos_cliente on public.contratos for select to authenticated
  using (exists (select 1 from public.presupuestos p
                  where p.id = contratos.presupuesto_id and p.user_id = auth.uid()));

grant select, insert, update on public.contratos to authenticated;

notify pgrst, 'reload schema';

select 'v83 aplicada' as ok;
