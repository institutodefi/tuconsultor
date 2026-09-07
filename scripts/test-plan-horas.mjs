// Pruebas de lib/planHoras.js: horas por planificar hasta la certificación y
// su prorrateo mensual. Ejecutar: node scripts/test-plan-horas.mjs
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const L = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'consultify', 'app', 'src', 'lib') + '/';
const P = await import(L + 'planHoras.js');
let fallos = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗ FALLO'} ${m}`); if (!c) fallos++; };
const suma = (arr, k) => Math.round(arr.reduce((a, x) => a + x[k], 0) * 10) / 10;

const hoy = '2026-09-07';

console.log('── Prorrateo por meses ──');
let m = P.prorratearPorMeses(100, hoy, '2026-11-30');
ok(m.length === 3, `sep→nov son 3 meses (${m.length})`);
ok(suma(m, 'horas') === 100, `la suma cuadra con el total (${suma(m, 'horas')})`);
ok(m[0].dias === 24 && m[1].dias === 31 && m[2].dias === 30, `días: ${m.map((x) => x.dias).join(', ')} (24, 31, 30)`);
ok(m[0].horas < m[1].horas, 'septiembre (parcial) lleva menos que octubre (entero)');
m = P.prorratearPorMeses(30, hoy, '2026-09-20');
ok(m.length === 1 && m[0].horas === 30, 'objetivo en el mismo mes: un solo tramo con todo');
m = P.prorratearPorMeses(30, hoy, '2026-08-01');
ok(m.length === 1 && m[0].retraso && m[0].horas === 30, 'objetivo pasado: todo en el mes actual, marcado como retraso');
ok(P.prorratearPorMeses(30, hoy, null).length === 1, 'sin objetivo: un tramo (el mes actual)');

console.log('\n── Un proyecto ──');
const proyecto = { id: 'p1', estado: 'activo', fecha_inicio: '2026-06-01', fecha_certificacion: '2026-12-15', fecha_fin: '2027-05-31' };
const tareas = [
  { id: 't1', proyecto_id: 'p1', horas: 40 },
  { id: 't2', proyecto_id: 'p1', horas: 20 },
  { id: 't3', proyecto_id: 'p1', horas: 10, estado: 'cancelada' },
  { id: 't9', proyecto_id: 'otro', horas: 99 },
];
const sesiones = [
  { id: 's1', cliente_tarea_id: 't1', fecha: '2026-08-10', horas: 8, estado: 'hecha' },
  { id: 's2', cliente_tarea_id: 't1', fecha: '2026-09-15', horas: 4, estado: 'programada' },
  { id: 's3', cliente_tarea_id: 't2', fecha: '2026-10-05', horas: 6, estado: 'programada' },
  { id: 's4', cliente_tarea_id: 't9', fecha: '2026-09-15', horas: 50, estado: 'programada' },
];
const r = P.planHastaCertificacion(proyecto, tareas, sesiones, hoy);
ok(r.objetivo === '2026-12-15', `objetivo = certificación prevista (${r.objetivo})`);
ok(r.comprometidas === 60, `comprometidas 60 (sin la cancelada ni las de otro proyecto): ${r.comprometidas}`);
ok(r.ejecutadas === 8 && r.programadas === 10, `ejecutadas 8 · programadas 10: ${r.ejecutadas} · ${r.programadas}`);
ok(r.sinPlanificar === 42, `sin planificar = 60 − 8 − 10 = 42: ${r.sinPlanificar}`);
ok(r.pendientes === 52, `pendientes = 60 − 8 = 52: ${r.pendientes}`);
ok(r.dias === 99, `días hasta la certificación: ${r.dias}`);
ok(r.meses.length === 4, `meses del prorrateo sep–dic: ${r.meses.length}`);
ok(suma(r.meses, 'horas') === 42, `el prorrateo suma las 42: ${suma(r.meses, 'horas')}`);
ok(r.meses[0].programadas === 4 && r.meses[1].programadas === 6, 'lo ya programado aparece en su mes (sep 4, oct 6)');
ok(r.porMes > 12 && r.porMes < 14, `ritmo ≈ 42 h / 3,25 meses ≈ 12,9 h/mes: ${r.porMes}`);
ok(r.avancePct === 13, `avance 8/60 = 13 %: ${r.avancePct}`);

const sinFecha = P.planHastaCertificacion({ id: 'p1', estado: 'activo' }, tareas, sesiones, hoy);
ok(sinFecha.sinFecha && sinFecha.porMes === null && sinFecha.meses.length === 0, 'sin fecha objetivo: sin ritmo ni meses, marcado sinFecha');

const pasado = P.planHastaCertificacion({ id: 'p1', estado: 'activo', fecha_certificacion: '2026-08-01' }, tareas, sesiones, hoy);
ok(pasado.retraso && pasado.porMes === 42, `certificación pasada con horas sin planificar: retraso, todo ya (${pasado.porMes})`);

console.log('\n── Cartera ──');
const c = P.planCartera([proyecto, { id: 'p2', estado: 'cerrado', fecha_certificacion: '2026-10-01' }, { id: 'otro', estado: 'activo', fecha_certificacion: '2026-10-31' }], tareas, sesiones, hoy);
ok(c.filas.length === 2, `solo los vivos (${c.filas.length})`);
ok(c.total.sinPlanificar === 42 + 49, `total sin planificar 42 + 49 = ${c.total.sinPlanificar}`);
ok(c.meses.length === 4 && c.meses[0].mes === '2026-09', `meses de la cartera sep–dic: ${c.meses.map((x) => x.etq).join(', ')}`);
ok(suma(c.meses, 'horas') === 91, `la suma mensual de la cartera cuadra (${suma(c.meses, 'horas')})`);


console.log('\n── Por persona (equipo + reparto de la oferta) ──');
{
  const P = await import(L + 'planHoras.js');
  const pr = { id: 'cece', estado: 'activo', fecha_inicio: '2026-01-01', fecha_fin: '2027-01-02', fecha_limite: '2026-12-10', reparto_niveles: { J1: 90, Senior: 10 } };
  const tareas = [{ id: 't1', proyecto_id: 'cece', horas: 400 }, { id: 't2', proyecto_id: 'cece', horas: 72 }];
  const equipo = [{ proyecto_id: 'cece', perfil_id: 'laura', papel: 'consultor' }, { proyecto_id: 'cece', perfil_id: 'fatima', papel: 'responsable' }];
  const perfiles = [{ id: 'laura', nombre: 'Laura', apellidos: 'Vargas', nivel: 'J1' }, { id: 'fatima', nombre: 'Fátima', nivel: 'Senior' }];
  const r = P.planHastaCertificacion(pr, tareas, [], '2026-09-07', equipo, perfiles);
  ok(r.porPersona.length === 2 && r.porPersona[0].nombre === 'Laura Vargas' && r.porPersona[0].horas === 424.8 && r.porPersona[1].horas === 47.2, `sin planificar por persona según la oferta: ${r.porPersona.map((x) => `${x.nombre} ${x.horas} h`).join(' · ')}`);
  ok(r.porPersona[0].porMes > 0 && Math.abs(r.porPersona[0].porMes + r.porPersona[1].porMes - r.porMes) < 0.3, `el ritmo por persona suma el del proyecto (${r.porPersona[0].porMes} + ${r.porPersona[1].porMes} ≈ ${r.porMes})`);
  const r2 = P.planHastaCertificacion(pr, tareas, [], '2026-09-07', [{ ...equipo[0], horas_asignadas: 300 }, { ...equipo[1], horas_asignadas: 100 }], perfiles);
  ok(r2.porPersona[0].pct === 75 && r2.porPersona[1].pct === 25, 'las horas asignadas en el equipo mandan sobre el reparto');
  ok(P.planHastaCertificacion(pr, tareas, [], '2026-09-07').porPersona === null, 'sin equipo cargado no se inventa nada (null)');
}

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo correcto');
process.exit(fallos ? 1 : 0);
