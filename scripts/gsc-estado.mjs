#!/usr/bin/env node
/**
 * Google no tiene IndexNow. Su canal de "avísame de esta URL" son el sitemap,
 * Search Console y la Indexing API (que está limitada oficialmente a JobPosting
 * y BroadcastEvent: usarla para páginas normales va contra sus condiciones).
 *
 * Lo que sí es útil y legítimo automatizar:
 *   1) reenviar el sitemap tras cada despliegue (Search Console API)
 *   2) auditar el estado de indexación de las URLs con URL Inspection API,
 *      que es de solo lectura y tiene cuota de 2.000 consultas al día
 *
 * Requisitos:
 *   npm i googleapis
 *   Cuenta de servicio de Google Cloud con la Search Console API activada,
 *   añadida como PROPIETARIO de la propiedad en Search Console.
 *   export GOOGLE_APPLICATION_CREDENTIALS=/ruta/a/credenciales.json
 *
 * Uso:
 *   node scripts/gsc-estado.mjs sitemap          → reenvía el sitemap
 *   node scripts/gsc-estado.mjs inspeccionar     → audita las URLs del sitemap
 *   node scripts/gsc-estado.mjs inspeccionar 50  → solo las 50 primeras
 */
import { google } from 'googleapis';
import { readFileSync } from 'node:fs';

const PROPIEDAD = 'sc-domain:tuconsultor.com';   // propiedad de dominio
const SITEMAP = 'https://www.tuconsultor.com/sitemap.xml';

const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/webmasters'],
});
const sc = google.searchconsole({ version: 'v1', auth });

function urlsDelSitemap() {
  const xml = readFileSync('web/sitemap.xml', 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

async function reenviarSitemap() {
  await sc.sitemaps.submit({ siteUrl: PROPIEDAD, feedpath: SITEMAP });
  console.log('✓ sitemap reenviado a Search Console');
  const { data } = await sc.sitemaps.get({ siteUrl: PROPIEDAD, feedpath: SITEMAP });
  console.log(`  última descarga: ${data.lastDownloaded || '—'} · errores: ${data.errors || 0} · avisos: ${data.warnings || 0}`);
}

async function inspeccionar(limite) {
  const urls = urlsDelSitemap().slice(0, limite || Infinity);
  const resumen = {};
  const problemas = [];
  for (const url of urls) {
    try {
      const { data } = await sc.urlInspection.index.inspect({
        requestBody: { siteUrl: PROPIEDAD, inspectionUrl: url, languageCode: 'es-ES' },
      });
      const r = data.inspectionResult?.indexStatusResult || {};
      const veredicto = r.verdict || 'DESCONOCIDO';
      resumen[veredicto] = (resumen[veredicto] || 0) + 1;
      if (veredicto !== 'PASS') {
        problemas.push({ url, veredicto, motivo: r.coverageState || '—', robots: r.robotsTxtState || '—' });
      }
    } catch (e) {
      problemas.push({ url, veredicto: 'ERROR', motivo: e.message.slice(0, 80), robots: '—' });
    }
    await new Promise((r) => setTimeout(r, 400)); // no agotar la cuota de golpe
  }
  console.log('\nResumen:', resumen);
  if (problemas.length) {
    console.log(`\n${problemas.length} URL(s) que no están indexadas:\n`);
    for (const p of problemas.slice(0, 40)) {
      console.log(`  ${p.veredicto.padEnd(9)} ${p.motivo.padEnd(38)} ${p.url}`);
    }
  }
}

const [, , cmd, arg] = process.argv;
if (cmd === 'sitemap') await reenviarSitemap();
else if (cmd === 'inspeccionar') await inspeccionar(arg ? Number(arg) : 0);
else console.log('Uso: node scripts/gsc-estado.mjs sitemap | inspeccionar [n]');
