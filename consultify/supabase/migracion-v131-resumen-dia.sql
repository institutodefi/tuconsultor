-- =============================================================================
-- MIGRACIÓN v131 · Resumen del día por IA (uno por persona y día)
--
-- Al entrar en Órbita, la pantalla de inicio pide a la IA un resumen de lo que
-- hay que hacer hoy, esta semana y lo que se arrastra, con las subtareas por
-- cerrar. Se genera UNA vez al día por persona y se guarda aquí; el resto de
-- entradas del día lo leen. «Regenerar» lo vuelve a pedir.
--
-- Después de v130. Idempotente.
-- =============================================================================
begin;

create table if not exists public.resumenes_dia (
  id         uuid primary key default gen_random_uuid(),
  perfil_id  uuid not null,
  fecha      date not null default current_date,
  texto      text not null,
  datos      jsonb,                       -- los totales con los que se escribió
  modelo     text,
  creado     timestamptz not null default now(),
  unique (perfil_id, fecha)
);
create index if not exists resumenes_dia_perfil_idx on public.resumenes_dia (perfil_id, fecha desc);

alter table public.resumenes_dia enable row level security;
drop policy if exists rd_propio on public.resumenes_dia;
create policy rd_propio on public.resumenes_dia for select using (perfil_id = auth.uid());
-- La escritura la hace la función de Netlify con la clave de servicio.

comment on table public.resumenes_dia is 'Resumen diario del trabajo de cada persona, escrito por la IA al entrar (uno por día).';

commit;
