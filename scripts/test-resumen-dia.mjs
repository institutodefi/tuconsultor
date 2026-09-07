// Pruebas de lib/resumenDia.js. Ejecutar: node scripts/test-resumen-dia.mjs
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const L = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'consultify', 'app', 'src', 'lib') + '/';
const R = await import(L + 'resumenDia.js');
let fallos = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗ FALLO'} ${m}`); if (!c) fallos++; };

const hoy = '2026-09-07';
const d = {
  perfilId: 'laura', hoy,
  proyectos: [{ id: 'p1', cliente_id: 'c1', codigo: 'CECE-2026', estado: 'activo' }],
  clientes: [{ id: 'c1', empresa: 'CECE' }],
  equipo: [{ proyecto_id: 'p1', perfil_id: 'laura', papel: 'consultor' }],
  tareas: [
    { id: 't1', proyecto_id: 'p1', codigo: 'CECE-9001-01', titulo: 'Contexto', horas: 3, hecha: false, fecha_estimada: '2026-09-03', subtareas: [{ texto: 'Entrevista', hecha: true }, { texto: 'DAFO', hecha: false }] },
    { id: 't2', proyecto_id: 'p1', codigo: 'CECE-9001-02', titulo: 'Riesgos', horas: 3, hecha: false, fecha_estimada: '2026-09-10', consultor_id: 'otra', subtareas: [{ texto: 'Matriz', hecha: false }] },
    { id: 't3', proyecto_id: 'p1', codigo: 'CECE-9001-03', titulo: 'Política', horas: 3, hecha: true, subtareas: [{ texto: 'x', hecha: false }] },
    { id: 't4', proyecto_id: 'p1', codigo: 'CECE-9001-04', titulo: 'Datos', horas: 3, hecha: false, fecha_estimada: '2026-09-12', subtareas: [] },
  ],
  internas: [{ id: 'i1', titulo: 'Reunión semanal' }],
  sesiones: [
    { id: 's1', consultor_id: 'laura', cliente_tarea_id: 't1', fecha: hoy, hora_inicio: '09:00', hora_fin: '11:00', horas: 2, estado: 'programada' },
    { id: 's2', consultor_id: 'laura', tarea_interna_id: 'i1', fecha: hoy, hora_inicio: '08:00', hora_fin: '09:00', horas: 1, estado: 'programada' },
    { id: 's3', consultor_id: 'laura', cliente_tarea_id: 't4', fecha: '2026-09-11', hora_inicio: '10:00', hora_fin: '12:00', horas: 2, estado: 'programada' },
    { id: 's4', consultor_id: 'laura', cliente_tarea_id: 't1', fecha: '2026-09-01', hora_inicio: '10:00', hora_fin: '12:00', horas: 2, estado: 'programada' },
    { id: 's5', consultor_id: 'laura', cliente_tarea_id: 't1', fecha: '2026-09-02', hora_inicio: '10:00', hora_fin: '12:00', horas: 2, estado: 'hecha' },
    { id: 's6', consultor_id: 'otra', cliente_tarea_id: 't2', fecha: hoy, hora_inicio: '10:00', hora_fin: '12:00', horas: 2, estado: 'programada' },
    { id: 's7', consultor_id: 'laura', cliente_tarea_id: 't1', fecha: '2026-09-20', hora_inicio: '10:00', hora_fin: '12:00', horas: 2, estado: 'anulada' },
  ],
};
const r = R.datosResumen(d);
ok(r.deHoy.length === 2 && r.deHoy[0].inicio === '08:00' && r.deHoy[1].titulo === 'Contexto' && r.deHoy[1].cliente === 'CECE', `hoy: 2 sesiones ordenadas por hora (${r.deHoy.map((s) => s.inicio).join(', ')})`);
ok(r.deHoy[1].subtareasPendientes.join() === 'DAFO', 'la sesión de hoy trae los pasos pendientes de su tarea');
ok(r.semana.length === 1 && r.semana[0].fecha === '2026-09-11', 'próximos 7 días: solo la del día 11 (la anulada y la de otra persona no)');
ok(r.atrasadas.length === 1 && r.atrasadas[0].fecha === '2026-09-01', 'pasadas sin cerrar: la del día 1 (la hecha no)');
ok(r.tareasMias.length === 2 && r.tareasMias.map((t) => t.codigo).join() === 'CECE-9001-01,CECE-9001-04', `tareas mías: las del proyecto sin asignar a otra y no hechas (${r.tareasMias.map((t) => t.codigo).join()})`);
ok(r.vencidas.length === 1 && r.vencidas[0].codigo === 'CECE-9001-01' && r.estaSemana.length === 1 && r.estaSemana[0].codigo === 'CECE-9001-04', 'vencida la del día 3; esta semana la del 12');
ok(r.subtareasPendientes.length === 1 && r.subtareasPendientes[0].texto === 'DAFO', 'pasos pendientes: solo el DAFO (la tarea hecha no cuenta)');
ok(r.totales.horasHoy === 3 && r.totales.horasSemana === 2 && r.totales.atrasadas === 1, `totales: ${JSON.stringify(r.totales)}`);

const txt = R.textoParaIA(r, 'Laura');
ok(/SESIONES DE HOY \(2, 3 h\)/.test(txt) && /CECE · CECE-9001-01 Contexto/.test(txt) && /pasos pendientes: DAFO/.test(txt), 'texto para la IA con cliente, código y pasos');
const loc = R.resumenLocal(r, 'Laura');
ok(/Laura, hoy tienes 2 sesiones \(3 h\)/.test(loc) && /1 sesión pasada sin cerrar/.test(loc) && /fecha vencida: CECE-9001-01/.test(loc), `resumen local:\n${loc}`);
const vacio = R.datosResumen({ perfilId: 'nadie', hoy });
ok(vacio.totales.hoy === 0 && /no tienes sesiones programadas/.test(R.resumenLocal(vacio)), 'sin nada: no revienta y lo dice');

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo correcto');
process.exit(fallos ? 1 : 0);
