-- ═══════════════════════════════════════════════════════════════════════════
-- RESCATAR UNA OFERTA QUE SE GENERÓ Y NO SE GUARDÓ
--
-- La red de seguridad de la v134 registra las ofertas desde el servidor, pero
-- solo actúa sobre las que se generan DESPUÉS de desplegarla. Las anteriores
-- —como la OFE-2026-KKW58— tienen su PDF y su correo, pero nunca llegaron a la
-- tabla: no van a aparecer solas.
--
-- Esto las da de alta a mano. Rellena los datos mirando el PDF que tienes.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 · ¿Está o no está? ──
select numero_oferta, empresa, precio, creado
  from public.presupuestos
 where numero_oferta = 'OFE-2026-KKW58';
-- Si no devuelve nada, sigue.

-- ── 2 · Darla de alta ──
-- Cambia los valores por los del PDF. Lo que no sepas, déjalo en null: es mejor
-- una oferta registrada a medias que una que no consta.
insert into public.presupuestos (
  numero_oferta, empresa, cif, nombre, contacto_nombre, contacto_apellidos,
  email, telefono, cargo,
  normas, modelo, precio, tipo, comercial, emisora_id,
  complejidad, sedes, creado
) values (
  'OFE-2026-KKW58',
  'NOMBRE DE LA EMPRESA',      -- ← del PDF
  null,                        -- CIF
  'Nombre Apellidos',          -- contacto, completo
  'Nombre', 'Apellidos',
  null,                        -- correo
  null, null,
  '{igualdad}',                -- ← normas, entre llaves: {9001,14001}
  'Implantación',              -- ← modelo
  9875,                        -- ← importe SIN IVA, del PDF
  'proyecto',                  -- mes · bolsa · proyecto
  'Alejandro',
  'trescore',
  'media', 1,
  '2026-07-31'                 -- ← fecha del PDF
)
on conflict (numero_oferta) do nothing;

-- ── 3 · Comprobar ──
select numero_oferta, empresa, precio, tipo, creado
  from public.presupuestos
 where numero_oferta = 'OFE-2026-KKW58';

-- ── 4 · ¿Hay más ofertas perdidas? ──
-- No se puede saber desde la base: lo que no se guardó no deja rastro. Pero si
-- guardas los correos de «Nueva oferta emitida», ahí está la lista completa de
-- números emitidos. Compárala con esto:
select numero_oferta, creado::date as fecha, empresa
  from public.presupuestos
 where numero_oferta is not null
 order by creado desc;
