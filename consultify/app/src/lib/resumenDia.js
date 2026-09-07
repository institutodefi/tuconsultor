// ════════════════════════════════════════════════════════════════════════════
// RESUMEN DEL DÍA · lo que una persona tiene que hacer hoy, esta semana y lo
// que arrastra, con las subtareas que quedan por cerrar.
//
// Funciones puras: las usa la función de Netlify (resumen-dia.mjs) para
// preparar lo que se le cuenta a la IA, la pantalla de inicio en modo demo
// para escribir el resumen sin IA, y las pruebas desde Node.
// ════════════════════════════════════════════════════════════════════════════

const S = (v) => String(v ?? '');
const num = (v) => Number(v) || 0;
const r1 = (n) => Math.round(n * 10) / 10;
const pl = (n, uno, varios) => (n === 1 ? uno : varios);

export const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const sumar = (iso, dias) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + dias); return aISO(d); };
const fechaCorta = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) : '');

/**
 * Recoge lo de una persona a partir de las tablas ya cargadas.
 * @param d { perfilId, hoy?, sesiones, tareas, internas, proyectos, equipo, clientes }
 * @returns { hoy, semana, atrasadas, tareasMias, subtareasPendientes, totales }
 */
export function datosResumen(d) {
  const yo = S(d.perfilId);
  const hoy = d.hoy || aISO(new Date());
  const en7 = sumar(hoy, 7);
  const tareaPor = Object.fromEntries((d.tareas || []).map((t) => [S(t.id), t]));
  const internaPor = Object.fromEntries((d.internas || []).map((t) => [S(t.id), t]));
  const proyectoPor = Object.fromEntries((d.proyectos || []).map((p) => [S(p.id), p]));
  const clientePor = Object.fromEntries((d.clientes || []).map((c) => [S(c.id), c]));
  const nombreProyecto = (pid) => { const p = proyectoPor[S(pid)]; if (!p) return ''; const c = clientePor[S(p.cliente_id)]; return c?.nombre_comercial || c?.empresa || p.codigo || p.nombre || ''; };

  const mias = (d.sesiones || []).filter((s) => S(s.consultor_id) === yo && s.estado !== 'anulada');
  const conTitulo = (s) => {
    const t = s.cliente_tarea_id ? tareaPor[S(s.cliente_tarea_id)] : null;
    const i = s.tarea_interna_id ? internaPor[S(s.tarea_interna_id)] : null;
    return {
      fecha: S(s.fecha).slice(0, 10), inicio: S(s.hora_inicio).slice(0, 5), fin: S(s.hora_fin).slice(0, 5), horas: num(s.horas), estado: s.estado,
      titulo: t?.titulo || i?.titulo || 'Tarea', codigo: t?.codigo || '', cliente: t ? nombreProyecto(t.proyecto_id) : (i ? 'interna' : ''),
      subtareasPendientes: t ? (Array.isArray(t.subtareas) ? t.subtareas : []).filter((x) => !x.hecha).map((x) => S(x.texto)) : [],
    };
  };
  const orden = (a, b) => a.fecha.localeCompare(b.fecha) || a.inicio.localeCompare(b.inicio);
  const deHoy = mias.filter((s) => S(s.fecha).slice(0, 10) === hoy).map(conTitulo).sort(orden);
  const semana = mias.filter((s) => { const f = S(s.fecha).slice(0, 10); return f > hoy && f <= en7; }).map(conTitulo).sort(orden);
  const atrasadas = mias.filter((s) => S(s.fecha).slice(0, 10) < hoy && s.estado !== 'hecha').map(conTitulo).sort(orden);

  // Tareas de proyecto que le tocan: asignadas a ella, o de proyectos donde
  // está en el equipo (sin asignar a otra persona), sin hacer.
  const misProyectos = new Set((d.equipo || []).filter((e) => S(e.perfil_id) === yo).map((e) => S(e.proyecto_id)));
  const tareasMias = (d.tareas || []).filter((t) => !t.hecha && (S(t.consultor_id) === yo || (!t.consultor_id && misProyectos.has(S(t.proyecto_id)))))
    .map((t) => ({
      id: t.id, codigo: t.codigo || '', titulo: t.titulo || t.subproceso || '', cliente: nombreProyecto(t.proyecto_id), horas: num(t.horas),
      fecha: t.fecha_estimada ? S(t.fecha_estimada).slice(0, 10) : null,
      subtareas: (Array.isArray(t.subtareas) ? t.subtareas : []).map((x) => ({ texto: S(x.texto), hecha: !!x.hecha })),
    }));
  const subtareasPendientes = tareasMias.flatMap((t) => t.subtareas.filter((x) => !x.hecha).map((x) => ({ tarea: t.titulo, codigo: t.codigo, cliente: t.cliente, texto: x.texto })));
  const vencidas = tareasMias.filter((t) => t.fecha && t.fecha < hoy);
  const estaSemana = tareasMias.filter((t) => t.fecha && t.fecha >= hoy && t.fecha <= en7);
  const horas = (l) => r1(l.reduce((a, s) => a + s.horas, 0));
  return {
    hoy, en7, deHoy, semana, atrasadas, tareasMias, subtareasPendientes, vencidas, estaSemana,
    totales: { hoy: deHoy.length, horasHoy: horas(deHoy), semana: semana.length, horasSemana: horas(semana), atrasadas: atrasadas.length, tareas: tareasMias.length, subtareas: subtareasPendientes.length, vencidas: vencidas.length },
  };
}

/** Texto compacto para la IA (y para leerlo a ojo). */
export function textoParaIA(r, nombre = '') {
  const L = [];
  L.push(`Persona: ${nombre || 'consultor/a'} · Hoy: ${fechaCorta(r.hoy)} (${r.hoy})`);
  const ses = (s) => `- ${fechaCorta(s.fecha)} ${s.inicio}–${s.fin} (${s.horas} h) · ${s.cliente ? `${s.cliente} · ` : ''}${s.codigo ? `${s.codigo} ` : ''}${s.titulo}${s.estado === 'hecha' ? ' [hecha]' : ''}${s.subtareasPendientes.length ? ` · pasos pendientes: ${s.subtareasPendientes.join('; ')}` : ''}`;
  L.push(`\nSESIONES DE HOY (${r.deHoy.length}, ${r.totales.horasHoy} h):`); r.deHoy.forEach((s) => L.push(ses(s))); if (!r.deHoy.length) L.push('- ninguna');
  L.push(`\nPRÓXIMOS 7 DÍAS (${r.semana.length}, ${r.totales.horasSemana} h):`); r.semana.forEach((s) => L.push(ses(s))); if (!r.semana.length) L.push('- ninguna');
  L.push(`\nSESIONES PASADAS SIN CERRAR (${r.atrasadas.length}):`); r.atrasadas.forEach((s) => L.push(ses(s))); if (!r.atrasadas.length) L.push('- ninguna');
  L.push(`\nTAREAS DE PROYECTO CON FECHA VENCIDA (${r.vencidas.length}):`); r.vencidas.forEach((t) => L.push(`- ${t.cliente} · ${t.codigo} ${t.titulo} (prevista ${fechaCorta(t.fecha)}, ${t.horas} h)`)); if (!r.vencidas.length) L.push('- ninguna');
  L.push(`\nTAREAS PREVISTAS ESTA SEMANA (${r.estaSemana.length}):`); r.estaSemana.forEach((t) => L.push(`- ${t.cliente} · ${t.codigo} ${t.titulo} (${fechaCorta(t.fecha)}, ${t.horas} h)`)); if (!r.estaSemana.length) L.push('- ninguna');
  const sub = r.subtareasPendientes.slice(0, 40);
  L.push(`\nSUBTAREAS (PASOS) PENDIENTES EN MIS TAREAS (${r.subtareasPendientes.length}${r.subtareasPendientes.length > 40 ? ', se listan 40' : ''}):`);
  sub.forEach((x) => L.push(`- ${x.cliente} · ${x.codigo} ${x.tarea}: ${x.texto}`)); if (!sub.length) L.push('- ninguna');
  return L.join('\n');
}

/** Resumen escrito sin IA (demo, o si la IA no responde): mismo guion, en prosa corta. */
export function resumenLocal(r, nombre = '') {
  const P = [];
  const n = nombre ? `${nombre}, hoy` : 'Hoy';
  if (r.deHoy.length) {
    P.push(`${n} tienes ${r.deHoy.length} ${pl(r.deHoy.length, 'sesión', 'sesiones')} (${r.totales.horasHoy} h): ${r.deHoy.map((s) => `${s.inicio} ${s.titulo}${s.cliente && s.cliente !== 'interna' ? ` con ${s.cliente}` : s.cliente === 'interna' ? ' (interna)' : ''}`).join(', ')}.`);
    const pasos = r.deHoy.flatMap((s) => s.subtareasPendientes.map((p) => `${p} (${s.titulo})`));
    if (pasos.length) P.push(`Pasos que puedes cerrar hoy: ${pasos.slice(0, 6).join('; ')}${pasos.length > 6 ? '…' : ''}.`);
  } else P.push(`${n} no tienes sesiones programadas.`);
  if (r.semana.length) P.push(`En los próximos 7 días: ${r.semana.length} ${pl(r.semana.length, 'sesión', 'sesiones')} (${r.totales.horasSemana} h)${r.semana[0] ? `, la primera ${fechaCorta(r.semana[0].fecha)} a las ${r.semana[0].inicio} (${r.semana[0].titulo})` : ''}.`);
  if (r.atrasadas.length) P.push(`Tienes ${r.atrasadas.length} ${pl(r.atrasadas.length, 'sesión pasada', 'sesiones pasadas')} sin cerrar: ${pl(r.atrasadas.length, 'márcala hecha o muévela', 'márcalas hechas o muévelas')}.`);
  if (r.vencidas.length) P.push(`Tareas con fecha vencida: ${r.vencidas.map((t) => `${t.codigo || t.titulo} (${t.cliente})`).join(', ')}.`);
  if (r.subtareasPendientes.length) { const nt = r.tareasMias.filter((t) => t.subtareas.some((x) => !x.hecha)).length; P.push(`Te ${pl(r.subtareasPendientes.length, 'queda', 'quedan')} ${r.subtareasPendientes.length} ${pl(r.subtareasPendientes.length, 'paso', 'pasos')} por cerrar en ${nt} ${pl(nt, 'tarea', 'tareas')}.`); }
  return P.join('\n\n');
}
