// Pruebas de netlify/functions/publicaciones-lib.mjs (v139): parseo del CSV y mapeo a la tabla.
// Ejecutar: node scripts/test-publicaciones.mjs
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const R = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { parsearCsv, filaTabla, campanaDe } = await import(path.join(R, 'consultify', 'netlify', 'functions', 'publicaciones-lib.mjs'));
let fallos = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗ FALLO'} ${m}`); if (!c) fallos++; };

console.log('── Parseo CSV ──');
{
  const f = parsearCsv('id,texto,red\n1,"Hola, ""mundo""\nsegunda línea",linkedin\r\n2,simple,instagram\n');
  ok(f.length === 2, 'dos filas');
  ok(f[0].texto === 'Hola, "mundo"\nsegunda línea' && f[0].red === 'linkedin', 'comillas dobladas, coma y salto de línea dentro del campo');
  ok(f[1].id === '2' && f[1].red === 'instagram', 'fila simple con CRLF');
  ok(parsearCsv('﻿id,a\n3,x').length === 1, 'BOM ignorado');
}

console.log('── Mapeo a la tabla ──');
{
  const t = filaTabla({ id: '885', fecha: '14/09/2026', hora: '8:45', red: 'Linkedin_Alejandro', texto: 'x utm_campaign=orbita-ventajas', imagen_url: 'i', enlace: 'https://www.tuconsultor.com/orbita/', publicado: '', lista: '' });
  ok(t.fecha === '2026-09-14' && t.hora === '08:45:00' && t.red === 'linkedin_alejandro', 'fecha, hora y red normalizadas');
  ok(t.campana === 'orbita-ventajas' && !('publicado_en' in t), 'campaña detectada y sin columnas de publicación');
  ok(filaTabla({ id: '5', fecha: '', hora: '', red: 'linkedin' }).fecha === null, 'fecha vacía → null (no se publica)');
  ok(campanaDe({ id: 'PV003' }) === 'premios' && campanaDe({ id: 'R001', red: 'instagram_reel' }) === 'reels' && campanaDe({ id: '200', enlace: 'https://www.tuconsultor.com/blog/post.html?p=x' }) === 'blog' && campanaDe({ id: '300', enlace: 'https://www.tuconsultor.com/orbita/', texto: '' }) === 'orbita', 'campañas por id/enlace');
}

console.log('── El calendario real ──');
{
  const filas = parsearCsv(fs.readFileSync(path.join(R, 'web', 'data', 'calendario_publicacion.csv'), 'utf8')).map(filaTabla);
  const ids = new Set(filas.map((f) => f.id));
  ok(filas.length > 1700 && ids.size === filas.length, `${filas.length} filas, ids únicas`);
  ok(filas.every((f) => ['linkedin', 'linkedin_alejandro', 'instagram'].includes(f.red)), 'redes válidas');
  ok(filas.every((f) => f.fecha === null || /^\d{4}-\d{2}-\d{2}$/.test(f.fecha)), 'fechas ISO o null');
  const v = filas.filter((f) => f.campana === 'orbita-ventajas');
  const dias = new Set(v.map((f) => f.fecha));
  ok(v.length === 963 && dias.size === 321 && v.every((f) => f.fecha), 'orbita-ventajas: 963 filas, 321 días, todas con fecha');
  const porDia = {}; for (const f of v) porDia[f.fecha] = (porDia[f.fecha] || 0) + 1;
  ok(Object.values(porDia).every((n) => n === 3), '3 publicaciones de Orbita por día (empresa, Alejandro, Instagram)');
  const viejas = filas.filter((f) => f.campana === 'orbita' && f.fecha && f.fecha >= '2026-09-14');
  ok(viejas.length === 0, 'la campaña antigua de Orbita no tiene fechas desde el 14/09');
  const reels = parsearCsv(fs.readFileSync(path.join(R, 'web', 'data', 'calendario_reels.csv'), 'utf8')).map(filaTabla);
  ok(reels.length === 140 && reels.every((f) => f.red === 'instagram_reel' && f.video_url), 'reels: 140 filas con vídeo');
}

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo correcto');
process.exit(fallos ? 1 : 0);
