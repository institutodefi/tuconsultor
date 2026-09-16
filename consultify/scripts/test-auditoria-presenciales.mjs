// node scripts/test-auditoria-presenciales.mjs · v143: presenciales dentro,
// jornadas de auditoría aparte, modelo de solo auditoría y ámbitos.
import { calcular, normasPorAmbito, AMBITOS, MODELO_IDS, ACOMPANAMIENTO_AUDITORIA_DIA } from '../app/src/lib/calcEngine.js';
import { cumpleNivel } from '../app/src/lib/tareasHoras.js';
const t = [];
const base = { meses: 12, complejidad: 'media' };

// 1 · Las presenciales ya no son una línea, pero el total NO cambia.
const imp = calcular(['9001', '9004'], 'Implicación', base);
t.push(imp.volumen.importePresencial === 0 && imp.volumen.presencialIncluido > 0);
t.push(imp.volumen.subtotal === imp.volumen.sumaSistemas);
t.push(imp.desgloseSistemas.reduce((a, s) => a + s.precio, 0) === imp.volumen.subtotal);
// Lo repartido es exactamente lo que costaban las presenciales.
t.push(imp.desgloseSistemas.reduce((a, s) => a + (s.presencialIncluido || 0), 0) === imp.volumen.presencialIncluido);
// Y en euros enteros: nada de 562,50 € por sistema.
t.push(imp.desgloseSistemas.every((s) => Number.isInteger(s.precio)));
// Relación no tiene presenciales: nada que repartir.
t.push(!calcular(['9001'], 'Relación', base).volumen.presencialIncluido);

// 2 · Un precio pactado no se toca al repartir.
const pactado = calcular(['9001', '9004'], 'Implicación', { ...base, preciosSistema: { 9001: 500 } });
t.push(pactado.desgloseSistemas.find((s) => s.id === '9001').precio === 500);

// 3 · Las jornadas de auditoría son un extra: no tocan la cuota.
const conJor = calcular(['9001', '9004'], 'Implicación', { ...base, jornadasAuditoria: 2 });
t.push(conJor.precioCatalogo === imp.precioCatalogo);
t.push(conJor.auditoria.importe === 2 * ACOMPANAMIENTO_AUDITORIA_DIA && conJor.auditoria.enPrecio === false);
t.push(calcular(['9001'], 'Implicación', base).auditoria === null);

// 4 · Modelo «Auditoría»: el precio SON las jornadas.
const solo = calcular(['27001'], 'Auditoría', { jornadasAuditoria: 3 });
t.push(solo.precioCatalogo === 3 * ACOMPANAMIENTO_AUDITORIA_DIA && solo.auditoria.enPrecio === true);
t.push(solo.tipo === 'bolsa' && solo.plazoOk);
// Sin decir jornadas, se cuenta una: nunca un importe de cero.
t.push(calcular(['9001'], 'Auditoría', {}).precioCatalogo === ACOMPANAMIENTO_AUDITORIA_DIA);
t.push(MODELO_IDS.includes('Auditoría'));

// 5 · Ámbitos: todas las normas caen en uno y ninguno se queda vacío.
const grupos = normasPorAmbito();
t.push(grupos.every((g) => g.normas.length > 0) && !grupos.some((g) => g.id === 'otros'));
t.push(grupos.reduce((a, g) => a + g.normas.length, 0) === 17 && grupos.length === AMBITOS.length);

// 6 · Nivel exigido por la tarea (kickoff = Senior).
t.push(cumpleNivel('Senior', 'Senior') && !cumpleNivel('J1', 'Senior') && cumpleNivel('J1', null) && !cumpleNivel(null, 'Senior'));

console.log(t.every(Boolean) ? `OK · ${t.length} comprobaciones` : `FALLO · ${t.map((x, i) => (x ? '' : i)).filter((x) => x !== '').join(',')}`);
process.exit(t.every(Boolean) ? 0 : 1);
