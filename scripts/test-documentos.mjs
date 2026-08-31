// Réplica de las políticas de acceso, que es lo que hay que garantizar.
const ok = c => c ? '✓' : '✗ FALLO';
const EQUIPO = ['superadmin','admin','director','consultor','gestion'];
const esEquipo = (r) => EQUIPO.includes(r);

const veDocumento = (rol, uid, doc, clientes) =>
  esEquipo(rol) || clientes.some(c => c.id === doc.cliente_id && c.user_id === uid);
const veNota = (rol) => esEquipo(rol);
const puedeSubir = (rol, uid, clienteId, clientes) =>
  esEquipo(rol) || clientes.some(c => c.id === clienteId && c.user_id === uid);
const puedeBorrar = (rol) => ['superadmin','admin','director'].includes(rol);

const clientes = [
  { id: 'CL1', user_id: 'u-ana' },
  { id: 'CL2', user_id: 'u-luis' },
];
const doc1 = { id: 'D1', cliente_id: 'CL1' };

console.log('── Documentos: los ve todo el mundo (los suyos) ──');
for (const r of EQUIPO) console.log(` ${r.padEnd(11)} ve el doc de CL1`, ok(veDocumento(r, 'x', doc1, clientes)));
console.log(' cliente dueño     ', ok(veDocumento('cliente', 'u-ana', doc1, clientes)));
console.log(' cliente AJENO     ', ok(!veDocumento('cliente', 'u-luis', doc1, clientes)), '← no ve los de otro');

console.log('\n── Nota de IA: SOLO el equipo ──');
for (const r of EQUIPO) console.log(` ${r.padEnd(11)}`, ok(veNota(r)));
console.log(' cliente           ', ok(!veNota('cliente')), '← ni siquiera el dueño del documento');

console.log('\n── Subir ──');
console.log(' consultor         ', ok(puedeSubir('consultor', 'x', 'CL1', clientes)));
console.log(' cliente en su ficha', ok(puedeSubir('cliente', 'u-ana', 'CL1', clientes)));
console.log(' cliente en otra   ', ok(!puedeSubir('cliente', 'u-ana', 'CL2', clientes)));

console.log('\n── Borrar: solo dirección ──');
for (const [r, esp] of [['superadmin',true],['admin',true],['director',true],['consultor',false],['gestion',false],['cliente',false]])
  console.log(` ${r.padEnd(11)}`, ok(puedeBorrar(r) === esp));
console.log(' un cliente NO borra lo que aportó', ok(!puedeBorrar('cliente')), '← si no, el expediente queda incompleto sin rastro');

console.log('\n── Caducidad ──');
const dias = (f) => { const h=new Date(); h.setHours(0,0,0,0); return Math.round((new Date(f+'T12:00:00')-h)/86400000); };
const hoy = new Date(); const en = (d) => { const x=new Date(hoy); x.setDate(x.getDate()+d); return x.toISOString().slice(0,10); };
for (const [d, etq] of [[-30,'caducado'],[15,'cerca'],[59,'cerca'],[61,'lejos']]) {
  const n = dias(en(d));
  const marca = n < 0 ? 'caducado' : n <= 60 ? 'cerca' : 'lejos';
  console.log(` ${String(d).padStart(4)} días → ${marca.padEnd(9)}`, ok(marca === etq));
}
