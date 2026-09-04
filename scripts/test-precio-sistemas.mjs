const L='/home/claude/work/consultify/app/src/lib/';
const { calcular, descuentoVolumen, SUELO_POR_SISTEMA, TOPE_DESCUENTO_VOLUMEN } = await import(L+'calcEngine.js');
const ok = c => c ? '✓' : '✗ FALLO';
const eur = n => Number(n).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
const N = ['9001','14001','45001','27001','42001','56001'];

console.log('── Escala de descuento ──');
for (const [n,esp] of [[1,0],[2,5],[3,10],[4,15],[5,15],[9,15]])
  console.log(` ${String(n).padStart(2)} sistemas → ${String(descuentoVolumen(n)).padStart(2)} %`, ok(descuentoVolumen(n)===esp));
console.log(' nunca supera el tope:', ok([1,2,3,4,5,10,50].every(n=>descuentoVolumen(n)<=TOPE_DESCUENTO_VOLUMEN)));

console.log('\n── Suma por sistema con suelo de', SUELO_POR_SISTEMA, '€ ──');
for (const modelo of ['Relación','Implicación','Compromiso']) {
  console.log(' ', modelo);
  let anterior = 0;
  for (let k=1;k<=5;k++) {
    const r = calcular(N.slice(0,k), modelo, {});
    const v = r.volumen;
    const sumaOk = Math.abs(v.sumaSistemas - r.desgloseSistemas.reduce((a,s)=>a+s.precio,0)) < 0.01;
    const totalOk = Math.abs(v.total - (v.subtotal - v.importeDto)) < 0.01;
    const sube = r.precioCatalogo > anterior;
    console.log(`   ${k} → ${eur(r.precioCatalogo).padStart(11)} · dto ${String(v.pct).padStart(2)}%`,
      ok(sumaOk && totalOk && sube && v.pct===descuentoVolumen(k)));
    anterior = r.precioCatalogo;
  }
}

console.log('\n── Cada sistema cuesta al menos el suelo ──');
{
  const r = calcular(N.slice(0,4), 'Relación', {});
  console.log(' todos ≥', SUELO_POR_SISTEMA, ':', ok(r.desgloseSistemas.every(s=>s.precio>=SUELO_POR_SISTEMA)));
}

console.log('\n── Cliente antiguo: precio pactado por sistema ──');
{
  const r = calcular(['9001','14001'], 'Relación', { preciosSistema:{ '9001':300 } });
  const s9 = r.desgloseSistemas.find(s=>s.id==='9001');
  console.log(' 9001 a 300 €      :', eur(s9.precio), ok(s9.precio===300 && s9.manual));
  console.log(' 14001 sigue regla :', eur(r.desgloseSistemas.find(s=>s.id==='14001').precio), ok(r.desgloseSistemas.find(s=>s.id==='14001').precio===350));
  console.log(' total con dto 5%  :', eur(r.precioCatalogo), ok(Math.abs(r.precioCatalogo - 650*0.95) < 0.01));
  const r0 = calcular(['9001','14001'], 'Relación', { preciosSistema:{ '9001':0 } });
  console.log(' precio 0 se ignora:', ok(r0.desgloseSistemas.find(s=>s.id==='9001').precio===350));
}

console.log('\n── Interruptor de reglas ──');
{
  const reglas=[{id:'R',nombre:'Campaña',tipo:'descuento',unidad:'porcentaje',valor:10,activa:true}];
  const con = calcular(['9001','14001'],'Relación',{reglas});
  const sin = calcular(['9001','14001'],'Relación',{reglas,aplicarReglas:false});
  console.log(' con reglas:', eur(con.precioCatalogo), '· sin:', eur(sin.precioCatalogo), ok(con.precioCatalogo < sin.precioCatalogo));
  console.log(' bandera reglasActivas:', con.reglasActivas, sin.reglasActivas, ok(con.reglasActivas===true && sin.reglasActivas===false));
}

console.log('\n── No afecta a Apoyo ni Implantación ──');
for (const m of ['Apoyo','Implantación']) {
  const r = calcular(['9001','14001'], m, {});
  console.log(` ${m.padEnd(13)} desglose:`, r.desgloseSistemas===null?'null ✓':'✗ FALLO', '· precio', eur(r.precioCatalogo));
}
