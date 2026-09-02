// ════════════════════════════════════════════════════════════════════════════
// PRECIOS DE LA WEB, GENERADOS DESDE EL MOTOR
//
// Los precios de `web/servicios/consultify.html` estaban escritos a mano. Con
// las reglas comerciales viviendo en `calcEngine.js`, eso significa que cada
// cambio de tarifa hay que replicarlo a mano en dieciséis tarjetas, y que basta
// un despiste para publicar un precio que el generador no reconoce.
//
// Este script lee el motor y reescribe las tarjetas. Lo que se publica es el
// RESULTADO, nunca la regla: el visitante ve «desde 3.350 €», no de dónde sale.
//
//     python3 -c ...   →  node scripts/precios-web.mjs           comprueba
//                         node scripts/precios-web.mjs --aplicar escribe
// ════════════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.dirname(new URL(import.meta.url).pathname).replace(/\/scripts$/, '');
const PAGINA = path.join(RAIZ, 'web', 'servicios', 'consultify.html');

const { calcular } = await import(path.join(RAIZ, 'consultify/app/src/lib/calcEngine.js'));

// Las tarjetas de la web, en el mismo orden en que están.
const TARJETAS = [
  { titulo: 'ISO 9001', normas: ['9001'] },
  { titulo: 'ISO 14001', normas: ['14001'] },
  { titulo: 'ISO 27001', normas: ['27001'] },
  { titulo: 'ISO 45001', normas: ['45001'] },
  { titulo: 'ISO 42001', normas: ['42001'] },
  { titulo: 'ISO 9001 + 21001', normas: ['9001', '21001'] },
  { titulo: 'ISO 56001', normas: ['56001'] },
  { titulo: 'ISO 9001 + 9004', normas: ['9001', '9004'] },
  { titulo: 'UNE 93200', normas: ['93200'] },
];

const eur = (n) => Math.round(n).toLocaleString('es-ES');

const filas = TARJETAS.map((t) => {
  try {
    const r = calcular(t.normas, 'Implantación', {});
    return { ...t, precio: r.precioCatalogo, horas: r.hTotal, ok: true };
  } catch (e) {
    return { ...t, ok: false, error: e.message };
  }
});

console.log('Precios que da el motor para Implantación:\n');
for (const f of filas) {
  if (!f.ok) { console.log(`  ✗ ${f.titulo}: ${f.error}`); continue; }
  console.log(`  ${f.titulo.padEnd(18)} ${eur(f.precio).padStart(7)} €   ${String(f.horas).padStart(3)} h`);
}

// ── Comparar con lo publicado ──
const html = fs.readFileSync(PAGINA, 'utf-8');
// El marcado lleva ahora un `<span class="impl-desde">` delante de la cifra.
const RE_TARJETA = /<div class="impl-price">(?:<span class="impl-desde"[^>]*>[^<]*<\/span>\s*)?<span data-keep-ltr>([\d.]+)<\/span><span>€<\/span><\/div>\s*<div class="impl-time"><span data-keep-ltr>(\d+) h<\/span>/g;
const publicados = [...html.matchAll(RE_TARJETA)];

console.log(`\nEn la web hay ${publicados.length} tarjetas con precio.`);
let difs = 0;
publicados.forEach((m, i) => {
  const f = filas[i];
  if (!f?.ok) return;
  const pWeb = Number(m[1].replace(/\./g, ''));
  const hWeb = Number(m[2]);
  if (pWeb !== Math.round(f.precio) || hWeb !== f.horas) {
    console.log(`  ⚠ ${f.titulo}: web ${eur(pWeb)} € / ${hWeb} h  ·  motor ${eur(f.precio)} € / ${f.horas} h`);
    difs += 1;
  }
});
console.log(difs ? `\n${difs} tarjeta(s) desactualizadas.` : '\nTodo coincide.');

// ── Escribir ──
if (process.argv.includes('--aplicar') && difs) {
  let i = 0;
  const nuevo = html.replace(
    /(<div class="impl-price">(?:<span class="impl-desde"[^>]*>[^<]*<\/span>\s*)?<span data-keep-ltr>)[\d.]+(<\/span><span>€<\/span><\/div>\s*<div class="impl-time"><span data-keep-ltr>)\d+( h<\/span>)/g,
    (m, a, b, c) => {
      const f = filas[i++];
      return (f?.ok) ? `${a}${eur(f.precio)}${b}${f.horas}${c}` : m;
    });
  fs.writeFileSync(PAGINA, nuevo);
  console.log('Página actualizada.');
} else if (difs) {
  console.log('Ejecuta con --aplicar para actualizarla.');
}
