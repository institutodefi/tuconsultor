-- ═══════════════════════════════════════════════════════════════════════════
-- v71 · REGISTRO DE CONSENTIMIENTOS · FASE 1 DE 5
--
-- Procedimiento SPLSSI0201 de Protechplus: «guardar el registro de
-- consentimientos, para así poder consultar dicho registro en caso de que se
-- necesite comprobar que el consentimiento fue dado».
--
-- Esta fase crea SOLO donde vive la prueba. La función que la rellena, la ruta
-- de confirmación y la revocación vienen en las fases 2, 3 y 4.
--
-- Tres decisiones que conviene entender:
--
--  · La IP se guarda porque el procedimiento la exige como metadato del
--    registro. No la conoce el navegador: la pone el servidor en la fase 2.
--  · El token es de un solo uso y caduca. Un enlace de confirmación que sirve
--    para siempre no prueba nada sobre CUÁNDO se confirmó.
--  · La retención es de dos años DESDE LA REVOCACIÓN, no desde el alta. Por eso
--    la fecha de borrado se calcula sobre `revocado_en`, no sobre `creado`.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.consentimientos (
  id            uuid primary key default gen_random_uuid(),

  -- Quién
  email         text not null,
  nombre        text,
  empresa       text,
  telefono      text,

  -- Qué consintió, literal. Si el texto cambia, los consentimientos anteriores
  -- siguen probando lo que se aceptó ENTONCES, no lo que dice la web hoy.
  finalidad     text not null,
  texto_mostrado text not null,
  version_texto text,

  -- Prueba
  token         text not null unique,
  estado        text not null default 'pendiente'
                  check (estado in ('pendiente','confirmado','caducado','revocado')),
  creado        timestamptz not null default now(),
  confirmado_en timestamptz,
  revocado_en   timestamptz,
  expira_en     timestamptz not null default now() + interval '72 hours',

  -- Metadatos del registro (procedimiento SPLSSI0201, punto 4)
  ip_alta       inet,
  ip_confirmacion inet,
  agente        text,
  origen        text not null default 'web'
                  check (origen in ('web','calculadora','newsletter','importacion'))
);

create unique index if not exists consentimientos_token on public.consentimientos (token);
create index if not exists consentimientos_email  on public.consentimientos (lower(email), creado desc);
create index if not exists consentimientos_estado on public.consentimientos (estado, creado desc);

comment on table  public.consentimientos is
  'Registro de consentimientos con doble confirmación. Prueba de que el consentimiento fue dado, cuándo y desde dónde.';
comment on column public.consentimientos.texto_mostrado is
  'El texto EXACTO que se enseñó al aceptar. Sin esto no se puede probar a qué se consintió.';
comment on column public.consentimientos.expira_en is
  'El enlace de confirmación caduca. Uno que no caduca no prueba cuándo se confirmó.';

-- Coherencia: un registro confirmado tiene fecha de confirmación, y uno
-- revocado tiene fecha de revocación. La base no admite estados a medias.
alter table public.consentimientos drop constraint if exists consentimientos_coherente;
alter table public.consentimientos add constraint consentimientos_coherente check (
      (estado <> 'confirmado' or confirmado_en is not null)
  and (estado <> 'revocado'   or revocado_en   is not null)
);

-- ═══ RLS ═══════════════════════════════════════════════════════════════════
-- Nadie escribe aquí desde el navegador: solo la clave de servicio, en la
-- fase 2. Si el propio interesado pudiera escribir su confirmación, el registro
-- no probaría nada.
alter table public.consentimientos enable row level security;

drop policy if exists consentimientos_lectura on public.consentimientos;
create policy consentimientos_lectura on public.consentimientos for select to authenticated
  using (exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo is true
                   and p.rol in ('superadmin','admin','director')));

-- Sin políticas de insert/update/delete para `authenticated`: escribe solo
-- `service_role`, que se salta la RLS por definición.

-- ═══ Retención ═════════════════════════════════════════════════════════════
-- Dos años DESDE LA REVOCACIÓN, como pide el procedimiento. Los pendientes que
-- nunca se confirmaron se limpian antes: un consentimiento sin confirmar no es
-- un consentimiento, es un correo que alguien tecleó.
create or replace function public.limpiar_consentimientos()
returns table (revocados_borrados int, pendientes_borrados int)
language plpgsql security definer as $$
declare a int; b int;
begin
  delete from public.consentimientos
   where estado = 'revocado' and revocado_en < now() - interval '2 years';
  get diagnostics a = row_count;

  delete from public.consentimientos
   where estado = 'pendiente' and creado < now() - interval '90 days';
  get diagnostics b = row_count;

  return query select a, b;
end $$;

revoke all on function public.limpiar_consentimientos() from public, anon, authenticated;
grant execute on function public.limpiar_consentimientos() to service_role;

-- Marca como caducados los pendientes cuyo enlace ya expiró. Se puede llamar
-- desde la ruta de confirmación o desde un cron.
create or replace function public.caducar_consentimientos()
returns integer language plpgsql security definer as $$
declare n int;
begin
  update public.consentimientos set estado = 'caducado'
   where estado = 'pendiente' and expira_en < now();
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.caducar_consentimientos() from public, anon, authenticated;
grant execute on function public.caducar_consentimientos() to service_role;

notify pgrst, 'reload schema';

select 'v71 aplicada · fase 1 de 5' as ok;
