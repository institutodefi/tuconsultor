// ════════════════════════════════════════════════════════════════════════════
// LAS REGLAS COMERCIALES, LEÍDAS DE LA BASE
//
// Tarifas, margen, descuentos y suelos vivían dentro de `calcEngine.js`. Ahora
// están en `reglas_comerciales` y se pueden editar sin desplegar.
//
// Con una condición: si la tabla no responde —migración sin aplicar, sesión
// caída— se usan las constantes del motor. Un sistema que deja de dar precios
// porque una consulta falla es peor que uno que da el precio de ayer.
//
// Se cargan una vez y se guardan en memoria: el motor calcula en cada
// pulsación de tecla y no puede ir a la base cada vez.
// ════════════════════════════════════════════════════════════════════════════

import { listTable } from './data.js';

let cache = null;
let cargando = null;

/** Valores de respaldo: los que tenía el motor escritos a mano. */
export const POR_DEFECTO = {
  tarifa_j1: 30, tarifa_j2: 40, tarifa_j3: 55, tarifa_senior: 75,
  margen: 60, iva: 21,
  dto_pago_unico: 5,
  dto_volumen_2: 5, dto_volumen_3: 10, dto_volumen_4: 15, tope_dto_volumen: 15,
  suelo_por_sistema: 350,
  acompanamiento_auditoria_dia: 600,
  meses_cobrados_adelantado: 11, meses_servicio_adelantado: 12,
  pct_productivo: 70,
};

/** Carga las reglas. Devuelve siempre algo, aunque la consulta falle. */
export async function cargarReglas() {
  if (cache) return cache;
  if (cargando) return cargando;
  cargando = listTable('reglas_comerciales')
    .then((filas) => {
      const m = { ...POR_DEFECTO };
      for (const f of filas || []) {
        const v = Number(f.valor);
        if (Number.isFinite(v)) m[f.clave] = v;
      }
      cache = m;
      return m;
    })
    .catch(() => {
      // Sin tabla o sin permiso: se sigue con los valores del motor.
      cache = { ...POR_DEFECTO };
      return cache;
    })
    .finally(() => { cargando = null; });
  return cargando;
}

/** Lo que hay ahora mismo en memoria. Nunca `null`. */
export const reglas = () => cache || POR_DEFECTO;

/** Tras editar una regla, obliga a releerlas. */
export const olvidarReglas = () => { cache = null; };

/** Un valor suelto, con respaldo. */
export const regla = (clave) => {
  const v = reglas()[clave];
  return Number.isFinite(v) ? v : POR_DEFECTO[clave];
};

/** Las tarifas por nivel, con la forma que espera el motor. */
export const tarifas = () => ({
  J1: regla('tarifa_j1'), J2: regla('tarifa_j2'),
  J3: regla('tarifa_j3'), Senior: regla('tarifa_senior'),
});

/** Descuento por volumen según cuántos sistemas se contraten. */
export function descuentoVolumen(nSistemas) {
  const n = Number(nSistemas) || 0;
  const d = n >= 4 ? regla('dto_volumen_4')
    : n === 3 ? regla('dto_volumen_3')
    : n === 2 ? regla('dto_volumen_2')
    : 0;
  return Math.min(d, regla('tope_dto_volumen'));
}
