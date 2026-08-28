// Comprueba que una oferta emitida conserva su precio y sus condiciones.
const L='/home/claude/work/consultify/app/src/lib/';
const { calcular } = await import(L+'calcEngine.js');
const ok = c => c ? '✓' : '✗ FALLO';
const eur = n => Number(n).toLocaleString('es-ES',{style:'currency',currency:'EUR'});

// Oferta emitida antes de la regla nueva de precios (v207)
const emitida = {
  id:'OF1', numero_oferta:'OFE-2026-S8LXA', normas:['9001','14001','27001'],
  modelo:'Relación', complejidad:'media', sedes:1, meses:12, precio:537,
};

console.log('── El precio de hoy difiere del emitido ──');
const hoy = calcular(emitida.normas, emitida.modelo, { meses:emitida.meses, complejidad:emitida.complejidad, sedes:emitida.sedes });
const difiere = Math.abs(hoy.precioCatalogo - emitida.precio) > 0.5;
console.log(' emitido', eur(emitida.precio), '· hoy', eur(hoy.precioCatalogo), '· difiere:', ok(difiere));
console.log(' → debe pedir confirmación antes de guardar:', ok(difiere));

console.log('\n── Con tarifa pactada se reproduce el precio emitido ──');
// 537 = (a+b+c) × 0,90 con 3 sistemas → suma 596,67. Se reparte a mano:
const pactados = { '9001':200, '14001':200, '27001':196.67 };
const conPacto = calcular(emitida.normas, emitida.modelo, {
  meses:emitida.meses, complejidad:emitida.complejidad, sedes:emitida.sedes,
  preciosSistema: pactados,
});
console.log(' suma', eur(conPacto.volumen.sumaSistemas), '− 10 % =', eur(conPacto.precioCatalogo),
  ok(Math.abs(conPacto.precioCatalogo - 537) < 0.5));
console.log(' los tres marcados como pactados:', ok(conPacto.desgloseSistemas.every(s=>s.manual)));

console.log('\n── Los pactados ignoran el suelo de 350 ──');
console.log(' 9001 a 200 €:', eur(conPacto.desgloseSistemas.find(s=>s.id==='9001').precio),
  ok(conPacto.desgloseSistemas.find(s=>s.id==='9001').precio===200));

console.log('\n── Mezcla: uno pactado, dos de catálogo ──');
const mixto = calcular(emitida.normas, emitida.modelo, {
  meses:12, preciosSistema:{ '9001':200 },
});
console.log(' 9001 pactado :', eur(mixto.desgloseSistemas.find(s=>s.id==='9001').precio), ok(mixto.desgloseSistemas.find(s=>s.id==='9001').precio===200));
console.log(' 14001 mínimo :', eur(mixto.desgloseSistemas.find(s=>s.id==='14001').precio), ok(mixto.desgloseSistemas.find(s=>s.id==='14001').precio===350));
console.log(' dto 10 % por 3 sistemas:', mixto.volumen.pct+'%', ok(mixto.volumen.pct===10));

console.log('\n── Reglas desactivadas se reflejan en el resultado ──');
const reglas=[{id:'R',nombre:'Campaña',tipo:'descuento',unidad:'porcentaje',valor:10,activa:true}];
const sinReglas = calcular(emitida.normas, emitida.modelo, { meses:12, reglas, aplicarReglas:false });
console.log(' reglasActivas false:', ok(sinReglas.reglasActivas===false));

console.log('\n── Fases y ajustes siguen respetándose ──');
const conAjuste = calcular(['9001'],'Relación',{ meses:12, ajustes:[{tipo:'descuento',unidad:'porcentaje',valor:20,motivo:'cierre'}] });
const sinAjuste = calcular(['9001'],'Relación',{ meses:12 });
console.log(' con ajuste', eur(conAjuste.precioCatalogo), '< sin', eur(sinAjuste.precioCatalogo), ok(conAjuste.precioCatalogo < sinAjuste.precioCatalogo));
