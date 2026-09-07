// Pruebas de lib/cuentaClientePuro.js. Ejecutar: node scripts/test-cuenta-cliente.mjs
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const L = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'consultify', 'app', 'src', 'lib') + '/';
const C = await import(L + 'cuentaClientePuro.js');
let fallos = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗ FALLO'} ${m}`); if (!c) fallos++; };

console.log('── Rol en la cuenta ──');
const cl = { id: 'cl1', cif: 'B-12.345.678', user_id: 'u-admin' };
const usuarios = [
  { cliente_id: 'cl1', email: 'Ana@Empresa.es', rol_cuenta: 'admin' },
  { cliente_id: 'cl1', email: 'luis@empresa.es', rol_cuenta: 'usuario' },
  { cliente_id: 'cl2', email: 'otro@x.es', rol_cuenta: 'admin' },
];
ok(C.rolCuenta({ id: 'x', email: 'ana@empresa.es' }, cl, usuarios) === 'admin', 'admin por correo (sin distinguir mayúsculas)');
ok(C.rolCuenta({ id: 'x', email: 'luis@empresa.es' }, cl, usuarios) === 'usuario', 'usuario por correo');
ok(C.rolCuenta({ id: 'u-admin', email: 'nadie@x.es' }, cl, usuarios) === 'admin', 'el enlazado por user_id es admin aunque no esté en la lista');
ok(C.rolCuenta({ id: 'x', email: 'otro@x.es' }, cl, usuarios) === null, 'de otra cuenta → null');
ok(C.rolCuenta({ id: 'x', email: 'otro@x.es' }, { id: 'cl2' }, usuarios) === 'admin', 'admin en la suya');
ok(C.rolCuenta(null, cl, usuarios) === null && C.rolCuenta({ id: 'x' }, null, usuarios) === null, 'sin usuario o sin cliente → null');

console.log('\n── Empresa del CRM ──');
const empresas = [
  { id: 'e1', nombre: 'Otra', cif: 'A11111111', es_cliente: true, creado: '2026-01-01' },
  { id: 'e2', nombre: 'Norte proveedor', cif: 'B12345678', es_cliente: false, creado: '2026-01-01' },
  { id: 'e3', nombre: 'Norte cliente', cif: 'b12345678', es_cliente: true, creado: '2026-02-01' },
  { id: 'e4', nombre: 'Por traza', cif: null, cliente_id_old: 'cl9', creado: '2026-02-01' },
];
ok(C.normCif(' b-12.345.678 ') === 'B12345678', 'CIF normalizado');
ok(C.empresaDeCliente(cl, empresas)?.id === 'e3', 'por CIF: la que es cliente antes que la proveedora');
ok(C.empresaDeCliente({ id: 'cl9', cif: 'Z9' }, empresas)?.id === 'e4', 'la traza cliente_id_old manda');
ok(C.empresaDeCliente({ id: 'cl7', cif: '' }, empresas) === null, 'sin CIF ni traza → null');

console.log('\n── Contactos de la empresa ──');
const contactos = [
  { id: 'c1', nombre: 'Valle', apellidos: 'Torregrosa', email: 'valle@cece.es', cargo: 'Directora de Calidad' },
  { id: 'c2', nombre: 'Ana', apellidos: 'B', email: 'ana@cece.es' },
  { id: 'c3', nombre: 'Ajeno', email: 'x@otra.es' },
];
const enlaces = [
  { id: 'l1', empresa_id: 'e3', contacto_id: 'c1', rol: 'directivo', principal: false },
  { id: 'l2', empresa_id: 'e3', contacto_id: 'c1', rol: 'proyecto', principal: true },
  { id: 'l3', empresa_id: 'e3', contacto_id: 'c2', rol: 'facturacion', cargo: 'Administración' },
  { id: 'l4', empresa_id: 'e1', contacto_id: 'c3', rol: 'directivo' },
];
const lista = C.contactosDeEmpresa('e3', enlaces, contactos);
ok(lista.length === 2, `una fila por persona aunque tenga dos roles (${lista.length})`);
ok(lista[0].id === 'c1' && lista[0].principal && lista[0].roles.join() === 'directivo,proyecto', `la principal primero, con sus roles (${lista[0].roles?.join()})`);
ok(lista[1].cargo === 'Administración', 'el cargo del enlace completa el de la persona');
ok(C.contactosDeEmpresa(null, enlaces, contactos).length === 0, 'sin empresa → vacío');

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo correcto');
process.exit(fallos ? 1 : 0);
