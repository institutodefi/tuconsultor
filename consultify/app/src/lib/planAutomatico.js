// ════════════════════════════════════════════════════════════════════════════
// PLAN AUTOMÁTICO · reparte las tareas de un proyecto en el calendario
//
// Lo que hace el botón «✦ Programar automáticamente» del planificador. Con
// reglas, sin llamar a ningún modelo: son reglas claras y así el resultado es
// instantáneo, reproducible y se puede probar.
//
//  · Solo toca lo que está a MÁS de 15 días vista (MARGEN_DIAS). Las sesiones
//    de los próximos 15 días y las hechas no se mueven: el trabajo inmediato
//    ya está hablado con el cliente.
//  · Las sesiones programadas más allá de esos 15 días se rehacen (se quitan
//    y se vuelven a repartir), así el botón sirve para programar y para
//    reprogramar cuando cambia la fecha de auditoría o el equipo.
//  · Horizonte: desde hoy + 15 días hasta la auditoría externa (fecha de
//    auditoría externa, o de certificación, o límite del proyecto).
//  · La AUDITORÍA INTERNA y la REVISIÓN POR LA DIRECCIÓN van las últimas,
//    en la semana anterior a la fecha de certificación: la revisión termina
//    ≈ 7 días antes; la auditoría interna, justo antes de la revisión.
//  · El resto se ordena por fase (planificación → apoyo → operación → mejora
//    → evaluación) y se reparte de forma uniforme entre el inicio y el día
//    anterior a la auditoría interna: el mismo ritmo de horas cada día
//    laborable, sin pasar de una jornada por persona y día (contando lo que
//    ya tenga de otros proyectos).
//  · Cada tarea la hace su responsable; si no tiene, quien esté elegido en el
//    planificador. Solo gente del proyecto.
// ════════════════════════════════════════════════════════════════════════════
import { esLaborable } from './jornada.js';
import { horasDe, duracionSesion, sumarHoras, JORNADA } from './sesionesTarea.js';

const S = (v) => String(v ?? '');
const num = (v) => Number(v) || 0;
const r2 = (n) => Math.round(n * 4) / 4;      // al cuarto de hora
const r1 = (n) => Math.round(n * 10) / 10;

export const MARGEN_DIAS = 15;
export const DIAS_ANTES_CERT = 7;
export const HORA_INICIO = '09:00';
export const TROZO_MIN = 2;                     // una sesión no baja de 2 h si la tarea da para ello

export const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const deISO = (iso) => new Date(`${S(iso).slice(0, 10)}T12:00:00`);
const sumarDias = (iso, n) => { const d = deISO(iso); d.setDate(d.getDate() + n); return toISO(d); };

/** Tipo de tarea de cierre: 'auditoria', 'revision' o null. */
export function tipoCierre(t) {
  const txt = `${S(t?.subproceso)} ${S(t?.titulo)}`.toUpperCase();
  if (/AUDITOR[ÍI]A INTERNA/.test(txt)) return 'auditoria';
  if (/REVISI[ÓO]N POR LA DIRECCI[ÓO]N/.test(txt)) return 'revision';
  return null;
}

/** Fase de una tarea, para el orden lógico. Menor = antes. */
export function faseDe(t) {
  const m = `${S(t?.subproceso)} ${S(t?.proceso)}`.toUpperCase().match(/\b(P[EAIOR]|PM)(\d*)\b/);
  const p = m ? m[1] : '';
  const n = m ? Number(m[2] || 0) : 0;
  if (p === 'PE' && n === 1) return 0;          // planificación estratégica
  if (p === 'PM') return 0;                      // coordinación
  if (p === 'PA') return 1;                      // apoyo
  if (p === 'PR' || p === 'PO' || p === 'PI') return 2; // operación / realización / innovación
  if (p === 'PE' && n === 3) return 3;           // mejora
  if (p === 'PE' && n === 2) return 4;           // evaluación del desempeño
  if (p === 'PE') return 3;                      // otros PE (4..8)
  return 2;
}

/** Fechas que mandan: auditoría externa y certificación. */
export function fechasObjetivo(proyecto) {
  const aud = proyecto?.fecha_auditoria_externa || proyecto?.fecha_certificacion || proyecto?.fecha_limite || proyecto?.fecha_fin || null;
  const cert = proyecto?.fecha_certificacion || aud;
  return { auditoria: aud ? S(aud).slice(0, 10) : null, certificacion: cert ? S(cert).slice(0, 10) : null };
}

/**
 * Reparte. Devuelve { nuevas, quitar, avisos, resumen } sin tocar la base.
 * @param d {
 *   proyecto, tareas (del proyecto), sesiones (TODAS, de todos los proyectos),
 *   gente [{id}], responsableDefecto, hoy 'YYYY-MM-DD', festivos Set,
 *   horasTeoricas(t) → h, jornada?, margenDias?
 * }
 */
export function planAutomatico(d) {
  const jornada = d.jornada || JORNADA;
  const margen = d.margenDias ?? MARGEN_DIAS;
  const hoy = d.hoy || toISO(new Date());
  const festivos = d.festivos || new Set();
  const gente = new Set((d.gente || []).map((g) => S(g.id)));
  const avisos = [];
  const { auditoria, certificacion } = fechasObjetivo(d.proyecto);
  if (!auditoria) return { error: 'El proyecto no tiene fecha de auditoría externa (ni de certificación, límite o fin): ponla en la ficha del proyecto.', nuevas: [], quitar: [], avisos };

  const laborable = (iso) => esLaborable(deISO(iso), festivos);
  const sigLaborable = (iso) => { let x = iso; while (!laborable(x)) x = sumarDias(x, 1); return x; };
  const antLaborable = (iso) => { let x = iso; while (!laborable(x)) x = sumarDias(x, -1); return x; };

  // Horizonte
  const desde = sigLaborable(sumarDias(hoy, margen + 1));
  const finRevision = antLaborable(sumarDias(certificacion, -DIAS_ANTES_CERT));
  if (finRevision < desde) return { error: `La fecha de certificación (${certificacion}) está demasiado cerca: la revisión por la dirección debería terminar el ${finRevision} y solo se programa a partir del ${desde}.`, nuevas: [], quitar: [], avisos };

  // Sesiones: las del proyecto que se pueden mover, las que se quedan y las
  // de otros proyectos (ocupación de cada persona).
  const idsTareas = new Set((d.tareas || []).map((t) => S(t.id)));
  const todas = (d.sesiones || []).filter((s) => s.estado !== 'anulada');
  const delProyecto = todas.filter((s) => idsTareas.has(S(s.cliente_tarea_id)));
  const quitar = delProyecto.filter((s) => s.estado !== 'hecha' && S(s.fecha).slice(0, 10) >= desde);
  const idsQuitar = new Set(quitar.map((s) => S(s.id)));
  const fijas = todas.filter((s) => !idsQuitar.has(S(s.id)));

  // Ocupación por persona y día (horas y hora de fin) con lo que se queda.
  const ocup = {};   // `${persona}|${fecha}` → { horas, fin }
  const anotar = (persona, fecha, ini, fin, horas) => {
    const k = `${persona}|${fecha}`;
    const o = ocup[k] || (ocup[k] = { horas: 0, fin: HORA_INICIO });
    o.horas = r2(o.horas + horas);
    if (S(fin).slice(0, 5) > o.fin) o.fin = S(fin).slice(0, 5);
  };
  for (const s of fijas) if (s.consultor_id) anotar(S(s.consultor_id), S(s.fecha).slice(0, 10), s.hora_inicio, s.hora_fin, num(s.horas) || 0);

  // Qué falta de cada tarea, con quién.
  const pendientes = [];
  for (const t of d.tareas || []) {
    if (t.hecha) continue;
    const teoricas = num(d.horasTeoricas ? d.horasTeoricas(t) : t.horas);
    const hechas = horasDe(fijas.filter((s) => S(s.cliente_tarea_id) === S(t.id)));
    const faltan = r2(Math.max(0, teoricas - hechas));
    if (faltan < 0.5) continue;
    let persona = S(t.consultor_id || '');
    if (!persona || !gente.has(persona)) persona = S(d.responsableDefecto || '');
    if (!persona) { avisos.push(`${t.codigo || t.titulo}: sin responsable y sin nadie por defecto; no se programa.`); continue; }
    pendientes.push({ t, faltan, persona, cierre: tipoCierre(t), fase: faseDe(t) });
  }
  if (!pendientes.length) return { nuevas: [], quitar, avisos, resumen: { horas: 0, sesiones: 0, desde, hasta: finRevision, auditoria, certificacion } };

  const nuevas = [];
  const hueco = (persona, fecha) => Math.max(0, r2(jornada - (ocup[`${persona}|${fecha}`]?.horas || 0)));
  const meter = (p, fecha, horas) => {
    const o = ocup[`${p.persona}|${fecha}`];
    const ini = o?.fin && o.fin > HORA_INICIO ? o.fin : HORA_INICIO;
    const fin = sumarHoras(ini, horas);
    nuevas.push({ cliente_tarea_id: p.t.id, consultor_id: p.persona, fecha, hora_inicio: ini, hora_fin: fin, horas, estado: 'programada', notas: null, _codigo: p.t.codigo, _titulo: p.t.titulo });
    anotar(p.persona, fecha, ini, fin, horas);
    p.faltan = r2(p.faltan - horas);
  };

  // ── Cierre: revisión por la dirección terminando ≈ 7 días antes de la
  //    certificación; auditoría interna justo antes. Se colocan hacia atrás.
  const orden = (a, b) => S(a.t.codigo).localeCompare(S(b.t.codigo), 'es', { numeric: true });
  const revisiones = pendientes.filter((p) => p.cierre === 'revision').sort(orden);
  const auditorias = pendientes.filter((p) => p.cierre === 'auditoria').sort(orden);
  const colocarAtras = (lista, ultimoDia) => {
    let dia = ultimoDia;
    let primerDia = ultimoDia;
    for (const p of [...lista].reverse()) {
      let intentos = 0;
      while (p.faltan >= 0.5 && intentos < 60) {
        if (!laborable(dia)) { dia = antLaborable(dia); continue; }
        const h = Math.min(duracionSesion(p.faltan, jornada), hueco(p.persona, dia));
        if (h >= 0.5) { meter(p, dia, h); primerDia = dia; }
        if (p.faltan >= 0.5) { dia = antLaborable(sumarDias(dia, -1)); intentos++; }
      }
    }
    return primerDia;
  };
  let inicioCierre = finRevision;
  if (revisiones.length) inicioCierre = colocarAtras(revisiones, finRevision);
  if (auditorias.length) inicioCierre = colocarAtras(auditorias, antLaborable(sumarDias(inicioCierre, -1)));
  const finResto = antLaborable(sumarDias(inicioCierre, -1));

  // ── El resto, uniforme entre `desde` y `finResto`, por fases.
  const resto = pendientes.filter((p) => !p.cierre).sort((a, b) => a.fase - b.fase || orden(a, b));
  const dias = [];
  for (let x = desde; x <= finResto; x = sumarDias(x, 1)) if (laborable(x)) dias.push(x);
  const totalH = r1(resto.reduce((a, p) => a + p.faltan, 0));
  if (resto.length && !dias.length) {
    avisos.push(`No queda hueco antes de la auditoría interna (${inicioCierre}) para ${fmt(totalH)}: se programan seguidas desde el ${desde}.`);
    for (let x = desde; dias.length < 60; x = sumarDias(x, 1)) if (laborable(x)) dias.push(x);
  }
  if (resto.length && dias.length) {
    // Trozos de tamaño parecido (entre 2 h y una jornada), repartidos a
    // intervalos regulares por el calendario: si hay pocas horas para muchos
    // días, una sesión cada varios días; si hay muchas, varias al día.
    const ritmo = r2(totalH / dias.length);
    // Con el calendario apretado (más de media jornada al día) se llenan
    // jornadas enteras; si hay holgura, trozos al ritmo que toca (mín. 2 h).
    const tam = ritmo > jornada * 0.6 ? jornada : Math.max(TROZO_MIN, Math.min(jornada, ritmo));
    const trozos = [];
    for (const p of resto) {
      let q = p.faltan;
      while (q >= 0.5) { const h = q - tam < 1 ? r2(q) : tam; trozos.push({ p, h: Math.min(h, jornada) }); q = r2(q - h); }
    }
    const paso = dias.length / Math.max(1, trozos.length);
    let idxUltimo = 0;
    // Bucle con índice (no forEach): al partir un trozo se inserta el resto
    // detrás y la lista crece.
    for (let k = 0; k < trozos.length; k++) {
      const tr = trozos[k];
      let i = Math.max(idxUltimo, Math.floor(k * paso));
      let puesto = false;
      for (let intentos = 0; intentos < 400 && !puesto; intentos++) {
        if (i >= dias.length) dias.push(sigLaborable(sumarDias(dias[dias.length - 1], 1)));
        const dia = dias[i];
        const h = Math.min(tr.h, hueco(tr.p.persona, dia));
        if (h >= 0.5 && (h >= tr.h || h >= TROZO_MIN)) {
          meter(tr.p, dia, h);
          if (h < tr.h) trozos.splice(k + 1, 0, { p: tr.p, h: r2(tr.h - h) });   // el resto, al siguiente hueco
          puesto = true; idxUltimo = i;
        } else i++;
      }
    }
    const idsCierre = new Set(pendientes.filter((p) => p.cierre).map((p) => S(p.t.id)));
    const ultimo = nuevas.filter((s) => !idsCierre.has(S(s.cliente_tarea_id))).map((s) => s.fecha).sort().pop();
    if (ultimo && ultimo > finResto) avisos.push(`El equipo no tiene hueco suficiente: algunas tareas caen después de la auditoría interna (hasta el ${ultimo}). Revisa el reparto o la fecha.`);
  }
  const sinCabida = pendientes.filter((p) => p.faltan >= 0.5);
  for (const p of sinCabida) avisos.push(`${p.t.codigo || p.t.titulo}: quedan ${fmt(p.faltan)} sin sitio.`);

  nuevas.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio));
  return {
    nuevas, quitar, avisos,
    resumen: { horas: r1(nuevas.reduce((a, s) => a + s.horas, 0)), sesiones: nuevas.length, desde, hasta: nuevas.length ? nuevas[nuevas.length - 1].fecha : finRevision, auditoria, certificacion, finRevision, inicioCierre, quitadas: quitar.length },
  };
}

const fmt = (n) => `${r1(n).toLocaleString('es-ES')} h`;
