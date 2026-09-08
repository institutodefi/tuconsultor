// Pruebas del plan automático (lib/planAutomatico.js).
import { planAutomatico, tipoCierre, faseDe, fechasObjetivo } from '../consultify/app/src/lib/planAutomatico.js';

let n = 0;
const ok = (c, m) => { n++; if (!c) { console.error('FALLA:', m); process.exit(1); } };

ok(tipoCierre({ subproceso: 'S2 PE2 AUDITORÍA INTERNA' }) === 'auditoria', 'auditoría interna');
ok(tipoCierre({ subproceso: 'S3 PE2 REVISIÓN POR LA DIRECCIÓN' }) === 'revision', 'revisión por la dirección');
ok(tipoCierre({ subproceso: 'S1 PE2 ANÁLISIS DE DATOS' }) === null, 'análisis de datos no es cierre');
ok(faseDe({ subproceso: 'S1 PE1 CONTEXTO' }) < faseDe({ subproceso: 'S1 PA1 PERSONAS' }), 'PE1 antes que PA');
ok(faseDe({ subproceso: 'S1 PA1 PERSONAS' }) < faseDe({ subproceso: 'S1 PE3 NO CONFORMIDADES' }), 'PA antes que PE3');
ok(faseDe({ subproceso: 'S1 PE3 NO CONFORMIDADES' }) < faseDe({ subproceso: 'S1 PE2 ANÁLISIS' }), 'PE3 antes que PE2');
ok(fechasObjetivo({ fecha_limite: '2026-12-01' }).auditoria === '2026-12-01', 'fecha límite como auditoría');

const proyecto = { id: 'p', fecha_auditoria_externa: '2026-12-15', fecha_certificacion: '2026-12-15' };
const tareas = [
  { id: 't1', codigo: 'X-9001-01', subproceso: 'S1 PE1 GESTIÓN DEL CONTEXTO', horas: 6, consultor_id: 'a' },
  { id: 't2', codigo: 'X-9001-02', subproceso: 'S1 PA1 GESTIÓN DE PERSONAS', horas: 12, consultor_id: 'a' },
  { id: 't3', codigo: 'X-9001-03', subproceso: 'S1 PE3 NO CONFORMIDADES', horas: 4, consultor_id: null },
  { id: 't4', codigo: 'X-9001-04', subproceso: 'S2 PE2 AUDITORÍA INTERNA', horas: 8, consultor_id: 'a' },
  { id: 't5', codigo: 'X-9001-05', subproceso: 'S3 PE2 REVISIÓN POR LA DIRECCIÓN', horas: 3, consultor_id: 'a' },
  { id: 't6', codigo: 'X-9001-06', subproceso: 'S1 PE1 RIESGOS', horas: 4, consultor_id: 'a', hecha: true },
];
const sesiones = [
  // inmediata (dentro de 15 días): se queda
  { id: 's1', cliente_tarea_id: 't1', consultor_id: 'a', fecha: '2026-09-10', hora_inicio: '09:00', hora_fin: '11:00', horas: 2, estado: 'programada' },
  // lejana: se rehace
  { id: 's2', cliente_tarea_id: 't2', consultor_id: 'a', fecha: '2026-11-02', hora_inicio: '09:00', hora_fin: '13:00', horas: 4, estado: 'programada' },
  // hecha lejana (raro pero posible): se queda
  { id: 's3', cliente_tarea_id: 't2', consultor_id: 'a', fecha: '2026-10-01', hora_inicio: '09:00', hora_fin: '11:00', horas: 2, estado: 'hecha' },
  // de otro proyecto, ocupa a «a» un día entero
  { id: 's4', cliente_tarea_id: 'otra', consultor_id: 'a', fecha: '2026-10-05', hora_inicio: '09:00', hora_fin: '17:00', horas: 8, estado: 'programada' },
];
const r = planAutomatico({ proyecto, tareas, sesiones, gente: [{ id: 'a' }, { id: 'b' }], responsableDefecto: 'b', hoy: '2026-09-08', festivos: new Set(['2026-10-12']), horasTeoricas: (t) => t.horas });
ok(!r.error, `sin error: ${r.error}`);
ok(r.quitar.length === 1 && r.quitar[0].id === 's2', 'solo se rehace la sesión lejana programada');
ok(r.nuevas.every((s) => s.fecha >= '2026-09-24'), `todo a más de 15 días vista (${r.nuevas[0]?.fecha})`);
const de = (id) => r.nuevas.filter((s) => s.cliente_tarea_id === id);
const suma = (id) => de(id).reduce((a, s) => a + s.horas, 0);
ok(suma('t1') === 4, `t1: 6 h − 2 h ya programadas = 4 h (${suma('t1')})`);
ok(suma('t2') === 10, `t2: 12 h − 2 h hechas = 10 h (${suma('t2')})`);
ok(suma('t3') === 4 && de('t3').every((s) => s.consultor_id === 'b'), 'sin responsable → persona por defecto');
ok(suma('t4') === 8 && suma('t5') === 3, 'cierre completo');
ok(de('t6').length === 0, 'la hecha no se programa');
const rev = de('t5').map((s) => s.fecha).sort();
const aud = de('t4').map((s) => s.fecha).sort();
ok(rev[rev.length - 1] === '2026-12-08', `revisión termina ≈ 7 días antes de la certificación (${rev[rev.length - 1]})`);
ok(aud[aud.length - 1] < rev[0], `auditoría interna antes de la revisión (${aud[aud.length - 1]} < ${rev[0]})`);
const resto = r.nuevas.filter((s) => !['t4', 't5'].includes(s.cliente_tarea_id)).map((s) => s.fecha).sort();
ok(resto[resto.length - 1] < aud[0], `el resto termina antes de la auditoría interna (${resto[resto.length - 1]} < ${aud[0]})`);
ok(de('t1')[0].fecha <= de('t2')[0].fecha && de('t2')[de('t2').length - 1].fecha <= de('t3')[0].fecha, 'orden por fase: PE1 → PA → PE3');
ok(!r.nuevas.some((s) => s.fecha === '2026-10-05' && s.consultor_id === 'a'), 'no se mete a «a» el día que ya tiene 8 h de otro proyecto');
ok(!r.nuevas.some((s) => s.fecha === '2026-10-12'), 'festivo libre');
ok(!r.nuevas.some((s) => [0, 6].includes(new Date(`${s.fecha}T12:00:00`).getDay())), 'sin fines de semana');
// Sin solapes por persona
for (const p of ['a', 'b']) {
  const mias = r.nuevas.filter((s) => s.consultor_id === p).sort((x, y) => x.fecha.localeCompare(y.fecha) || x.hora_inicio.localeCompare(y.hora_inicio));
  for (let i = 1; i < mias.length; i++) if (mias[i].fecha === mias[i - 1].fecha) ok(mias[i].hora_inicio >= mias[i - 1].hora_fin, `sin solape ${p} ${mias[i].fecha}`);
}
// Reparto uniforme: las horas no se apelotonan en la primera semana
const primeraSemana = resto.filter((f) => f <= '2026-10-02').length;
ok(primeraSemana < resto.length, `repartido en el tiempo (${primeraSemana}/${resto.length} en la primera semana)`);

// Sin fecha → error claro
ok(planAutomatico({ proyecto: {}, tareas, sesiones: [], gente: [], hoy: '2026-09-08' }).error, 'sin fecha de auditoría → error');
// Certificación demasiado cerca → error
ok(planAutomatico({ proyecto: { fecha_certificacion: '2026-09-20' }, tareas, sesiones: [], gente: [{ id: 'a' }], hoy: '2026-09-08' }).error, 'certificación a 12 días → error');

console.log(`plan automático: ${n} comprobaciones ok`);
console.log(r.resumen, r.avisos);
console.log(r.nuevas.map((s) => `${s.fecha} ${s.hora_inicio}-${s.hora_fin} ${s._codigo} ${s.consultor_id}`).join('\n'));
