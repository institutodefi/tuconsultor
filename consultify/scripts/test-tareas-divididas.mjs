// node scripts/test-tareas-divididas.mjs · partes de tarea y reparto por persona
import { horasTeoricasTarea, planDivision, etiquetaParte } from '../app/src/lib/tareasHoras.js';
import { cuotasEquipo } from '../app/src/lib/controlHoras.js';
const t = [];
const cat = [{ id: 'c1', norma_id: '9001', modelo: 'Implantación', proceso: 'PE1', subproceso: 'S1', horas_base: 40 }];
t.push(horasTeoricasTarea({ catalogo_id: 'c1', parte: 1 }, cat) === 40);
t.push(horasTeoricasTarea({ catalogo_id: 'c1', parte: 0.25 }, cat) === 10);
t.push(horasTeoricasTarea({ norma_id: '9001', modelo: 'implantacion', proceso: 'PE1', subproceso: 'S1', parte: 0.5 }, cat) === 20);
t.push(horasTeoricasTarea({ horas: 6 }, cat) === 6 && etiquetaParte({ parte: 0.5 }) === '50 %' && etiquetaParte({ parte: 1 }) === null);
const plan = planDivision({ codigo: 'CECE-9001-03', parte: 1 }, 40, [{ perfil_id: 'a', horas: 30 }, { perfil_id: 'b', horas: 10 }]);
t.push(plan.length === 2 && plan[0].esOriginal && plan[0].parte === 0.75 && plan[1].parte === 0.25 && plan[1].codigo === 'CECE-9001-03.2');
// Dividir una parte otra vez: las fracciones se acumulan sobre la original
const plan2 = planDivision({ codigo: 'CECE-9001-03.2', parte: 0.5 }, 20, [{ perfil_id: 'a', horas: 10 }, { perfil_id: 'b', horas: 10 }]);
t.push(plan2[0].parte === 0.25 && plan2[1].parte === 0.25 && plan2[1].codigo === 'CECE-9001-03.2');
// Reparto por persona: con horas asignadas a una, el resto se reparte entre las demás
const m = [{ perfil_id: 'r', papel: 'responsable', horas_asignadas: 0, nivel: 'Senior' }, { perfil_id: 'a', papel: 'consultor', horas_asignadas: 60, nivel: 'J2' }, { perfil_id: 'b', papel: 'consultor', horas_asignadas: 0, nivel: 'J2' }];
const q = cuotasEquipo(m, { J1: 0, J2: 80, J3: 0, Senior: 20 }, 100);
t.push(Math.abs(q.a - 0.6) < 1e-9 && Math.abs(q.b - 0.4) < 1e-9 && !q.r);
const q2 = cuotasEquipo(m.map((x) => ({ ...x, horas_asignadas: 0 })), { J1: 0, J2: 80, J3: 0, Senior: 20 }, 100);
t.push(Math.abs(q2.a - 0.4) < 1e-9 && Math.abs(q2.b - 0.4) < 1e-9 && Math.abs(q2.r - 0.2) < 1e-9);
console.log(t.every(Boolean) ? `OK · ${t.length} comprobaciones` : `FALLO · ${t.map((x, i) => (x ? '' : i)).filter((x) => x !== '').join(',')}`);
process.exit(t.every(Boolean) ? 0 : 1);
