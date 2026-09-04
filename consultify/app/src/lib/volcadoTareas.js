// ════════════════════════════════════════════════════════════════════════════
// VOLCAR LAS TAREAS DEL MODELO AL PROYECTO
//
// `tareas_catalogo` tiene, para cada norma y modelo, la lista de tareas que se
// hacen. Es el trabajo acumulado de la casa: qué toca en una ISO 9001 en modelo
// Compromiso, en qué orden y cuántas horas lleva cada cosa.
//
// Hasta ahora había que teclear las tareas una a una en cada contexto. Aquí se
// vuelcan de golpe, respetando la regla que no se toca:
//
//   NUNCA SE MEZCLAN NORMAS. Tres sistemas son tres contextos independientes y
//   tres juegos de tareas. Una tarea de la 14001 no aparece en el contexto de
//   la 9001 aunque se parezcan.
//
// Y no se duplica: volcar dos veces no crea dos copias de la misma tarea.
// ════════════════════════════════════════════════════════════════════════════

/** Normaliza un título para comparar: sin acentos, sin dobles espacios. */
const clave = (s) => String(s || '')
  .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Qué tareas del catálogo faltan en un contexto.
 *
 * @param {object} p
 * @param {object} p.contexto      fila de `proyecto_contextos` (tiene `norma`)
 * @param {string} p.modelo        modelo del proyecto
 * @param {object[]} p.catalogo    `tareas_catalogo`
 * @param {object[]} p.existentes  tareas ya creadas en ese contexto
 */
export function tareasQueFaltan({ contexto, modelo, catalogo = [], existentes = [] }) {
  if (!contexto?.norma || !modelo) return [];
  const yaEstan = new Set(existentes.map((t) => clave(t.titulo)));

  return catalogo
    .filter((c) => String(c.norma_id) === String(contexto.norma))
    .filter((c) => c.modelo === modelo)
    // Las que ya existen con el mismo título no se repiten: quien volvió a
    // pulsar «volcar» quería completar, no duplicar.
    .filter((c) => !yaEstan.has(clave(c.titulo)))
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)
      || String(a.subproceso || '').localeCompare(String(b.subproceso || '')));
}

/** La fila que se insertará en `tareas_programadas` a partir de una del catálogo. */
export function filaDesdeCatalogo(c, contextoId) {
  return {
    contexto_id: contextoId,
    titulo: c.titulo,
    descripcion: c.descripcion || null,
    subproceso: c.subproceso || null,
    // Las horas del catálogo se traen como duración prevista: es la estimación
    // de la casa y evita empezar cada tarea en blanco.
    duracion_min: c.horas_base ? Math.round(Number(c.horas_base) * 60) : null,
    // SIN fecha ni responsable: eso lo decide una persona, no el volcado.
    estado: 'pendiente',
  };
}

/** Resumen de lo que se va a volcar, para poder avisar antes de hacerlo. */
export function resumenVolcado({ contextos = [], modelo, catalogo = [], tareasPorContexto = {} }) {
  const detalle = contextos.map((ctx) => {
    const faltan = tareasQueFaltan({
      contexto: ctx, modelo, catalogo,
      existentes: tareasPorContexto[String(ctx.id)] || [],
    });
    return {
      contexto: ctx,
      norma: ctx.norma,
      n: faltan.length,
      horas: faltan.reduce((a, c) => a + (Number(c.horas_base) || 0), 0),
      tareas: faltan,
    };
  });
  return {
    detalle,
    total: detalle.reduce((a, d) => a + d.n, 0),
    horas: Math.round(detalle.reduce((a, d) => a + d.horas, 0) * 10) / 10,
    // Contextos cuyo modelo no tiene tareas en el catálogo: hay que decirlo, o
    // parece que el volcado no ha hecho nada.
    vacios: detalle.filter((d) => d.n === 0).map((d) => d.norma),
  };
}

/** ¿Se puede dar por hecha? Solo si la fecha ya pasó o es hoy. */
export const puedeDarsePorHecha = (fecha) => {
  if (!fecha) return false;
  const hoy = new Date(); hoy.setHours(23, 59, 59, 999);
  const f = new Date(`${String(fecha).slice(0, 10)}T12:00:00`);
  return !Number.isNaN(f.getTime()) && f <= hoy;
};
