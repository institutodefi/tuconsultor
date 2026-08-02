-- ═══════════════════════════════════════════════════════════════════════════
-- RESCATAR UNA OFERTA QUE SE GENERÓ Y NO SE GUARDÓ
--
-- Causa: el generador mandaba tipo 'fraccionado' en las ofertas de implantación
-- y la tabla no admite ese valor, así que el alta fallaba mientras el PDF y el
-- correo salían igual. Corregido en la v137, pero las anteriores hay que
-- rescatarlas a mano: no dejaron rastro en la base.
--
-- Ejecuta los bloques DE UNO EN UNO, en orden.
-- ═══════════════════════════════════════════════════════════════════════════


-- ── BLOQUE 1 · ¿Está o no está? ────────────────────────────────────────────
select numero_oferta, empresa, precio, creado
  from public.presupuestos
 where numero_oferta = 'OFE-2026-KKW58';

-- Si devuelve una fila, ya está rescatada: no sigas.
-- Si no devuelve nada, pasa al bloque 2.


-- ── BLOQUE 2 · Darla de alta ───────────────────────────────────────────────
-- Cambia los valores por los del PDF. Lo que no sepas, déjalo en null: mejor
-- una oferta registrada a medias que una que no consta.
--
-- No lleva `on conflict` a propósito: si el número ya existiera, es mejor que
-- falle y lo veas, en lugar de que no haga nada en silencio.

insert into public.presupuestos (
  numero_oferta, empresa, cif, nombre, contacto_nombre, contacto_apellidos,
  email, telefono, cargo,
  normas, modelo, precio, tipo, comercial,
  complejidad, sedes, creado
) values (
  'OFE-2026-KKW58',
  'NOMBRE DE LA EMPRESA',      -- ← del PDF
  null,                        -- CIF
  'Nombre Apellidos',          -- contacto completo
  'Nombre', 'Apellidos',       -- por separado
  null,                        -- correo
  null,                        -- teléfono
  null,                        -- cargo
  '{igualdad}',                -- ← normas entre llaves: {9001,14001}
  'Implantación',              -- ← modelo
  9875,                        -- ← importe SIN IVA, del PDF
  'proyecto',                  -- mes · bolsa · proyecto
  'Alejandro',
  'media',                     -- baja · media · alta
  1,                           -- sedes
  '2026-07-31'                 -- ← fecha del PDF
);


-- ── BLOQUE 3 · Comprobar ───────────────────────────────────────────────────
select numero_oferta, empresa, precio, tipo, modelo, creado
  from public.presupuestos
 where numero_oferta = 'OFE-2026-KKW58';


-- ── BLOQUE 4 · Todas las que hay, para comparar con tus correos ────────────
-- Lo que no se guardó no deja rastro en la base. Pero los correos de «Nueva
-- oferta emitida» llevan el número de cada una: compara esa lista con esta.
select numero_oferta, creado::date as fecha, empresa, modelo, precio
  from public.presupuestos
 where numero_oferta is not null
 order by creado desc;


-- ── BLOQUE 5 · Si la emisora ya existe (v81 aplicada) ──────────────────────
-- Deja constancia de qué sociedad la emitió. Si la v81 no está, da error y no
-- pasa nada: sáltalo.
update public.presupuestos
   set emisora_id = 'trescore'
 where numero_oferta = 'OFE-2026-KKW58' and emisora_id is null;
