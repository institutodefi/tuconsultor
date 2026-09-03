const P='/home/claude/work/consultify/app/src/lib/proyectos.js';
const m = await import(P);
const hoy = new Date(); hoy.setHours(0,0,0,0);
const en = d => { const x=new Date(hoy); x.setDate(x.getDate()+d); return x.toISOString().slice(0,10); };
const ok = c => c ? '✓' : '✗ FALLO';

console.log('── Semáforo por días restantes ──');
for (const d of [90, 61, 60, 45, 31, 30, 15, 0, -1, -40]) {
  const s = m.semaforo({ fecha_fin: en(d), estado:'activo' });
  console.log(`  ${String(d).padStart(4)} d → ${s.nivel.padEnd(9)} "${s.etiqueta}"`);
}
console.log('\n── Fronteras exactas ──');
console.log(' 61 d es ok        ', ok(m.semaforo({fecha_fin:en(61)}).nivel==='ok'));
console.log(' 60 d es amarillo  ', ok(m.semaforo({fecha_fin:en(60)}).nivel==='amarillo'));
console.log(' 31 d es amarillo  ', ok(m.semaforo({fecha_fin:en(31)}).nivel==='amarillo'));
console.log(' 30 d es rojo      ', ok(m.semaforo({fecha_fin:en(30)}).nivel==='rojo'));
console.log('  0 d es rojo      ', ok(m.semaforo({fecha_fin:en(0)}).nivel==='rojo'));
console.log(' -1 d es vencido   ', ok(m.semaforo({fecha_fin:en(-1)}).nivel==='vencido'));
console.log(' sin fecha         ', ok(m.semaforo({}).nivel==='sin_fecha'));

console.log('\n── Fecha de fin por defecto ──');
const casos = [
  ['Compromiso','2026-03-15',null,'2027-03-15'],
  ['Relación','2026-01-31',null,'2027-01-31'],
  ['Implantación','2026-01-10','2026-09-30','2026-09-30'],
  ['Implantación','2026-01-10',null,'2027-01-10'],
  ['Apoyo','2026-01-10',null,''],
];
for (const [modelo, ini, aud, esperado] of casos) {
  const r = m.fechaFinPorDefecto({modelo, fecha_inicio:ini, fecha_auditoria:aud});
  console.log(` ${modelo.padEnd(13)} ${ini} → ${r||'(vacío)'} ${ok(r===esperado)}`);
}
console.log('\n── Fin de mes: 31 ene + 1 mes ──');
console.log(' ', m.sumarMeses('2026-01-31',1), ok(m.sumarMeses('2026-01-31',1)==='2026-02-28'));

console.log('\n── Renovación emitida silencia el aviso ──');
console.log(' sin emitir  ', ok(m.necesitaRenovacion({fecha_fin:en(20),estado:'activo'})===true));
console.log(' ya emitida  ', ok(m.necesitaRenovacion({fecha_fin:en(20),estado:'activo',renovacion_emitida:'2026-08-01'})===false));

console.log('\n── Resumen y orden ──');
const lista = [
  {id:1,estado:'activo',fecha_fin:en(90)},
  {id:2,estado:'activo',fecha_fin:en(20)},
  {id:3,estado:'activo',fecha_fin:en(-5)},
  {id:4,estado:'activo',fecha_fin:en(50)},
  {id:5,estado:'cerrado',fecha_fin:en(10)},
  {id:6,estado:'activo'},
];
console.log(' resumen:', JSON.stringify(m.resumen(lista)));
console.log(' orden  :', m.ordenarPorUrgencia(lista).map(p=>p.id).join(' → '), ok(m.ordenarPorUrgencia(lista)[0].id===3));
console.log(' cerrado excluido:', ok(!m.ordenarPorUrgencia(lista).some(p=>p.id===5)));
