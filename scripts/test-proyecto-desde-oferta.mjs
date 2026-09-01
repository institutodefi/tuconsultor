const L='/home/claude/work/consultify/app/src/lib/';
const { ofertasParaProyecto, estaAceptada, datosDeOferta, etiquetaOferta } = await import(L+'ofertasAceptadas.js');
const ok = c => c ? '✓' : '✗ FALLO';

const presupuestos = [
  { id:'A', numero_oferta:'OF-A', cif:'B84867670', empresa:'Metalúrgica Norte', estado:'aceptada',
    normas:['9001','14001'], modelo:'Compromiso', precio:1377.5, tipo:'mes',
    fecha_inicio:'2026-10-01', fecha_fin:'2027-10-02', meses:12 },
  { id:'B', numero_oferta:'OF-B', cif:'B84867670', empresa:'Metalúrgica Norte', estado:'emitida',
    normas:['45001'], modelo:'Apoyo', precio:2100, tipo:'bolsa' },
  { id:'C', numero_oferta:'OF-C', cif:'B99999999', empresa:'Otra',            estado:'emitida',
    normas:['27001'], modelo:'Relación', precio:350, tipo:'mes' },   // con contrato firmado
  { id:'D', numero_oferta:'OF-D', cif:'B84867670', empresa:'Metalúrgica Norte', estado:'aceptada',
    normas:['9001'], modelo:'Apoyo', precio:2100, tipo:'bolsa' },     // ya tiene proyecto
  { id:'E', numero_oferta:'OF-E', cif:'B84867670', empresa:'Metalúrgica Norte', estado:'rechazada',
    normas:['9001'], modelo:'Relación', precio:350, tipo:'mes' },
];
const contratos = [
  { id:'CT1', numero:'CT-1', presupuesto_id:'C', estado:'firmado' },
  { id:'CT2', numero:'CT-2', presupuesto_id:'A', estado:'firmado' },
];
const proyectos = [{ id:'P1', oferta_id:'D' }];

console.log('── Qué cuenta como aceptada ──');
console.log(' estado «aceptada»          ', ok(estaAceptada(presupuestos[0], contratos)));
console.log(' con contrato firmado       ', ok(estaAceptada(presupuestos[2], contratos)), '← aunque su estado sea «emitida»');
console.log(' solo emitida               ', ok(!estaAceptada(presupuestos[1], contratos)));
console.log(' rechazada                  ', ok(!estaAceptada(presupuestos[4], contratos)));

console.log('\n── Elegibles para abrir proyecto ──');
const el = ofertasParaProyecto({ presupuestos, contratos, proyectos });
console.log(' resultado:', el.map(o => o.numero_oferta).join(', '));
console.log(' incluye A (aceptada)       ', ok(el.some(o => o.id === 'A')));
console.log(' incluye C (contrato firmado)', ok(el.some(o => o.id === 'C')));
console.log(' excluye B (solo emitida)   ', ok(!el.some(o => o.id === 'B')));
console.log(' excluye D (ya tiene proyecto)', ok(!el.some(o => o.id === 'D')));
console.log(' excluye E (rechazada)      ', ok(!el.some(o => o.id === 'E')));

console.log('\n── Acotadas por empresa ──');
const suyas = ofertasParaProyecto({ presupuestos, contratos, proyectos, cif:'B-84.867.670' });
console.log(' con CIF en otro formato:', suyas.map(o => o.numero_oferta).join(', '), ok(suyas.length === 1 && suyas[0].id === 'A'));

console.log('\n── Volcado automático de sistemas y modelo ──');
const d = datosDeOferta(presupuestos[0], contratos);
console.log(' normas :', d.normas.join(' + '), ok(d.normas.length === 2));
console.log(' modelo :', d.modelo, ok(d.modelo === 'Compromiso'));
console.log(' nombre :', d.nombre, ok(d.nombre === '9001 + 14001 · Compromiso'));
console.log(' fechas :', d.fecha_inicio, '→', d.fecha_fin, ok(!!d.fecha_inicio && !!d.fecha_fin));
console.log(' contrato enlazado:', d.contrato_id, ok(d.contrato_id === 'CT2'));
console.log(' precio recurrente en precio_mes', ok(d.precio_mes === 1377.5 && d.precio_total === null));

console.log('\n── Modelo Apoyo: el precio va a total, no a mes ──');
const dA = datosDeOferta(presupuestos[3], contratos);
console.log(' precio_total:', dA.precio_total, '· precio_mes:', dA.precio_mes,
  ok(dA.precio_total === 2100 && dA.precio_mes === null));
console.log(' modelo volcado:', dA.modelo, ok(dA.modelo === 'Apoyo'));

console.log('\n── Etiqueta del desplegable ──');
console.log(' ', etiquetaOferta(presupuestos[0], contratos));
