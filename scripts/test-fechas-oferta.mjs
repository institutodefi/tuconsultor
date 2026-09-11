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

// ── Apoyo: se puede elegir sin certificación; para emitir hay que declararla (o fijar el fin) ──
{
  const { validarPlanificacion, motivoNoDisponible } = await import('../consultify/app/src/lib/planificacion.js');
  const ok = (c, m) => { if (!c) { console.error('FALLA:', m); process.exit(1); } };
  ok(motivoNoDisponible({ inicio: '2026-09-15', certificacion: null, normas: ['9001'] }, 'Apoyo') === null, 'Apoyo elegible sin fecha de certificación');
  ok(/3 meses/.test(motivoNoDisponible({ inicio: '2026-09-15', certificacion: '2027-03-15', normas: ['9001'] }, 'Apoyo') || ''), 'Apoyo vetado a 6 meses de la certificación');
  ok(motivoNoDisponible({ inicio: '2026-09-15', certificacion: '2026-11-30', normas: ['9001'] }, 'Apoyo') === null, 'Apoyo elegible a menos de 3 meses');
  const sinNada = validarPlanificacion({ inicio: '2026-09-15', certificacion: '', fin: '2026-12-15', modelo: 'Apoyo', normas: ['9001'], finManual: false });
  ok(sinNada.errores.some((e) => /declarar/.test(e)), 'sin certificación ni fin a mano → pide declararla');
  const conFin = validarPlanificacion({ inicio: '2026-09-15', certificacion: '', fin: '2026-12-15', modelo: 'Apoyo', normas: ['9001'], finManual: true });
  ok(!conFin.errores.length, `con fin a mano a 3 meses → válido (${conFin.errores[0] || ''})`);
  const conCert = validarPlanificacion({ inicio: '2026-09-15', certificacion: '2026-12-01', fin: '2027-09-15', modelo: 'Apoyo', normas: ['9001'], finManual: false });
  ok(!conCert.errores.length, `con certificación a menos de 3 meses → válido (${conCert.errores[0] || ''})`);
  console.log('apoyo: reglas ok');
}

// ── Apoyo: un solo pago ──
{
  const { calcular } = await import('../consultify/app/src/lib/calcEngine.js').catch(() => ({}));
  const ok = (c, m) => { if (!c) { console.error('FALLA:', m); process.exit(1); } };
  if (calcular) {
    const r = calcular(['9001'], 'Apoyo', { meses: 3 });
    ok(r.formasPago && r.formasPago.soloUnico === true && r.formasPago.dos === null, 'Apoyo: solo pago único');
    ok(r.formasPago.unico.sinIva === r.precioCatalogo, 'Apoyo: el pago único es el importe de la bolsa, sin descuento');
    const i = calcular(['9001'], 'Implantación', { meses: 12 });
    ok(i.formasPago && i.formasPago.dos && i.formasPago.dos.cuota1SinIva > 0, 'Implantación: sigue con dos formas');
    console.log('apoyo pago único: ok');
  } else console.log('calcular no exportado: se omite');
}
