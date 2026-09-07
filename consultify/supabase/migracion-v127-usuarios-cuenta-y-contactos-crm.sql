-- =============================================================================
-- MIGRACIÓN v127 · Usuarios de la cuenta de cliente (administrador / usuario)
--                 y contactos del portal coordinados con la ficha del CRM
--
-- 1. Un cliente puede tener varias personas con acceso a Órbita:
--      · administrador de cuenta: gestiona los datos de empresa, sedes,
--        certificados, personas de contacto y usuarios.
--      · usuario de cuenta: usa el portal de proyectos (Gantt, tareas,
--        documentos) y sus datos personales; no toca los de la empresa.
--    Se guarda en cliente_usuarios por correo: la persona entra creando su
--    cuenta con ese mismo correo, sin más enlaces. clientes.user_id sigue
--    valiendo (es administrador) para no romper nada.
--
-- 2. Todas las políticas de «es mi cliente» pasan a dos funciones
--    (es_mi_cliente / soy_admin_cuenta) que tienen en cuenta a esos usuarios.
--
-- 3. Las personas de contacto que ve y gestiona el cliente son LAS DE SU
--    FICHA del CRM (empresas ↔ empresa_contactos ↔ contactos), no una lista
--    aparte: mismos datos en el portal y en la ficha. Como la RLS del CRM
--    solo deja escribir al equipo, el cliente escribe a través de funciones
--    (security definer) que comprueban que la empresa es la suya.
--
-- Después de v126. Idempotente.
-- =============================================================================
begin;

-- ── 1 · Usuarios de la cuenta ────────────────────────────────────────────────
create table if not exists public.cliente_usuarios (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid not null references public.clientes(id) on delete cascade,
  email        text not null,
  user_id      uuid,                                    -- se rellena cuando se conoce; no hace falta
  rol_cuenta   text not null default 'usuario' check (rol_cuenta in ('admin', 'usuario')),
  nombre       text,
  invitado_por text,                                    -- correo de quien lo dio de alta
  creado       timestamptz not null default now()
);
create unique index if not exists cliente_usuarios_unico on public.cliente_usuarios (cliente_id, lower(btrim(email)));
create index if not exists cliente_usuarios_email_idx on public.cliente_usuarios (lower(btrim(email)));

-- Quien ya estaba enlazado (clientes.user_id) es administrador de su cuenta.
insert into public.cliente_usuarios (cliente_id, email, user_id, rol_cuenta, invitado_por)
select c.id, lower(btrim(coalesce(p.email, u.email))), c.user_id, 'admin', 'migración v127'
  from public.clientes c
  left join public.perfiles p on p.id = c.user_id
  left join auth.users u on u.id = c.user_id
 where c.user_id is not null and coalesce(p.email, u.email) is not null
on conflict do nothing;

-- ── 2 · Funciones de pertenencia ─────────────────────────────────────────────
create or replace function public.mi_email() returns text
language sql stable as $$ select lower(btrim(coalesce(auth.jwt() ->> 'email', ''))) $$;

-- ¿Este usuario pertenece a la cuenta de ese cliente (admin o usuario)?
create or replace function public.es_mi_cliente(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.clientes c where c.id = cid and c.user_id = auth.uid())
      or exists (select 1 from public.cliente_usuarios cu
                  where cu.cliente_id = cid
                    and (cu.user_id = auth.uid() or (public.mi_email() <> '' and lower(btrim(cu.email)) = public.mi_email())));
$$;

-- ¿Es administrador de la cuenta? (el enlazado por user_id lo es, salvo que
-- se le haya puesto expresamente como «usuario»)
create or replace function public.soy_admin_cuenta(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cliente_usuarios cu
                  where cu.cliente_id = cid and cu.rol_cuenta = 'admin'
                    and (cu.user_id = auth.uid() or (public.mi_email() <> '' and lower(btrim(cu.email)) = public.mi_email())))
      or (exists (select 1 from public.clientes c where c.id = cid and c.user_id = auth.uid())
          and not exists (select 1 from public.cliente_usuarios cu
                           where cu.cliente_id = cid and cu.rol_cuenta = 'usuario'
                             and (cu.user_id = auth.uid() or (public.mi_email() <> '' and lower(btrim(cu.email)) = public.mi_email()))));
$$;

grant execute on function public.mi_email(), public.es_mi_cliente(uuid), public.soy_admin_cuenta(uuid) to authenticated;

alter table public.cliente_usuarios enable row level security;
drop policy if exists cu_equipo on public.cliente_usuarios;
create policy cu_equipo on public.cliente_usuarios for all using (public.es_equipo()) with check (public.es_equipo());
drop policy if exists cu_lee_su_cuenta on public.cliente_usuarios;
create policy cu_lee_su_cuenta on public.cliente_usuarios for select using (public.es_mi_cliente(cliente_id));
drop policy if exists cu_admin_gestiona on public.cliente_usuarios;
create policy cu_admin_gestiona on public.cliente_usuarios for all
  using (public.soy_admin_cuenta(cliente_id)) with check (public.soy_admin_cuenta(cliente_id));

-- ── 3 · Políticas de cliente, con usuarios de cuenta ─────────────────────────
-- Lectura: cualquier miembro de la cuenta. Escritura: administrador.
drop policy if exists clientes_self_read on public.clientes;
create policy clientes_self_read on public.clientes for select using (user_id = auth.uid() or public.es_mi_cliente(id));
drop policy if exists clientes_self_update on public.clientes;
create policy clientes_self_update on public.clientes for update
  using (public.soy_admin_cuenta(id)) with check (public.soy_admin_cuenta(id));

drop policy if exists cs_cliente on public.cliente_sedes;
create policy cs_cliente on public.cliente_sedes for all
  using (public.soy_admin_cuenta(cliente_id)) with check (public.soy_admin_cuenta(cliente_id));
drop policy if exists cs_cliente_lee on public.cliente_sedes;
create policy cs_cliente_lee on public.cliente_sedes for select using (public.es_mi_cliente(cliente_id));

drop policy if exists cc_cliente_escribe on public.cliente_certificados;
create policy cc_cliente_escribe on public.cliente_certificados for all
  using (public.soy_admin_cuenta(cliente_id)) with check (public.soy_admin_cuenta(cliente_id));
drop policy if exists cc_lectura on public.cliente_certificados;
create policy cc_lectura on public.cliente_certificados for select
  using (public.es_equipo() or public.es_mi_cliente(cliente_id));

drop policy if exists cliente_escribe_sus_contactos on public.cliente_contactos;
create policy cliente_escribe_sus_contactos on public.cliente_contactos for all
  using (public.soy_admin_cuenta(cliente_id)) with check (public.soy_admin_cuenta(cliente_id));
drop policy if exists cliente_lee_sus_contactos on public.cliente_contactos;
create policy cliente_lee_sus_contactos on public.cliente_contactos for select using (public.es_mi_cliente(cliente_id));

drop policy if exists cd_lectura on public.cliente_documentos;
create policy cd_lectura on public.cliente_documentos for select
  using (public.es_equipo() or public.es_mi_cliente(cliente_id));
drop policy if exists cd_alta on public.cliente_documentos;
create policy cd_alta on public.cliente_documentos for insert
  with check (public.es_equipo() or public.es_mi_cliente(cliente_id));

drop policy if exists cliente_lee_sus_empresas on public.cliente_empresas;
create policy cliente_lee_sus_empresas on public.cliente_empresas for select using (public.es_mi_cliente(cliente_id));
drop policy if exists cliente_lee_sus_tareas on public.cliente_tareas;
create policy cliente_lee_sus_tareas on public.cliente_tareas for select using (public.es_mi_cliente(cliente_id));
drop policy if exists cliente_lee_sus_proyectos on public.proyectos_cliente;
create policy cliente_lee_sus_proyectos on public.proyectos_cliente for select using (public.es_mi_cliente(cliente_id));
drop policy if exists proyectos_cliente_read on public.proyectos;
create policy proyectos_cliente_read on public.proyectos for select using (public.es_mi_cliente(cliente_id));
drop policy if exists cliente_lee_sus_centros on public.empresa_centros;
create policy cliente_lee_sus_centros on public.empresa_centros for select
  using (exists (select 1 from public.cliente_empresas e where e.id = empresa_centros.empresa_id and public.es_mi_cliente(e.cliente_id)));
drop policy if exists cliente_lee_sus_normas on public.empresa_normas;
create policy cliente_lee_sus_normas on public.empresa_normas for select
  using (exists (select 1 from public.cliente_empresas e where e.id = empresa_normas.empresa_id and public.es_mi_cliente(e.cliente_id)));
drop policy if exists cliente_lee_equipo_de_sus_proyectos on public.proyecto_equipo;
create policy cliente_lee_equipo_de_sus_proyectos on public.proyecto_equipo for select
  using (exists (select 1 from public.proyectos_cliente pc where pc.id = proyecto_equipo.proyecto_id and public.es_mi_cliente(pc.cliente_id)));
drop policy if exists cliente_lee_sesiones_de_sus_tareas on public.tarea_sesiones;
create policy cliente_lee_sesiones_de_sus_tareas on public.tarea_sesiones for select
  using (exists (select 1 from public.cliente_tareas ct where ct.id = tarea_sesiones.cliente_tarea_id and public.es_mi_cliente(ct.cliente_id)));

create or replace view public.equipo_visible_proyecto with (security_invoker = false) as
  select pe.proyecto_id, pe.perfil_id, pe.papel, p.nombre, p.apellidos, p.nivel
    from public.proyecto_equipo pe
    join public.perfiles p on p.id = pe.perfil_id
   where public.es_equipo()
      or exists (select 1 from public.proyectos_cliente pc where pc.id = pe.proyecto_id and public.es_mi_cliente(pc.cliente_id));
grant select on public.equipo_visible_proyecto to authenticated;

-- ── 4 · Contactos y datos de empresa coordinados con la ficha del CRM ────────
-- La empresa del CRM que corresponde a una ficha de cliente: por traza
-- (cliente_id_old) o por CIF.
create or replace function public.empresa_de_cliente(cid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select e.id
    from public.empresas e, public.clientes c
   where c.id = cid
     and (e.cliente_id_old = c.id
          or (coalesce(c.cif, '') <> ''
              and regexp_replace(upper(coalesce(e.cif, '')), '[^A-Z0-9]', '', 'g') = regexp_replace(upper(c.cif), '[^A-Z0-9]', '', 'g')))
   order by (e.cliente_id_old = c.id) desc nulls last, e.es_cliente desc, e.creado
   limit 1;
$$;

-- Guardar un contacto de la ficha desde el portal (administrador de cuenta o equipo).
-- p: {id?, nombre, apellidos, cargo, email, telefono, movil, principal, notas, rgpd_aceptado, rol?}
create or replace function public.cliente_guardar_contacto(cid uuid, p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  eid uuid; con_id uuid; v_email text; v_rol text;
begin
  if not (public.es_equipo() or public.soy_admin_cuenta(cid)) then
    raise exception 'Solo el administrador de la cuenta puede gestionar las personas de contacto.';
  end if;
  eid := public.empresa_de_cliente(cid);
  if eid is null then
    -- Sin empresa en el CRM todavía: se crea desde la ficha de cliente.
    insert into public.empresas (nombre, cif, es_cliente, cliente_id_old, origen)
    select c.empresa, c.cif, true, c.id, 'portal' from public.clientes c where c.id = cid
    returning id into eid;
  end if;
  v_email := nullif(lower(btrim(coalesce(p ->> 'email', ''))), '');
  v_rol := coalesce(nullif(p ->> 'rol', ''), 'proyecto');
  con_id := nullif(p ->> 'id', '')::uuid;

  if con_id is not null then
    -- Solo puede tocar contactos enlazados a SU empresa.
    if not exists (select 1 from public.empresa_contactos ec where ec.empresa_id = eid and ec.contacto_id = con_id) then
      raise exception 'Ese contacto no es de tu empresa.';
    end if;
  elsif v_email is not null then
    -- Mismo correo ya en el CRM: se reutiliza en vez de duplicar.
    select id into con_id from public.contactos where lower(btrim(coalesce(email, ''))) = v_email order by creado limit 1;
  end if;

  if con_id is null then
    insert into public.contactos (nombre, apellidos, cargo, email, telefono, movil, notas, origen, revisado, rgpd_aceptado, rgpd_fecha)
    values (btrim(coalesce(p ->> 'nombre', '')), nullif(btrim(coalesce(p ->> 'apellidos', '')), ''), nullif(btrim(coalesce(p ->> 'cargo', '')), ''),
            v_email, nullif(btrim(coalesce(p ->> 'telefono', '')), ''), nullif(btrim(coalesce(p ->> 'movil', '')), ''),
            nullif(btrim(coalesce(p ->> 'notas', '')), ''), 'portal', false,
            coalesce((p ->> 'rgpd_aceptado')::boolean, false), case when coalesce((p ->> 'rgpd_aceptado')::boolean, false) then now() end)
    returning id into con_id;
  else
    update public.contactos set
      nombre = btrim(coalesce(p ->> 'nombre', nombre)),
      apellidos = nullif(btrim(coalesce(p ->> 'apellidos', '')), ''),
      cargo = nullif(btrim(coalesce(p ->> 'cargo', '')), ''),
      email = coalesce(v_email, email),
      telefono = nullif(btrim(coalesce(p ->> 'telefono', '')), ''),
      movil = nullif(btrim(coalesce(p ->> 'movil', '')), ''),
      notas = nullif(btrim(coalesce(p ->> 'notas', '')), ''),
      rgpd_aceptado = rgpd_aceptado or coalesce((p ->> 'rgpd_aceptado')::boolean, false),
      rgpd_fecha = coalesce(rgpd_fecha, case when coalesce((p ->> 'rgpd_aceptado')::boolean, false) then now() end),
      updated_at = now()
    where id = con_id;
  end if;

  -- Enlace con la empresa (si no existe con ese rol, se crea).
  if not exists (select 1 from public.empresa_contactos ec where ec.empresa_id = eid and ec.contacto_id = con_id) then
    insert into public.empresa_contactos (empresa_id, contacto_id, cargo, principal, rol)
    values (eid, con_id, nullif(btrim(coalesce(p ->> 'cargo', '')), ''), coalesce((p ->> 'principal')::boolean, false), v_rol);
  else
    update public.empresa_contactos set cargo = nullif(btrim(coalesce(p ->> 'cargo', '')), ''), principal = coalesce((p ->> 'principal')::boolean, principal)
     where empresa_id = eid and contacto_id = con_id;
  end if;
  if coalesce((p ->> 'principal')::boolean, false) then
    update public.empresa_contactos set principal = false where empresa_id = eid and contacto_id <> con_id and principal;
  end if;
  return con_id;
end $$;

-- Quitar un contacto de la ficha desde el portal: se quita el enlace con la
-- empresa, no la persona del CRM.
create or replace function public.cliente_quitar_contacto(cid uuid, con_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare eid uuid;
begin
  if not (public.es_equipo() or public.soy_admin_cuenta(cid)) then
    raise exception 'Solo el administrador de la cuenta puede gestionar las personas de contacto.';
  end if;
  eid := public.empresa_de_cliente(cid);
  delete from public.empresa_contactos where empresa_id = eid and contacto_id = con_id;
  return found;
end $$;

-- Guardar los datos de empresa desde el portal: en la ficha de cliente Y en
-- la empresa del CRM (los campos que comparten), para que digan lo mismo.
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
    email            = case when p ? 'email' then nullif(btrim(p ->> 'email'), '') else email end,
    web              = case when p ? 'web' then nullif(btrim(p ->> 'web'), '') else web end,
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
      email            = case when p ? 'email' then nullif(btrim(p ->> 'email'), '') else e.email end,
      web              = case when p ? 'web' then nullif(btrim(p ->> 'web'), '') else e.web end,
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

grant execute on function public.empresa_de_cliente(uuid), public.cliente_guardar_contacto(uuid, jsonb),
  public.cliente_quitar_contacto(uuid, uuid), public.cliente_guardar_empresa(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
