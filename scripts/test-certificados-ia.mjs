// Pruebas de lib/certificadosIA.js. Ejecutar: node scripts/test-certificados-ia.mjs
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const L = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'consultify', 'app', 'src', 'lib') + '/';
const C = await import(L + 'certificadosIA.js');
let fallos = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗ FALLO'} ${m}`); if (!c) fallos++; };

ok(C.normaIdDesdeTexto('ISO 9001:2015') === '9001', 'ISO 9001:2015 → 9001');
ok(C.normaIdDesdeTexto('UNE-EN ISO 14001:2015') === '14001', 'UNE-EN ISO 14001 → 14001');
ok(C.normaIdDesdeTexto('ISO/IEC 27001:2022') === '27001', 'ISO/IEC 27001 → 27001');
ok(C.normaIdDesdeTexto('ISO/IEC 27701') === '27701', '27701 no se confunde con 27001');
ok(C.normaIdDesdeTexto('UNE 93200:2008') === 'une93200', 'UNE 93200 → une93200');
ok(C.normaIdDesdeTexto('Esquema Nacional de Seguridad · nivel medio') === 'ENS', 'ENS');
ok(C.normaIdDesdeTexto('ISO 22000:2018') === 'ISO 22000', 'norma fuera del catálogo: se deja el texto sin el año');
ok(C.normaIdDesdeTexto('') === null, 'vacío → null');
ok(C.fechaISO('2025-11-20') === '2025-11-20' && C.fechaISO('20/11/2025') === '2025-11-20' && C.fechaISO('x') === null, 'fechas ISO y dd/mm/aaaa');
ok(C.pareceCertificado({ tipo: 'certificado' }) && C.pareceCertificado({ titulo: 'Certificado AENOR ISO 9001.pdf' }) && !C.pareceCertificado({ titulo: 'Escritura de constitución', tipo: 'escritura' }), 'parece certificado por tipo o nombre');

const doc = { id: 'd1', cliente_id: 'cl1', proyecto_id: 'p1' };
const nota = { tipo: 'certificado', norma: 'ISO 9001:2015', emisor: 'AENOR', numero: 'ER-0412/2024', alcance: 'Diseño y fabricación', valido_desde: '2024-10-15', valido_hasta: '2027-10-14', confianza: 'alta', avisos: [] };
const p = C.propuestaDesdeNota(doc, nota);
ok(p && p.norma === '9001' && p.entidad === 'AENOR' && p.numero === 'ER-0412/2024' && p.fecha_validez === '2027-10-14' && p.documento_id === 'd1', 'propuesta completa desde la nota');
ok(C.propuestaDesdeNota(doc, { tipo: 'escritura', resumen: 'x' }) === null, 'una escritura no es un certificado');
const p2 = C.propuestaDesdeNota(doc, { tipo: 'certificado', emisor: 'SGS', valido_hasta: '2026-01-01' });
ok(p2 && p2.norma === '' && p2.avisos[0].includes('norma'), 'sin norma: propuesta con aviso para indicarla');
ok(C.validarPropuesta(p2).includes('norma'), 'no se puede guardar sin norma');
ok(C.validarPropuesta({ ...p, fecha_validez: '2020-01-01' }).length === 1, 'validez anterior a certificación: error');

const existentes = [{ id: 'c9', cliente_id: 'cl1', norma: '9001', documento_id: null }];
ok(C.certificadoExistente(p, existentes)?.id === 'c9', 'existente por cliente + norma → actualizar');
ok(C.certificadoExistente({ ...p, norma: '14001' }, existentes) === null, 'otra norma → crear');
const fila = C.filaCertificado(p);
ok(fila.norma === '9001' && fila.documento_id === 'd1' && /IA/.test(fila.notas), 'fila lista para cliente_certificados');

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo correcto');
process.exit(fallos ? 1 : 0);
