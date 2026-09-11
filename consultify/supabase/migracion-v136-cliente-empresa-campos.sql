-- =============================================================================
-- MIGRACIÓN v136 · Los datos de empresa del portal de cliente coinciden con el CRM
--
-- El administrador de la cuenta edita desde su portal los mismos campos que el
-- CRM guarda en `empresas`: se añaden a `clientes` el móvil, el identificador
-- VAT y el logo, y `cliente_guardar_empresa` los propaga a la empresa del CRM
-- como ya hacía con el resto (v127).
--
-- Después de v135. Idempotente.
-- =============================================================================
begin;

alter table public.clientes add column if not exists movil    text;
alter table public.clientes add column if not exists vat_id   text;
alter table public.clientes add column if not exists logo_url text;

create or replace function public.cliente_guardar_empresa(cid uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare eid uuid;
begin
  if not (public.es_equipo() or public.soy_admin_cuenta(cid)) then
    raise exception 'Solo el administrador de la cuenta puede cambiar los datos de la empresa.';
  end if;
  update public.clientes set
    empresa          = coalesce(nullif(btrim(p ->> 'empresa'), ''), empresa),
    nombre_comercial = case when p ? 'nombre_comercial' then nullif(btrim(p ->> 'nombre_comercial'), '') else nombre_comercial end,
    cif              = case when p ? 'cif' then nullif(btrim(p ->> 'cif'), '') else cif end,
    actividad        = case when p ? 'actividad' then nullif(btrim(p ->> 'actividad'), '') else actividad end,
    sector           = case when p ? 'sector' then nullif(btrim(p ->> 'sector'), '') else sector end,
    empleados        = case when p ? 'empleados' then nullif(p ->> 'empleados', '')::int else empleados end,
    representante    = case when p ? 'representante' then nullif(btrim(p ->> 'representante'), '') else representante end,
    telefono         = case when p ? 'telefono' then nullif(btrim(p ->> 'telefono'), '') else telefono end,
    movil            = case when p ? 'movil' then nullif(btrim(p ->> 'movil'), '') else movil end,
    email            = case when p ? 'email' then nullif(btrim(p ->> 'email'), '') else email end,
    web              = case when p ? 'web' then nullif(btrim(p ->> 'web'), '') else web end,
    vat_id           = case when p ? 'vat_id' then nullif(btrim(p ->> 'vat_id'), '') else vat_id end,
    logo_url         = case when p ? 'logo_url' then nullif(btrim(p ->> 'logo_url'), '') else logo_url end,
    direccion        = case when p ? 'direccion' then nullif(btrim(p ->> 'direccion'), '') else direccion end,
    cp               = case when p ? 'cp' then nullif(btrim(p ->> 'cp'), '') else cp end,
    poblacion        = case when p ? 'poblacion' then nullif(btrim(p ->> 'poblacion'), '') else poblacion end,
    provincia        = case when p ? 'provincia' then nullif(btrim(p ->> 'provincia'), '') else provincia end,
    pais             = case when p ? 'pais' then nullif(btrim(p ->> 'pais'), '') else pais end,
    rgpd_aceptado    = rgpd_aceptado or coalesce((p ->> 'rgpd_aceptado')::boolean, false),
    rgpd_fecha       = coalesce(rgpd_fecha, case when coalesce((p ->> 'rgpd_aceptado')::boolean, false) then now() end),
    rgpd_por         = coalesce(rgpd_por, case when coalesce((p ->> 'rgpd_aceptado')::boolean, false) then public.mi_email() end),
    updated_at       = now()
  where id = cid;

  eid := public.empresa_de_cliente(cid);
  if eid is not null then
    update public.empresas e set
      nombre           = coalesce(nullif(btrim(p ->> 'empresa'), ''), e.nombre),
      nombre_comercial = case when p ? 'nombre_comercial' then nullif(btrim(p ->> 'nombre_comercial'), '') else e.nombre_comercial end,
      cif              = case when p ? 'cif' then coalesce(nullif(btrim(p ->> 'cif'), ''), e.cif) else e.cif end,
      telefono         = case when p ? 'telefono' then nullif(btrim(p ->> 'telefono'), '') else e.telefono end,
      movil            = case when p ? 'movil' then nullif(btrim(p ->> 'movil'), '') else e.movil end,
      email            = case when p ? 'email' then nullif(btrim(p ->> 'email'), '') else e.email end,
      web              = case when p ? 'web' then nullif(btrim(p ->> 'web'), '') else e.web end,
      vat_id           = case when p ? 'vat_id' then nullif(btrim(p ->> 'vat_id'), '') else e.vat_id end,
      logo_url         = case when p ? 'logo_url' then nullif(btrim(p ->> 'logo_url'), '') else e.logo_url end,
      direccion        = case when p ? 'direccion' then nullif(btrim(p ->> 'direccion'), '') else e.direccion end,
      cp               = case when p ? 'cp' then nullif(btrim(p ->> 'cp'), '') else e.cp end,
      poblacion        = case when p ? 'poblacion' then nullif(btrim(p ->> 'poblacion'), '') else e.poblacion end,
      provincia        = case when p ? 'provincia' then nullif(btrim(p ->> 'provincia'), '') else e.provincia end,
      pais             = case when p ? 'pais' then nullif(btrim(p ->> 'pais'), '') else e.pais end,
      updated_at       = now()
    where e.id = eid;
  end if;
  return eid;
end $$;

commit;
