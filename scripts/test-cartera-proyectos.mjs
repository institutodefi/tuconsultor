const L='/home/claude/work/consultify/app/src/lib/';
const { resolverProyecto, resolverProyectos } = await import(L+'proyectoResuelto.js');
const ok = c => c ? '✓' : '✗ FALLO';

const empresas = [
  { id:'E1', nombre:'TRESCORE PROYECTOS ITE, S.L.', nombre_comercial:'TuConsultor', cif:'B84867670' },
  { id:'E2', nombre:'DISEÑARTE INFORMATICA Y COMUNICACIONES SLL.', nombre_comercial:'', cif:'B87795688' },
];
const clientes = [
  { id:'CL1', empresa:'TRESCORE PROYECTOS ITE SL', cif:'b-84.867.670' },   // CIF con otro formato
  { id:'CL2', empresa:'DISEÑARTE INFORMATICA Y COMUNICACIONES SLL.', cif:'B87795688' },
  { id:'CL3', empresa:'Cliente sin ficha CRM', cif:null },
];
const presupuestos = [
  { id:'OF1', numero_oferta:'OFE-2026-A', cif:'B84867670', normas:['9001','14001'], modelo:'Compromiso' },
  { id:'OF2', numero_oferta:'OFE-2026-B', cif:'B87795688', normas:['9001','14001','27001'], modelo:'Relación' },
];
const contratos = [{ id:'CT1', presupuesto_id:'OF2', estado:'firmado' }];

console.log('── 1 · Nombre comercial ──');
{
  const r = resolverProyecto({ id:'P1', cliente_id:'CL1', oferta_id:'OF1' }, { clientes, empresas, presupuestos });
  console.log(' muestra           :', r.nombreCliente, ok(r.nombreCliente === 'TuConsultor'));
  console.log(' razón social aparte:', r.razonSocial, ok(r.razonSocial.startsWith('TRESCORE')));
  console.log(' cruza con CIF de otro formato (b-84.867.670 ↔ B84867670)', ok(!!r.empresa));
}
{
  // Sin nombre comercial cae a la razón social: siempre hay algo que mostrar
  const r = resolverProyecto({ id:'P2', cliente_id:'CL2', oferta_id:'OF2' }, { clientes, empresas, presupuestos });
  console.log(' sin comercial → razón social:', r.nombreCliente.slice(0,20)+'…', ok(r.nombreCliente.startsWith('DISEÑARTE')));
}
{
  const r = resolverProyecto({ id:'P3', cliente_id:'CL3' }, { clientes, empresas, presupuestos });
  console.log(' sin ficha en el CRM →', r.nombreCliente, ok(r.nombreCliente === 'Cliente sin ficha CRM'));
}

console.log('\n── 2 · Normas y modelo desde la oferta ──');
{
  // El proyecto NO los tiene: es el caso de la cartera actual
  const r = resolverProyecto({ id:'P4', cliente_id:'CL2', oferta_id:'OF2', normas:[], modelo:null },
    { clientes, empresas, presupuestos });
  console.log(' normas :', r.normas.join(' + '), ok(r.normas.length === 3));
  console.log(' modelo :', r.modelo, ok(r.modelo === 'Relación'));
  console.log(' origen :', r.origenAlcance, ok(r.origenAlcance === 'oferta'));
  console.log(' nº oferta:', r.numeroOferta, ok(r.numeroOferta === 'OFE-2026-B'));
}
{
  // Llegando por el contrato, no por la oferta
  const r = resolverProyecto({ id:'P5', cliente_id:'CL2', contrato_id:'CT1' },
    { clientes, empresas, presupuestos, contratos });
  console.log(' vía contrato → normas:', r.normas.join(' + '), ok(r.normas.length === 3));
}

console.log('\n── 3 · Un ajuste a mano NO se pisa, se avisa ──');
{
  const r = resolverProyecto({ id:'P6', cliente_id:'CL2', oferta_id:'OF2', normas:['9001','14001','27001','45001'], modelo:'Compromiso' },
    { clientes, empresas, presupuestos });
  console.log(' desfases detectados:', r.desfases.length, ok(r.desfases.length === 2));
  r.desfases.forEach(d => console.log(`   ${d.campo}: proyecto «${d.enProyecto}» vs oferta «${d.enOferta}»`));
  console.log(' manda la oferta al mostrar:', r.normas.length, ok(r.normas.length === 3));
}

console.log('\n── 4 · Proyecto sin oferta ──');
{
  const r = resolverProyecto({ id:'P7', cliente_id:'CL3', normas:['9001'], modelo:'Apoyo' }, { clientes, empresas, presupuestos });
  console.log(' usa su copia:', r.normas.join(','), r.modelo, ok(r.origenAlcance === 'proyecto'));
  console.log(' marcado sinOferta:', r.sinOferta, ok(r.sinOferta === true));
}

console.log('\n── 5 · Sin datos no rompe ──');
console.log(' proyecto null:', resolverProyecto(null, {}), ok(resolverProyecto(null, {}) === null));
console.log(' contexto vacío:', ok(!!resolverProyecto({ id:'X', cliente_id:'Z' }, {})));
console.log(' lista vacía:', resolverProyectos([], {}).length, ok(resolverProyectos([], {}).length === 0));
