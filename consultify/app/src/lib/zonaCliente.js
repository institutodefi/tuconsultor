// ════════════════════════════════════════════════════════════════════════════
// ZONA CLIENTE DEL PROYECTO · lo que el cliente ve de su proyecto
//
// · `funcionesDe(proyecto)`: qué tiene activado (PM tool con Gantt y tareas,
//   sus datos y documentos, y qué procesos del mapa). Se guarda en
//   proyectos_cliente.funciones (v124) y lo decide el equipo desde la ficha.
// · `filasGantt(...)`: cada tarea con su inicio, su fin y su estado, a partir
//   de las sesiones (lo programado de verdad) o, si no las hay, de la fecha
//   estimada y sus bloques. Es lo que pinta el Gantt y la tabla de tareas.
// · `procesosDe(...)`: las tareas agrupadas por proceso del mapa (PE1, PA4…)
//   con su avance, para activar el mapa proceso a proceso.
//
// Funciones puras: se prueban desde Node (scripts/test-zona-cliente.mjs).
// ════════════════════════════════════════════════════════════════════════════

import { progresoChecklist } from './subtareas.js';

const S = (v) => String(v ?? '');
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const aFecha = (iso) => { if (!iso) return null; const d = new Date(`${S(iso).slice(0, 10)}T12:00:00`); return Number.isNaN(d.getTime()) ? null : d; };
export const aISO = (d) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null);
const sumarDias = (iso, n) => { const d = aFecha(iso); if (!d) return null; d.setDate(d.getDate() + n); return aISO(d); };

export const FUNCIONES_BASE = { pm_tool: false, datos_cliente: true, procesos: [] };

/** Funciones activadas para el cliente, con sus valores por defecto. */
export function funcionesDe(proyecto) {
  let f = proyecto?.funciones;
  if (typeof f === 'string') { try { f = JSON.parse(f); } catch { f = null; } }
  f = f && typeof f === 'object' ? f : {};
  return {
    pm_tool: !!f.pm_tool,
    datos_cliente: f.datos_cliente !== false,
    procesos: Array.isArray(f.procesos) ? f.procesos.map(S) : [],
  };
}

/** Código corto del proceso de una tarea: «PE1», «PA4», «PM»… */
export function codigoProceso(t) {
  const m = S(t?.proceso).toUpperCase().match(/^(P[EAOMC]\d*|PM)\b/);
  if (m) return m[1];
  const b = S(t?.bloque).toUpperCase();
  return b || 'OTROS';
}
export const nombreProceso = (t) => S(t?.proceso).replace(/^(P[EAOMC]\d*|PM)\s*/i, '').trim() || codigoProceso(t);

export const ESTADOS_TAREA = {
  hecha: { etq: 'Hecha', color: '#22C55E' },
  en_curso: { etq: 'En curso', color: '#F5A623' },
  programada: { etq: 'Programada', color: '#4FB3C8' },
  retrasada: { etq: 'Con retraso', color: '#EF4444' },
  pendiente: { etq: 'Pendiente', color: '#5E8494' },
};

/**
 * Una fila por tarea del proyecto, con inicio, fin y estado.
 *
 * Inicio/fin: primera y última sesión no anulada; si no hay sesiones, la
 * fecha estimada (o el primer bloque de ejecución) y una duración de un día
 * por cada 4 h. Sin nada de eso, sin fechas (no se pinta en el Gantt).
 */
export function filasGantt(tareas = [], sesiones = [], proyecto = null, hoy = aISO(new Date())) {
  const pid = S(proyecto?.id);
  const mias = tareas.filter((t) => !pid || S(t.proyecto_id) === pid);
  const porTarea = {};
  for (const s of sesiones) {
    if (S(s.estado) === 'anulada' || !s.cliente_tarea_id) continue;
    (porTarea[S(s.cliente_tarea_id)] = porTarea[S(s.cliente_tarea_id)] || []).push(s);
  }
  return mias.map((t) => {
    const ss = (porTarea[S(t.id)] || []).slice().sort((a, b) => S(a.fecha).localeCompare(S(b.fecha)));
    const fechas = ss.map((s) => S(s.fecha).slice(0, 10));
    let inicio = fechas[0] || null, fin = fechas[fechas.length - 1] || null;
    if (!inicio) {
      const bloque = Array.isArray(t.bloques_ejecucion) && t.bloques_ejecucion[0]?.fecha ? S(t.bloques_ejecucion[0].fecha).slice(0, 10) : null;
      inicio = t.fecha_estimada ? S(t.fecha_estimada).slice(0, 10) : bloque;
      fin = inicio ? sumarDias(inicio, Math.max(0, Math.ceil(num(t.horas) / 4) - 1)) : null;
    }
    const horasHechas = ss.filter((s) => S(s.estado) === 'hecha').reduce((a, s) => a + num(s.horas), 0);
    const horasProg = ss.reduce((a, s) => a + num(s.horas), 0);
    const check = progresoChecklist(t.subtareas);
    let estado;
    if (t.hecha) estado = 'hecha';
    else if (horasHechas > 0 || check.hechas > 0) estado = fin && fin < hoy ? 'retrasada' : 'en_curso';
    else if (fin && fin < hoy) estado = 'retrasada';
    else if (ss.length) estado = 'programada';
    else estado = 'pendiente';
    const pct = t.hecha ? 100 : check.total ? check.pct : num(t.horas) > 0 ? Math.min(100, Math.round((horasHechas / num(t.horas)) * 100)) : 0;
    return {
      id: t.id, codigo: t.codigo || '', titulo: t.titulo || t.subproceso || '', proceso: codigoProceso(t), procesoNombre: nombreProceso(t),
      norma: t.norma_id || null, responsableId: t.consultor_id || (ss.find((s) => s.consultor_id)?.consultor_id) || null,
      inicio, fin, horas: num(t.horas), horasHechas, horasProgramadas: horasProg, sesiones: ss.length,
      estado, pct, checklist: check, definicion: t.definicion || null, subtareas: t.subtareas || [],
    };
  });
}

/** Rango del Gantt: del primer inicio al último fin (o del proyecto), redondeado a meses. */
export function rangoGantt(filas = [], proyecto = null) {
  const fechas = filas.flatMap((f) => [f.inicio, f.fin]).filter(Boolean);
  if (proyecto?.fecha_inicio) fechas.push(S(proyecto.fecha_inicio).slice(0, 10));
  if (proyecto?.fecha_fin) fechas.push(S(proyecto.fecha_fin).slice(0, 10));
  if (proyecto?.fecha_limite) fechas.push(S(proyecto.fecha_limite).slice(0, 10));
  if (!fechas.length) return null;
  const min = aFecha(fechas.reduce((a, b) => (a < b ? a : b))), max = aFecha(fechas.reduce((a, b) => (a > b ? a : b)));
  const desde = new Date(min.getFullYear(), min.getMonth(), 1, 12);
  const hasta = new Date(max.getFullYear(), max.getMonth() + 1, 0, 12);
  const meses = [];
  for (let d = new Date(desde); d <= hasta; d = new Date(d.getFullYear(), d.getMonth() + 1, 1, 12)) {
    meses.push({ clave: aISO(d).slice(0, 7), inicio: aISO(d), dias: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() });
  }
  const totalDias = Math.max(1, Math.round((hasta - desde) / 86400000));
  return { desde: aISO(desde), hasta: aISO(hasta), meses, totalDias };
}

/** Posición (0–1) de una fecha dentro del rango. */
export const posicionEn = (rango, iso) => {
  if (!rango || !iso) return null;
  const d = Math.round((aFecha(iso) - aFecha(rango.desde)) / 86400000);
  return Math.max(0, Math.min(1, d / rango.totalDias));
};

/** Tareas agrupadas por proceso del mapa, con avance. */
export function procesosDe(filas = []) {
  const m = new Map();
  for (const f of filas) {
    const k = f.proceso;
    if (!m.has(k)) m.set(k, { codigo: k, nombre: f.procesoNombre, tareas: [], horas: 0, hechas: 0 });
    const g = m.get(k);
    g.tareas.push(f); g.horas += f.horas; g.hechas += f.estado === 'hecha' ? 1 : 0;
  }
  const orden = (k) => (k.startsWith('PE') ? 0 : k.startsWith('PO') ? 1 : k.startsWith('PA') ? 2 : k === 'PM' ? 3 : 4);
  return [...m.values()].map((g) => ({
    ...g, n: g.tareas.length,
    pct: g.tareas.length ? Math.round(g.tareas.reduce((a, t) => a + t.pct, 0) / g.tareas.length) : 0,
  })).sort((a, b) => orden(a.codigo) - orden(b.codigo) || a.codigo.localeCompare(b.codigo, 'es', { numeric: true }));
}

/** Resumen del proyecto para la cabecera del cliente. */
export function resumenProyecto(filas = []) {
  const n = filas.length;
  const hechas = filas.filter((f) => f.estado === 'hecha').length;
  const retrasadas = filas.filter((f) => f.estado === 'retrasada').length;
  const enCurso = filas.filter((f) => f.estado === 'en_curso').length;
  const horas = filas.reduce((a, f) => a + f.horas, 0);
  const horasHechas = filas.reduce((a, f) => a + f.horasHechas, 0);
  return { n, hechas, retrasadas, enCurso, pendientes: n - hechas, horas, horasHechas, pct: n ? Math.round(filas.reduce((a, f) => a + f.pct, 0) / n) : 0 };
}
