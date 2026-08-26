const B='/home/claude/work/consultify/app/src/lib/';
const { carteraDe, normalizarNombre, resumenCartera } = await import(B+'cartera.js');
const ok = c => c ? '✓' : '✗ FALLO';
const hoy=new Date(); hoy.setHours(0,0,0,0);
const en = d => { const x=new Date(hoy); x.setDate(x.getDate()+d); return x.toISOString().slice(0,10); };

const empresa = { id:'E1', nombre:'Metalúrgica Norte, S.L.', cif:'B-84.867.670' };

const datos = {
  presupuestos: [
    { id:'O1', cif:'b84867670', empresa:'Metalúrgica Norte SL', numero_oferta:'OF-1', precio:800, tipo:'mes', fecha_emision:'2026-01-10' },
    { id:'O2', cif:'B84867670 ', empresa:'x', numero_oferta:'OF-2', precio:900, tipo:'mes', fecha_emision:'2026-05-02' },
    { id:'O3', cif:null, empresa:'METALURGICA NORTE, S.L.', numero_oferta:'OF-3', precio:700, tipo:'mes', fecha_emision:'2026-03-01' },
    { id:'O9', cif:'B99999999', empresa:'Otra', numero_oferta:'OF-9', precio:100 },
  ],
  contratos: [
    { id:'C1', numero:'CT-1', presupuesto_id:'O1', cliente_cif:'B84867670', cliente_empresa:'Metalúrgica Norte, S.L.', estado:'firmado', importe:800, tipo:'mes', fecha_contrato:'2026-01-20', modelo:'Compromiso' },
    { id:'C9', numero:'CT-9', presupuesto_id:'O9', cliente_cif:'B99999999', cliente_empresa:'Otra', estado:'firmado', importe:1 },
  ],
  clientes: [
    { id:'CL1', empresa:'Metalúrgica Norte, S.L.', cif:'B84867670' },
    { id:'CL9', empresa:'Otra', cif:'B99999999' },
  ],
  proyectos: [
    { id:'P1', cliente_id:'CL1', nombre:'SGC ISO 9001', estado:'activo', modelo:'Compromiso', normas:['9001'], precio_mes:800, fecha_inicio:'2026-01-20', fecha_fin:en(20) },
    { id:'P2', cliente_id:'CL1', nombre:'SGA ISO 14001', estado:'cerrado', modelo:'Implantación', normas:['14001'], precio_total:6000, fecha_fin:'2025-06-01' },
    { id:'P9', cliente_id:'CL9', estado:'activo', modelo:'Relación', precio_mes:350, fecha_fin:en(200) },
  ],
};

const c = carteraDe(empresa, datos);
console.log('── Cruce por CIF con formatos distintos ──');
console.log(' ofertas encontradas :', c.ofertas.length, ok(c.ofertas.length===3));
console.log('   B-84.867.670 vs b84867670  ', ok(c.ofertas.some(o=>o.id==='O1'&&o._match==='cif')));
console.log('   CIF con espacio final      ', ok(c.ofertas.some(o=>o.id==='O2'&&o._match==='cif')));
console.log('   sin CIF, por nombre        ', ok(c.ofertas.some(o=>o.id==='O3'&&o._match==='nombre')));
console.log('   NO cuela la ajena          ', ok(!c.ofertas.some(o=>o.id==='O9')));
console.log(' contratos:', c.contratos.length, ok(c.contratos.length===1));
console.log(' proyectos:', c.proyectos.length, ok(c.proyectos.length===2));
console.log('   proyecto ajeno excluido    ', ok(!c.proyectos.some(p=>p.id==='P9')));

console.log('\n── Resumen ──');
const R=c.resumen;
console.log(' ofertas abiertas (O2,O3):', R.ofertasAbiertas, ok(R.ofertasAbiertas===2));
console.log(' proyectos activos       :', R.proyectosActivos, ok(R.proyectosActivos===1));
console.log(' comprometido/año        :', R.facturacionAnual, ok(R.facturacionAnual===9600));
console.log(' renovaciones pendientes :', R.renovaciones, ok(R.renovaciones===1));
console.log(' alerta                  :', R.alerta?.nivel, '·', R.alerta?.texto);
console.log(' última actividad        :', R.ultimaActividad, ok(R.ultimaActividad==='2026-05-02'));
console.log(' orden: más reciente 1ª  :', c.ofertas[0].numero_oferta, ok(c.ofertas[0].id==='O2'));
console.log(' resumen línea           :', resumenCartera(R));

console.log('\n── Enlaces ──');
console.log(' proyecto tiene id  :', ok(!!c.proyectos[0].id));
console.log(' contrato→oferta    :', c.contratos[0].presupuesto_id, ok(c.contratos[0].presupuesto_id==='O1'));
console.log(' oferta destino ok  :', ok(c.ofertas.some(o=>o.id===c.contratos[0].presupuesto_id)));
console.log(' cliente_id string  :', ok(c.proyectos.length===2));

console.log('\n── Normalización de nombre ──');
for (const [a,b,esperado] of [['Metalúrgica Norte, S.L.','METALURGICA NORTE SL',true],['Acme SA','ACME, S.A.',true],['Acme','Acme Global',false]])
  console.log(` "${a}" ≡ "${b}"`, ok((normalizarNombre(a)===normalizarNombre(b))===esperado));

console.log('\n── Empresa sin datos ──');
const v = carteraDe({id:'E2',nombre:'Nueva',cif:'B11111111'}, datos);
console.log(' vacía sin romper:', ok(v.ofertas.length===0 && v.resumen.facturacionAnual===0), '· alerta:', v.resumen.alerta);
console.log(' empresa null    :', ok(carteraDe(null,datos).ofertas.length===0));
