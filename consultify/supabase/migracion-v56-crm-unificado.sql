-- =============================================================================
-- CONSULTIFY / ORBITA.PMTOOLS · Migración v56 · CRM UNIFICADO
-- -----------------------------------------------------------------------------
-- Unifica en UNA sola entidad (empresas) lo que antes eran tres pestañas:
--   Empresas · Clientes · Clientes potenciales (leads)
--
-- Cambios:
--   1 · empresas: ficha fiscal completa estilo Holded + empresa matriz +
--       estado comercial (potencial → activo → …) + trazas Holded/Brevo
--   2 · Trigger anti-ciclos en la jerarquía matriz→filial
--   3 · empresa_contactos: rol del contacto (directivo · facturacion ·
--       proyecto · secundario) con unicidad para los tres roles nombrados
--   4 · contactos: email OBLIGATORIO (check NOT VALID: obliga en altas y
--       modificaciones, no rompe el histórico)
--   5 · homologaciones: condiciones de homologación de proveedores (1:N)
--   6 · leads → empresas (estado_comercial='potencial'), idempotente
--   7 · Vista crm_huerfanos: semáforo de empresas sin contacto y contactos
--       sin empresa
--
-- Idempotente: se puede ejecutar varias veces sin efectos secundarios.
-- =============================================================================

begin;

-- ═══ 1 · EMPRESAS · ficha completa ═══════════════════════════════════════════
alter table public.empresas
  add column if not exists nombre_comercial       text,
  add column if not exists email                  text,
  add column if not exists telefono               text,
  add column if not exists movil                  text,
  add column if not exists web                    text,
  add column if not exists poblacion              text,
  add column if not exists cp                     text,
  add column if not exists provincia              text,
  add column if not exists pais                   text default 'España',
  add column if not exists vat_id                 text,
  add column if not exists tags                   text[],
  add column if not exists empresa_matriz_id      uuid references public.empresas(id) on delete set null,
  add column if not exists estado_comercial       text not null default 'potencial',
  add column if not exists origen                 text,
  add column if not exists lead_id_old            bigint,
  add column if not exists asignado_a             uuid references public.perfiles(id) on delete set null,
  add column if not exists holded_sincronizado_en timestamptz,
  add column if not exists holded_datos           jsonb,
  add column if not exists brevo_sincronizado_en  timestamptz;

comment on column public.empresas.empresa_matriz_id is 'Matriz del grupo. Solo aplica a empresas cliente. NULL = es matriz o empresa independiente.';
comment on column public.empresas.estado_comercial is 'potencial (lead) · activo · inactivo · perdido';
comment on column public.empresas.holded_datos is 'Volcado íntegro del contacto de Holded en la última sincronización (auditoría).';

-- Estado comercial: valores cerrados
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'empresas_estado_comercial_chk') then
    alter table public.empresas
      add constraint empresas_estado_comercial_chk
      check (estado_comercial in ('potencial', 'activo', 'inactivo', 'perdido'));
  end if;
end $$;

-- Una empresa no puede ser su propia matriz
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'empresas_matriz_no_self_chk') then
    alter table public.empresas
      add constraint empresas_matriz_no_self_chk
      check (empresa_matriz_id is null or empresa_matriz_id <> id);
  end if;
end $$;

create index if not exists empresas_matriz_idx  on public.empresas (empresa_matriz_id);
create index if not exists empresas_estado_idx  on public.empresas (estado_comercial);
create index if not exists empresas_lead_idx    on public.empresas (lead_id_old);

-- Empresas que ya existían pasan a 'activo': venían de la tabla 'clientes' o
-- estaban dadas de alta a mano como proveedor. 'potencial' se reserva para los
-- leads de la web que entran en el paso 6.
update public.empresas
   set estado_comercial = 'activo'
 where estado_comercial = 'potencial'
   and (cliente_id_old is not null or es_proveedor = true);


-- ═══ 2 · ANTI-CICLOS en la jerarquía del grupo ══════════════════════════════
-- Sin esto, A matriz de B y B matriz de A cuelga el organigrama en un bucle.
create or replace function public.empresas_sin_ciclos()
returns trigger language plpgsql as $$
declare
  cursor_id uuid := new.empresa_matriz_id;
  saltos    int  := 0;
begin
  while cursor_id is not null loop
    if cursor_id = new.id then
      raise exception 'Jerarquía circular: esa empresa ya está por debajo en el grupo.';
    end if;
    saltos := saltos + 1;
    if saltos > 50 then
      raise exception 'Jerarquía demasiado profunda (posible ciclo preexistente).';
    end if;
    select empresa_matriz_id into cursor_id from public.empresas where id = cursor_id;
  end loop;
  return new;
end $$;

drop trigger if exists empresas_sin_ciclos_trg on public.empresas;
create trigger empresas_sin_ciclos_trg
  before insert or update of empresa_matriz_id on public.empresas
  for each row when (new.empresa_matriz_id is not null)
  execute function public.empresas_sin_ciclos();


-- ═══ 3 · ROLES DE CONTACTO en la empresa ════════════════════════════════════
alter table public.empresa_contactos
  add column if not exists rol text not null default 'secundario';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'empresa_contactos_rol_chk') then
    alter table public.empresa_contactos
      add constraint empresa_contactos_rol_chk
      check (rol in ('directivo', 'facturacion', 'proyecto', 'secundario'));
  end if;
end $$;

-- Los tres roles nombrados son únicos por empresa; 'secundario' admite N.
create unique index if not exists empresa_contactos_rol_unico
  on public.empresa_contactos (empresa_id, rol)
  where rol <> 'secundario';

-- Migración suave: el que estaba marcado como 'principal' pasa a 'directivo'.
update public.empresa_contactos ec
   set rol = 'directivo'
 where ec.principal = true
   and ec.rol = 'secundario'
   and not exists (
     select 1 from public.empresa_contactos x
      where x.empresa_id = ec.empresa_id and x.rol = 'directivo'
   );

comment on column public.empresa_contactos.rol is 'directivo (directivo principal) · facturacion · proyecto · secundario (bloque libre)';


-- ═══ 4 · CONTACTOS · el email es obligatorio ════════════════════════════════
-- NOT VALID: obliga en INSERT y en UPDATE de filas nuevas/tocadas, pero no
-- bloquea el histórico que pudiera tener el email vacío. Para endurecerlo del
-- todo cuando esté limpio:  alter table public.contactos validate constraint
-- contactos_email_obligatorio_chk;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'contactos_email_obligatorio_chk') then
    alter table public.contactos
      add constraint contactos_email_obligatorio_chk
      check (email is not null and btrim(email) <> '') not valid;
  end if;
end $$;

-- Un mismo email no debería estar dos veces en el CRM (dedupe para Brevo).
-- Índice único parcial: ignora los NULL del histórico.
create unique index if not exists contactos_email_unico
  on public.contactos (lower(btrim(email)))
  where email is not null and btrim(email) <> '';


-- ═══ 5 · HOMOLOGACIONES DE PROVEEDOR ════════════════════════════════════════
create table if not exists public.homologaciones (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas(id) on delete cascade,
  concepto      text not null,                 -- p. ej. "Certificado ISO 9001"
  requisito     text,                          -- qué se le exige exactamente
  estado        text not null default 'pendiente'
                check (estado in ('pendiente', 'aportado', 'validado', 'caducado', 'no_aplica')),
  obligatorio   boolean not null default true,
  fecha_validez date,                          -- caducidad del documento
  documento_url text,
  notas         text,
  orden         int,
  creado        timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists homologaciones_empresa_idx on public.homologaciones (empresa_id);
create index if not exists homologaciones_estado_idx  on public.homologaciones (estado);

comment on table public.homologaciones is 'Condiciones de homologación exigidas a una empresa proveedora. Se añaden una a una.';


-- ═══ 6 · LEADS → EMPRESAS (estado_comercial = potencial) ════════════════════
-- Cada lead de la web se convierte en una empresa potencial + su contacto.
-- La tabla 'leads' se conserva como bandeja de entrada / auditoría.
-- Idempotente por lead_id_old.
do $$
declare l record; emp_id uuid; con_id uuid; nom text;
begin
  if not exists (select 1 from information_schema.tables
                  where table_schema = 'public' and table_name = 'leads') then
    return;
  end if;

  for l in
    select * from public.leads le
     where not exists (select 1 from public.empresas e where e.lead_id_old = le.id)
     order by le.id
  loop
    nom := coalesce(nullif(btrim(l.empresa), ''), nullif(btrim(l.nombre), ''), l.email);

    -- ¿ya existe una empresa con ese nombre? entonces solo se vincula el contacto
    select id into emp_id from public.empresas
      where lower(btrim(nombre)) = lower(btrim(nom)) limit 1;

    if emp_id is null then
      insert into public.empresas
        (nombre, es_cliente, es_proveedor, estado_comercial, email, telefono,
         origen, lead_id_old, asignado_a, notas, creado)
      values
        (nom, true, false,
         case l.estado when 'ganado' then 'activo' when 'perdido' then 'perdido' else 'potencial' end,
         l.email, l.telefono,
         coalesce(l.origen, 'web'), l.id, l.asignado_a,
         nullif(concat_ws(E'\n',
           nullif(l.mensaje, ''),
           case when l.producto  is not null then 'Producto: '  || l.producto  end,
           case when l.necesidad is not null then 'Necesidad: ' || l.necesidad end,
           case when l.plazo     is not null then 'Plazo: '     || l.plazo     end,
           nullif(l.notas, '')), ''),
         l.creado)
      returning id into emp_id;
    else
      update public.empresas set lead_id_old = l.id where id = emp_id and lead_id_old is null;
    end if;

    -- Contacto del lead (el email es su clave natural)
    select id into con_id from public.contactos
      where lower(btrim(email)) = lower(btrim(l.email)) limit 1;

    if con_id is null then
      insert into public.contactos
        (nombre, email, telefono, consentimiento_marketing, consentimiento_fecha, creado)
      values
        (coalesce(nullif(btrim(l.nombre), ''), nom), l.email, l.telefono,
         coalesce(l.consentimiento_comercial, false),
         case when l.consentimiento_comercial then l.creado end,
         l.creado)
      returning id into con_id;
    end if;

    -- Vínculo con rol de directivo si la empresa aún no tiene uno
    insert into public.empresa_contactos (empresa_id, contacto_id, rol, principal)
    values (emp_id, con_id,
            case when exists (select 1 from public.empresa_contactos
                               where empresa_id = emp_id and rol = 'directivo')
                 then 'secundario' else 'directivo' end,
            not exists (select 1 from public.empresa_contactos where empresa_id = emp_id))
    on conflict (empresa_id, contacto_id) do nothing;
  end loop;
end $$;

commit;


-- ═══ 7 · SEMÁFORO · huérfanos a los dos lados ═══════════════════════════════
-- No se puede forzar por FK (la relación es N:M), así que se expone como vista
-- y la UI la pinta en rojo. Regla de negocio: ni empresa sin contacto, ni
-- contacto sin empresa.
create or replace view public.crm_huerfanos as
  select 'empresa'::text as tipo, e.id, e.nombre as etiqueta,
         'Empresa sin ningún contacto'::text as incidencia
    from public.empresas e
   where not exists (select 1 from public.empresa_contactos ec where ec.empresa_id = e.id)
  union all
  select 'empresa'::text, e.id, e.nombre,
         'Empresa sin contacto de facturación'::text
    from public.empresas e
   where e.es_cliente
     and exists (select 1 from public.empresa_contactos ec where ec.empresa_id = e.id)
     and not exists (select 1 from public.empresa_contactos ec
                      where ec.empresa_id = e.id and ec.rol = 'facturacion')
  union all
  select 'contacto'::text, c.id, btrim(concat_ws(' ', c.nombre, c.apellidos)),
         'Contacto sin empresa'::text
    from public.contactos c
   where not exists (select 1 from public.empresa_contactos ec where ec.contacto_id = c.id)
  union all
  select 'contacto'::text, c.id, btrim(concat_ws(' ', c.nombre, c.apellidos)),
         'Contacto sin email'::text
    from public.contactos c
   where c.email is null or btrim(c.email) = '';


-- ═══ 8 · RLS ════════════════════════════════════════════════════════════════
alter table public.homologaciones enable row level security;

drop policy if exists homologaciones_select on public.homologaciones;
create policy homologaciones_select on public.homologaciones
  for select to authenticated using (true);

drop policy if exists homologaciones_write on public.homologaciones;
create policy homologaciones_write on public.homologaciones
  for all to authenticated
  using (exists (select 1 from public.perfiles p
                  where p.id = auth.uid() and p.activo
                    and p.rol in ('superadmin','admin','director','gestion')))
  with check (exists (select 1 from public.perfiles p
                  where p.id = auth.uid() and p.activo
                    and p.rol in ('superadmin','admin','director','gestion')));

-- La vista hereda las políticas de sus tablas base. security_invoker existe
-- desde PostgreSQL 15; si la instancia fuese anterior, no se aborta el script.
do $$
begin
  execute 'alter view public.crm_huerfanos set (security_invoker = on)';
exception when others then
  raise notice 'security_invoker no disponible en esta versión de PostgreSQL: %', sqlerrm;
end $$;

notify pgrst, 'reload schema';
select pg_notify('pgrst', 'reload schema');


-- ═══ 9 · VERIFICACIÓN ═══════════════════════════════════════════════════════
-- select estado_comercial, es_cliente, es_proveedor, count(*)
--   from public.empresas group by 1,2,3 order by 1;
-- select rol, count(*) from public.empresa_contactos group by 1;
-- select tipo, incidencia, count(*) from public.crm_huerfanos group by 1,2;
select 'v56 · CRM unificado listo' as ok;
