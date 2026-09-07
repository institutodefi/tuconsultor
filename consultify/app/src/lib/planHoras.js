// ════════════════════════════════════════════════════════════════════════════
// HORAS POR PLANIFICAR HASTA LA CERTIFICACIÓN
//
// De cada proyecto vivo: cuántas horas están comprometidas (las tareas), cuántas
// ya se han hecho, cuántas están en agenda y cuántas quedan SIN PLANIFICAR. Y
// lo que importa para el calendario: esas horas sin planificar tienen que
// caber entre hoy y la fecha estimada de certificación, así que se prorratean
// por meses (en proporción a los días de cada mes que quedan) para ver a qué
// ritmo hay que meterlas en la agenda.
//
// Funciones puras: se prueban desde Node (scripts/test-plan-horas.mjs).
// ════════════════════════════════════════════════════════════════════════════

import { horasSugeridasEquipo, equipoDe } from './controlHoras.js';

const S = (v) => String(v ?? '');
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const r1 = (n) => Math.round(n * 10) / 10;
const aFecha = (iso) => {
  if (!iso) return null;
  const d = new Date(`${S(iso).slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};
const clave = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const etiquetaMes = (k) => { const [a, m] = S(k).split('-'); return `${MESES[Number(m) - 1] || m} ${S(a).slice(2)}`; };
const diasEntre = (a, b) => Math.round((b - a) / 86400000);

const ESTADOS_CERRADOS = ['cerrado', 'cancelado', 'finalizado'];
export const proyectoVivo = (p) => !ESTADOS_CERRADOS.includes(S(p?.estado).toLowerCase());

/** Fecha objetivo del proyecto: certificación prevista; si no, límite; si no, fin. */
export function fechaObjetivo(p) {
  const f = p?.fecha_certificacion || p?.fecha_limite || p?.fecha_fin || null;
  return f ? S(f).slice(0, 10) : null;
}

/**
 * Reparte `horas` entre los meses que van de `desde` a `hasta`, en proporción
 * a los días de cada mes dentro del tramo. Si `hasta` ya pasó, todo cae en el
 * mes actual (hay retraso, y se ve).
 */
export function prorratearPorMeses(horas, desde, hasta) {
  const ini = aFecha(desde), fin = aFecha(hasta);
  if (!ini) return [];
  if (!fin || fin <= ini) return [{ mes: clave(ini), etq: etiquetaMes(clave(ini)), dias: 1, horas: r1(horas), retraso: !!fin }];
  const tramos = [];
  let cursor = new Date(ini);
  while (cursor <= fin) {
    const finMes = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 12);
    const corte = finMes < fin ? finMes : fin;
    const dias = Math.max(1, diasEntre(cursor, corte) + 1);
    tramos.push({ mes: clave(cursor), etq: etiquetaMes(clave(cursor)), dias });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12);
  }
  const totalDias = tramos.reduce((a, t) => a + t.dias, 0);
  let acumulado = 0;
  return tramos.map((t, i) => {
    // El último mes se lleva el resto, para que la suma cuadre con el total.
    const h = i === tramos.length - 1 ? r1(horas - acumulado) : r1(horas * (t.dias / totalDias));
    acumulado = r1(acumulado + h);
    return { ...t, horas: h, retraso: false };
  });
}

/**
 * Horas por planificar de UN proyecto hasta su certificación.
 *
 * @param proyecto  fila de proyectos_cliente
 * @param tareas    cliente_tareas del proyecto (o de todos: se filtran)
 * @param sesiones  tarea_sesiones (todas: se filtran por las tareas del proyecto)
 * @param hoy       ISO
 */
export function planHastaCertificacion(proyecto, tareas = [], sesiones = [], hoy, equipo = null, perfiles = []) {
  const pid = S(proyecto?.id);
  const mias = tareas.filter((t) => S(t.proyecto_id) === pid && !['cancelada', 'descartada'].includes(S(t.estado).toLowerCase()));
  const idsTareas = new Set(mias.map((t) => S(t.id)));
  const ses = sesiones.filter((s) => idsTareas.has(S(s.cliente_tarea_id)));

  const comprometidas = mias.reduce((a, t) => a + num(t.horas), 0);
  const ejecutadas = ses.filter((s) => S(s.estado) === 'hecha').reduce((a, s) => a + num(s.horas), 0);
  const programadas = ses.filter((s) => S(s.estado) !== 'hecha' && S(s.estado) !== 'cancelada').reduce((a, s) => a + num(s.horas), 0);
  const sinPlanificar = Math.max(0, comprometidas - ejecutadas - programadas);
  const pendientes = Math.max(0, comprometidas - ejecutadas);

  const objetivo = fechaObjetivo(proyecto);
  const dias = objetivo ? diasEntre(aFecha(hoy), aFecha(objetivo)) : null;
  const meses = objetivo ? prorratearPorMeses(sinPlanificar, hoy, objetivo) : [];
  // Lo ya programado, por mes, para que la vista mensual enseñe lo que hay en
  // agenda junto a lo que falta por meter.
  const programadasPorMes = {};
  for (const s of ses) {
    if (S(s.estado) === 'hecha' || S(s.estado) === 'cancelada') continue;
    const k = S(s.fecha).slice(0, 7);
    programadasPorMes[k] = r1((programadasPorMes[k] || 0) + num(s.horas));
  }
  const nMeses = meses.filter((m) => !m.retraso).length || (dias != null && dias < 0 ? 0 : 1);
  const mesesFrac = dias != null && dias > 0 ? Math.max(dias / 30.4375, 1 / 30.4375) : 0;

  return {
    proyectoId: pid, objetivo, dias,
    comprometidas: r1(comprometidas), ejecutadas: r1(ejecutadas), programadas: r1(programadas),
    pendientes: r1(pendientes), sinPlanificar: r1(sinPlanificar),
    nMeses,
    // Ritmo: horas sin planificar entre los meses (fraccionarios) que quedan.
    porMes: dias == null ? null : dias <= 0 ? r1(sinPlanificar) : r1(sinPlanificar / Math.max(mesesFrac, 0.5)),
    meses: meses.map((m) => ({ ...m, programadas: programadasPorMes[m.mes] || 0, total: r1(m.horas + (programadasPorMes[m.mes] || 0)) })),
    retraso: dias != null && dias < 0 && sinPlanificar > 0,
    sinFecha: !objetivo,
    avancePct: comprometidas > 0 ? Math.min(100, Math.round((ejecutadas / comprometidas) * 100)) : null,
    // Lo que queda por planificar, por persona del equipo: según sus horas
    // asignadas o, si no las tiene, el reparto por nivel de la oferta.
    porPersona: porPersonaDe(proyecto, equipo, perfiles, sinPlanificar, dias, mesesFrac),
  };
}

function porPersonaDe(proyecto, equipo, perfiles, horas, dias, mesesFrac) {
  if (!Array.isArray(equipo)) return null;
  const miembros = equipoDe(proyecto, equipo, perfiles);
  if (!miembros.length) return [];
  const totalAsig = miembros.reduce((a, m) => a + num(m.horas_asignadas), 0);
  let fracciones;
  if (totalAsig > 0) fracciones = Object.fromEntries(miembros.filter((m) => m.horas_asignadas > 0).map((m) => [m.perfil_id, m.horas_asignadas / totalAsig]));
  else fracciones = horasSugeridasEquipo(1, proyecto?.reparto_niveles, miembros).fracciones;
  return miembros.filter((m) => fracciones[m.perfil_id] > 0).map((m) => {
    const p = perfiles.find((x) => S(x.id) === m.perfil_id);
    const h = r1(horas * fracciones[m.perfil_id]);
    return { perfil_id: m.perfil_id, nombre: p ? `${p.nombre || ''} ${p.apellidos || ''}`.trim() : m.perfil_id, nivel: m.nivel || null, papel: m.papel, pct: Math.round(fracciones[m.perfil_id] * 100), horas: h,
      porMes: dias == null ? null : dias <= 0 ? h : r1(h / Math.max(mesesFrac, 0.5)) };
  }).sort((a, b) => b.horas - a.horas);
}

/** Todos los proyectos vivos, con totales y el prorrateo mensual sumado. */
export function planCartera(proyectos = [], tareas = [], sesiones = [], hoy, equipo = null, perfiles = []) {
  const filas = proyectos.filter(proyectoVivo).map((p) => ({ proyecto: p, ...planHastaCertificacion(p, tareas, sesiones, hoy, equipo, perfiles) }))
    .sort((a, b) => (b.porMes || 0) - (a.porMes || 0));
  const total = filas.reduce((a, f) => ({
    comprometidas: r1(a.comprometidas + f.comprometidas), ejecutadas: r1(a.ejecutadas + f.ejecutadas),
    programadas: r1(a.programadas + f.programadas), sinPlanificar: r1(a.sinPlanificar + f.sinPlanificar),
    porMes: r1(a.porMes + (f.porMes || 0)),
  }), { comprometidas: 0, ejecutadas: 0, programadas: 0, sinPlanificar: 0, porMes: 0 });
  const porMes = {};
  for (const f of filas) for (const m of f.meses) {
    porMes[m.mes] = porMes[m.mes] || { mes: m.mes, etq: m.etq, horas: 0, programadas: 0, proyectos: 0 };
    porMes[m.mes].horas = r1(porMes[m.mes].horas + m.horas);
    porMes[m.mes].programadas = r1(porMes[m.mes].programadas + m.programadas);
    if (m.horas > 0) porMes[m.mes].proyectos += 1;
  }
  return { filas, total, meses: Object.values(porMes).sort((a, b) => a.mes.localeCompare(b.mes)) };
}
