// ════════════════════════════════════════════════════════════════════════════
// SESIONES DE UNA TAREA
//
// Una tarea de 8 horas no se hace de una sentada: se parte en sesiones con hora
// de inicio y fin, y sus horas se suman. Lo que se compara es esa suma contra
// las horas TEÓRICAS del modelo, que no se tocan.
//
// Por qué las teóricas no se editan: son las que se ofertaron. Si se pudieran
// cambiar, la desviación se arreglaría moviendo el objetivo, y la comparación
// dejaría de decir nada.
// ════════════════════════════════════════════════════════════════════════════

/** Horas entre dos horas «HH:MM». Devuelve 0 si no son válidas o van al revés. */
export function horasEntre(inicio, fin) {
  const m = (h) => {
    const p = String(h || '').split(':');
    if (p.length < 2) return null;
    const hh = Number(p[0]), mm = Number(p[1]);
    return Number.isFinite(hh) && Number.isFinite(mm) ? hh * 60 + mm : null;
  };
  const a = m(inicio), b = m(fin);
  if (a == null || b == null || b <= a) return 0;
  return Math.round(((b - a) / 60) * 100) / 100;
}

/** Suma de horas de las sesiones que cuentan (todo menos las anuladas). */
export const horasDe = (sesiones = [], soloHechas = false) =>
  Math.round(sesiones
    .filter((s) => s.estado !== 'anulada')
    .filter((s) => !soloHechas || s.estado === 'hecha')
    .reduce((a, s) => a + (Number(s.horas) || horasEntre(s.hora_inicio, s.hora_fin)), 0) * 100) / 100;

/**
 * Cómo va una tarea respecto a lo comprometido.
 *
 * `estado` distingue tres situaciones que conviene no confundir:
 *   sin_planificar  no hay ninguna sesión todavía
 *   corto           se ha planificado menos de lo que dice el modelo
 *   ajustado        coincide, con margen de media hora
 *   pasado          se ha planificado más de lo comprometido
 */
export function balanceTarea(tarea, sesiones = []) {
  const teoricas = Number(tarea?.horas_teoricas) || 0;
  const planificadas = horasDe(sesiones);
  const ejecutadas = horasDe(sesiones, true);
  const dif = Math.round((planificadas - teoricas) * 100) / 100;

  let estado = 'ajustado';
  if (!sesiones.filter((s) => s.estado !== 'anulada').length) estado = 'sin_planificar';
  else if (dif < -0.5) estado = 'corto';
  else if (dif > 0.5) estado = 'pasado';

  return {
    teoricas, planificadas, ejecutadas, dif, estado,
    // Porcentaje de avance sobre lo comprometido, acotado para que una tarea
    // muy desviada no rompa una barra de progreso.
    pct: teoricas ? Math.min(200, Math.round((planificadas / teoricas) * 100)) : null,
    nSesiones: sesiones.filter((s) => s.estado !== 'anulada').length,
  };
}

/**
 * ¿Alguna sesión cae DESPUÉS de la certificación?
 *
 * Es el aviso que más importa: trabajo planificado para después de la auditoría
 * no sirve para llegar a ella. No se impide —a veces se planifica el
 * seguimiento posterior a propósito— pero tiene que verse.
 */
export function sesionesTrasCertificacion(sesiones = [], fechaCertificacion) {
  if (!fechaCertificacion) return [];
  const lim = String(fechaCertificacion).slice(0, 10);
  return sesiones
    .filter((s) => s.estado !== 'anulada')
    .filter((s) => String(s.fecha || '').slice(0, 10) > lim);
}

/** Solapes de un consultor: dos sesiones suyas a la misma hora el mismo día. */
export function solapes(sesiones = [], nueva) {
  const mins = (h) => {
    const p = String(h || '').split(':');
    return Number(p[0]) * 60 + Number(p[1] || 0);
  };
  const a1 = mins(nueva.hora_inicio), a2 = mins(nueva.hora_fin);
  return sesiones
    .filter((s) => s.id !== nueva.id && s.estado !== 'anulada')
    .filter((s) => String(s.consultor_id) === String(nueva.consultor_id))
    .filter((s) => String(s.fecha).slice(0, 10) === String(nueva.fecha).slice(0, 10))
    .filter((s) => mins(s.hora_inicio) < a2 && mins(s.hora_fin) > a1);
}
