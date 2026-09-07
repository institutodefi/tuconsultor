// ════════════════════════════════════════════════════════════════
// AGENDA DEL CONSULTOR · capa de datos
//
// Las reglas de jornada (convenio, festivos, reparto 70/10/20, capacidad)
// viven en jornada.js, sin dependencias, para poder probarlas desde Node.
// Aquí solo queda lo que habla con Supabase (o con el estado DEMO), y se
// reexporta todo lo de jornada.js para que quien importaba de aquí siga
// funcionando igual.
// ════════════════════════════════════════════════════════════════
import { supabase, DEMO } from './supabase';
import { FESTIVOS_2026 } from './jornada.js';
export * from './jornada.js';

// ── Capa de datos (Supabase real o DEMO en memoria) ──────────────
let demoAgenda = null;
function demoState() {
  if (!demoAgenda) {
    // Semilla de demo: tareas repartidas por los cuatro tramos del semáforo,
    // para que la cabecera de Mi agenda se pueda enseñar sin base de datos.
    const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
    demoAgenda = {
      vacaciones: [],
      agenda_tareas: [
        { id: 'at1', consultor_id: 'c1', proyecto_id: 'p1', titulo: 'Auditoría interna · preparación', fecha_prevista: d(-9),  horas_previstas: 6, tipo: 'produccion',   estado: 'pendiente' },
        { id: 'at2', consultor_id: 'c1', proyecto_id: 'p1', titulo: 'Revisión por la dirección',        fecha_prevista: d(-2),  horas_previstas: 4, tipo: 'gestion',      estado: 'pendiente' },
        { id: 'at3', consultor_id: 'c1', proyecto_id: 'p2', titulo: 'Mapa de procesos · sesión 2',      fecha_prevista: d(0),   horas_previstas: 5, tipo: 'produccion',   estado: 'en_curso' },
        { id: 'at4', consultor_id: 'c1', proyecto_id: 'p2', titulo: 'Análisis de riesgos',              fecha_prevista: d(3),   horas_previstas: 6, tipo: 'produccion',   estado: 'pendiente' },
        { id: 'at5', consultor_id: 'c1', proyecto_id: 'p1', titulo: 'Formación a personas trabajadoras',fecha_prevista: d(6),   horas_previstas: 4, tipo: 'coordinacion', estado: 'pendiente' },
        { id: 'at6', consultor_id: 'c1', proyecto_id: 'p3', titulo: 'Plan de adecuación ENS',           fecha_prevista: d(20),  horas_previstas: 8, tipo: 'produccion',   estado: 'pendiente' },
        { id: 'at7', consultor_id: 'c1', proyecto_id: 'p1', titulo: 'Documentación del sistema',        fecha_prevista: d(-25), horas_previstas: 7, horas_reales: 8.5, fecha_efectiva: d(-24), tipo: 'produccion', estado: 'completada' },
        { id: 'at8', consultor_id: 'c1', proyecto_id: 'p2', titulo: 'Reunión de arranque',              fecha_prevista: d(-40), horas_previstas: 3, horas_reales: 3,   fecha_efectiva: d(-40), tipo: 'gestion',    estado: 'completada' },
      ],
    };
  }
  return demoAgenda;
}
const uid = () => Math.random().toString(36).slice(2, 10);

export async function getFestivos(year) {
  if (DEMO) return FESTIVOS_2026;
  const { data, error } = await supabase.from('festivos').select('*')
    .gte('fecha', `${year}-01-01`).lte('fecha', `${year}-12-31`).order('fecha');
  if (error) throw error;
  return data?.length ? data : FESTIVOS_2026; // fallback si la tabla está vacía
}

export async function getVacaciones(consultorId, year) {
  if (DEMO) return demoState().vacaciones.filter(v => v.consultor_id === consultorId);
  const { data, error } = await supabase.from('vacaciones').select('*')
    .eq('consultor_id', consultorId)
    .gte('fecha', `${year}-01-01`).lte('fecha', `${year}-12-31`);
  if (error) throw error;
  return data ?? [];
}

export async function toggleVacacion(consultorId, fecha) {
  if (DEMO) {
    const v = demoState().vacaciones;
    const i = v.findIndex(x => x.consultor_id === consultorId && x.fecha === fecha);
    if (i >= 0) { v.splice(i, 1); return false; }
    v.push({ id: uid(), consultor_id: consultorId, fecha });
    return true;
  }
  const { data, error } = await supabase.from('vacaciones').select('id')
    .eq('consultor_id', consultorId).eq('fecha', fecha).maybeSingle();
  if (error) throw error;
  if (data) {
    const { error: e2 } = await supabase.from('vacaciones').delete().eq('id', data.id);
    if (e2) throw e2;
    return false;
  }
  const { error: e3 } = await supabase.from('vacaciones').insert({ consultor_id: consultorId, fecha });
  if (e3) throw e3;
  return true;
}

export async function getTareasAgenda(consultorId, year) {
  if (DEMO) return demoState().agenda_tareas.filter(t => t.consultor_id === consultorId);
  const ini = `${year}-01-01`, fin = `${year}-12-31`;
  const { data, error } = await supabase.from('agenda_tareas').select('*')
    .eq('consultor_id', consultorId)
    .or(`and(fecha_prevista.gte.${ini},fecha_prevista.lte.${fin}),and(fecha_efectiva.gte.${ini},fecha_efectiva.lte.${fin})`)
    .order('fecha_prevista');
  if (error) throw error;
  return data ?? [];
}

// Quita del objeto la columna que PostgREST dice no encontrar, para poder
// reintentar el guardado aunque la BD vaya un paso por detrás de la app.
function _sinColumnaFaltante(obj, error) {
  const m = (error?.message || '').match(/could not find the '([^']+)' column/i)
        || (error?.message || '').match(/'([^']+)' column of '[^']+' in the schema cache/i);
  if (!m) return null;
  const col = m[1];
  if (!(col in obj)) return null;
  const { [col]: _omit, ...resto } = obj;
  return resto;
}

export async function crearTareaAgenda(t) {
  if (DEMO) { const r = { id: uid(), creado: new Date().toISOString(), ...t }; demoState().agenda_tareas.push(r); return r; }
  let payload = t;
  for (let intento = 0; intento < 4; intento++) {
    const { data, error } = await supabase.from('agenda_tareas').insert(payload).select().single();
    if (!error) return data;
    const reducido = _sinColumnaFaltante(payload, error);
    if (!reducido) throw error;   // error distinto a "columna ausente": propágalo
    payload = reducido;           // reintenta sin la columna que falta
  }
  throw new Error('No se pudo guardar tras varios reintentos.');
}

export async function actualizarTareaAgenda(id, patch) {
  if (DEMO) {
    const arr = demoState().agenda_tareas;
    const i = arr.findIndex(x => x.id === id);
    if (i >= 0) arr[i] = { ...arr[i], ...patch };
    return arr[i];
  }
  let payload = patch;
  for (let intento = 0; intento < 4; intento++) {
    const { data, error } = await supabase.from('agenda_tareas').update(payload).eq('id', id).select().single();
    if (!error) return data;
    const reducido = _sinColumnaFaltante(payload, error);
    if (!reducido) throw error;
    payload = reducido;
  }
  throw new Error('No se pudo actualizar tras varios reintentos.');
}

export async function borrarTareaAgenda(id) {
  if (DEMO) {
    const arr = demoState().agenda_tareas;
    const i = arr.findIndex(x => x.id === id);
    if (i >= 0) arr.splice(i, 1);
    return;
  }
  const { error } = await supabase.from('agenda_tareas').delete().eq('id', id);
  if (error) throw error;
}

// ── Tareas internas (gestión y coordinación · procesos internos) ──
// Las sesiones de estas tareas van a `tarea_sesiones.tarea_interna_id`, así
// que la agenda las enseña sin nada especial. Aquí solo la tarea en sí.
let demoInternas = null;
const demoInternasState = () => (demoInternas ||= [
  { id: 'ti1', consultor_id: 'c1', tipo: 'gestion', titulo: 'Reunión semanal de equipo', horas: 4, estado: 'abierta', creado: new Date().toISOString() },
  { id: 'ti2', consultor_id: 'c1', tipo: 'proceso_interno', titulo: 'Revisión del sistema de gestión', horas: 6, estado: 'abierta', creado: new Date().toISOString() },
]);

export async function getTareasInternas() {
  if (DEMO) return demoInternasState().slice();
  const { data, error } = await supabase.from('tareas_internas').select('*').order('creado', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function crearTareaInterna(t) {
  if (DEMO) { const r = { id: uid(), creado: new Date().toISOString(), estado: 'abierta', ...t }; demoInternasState().push(r); return r; }
  const { data, error } = await supabase.from('tareas_internas').insert(t).select().single();
  if (error) throw error;
  return data;
}

export async function actualizarTareaInterna(id, patch) {
  if (DEMO) { const a = demoInternasState(); const i = a.findIndex((x) => x.id === id); if (i >= 0) a[i] = { ...a[i], ...patch }; return a[i]; }
  const { data, error } = await supabase.from('tareas_internas').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function borrarTareaInterna(id) {
  if (DEMO) { const a = demoInternasState(); const i = a.findIndex((x) => x.id === id); if (i >= 0) a.splice(i, 1); return; }
  const { error } = await supabase.from('tareas_internas').delete().eq('id', id);
  if (error) throw error;
}

/** Vacaciones de TODO el equipo en un año: las necesita el control de horas. */
export async function getVacacionesTodas(year) {
  if (DEMO) return demoState().vacaciones.slice();
  const { data, error } = await supabase.from('vacaciones').select('*')
    .gte('fecha', `${year}-01-01`).lte('fecha', `${year + 1}-12-31`);
  if (error) throw error;
  return data ?? [];
}
