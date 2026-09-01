const { trocearDireccion } = await import('/home/claude/work/consultify/netlify/functions/validar-vies.mjs');
const ok = c => c ? '✓' : '✗ FALLO';

console.log('── Troceo de la dirección de VIES por país ──');
const casos = [
  ['ES', 'C/ GRAN VIA 1\n28013 MADRID',                      'C/ GRAN VIA 1', '28013', 'MADRID', 'España'],
  ['ES', 'AV DIAGONAL 100\nESC A PISO 3\n08019 BARCELONA',    'AV DIAGONAL 100, ESC A PISO 3', '08019', 'BARCELONA', 'España'],
  ['PT', 'RUA DA PRATA 10\n1100-052 LISBOA',                  'RUA DA PRATA 10', '1100-052', 'LISBOA', 'Portugal'],
  ['IT', 'VIA ROMA 25\nMILANO 20121',                         'VIA ROMA 25', '20121', 'MILANO', 'Italia'],
  ['BE', 'RUE NEUVE 4\nB-1000 BRUXELLES',                     'RUE NEUVE 4', '1000', 'BRUXELLES', 'Bélgica'],
  ['DE', 'HAUPTSTR 5\n10115 BERLIN',                          'HAUPTSTR 5', '10115', 'BERLIN', 'Alemania'],
  ['NL', 'DAMRAK 1\n1012 LG AMSTERDAM',                       'DAMRAK 1', '1012', 'LG AMSTERDAM', 'Países Bajos'],
];
for (const [p, txt, dir, cp, pob, pais] of casos) {
  const r = trocearDireccion(txt, p);
  const bien = r.direccion === dir && r.cp === cp && r.poblacion === pob && r.pais === pais;
  console.log(` ${p} ${ok(bien)} ${(r.direccion || '—').padEnd(32)} | ${String(r.cp).padEnd(9)} | ${r.poblacion}`);
}

console.log('\n── Casos límite: nunca se inventa un dato ──');
console.log(' vacío devuelve null            ', ok(trocearDireccion('', 'ES') === null));
console.log(' null devuelve null             ', ok(trocearDireccion(null, 'ES') === null));
console.log(' sin patrón → todo a dirección  ', ok(trocearDireccion('SEDE CENTRAL', 'FR').direccion === 'SEDE CENTRAL'));
console.log(' sin patrón → cp y población null', ok(trocearDireccion('SEDE CENTRAL', 'FR').cp === null && trocearDireccion('SEDE CENTRAL', 'FR').poblacion === null));
console.log(' país desconocido → pais null   ', ok(trocearDireccion('X 1\n00000 Y', 'ZZ').pais === null));
console.log(' provincia nunca se deduce      ', ok(!('provincia' in trocearDireccion('C/ A 1\n28013 MADRID', 'ES'))));
