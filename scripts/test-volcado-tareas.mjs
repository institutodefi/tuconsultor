const L='/home/claude/work/consultify/app/src/lib/';
const { tareasQueFaltan, filaDesdeCatalogo, resumenVolcado, puedeDarsePorHecha } = await import(L+'volcadoTareas.js');
const ok = c => c ? '✓' : '✗ FALLO';

const catalogo = [
  { id:'C1', norma_id:'9001', modelo:'Compromiso', titulo:'Revisión por la dirección', subproceso:'REVISION', horas_base:3, orden:1 },
  { id:'C2', norma_id:'9001', modelo:'Compromiso', titulo:'Auditoría interna',         subproceso:'AUDITOR',  horas_base:8, orden:2 },
  { id:'C3', norma_id:'9001', modelo:'Apoyo',      titulo:'Solo para Apoyo',           horas_base:2, orden:1 },
  { id:'C4', norma_id:'14001', modelo:'Compromiso', titulo:'Aspectos ambientales',     horas_base:5, orden:1 },
];
const ctx9001  = { id:'X1', norma:'9001' };
const ctx14001 = { id:'X2', norma:'14001' };

console.log('── Nunca se mezclan normas ──');
{
  const t = tareasQueFaltan({ contexto: ctx9001, modelo:'Compromiso', catalogo, existentes: [] });
  console.log(' 9001 recibe:', t.map(x=>x.titulo).join(' | '), ok(t.length===2));
  console.log(' NO recibe la de 14001', ok(!t.some(x=>x.norma_id==='14001')));
  const t2 = tareasQueFaltan({ contexto: ctx14001, modelo:'Compromiso', catalogo, existentes: [] });
  console.log(' 14001 recibe solo la suya:', t2.map(x=>x.titulo).join(''), ok(t2.length===1));
}

console.log('\n── Solo las del modelo del proyecto ──');
{
  const t = tareasQueFaltan({ contexto: ctx9001, modelo:'Compromiso', catalogo, existentes: [] });
  console.log(' excluye la de Apoyo', ok(!t.some(x=>x.titulo==='Solo para Apoyo')));
}

console.log('\n── No duplica lo que ya existe ──');
{
  const t = tareasQueFaltan({ contexto: ctx9001, modelo:'Compromiso', catalogo,
    existentes: [{ titulo:'  AUDITORÍA  INTERNA ' }] });   // con acentos y espacios distintos
  console.log(' quedan:', t.length, ok(t.length===1));
  console.log(' compara ignorando acentos y espacios', ok(!t.some(x=>x.titulo==='Auditoría interna')));
}

console.log('\n── La fila que se inserta ──');
{
  const f = filaDesdeCatalogo(catalogo[1], 'X1');
  console.log(' duración desde horas_base:', f.duracion_min, 'min', ok(f.duracion_min===480));
  console.log(' SIN fecha ni responsable  ', ok(!('fecha' in f) && !('consultor_id' in f)));
  console.log(' estado pendiente          ', ok(f.estado==='pendiente'));
  console.log(' arrastra el subproceso    ', f.subproceso, ok(f.subproceso==='AUDITOR'));
}

console.log('\n── Resumen antes de volcar ──');
{
  const r = resumenVolcado({ contextos:[ctx9001, ctx14001], modelo:'Compromiso', catalogo, tareasPorContexto:{} });
  console.log(' total:', r.total, '· horas:', r.horas, ok(r.total===3 && r.horas===16));
  const r2 = resumenVolcado({ contextos:[ctx9001], modelo:'Implantación', catalogo, tareasPorContexto:{} });
  console.log(' modelo sin tareas → avisa:', r2.vacios.join(','), ok(r2.total===0 && r2.vacios.length===1));
}

console.log('\n── Dar por hecha: solo el pasado ──');
{
  const d = (n) => { const x=new Date(); x.setDate(x.getDate()+n); return x.toISOString().slice(0,10); };
  console.log(' ayer  ', ok(puedeDarsePorHecha(d(-1))===true));
  console.log(' hoy   ', ok(puedeDarsePorHecha(d(0))===true));
  console.log(' mañana', ok(puedeDarsePorHecha(d(1))===false), '← no se registra trabajo futuro');
  console.log(' sin fecha', ok(puedeDarsePorHecha(null)===false));
}
