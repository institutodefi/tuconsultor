-- ═══════════════════════════════════════════════════════════════════════════
-- v77 · NOMBRE Y APELLIDOS POR SEPARADO EN EL PRESUPUESTO
--
-- Todos los formularios piden Nombre y Apellidos por separado, pero al guardar
-- el presupuesto se unían en un solo campo. Al regenerar la oferta o al pasar
-- el contacto al CRM había que volver a partirlos, y partir un nombre por el
-- primer espacio falla con «María del Carmen» o con dos apellidos.
--
-- `nombre` se mantiene con el nombre completo por compatibilidad con lo que ya
-- lo lee; se añaden los dos campos separados al lado.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.presupuestos
  add column if not exists contacto_nombre    text,
  add column if not exists contacto_apellidos text;

comment on column public.presupuestos.nombre is
  'Nombre completo, tal como se compuso. Se conserva por compatibilidad.';
comment on column public.presupuestos.contacto_nombre is
  'Nombre de pila de la persona de contacto, tal como se tecleó.';
comment on column public.presupuestos.contacto_apellidos is
  'Apellidos de la persona de contacto, tal como se teclearon.';

-- Relleno de lo ya emitido: se parte por el PRIMER espacio, que es lo mejor que
-- se puede hacer sin el dato original. No es exacto —«María del Carmen Ruiz»
-- quedará mal— y por eso solo se aplica donde aún no hay nada.
update public.presupuestos
   set contacto_nombre    = split_part(btrim(nombre), ' ', 1),
       contacto_apellidos = nullif(btrim(substr(btrim(nombre), length(split_part(btrim(nombre), ' ', 1)) + 1)), '')
 where contacto_nombre is null and coalesce(btrim(nombre), '') <> '';

do $$
declare n int;
begin
  select count(*) into n from public.presupuestos where contacto_apellidos is not null;
  raise notice 'Contactos con apellidos separados: % (los antiguos, partidos por el primer espacio: revisa los compuestos)', n;
end $$;

notify pgrst, 'reload schema';

select 'v77 aplicada' as ok;
