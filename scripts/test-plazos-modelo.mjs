const L='/home/claude/work/consultify/app/src/lib/';
const { validarPlanificacion, mesesEntre, sumarMeses } = await import(L+'planificacion.js');
const { calcular, mesesPorModelo } = await import(L+'calcEngine.js');
const ok = c => c ? '✓' : '✗ FALLO';
const ini='2026-10-01';

const caso = (modelo, mesesFin, normas=['9001'], cert='') => {
  const fin = sumarMeses(ini, mesesFin);
  const mContrato = mesesEntre(ini, fin);
  const mTrabajo = mesesEntre(ini, cert || fin);
  const mesesMotor = modelo === 'Implantación' ? mTrabajo : mContrato;
  const res = calcular(normas, modelo, { meses: mesesMotor });
  const v = validarPlanificacion({ inicio:ini, certificacion:cert, fin, modelo, normas });
  return { fin, mContrato, plazoOk: res.plazoOk, plazoCorto: res.plazoCorto,
           min: res.minMeses, errores: v.errores, avisos: v.avisos,
           bloquea: !res.plazoOk || v.errores.length > 0 };
};

console.log('── IMPLANTACIÓN · nunca bloquea por plazo (1 o 2 pagos, no cuotas) ──');
for (const m of [12, 8, 6, 3, 2]) {
  const c = caso('Implantación', m);
  console.log(` fin a ${String(m).padStart(2)} meses → bloquea: ${c.bloquea ? 'SÍ' : 'no '}`, ok(!c.bloquea),
    c.avisos.length ? ` · aviso: ${c.avisos[0].slice(0,52)}…` : '');
}

console.log('\n── APOYO · sí aplica el criterio (mín. 3, o 4 con >2 sistemas) ──');
console.log(' mínimo 1 sistema :', mesesPorModelo('Apoyo',1), '· 3 sistemas:', mesesPorModelo('Apoyo',3));
for (const [m,n,esp] of [[6,1,false],[3,1,false],[2,1,true],[4,3,false],[3,3,true]]) {
  const c = caso('Apoyo', m, Array(n).fill('9001').map((_,i)=>['9001','14001','45001'][i]));
  console.log(` fin a ${m} meses, ${n} sistema(s) → bloquea: ${c.bloquea ? 'SÍ' : 'no '}`, ok(c.bloquea===esp),
    c.errores.length ? ` · ${c.errores[0].slice(0,50)}…` : '');
}

console.log('\n── RECURRENTES · siguen bloqueando bajo el mínimo ──');
for (const [m,esp] of [[12,false],[6,true],[4,true]]) {   // permanencia mínima 12
  const c = caso('Compromiso', m);
  console.log(` fin a ${String(m).padStart(2)} meses → bloquea: ${c.bloquea ? 'SÍ' : 'no '}`, ok(c.bloquea===esp));
}

console.log('\n── Implantación con auditoría temprana: emite igual ──');
{
  const c = caso('Implantación', 12, ['9001','14001'], '2027-02-01');
  console.log(' cert al mes 4, contrato 12 → bloquea:', c.bloquea ? 'SÍ' : 'no', ok(!c.bloquea));
  console.log(' aviso:', c.avisos[0]?.slice(0,70) || 'ninguno');
}
