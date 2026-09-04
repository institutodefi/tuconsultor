-- ═══════════════════════════════════════════════════════════════════════════
-- v97 · MÓVIL EN CONTACTOS
--
-- `contactos` solo tenía `telefono`. Sin embargo, varias pantallas ya leían
-- `contacto.movil`:
--   · portal/cliente/MisDatosCliente.jsx lo pide y lo intenta guardar
--   · portal/cliente/SinProyectos.jsx lo muestra
--   · el listado de Contactos hacía `c.movil || c.telefono`
--
-- Es decir: el cliente podía escribir su móvil en su ficha y ese dato se perdía
-- al guardar, porque la columna no existía. Y el móvil es justo el dato que se
-- necesita para avisar de una auditoría con poca antelación.
--
-- Se añade la columna y se rellena con el teléfono cuando este tiene pinta de
-- móvil español (empieza por 6 o 7, nueve dígitos), que es lo que la gente ha
-- estado metiendo en el campo de teléfono a falta de otro sitio.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.contactos
  add column if not exists movil text;

comment on column public.contactos.movil is
  'Móvil de la persona. Separado de `telefono`, que suele ser el fijo de la empresa.';

-- Relleno prudente: solo cuando el teléfono guardado es claramente un móvil
-- español. Si no lo es, se deja en blanco antes que inventarse un dato.
update public.contactos
   set movil = telefono
 where movil is null
   and telefono is not null
   and regexp_replace(telefono, '[^0-9]', '', 'g') ~ '^(34)?[67][0-9]{8}$';

create index if not exists contactos_movil_idx on public.contactos (movil)
  where movil is not null;

notify pgrst, 'reload schema';

select 'v97 aplicada' as ok,
       count(*) filter (where movil is not null) as con_movil,
       count(*) as total
  from public.contactos;
