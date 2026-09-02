// Simula el comportamiento del campo "fin" según el modelo, tal como lo
// implementa GeneradorOfertas: recurrentes enganchado al inicio, Apoyo e
// Implantación manual.
const L='/home/claude/work/consultify/app/src/lib/';
const { sumarMeses, mesesEntre, validarPlanificacion, MODELOS_PROYECTO } = await import(L+'planificacion.js');
const { calcular } = await import(L+'calcEngine.js');
const ok = c => c ? '✓' : '✗ FALLO';

// Réplica de la lógica del componente
function simular({ modelo, inicio, finManualPuesto = null, cert = '' }) {
  const finEsManual = MODELOS_PROYECTO.includes(modelo);
  let fin = sumarMeses(inicio, 12);
  if (finEsManual && finManualPuesto) fin = finManualPuesto;
  // Reenganche al pasar a recurrente
  if (!finEsManual) fin = sumarMeses(inicio, 12);
  const mTrabajo = mesesEntre(inicio, cert || fin);
  const mMotor = modelo === 'Implantación' ? mTrabajo : mesesEntre(inicio, fin);
  const res = calcular(['9001'], modelo, { meses: mMotor });
  const v = validarPlanificacion({ inicio, certificacion: cert, fin, modelo, normas: ['9001'] });
  return { finEsManual, fin, bloquea: !res.plazoOk || v.errores.length > 0, errores: v.errores, avisos: v.avisos };
}

const ini = '2026-10-01';

console.log('── ¿El fin es manual? ──');
for (const m of ['Apoyo','Implantación','Relación','Implicación','Compromiso']) {
  const s = simular({ modelo:m, inicio:ini });
  const esperado = ['Apoyo','Implantación'].includes(m);
  console.log(` ${m.padEnd(13)} manual: ${s.finEsManual ? 'sí' : 'no '}`, ok(s.finEsManual===esperado));
}

console.log('\n── Recurrentes: fin = inicio + 12, nunca bloquea ──');
for (const m of ['Relación','Implicación','Compromiso']) {
  const s = simular({ modelo:m, inicio:ini });
  console.log(` ${m.padEnd(13)} fin ${s.fin} · bloquea: ${s.bloquea?'SÍ':'no '}`,
    ok(s.fin==='2027-10-01' && !s.bloquea));
}

console.log('\n── Recurrente: un fin manual corto se ignora (se reengancha) ──');
{
  const s = simular({ modelo:'Compromiso', inicio:ini, finManualPuesto:'2027-01-01' });
  console.log(` fin resultante ${s.fin} · bloquea: ${s.bloquea?'SÍ':'no '}`, ok(s.fin==='2027-10-01' && !s.bloquea));
}

console.log('\n── Implantación: fin manual respetado y no bloquea ──');
for (const f of ['2027-04-01','2027-01-01','2026-12-01']) {
  const s = simular({ modelo:'Implantación', inicio:ini, finManualPuesto:f });
  console.log(` fin ${f} → ${s.fin} · bloquea: ${s.bloquea?'SÍ':'no '}`, ok(s.fin===f && !s.bloquea),
    s.avisos.length ? '· avisa' : '');
}

console.log('\n── Apoyo: fin manual respetado, criterios sí aplican ──');
for (const [f,esp] of [['2027-04-01',false],['2027-01-01',false],['2026-11-15',true]]) {
  const s = simular({ modelo:'Apoyo', inicio:ini, finManualPuesto:f });
  console.log(` fin ${f} → bloquea: ${s.bloquea?'SÍ':'no '}`, ok(s.bloquea===esp),
    s.errores.length ? `· ${s.errores[0].slice(0,44)}…` : '');
}
