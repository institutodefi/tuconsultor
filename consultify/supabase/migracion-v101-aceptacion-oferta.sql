-- ═══════════════════════════════════════════════════════════════════════════
-- v101 · CUÁNDO Y QUIÉN DIO POR ACEPTADA UNA OFERTA
--
-- El cliente casi nunca acepta pulsando un botón: lo dice por teléfono, por
-- correo o en una reunión. Alguien del equipo lo registra en su nombre.
--
-- Marcar «aceptada» es una afirmación sobre la voluntad de un tercero, y de
-- ella cuelga el contrato y el proyecto. Tiene que quedar constancia de quién
-- la hizo y cuándo: si mañana hay discrepancia sobre si el cliente aceptó,
-- «lo pone en el sistema» no es respuesta si no se sabe quién lo puso.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.presupuestos
  add column if not exists aceptada_en  timestamptz,
  add column if not exists aceptada_por uuid references public.perfiles(id) on delete set null;

comment on column public.presupuestos.aceptada_en is
  'Cuándo se dio por aceptada la oferta. La marca alguien del equipo por indicación del cliente.';
comment on column public.presupuestos.aceptada_por is
  'Quién la dio por aceptada. Es una afirmación sobre la voluntad del cliente: tiene que tener autor.';

-- Relleno de lo ya aceptado: no se sabe la fecha real, así que se usa la de
-- última modificación antes que inventar una. `aceptada_por` se deja vacío:
-- atribuir a alguien una acción que quizá no hizo es peor que no saberlo.
update public.presupuestos
   set aceptada_en = coalesce(updated_at, creado)
 where estado = 'aceptada' and aceptada_en is null;

create index if not exists presupuestos_aceptadas
  on public.presupuestos (aceptada_en desc) where estado = 'aceptada';

notify pgrst, 'reload schema';

select 'v101 aplicada' as ok;
