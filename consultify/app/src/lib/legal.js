// ════════════════════════════════════════════════════════════════════════════
// TEXTOS LEGALES DE LA OFERTA · fuente única
//
// Todas las ofertas — la calculadora pública, el generador interno, el PDF y
// el PowerPoint — muestran el mismo aviso. Si hay que matizarlo, se cambia
// aquí y sale corregido en todas partes.
//
// Redacción con perspectiva de género: se evita el masculino genérico
// ("el consultor", "los trabajadores", "el cliente") y se usan fórmulas
// neutras ("el equipo consultor", "las personas trabajadoras", "tu empresa").
// ════════════════════════════════════════════════════════════════════════════

/** Aviso completo, para el PDF, el PPTX y el pie de la oferta. */
export const DISCLAIMER_OFERTA =
  'Oferta orientativa sujeta a validación. El importe calculado en la web es una estimación de partida y no tiene ' +
  'carácter contractual. Queda sujeto a la validación del equipo consultor y al alcance definitivo del sistema de ' +
  'gestión, al número de personas trabajadoras y al número de sedes o centros de trabajo incluidos. No incluye las ' +
  'tasas de la entidad de certificación.';

/** Versión corta, para el panel de precio y las tarjetas. */
export const DISCLAIMER_CORTO =
  'Precio orientativo, sujeto a validación y sin carácter contractual: depende del alcance del sistema, del número ' +
  'de personas trabajadoras y del número de sedes.';

/** Los tres factores que condicionan el precio, para listarlos. */
export const FACTORES_PRECIO = [
  'Alcance definitivo del sistema de gestión (procesos y actividades incluidas).',
  'Número de personas trabajadoras de la organización.',
  'Número de sedes o centros de trabajo dentro del alcance.',
];

/**
 * Prefijo de precio. En la web el precio se presenta SIEMPRE como "desde",
 * porque es una estimación de partida; en el generador interno se muestra el
 * importe cerrado que se va a ofertar.
 */
/**
 * El «desde» va SOLO en la web pública.
 *
 * En la web es un precio de partida: quien lo mira no ha contado sus sedes ni
 * su plantilla, y el importe se ajustará. En el generador interno, no: cuando
 * el equipo emite una oferta ya conoce la organización, y lo que sale de ahí
 * llega al cliente como **precio en firme**. Poner «desde» en un documento que
 * el cliente recibe sería dejar la puerta abierta a subirlo después, que es
 * exactamente lo que no se hace.
 */
export const prefijoPrecio = (publico) => (publico ? 'desde ' : '');

/** Aviso para el precio de UNA norma suelta. Solo para la web pública. */
export const AVISO_NORMA_INDIVIDUAL =
  'Precio de partida por norma. Cada sistema se presupuesta de forma individual según la complejidad '
  + 'del alcance, el número de sedes o centros de trabajo y el número de personas trabajadoras.';

/** Versión de una línea, para tarjetas y tablas donde no cabe el aviso entero. */
export const AVISO_NORMA_CORTO =
  'Desde. Se presupuesta según alcance, sedes y plantilla.';
