// Pruebas de lib/subtareas.js. Ejecutar: node scripts/test-subtareas.mjs
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const L = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'consultify', 'app', 'src', 'lib') + '/';
const T = await import(L + 'subtareas.js');
let fallos = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗ FALLO'} ${m}`); if (!c) fallos++; };

let n = T.normalizarSubtareas(['Revisar contexto', ' ', { texto: 'Redactar política', hecha: true, fecha: '2026-09-01' }, 'x']);
ok(n.length === 3 && n[0].hecha === false && n[1].hecha === true && n[1].fecha === '2026-09-01', 'normaliza textos y objetos, descarta vacíos');
ok(T.normalizarSubtareas('["a","b"]').length === 2, 'acepta JSON en texto');
ok(T.normalizarSubtareas('a\nb\n\nc').length === 3, 'acepta líneas');
ok(T.normalizarSubtareas(null).length === 0, 'null → vacío');
ok(JSON.stringify(T.subtareasCatalogo([{ texto: 'a', hecha: true }])) === '[{"texto":"a"}]', 'catálogo: solo texto');
ok(T.subtareasNuevas([{ texto: 'a', hecha: true }])[0].hecha === false, 'nuevas: sin marcar');

const act = [{ texto: 'Contexto', hecha: true, fecha: '2026-09-01' }, { texto: 'Riesgos', hecha: false }, { texto: 'Vieja hecha', hecha: true }, { texto: 'Vieja sin hacer', hecha: false }];
const cat = ['Riesgos', 'Contexto', 'Nueva'];
const m = T.mezclarSubtareas(act, cat);
ok(m.map((x) => x.texto).join('|') === 'Riesgos|Contexto|Nueva|Vieja hecha', `mezcla: orden del catálogo + hechas antiguas al final (${m.map((x) => x.texto).join('|')})`);
ok(m[1].hecha && m[1].fecha === '2026-09-01', 'conserva marcado y fecha por texto');
ok(!m[2].hecha, 'lo nuevo entra sin marcar');
ok(!m.some((x) => x.texto === 'Vieja sin hacer'), 'lo que desaparece del catálogo y no estaba hecho, se va');
ok(T.mezclarSubtareas(act, ['  contexto ']).length === 2 && T.mezclarSubtareas(act, ['  contexto '])[0].hecha, 'coincidencia por texto sin mayúsculas ni espacios');

const mk = T.marcarSubtarea(cat, 1, true, '2026-09-07');
ok(mk[1].hecha && mk[1].fecha === '2026-09-07' && !mk[0].hecha, 'marcar pone hecha y fecha');
ok(T.marcarSubtarea(mk, 1, false)[1].fecha === null, 'desmarcar quita la fecha');
const p = T.progresoChecklist(mk);
ok(p.hechas === 1 && p.total === 3 && p.pct === 33 && !p.completa, `progreso 1/3 (${p.pct} %)`);
ok(T.etiquetaChecklist(mk) === '1/3' && T.etiquetaChecklist([]) === '', 'etiqueta 1/3 y vacía sin lista');
ok(T.progresoChecklist([{ texto: 'a', hecha: true }]).completa, 'completa cuando todo está hecho');

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo correcto');
process.exit(fallos ? 1 : 0);
