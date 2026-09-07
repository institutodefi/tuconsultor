// ════════════════════════════════════════════════════════════════
// AGENDA DEL CONSULTOR · XIX Convenio Consultorías 2025-2027
//   · 1.800 h de trabajo efectivo en cómputo anual (tope legal)
//   · 40 h/semana (8 h/día) · máx. 9 h ordinarias/día
//   · Verano (1 jul–15 sep): jornada intensiva 7 h/día (35 h/sem)
//   · Tope 1.800 h = MÁXIMO legal: la jornada real no se infla a 1.800
//   · Vacaciones: 23 días laborables (22 si ≥2 meses de intensiva)
// Tareas: fecha/horas PREVISTAS (plan) y EFECTIVAS/REALES (ejecución)
// La capa de datos (Supabase/DEMO) está en agenda.js; esto es puro y se
// importa desde Node para las pruebas (scripts/test-control-horas.mjs).
// ════════════════════════════════════════════════════════════════

export const TOPE_ANUAL = 1800;
export const MAX_HORAS_DIA = 9;
export const HORAS_DIA_ESTANDAR = 8;
export const HORAS_DIA_VERANO = 7;          // jornada intensiva de verano
// Jornada intensiva Consultify: 1 julio – 15 septiembre a 7 h/día (35 h/sem,
// dentro del tope de 36 h/sem del art. 20.2). 2+ meses ⇒ 22 días vacaciones.
export const VERANO_INI = '07-01';
export const VERANO_FIN = '09-15';
export const esVerano = (date) => {
  const md = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return md >= VERANO_INI && md <= VERANO_FIN;
};
export const DIAS_VACACIONES = 22;  // 2+ meses de intensiva ⇒ 22 días (art. 21 convenio)
export const YEAR_AGENDA = 2026; // año de ajuste

// ── Reparto de la jornada ──
// El 70 % de la jornada va a proyectos de cliente. El 30 % restante son dos
// bolsas: 10 % de gestión y coordinación y 20 % de procesos internos (los del
// mapa de procesos del portal). Antes había cuatro bolsas, con gestión y
// coordinación separadas al 10 % cada una y procesos internos al 10 %; se
// unifican porque en la práctica nadie distinguía una reunión de gestión de
// una de coordinación, y los procesos internos pesaban más de lo previsto.
//
// Los valores por defecto viven aquí; la BD (parametros_precio, grupo
// `jornada`, v116) puede cambiarlos sin desplegar: ver `aplicarReparto`.
const REPARTO = { produccion: 0.70, gestion: 0.10, proceso_interno: 0.20 };

export let PCT_PRODUCTIVO   = REPARTO.produccion;      // proyectos de cliente
export let PCT_GESTION      = REPARTO.gestion;         // gestión y coordinación
export let PCT_PROC_INTERNO = REPARTO.proceso_interno; // procesos internos
// Compatibilidad: la coordinación ya no es bolsa propia, va dentro de gestión.
export const PCT_COORDINACION = 0;

/** Reparto vigente, como fracciones {produccion, gestion, proceso_interno}. */
export const reparto = () => ({ produccion: PCT_PRODUCTIVO, gestion: PCT_GESTION, proceso_interno: PCT_PROC_INTERNO });

/**
 * Aplica el reparto leído de la BD. `mapa` es {clave: valor} en PORCENTAJE
 * (70, 10, 20), tal como está en parametros_precio. Si los tres no suman
 * 100 se ignora: un reparto que no cierra dice más de un error de carga que
 * de una decisión.
 */
export function aplicarReparto(mapa = {}) {
  const p = Number(mapa.pct_jornada_proyectos), g = Number(mapa.pct_jornada_gestion), i = Number(mapa.pct_jornada_procesos);
  if (![p, g, i].every((n) => Number.isFinite(n) && n >= 0)) return false;
  if (Math.abs(p + g + i - 100) > 0.01) return false;
  PCT_PRODUCTIVO = p / 100; PCT_GESTION = g / 100; PCT_PROC_INTERNO = i / 100;
  for (const t of TIPOS_TAREA) t.pct = t.id === 'produccion' ? PCT_PRODUCTIVO : t.id === 'gestion' ? PCT_GESTION : PCT_PROC_INTERNO;
  return true;
}

// Tipos de tarea: cada una consume su bolsa de jornada.
export const TIPOS_TAREA = [
  { id: 'produccion',      nombre: 'Proyectos de cliente',     corto: 'P',  pct: REPARTO.produccion },
  { id: 'gestion',         nombre: 'Gestión y coordinación',   corto: 'G',  pct: REPARTO.gestion },
  { id: 'proceso_interno', nombre: 'Procesos internos',        corto: 'PI', pct: REPARTO.proceso_interno },
];
export const TIPO_BY_ID = Object.fromEntries(TIPOS_TAREA.map(t => [t.id, t]));
// Las tareas antiguas de tipo «coordinacion» cuentan como gestión.
TIPO_BY_ID.coordinacion = TIPO_BY_ID.gestion;
/** Normaliza el tipo de una tarea o sesión a una de las tres bolsas. */
export const tipoBolsa = (tipo) => (tipo === 'gestion' || tipo === 'coordinacion') ? 'gestion'
  : tipo === 'proceso_interno' ? 'proceso_interno' : 'produccion';

export const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Festivos 2026 Madrid capital — fallback si la tabla `festivos` está
// vacía o en modo DEMO. 2026 es año de ajuste: la tabla manda.
export const FESTIVOS_2026 = [
  { fecha: '2026-01-01', nombre: 'Año Nuevo' },
  { fecha: '2026-01-06', nombre: 'Epifanía del Señor' },
  { fecha: '2026-04-02', nombre: 'Jueves Santo' },
  { fecha: '2026-04-03', nombre: 'Viernes Santo' },
  { fecha: '2026-05-01', nombre: 'Fiesta del Trabajo' },
  { fecha: '2026-05-02', nombre: 'Fiesta C. de Madrid' },
  { fecha: '2026-05-15', nombre: 'San Isidro' },
  { fecha: '2026-08-15', nombre: 'Asunción de la Virgen' },
  { fecha: '2026-10-12', nombre: 'Fiesta Nacional' },
  { fecha: '2026-11-02', nombre: 'Todos los Santos (tras.)' },
  { fecha: '2026-11-09', nombre: 'Virgen de la Almudena' },
  { fecha: '2026-12-08', nombre: 'Inmaculada Concepción' },
  { fecha: '2026-12-25', nombre: 'Navidad' },
];

// ── Calendario ────────────────────────────────────────────────────
export const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const hoyISO = () => toISO(new Date());

export function esLaborable(date, festivosSet) {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return false;
  return !festivosSet.has(toISO(date));
}

export const horasDia = (date) => (esVerano(date) ? HORAS_DIA_VERANO : HORAS_DIA_ESTANDAR);

export function diasDelMes(year, month) {
  const out = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) { out.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return out;
}

const enMes = (iso, year, month) =>
  iso && iso.startsWith(`${year}-${String(month + 1).padStart(2, '0')}-`);

// ── Resúmenes ─────────────────────────────────────────────────────
export function resumenMes(year, month, festivosSet, vacacionesSet, tareas) {
  let laborables = 0, horasConvenio = 0, horasVacaciones = 0, diasVacacionesN = 0;
  for (const d of diasDelMes(year, month)) {
    if (!esLaborable(d, festivosSet)) continue;
    laborables += 1;
    const h = horasDia(d);
    horasConvenio += h;
    if (vacacionesSet.has(toISO(d))) { horasVacaciones += h; diasVacacionesN += 1; }
  }
  let previstas = 0, reales = 0;
  // `coordinacion` se mantiene a 0 por compatibilidad con quien lo lea: ya
  // cuenta dentro de `gestion`.
  const prev = { produccion: 0, gestion: 0, coordinacion: 0, proceso_interno: 0 };
  const real = { produccion: 0, gestion: 0, coordinacion: 0, proceso_interno: 0 };
  // Para la CAPACIDAD del consultor cuentan las horas que la tarea le
  // consume (horas_consultor, ya con eficiencia). Si no está, cae a
  // horas_previstas (compatibilidad con tareas antiguas).
  for (const t of tareas) {
    const tipo = tipoBolsa(t.tipo);
    const hPrev = Number(t.horas_consultor ?? t.horas_previstas);
    const hReal = Number(t.horas_reales);
    if (enMes(t.fecha_prevista, year, month)) { previstas += hPrev; prev[tipo] += hPrev; }
    if (t.horas_reales && enMes(t.fecha_efectiva, year, month)) { reales += hReal; real[tipo] += hReal; }
  }
  const objetivoBruto = horasConvenio - horasVacaciones;
  return {
    laborables, horasConvenio, horasVacaciones, diasVacaciones: diasVacacionesN,
    objetivoBruto, previstas, reales,
    prevTipo: prev, realTipo: real,
    desviacion: reales - previstas,
  };
}

export function resumenAnual(year, festivosSet, vacacionesSet, tareas, pctJornada = 100) {
  const meses = [];
  for (let m = 0; m < 12; m++) {
    meses.push({ mes: m, nombre: MESES[m], ...resumenMes(year, m, festivosSet, vacacionesSet, tareas) });
  }

  // ── Tope de 1.800 h = MÁXIMO legal (art. 20.1), no objetivo a clavar ──
  // La jornada real = horas de convenio − vacaciones. Solo se recorta
  // (prorrateando) en el caso de que el calendario supere el tope.
  const brutoTotal = meses.reduce((a, m) => a + m.objetivoBruto, 0);
  const factor = brutoTotal > TOPE_ANUAL ? TOPE_ANUAL / brutoTotal : 1; // solo si excede
  const jor = (pctJornada ?? 100) / 100;          // fracción de jornada del consultor
  for (const m of meses) {
    m.objetivo     = m.objetivoBruto * factor * jor; // jornada real del mes según % dedicación
    m.productivas  = m.objetivo * PCT_PRODUCTIVO;    // proyectos de cliente
    m.gestion      = m.objetivo * PCT_GESTION;       // gestión y coordinación
    m.coordinacion = 0;                              // ya va dentro de gestión
    m.procesoInterno = m.objetivo * PCT_PROC_INTERNO;
    m.disponibles  = Math.max(0, m.productivas - m.prevTipo.produccion); // hueco facturable
  }
  const ajusteTope = Math.max(0, brutoTotal - TOPE_ANUAL); // h recortadas si excede el tope
  const margenTope = Math.max(0, TOPE_ANUAL - brutoTotal); // h libres hasta el tope legal

  const total = meses.reduce((a, m) => ({
    horasConvenio: a.horasConvenio + m.horasConvenio,
    horasVacaciones: a.horasVacaciones + m.horasVacaciones,
    diasVacaciones: a.diasVacaciones + m.diasVacaciones,
    objetivo: a.objetivo + m.objetivo,
    productivas: a.productivas + m.productivas,
    gestion: a.gestion + m.gestion,
    coordinacion: a.coordinacion + m.coordinacion,
    previstas: a.previstas + m.previstas,
    reales: a.reales + m.reales,
    prevTipo: {
      produccion: a.prevTipo.produccion + m.prevTipo.produccion,
      gestion: a.prevTipo.gestion + m.prevTipo.gestion,
      coordinacion: a.prevTipo.coordinacion + m.prevTipo.coordinacion,
    },
    realTipo: {
      produccion: a.realTipo.produccion + m.realTipo.produccion,
      gestion: a.realTipo.gestion + m.realTipo.gestion,
      coordinacion: a.realTipo.coordinacion + m.realTipo.coordinacion,
    },
  }), { horasConvenio: 0, horasVacaciones: 0, diasVacaciones: 0, objetivo: 0, productivas: 0, gestion: 0, coordinacion: 0, previstas: 0, reales: 0,
        prevTipo: { produccion: 0, gestion: 0, coordinacion: 0 }, realTipo: { produccion: 0, gestion: 0, coordinacion: 0 } });

  // Proyección de PRODUCCIÓN = reales prod. + previsto prod. sin cerrar
  //   + ritmo real de producción × laborables futuros sin tarea de producción
  const hoy = hoyISO();
  const tareasProd = tareas.filter((t) => (t.tipo || 'produccion') === 'produccion');
  const diasOcupados = new Set();
  for (const t of tareasProd) {
    if (t.fecha_prevista) diasOcupados.add(t.fecha_prevista);
    if (t.fecha_efectiva) diasOcupados.add(t.fecha_efectiva);
  }
  let labPasados = 0, labFuturosLibres = 0;
  for (let m = 0; m < 12; m++) {
    for (const d of diasDelMes(year, m)) {
      if (!esLaborable(d, festivosSet) || vacacionesSet.has(toISO(d))) continue;
      const iso = toISO(d);
      if (iso <= hoy) labPasados += 1;
      else if (!diasOcupados.has(iso)) labFuturosLibres += 1;
    }
  }
  let realesProd = 0, previstoSinCerrar = 0;
  for (const t of tareasProd) {
    if (t.horas_reales) realesProd += Number(t.horas_reales);
    else previstoSinCerrar += Number(t.horas_consultor ?? t.horas_previstas);
  }
  const ritmo = labPasados > 0 ? realesProd / labPasados : 0;
  const proyeccion = realesProd + previstoSinCerrar + ritmo * labFuturosLibres;

  return {
    meses, total, tope: TOPE_ANUAL,
    ajusteTope,                                   // h recortadas si se supera el tope
    margenTope,                                   // h libres hasta 1.800
    capProductiva: total.productivas,             // referencia para tareas y reloj
    ritmo, proyeccion,
  };
}

// ── Capacidad de un mes, repartida en las tres bolsas ─────────────
//
// Lo que una persona PUEDE trabajar en un mes: días laborables (sin festivos
// ni vacaciones) × horas del día (8, o 7 en la intensiva de verano) × su
// porcentaje de jornada. Y de eso, el 70 / 10 / 20.
//
// Es la cifra contra la que se compara todo en el control de horas. No se
// aplica aquí el tope anual de 1.800 h: es un máximo legal que solo recorta
// cuando el calendario lo supera, y eso se mira en `resumenAnual`.
export function capacidadMes(year, month, festivosSet, vacacionesSet, pctJornada = 100) {
  let laborables = 0, horas = 0, vacaciones = 0;
  for (const d of diasDelMes(year, month)) {
    if (!esLaborable(d, festivosSet)) continue;
    laborables += 1;
    if (vacacionesSet.has(toISO(d))) { vacaciones += 1; continue; }
    horas += horasDia(d);
  }
  const jornada = horas * ((pctJornada ?? 100) / 100);
  return {
    laborables, diasVacaciones: vacaciones,
    jornada,                                    // horas totales del mes para esta persona
    produccion: jornada * PCT_PRODUCTIVO,
    gestion: jornada * PCT_GESTION,
    proceso_interno: jornada * PCT_PROC_INTERNO,
  };
}

/** Suma de `capacidadMes` para un rango de meses (ambos incluidos). */
export function capacidadRango(desde, hasta, festivosSet, vacacionesSet, pctJornada = 100) {
  const acc = { laborables: 0, diasVacaciones: 0, jornada: 0, produccion: 0, gestion: 0, proceso_interno: 0, meses: 0 };
  let y = desde.getFullYear(), m = desde.getMonth();
  const fy = hasta.getFullYear(), fm = hasta.getMonth();
  while (y < fy || (y === fy && m <= fm)) {
    const c = capacidadMes(y, m, festivosSet, vacacionesSet, pctJornada);
    for (const k of ['laborables', 'diasVacaciones', 'jornada', 'produccion', 'gestion', 'proceso_interno']) acc[k] += c[k];
    acc.meses += 1;
    m += 1; if (m > 11) { m = 0; y += 1; }
  }
  return acc;
}

