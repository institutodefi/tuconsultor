// node scripts/test-documento-oferta.mjs · el documento se monta igual en
// navegador y servidor, y la copia del cliente no lleva la lógica.
import { montarDocumento, paraCliente, logicaDe, tareasPorBloque, SITUACIONES, situacionDeModelo } from '../app/src/lib/documentoOferta.js';
const t = [];
const body = { normas: ['9001', '14001'], modelo: 'Implicación', meses: 12, empresa: 'Industrias Norte, S.L.', contacto: 'María López', cif: 'B12345678', cargo: 'Gerente', email: 'maria@norte.es', ref: 'OFE-2026-999', fecha_emision: '2026-09-15', fecha_inicio: '2026-10-01', complejidad: 'media', sedes: 2, ajustes: [{ tipo: 'descuento', unidad: 'pct', valor: 10, motivo: 'cliente antiguo · no decirlo' }], notas_oferta: 'Una nota', pago_adelantado: true, situacion: 'certificado' };
const doc = montarDocumento(body);
t.push(!!doc?.r && doc.r.tipo === 'mes' && doc.r.numero === 'OFE-2026-999');
t.push(doc.r.fecha_fin === '2027-10-02' && doc.r.pagoAdelantado === true && !!doc.r.adelantado);
t.push(doc.anexo.length > 3 && doc.anexo.every((g) => g.bloque && g.subs.length));
t.push(doc.r.ajustes.length === 1 && doc.r.ajustes[0].efecto < 0);
const c = paraCliente(doc);
const txt = JSON.stringify(c);
t.push(c.v === 1 && c.r.precioCatalogo === doc.r.precioCatalogo && c.cli.empresa === body.empresa && c.anexo.length === doc.anexo.length);
t.push(!txt.includes('no decirlo') && c.r.rentabilidad === undefined && c.r.horas === undefined && c.r.desgloseSistemas === undefined && c.r.precioBase === undefined && c.r.reglas === undefined && c.r.coste === undefined);
t.push(c.r.ajustes[0].efecto === doc.r.ajustes[0].efecto && c.r.ajustes[0].motivo === undefined && c.r.situacion === 'certificado');
const L = logicaDe(doc.r);
t.push(L.ajustes[0].motivo === 'cliente antiguo · no decirlo' && Array.isArray(L.desgloseSistemas));
// Override: el precio emitido manda y las formas de pago se rehacen
const impl = montarDocumento({ normas: ['9001'], modelo: 'Implantación', meses: 6, fecha_inicio: '2026-10-01', override: { precioCatalogo: 10000 } });
t.push(impl.r.precioCatalogo === 10000 && impl.r.formasPago.dos.sinIva === 10000 && impl.r.formasPago.unico.sinIva === 9500 && impl.r.fraccionado.totalSinIva === 10000);
t.push(tareasPorBloque(['9001'], 'Apoyo').length > 0 && SITUACIONES.length === 3 && situacionDeModelo('Apoyo') === 'urgente' && situacionDeModelo('Relación') === 'certificado' && situacionDeModelo('Implantación') === 'desde_cero');
console.log(t.every(Boolean) ? `OK · ${t.length} comprobaciones` : `FALLO · ${t.map((x, i) => (x ? '' : i)).filter((x) => x !== '').join(',')}`);
process.exit(t.every(Boolean) ? 0 : 1);
