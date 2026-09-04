-- ═══════════════════════════════════════════════════════════════════════════
-- v67 · ALTA AUTOMÁTICA DE EMPRESA Y CONTACTO AL PEDIR OFERTA
--
-- Cuando alguien pide una oferta desde la web, la empresa y su contacto se dan
-- de alta solos si no existían. Dos columnas nuevas para que eso no se
-- confunda con un alta hecha a mano:
--
--   origen   → de dónde salió la ficha
--   revisado → si alguien del equipo la ha mirado
--
-- El alta automática entra con `revisado = false`. No es desconfianza: los datos
-- los teclea el cliente y suelen venir con la razón social a medias, sin
-- dirección y con el CIF sin comprobar. Marcarlas permite trabajarlas sin
-- ensuciar el CRM ni tener que adivinar cuáles vienen de fuera.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.empresas
  add column if not exists origen text not null default 'manual'
    check (origen in ('manual','calculadora','holded','importacion')),
  add column if not exists revisado boolean not null default true;

alter table public.contactos
  add column if not exists origen text not null default 'manual'
    check (origen in ('manual','calculadora','holded','importacion','web')),
  add column if not exists revisado boolean not null default true;

comment on column public.empresas.origen is
  'De dónde salió la ficha. calculadora = alta automática al pedir una oferta desde la web.';
comment on column public.empresas.revisado is
  'false = alta automática pendiente de que alguien del equipo la valide.';

-- Lo ya existente es manual y está revisado: solo lo nuevo entra sin revisar.
update public.empresas  set origen = 'manual', revisado = true where origen is null;
update public.contactos set origen = 'manual', revisado = true where origen is null;

create index if not exists empresas_pendientes_idx  on public.empresas (revisado) where revisado is false;
create index if not exists contactos_pendientes_idx on public.contactos (revisado) where revisado is false;

-- El presupuesto queda enganchado a la empresa que lo originó.
alter table public.presupuestos
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null,
  add column if not exists contacto_id uuid references public.contactos(id) on delete set null;

create index if not exists presupuestos_empresa_idx on public.presupuestos (empresa_id);

-- ═══ Alta idempotente, en una sola llamada ═════════════════════════════════
-- Se hace en SQL y no en la función serverless por una razón: entre buscar y
-- crear puede colarse otra petición con el mismo CIF. Aquí va en una
-- transacción con `on conflict`, así que dos peticiones simultáneas de la misma
-- empresa no crean dos fichas.
create or replace function public.alta_desde_oferta(
  p_cif text, p_empresa text, p_email text default null,
  p_contacto text default null, p_telefono text default null
) returns jsonb
language plpgsql security definer as $$
declare
  v_cif text := upper(regexp_replace(coalesce(p_cif, ''), '[^A-Za-z0-9]', '', 'g'));
  v_empresa_id uuid;
  v_contacto_id uuid;
  v_empresa_nueva boolean := false;
  v_contacto_nuevo boolean := false;
begin
  if v_cif = '' then
    return jsonb_build_object('ok', false, 'error', 'Sin CIF no se da de alta nada.');
  end if;

  -- ── Empresa ──
  select id into v_empresa_id from public.empresas where upper(cif) = v_cif limit 1;
  if v_empresa_id is null then
    -- Se captura la violación de unicidad en vez de usar `on conflict`: los
    -- índices de CIF y correo son funcionales (upper/lower), y `on conflict`
    -- exige nombrar la expresión exacta. Así funciona sea cual sea el índice.
    begin
      insert into public.empresas (cif, nombre, email, telefono, estado_comercial, es_cliente, origen, revisado)
      values (v_cif, coalesce(nullif(btrim(p_empresa), ''), v_cif), p_email, p_telefono,
              'potencial', false, 'calculadora', false)
      returning id into v_empresa_id;
      v_empresa_nueva := true;
    exception when unique_violation then
      -- Otra petición con el mismo CIF ganó la carrera: nos quedamos con la suya.
      select id into v_empresa_id from public.empresas where upper(cif) = v_cif limit 1;
    end;
  end if;

  -- ── Contacto ──
  if coalesce(btrim(p_email), '') <> '' then
    select id into v_contacto_id from public.contactos where lower(email) = lower(btrim(p_email)) limit 1;
    if v_contacto_id is null then
      begin
        insert into public.contactos (nombre, email, telefono, origen, revisado)
        values (coalesce(nullif(btrim(p_contacto), ''), split_part(p_email, '@', 1)),
                lower(btrim(p_email)), p_telefono, 'calculadora', false)
        returning id into v_contacto_id;
        v_contacto_nuevo := true;
      exception when unique_violation then
        select id into v_contacto_id from public.contactos where lower(email) = lower(btrim(p_email)) limit 1;
      end;
    end if;

    -- Vínculo. El primero que llega es el contacto directivo principal.
    insert into public.empresa_contactos (empresa_id, contacto_id, rol, principal)
    values (v_empresa_id, v_contacto_id, 'directivo',
            not exists (select 1 from public.empresa_contactos where empresa_id = v_empresa_id and principal))
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'empresa_id', v_empresa_id, 'empresa_nueva', v_empresa_nueva,
    'contacto_id', v_contacto_id, 'contacto_nuevo', v_contacto_nuevo
  );
end $$;

revoke all on function public.alta_desde_oferta(text, text, text, text, text) from public, anon;
grant execute on function public.alta_desde_oferta(text, text, text, text, text) to service_role;

notify pgrst, 'reload schema';

select 'v67 aplicada' as ok;
