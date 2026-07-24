-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN v52 · ACCESO ÚNICO A ÓRBITA
-- Reglas:
--   · @tuconsultor.com y @consultify.pro → usuarios INTERNOS (rol consultor
--     por defecto; el superadmin ajusta después el rol fino de cada uno).
--   · Cualquier otro dominio PROFESIONAL → CLIENTE (ve su gestión de proyecto).
--   · Dominios de correo gratuito → registro RECHAZADO.
--   · El consultor asignado a un cliente actúa como administrador de esa cuenta.
--   · El superadmin entra a todo (políticas ya existentes).
-- Idempotente: puede ejecutarse varias veces.
-- ═══════════════════════════════════════════════════════════════

-- 1 · Dominios de correo gratuito (no profesionales) — bloqueados
create table if not exists public.dominios_gratuitos (dominio text primary key);
insert into public.dominios_gratuitos (dominio) values
 ('gmail.com'),('googlemail.com'),('hotmail.com'),('hotmail.es'),('outlook.com'),
 ('outlook.es'),('live.com'),('msn.com'),('yahoo.com'),('yahoo.es'),('icloud.com'),
 ('me.com'),('mac.com'),('protonmail.com'),('proton.me'),('aol.com'),('gmx.com'),
 ('gmx.es'),('mail.com'),('yandex.com'),('zoho.com'),('tutanota.com'),('mail.ru')
on conflict do nothing;

-- 2 · Utilidades de dominio
create or replace function public.tc_dominio(p_email text)
returns text language sql immutable as $fn$
  select lower(split_part(p_email, '@', 2));
$fn$;

create or replace function public.tc_es_interno(p_email text)
returns boolean language sql immutable as $fn$
  select public.tc_dominio(p_email) in ('tuconsultor.com', 'consultify.pro');
$fn$;

create or replace function public.tc_es_gratuito(p_email text)
returns boolean language sql stable as $fn$
  select exists (select 1 from public.dominios_gratuitos d
                 where d.dominio = public.tc_dominio(p_email));
$fn$;

-- 3 · Bloquear registros con correo gratuito (antes de crearse el usuario)
create or replace function public.tc_bloquear_gratuitos()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if public.tc_es_gratuito(new.email) then
    raise exception 'Solo se admiten cuentas de correo profesionales (dominio de empresa).';
  end if;
  return new;
end $fn$;

drop trigger if exists trg_bloquear_gratuitos on auth.users;
create trigger trg_bloquear_gratuitos
  before insert on auth.users
  for each row execute function public.tc_bloquear_gratuitos();

-- 4 · Alta de perfil según dominio (sustituye al handle_new_user genérico)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.perfiles (id, rol, activo, nombre, empresa)
  values (
    new.id,
    case when public.tc_es_interno(new.email) then 'consultor' else 'cliente' end,
    true,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'empresa', initcap(split_part(public.tc_dominio(new.email), '.', 1)))
  )
  on conflict (id) do nothing;
  return new;
end $fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5 · El consultor asignado administra la cuenta de su cliente
--     (los roles admin/superadmin ya administran todo por las políticas existentes)
create or replace function public.tc_gestiona_cliente(p_cliente uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select
    -- superadmin / admin / gestion: acceso pleno
    exists (select 1 from public.perfiles p
            where p.id = auth.uid() and p.activo
              and p.rol in ('superadmin','admin','director','gestion'))
    or
    -- consultor asignado al cliente (directamente o vía proyecto)
    exists (select 1 from public.clientes c
            where c.id = p_cliente
              and (c.consultor_1_id = auth.uid() or c.consultor_2_id = auth.uid()))
    or
    exists (select 1 from public.proyectos pr
            where pr.cliente_id = p_cliente and pr.consultor_id = auth.uid());
$fn$;

-- Política de administración de cuenta para el consultor asignado
drop policy if exists clientes_admin_cuenta on public.clientes;
create policy clientes_admin_cuenta on public.clientes
  for update using (public.tc_gestiona_cliente(id))
  with check (public.tc_gestiona_cliente(id));

-- 6 · Comprobaciones rápidas
select 'interno tuconsultor'  as caso, public.tc_es_interno('ana@tuconsultor.com')  as ok
union all select 'interno consultify', public.tc_es_interno('luis@consultify.pro')
union all select 'cliente profesional', not public.tc_es_interno('cfo@acme.es') and not public.tc_es_gratuito('cfo@acme.es')
union all select 'gratuito bloqueado', public.tc_es_gratuito('pepe@gmail.com');
