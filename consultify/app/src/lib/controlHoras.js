// ════════════════════════════════════════════════════════════════════════════
// CONTROL DE HORAS POR CONSULTOR
//
// La pregunta que responde: ¿a esta persona le cabe otro proyecto?
//
// Para contestarla hacen falta cuatro cifras por proyecto y su suma:
//
//   COMPROMETIDAS   lo que el catálogo asigna a las tareas del proyecto que le
//                   tocan a esta persona. Es lo que se vendió; no se mueve.
//   PROGRAMADAS     sus sesiones en calendario (todas menos las anuladas).
//   EJECUTADAS      sus sesiones cerradas.
//   PENDIENTES      comprometidas − ejecutadas: lo que queda por hacer.
//
// Y la capacidad contra la que se comparan: el 70 % de su jornada mensual
// (días laborables × horas del día × % de jornada), que sale de lib/agenda.js.
// El 30 % restante son las bolsas de gestión y coordinación (10 %) y de
// procesos internos (20 %); aquí también se mira cuánto llevan.
//
// ── Cómo se reparten las horas de un proyecto entre su equipo ──
// Una tarea con `consultor_id` es de esa persona. Sin él —que es lo normal, el
// reparto por tarea casi nunca se rellena— las horas se reparten así:
//   1. si alguien del equipo tiene `horas_asignadas`, en proporción;
//   2. si el proyecto trae reparto por nivel de la oferta («J1 80 % · Senior
//      20 %», proyectos_cliente.reparto_niveles), cada nivel se lleva su
//      parte, repartida entre las personas de ese nivel (el responsable
//      incluido si su nivel está previsto);
//   3. si no, a partes iguales entre quienes ejecutan (los que no son el
//      responsable; si solo hay responsable, entre todos).
// Antes solo existía la regla 3, y en un proyecto con un J1 y un Senior
// responsable el J1 se llevaba el 100 % de las horas.
//
// Todo son funciones puras sobre las tablas ya cargadas: se prueban desde
// Node sin Supabase (scripts/test-control-horas.mjs) y valen para el modo demo.
// ════════════════════════════════════════════════════════════════════════════
import { capacidadMes, capacidadRango, toISO, tipoBolsa, reparto as repartoJornada } from './jornada.js';

const r1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const num = (n) => Number(n) || 0;
const S = (v) => String(v ?? '');

/** Meses (con decimales) entre dos fechas ISO; nunca menos de 0. */
export function mesesEntre(desdeISO, hastaISO) {
  if (!desdeISO || !hastaISO) return 0;
  const a = new Date(`${S(desdeISO).slice(0, 10)}T12:00:00`), b = new Date(`${S(hastaISO).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 0;
  return (b - a) / (86400000 * 30.4375);
}

/** Hasta cuándo va un proyecto: fecha_fin, si no fecha_limite, si no inicio + meses_estimados. */
export function finProyecto(p) {
  if (p?.fecha_fin) return S(p.fecha_fin).slice(0, 10);
  if (p?.fecha_limite) return S(p.fecha_limite).slice(0, 10);
  if (p?.fecha_inicio && num(p.meses_estimados) > 0) {
    const d = new Date(`${S(p.fecha_inicio).slice(0, 10)}T12:00:00`);
    d.setMonth(d.getMonth() + num(p.meses_estimados));
    return toISO(d);
  }
  return null;
}

const ESTADOS_CERRADOS = ['cerrado', 'cancelado', 'finalizado'];
export const proyectoVivo = (p) => !ESTADOS_CERRADOS.includes(S(p?.estado).toLowerCase());

/**
 * Equipo de un proyecto: filas de proyecto_equipo más, si no están, los
 * consultor_1_id / consultor_2_id antiguos de proyectos_cliente.
 */
export function equipoDe(proyecto, equipo = [], perfiles = []) {
  const nivelPerfil = (id) => perfiles.find((p) => S(p.id) === S(id))?.nivel || null;
  const filas = equipo.filter((e) => S(e.proyecto_id) === S(proyecto.id))
    .map((e) => ({ perfil_id: S(e.perfil_id), papel: e.papel || 'consultor', horas_asignadas: num(e.horas_asignadas), nivel: e.nivel || nivelPerfil(e.perfil_id) }));
  for (const k of ['consultor_1_id', 'consultor_2_id']) {
    const id = proyecto[k];
    if (id && !filas.some((f) => f.perfil_id === S(id))) filas.push({ perfil_id: S(id), papel: 'consultor', horas_asignadas: 0, nivel: nivelPerfil(id) });
  }
  return filas;
}

const NIVELES_ORDEN = ['J1', 'J2', 'J3', 'Senior'];
const repartoValido = (r) => {
  if (!r || typeof r !== 'object') return null;
  const out = {}; let suma = 0;
  for (const nv of NIVELES_ORDEN) { const v = Number(r[nv]) || 0; if (v < 0) return null; out[nv] = v; suma += v; }
  return suma > 0 ? out : null;
};

/**
 * Horas sugeridas para cada persona del equipo según el reparto por nivel
 * de la oferta («J1 80 % · Senior 20 %»): las horas de cada nivel se reparten
 * a partes iguales entre las personas de ese nivel. Un nivel previsto sin
 * nadie de ese nivel en el equipo reparte su parte entre los demás niveles
 * que sí tienen gente (en proporción) y se anota en `sinCubrir`. Si nadie
 * del equipo tiene un nivel previsto, se reparte a partes iguales entre
 * quienes ejecutan.
 *
 * @returns { fracciones: {perfil_id: 0..1}, horas: {perfil_id: h},
 *            porNivel: {nivel: {pct, horas, personas}}, sinCubrir: [nivel] }
 */
export function horasSugeridasEquipo(totalHoras, reparto, miembros = []) {
  const r = repartoValido(reparto);
  const total = num(totalHoras);
  const out = { fracciones: {}, horas: {}, porNivel: {}, sinCubrir: [] };
  if (!miembros.length) return out;
  const sumaR = r ? NIVELES_ORDEN.reduce((a, nv) => a + r[nv], 0) : 0;
  const porNivel = {};
  for (const m of miembros) if (m.nivel) (porNivel[m.nivel] = porNivel[m.nivel] || []).push(m.perfil_id);
  const cubiertos = r ? NIVELES_ORDEN.filter((nv) => r[nv] > 0 && porNivel[nv]?.length) : [];
  if (!r || !cubiertos.length) {
    const ejecutores = miembros.filter((m) => m.papel !== 'responsable');
    const base = ejecutores.length ? ejecutores : miembros;
    for (const m of base) out.fracciones[m.perfil_id] = (out.fracciones[m.perfil_id] || 0) + 1 / base.length;
    if (r) out.sinCubrir = NIVELES_ORDEN.filter((nv) => r[nv] > 0);
  } else {
    out.sinCubrir = NIVELES_ORDEN.filter((nv) => r[nv] > 0 && !porNivel[nv]?.length);
    const sumaCubierta = cubiertos.reduce((a, nv) => a + r[nv], 0);
    for (const nv of cubiertos) {
      const frac = (r[nv] / sumaR) * (sumaR / sumaCubierta);   // su parte + la de los niveles sin gente, en proporción
      const ids = porNivel[nv];
      out.porNivel[nv] = { pct: Math.round(frac * 1000) / 10, horas: r1(total * frac), personas: ids.length };
      for (const id of ids) out.fracciones[id] = (out.fracciones[id] || 0) + frac / ids.length;
    }
  }
  for (const [id, f] of Object.entries(out.fracciones)) out.horas[id] = r1(total * f);
  return out;
}

/**
 * Cuota de cada miembro sobre las horas de una tarea SIN consultor asignado.
 * Devuelve {perfil_id: fracción}. Suma 1 salvo que no haya nadie.
 *   1. Si alguien tiene horas_asignadas, en proporción a ellas.
 *   2. Si el proyecto tiene reparto por nivel (de la oferta), por niveles.
 *   3. Si no, a partes iguales entre quienes ejecutan.
 */
export function cuotasEquipo(miembros, reparto = null) {
  if (!miembros.length) return {};
  const totalAsig = miembros.reduce((a, m) => a + m.horas_asignadas, 0);
  if (totalAsig > 0) {
    const out = {};
    for (const m of miembros) if (m.horas_asignadas > 0) out[m.perfil_id] = (out[m.perfil_id] || 0) + m.horas_asignadas / totalAsig;
    return out;
  }
  return horasSugeridasEquipo(1, reparto, miembros).fracciones;
}

/**
 * Cálculo completo. Devuelve una fila por consultor con sus proyectos, sus
 * totales, sus bolsas internas y el veredicto de capacidad.
 *
 * @param {object} d  tablas cargadas: consultores, proyectos, equipo, tareas,
 *                    sesiones, internas, clientes, empresas, festivos,
 *                    vacaciones (todas las personas), hoy (ISO opcional)
 */
export function controlHoras(d) {
  const hoy = d.hoy || toISO(new Date());
  const hoyD = new Date(`${hoy}T12:00:00`);
  const year = hoyD.getFullYear(), month = hoyD.getMonth();
  const mesActual = hoy.slice(0, 7);
  const festivosSet = new Set((d.festivos || []).map((f) => S(f.fecha).slice(0, 10)));

  const consultores = (d.consultores || []).filter((c) => c.activo !== false);
  const proyectos = (d.proyectos || []).filter(proyectoVivo);
  const tareas = d.tareas || [];
  const sesiones = (d.sesiones || []).filter((s) => s.estado !== 'anulada');
  const internas = d.internas || [];

  // Nombre de cliente de un proyecto: empresa (por CIF) → cliente → «—».
  const clientePor = Object.fromEntries((d.clientes || []).map((c) => [S(c.id), c]));
  const cif = (x) => S(x).toUpperCase().replace(/[\s.-]/g, '');
  const empresaPorCif = {};
  for (const e of d.empresas || []) if (e.cif) empresaPorCif[cif(e.cif)] = e;
  const nombreCliente = (p) => {
    const c = clientePor[S(p.cliente_id)];
    const e = c?.cif ? empresaPorCif[cif(c.cif)] : null;
    return e?.nombre_comercial || e?.nombre || c?.empresa || '—';
  };

  // ── Comprometidas por consultor y proyecto ──
  // {consultorId: {proyectoId: {horas, directas, nTareas}}}
  const comp = {};
  const suma = (cid, pid, h, directa) => {
    const c = (comp[cid] = comp[cid] || {});
    const p = (c[pid] = c[pid] || { horas: 0, directas: 0, nTareas: 0 });
    p.horas += h; if (directa) p.directas += h; p.nTareas += 1;
  };
  const equipoPorProyecto = {};
  const cuotasPorProyecto = {};
  for (const p of proyectos) {
    equipoPorProyecto[S(p.id)] = equipoDe(p, d.equipo, d.consultores);
    cuotasPorProyecto[S(p.id)] = cuotasEquipo(equipoPorProyecto[S(p.id)], p.reparto_niveles);
  }
  const tareasPorProyecto = {};
  for (const t of tareas) {
    const pid = S(t.proyecto_id);
    if (!pid || !cuotasPorProyecto[pid]) continue;
    (tareasPorProyecto[pid] = tareasPorProyecto[pid] || []).push(t);
    const h = num(t.horas);
    if (t.consultor_id) { suma(S(t.consultor_id), pid, h, true); continue; }
    for (const [cid, q] of Object.entries(cuotasPorProyecto[pid])) suma(cid, pid, h * q, false);
  }

  // ── Sesiones por consultor ──
  const tareaPor = Object.fromEntries(tareas.map((t) => [S(t.id), t]));
  const internaPor = Object.fromEntries(internas.map((t) => [S(t.id), t]));
  const sesPor = {};   // consultorId → [{...s, proyecto_id, bolsa}]
  for (const s of sesiones) {
    const cid = S(s.consultor_id);
    if (!cid) continue;
    let pid = null, bolsa = 'produccion', interna = null;
    if (s.cliente_tarea_id) pid = S(tareaPor[S(s.cliente_tarea_id)]?.proyecto_id || '') || null;
    else if (s.tarea_interna_id) { interna = internaPor[S(s.tarea_interna_id)] || null; bolsa = tipoBolsa(interna?.tipo || 'gestion'); }
    (sesPor[cid] = sesPor[cid] || []).push({ ...s, proyecto_id: pid, bolsa, interna, horas: num(s.horas), mes: S(s.fecha).slice(0, 7) });
  }

  // Referencia de «proyecto típico»: carga mensual media de los proyectos vivos
  // con fechas. Es lo que se usa para decir «le caben N proyectos más».
  const cargasTipicas = proyectos.map((p) => {
    const total = (tareasPorProyecto[S(p.id)] || []).reduce((a, t) => a + num(t.horas), 0);
    const meses = mesesEntre(p.fecha_inicio, finProyecto(p));
    return total > 0 && meses > 0 ? total / meses : null;
  }).filter((x) => x != null);
  const proyectoTipico = cargasTipicas.length ? cargasTipicas.reduce((a, b) => a + b, 0) / cargasTipicas.length : null;

  // Horizonte de capacidad: desde este mes hasta el fin del proyecto vivo
  // más largo (mínimo, fin de año en curso).
  let finHorizonte = new Date(year, 11, 1);
  for (const p of proyectos) {
    const f = finProyecto(p);
    if (f && f > hoy) { const fd = new Date(`${f}T12:00:00`); if (fd > finHorizonte) finHorizonte = fd; }
  }

  const filas = consultores.map((c) => {
    const cid = S(c.id);
    const pct = c.pct_jornada ?? 100;
    const vacSet = new Set((d.vacaciones || []).filter((v) => S(v.consultor_id) === cid).map((v) => S(v.fecha).slice(0, 10)));
    const capMes = capacidadMes(year, month, festivosSet, vacSet, pct);
    const capHorizonte = capacidadRango(new Date(year, month, 1), finHorizonte, festivosSet, vacSet, pct);
    const misSes = sesPor[cid] || [];

    // Proyectos: los que tienen comprometidas para esta persona, más aquellos
    // en los que está en el equipo aunque no tengan tareas todavía.
    const ids = new Set(Object.keys(comp[cid] || {}));
    for (const p of proyectos) if (equipoPorProyecto[S(p.id)].some((m) => m.perfil_id === cid)) ids.add(S(p.id));
    for (const s of misSes) if (s.proyecto_id) ids.add(s.proyecto_id);

    const filasProy = [...ids].map((pid) => {
      const p = proyectos.find((x) => S(x.id) === pid);
      if (!p) return null;
      const k = comp[cid]?.[pid] || { horas: 0, directas: 0, nTareas: 0 };
      const ss = misSes.filter((s) => s.proyecto_id === pid);
      const programadas = ss.reduce((a, s) => a + s.horas, 0);
      const ejecutadas = ss.filter((s) => s.estado === 'hecha').reduce((a, s) => a + s.horas, 0);
      const comprometidas = k.horas;
      const pendientes = Math.max(0, comprometidas - ejecutadas);
      const sinProgramar = Math.max(0, comprometidas - programadas);
      const fin = finProyecto(p);
      const mesesRestantes = Math.max(1, mesesEntre(hoy, fin) || 1);
      const miembro = equipoPorProyecto[pid].find((m) => m.perfil_id === cid);
      const cuota = cuotasPorProyecto[pid][cid] || 0;
      return {
        id: pid, codigo: p.codigo || '', nombre: p.nombre || '', cliente: nombreCliente(p),
        modelo: p.modelo || '', normas: p.normas || [], estado: p.estado || '',
        fechaInicio: p.fecha_inicio || null, fechaFin: fin,
        papel: miembro?.papel || (k.directas ? 'tareas asignadas' : 'sin equipo'),
        nTareas: k.nTareas,
        comprometidas: r1(comprometidas), programadas: r1(programadas), ejecutadas: r1(ejecutadas),
        pendientes: r1(pendientes), sinProgramar: r1(sinProgramar),
        mesesRestantes: Math.round(mesesRestantes * 10) / 10,
        // Lo que exige el proyecto de aquí a su fin, al mes. Es la cifra que
        // manda en el veredicto: si se ha ido retrasando, sube.
        cargaMensual: r1(pendientes / mesesRestantes),
        // Y lo que se previó al venderlo: comprometidas repartidas en toda su
        // duración. La diferencia entre ambas es el retraso acumulado.
        ritmoPrevisto: r1(comprometidas / Math.max(1, mesesEntre(p.fecha_inicio, fin) || 1)),
        // De dónde sale la cifra de comprometidas.
        reparto: k.directas && k.directas === k.horas ? 'directo'
          : cuota > 0 ? `${Math.round(cuota * 100)} % del proyecto${repartoValido(p.reparto_niveles) && !equipoPorProyecto[pid].some((m) => m.horas_asignadas > 0) ? ` · por nivel${miembro?.nivel ? ` (${miembro.nivel})` : ''}` : ''}` : 'sin reparto',
        nivel: miembro?.nivel || null,
        // Fecha prevista de la auditoría externa (certificación o renovación).
        auditoria: p.fecha_auditoria_externa || p.fecha_certificacion || p.fecha_limite || null,
        avancePct: comprometidas > 0 ? Math.min(100, Math.round((ejecutadas / comprometidas) * 100)) : null,
      };
    }).filter(Boolean).sort((a, b) => b.cargaMensual - a.cargaMensual);

    const total = filasProy.reduce((a, p) => ({
      comprometidas: a.comprometidas + p.comprometidas, programadas: a.programadas + p.programadas,
      ejecutadas: a.ejecutadas + p.ejecutadas, pendientes: a.pendientes + p.pendientes,
      sinProgramar: a.sinProgramar + p.sinProgramar, cargaMensual: a.cargaMensual + p.cargaMensual,
    }), { comprometidas: 0, programadas: 0, ejecutadas: 0, pendientes: 0, sinProgramar: 0, cargaMensual: 0 });
    for (const k of Object.keys(total)) total[k] = r1(total[k]);

    // Este mes, por bolsa: lo programado y lo hecho.
    const delMes = misSes.filter((s) => s.mes === mesActual);
    const bolsa = (b) => {
      const ss = delMes.filter((s) => s.bolsa === b);
      return { programadas: r1(ss.reduce((a, s) => a + s.horas, 0)), ejecutadas: r1(ss.filter((s) => s.estado === 'hecha').reduce((a, s) => a + s.horas, 0)) };
    };
    const mes = {
      produccion: { ...bolsa('produccion'), capacidad: r1(capMes.produccion) },
      gestion: { ...bolsa('gestion'), capacidad: r1(capMes.gestion) },
      proceso_interno: { ...bolsa('proceso_interno'), capacidad: r1(capMes.proceso_interno) },
      jornada: r1(capMes.jornada), laborables: capMes.laborables, diasVacaciones: capMes.diasVacaciones,
    };

    // Tareas internas abiertas de esta persona, con sus horas.
    const misInternas = internas.filter((t) => S(t.consultor_id) === cid).map((t) => {
      const ss = misSes.filter((s) => S(s.tarea_interna_id) === S(t.id));
      return {
        ...t, bolsa: tipoBolsa(t.tipo),
        programadas: r1(ss.reduce((a, s) => a + s.horas, 0)),
        ejecutadas: r1(ss.filter((s) => s.estado === 'hecha').reduce((a, s) => a + s.horas, 0)),
      };
    });

    // ── El veredicto ──
    // Margen mensual = capacidad de producción del mes − carga mensual que
    // exigen los proyectos vivos hasta su fin. Si además queda hueco para un
    // proyecto como los que ya hay, «entra».
    const margenMensual = r1(capMes.produccion - total.cargaMensual);
    const ocupacionPct = capMes.produccion > 0 ? Math.round((total.cargaMensual / capMes.produccion) * 100) : null;
    const cabenProyectos = proyectoTipico && margenMensual > 0 ? Math.floor(margenMensual / proyectoTipico) : 0;
    const veredicto = margenMensual <= 0 ? 'lleno'
      : (proyectoTipico ? margenMensual >= proyectoTipico : margenMensual >= capMes.produccion * 0.2) ? 'entra'
      : 'justo';

    return {
      id: cid, nombre: `${c.nombre || ''} ${c.apellidos || ''}`.trim() || c.email, nivel: c.nivel || '', rol: c.rol,
      pctJornada: pct, capacidadClientes: c.capacidad_clientes ?? null,
      proyectos: filasProy, total, mes, internas: misInternas,
      horizonte: {
        hasta: toISO(new Date(finHorizonte.getFullYear(), finHorizonte.getMonth() + 1, 0)),
        meses: capHorizonte.meses,
        capacidadProduccion: r1(capHorizonte.produccion),
        pendientes: total.pendientes,
        margen: r1(capHorizonte.produccion - total.pendientes),
      },
      margenMensual, ocupacionPct, cabenProyectos, veredicto,
    };
  });

  return {
    hoy, mesActual, reparto: repartoJornada(), proyectoTipico: proyectoTipico ? r1(proyectoTipico) : null,
    consultores: filas.sort((a, b) => a.nombre.localeCompare(b.nombre)),
    // Proyectos vivos sin nadie que los ejecute: horas que no cuentan en nadie.
    sinEquipo: proyectos.filter((p) => !Object.keys(cuotasPorProyecto[S(p.id)]).length
      && !(tareasPorProyecto[S(p.id)] || []).some((t) => t.consultor_id))
      .map((p) => ({ id: p.id, codigo: p.codigo, nombre: p.nombre, cliente: nombreCliente(p),
        horas: r1((tareasPorProyecto[S(p.id)] || []).reduce((a, t) => a + num(t.horas), 0)) })),
  };
}

// Se lee como disponibilidad, no como «le entra un proyecto»: alta (le cabe
// otro proyecto como los actuales), media (va justo) o baja (sin capacidad).
export const VEREDICTO = {
  entra: { etq: 'Disponibilidad alta', corto: 'alta', tono: 'text-emerald-300', fondo: 'bg-emerald-500/15 border-emerald-400/40' },
  justo: { etq: 'Disponibilidad media', corto: 'media', tono: 'text-amber-200', fondo: 'bg-amber-400/15 border-amber-300/40' },
  lleno: { etq: 'Disponibilidad baja', corto: 'baja', tono: 'text-red-300', fondo: 'bg-red-500/15 border-red-400/40' },
};
