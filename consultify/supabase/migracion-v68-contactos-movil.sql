-- ═══════════════════════════════════════════════════════════════════════════
-- v68 · MÓVIL EN CONTACTOS
--
-- `contactos` tenía nombre, apellidos, cargo, email y telefono, pero no móvil.
-- `empresas` sí lo tiene desde la v56, así que era una asimetría sin motivo:
-- el móvil de una persona de contacto es justo el dato que se busca cuando hay
-- que llamar por algo urgente.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.contactos
  add column if not exists movil text;

comment on column public.contactos.telefono is 'Teléfono fijo o centralita.';
comment on column public.contactos.movil is 'Móvil directo de la persona de contacto.';

notify pgrst, 'reload schema';

select 'v68 aplicada' as ok;
