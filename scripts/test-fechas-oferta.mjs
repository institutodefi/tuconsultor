const L='/home/claude/work/consultify/app/src/lib/';
const { sumarMeses, mesesEntre, validarPlanificacion } = await import(L+'planificacion.js');
const { calcular } = await import(L+'calcEngine.js');
const ok = c => c ? '✓' : '✗ FALLO';

console.log('── Fin automático a 12 meses del inicio ──');
for (const [a,esp] of [['2026-10-01','2027-10-01'],['2026-01-31','2027-01-31'],['2028-02-29','2029-02-28']])
  console.log(` ${a} → ${sumarMeses(a,12)}`, ok(sumarMeses(a,12)===esp));

console.log('\n── SIN certificación: se puede generar ──');
{
  const ini='2026-10-01', fin=sumarMeses(ini,12), cert='';
  const mContrato = mesesEntre(ini, fin);
  const res = calcular(['9001'],'Compromiso',{ meses:mContrato });
  const v = validarPlanificacion({ inicio:ini, certificacion:cert, fin, modelo:'Compromiso', normas:['9001'] });
  console.log(' meses de contrato :', mContrato, ok(mContrato===12));
  console.log(' plazoOk           :', res.plazoOk, ok(res.plazoOk===true));
  console.log(' errores           :', v.errores.length, ok(v.errores.length===0));
}

console.log('\n── Certificación TEMPRANA (mes 5), contrato 12: se puede generar ──');
{
  const ini='2026-10-01', fin=sumarMeses(ini,12), cert='2027-03-01';
  const mContrato = mesesEntre(ini, fin);
  const res = calcular(['9001'],'Compromiso',{ meses:mContrato });
  const v = validarPlanificacion({ inicio:ini, certificacion:cert, fin, modelo:'Compromiso', normas:['9001'] });
  console.log(' plazoOk           :', res.plazoOk, ok(res.plazoOk===true));
  console.log(' errores           :', v.errores.length, ok(v.errores.length===0));
  console.log(' avisos            :', v.avisos.length ? v.avisos[0].slice(0,60)+'…' : 'ninguno');
}

console.log('\n── Certificación DESPUÉS del fin: permitido ──');
{
  const ini='2026-10-01', fin=sumarMeses(ini,12);
  const v = validarPlanificacion({ inicio:ini, certificacion:'2027-11-15', fin, modelo:'Compromiso', normas:['9001'] });
  console.log(' errores           :', v.errores.length, ok(v.errores.length===0));
}

console.log('\n── Contrato demasiado corto: sí bloquea ──');
{
  const ini='2026-10-01', fin='2027-01-01';
  const v = validarPlanificacion({ inicio:ini, certificacion:'', fin, modelo:'Compromiso', normas:['9001'] });
  console.log(' errores           :', v.errores.length, ok(v.errores.length===1));
  console.log(' mensaje           :', v.errores[0]?.slice(0,70)+'…');
}

console.log('\n── Fin anterior al inicio: bloquea ──');
{
  const v = validarPlanificacion({ inicio:'2026-10-01', certificacion:'', fin:'2026-09-01', modelo:'Compromiso', normas:['9001'] });
  console.log(' errores           :', v.errores.length, ok(v.errores.length>=1));
}
