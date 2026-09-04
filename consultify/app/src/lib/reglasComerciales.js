// ════════════════════════════════════════════════════════════════════════════
// LOS PARÁMETROS DE PRECIO, LEÍDOS DE LA BASE
//
// Tarifas, margen, descuentos y suelos vivían dentro de `calcEngine.js`. Ahora
// están en `parametros_precio` y se pueden editar sin desplegar.
//
// No confundir con `reglas_comerciales`, que existe desde la v57 y es otra
// cosa: reglas CONDICIONALES —por modelo, por norma, por canal, con vigencia—
// que se aplican encima del precio ya calculado. Esto son los parámetros base,
// que no dependen de ninguna condición.
//
// Con una condición: si la tabla no responde —migración sin aplicar, sesión
// caída— se usan las constantes del motor. Un sistema que deja de dar precios
// porque una consulta falla es peor que uno que da el precio de ayer.
//
// Se cargan una vez y se guardan en memoria: el motor calcula en cada
// pulsación de tecla y no puede ir a la base cada vez.
// ════════════════════════════════════════════════════════════════════════════

import { listTable } from './data.js';
// El motor guarda los valores de partida y los expone; aquí solo se le empujan
// los de la base. La dirección importa: si fuera al revés, `calcEngine.js`
// arrastraría el cliente de Supabase y dejaría de poder probarse suelto.
import { aplicarParametros, sueloSistema, precioClienteAntiguo } from './calcEngine.js';

let cache = null;
let cargando = null;

/** Valores de respaldo: los que tenía el motor escritos a mano. */
export const POR_DEFECTO = {
  tarifa_j1: 30, tarifa_j2: 40, tarifa_j3: 55, tarifa_senior: 75,
  margen: 60, iva: 21,
  dto_pago_unico: 5,
  dto_volumen_2: 5, dto_volumen_3: 10, dto_volumen_4: 15, tope_dto_volumen: 15,
  suelo_por_sistema: 350,
  // El suelo de la ISO 9001 depende de la complejidad: es la puerta de entrada
  // más habitual y con el suelo general de 350 € se quedaba fuera de precio.
  suelo_9001_baja: 199, suelo_9001_media: 199, suelo_9001_alta: 249,
  // Tarifa heredada que se propone al marcar «cliente antiguo», por sistema.
  precio_antiguo_relacion: 199, precio_antiguo_implicacion: 349, precio_antiguo_compromiso: 549,
  acompanamiento_auditoria_dia: 600,
  meses_cobrados_adelantado: 11, meses_servicio_adelantado: 12,
  pct_productivo: 70,
};

/** Carga las reglas. Devuelve siempre algo, aunque la consulta falle. */
export async function cargarReglas() {
  if (cache) return cache;
  if (cargando) return cargando;
  cargando = listTable('parametros_precio')
    .then((filas) => {
      const m = { ...POR_DEFECTO };
      for (const f of filas || []) {
        const v = Number(f.valor);
        if (Number.isFinite(v)) m[f.clave] = v;
      }
      cache = m;
      // Desde aquí el motor calcula con lo que diga la base.
      aplicarParametros(m);
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


// Se reexportan para que las pantallas no tengan que saber de dónde salen.
export { sueloSistema, precioClienteAntiguo };
