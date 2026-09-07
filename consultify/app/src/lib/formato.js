// ════════════════════════════════════════════════════════════════════════════
// FORMATO DE NÚMEROS · punto de miles y coma de decimales
//
// `Intl.NumberFormat('es-ES')` no agrupa los números de cuatro cifras (la regla
// del idioma dice «1325», no «1.325»), así que una cuota de 1325 € salía sin
// punto de miles mientras que 12.000 € sí lo llevaba. En una oferta eso se lee
// como una errata. Aquí se agrupa SIEMPRE: 1.325,00 €.
//
// Sin dependencias de Intl: da lo mismo en el navegador, en Node y en el
// generador de PDF.
// ════════════════════════════════════════════════════════════════════════════

/**
 * Número con punto de miles y coma decimal.
 * @param v       valor
 * @param dec     decimales fijos (2 → «1.325,50»); si es null, hasta 2 sin ceros de relleno
 */
export function numeroES(v, dec = 2) {
  let n = Number(v);
  if (!Number.isFinite(n)) n = 0;
  const fijos = dec == null ? (Math.round(n * 100) / 100 % 1 ? 2 : 0) : dec;
  const p = 10 ** fijos;
  n = Math.round(n * p) / p;   // evita el redondeo binario de toFixed (1.005 → 1.00)
  let [ent, frac = ''] = Math.abs(n).toFixed(fijos).split('.');
  if (dec == null) frac = frac.replace(/0+$/, '');   // sin ceros de relleno: 13,3 y no 13,30
  const entG = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '-' : '') + entG + (frac ? `,${frac}` : '');
}

/** Euros: «1.325,00 €». Con dec = 0, «1.325 €». */
export const eurES = (v, dec = 2) => `${numeroES(v, dec)} €`;

/** Euros sin decimales de relleno: 1.325 → «1.325 €», 1.325,5 → «1.325,50 €». */
export const eurCorto = (v) => eurES(v, null);
