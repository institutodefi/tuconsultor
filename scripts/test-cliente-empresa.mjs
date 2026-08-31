const L='/home/claude/work/consultify/app/src/lib/';
const { empresasCliente, buscarCliente, normalizarNombre } = await import(L+'clienteDeEmpresa.js');
const ok = c => c ? '✓' : '✗ FALLO';

const empresas = [
  { id:'E1', nombre:'Metalúrgica Norte, S.L.', cif:'B-84.867.670', es_cliente:true },
  { id:'E2', nombre:'Alfa Servicios SA',       cif:'A11111111',    es_cliente:true },
  { id:'E3', nombre:'Proveedor Uno, S.L.',     cif:'B22222222',    es_cliente:false, es_proveedor:true },
  { id:'E4', nombre:'Sin CIF',                 cif:null,           es_cliente:true },
];
const clientes = [
  { id:'CL1', empresa:'METALURGICA NORTE SL', cif:'b84867670 ' },
  { id:'CL4', empresa:'Sin CIF',              cif:null },
];

console.log('── Solo las marcadas como cliente, ordenadas ──');
const lista = empresasCliente(empresas);
console.log(' nº:', lista.length, ok(lista.length===3));
console.log(' proveedor excluido:', ok(!lista.some(e=>e.id==='E3')));
console.log(' orden alfabético  :', lista.map(e=>e.nombre[0]).join(''), ok(lista[0].nombre.startsWith('Alfa')));

console.log('\n── Resolver la ficha operativa ──');
console.log(' por CIF con formato distinto:', buscarCliente(empresas[0], clientes)?.id, ok(buscarCliente(empresas[0],clientes)?.id==='CL1'));
console.log(' por nombre cuando no hay CIF:', buscarCliente(empresas[3], clientes)?.id, ok(buscarCliente(empresas[3],clientes)?.id==='CL4'));
console.log(' sin ficha devuelve null     :', buscarCliente(empresas[1], clientes), ok(buscarCliente(empresas[1],clientes)===null));
console.log(' empresa nula no rompe       :', buscarCliente(null, clientes), ok(buscarCliente(null,clientes)===null));

console.log('\n── Normalización de razón social ──');
for (const [a,b,esp] of [['Metalúrgica Norte, S.L.','METALURGICA NORTE SL',true],['Alfa Servicios SA','ALFA SERVICIOS, S.A.',true],['Alfa','Alfa Global',false]])
  console.log(` "${a}" ≡ "${b}"`, ok((normalizarNombre(a)===normalizarNombre(b))===esp));
