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

console.log('\n── Propuestas de empresa y sedes ──');
const lecturas = [
  { documento: { id: 'd1', titulo: 'Cert 9001' }, confianza: 'alta', datos: { tipo: 'certificado', norma: 'ISO 9001:2015', emisor: 'AENOR', razon_social: 'Industrias Norte, S.L.', cif: 'B12345678', alcance: 'Fabricación', valido_desde: '2024-10-15', valido_hasta: '2027-10-14', sedes: [{ direccion: 'C/ Mayor 1', cp: '28001', poblacion: 'Madrid' }, { direccion: 'Pol. Sur 5', poblacion: 'Getafe' }] } },
  { documento: { id: 'd2', titulo: 'Escritura' }, confianza: 'media', datos: { tipo: 'escritura', razon_social: 'INDUSTRIAS NORTE SL', cif: 'B-12345678', domicilio: { direccion: 'C/ Mayor 1', cp: '28001', poblacion: 'Madrid', provincia: 'Madrid' }, actividad: 'Fabricación de estructuras metálicas', representante: 'María López', empleados: 42, sedes: ['C/ Mayor 1, Madrid'] } },
  { documento: { id: 'd3', titulo: 'Sin nota' }, confianza: null, datos: null },
];
const actual = { cliente: { id: 'cl1', empresa: 'Industrias Norte S.L.', cif: '', poblacion: 'Madrid' }, sedes: [{ direccion: 'Pol. Sur 5', poblacion: 'Getafe' }], certificados: [] };
const pr = C.propuestasDesdeLecturas(lecturas, actual);
ok(pr.empresa.cif.valor === 'B12345678' && pr.empresa.cif.cambia, `CIF propuesto (${pr.empresa.cif.valor}), cambia porque no había`);
ok(pr.empresa.poblacion && !pr.empresa.poblacion.cambia, 'población igual a la actual: no cambia');
ok(pr.empresa.empleados.valor === '42' && pr.empresa.representante.valor === 'María López', 'plantilla y representante desde la escritura');
ok(pr.empresa.empresa.valor === 'Industrias Norte, S.L.' && pr.empresa.empresa.fuentes.length === 2 && !pr.empresa.empresa.cambia, 'razón social: misma empresa en dos grafías → 2 fuentes, se enseña la de más confianza, no cambia');
ok(pr.sedes.length === 2, `sedes sin duplicar (${pr.sedes.length}): la de Madrid aparece en dos documentos`);
ok(pr.sedes.find((s) => /Getafe/.test(s.poblacion)).yaExiste && !pr.sedes.find((s) => /Madrid/.test(s.poblacion)).yaExiste, 'marca la sede que ya existe');
ok(pr.certificados.length === 1 && pr.certificados[0].norma === '9001' && !pr.certificados[0].existente, 'un certificado propuesto, nuevo');
ok(C.sedeDesde('  ') === null && C.sedeDesde({ nombre: 'Almacén' }).nombre === 'Almacén', 'sede vacía → null; solo nombre vale');

console.log('\n── Direcciones troceadas ──');
let t = C.trocearDireccion('C/ Mayor 1, 28001 Madrid (Madrid)');
ok(t.direccion === 'C/ Mayor 1' && t.cp === '28001' && t.poblacion === 'Madrid' && t.provincia === 'Madrid', `con CP y provincia entre paréntesis: ${JSON.stringify(t)}`);
t = C.trocearDireccion('Pol. Ind. Sur, nave 5 · 28906 Getafe, Madrid, España');
ok(t.direccion === 'Pol. Ind. Sur, nave 5' && t.cp === '28906' && t.poblacion === 'Getafe' && t.provincia === 'Madrid' && t.pais === 'España', `con país: ${JSON.stringify(t)}`);
t = C.trocearDireccion('Avda. de la Industria 12, Alcorcón');
ok(t.direccion === 'Avda. de la Industria 12' && !t.cp && t.poblacion === 'Alcorcón', `sin CP: ${JSON.stringify(t)}`);
t = C.trocearDireccion('Rua Augusta 10, 1100-048 Lisboa, Portugal');
ok(t.cp === '1100-048' && t.poblacion === 'Lisboa' && t.pais === 'Portugal', `CP portugués: ${JSON.stringify(t)}`);
t = C.trocearDireccion('Calle Real 3');
ok(t.direccion === 'Calle Real 3' && !t.poblacion, 'solo calle: no inventa población');
let sd = C.sedeDesde('C/ Mayor 1, 28001 Madrid');
ok(sd.direccion === 'C/ Mayor 1' && sd.cp === '28001' && sd.poblacion === 'Madrid' && sd.provincia === 'Madrid', `sede como texto: ${JSON.stringify(sd)}`);
sd = C.sedeDesde({ direccion: 'C/ Mayor 1, 28001 Madrid', cp: '28002', poblacion: 'Alcobendas' });
ok(sd.direccion === 'C/ Mayor 1' && sd.cp === '28002' && sd.poblacion === 'Alcobendas', 'lo que ya viene separado manda');
sd = C.sedeDesde({ direccion: 'Pol. Sur 5', poblacion: '28906 Getafe (Madrid)' });
ok(sd.cp === '28906' && sd.poblacion === 'Getafe' && sd.provincia === 'Madrid', `población con CP pegado y provincia: ${JSON.stringify(sd)}`);
const pr2 = C.propuestasDesdeLecturas([{ documento: { id: 'x', titulo: 'CIF' }, confianza: 'alta', datos: { tipo: 'otro', domicilio: 'C/ Mayor 1, 28001 Madrid' } }], { cliente: {} });
ok(pr2.empresa.direccion.valor === 'C/ Mayor 1' && pr2.empresa.cp.valor === '28001' && pr2.empresa.poblacion.valor === 'Madrid', 'domicilio en texto → campos separados en la propuesta');

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo correcto');
process.exit(fallos ? 1 : 0);
