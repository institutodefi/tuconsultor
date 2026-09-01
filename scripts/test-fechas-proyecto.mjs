const L='/home/claude/work/consultify/app/src/lib/';
const { fechasDeProyecto, hayDesfase, restarDias, mesesEntre, DIAS_ANTES_CERTIFICACION } = await import(L+'fechasProyecto.js');
const ok = c => c ? '✓' : '✗ FALLO';

console.log('── Fecha límite: certificación −', DIAS_ANTES_CERTIFICACION, 'días ──');
for (const [c,e] of [['2027-02-15','2027-01-31'],['2026-03-05','2026-02-18'],['2026-01-10','2025-12-26']])
  console.log(` ${c} → ${restarDias(c,15)}`, ok(restarDias(c,15)===e));

console.log('\n── El contrato manda sobre la oferta ──');
{
  const r = fechasDeProyecto({},
    { fecha_inicio:'2026-02-01', fecha_certificacion:'2027-02-01' },
    { fecha_inicio:'2026-03-01' });
  console.log('  inicio:', r.inicio, '·', r.origen.inicio, ok(r.inicio==='2026-03-01' && r.origen.inicio==='contrato'));
}

console.log('\n── Sin contrato, manda la oferta ──');
{
  const r = fechasDeProyecto({ fecha_inicio:'2020-01-01' },
    { fecha_inicio:'2026-02-01', fecha_certificacion:'2027-02-01' }, null);
  console.log('  inicio:', r.inicio, ok(r.inicio==='2026-02-01'), '← no la copia vieja del proyecto');
  console.log('  límite:', r.limite, ok(r.limite==='2027-01-17'));
  console.log('  meses :', r.meses, ok(r.meses===12));
}

console.log('\n── Sin certificación, no se inventa el límite ──');
{
  const r = fechasDeProyecto({ fecha_limite:'2026-06-01', meses_estimados:6 },
    { fecha_inicio:'2026-02-01' }, null);
  console.log('  límite conserva el del proyecto:', r.limite, ok(r.limite==='2026-06-01'));
  console.log('  meses del proyecto             :', r.meses, ok(r.meses===6));
}

console.log('\n── Detección de desfase ──');
{
  const of = { fecha_inicio:'2026-02-01', fecha_certificacion:'2027-02-01', fecha_fin:'2027-02-02' };
  const r = fechasDeProyecto({ fecha_inicio:'2026-02-01', fecha_fin:'2027-02-02', fecha_limite:'2027-01-17', meses_estimados:12 }, of, null);
  console.log('  ya alineado → sin cambios:', hayDesfase({ fecha_inicio:'2026-02-01', fecha_fin:'2027-02-02', fecha_limite:'2027-01-17', meses_estimados:12 }, r).length, ok(hayDesfase({ fecha_inicio:'2026-02-01', fecha_fin:'2027-02-02', fecha_limite:'2027-01-17', meses_estimados:12 }, r).length===0));
  const d = hayDesfase({ fecha_inicio:'2025-01-01', fecha_limite:null, meses_estimados:3 }, r);
  console.log('  desalineado →', d.join(', '), ok(d.length>=2));
}

console.log('\n── Meses entre fechas ──');
for (const [a,b,e] of [['2026-02-01','2027-02-01',12],['2026-02-01','2026-05-15',4],['2026-05-01','2026-02-01',null]])
  console.log(` ${a} → ${b} = ${mesesEntre(a,b)}`, ok(mesesEntre(a,b)===e));
