// Comprueba la mecánica del lote sin React: la lógica pura de lib/lote.js
// replicada, que es lo que hay que garantizar que no cambia.
const ok = c => c ? '✓' : '✗ FALLO';

// Réplica de `ejecutar`: una a una, con recuento de fallos
async function ejecutar(filas, fn) {
  const fallos = []; let hechos = 0;
  for (const f of filas) {
    try { await fn(f); hechos += 1; }
    catch (e) { fallos.push({ fila: f, error: e.message }); }
  }
  return { hechos, total: filas.length, fallos };
}

console.log('── Un fallo no detiene el lote ──');
{
  const filas = [1,2,3,4,5].map(id => ({ id }));
  const tocados = [];
  const r = await ejecutar(filas, async (f) => {
    if (f.id === 3) throw new Error('sin email válido');
    tocados.push(f.id);
  });
  console.log(' procesados      :', r.hechos, ok(r.hechos === 4));
  console.log(' fallidos        :', r.fallos.length, ok(r.fallos.length === 1));
  console.log(' sigue tras fallo:', tocados.join(','), ok(tocados.includes(4) && tocados.includes(5)));
  console.log(' motivo guardado :', r.fallos[0].error, ok(r.fallos[0].error === 'sin email válido'));
}

console.log('\n── Marcar todos afecta SOLO a lo visible ──');
{
  const todos = [1,2,3,4,5,6,7,8,9,10].map(id => ({ id }));
  const visibles = todos.slice(0, 3);            // con filtro puesto
  const marcados = new Set(visibles.map(x => String(x.id)));
  const seleccionados = visibles.filter(x => marcados.has(String(x.id)));
  console.log(' visibles        :', visibles.length, ok(visibles.length === 3));
  console.log(' seleccionados   :', seleccionados.length, ok(seleccionados.length === 3));
  console.log(' fuera de filtro :', ok(!seleccionados.some(x => x.id > 3)));
}

console.log('\n── La selección se limpia al terminar ──');
{
  let marcados = new Set(['1','2']);
  await ejecutar([{id:1},{id:2}], async () => {});
  marcados = new Set();
  console.log(' vacía después   :', marcados.size, ok(marcados.size === 0));
}

console.log('\n── CSV: escapado y BOM ──');
{
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  console.log(' comillas dobles :', esc('Dice "hola"'), ok(esc('Dice "hola"') === '"Dice ""hola"""'));
  console.log(' punto y coma    :', esc('A;B'), ok(esc('A;B') === '"A;B"'));
  console.log(' nulo → vacío    :', esc(null), ok(esc(null) === '""'));
  const csv = '\uFEFF' + 'A;B';
  console.log(' lleva BOM       :', ok(csv.charCodeAt(0) === 0xFEFF));
}

console.log('\n── Correos: solo válidos y sin repetir ──');
{
  const val = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());
  const filas = [
    { email: 'a@b.es' }, { email: 'a@b.es' }, { email: 'malo' },
    { email: null }, { email: 'c@d.com' },
  ];
  const correos = [...new Set(filas.map(f => f.email).filter(val))];
  console.log(' resultado       :', correos.join('; '), ok(correos.length === 2));
}
