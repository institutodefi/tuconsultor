// Pruebas de lib/auditorias.js: próxima auditoría externa y semáforo.
// Ejecutar: node scripts/test-auditorias.mjs
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const L = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'consultify', 'app', 'src', 'lib') + '/';
const A = await import(L + 'auditorias.js');
let fallos = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗ FALLO'} ${m}`); if (!c) fallos++; };

const hoy = '2026-09-07';
console.log('── Próxima auditoría de un certificado ──');
let p = A.proximaAuditoriaDeCertificado({ fecha_certificacion: '2025-11-20', fecha_validez: '2028-11-19' }, hoy);
ok(p.fecha === '2026-11-20' && p.tipo === 'seguimiento', `certificado nov-2025: primer seguimiento ${p.fecha} (${p.tipo})`);
p = A.proximaAuditoriaDeCertificado({ fecha_certificacion: '2024-03-01', fecha_validez: '2027-02-28' }, hoy);
ok(p.fecha === '2027-02-28' && p.tipo === 'renovacion', `certificado mar-2024: el 3.º aniversario pasa de la validez → renovación ${p.fecha}`);
p = A.proximaAuditoriaDeCertificado({ fecha_certificacion: '2024-10-01', fecha_validez: '2027-09-30' }, hoy);
ok(p.fecha === '2026-10-01' && p.tipo === 'seguimiento', `certificado oct-2024: 2.º seguimiento ${p.fecha}`);
p = A.proximaAuditoriaDeCertificado({ fecha_certificacion: '2022-01-10', fecha_validez: '2025-01-09' }, hoy);
ok(p.tipo === 'caducado' && p.fecha === '2025-01-09', `validez pasada → caducado (${p.fecha})`);
p = A.proximaAuditoriaDeCertificado({ fecha_validez: '2026-12-01' }, hoy);
ok(p.fecha === '2026-12-01' && p.tipo === 'renovacion', 'solo validez → esa es la próxima');
ok(A.proximaAuditoriaDeCertificado({}, hoy).fecha === null, 'sin fechas → nada');

console.log('── Semáforo ──');
ok(A.semaforoDias(30) === 'rojo' && A.semaforoDias(0) === 'rojo' && A.semaforoDias(-5) === 'rojo', '≤30 días o pasada → rojo');
ok(A.semaforoDias(31) === 'ambar' && A.semaforoDias(90) === 'ambar', '31–90 días → ámbar');
ok(A.semaforoDias(91) === 'verde' && A.semaforoDias(null) === 'gris', '>90 verde · sin fecha gris');

console.log('── Estado del proyecto ──');
const certs = [
  { id: 'c1', cliente_id: 'CL', norma: '9001', fecha_certificacion: '2025-10-15', fecha_validez: '2028-10-14' },
  { id: 'c2', cliente_id: 'CL', norma: '27001', fecha_certificacion: '2025-12-01', fecha_validez: '2028-11-30' },
  { id: 'c3', cliente_id: 'OTRO', norma: '9001', fecha_certificacion: '2025-09-20', fecha_validez: '2028-09-19' },
];
let e = A.estadoAuditoriaProyecto({ id: 'P', cliente_id: 'CL', normas: ['9001', '27001'] }, certs, hoy);
ok(e.estimada === '2026-10-15' && e.certificado.id === 'c1', `manda el certificado que antes toca: ${e.estimada} (9001)`);
ok(e.sinProgramar && e.color === 'ambar' && e.dias === 38, `sin programar, ${e.dias} días → ${e.color}`);
ok(e.texto.startsWith('Sin programar · toca antes del'), `texto: «${e.texto}»`);
e = A.estadoAuditoriaProyecto({ id: 'P', cliente_id: 'CL', normas: ['9001'], fecha_auditoria_externa: '2026-09-25' }, certs, hoy);
ok(!e.sinProgramar && e.color === 'rojo' && e.dias === 18, `programada a 18 días → rojo · «${e.texto}»`);
e = A.estadoAuditoriaProyecto({ id: 'P', cliente_id: 'CL', normas: ['9001'], fecha_auditoria_externa: '2027-03-01' }, certs, hoy);
ok(e.color === 'verde', 'programada lejos → verde aunque la estimación fuera antes (manda la programada)');
e = A.estadoAuditoriaProyecto({ id: 'P', cliente_id: 'CL', normas: ['14001'] }, certs, hoy);
ok(e.sinCertificado && e.color === 'gris' && e.texto.includes('sin certificado'), `norma sin certificado → gris: «${e.texto}»`);
e = A.estadoAuditoriaProyecto({ id: 'P', cliente_id: 'CL', normas: ['9001'] }, [{ id: 'x', cliente_id: 'CL', norma: '9001', fecha_certificacion: '2022-01-10', fecha_validez: '2025-01-09' }], hoy);
ok(e.color === 'rojo' && e.tipo === 'caducado', `certificado caducado → rojo: «${e.texto}»`);
e = A.estadoAuditoriaProyecto({ id: 'P', cliente_id: 'CL', normas: ['9001'], fecha_auditoria_externa: '2026-08-01' }, certs, hoy);
ok(e.color === 'rojo' && e.texto.includes('ya pasada'), `programada y pasada → rojo, pide registrar: «${e.texto}»`);

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo correcto'); process.exit(fallos ? 1 : 0);
