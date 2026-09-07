// Pruebas del control de horas (lib/controlHoras.js) y del reparto de jornada
// (lib/jornada.js). Sin Supabase: todo son funciones puras sobre tablas en
// memoria. Ejecutar: node scripts/test-control-horas.mjs
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const L = path.join(AQUI, '..', 'consultify', 'app', 'src', 'lib') + '/';
const J = await import(L + 'jornada.js');
const { controlHoras, cuotasEquipo, finProyecto, mesesEntre } = await import(L + 'controlHoras.js');

let fallos = 0;
const ok = (c, msg) => { console.log(`${c ? '✓' : '✗ FALLO'} ${msg}`); if (!c) fallos += 1; };
const cerca = (a, b, tol = 0.6) => Math.abs(a - b) <= tol;

console.log('── 1 · Reparto de la jornada ──');
ok(J.PCT_PRODUCTIVO === 0.7 && J.PCT_GESTION === 0.1 && J.PCT_PROC_INTERNO === 0.2, 'por defecto 70 / 10 / 20');
ok(J.TIPOS_TAREA.length === 3, 'tres bolsas');
ok(J.tipoBolsa('coordinacion') === 'gestion' && J.TIPO_BY_ID.coordinacion === J.TIPO_BY_ID.gestion, 'coordinación cuenta como gestión');
ok(J.aplicarReparto({ pct_jornada_proyectos: 60, pct_jornada_gestion: 15, pct_jornada_procesos: 25 }) === true && J.PCT_PRODUCTIVO === 0.6, 'aplica un reparto de la BD que suma 100');
ok(J.aplicarReparto({ pct_jornada_proyectos: 60, pct_jornada_gestion: 10, pct_jornada_procesos: 10 }) === false && J.PCT_PRODUCTIVO === 0.6, 'ignora un reparto que no suma 100');
J.aplicarReparto({ pct_jornada_proyectos: 70, pct_jornada_gestion: 10, pct_jornada_procesos: 20 });

console.log('── 2 · Capacidad de un mes ──');
const festivos = new Set(J.FESTIVOS_2026.map((f) => f.fecha));
{
  // Septiembre 2026: 22 laborables. Del 1 al 15 jornada intensiva (7 h), después 8 h.
  const c = J.capacidadMes(2026, 8, festivos, new Set(), 100);
  ok(c.laborables === 22, `septiembre 2026: ${c.laborables} laborables (22)`);
  ok(c.jornada === 11 * 7 + 11 * 8, `jornada ${c.jornada} h (11×7 + 11×8 = 165)`);
  ok(cerca(c.produccion, 165 * 0.7) && cerca(c.gestion, 16.5) && cerca(c.proceso_interno, 33), `70/10/20 → ${c.produccion.toFixed(1)} / ${c.gestion.toFixed(1)} / ${c.proceso_interno.toFixed(1)}`);
  const media = J.capacidadMes(2026, 8, festivos, new Set(), 50);
  ok(cerca(media.jornada, 82.5), `media jornada: ${media.jornada} h`);
  const conVac = J.capacidadMes(2026, 8, festivos, new Set(['2026-09-21', '2026-09-22']), 100);
  ok(conVac.jornada === 165 - 16 && conVac.diasVacaciones === 2, `dos días de vacaciones restan 16 h → ${conVac.jornada}`);
  const oct = J.capacidadMes(2026, 9, festivos, new Set(), 100);
  ok(oct.laborables === 21 && oct.jornada === 168, `octubre 2026: ${oct.laborables} laborables (12-oct festivo), ${oct.jornada} h`);
  const rango = J.capacidadRango(new Date(2026, 8, 1), new Date(2026, 9, 1), festivos, new Set(), 100);
  ok(rango.meses === 2 && rango.jornada === 165 + 168, `rango sep–oct: ${rango.meses} meses, ${rango.jornada} h`);
}

console.log('── 3 · Reparto entre el equipo ──');
ok(JSON.stringify(cuotasEquipo([])) === '{}', 'sin equipo, sin cuotas');
{
  const q = cuotasEquipo([{ perfil_id: 'a', papel: 'responsable', horas_asignadas: 0 }, { perfil_id: 'b', papel: 'consultor', horas_asignadas: 0 }, { perfil_id: 'c', papel: 'consultor', horas_asignadas: 0 }]);
  ok(q.a === undefined && q.b === 0.5 && q.c === 0.5, 'el responsable no ejecuta: 50/50 entre los dos consultores');
}
{
  const q = cuotasEquipo([{ perfil_id: 'a', papel: 'responsable', horas_asignadas: 0 }]);
  ok(q.a === 1, 'si solo hay responsable, es suyo');
}
{
  const q = cuotasEquipo([{ perfil_id: 'b', papel: 'consultor', horas_asignadas: 30 }, { perfil_id: 'c', papel: 'consultor', horas_asignadas: 10 }]);
  ok(q.b === 0.75 && q.c === 0.25, 'con horas_asignadas, en proporción (75/25)');
}
ok(finProyecto({ fecha_fin: '2027-01-02' }) === '2027-01-02', 'fin = fecha_fin');
ok(finProyecto({ fecha_inicio: '2026-01-15', meses_estimados: 3 }) === '2026-04-15', 'fin = inicio + meses_estimados');
ok(Math.round(mesesEntre('2026-01-01', '2027-01-01')) === 12, '12 meses en un año');

console.log('── 4 · Control de horas: caso real (CECE + DICS) ──');
const consultores = [
  { id: 'L', nombre: 'Laura', rol: 'consultor', activo: true, pct_jornada: 100 },
  { id: 'D', nombre: 'Daniela', rol: 'consultor', activo: true, pct_jornada: 100 },
  { id: 'F', nombre: 'Fátima', rol: 'admin', activo: true, pct_jornada: 100 },
];
const proyectos = [
  { id: 'P1', codigo: 'CECE-2026-REL-9-14-27', nombre: 'CECE', cliente_id: 'C1', estado: 'activo', modelo: 'Relación', normas: ['9001', '14001', '27001'], fecha_inicio: '2026-01-01', fecha_fin: '2027-01-02', meses_estimados: 3 },
  { id: 'P2', codigo: 'DICS-2026-REL-9-14-27', nombre: 'DICS', cliente_id: 'C2', estado: 'activo', modelo: 'Implantación', normas: ['9001', '14001', '27001'], fecha_inicio: '2026-02-01', fecha_fin: '2027-02-02', meses_estimados: 3 },
  { id: 'P3', codigo: 'VIEJO', nombre: 'cerrado', cliente_id: 'C1', estado: 'cerrado', fecha_inicio: '2025-01-01', fecha_fin: '2025-12-31' },
];
const equipo = [
  { proyecto_id: 'P1', perfil_id: 'L', papel: 'consultor' }, { proyecto_id: 'P1', perfil_id: 'F', papel: 'responsable' },
  { proyecto_id: 'P2', perfil_id: 'D', papel: 'consultor' }, { proyecto_id: 'P2', perfil_id: 'L', papel: 'consultor' }, { proyecto_id: 'P2', perfil_id: 'F', papel: 'consultor' },
  { proyecto_id: 'P3', perfil_id: 'L', papel: 'consultor' },
];
const tareas = [];
for (let i = 0; i < 65; i++) tareas.push({ id: `t1-${i}`, proyecto_id: 'P1', horas: 472 / 65 });
for (let i = 0; i < 65; i++) tareas.push({ id: `t2-${i}`, proyecto_id: 'P2', horas: 267 / 65 });
tareas.push({ id: 'tx', proyecto_id: 'P3', horas: 100 });               // proyecto cerrado: no cuenta
tareas.push({ id: 'td', proyecto_id: 'P2', horas: 9, consultor_id: 'D' }); // asignada a dedo
const internas = [
  { id: 'I1', consultor_id: 'L', tipo: 'gestion', titulo: 'Reunión semanal', horas: 8 },
  { id: 'I2', consultor_id: 'L', tipo: 'proceso_interno', titulo: 'Revisión SG', horas: 10 },
];
const sesiones = [
  { id: 's1', consultor_id: 'L', cliente_tarea_id: 't1-0', fecha: '2026-09-03', horas: 4, estado: 'hecha' },
  { id: 's2', consultor_id: 'L', cliente_tarea_id: 't1-1', fecha: '2026-09-10', horas: 3, estado: 'programada' },
  { id: 's3', consultor_id: 'L', cliente_tarea_id: 't1-2', fecha: '2026-08-20', horas: 5, estado: 'hecha' },
  { id: 's4', consultor_id: 'L', cliente_tarea_id: 't1-3', fecha: '2026-09-11', horas: 2, estado: 'anulada' },
  { id: 's5', consultor_id: 'L', tarea_interna_id: 'I1', fecha: '2026-09-07', horas: 2, estado: 'hecha' },
  { id: 's6', consultor_id: 'L', tarea_interna_id: 'I2', fecha: '2026-09-14', horas: 3, estado: 'programada' },
  { id: 's7', consultor_id: 'D', cliente_tarea_id: 't2-0', fecha: '2026-09-08', horas: 6, estado: 'programada' },
];
const r = controlHoras({ consultores, proyectos, equipo, tareas, sesiones, internas, clientes: [{ id: 'C1', empresa: 'CECE' }, { id: 'C2', empresa: 'DICS', cif: 'B1' }], empresas: [{ id: 'E2', cif: 'B-1', nombre: 'Diseñarte', nombre_comercial: 'DICS SL' }], festivos: J.FESTIVOS_2026, vacaciones: [], hoy: '2026-09-04' });

const L1 = r.consultores.find((c) => c.id === 'L');
const D1 = r.consultores.find((c) => c.id === 'D');
const F1 = r.consultores.find((c) => c.id === 'F');
ok(r.consultores.length === 3, 'una fila por consultor activo');
ok(L1.proyectos.length === 2 && !L1.proyectos.some((p) => p.id === 'P3'), 'Laura: 2 proyectos vivos, el cerrado no aparece');
const cece = L1.proyectos.find((p) => p.id === 'P1');
ok(cece.comprometidas === 472, `CECE: Laura es la única ejecutora → 472 h comprometidas (${cece.comprometidas})`);
ok(cece.programadas === 12 && cece.ejecutadas === 9, `CECE: programadas ${cece.programadas} (4+3+5, sin la anulada) · ejecutadas ${cece.ejecutadas} (4+5)`);
ok(cece.pendientes === 463 && cece.sinProgramar === 460, `CECE: pendientes ${cece.pendientes} · sin programar ${cece.sinProgramar}`);
ok(cerca(cece.mesesRestantes, 4, 0.2) && cerca(cece.cargaMensual, 463 / 3.95, 3), `CECE: quedan ${cece.mesesRestantes} meses → ${cece.cargaMensual} h/mes`);
ok(cece.reparto === '100 % del proyecto', `reparto anotado: «${cece.reparto}»`);
const dics = L1.proyectos.find((p) => p.id === 'P2');
ok(cerca(dics.comprometidas, 267 / 3), `DICS: tres ejecutores → ${dics.comprometidas} h para Laura (267/3 = 89)`);
const dicsD = D1.proyectos.find((p) => p.id === 'P2');
ok(cerca(dicsD.comprometidas, 267 / 3 + 9), `DICS: Daniela suma la tarea asignada a dedo → ${dicsD.comprometidas} (89 + 9)`);
ok(F1.proyectos.find((p) => p.id === 'P1').comprometidas === 0 && F1.proyectos.find((p) => p.id === 'P1').papel === 'responsable', 'Fátima en CECE como responsable: 0 h comprometidas, pero aparece');
ok(L1.total.comprometidas === cece.comprometidas + dics.comprometidas, `total Laura = suma de proyectos (${L1.total.comprometidas})`);

console.log('── 5 · Bolsas del mes y veredicto ──');
ok(L1.mes.produccion.programadas === 7 && L1.mes.produccion.ejecutadas === 4, `septiembre producción: ${L1.mes.produccion.programadas} programadas · ${L1.mes.produccion.ejecutadas} hechas (la de agosto no cuenta)`);
ok(L1.mes.gestion.programadas === 2 && L1.mes.proceso_interno.programadas === 3, `septiembre: gestión ${L1.mes.gestion.programadas} h · procesos internos ${L1.mes.proceso_interno.programadas} h`);
ok(cerca(L1.mes.produccion.capacidad, 115.5) && cerca(L1.mes.gestion.capacidad, 16.5) && cerca(L1.mes.proceso_interno.capacidad, 33), `capacidad del mes: ${L1.mes.produccion.capacidad} / ${L1.mes.gestion.capacidad} / ${L1.mes.proceso_interno.capacidad}`);
ok(L1.internas.length === 2 && L1.internas[0].programadas === 2, 'tareas internas de Laura con sus horas');
ok(L1.margenMensual === Math.round((L1.mes.produccion.capacidad - L1.total.cargaMensual) * 10) / 10, `margen mensual = capacidad − carga (${L1.margenMensual})`);
ok(['entra', 'justo', 'lleno'].includes(L1.veredicto), `veredicto Laura: ${L1.veredicto} (ocupación ${L1.ocupacionPct} %)`);
ok(D1.veredicto === 'entra' && D1.cabenProyectos >= 1, `Daniela con un proyecto pequeño: ${D1.veredicto}, le caben ${D1.cabenProyectos} más como los actuales (típico ${r.proyectoTipico} h/mes)`);
ok(r.horizonte === undefined && L1.horizonte.meses >= 5 && L1.horizonte.hasta >= '2027-02-01', `horizonte hasta ${L1.horizonte.hasta} (${L1.horizonte.meses} meses): ${L1.horizonte.capacidadProduccion} h de producción frente a ${L1.horizonte.pendientes} pendientes`);

console.log('── 6 · Proyecto sin equipo ──');
{
  const r2 = controlHoras({ consultores, proyectos: [{ id: 'PX', codigo: 'X', nombre: 'Sin nadie', estado: 'activo', fecha_inicio: '2026-01-01', fecha_fin: '2026-12-31' }], equipo: [], tareas: [{ id: 'q', proyecto_id: 'PX', horas: 40 }], sesiones: [], internas: [], festivos: [], vacaciones: [], hoy: '2026-09-04' });
  ok(r2.sinEquipo.length === 1 && r2.sinEquipo[0].horas === 40, 'un proyecto sin equipo se avisa aparte con sus horas');
  ok(r2.consultores.every((c) => c.proyectos.length === 0), 'y no cuenta en nadie');
}

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo correcto');
process.exit(fallos ? 1 : 0);
