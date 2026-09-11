// Pruebas de lib/capitalizar.js (v137). Ejecutar: node scripts/test-capitalizar.mjs
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const L = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'consultify', 'app', 'src', 'lib') + '/';
const { capitalizar, capitalizarMarca, emailLimpio, cifLimpio, limpiarFila, cambiosFila } = await import(L + 'capitalizar.js');
let fallos = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗ FALLO'} ${m}`); if (!c) fallos++; };
const es = (a, e, m) => ok(a === e, `${m || ''} «${a}»${a === e ? '' : ` (esperaba «${e}»)`}`);

console.log('── Razones sociales en mayúsculas ──');
es(capitalizar('ACADEMIA AXON S.L.'), 'Academia Axon S.L.');
es(capitalizar('ADALID SERVICIOS CORPORATIVOS SL.'), 'Adalid Servicios Corporativos SL.');
es(capitalizar('GESVALT SOCIEDAD DE TASACION SA.'), 'Gesvalt Sociedad de Tasación SA.', 'forma jurídica SA');
es(capitalizar('FEMXA FORMACION SLU'), 'Femxa Formación SLU');
es(capitalizar('DISEÑARTE INFORMATICA Y COMUNICACIONES SLL.'), 'Diseñarte Informática y Comunicaciones SLL.', 'la «y» en minúscula');
es(capitalizar('CONFEDERACION ESPAÑOLA DE CENTROS DE ENSEÑANZA'), 'Confederación Española de Centros de Enseñanza', 'tilde recuperada');
es(capitalizar('FUNDACION CNSE PARA LA SUPRESION DE LAS BARRERAS DE COMUNICACION'), 'Fundación CNSE para la Supresión de las Barreras de Comunicación', 'sigla sin vocales + -sión');
es(capitalizar('GRUPO BC DE ASESORÍA HIPOTECARIA, S.L.'), 'Grupo BC de Asesoría Hipotecaria, S.L.');
es(capitalizar('IF DESARROLLOS SL.'), 'IF Desarrollos SL.', 'dos letras = sigla');
es(capitalizar('ORGANISMO AUTONOMO AGENCIA LOCAL DE EMPLEO Y FORMACION (ALEF)'), 'Organismo Autónomo Agencia Local de Empleo y Formación (ALEF)', 'sigla conocida entre paréntesis');
es(capitalizar('FUNDACIÓN UNIVERSIDAD-EMPRESA'), 'Fundación Universidad-Empresa', 'guion');
es(capitalizar('HOSPITAL UNIVERSITARIO JOSE GERMAIN'), 'Hospital Universitario José Germain');
es(capitalizar('CLUB EXCELENCIA EN GESTION VIA INNOVACION'), 'Club Excelencia en Gestión Vía Innovación');
es(capitalizar('SA CALOBRA SL'), 'SA Calobra SL', 'SA al principio también forma jurídica');

console.log('\n── Lo mezclado se respeta ──');
es(capitalizar('Fundación CNSE'), 'Fundación CNSE');
es(capitalizar('Asociación de Investigación de la Industria Agroalimentaria'), 'Asociación de Investigación de la Industria Agroalimentaria');
es(capitalizar('  BCD M&E  '), 'BCD M&E', 'solo se recorta');
es(capitalizar('Martinez Calvo'), 'Martinez Calvo', 'sin tilde pero mezclado: no se toca');

console.log('\n── Personas ──');
es(capitalizar('rafa galobi'), 'Rafa Galobi');
es(capitalizar('MIGUEL ANGEL ALVAREZ'), 'Miguel Ángel Álvarez');
es(capitalizar('de la cruz'), 'De la Cruz');
es(capitalizar("O'DONNELL"), "O'Donnell");
es(capitalizar('jefe'), 'Jefe');
es(capitalizar('CEO'), 'CEO');
es(capitalizar('HUJG'), 'HUJG');

console.log('\n── Direcciones ──');
es(capitalizar('CALLE RUIZ DE PADRON, LOC 5'), 'Calle Ruiz de Padrón, Loc 5');
es(capitalizar('C/SAN FRANCISCO 18'), 'C/San Francisco 18');
es(capitalizar('AV 9 DE JUNIO, Nº 2'), 'Av 9 de Junio, Nº 2');
es(capitalizar('AVENIDA ALFONSO XII, 45'), 'Avenida Alfonso XII, 45', 'número romano');
es(capitalizar('CALLE DIAZ Y BARCALA, S/N'), 'Calle Díaz y Barcala, S/N');
es(capitalizar('ALICANTE/ALACANT'), 'Alicante/Alacant');
es(capitalizar('SAN SEBASTIAN DE LA GOMERA'), 'San Sebastián de la Gomera');
es(capitalizar('C/ Miguel Yuste, 26 3ª planta'), 'C/ Miguel Yuste, 26 3ª planta');

console.log('\n── Marcas ──');
es(capitalizarMarca('AXON'), 'AXON', 'una palabra en mayúsculas se queda');
es(capitalizarMarca('TUCONSULTOR'), 'TUCONSULTOR');
es(capitalizarMarca('GRUPO COREMSA'), 'Grupo Coremsa');
es(capitalizarMarca('BC DIGITAL'), 'BC Digital');
es(capitalizarMarca('CLUB FINANCIERO GENOVA'), 'Club Financiero Génova');

console.log('\n── Correo y CIF ──');
es(emailLimpio('  Valle@CECE.es '), 'valle@cece.es');
es(cifLimpio('b-84.867 670'), 'B84867670');
es(cifLimpio('50720612t'), '50720612T');
ok(emailLimpio('') === null && cifLimpio(null) === null, 'vacío → null');

console.log('\n── Filas ──');
{
  const f = limpiarFila('empresas', { nombre: 'ACADEMIA AXON S.L.', nombre_comercial: 'AXON', email: 'Info@Axon.es', cif: 'b38785820', telefono: '600 000 000', notas: 'TODO EN MAYÚSCULAS SE QUEDA' });
  ok(f.nombre === 'Academia Axon S.L.' && f.nombre_comercial === 'AXON' && f.email === 'info@axon.es' && f.cif === 'B38785820', 'empresa: nombre, marca, correo y CIF');
  ok(f.notas === 'TODO EN MAYÚSCULAS SE QUEDA' && f.telefono === '600 000 000', 'campos sin regla no se tocan');
  const p = limpiarFila('contactos', { nombre: 'rafa', apellidos: null, email: undefined });
  ok(p.nombre === 'Rafa' && p.apellidos === null && !('email' in p ? p.email : false), 'contacto: null y ausentes intactos');
  ok(limpiarFila('tarea_sesiones', { titulo: 'X' }).titulo === 'X', 'tabla sin reglas: igual');
  const c = cambiosFila('presupuestos', { empresa: 'rafa', nombre: 'Rafa Galobi', email: 'a@b.com', cif: '50720612t' });
  ok(c.length === 2 && c[0][0] === 'empresa' && c[1][0] === 'cif', 'cambiosFila: solo lo que cambia');
  const dos = limpiarFila('empresas', limpiarFila('empresas', { nombre: 'ACADEMIA AXON S.L.' }));
  ok(dos.nombre === 'Academia Axon S.L.', 'aplicar dos veces = una');
}

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo correcto');
process.exit(fallos ? 1 : 0);
