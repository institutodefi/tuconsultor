// ════════════════════════════════════════════════════════════════════════════
// HORAS TEÓRICAS DE UNA TAREA DE PROYECTO · una sola forma de calcularlas
//
// Salen del catálogo del modelo (`tareas_catalogo.horas_base`), por enlace
// directo (`catalogo_id`) o por coincidencia de norma, modelo y subproceso; si
// no hay catálogo, de `horas`. Y se multiplican por `parte` (v142): una tarea
// dividida entre dos personas son dos filas de media tarea cada una.
//
// Estaba calculado tres veces (proyecto, panel de gestión, cuadro de tareas)
// y ninguna sabía de las partes.
// ════════════════════════════════════════════════════════════════════════════
import { mismoModelo } from './calcEngine.js';

export const parteDe = (t) => { const p = Number(t?.parte); return p > 0 && p <= 1 ? p : 1; };

export function filaCatalogoDe(t, catalogo = [], modeloPorDefecto = null) {
  if (!t) return null;
  return (t.catalogo_id && catalogo.find((x) => String(x.id) === String(t.catalogo_id)))
    || catalogo.find((x) => String(x.norma_id) === String(t.norma_id)
      && mismoModelo(x.modelo, t.modelo || modeloPorDefecto)
      && String(x.subproceso || '') === String(t.subproceso || '')
      && String(x.proceso || '') === String(t.proceso || ''))
    || null;
}

export function horasTeoricasTarea(t, catalogo = [], modeloPorDefecto = null) {
  const c = filaCatalogoDe(t, catalogo, modeloPorDefecto);
  const base = Number(c?.horas_base) || 0;
  if (base > 0) return Math.round(base * parteDe(t) * 100) / 100;
  return Number(t?.horas) || 0;
}

/** «½», «⅓ (2 de 3)»… para la etiqueta de una tarea dividida. */
export function etiquetaParte(t) {
  const p = parteDe(t);
  if (p >= 1) return null;
  return `${Math.round(p * 100)} %`;
}

/**
 * Reparte las horas de una tarea entre varias personas. Devuelve las filas
 * que hay que escribir: la primera es el parche de la original, el resto son
 * inserciones. `repartos` = [{ perfil_id, horas }] con horas > 0 que suman
 * (aprox.) el total.
 */
export function planDivision(t, teoricas, repartos) {
  const total = repartos.reduce((a, r) => a + (Number(r.horas) || 0), 0);
  if (!(total > 0) || repartos.length < 2) return null;
  const base = parteDe(t);
  const codigoBase = String(t.codigo || '').replace(/\.\d+$/, '');
  return repartos.map((r, i) => {
    const frac = (Number(r.horas) || 0) / total;
    return {
      consultor_id: r.perfil_id || null,
      horas: Math.round((Number(r.horas) || 0) * 100) / 100,
      parte: Math.round(base * frac * 10000) / 10000,
      codigo: codigoBase ? `${codigoBase}.${i + 1}` : null,
      esOriginal: i === 0,
    };
  });
}
