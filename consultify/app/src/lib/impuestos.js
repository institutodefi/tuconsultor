// ═══════════════════════════════════════════════════════════════════════════
// Fiscalidad de los presupuestos · fuente única de verdad
// ---------------------------------------------------------------------------
// Regla de negocio: TODO importe que se muestre a un cliente en una oferta,
// calculadora, ficha o documento se expresa SIN IMPUESTOS, acompañado de la
// leyenda "Impuestos indirectos no incluidos."
//
// Por qué no decimos "IVA 21 %" en un presupuesto:
//   · Canarias aplica IGIC, Ceuta y Melilla IPSI. No es IVA.
//   · Cliente intracomunitario con VIES válido → inversión del sujeto pasivo,
//     la factura sale sin repercutir impuesto.
//   · Cliente extracomunitario → operación no sujeta.
//   · El tipo puede cambiar entre la oferta y la factura.
// Anticipar un 21 % en la oferta es incorrecto en todos esos casos y genera
// discrepancias entre lo ofertado y lo facturado. "Impuestos indirectos no
// incluidos" es exacto en todos los escenarios.
//
// El cálculo del impuesto SIGUE EXISTIENDO en lib/facturacion.js: hace falta
// para facturar y para el contrato. Lo que cambia es qué se enseña al cliente
// en un presupuesto.
// ═══════════════════════════════════════════════════════════════════════════

/** Leyenda obligatoria en toda pantalla o documento que emita presupuesto. */
export const LEYENDA_IMPUESTOS = 'Impuestos indirectos no incluidos.';

/** Variante con detalle, para pies de documento donde cabe más texto. */
export const LEYENDA_IMPUESTOS_LARGA =
  'Impuestos indirectos no incluidos. El impuesto aplicable (IVA, IGIC o IPSI) ' +
  'se determina en función del domicilio fiscal del cliente y se repercute en factura. ' +
  'En operaciones intracomunitarias con NIF-IVA válido en VIES se aplica la inversión del sujeto pasivo.';

/** Sufijo corto junto a la cifra grande. */
export const SUFIJO_SIN_IMPUESTOS = 'sin impuestos';

/** Sufijo para importes recurrentes. */
export const sufijoImporte = (tipo) =>
  tipo === 'mes' ? `/mes ${SUFIJO_SIN_IMPUESTOS}` : SUFIJO_SIN_IMPUESTOS;
