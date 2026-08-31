const P = '/home/claude/work/consultify/app/src/lib/permisos.js';
const { can, rolesAsignablesPor, tabsParaRol, gruposParaRol } = await import(P);
const ok = c => c ? '✓' : '✗ FALLO';

console.log('── Administración tiene TODAS las pestañas ──');
const s = tabsParaRol('superadmin').map(t => t.to).sort();
const a = tabsParaRol('admin').map(t => t.to).sort();
console.log(' superadmin:', s.length, '· admin:', a.length, ok(s.length === a.length));
const faltan = s.filter(x => !a.includes(x));
console.log(' le faltan a admin:', faltan.length ? faltan.join(', ') : 'ninguna', ok(!faltan.length));

console.log('\n── Capacidades compartidas ──');
for (const c of ['verEconomico', 'gestionarEquipo', 'gestionarAccesos', 'verRegistroAccesos'])
  console.log(` ${c.padEnd(20)} admin:`, can[c]('admin'), ok(can[c]('admin') === true));

console.log('\n── Reservado a Superadministración ──');
for (const c of ['gestionarSuperadmins', 'verComoOtroRol'])
  console.log(` ${c.padEnd(22)} super:`, can[c]('superadmin'), '· admin:', can[c]('admin'),
    ok(can[c]('superadmin') === true && can[c]('admin') === false));

console.log('\n── Roles asignables ──');
const rs = rolesAsignablesPor('superadmin'), ra = rolesAsignablesPor('admin');
console.log(' superadmin puede asignar:', rs.join(', '), ok(rs.includes('superadmin')));
console.log(' admin puede asignar     :', ra.join(', '), ok(!ra.includes('superadmin')));
console.log(' admin NO puede ascender a superadmin', ok(!ra.includes('superadmin')));

console.log('\n── Los demás roles no ganan nada ──');
for (const r of ['director', 'consultor', 'gestion', 'cliente']) {
  const gana = can.gestionarAccesos(r) || can.verRegistroAccesos(r) || rolesAsignablesPor(r).length;
  console.log(` ${r.padEnd(10)}`, ok(!gana));
}

console.log('\n── El menú de admin no queda vacío ni duplicado ──');
const g = gruposParaRol('admin');
console.log(' grupos:', g.length, '· items:', g.reduce((n, x) => n + x.items.length, 0),
  ok(g.length > 0 && g.every(x => x.items.length > 0)));
