const L='/home/claude/work/consultify/app/src/lib/';
const { finContratoRecurrente, sumarMeses, mesesEntre, hoyISO, validarPlanificacion } = await import(L+'planificacion.js');
const { calcular } = await import(L+'calcEngine.js');
const ok = c => c ? '✓' : '✗ FALLO';
console.log('Zona horaria:', Intl.DateTimeFormat().resolvedOptions().timeZone);

console.log('\n── El bug de zona horaria ──');
console.log(' hoyISO           :', hoyISO());
console.log(' +12 meses de hoy :', sumarMeses(hoyISO(), 12));
console.log(' 26/08/26 +12m    :', sumarMeses('2026-08-26',12), ok(sumarMeses('2026-08-26',12)==='2027-08-26'));

console.log('\n── Fin recurrente = 12 meses + 1 día, y el plazo sale 12 ──');
for (const ini of ['2026-08-26','2026-10-01','2026-01-31','2026-12-31','2028-02-29']) {
  const fin = finContratoRecurrente(ini);
  const m = mesesEntre(ini, fin);
  const res = calcular(['9001'],'Compromiso',{ meses:m });
  const v = validarPlanificacion({ inicio:ini, certificacion:'', fin, modelo:'Compromiso', normas:['9001'] });
  const bloquea = !res.plazoOk || v.errores.length>0;
  console.log(` ${ini} → ${fin} · ${m} meses · bloquea: ${bloquea?'SÍ':'no '}`, ok(m>=12 && !bloquea));
}

console.log('\n── Sin el día extra (lo de antes) salía 11 y bloqueaba ──');
{
  const ini='2026-08-26', fin=sumarMeses(ini,12);
  const m=mesesEntre(ini,fin);
  console.log(` ${ini} → ${fin} · ${m} meses`, m===12 ? '(ya no falla tras arreglar la zona horaria)' : '');
}

console.log('\n── Editable: un fin puesto a mano se respeta ──');
{
  const ini='2026-10-01', fin='2028-01-15';
  const m=mesesEntre(ini,fin);
  const res=calcular(['9001'],'Compromiso',{ meses:m });
  console.log(` fin ${fin} · ${m} meses · plazoOk:`, res.plazoOk, ok(res.plazoOk));
}
