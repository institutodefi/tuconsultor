const L='/home/claude/work/consultify/app/src/lib/';
const { horasEntre, horasDe, balanceTarea, sesionesTrasCertificacion, solapes } = await import(L+'sesionesTarea.js');
const ok = c => c ? '✓' : '✗ FALLO';

console.log('── Horas de una sesión ──');
for (const [a,b,e] of [['09:00','13:00',4],['09:30','13:45',4.25],['08:00','18:00',10],['13:00','09:00',0],['','',0]])
  console.log(` ${a||'—'}→${b||'—'} = ${horasEntre(a,b)} h`, ok(horasEntre(a,b)===e));

console.log('\n── Varias sesiones para la MISMA tarea se suman ──');
{
  const ss = [
    { id:'S1', estado:'hecha',      hora_inicio:'09:00', hora_fin:'13:00', horas:4 },
    { id:'S2', estado:'programada', hora_inicio:'09:00', hora_fin:'12:00', horas:3 },
    { id:'S3', estado:'anulada',    hora_inicio:'09:00', hora_fin:'18:00', horas:9 },
  ];
  console.log(' planificadas (sin anuladas):', horasDe(ss), ok(horasDe(ss)===7));
  console.log(' ejecutadas (solo hechas)  :', horasDe(ss,true), ok(horasDe(ss,true)===4));
}

console.log('\n── Comparación con lo comprometido ──');
{
  const t = { horas_teoricas: 8 };
  const casos = [
    ['sin sesiones',      [], 'sin_planificar'],
    ['4 de 8 h',          [{estado:'programada',horas:4}], 'corto'],
    ['8 de 8 h',          [{estado:'programada',horas:8}], 'ajustado'],
    ['12 de 8 h',         [{estado:'programada',horas:12}], 'pasado'],
    ['7,8 de 8 (margen)', [{estado:'programada',horas:7.8}], 'ajustado'],
  ];
  for (const [etq, ss, esp] of casos) {
    const b = balanceTarea(t, ss);
    console.log(` ${etq.padEnd(20)} → ${b.estado.padEnd(15)} dif ${b.dif>0?'+':''}${b.dif}`, ok(b.estado===esp));
  }
  console.log(' las teóricas NO cambian nunca:', balanceTarea(t,[{estado:'programada',horas:99}]).teoricas, ok(balanceTarea(t,[{estado:'programada',horas:99}]).teoricas===8));
}

console.log('\n── Aviso: sesiones tras la certificación ──');
{
  const ss = [
    { estado:'programada', fecha:'2026-05-01' },
    { estado:'programada', fecha:'2026-06-15' },   // después
    { estado:'anulada',    fecha:'2026-07-01' },   // anulada: no cuenta
  ];
  const t = sesionesTrasCertificacion(ss, '2026-06-01');
  console.log(' detectadas:', t.length, ok(t.length===1));
  console.log(' la anulada no cuenta', ok(!t.some(s=>s.estado==='anulada')));
  console.log(' sin fecha de certificación no avisa:', sesionesTrasCertificacion(ss,null).length, ok(sesionesTrasCertificacion(ss,null).length===0));
}

console.log('\n── Solapes del mismo consultor ──');
{
  const ss = [
    { id:'A', estado:'programada', consultor_id:'u1', fecha:'2026-05-01', hora_inicio:'09:00', hora_fin:'13:00' },
    { id:'B', estado:'programada', consultor_id:'u2', fecha:'2026-05-01', hora_inicio:'10:00', hora_fin:'12:00' },
  ];
  const solapa = solapes(ss, { id:null, consultor_id:'u1', fecha:'2026-05-01', hora_inicio:'12:00', hora_fin:'14:00' });
  console.log(' pisa a u1:', solapa.length, ok(solapa.length===1));
  const otro = solapes(ss, { id:null, consultor_id:'u1', fecha:'2026-05-01', hora_inicio:'13:00', hora_fin:'15:00' });
  console.log(' justo después NO solapa:', otro.length, ok(otro.length===0));
  const otroDia = solapes(ss, { id:null, consultor_id:'u1', fecha:'2026-05-02', hora_inicio:'09:00', hora_fin:'13:00' });
  console.log(' otro día NO solapa:', otroDia.length, ok(otroDia.length===0));
}

// ── Duración de la sesión nueva = horas que faltan a la tarea (hasta una jornada) ──
{
  const { duracionSesion, sumarHoras, JORNADA } = await import('../consultify/app/src/lib/sesionesTarea.js');
  const ok = (c, m) => { if (!c) { console.error('FALLA:', m); process.exit(1); } };
  ok(duracionSesion(3) === 3, 'faltan 3 → 3 h');
  ok(duracionSesion(2.3) === 2.25, 'se redondea al cuarto de hora');
  ok(duracionSesion(40) === JORNADA, 'más de una jornada → 8 h');
  ok(duracionSesion(0.1) === 0.5, 'mínimo media hora');
  ok(sumarHoras('09:00', 3) === '12:00' && sumarHoras('09:00', 2.5) === '11:30' && sumarHoras('09:00', 8) === '17:00', 'hora fin');
  console.log('duración de sesión: ok');
}
