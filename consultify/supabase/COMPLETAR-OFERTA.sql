-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETAR UNA OFERTA YA REGISTRADA
--
-- Si el rescate dio «duplicate key ... already exists», la oferta YA ESTÁ
-- guardada: el índice único hizo su trabajo e impidió duplicarla.
--
-- Lo que puede faltarle son datos. Esto los rellena SIN tocar lo que ya tenga
-- valor: cada campo solo se escribe si está vacío.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · Ver cómo está ──
select numero_oferta, empresa, cif, nombre, email, modelo, precio, tipo, creado
  from public.presupuestos
 where numero_oferta = 'OFE-2026-KKW58';


-- ── 2 · Rellenar lo que falte ──
-- Cambia los valores por los del PDF. `coalesce` conserva lo que ya hubiera:
-- así no se pisa un dato bueno con uno de ejemplo.
update public.presupuestos set
  empresa            = coalesce(nullif(empresa,''), 'NOMBRE DE LA EMPRESA'),
  cif                = coalesce(cif, null),
  nombre             = coalesce(nullif(nombre,''), 'Nombre Apellidos'),
  contacto_nombre    = coalesce(contacto_nombre, 'Nombre'),
  contacto_apellidos = coalesce(contacto_apellidos, 'Apellidos'),
  email              = coalesce(email, null),
  telefono           = coalesce(telefono, null),
  cargo              = coalesce(cargo, null),
  modelo             = coalesce(nullif(modelo,''), 'Implantación'),
  precio             = coalesce(nullif(precio, 0), 9875),
  tipo               = coalesce(nullif(tipo,''), 'proyecto'),
  comercial          = coalesce(comercial, 'Alejandro'),
  complejidad        = coalesce(complejidad, 'media'),
  sedes              = coalesce(sedes, 1)
where numero_oferta = 'OFE-2026-KKW58';


-- ── 3 · Comprobar ──
select numero_oferta, empresa, nombre, modelo, precio, tipo
  from public.presupuestos
 where numero_oferta = 'OFE-2026-KKW58';
