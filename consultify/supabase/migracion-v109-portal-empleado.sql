-- ═══════════════════════════════════════════════════════════════════════════
-- v109 · PORTAL DEL EMPLEADO · DOCUMENTOS Y NÓMINAS
--
-- La pantalla «Equipo» era un listado de solo lectura. Pasa a ser el sitio
-- donde vive la relación laboral de cada persona: sus nóminas, su contrato,
-- sus certificaciones.
--
-- ── Sobre el acceso, que aquí es lo que importa ──
--
-- Una nómina dice cuánto cobra alguien. Es de las cosas más sensibles que va a
-- guardar este sistema, y filtrarla no se arregla pidiendo perdón.
--
--   · Cada persona ve LAS SUYAS. Nadie más de su nivel.
--   · Administración y Superadministración ven todas y las suben.
--   · Dirección de proyecto NO. Lleva equipos, pero la retribución de sus
--     compañeros no es asunto suyo, y meterla en su alcance por comodidad es
--     como se acaban filtrando estas cosas.
--
-- El bucket es privado y las descargas van con enlace firmado y caduco. No se
-- añade política de lectura directa a `storage.objects`, así que nadie descarga
-- adivinando una URL.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.empleado_documentos (
  id           uuid primary key default gen_random_uuid(),
  perfil_id    uuid not null references public.perfiles(id) on delete cascade,
  tipo         text not null default 'nomina'
                 check (tipo in ('nomina','contrato','finiquito','certificado',
                                 'formacion','prl','otro')),
  titulo       text not null,
  -- Periodo al que corresponde. Una nómina es de un mes concreto, y ordenarlas
  -- por fecha de subida las descoloca en cuanto se sube una atrasada.
  periodo      date,
  ruta         text not null,
  nombre_fichero text,
  mime         text,
  tamano       bigint,
  notas        text,
  subido_por   uuid references public.perfiles(id) on delete set null,
  creado       timestamptz not null default now()
);

create index if not exists empleado_documentos_perfil
  on public.empleado_documentos (perfil_id, periodo desc nulls last, creado desc);
create index if not exists empleado_documentos_tipo
  on public.empleado_documentos (tipo);

comment on table public.empleado_documentos is
  'Nóminas, contratos y documentación laboral. Cada persona ve las suyas; Administración, todas.';
comment on column public.empleado_documentos.periodo is
  'Mes al que corresponde el documento. Una nómina de marzo subida en junio sigue siendo de marzo.';

-- ── Quién ve qué ───────────────────────────────────────────────────────────
alter table public.empleado_documentos enable row level security;

drop policy if exists ed_lectura on public.empleado_documentos;
create policy ed_lectura on public.empleado_documentos for select to authenticated
  using (
    perfil_id = auth.uid()                                    -- lo mío
    or coalesce(public.mi_rol(), '') in ('superadmin','admin') -- o Administración
  );

-- Subir, cambiar y borrar: solo Administración. Ni siquiera la persona sube su
-- propia nómina: la emite la empresa, y dejar que cada uno cargue las suyas
-- abriría la puerta a versiones que no coinciden con las emitidas.
drop policy if exists ed_escritura on public.empleado_documentos;
create policy ed_escritura on public.empleado_documentos for all to authenticated
  using (coalesce(public.mi_rol(), '') in ('superadmin','admin'))
  with check (coalesce(public.mi_rol(), '') in ('superadmin','admin'));

grant select on public.empleado_documentos to authenticated;
grant insert, update, delete on public.empleado_documentos to authenticated;

-- ── Depósito privado ───────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('empleados', 'empleados', false)
on conflict (id) do update set public = false;

-- ── El correo de cada persona ──────────────────────────────────────────────
-- En la pantalla de Equipo faltaba el correo de quienes se invitaron y nunca
-- completaron su ficha: `perfiles.email` quedó vacío aunque en `auth.users` sí
-- estaba. Se rellena desde ahí.
update public.perfiles p
   set email = u.email
  from auth.users u
 where u.id = p.id
   and coalesce(p.email, '') = ''
   and coalesce(u.email, '') <> '';

-- Y para que no vuelva a pasar: al crear un perfil, se copia el correo de la
-- cuenta si no viene puesto.
create or replace function public.perfil_hereda_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.email, '') = '' then
    select email into new.email from auth.users where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists trg_perfil_email on public.perfiles;
create trigger trg_perfil_email
  before insert or update on public.perfiles
  for each row execute function public.perfil_hereda_email();

notify pgrst, 'reload schema';

select 'v109 aplicada' as ok,
       count(*) filter (where coalesce(email, '') <> '') as perfiles_con_correo,
       count(*)                                          as perfiles
  from public.perfiles;
