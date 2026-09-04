-- ═══════════════════════════════════════════════════════════════════════════
-- v82 · ESTADOS DE LA OFERTA
--
--   borrador → emitida → aceptada → (contrato)
--                     ↘ rechazada
--                     ↘ caducada
--
-- Rechazar puede hacerlo el cliente desde su portal o el equipo desde el CRM.
-- Quién rechazó y por qué se guardan: «rechazada» a secas no sirve para
-- aprender nada, y el motivo es justo lo que se mira al revisar por qué se
-- pierden ofertas.
--
-- Cada cambio queda en un histórico. Una oferta que pasa de aceptada a
-- rechazada sin rastro es una discusión asegurada.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.presupuestos
  add column if not exists estado text not null default 'emitida',
  add column if not exists estado_en timestamptz not null default now(),
  add column if not exists estado_por uuid,
  add column if not exists motivo_rechazo text,
  add column if not exists aceptada_en timestamptz,
  add column if not exists rechazada_en timestamptz,
  add column if not exists valida_hasta date;

alter table public.presupuestos drop constraint if exists presupuestos_estado_check;
alter table public.presupuestos add constraint presupuestos_estado_check
  check (estado in ('borrador','emitida','aceptada','rechazada','caducada'));

comment on column public.presupuestos.estado is
  'borrador · emitida · aceptada · rechazada · caducada. El contrato solo se genera desde aceptada.';
comment on column public.presupuestos.motivo_rechazo is
  'Por qué se rechazó. Sin esto, el histórico no sirve para aprender por qué se pierden ofertas.';

-- Validez: 30 días desde la emisión, como dicen las condiciones.
update public.presupuestos
   set valida_hasta = (creado + interval '30 days')::date
 where valida_hasta is null and creado is not null;

-- ── Histórico de cambios de estado ──
create table if not exists public.presupuesto_estados (
  id             bigserial primary key,
  presupuesto_id uuid not null references public.presupuestos(id) on delete cascade,
  estado_antes   text,
  estado_despues text not null,
  motivo         text,
  -- Quién lo cambió: puede ser el equipo o el propio cliente desde su portal.
  actor          text not null default 'equipo' check (actor in ('equipo','cliente','sistema')),
  actor_id       uuid,
  creado         timestamptz not null default now()
);
create index if not exists presupuesto_estados_pres on public.presupuesto_estados (presupuesto_id, creado desc);

-- El histórico se escribe solo: si dependiera de que la aplicación se acuerde,
-- tarde o temprano habría cambios sin registrar.
create or replace function public.registrar_estado_presupuesto()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'UPDATE' and new.estado is distinct from old.estado then
    insert into public.presupuesto_estados (presupuesto_id, estado_antes, estado_despues, motivo, actor, actor_id)
    values (new.id, old.estado, new.estado, new.motivo_rechazo,
            case when new.estado_por is null then 'sistema' else 'equipo' end, new.estado_por);

    new.estado_en := now();
    if new.estado = 'aceptada'  then new.aceptada_en  := coalesce(new.aceptada_en, now()); end if;
    if new.estado = 'rechazada' then new.rechazada_en := coalesce(new.rechazada_en, now()); end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_estado_presupuesto on public.presupuestos;
create trigger trg_estado_presupuesto
  before update on public.presupuestos
  for each row execute function public.registrar_estado_presupuesto();

-- ── Cambiar el estado, con las reglas puestas ──────────────────────────────
-- Una función y no un update suelto: así las transiciones válidas están en un
-- sitio y no repartidas por la interfaz.
create or replace function public.cambiar_estado_oferta(
  p_id uuid, p_estado text, p_motivo text default null, p_actor text default 'equipo'
) returns jsonb language plpgsql security definer as $$
declare actual text; nuevo text := lower(btrim(p_estado));
begin
  select estado into actual from public.presupuestos where id = p_id;
  if actual is null then
    return jsonb_build_object('ok', false, 'error', 'La oferta no existe.');
  end if;
  if nuevo not in ('borrador','emitida','aceptada','rechazada','caducada') then
    return jsonb_build_object('ok', false, 'error', 'Estado no válido: ' || p_estado);
  end if;

  -- Rechazar exige motivo. No es burocracia: es lo único que permite después
  -- saber por qué se pierden ofertas.
  if nuevo = 'rechazada' and coalesce(btrim(p_motivo), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'Para rechazar hay que decir por qué.');
  end if;

  -- Una oferta aceptada no vuelve atrás sin más: puede haber contrato.
  if actual = 'aceptada' and nuevo in ('emitida','borrador') then
    return jsonb_build_object('ok', false,
      'error', 'Una oferta aceptada no vuelve a emitida. Si hay que rehacerla, emite una nueva.');
  end if;

  update public.presupuestos
     set estado = nuevo,
         motivo_rechazo = case when nuevo = 'rechazada' then p_motivo else motivo_rechazo end,
         estado_por = auth.uid()
   where id = p_id;

  -- El actor real (cliente o equipo) se corrige en el histórico recién escrito.
  update public.presupuesto_estados
     set actor = p_actor
   where presupuesto_id = p_id
     and id = (select max(id) from public.presupuesto_estados where presupuesto_id = p_id);

  return jsonb_build_object('ok', true, 'antes', actual, 'ahora', nuevo);
end $$;

grant execute on function public.cambiar_estado_oferta(uuid, text, text, text) to authenticated;

-- ── Caducar las que pasaron de su validez ──
create or replace function public.caducar_ofertas() returns integer
language plpgsql security definer as $$
declare n int;
begin
  update public.presupuestos
     set estado = 'caducada'
   where estado = 'emitida' and valida_hasta is not null and valida_hasta < current_date;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.caducar_ofertas() to authenticated;

alter table public.presupuesto_estados enable row level security;
drop policy if exists pe_hist_lectura on public.presupuesto_estados;
create policy pe_hist_lectura on public.presupuesto_estados for select to authenticated
  using (coalesce(public.mi_rol(),'') in ('superadmin','admin','director','consultor','gestion')
         or exists (select 1 from public.presupuestos p
                     where p.id = presupuesto_estados.presupuesto_id and p.user_id = auth.uid()));
grant select on public.presupuesto_estados to authenticated;

notify pgrst, 'reload schema';

select 'v82 aplicada' as ok;
