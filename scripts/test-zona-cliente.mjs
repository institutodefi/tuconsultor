// Pruebas de lib/zonaCliente.js. Ejecutar: node scripts/test-zona-cliente.mjs
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const L = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'consultify', 'app', 'src', 'lib') + '/';
const Z = await import(L + 'zonaCliente.js');
let fallos = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗ FALLO'} ${m}`); if (!c) fallos++; };

const hoy = '2026-09-07';
let f = Z.funcionesDe({ funciones: null });
ok(!f.pm_tool && f.datos_cliente && f.procesos.length === 0, 'sin funciones: PM tool apagada, datos del cliente encendidos');
f = Z.funcionesDe({ funciones: '{"pm_tool":true,"procesos":["PE1","PA4"],"datos_cliente":false}' });
ok(f.pm_tool && !f.datos_cliente && f.procesos.join() === 'PE1,PA4', 'funciones en texto JSON');
ok(Z.codigoProceso({ proceso: 'PE1 PLANIFICACIÓN ESTRATÉGICA' }) === 'PE1' && Z.codigoProceso({ proceso: 'PM COORDINACIÓN' }) === 'PM' && Z.codigoProceso({ bloque: 'PA' }) === 'PA', 'código de proceso');
ok(Z.nombreProceso({ proceso: 'PA4 GESTIÓN INFRAESTRUCTURAS' }) === 'GESTIÓN INFRAESTRUCTURAS', 'nombre de proceso sin el código');

const proyecto = { id: 'p1', fecha_inicio: '2026-06-01', fecha_fin: '2027-05-31' };
const tareas = [
  { id: 't1', proyecto_id: 'p1', proceso: 'PE1 PLANIFICACIÓN', titulo: 'Contexto', horas: 8, consultor_id: 'c1', subtareas: [{ texto: 'a', hecha: true }, { texto: 'b', hecha: false }] },
  { id: 't2', proyecto_id: 'p1', proceso: 'PE1 PLANIFICACIÓN', titulo: 'Riesgos', horas: 12, fecha_estimada: '2026-10-05' },
  { id: 't3', proyecto_id: 'p1', proceso: 'PA4 INFRAESTRUCTURAS', titulo: 'Licencias', horas: 4, hecha: true },
  { id: 't4', proyecto_id: 'p1', proceso: 'PA4 INFRAESTRUCTURAS', titulo: 'Mantenimiento', horas: 6, fecha_estimada: '2026-08-01' },
  { id: 't9', proyecto_id: 'otro', proceso: 'PE1', titulo: 'ajena', horas: 99 },
];
const sesiones = [
  { id: 's1', cliente_tarea_id: 't1', consultor_id: 'c1', fecha: '2026-09-02', horas: 4, estado: 'hecha' },
  { id: 's2', cliente_tarea_id: 't1', consultor_id: 'c1', fecha: '2026-09-20', horas: 4, estado: 'programada' },
  { id: 's3', cliente_tarea_id: 't3', consultor_id: 'c2', fecha: '2026-07-10', horas: 4, estado: 'hecha' },
  { id: 's4', cliente_tarea_id: 't3', consultor_id: 'c2', fecha: '2026-07-11', horas: 4, estado: 'anulada' },
];
const filas = Z.filasGantt(tareas, sesiones, proyecto, hoy);
ok(filas.length === 4, `solo las del proyecto (${filas.length})`);
const t1 = filas.find((x) => x.id === 't1');
ok(t1.inicio === '2026-09-02' && t1.fin === '2026-09-20', `t1: inicio y fin por sesiones (${t1.inicio} → ${t1.fin})`);
ok(t1.estado === 'en_curso' && t1.pct === 50 && t1.horasHechas === 4, `t1 en curso, 50 % por checklist (${t1.estado}, ${t1.pct} %)`);
const t2 = filas.find((x) => x.id === 't2');
ok(t2.inicio === '2026-10-05' && t2.fin === '2026-10-07' && t2.estado === 'pendiente', `t2 por fecha estimada, 12 h → 3 días (${t2.inicio} → ${t2.fin}, ${t2.estado})`);
const t3 = filas.find((x) => x.id === 't3');
ok(t3.estado === 'hecha' && t3.pct === 100 && t3.fin === '2026-07-10', 'sesión anulada no cuenta; hecha al 100 %');
const t4 = filas.find((x) => x.id === 't4');
ok(t4.estado === 'retrasada', `t4 con fecha pasada y nada hecho: retrasada (${t4.estado})`);
ok(t1.responsableId === 'c1' && t3.responsableId === 'c2', 'responsable: de la tarea o de sus sesiones');

const r = Z.rangoGantt(filas, proyecto);
ok(r.desde === '2026-06-01' && r.hasta === '2027-05-31' && r.meses.length === 12, `rango del proyecto: ${r.desde} → ${r.hasta}, ${r.meses.length} meses`);
ok(Z.posicionEn(r, '2026-06-01') === 0 && Z.posicionEn(r, '2027-05-31') === 1, 'posición 0 y 1 en los extremos');
ok(Math.abs(Z.posicionEn(r, '2026-12-01') - 0.5) < 0.02, 'diciembre a mitad de un año');

const pr = Z.procesosDe(filas);
ok(pr.length === 2 && pr[0].codigo === 'PE1' && pr[1].codigo === 'PA4', 'procesos ordenados PE antes que PA');
ok(pr[1].n === 2 && pr[1].hechas === 1 && pr[1].pct === 50, `PA4: 2 tareas, 1 hecha, 50 % (${pr[1].pct})`);

const res = Z.resumenProyecto(filas);
ok(res.n === 4 && res.hechas === 1 && res.retrasadas === 1 && res.enCurso === 1 && res.horas === 30, `resumen: ${JSON.stringify(res)}`);

console.log('\n── Pendientes ──');
const pend = Z.pendientesProyecto({ proyecto: { ...proyecto, normas: ['9001', '14001'] }, filas, cliente: { cif: 'B1', email: '', telefono: '6', contacto: 'Ana' }, certificados: [{ cliente_id: undefined, norma: '9001' }], documentos: [], auditoria: { color: 'gris', sinProgramar: true, texto: 'Sin programar · sin certificado registrado' } });
ok(pend[0].nivel === 'rojo' && /retraso/.test(pend[0].texto), `lo rojo primero: ${pend[0].texto}`);
ok(pend.some((x) => /certificación prevista/.test(x.texto)), 'sin fecha de certificación → aviso');
ok(pend.some((x) => /Sin programar/.test(x.texto)), 'auditoría sin programar → aviso');
ok(pend.some((x) => /Sin certificado registrado de 14001/.test(x.texto)), 'norma sin certificado → aviso (solo la que falta)');
ok(pend.some((x) => /correo/.test(x.texto) && !/CIF/.test(x.texto)), 'datos incompletos: solo lo que falta');
ok(pend.some((x) => /Sin documentos/.test(x.texto)), 'sin documentos → aviso gris');
ok(pend.filter((x) => x.interno).length === 1 && /sin responsable/.test(pend.find((x) => x.interno).texto), 'sin responsable se marca como interno (no se enseña al cliente)');

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo correcto');
process.exit(fallos ? 1 : 0);
