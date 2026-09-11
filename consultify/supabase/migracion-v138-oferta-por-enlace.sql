-- ════════════════════════════════════════════════════════════════════════════
-- v138 · ACEPTAR LA OFERTA DESDE EL CORREO
--
-- Cada oferta lleva un enlace personal (token) que va en el correo al cliente:
-- /app/oferta?t=<token>. Quien lo abre ve la propuesta y la acepta o rechaza
-- sin cuenta; si su correo ya tiene cuenta en Órbita, entra directamente al
-- portal. Queda prueba de la aceptación (fecha, IP, navegador).
-- Se puede ejecutar más de una vez.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.presupuestos
  add column if not exists token_acceso uuid default gen_random_uuid(),
  add column if not exists enlace_enviado_en timestamptz,
  add column if not exists aceptada_ip text,
  add column if not exists aceptada_user_agent text,
  add column if not exists decidida_por_enlace boolean not null default false;

update public.presupuestos set token_acceso = gen_random_uuid() where token_acceso is null;

create unique index if not exists presupuestos_token_acceso_idx on public.presupuestos (token_acceso);

comment on column public.presupuestos.token_acceso is 'Clave del enlace personal del cliente (/app/oferta?t=…). Con él ve y decide la oferta sin cuenta.';
comment on column public.presupuestos.enlace_enviado_en is 'Última vez que se envió al cliente el correo con el enlace.';
comment on column public.presupuestos.decidida_por_enlace is 'La aceptación o el rechazo llegaron por el enlace del correo (no desde el portal ni del equipo).';

-- El token no debe salir hacia el cliente por la API con sesión: solo lo usa el
-- servidor (clave de servicio). Las políticas actuales de `presupuestos` dejan
-- al cliente leer sus filas; el token no le da nada que no tenga ya (ve y
-- decide sus propias ofertas), así que no hace falta ocultarlo.

notify pgrst, 'reload schema';

select 'v138 aplicada' as ok;
