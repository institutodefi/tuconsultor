// netlify/functions/generar-oferta.mjs
// Genera la oferta (PDF + PPTX) a partir de normas + modelo + datos de cliente,
// la sube a Supabase Storage (bucket 'ofertas') y devuelve las URLs públicas.
//
// Variables de entorno requeridas en Netlify:
//   VITE_SUPABASE_URL      → URL del proyecto Supabase
//   SUPABASE_SERVICE_ROLE  → service role key (solo backend, NUNCA en el front)
//
// Requiere el bucket 'ofertas' (público) creado en Supabase Storage
// (ver migracion-v25-storage-ofertas.sql).

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import PptxGenJS from 'pptxgenjs';
import { CATALOGO_ANEXO } from './catalogo-anexo.mjs';
// PDF premium. Para volver a la versión anterior, cambiar por
// './documento-oferta.mjs': la función expuesta es la misma.
import { generarPDFOferta } from './documento-oferta-premium.mjs';
import { LOGO_CONSULTIFY, LOGO_TUCONSULTOR } from './logos-oferta.mjs';
import { PIE_TUCONSULTOR, PIE_CONSULTIFY, PIE_ORBITA } from './assets-oferta.mjs';
import { LOGO_TUCONSULTOR_BLANCO } from './logos-oferta.mjs';
import { HEX, EMISOR, condiciones, REQUISITOS_LEGALES, clausulas, propuesta, fmtEur, fmtEur0, fechaLarga } from './contenido-oferta.mjs';

// Mapa de prefijo de proceso → nombre de bloque legible (para agrupar el Anexo I).
const BLOQUES = {
  PE1: 'Planificación estratégica', PE2: 'Evaluación del desempeño', PE3: 'Mejora continua',
  PE4: 'Gestión de la cartera de innovación', PE5: 'Gobernanza de IA',
  PA1: 'Gestión de personas', PA2: 'Gestión medioambiental', PA3: 'Gestión del conocimiento e información',
  PA4: 'Gestión de infraestructuras y activos', PA5: 'Gestión de seguridad de la información',
  PA6: 'Gestión de partes subcontratadas', PA7: 'Gestión económica y administrativa',
  PA8: 'Gestión de PI y vigilancia', PA9: 'Gestión de alianzas', PA10: 'Gestión de datos para IA',
  PA11: 'Información a partes interesadas', PA12: 'Uso responsable de IA', PA13: 'Relaciones con terceros',
  PI1: 'Proceso de innovación', PI2: 'Gestión de iniciativas de innovación', PI3: 'Ciclo de vida del sistema de IA',
  PR1: 'Incorporación de usuarios', PR2: 'Atención al usuario', PR3: 'Baja y servicios generales',
};
// Agrupa los subprocesos del modelo (solo los que aplican a las normas elegidas) por bloque legible.
function tareasPorBloque(normaIds, modeloId) {
  const filas = CATALOGO_ANEXO[modeloId] || CATALOGO_ANEXO['Implantación'] || [];
  const grupos = new Map();
  for (const f of filas) {
    const aplica = f.normas.some((id) => normaIds.includes(id));
    if (!aplica) continue;
    const pref = (f.proc.split(' ')[0] || '').toUpperCase();
    const bloque = BLOQUES[pref] || f.proc;
    if (!grupos.has(bloque)) grupos.set(bloque, []);
    // Limpiar el nombre del subproceso (quitar prefijo Sx y código) para legibilidad
    const limpio = f.sub.replace(/^S\d+\s+/, '').replace(/\s*\(.*?\)\s*$/, '').trim();
    grupos.get(bloque).push(limpio);
  }
  return [...grupos.entries()].map(([bloque, subs]) => ({ bloque, subs }));
}

// ======================= MOTOR (réplica de calcEngine.js) =======================
// ⚠️ IMPORTANTE · MOTOR DE CÁLCULO DUPLICADO
// Este archivo replica el motor de app/src/lib/calcEngine.js (NORMAS, MODELOS,
// TARIFA, MARGEN, IVA y la función calcular). Está duplicado porque las funciones
// de Netlify se empaquetan aparte del front y no comparten el bundle.
//
// >>> SI CAMBIAS UN PRECIO, TARIFA, MARGEN O FÓRMULA EN calcEngine.js,
// >>> TIENES QUE REPLICARLO AQUÍ, O EL PDF MOSTRARÁ UN PRECIO DISTINTO
// >>> AL QUE EL CLIENTE VIO EN EL SIMULADOR.
//
// Verificado (v135): 3.770 combinaciones de normas × modelos comparadas entre
// ambos motores → 0 diferencias en precio, IVA, total y fraccionamiento.
const NORMAS = [
  { id: '9001', nombre: 'ISO 9001', desc: 'Gestión de la calidad', nivel: 'J3', hApoyo: 34 },
  { id: '14001', nombre: 'ISO 14001', desc: 'Gestión ambiental', nivel: 'J3', hApoyo: 46 },
  { id: '45001', nombre: 'ISO 45001', desc: 'Seguridad y salud laboral', nivel: 'J2', hApoyo: 63 },
  { id: '27001', nombre: 'ISO 27001', desc: 'Seguridad de la información', nivel: 'J2', hApoyo: 81 },
  { id: '42001', nombre: 'ISO 42001', desc: 'Inteligencia artificial', nivel: 'J3', hApoyo: 42 },
  { id: '56001', nombre: 'ISO 56001', desc: 'Gestión de la innovación', nivel: 'J3', hApoyo: 75 },
  { id: '21001', nombre: 'ISO 21001', desc: 'Organizaciones educativas', nivel: 'J3', hApoyo: 19, solape9001: 0.5 },
  { id: '9004', nombre: 'ISO 9004', desc: 'Calidad sostenible', nivel: 'J3', hApoyo: 11, solape9001: 0.5 },
  { id: 'une93200', nombre: 'UNE 93200', desc: 'Cartas de Servicios', nivel: 'J3', hApoyo: 25 },
  { id: 'une158101', nombre: 'UNE 158101', desc: 'Centros residenciales', nivel: 'J3', hApoyo: 91 },
  { id: 'une66181', nombre: 'UNE 66181', desc: 'Calidad de la formación virtual', nivel: 'J3', hApoyo: 30 },
  { id: 'igualdad', nombre: 'Plan de Igualdad', desc: 'Plan de igualdad de empresa', nivel: 'J2', hApoyo: 30 },
  { id: 'madridexcelente', nombre: 'Madrid Excelente', desc: 'Marca de garantía de la Comunidad de Madrid', nivel: 'J3', hApoyo: 30 },
];
const NORMA_BY_ID = Object.fromEntries(NORMAS.map((n) => [n.id, n]));
const TARIFA = { J1: 30, J2: 40, J3: 55, Senior: 75 };
const MARGEN = 0.60, IVA = 0.21, MESES_IMPL = 12;

// Aviso obligatorio en TODAS las ofertas (espejo de app/src/lib/legal.js).
// Redacción con perspectiva de género: "personas trabajadoras", "equipo consultor".
const DISCLAIMER_OFERTA =
  'Oferta orientativa sujeta a validación. El importe calculado en la web es una estimación de partida y no tiene ' +
  'carácter contractual. Queda sujeto a la validación del equipo consultor y al alcance definitivo del sistema de ' +
  'gestión, al número de personas trabajadoras y al número de sedes o centros de trabajo incluidos. No incluye las ' +
  'tasas de la entidad de certificación.';
const MODELOS = {
  Apoyo: { tipo: 'bolsa', hSist: null, hPres: 0, paso: 100, suelo: 0, leyenda: 'Pago único prepagado al 100 %. No contratable a menos de 60 días de una auditoría externa. Acompañamiento a auditoría aparte (600 €/jornada).' },
  Relación: { tipo: 'mes', hSist: 2, hPres: 0, paso: 25, suelo: 350, leyenda: 'Cuota mensual recurrente. Permanencia mínima 12 meses.' },
  Implicación: { tipo: 'mes', hSist: 4, hPres: 2, paso: 25, suelo: 350, leyenda: 'Cuota mensual recurrente. Permanencia mínima 12 meses.' },
  Compromiso: { tipo: 'mes', hSist: 6, hPres: 2, paso: 25, suelo: 350, leyenda: 'Cuota mensual recurrente. Permanencia mínima 12 meses.' },
  Implantación: { tipo: 'mes', hSist: 2.4, hPres: 1.2, paso: 25, suelo: 350, leyenda: 'Cuota durante la fase de implantación. 50% por adelantado + 50% antes de la auditoría externa.' },
};
const eur = (v) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v) + ' €';

function calcular(normaIds, modeloId, opts = {}) {
  const m = MODELOS[modeloId];
  if (!m || !normaIds?.length) return null;
  const normas = normaIds.map((id) => NORMA_BY_ID[id]).filter(Boolean);
  if (!normas.length) return null;
  const f9001 = opts.tiene9001 ? 0.5 : 1;
  const raw = { J2: 0, J3: 0, Senior: 0 };
  if (m.tipo === 'bolsa') { for (const n of normas) raw[n.nivel] += n.hApoyo * (n.id === '9001' ? f9001 : 1); }
  else {
    for (const n of normas) raw[n.nivel] += m.hSist * (n.solape9001 ?? 1) * (n.id === '9001' ? f9001 : 1);
    if (m.hPres > 0) { const lider = normas.some((n) => n.nivel === 'J3') ? 'J3' : 'J2'; raw[lider] += m.hPres; }
  }
  const coord = (raw.J2 + raw.J3) * 0.10;
  if (normas.length <= 4) raw.J3 += coord; else raw.Senior += coord;
  const h = { J2: Math.ceil(raw.J2), J3: Math.ceil(raw.J3), Senior: Math.ceil(raw.Senior) };
  const hTotal = h.J2 + h.J3 + h.Senior;
  const coste = h.J2 * TARIFA.J2 + h.J3 * TARIFA.J3 + h.Senior * TARIFA.Senior;
  const precioExacto = Math.round(coste * (1 + MARGEN));
  let precioCatalogo = Math.ceil(precioExacto / m.paso) * m.paso;
  if (m.suelo > 0) precioCatalogo = Math.max(m.suelo, precioCatalogo);
  const iva = Math.round(precioCatalogo * IVA * 100) / 100;
  const totalConIva = Math.round((precioCatalogo + iva) * 100) / 100;
  let fraccionado = null;
  let formasPago = null;
  if (modeloId === 'Implantación') {
    const meses = Math.max(parseInt(opts.meses, 10) || MESES_IMPL, 1);
    const totalSinIva = precioCatalogo * meses;
    const totalConIvaFrac = Math.round(totalSinIva * (1 + IVA) * 100) / 100;
    const r2 = (x) => Math.round(x * 100) / 100;
    // Dos únicas formas de pago de la implantación.
    const DTO = 0.05;
    const unicoSinIva = r2(totalSinIva * (1 - DTO));
    const c = r2(totalConIvaFrac / 2);
    fraccionado = {
      meses, totalSinIva, totalConIva: totalConIvaFrac,
      cuota1: c, cuota2: r2(totalConIvaFrac - c), cuota3: 0,
      plan: '50 % a la firma y 50 % antes del inicio de las auditorías',
    };
    formasPago = {
      descuentoUnico: DTO,
      unico: { titulo: 'Pago único', sinIva: unicoSinIva, total: r2(unicoSinIva * (1 + IVA)), ahorro: r2(totalSinIva - unicoSinIva),
               condicion: 'Un solo pago al inicio del proyecto, con un 5 % de descuento.' },
      dos:   { titulo: 'Dos cuotas', sinIva: totalSinIva, total: totalConIvaFrac, cuota1: c, cuota2: r2(totalConIvaFrac - c),
               condicion: '50 % a la firma, para arrancar el proyecto, y 50 % antes del inicio de las auditorías.' },
      nota: 'La implantación no admite cuota mensual: se abona en pago único o en dos cuotas.',
    };
  }
  return { modelo: modeloId, tipo: m.tipo, normas: normas.map((n) => n.id), nSistemas: normas.length, tiene9001: !!opts.tiene9001, horas: h, hTotal, coste, precioExacto, precioCatalogo, iva, totalConIva, fraccionado, formasPago, leyenda: m.leyenda };
}

// ======================= GENERADORES =======================
const NAVY = rgb(0.024, 0.106, 0.271);  // #061B45
const ORANGE = rgb(0.961, 0.651, 0.137); // #F5A623
const MUTED = rgb(0.357, 0.42, 0.525);
const HOY = () => new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

async function generarPDF(r, cli, anexo) {
  // Estructura "Knowledgefy": delega en el módulo documento-oferta.mjs.
  const buf = await generarPDFOferta(r, cli, anexo);
  return Buffer.from(buf);
}

async function generarPPTX(r, cli, anexo) {
  // ── Reflejo del PDF: misma paleta, mismas secciones, mismos textos ──
  // Todo lo que se escribe aquí sale de contenido-oferta.mjs, que es la misma
  // fuente que usa el PDF. Si cambia una cláusula, cambia en los dos.
  const C = HEX;
  const esImpl = r.modelo === 'Implantación';
  const esMes = r.tipo === 'mes' && !esImpl;
  const normNames = (r.normaNombres || r.normasNombres || r.normas || []);

  const p = new PptxGenJS();
  p.defineLayout({ name: 'W', width: 10, height: 5.63 }); p.layout = 'W';
  p.author = EMISOR.marca; p.company = EMISOR.marca;
  p.title = ('Oferta ' + (r.numero || '') + ' · ' + (cli?.empresa || '')).trim();

  const F = 'Arial';   // Rubik no está instalada en el equipo de quien lo abra

  // Pie con las tres marcas, igual que en el PDF.
  const pie = (s, legal) => {
    s.addShape(p.ShapeType.rect, { x: 0, y: 5.05, w: 10, h: 0.58, fill: { color: C.navy } });
    s.addShape(p.ShapeType.rect, { x: 0, y: 5.05, w: 4.2, h: 0.028, fill: { color: C.teal } });
    s.addShape(p.ShapeType.rect, { x: 4.2, y: 5.05, w: 5.8, h: 0.028, fill: { color: C.naranja } });
    const alto = 0.26; let x = 0.6;
    for (const par of [[PIE_TUCONSULTOR, 2484 / 560], [PIE_CONSULTIFY, 1524 / 560], [PIE_ORBITA, 494 / 150]]) {
      const w = alto * par[1];
      s.addImage({ data: 'image/png;base64,' + par[0], x: x, y: 5.22, w: w, h: alto });
      x += w + 0.22;
    }
    s.addText(legal || EMISOR.legalPie,
      { x: 5.3, y: 5.22, w: 4.1, h: 0.26, fontFace: F, fontSize: 8, color: C.claro, align: 'right', valign: 'middle' });
  };

  const seccion = (s, rotulo, titulo) => {
    s.addShape(p.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.naranja } });
    s.addText(rotulo.toUpperCase(), { x: 0.6, y: 0.42, w: 9, h: 0.24, fontFace: F, fontSize: 9, bold: true, color: C.naranja, charSpacing: 2 });
    s.addShape(p.ShapeType.rect, { x: 0.6, y: 0.72, w: 0.36, h: 0.022, fill: { color: C.naranja } });
    if (titulo) s.addText(titulo, { x: 0.6, y: 0.92, w: 8.8, h: 0.6, fontFace: F, fontSize: 22, bold: true, color: C.tinta });
  };

  // ══════════ 1 · Portada ══════════
  let s = p.addSlide();
  s.background = { color: C.navy };
  s.addShape(p.ShapeType.rect, { x: 0, y: 0, w: 4.2, h: 0.07, fill: { color: C.teal } });
  s.addShape(p.ShapeType.rect, { x: 4.2, y: 0, w: 5.8, h: 0.07, fill: { color: C.naranja } });
  s.addImage({ data: 'image/png;base64,' + LOGO_TUCONSULTOR_BLANCO, x: 0.6, y: 0.5, w: 2.0, h: 2.0 * 49 / 300 });
  s.addText('PROPUESTA DE SERVICIOS', { x: 0.6, y: 1.35, w: 9, h: 0.28, fontFace: F, fontSize: 10, bold: true, color: C.naranja, charSpacing: 2.4 });
  s.addText(cli?.empresa || 'Propuesta', { x: 0.6, y: 1.75, w: 8.8, h: 0.9, fontFace: F, fontSize: 30, bold: true, color: C.blanco });
  s.addText(normNames.join('  ·  '), { x: 0.6, y: 2.65, w: 8.8, h: 0.5, fontFace: F, fontSize: 12, color: C.claro });

  const impPortada = esImpl ? ((r.formasPago && r.formasPago.unico.sinIva) || r.precioCatalogo) : r.precioCatalogo;
  s.addText(esMes ? 'CUOTA MENSUAL' : 'INVERSIÓN', { x: 0.6, y: 3.45, w: 9, h: 0.22, fontFace: F, fontSize: 9, bold: true, color: C.teal, charSpacing: 2 });
  s.addText([
    { text: fmtEur0(impPortada), options: { fontSize: 38, bold: true, color: C.blanco } },
    { text: esMes ? '  /mes · sin IVA' : '  sin IVA', options: { fontSize: 11, color: C.claro } },
  ], { x: 0.6, y: 3.7, w: 8.8, h: 0.7, fontFace: F });
  if (esImpl && r.formasPago) {
    s.addText('con ' + Math.round(r.formasPago.descuentoUnico * 100) + ' % de descuento por pago único',
      { x: 0.6, y: 4.35, w: 8.8, h: 0.26, fontFace: F, fontSize: 10, color: C.naranja });
  }
  s.addText('Oferta ' + (r.numero || '') + '  ·  ' + fechaLarga(), { x: 0.6, y: 4.65, w: 5, h: 0.26, fontFace: F, fontSize: 9, color: C.claro });
  pie(s, EMISOR.marca + ' · CIF ' + EMISOR.cif);

  // ══════════ 2 · La propuesta ══════════
  const prop = propuesta(r, cli);
  s = p.addSlide(); s.background = { color: C.blanco };
  seccion(s, 'La propuesta', prop.titulo);
  s.addText(prop.texto, { x: 0.6, y: 1.6, w: 8.8, h: 0.8, fontFace: F, fontSize: 12, color: C.tinta, lineSpacingMultiple: 1.3 });
  const datos = [
    ['Cliente', cli?.empresa || '—'], ['CIF', cli?.cif || '—'],
    ['Modelo de servicio', r.modelo + (esImpl && r.meses ? ' · ' + r.meses + ' meses' : '')],
    ['Dedicación estimada', r.hTotal + ' h'],
  ];
  if (r.complejidad) datos.push(['Complejidad', r.complejidad]);
  if (r.sedes && r.sedes > 1) datos.push(['Sedes o alcances', String(r.sedes)]);
  datos.forEach(function (par, i) {
    const x = 0.6 + (i % 3) * 3.0, y = 2.6 + Math.floor(i / 3) * 0.95;
    s.addText(par[0].toUpperCase(), { x: x, y: y, w: 2.8, h: 0.22, fontFace: F, fontSize: 8, bold: true, color: C.apagado, charSpacing: 1 });
    s.addText(String(par[1]), { x: x, y: y + 0.24, w: 2.8, h: 0.4, fontFace: F, fontSize: 13, bold: true, color: C.tinta });
  });
  pie(s);

  // ══════════ 3 · Alcance e inversión ══════════
  s = p.addSlide(); s.background = { color: C.blanco };
  seccion(s, 'Alcance e inversión');
  normNames.forEach(function (n, i) {
    s.addShape(p.ShapeType.rect, { x: 0.6, y: 1.15 + i * 0.42, w: 0.1, h: 0.1, fill: { color: C.teal } });
    s.addText(String(n), { x: 0.9, y: 1.05 + i * 0.42, w: 5.2, h: 0.32, fontFace: F, fontSize: 12, bold: true, color: C.tinta });
  });
  s.addShape(p.ShapeType.rect, { x: 6.3, y: 1.0, w: 3.1, h: 1.6, fill: { color: C.suave } });
  s.addShape(p.ShapeType.rect, { x: 6.3, y: 1.0, w: 0.05, h: 1.6, fill: { color: C.naranja } });
  s.addText(esMes ? 'CUOTA MENSUAL' : 'IMPORTE DEL PROYECTO', { x: 6.55, y: 1.15, w: 2.8, h: 0.22, fontFace: F, fontSize: 8, bold: true, color: C.apagado, charSpacing: 1 });
  s.addText(fmtEur(esImpl ? ((r.formasPago && r.formasPago.dos.sinIva) || r.precioCatalogo) : r.precioCatalogo),
    { x: 6.55, y: 1.42, w: 2.8, h: 0.55, fontFace: F, fontSize: 22, bold: true, color: C.tinta });
  s.addText('IVA 21 % · ' + fmtEur(r.iva) + '\nTotal ' + fmtEur(r.totalConIva) + (esMes ? '/mes' : ''),
    { x: 6.55, y: 2.0, w: 2.8, h: 0.5, fontFace: F, fontSize: 10, color: C.apagado });

  if (r.formasPago) {
    s.addText('FORMAS DE PAGO', { x: 0.6, y: 2.95, w: 9, h: 0.22, fontFace: F, fontSize: 9, bold: true, color: C.naranja, charSpacing: 2 });
    [r.formasPago.unico, r.formasPago.dos].forEach(function (f, i) {
      const x = 0.6 + i * 4.6;
      const elegida = r.formaPagoElegida === f.id || (!r.formaPagoElegida && i === 0);
      s.addShape(p.ShapeType.rect, { x: x, y: 3.25, w: 4.3, h: 1.55, fill: { color: C.blanco },
        line: { color: elegida ? C.naranja : C.linea, width: elegida ? 1.6 : 1 } });
      s.addText(String.fromCharCode(65 + i) + ' · ' + f.titulo, { x: x + 0.2, y: 3.38, w: 4, h: 0.3, fontFace: F, fontSize: 13, bold: true, color: C.tinta });
      s.addText(fmtEur(f.total) + '  con IVA', { x: x + 0.2, y: 3.7, w: 4, h: 0.34, fontFace: F, fontSize: 15, bold: true, color: C.tinta });
      s.addText(f.id === 'unico' ? 'Ahorras ' + fmtEur(f.ahorro) : fmtEur(f.cuota1) + ' + ' + fmtEur(f.cuota2),
        { x: x + 0.2, y: 4.04, w: 4, h: 0.24, fontFace: F, fontSize: 10, bold: true, color: f.id === 'unico' ? C.teal : C.apagado });
      s.addText(f.condicion, { x: x + 0.2, y: 4.28, w: 3.95, h: 0.45, fontFace: F, fontSize: 8.5, color: C.apagado });
    });
  }
  pie(s);

  // ══════════ 4 · Condiciones ══════════
  s = p.addSlide(); s.background = { color: C.blanco };
  seccion(s, 'Condiciones');
  condiciones(r).forEach(function (c, i) {
    s.addShape(p.ShapeType.rect, { x: 0.6, y: 1.2 + i * 0.72, w: 0.07, h: 0.24, fill: { color: C.naranja } });
    s.addText(c, { x: 0.85, y: 1.12 + i * 0.72, w: 8.5, h: 0.62, fontFace: F, fontSize: 10.5, color: C.apagado, lineSpacingMultiple: 1.25 });
  });
  pie(s);

  // ══════════ 5 · Aceptación ══════════
  s = p.addSlide(); s.background = { color: C.blanco };
  seccion(s, 'Aceptación', 'Conformidad de las partes');
  s.addText('La firma de este documento supone la aceptación de la propuesta y de las condiciones recogidas en los anexos.',
    { x: 0.6, y: 1.6, w: 8.8, h: 0.4, fontFace: F, fontSize: 11, color: C.tinta });
  const firmas = [
    ['POR TUCONSULTOR', EMISOR.firmante, EMISOR.cargo, C.suave, null],
    ['POR LA ORGANIZACIÓN', cli?.empresa || '', cli?.contacto || 'Persona con capacidad de firma', C.blanco, C.linea],
  ];
  firmas.forEach(function (f, i) {
    const x = 0.6 + i * 4.6;
    const forma = { x: x, y: 2.2, w: 4.3, h: 2.3, fill: { color: f[3] } };
    if (f[4]) forma.line = { color: f[4], width: 1 };
    s.addShape(p.ShapeType.rect, forma);
    s.addText(f[0], { x: x + 0.25, y: 2.38, w: 3.8, h: 0.22, fontFace: F, fontSize: 8, bold: true, color: C.apagado, charSpacing: 1 });
    s.addText(f[1], { x: x + 0.25, y: 2.66, w: 3.8, h: 0.34, fontFace: F, fontSize: 14, bold: true, color: C.tinta });
    s.addText(f[2], { x: x + 0.25, y: 3.0, w: 3.8, h: 0.28, fontFace: F, fontSize: 10, color: C.apagado });
    s.addShape(p.ShapeType.line, { x: x + 0.25, y: 4.0, w: 3.8, h: 0, line: { color: C.linea, width: 1 } });
    s.addText('Firma y fecha', { x: x + 0.25, y: 4.06, w: 3.8, h: 0.22, fontFace: F, fontSize: 8, color: C.apagado });
  });
  pie(s);

  // ══════════ 6 · Anexo I · tareas ══════════
  if (Array.isArray(anexo) && anexo.length) {
    const bloques = anexo.slice();
    while (bloques.length) {
      const tanda = bloques.splice(0, 3);
      s = p.addSlide(); s.background = { color: C.blanco };
      seccion(s, 'Anexo I', 'Tareas incluidas');
      tanda.forEach(function (g, i) {
        const x = 0.6 + i * 3.0;
        s.addText(String(g.bloque || '').toUpperCase(), { x: x, y: 1.6, w: 2.8, h: 0.3, fontFace: F, fontSize: 8.5, bold: true, color: C.teal, charSpacing: 1 });
        s.addShape(p.ShapeType.line, { x: x, y: 1.92, w: 2.8, h: 0, line: { color: C.linea, width: 1 } });
        const items = (g.subs || []).map(function (t) {
          return { text: String(t), options: { bullet: { code: '2022' }, color: C.tinta, fontSize: 10, breakLine: true, paraSpaceAfter: 4 } };
        });
        if (items.length) s.addText(items, { x: x, y: 2.0, w: 2.8, h: 2.9, fontFace: F, valign: 'top' });
      });
      pie(s);
    }
  }

  // ══════════ 7 · Anexo II · requisitos legales ══════════
  for (let i = 0; i < REQUISITOS_LEGALES.length; i += 4) {
    s = p.addSlide(); s.background = { color: C.blanco };
    seccion(s, 'Anexo II', i === 0 ? 'Requisitos legales aplicables' : 'Requisitos legales (continuación)');
    REQUISITOS_LEGALES.slice(i, i + 4).forEach(function (par, j) {
      const y = 1.6 + j * 0.85;
      s.addText(par[0], { x: 0.6, y: y, w: 8.8, h: 0.25, fontFace: F, fontSize: 11.5, bold: true, color: C.tinta });
      s.addText(par[1], { x: 0.6, y: y + 0.26, w: 8.8, h: 0.5, fontFace: F, fontSize: 9.5, color: C.apagado, lineSpacingMultiple: 1.15 });
    });
    if (i === 0) {
      s.addText('No es una lista exhaustiva ni sustituye al asesoramiento jurídico.',
        { x: 0.6, y: 4.72, w: 8.8, h: 0.22, fontFace: F, fontSize: 8.5, italic: true, color: C.apagado });
    }
    pie(s);
  }

  // ══════════ 8 · Anexo III · cláusulas ══════════
  const CL = clausulas(r);
  for (let i = 0; i < CL.length; i += 2) {
    s = p.addSlide(); s.background = { color: C.blanco };
    seccion(s, 'Anexo III', i === 0 ? 'Qué se contrata exactamente' : 'Qué se contrata (continuación)');
    CL.slice(i, i + 2).forEach(function (par, j) {
      const y = 1.65 + j * 1.55;
      s.addShape(p.ShapeType.rect, { x: 0.6, y: y, w: 0.07, h: 0.3, fill: { color: C.naranja } });
      s.addText(par[0], { x: 0.85, y: y - 0.04, w: 8.5, h: 0.34, fontFace: F, fontSize: 13, bold: true, color: C.tinta });
      s.addText(par[1], { x: 0.85, y: y + 0.34, w: 8.5, h: 1.0, fontFace: F, fontSize: 10.5, color: C.tinta, lineSpacingMultiple: 1.25 });
    });
    pie(s);
  }

  return await p.write({ outputType: 'nodebuffer' });
}

// ======================= SUBIDA A STORAGE =======================
async function subir(base, key, ruta, buffer, contentType) {
  const r = await fetch(`${base}/storage/v1/object/ofertas/${ruta}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': contentType, 'x-upsert': 'true' },
    body: buffer,
  });
  if (!r.ok) throw new Error(`Storage ${ruta}: ${r.status} ${await r.text()}`);
  return `${base}/storage/v1/object/public/ofertas/${ruta}`;
}

// ======================= COPIA INTERNA POR EMAIL (Brevo) =======================
const COPIA_INTERNA = process.env.OFERTA_COPIA_EMAIL || 'hola@tuconsultor.com';
const REMITENTE = process.env.BREVO_SENDER_EMAIL || 'hola@tuconsultor.com';

// Envía la oferta AL CLIENTE (a su email), con el PDF adjunto y un mensaje de presentación.
async function enviarAlCliente({ numeroOferta, cli, r, pdfBuf, url_pdf, email }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || !email) return { ok: false, motivo: !apiKey ? 'sin BREVO_API_KEY' : 'sin email' };

  const normNames = r.normas.map((id) => NORMA_BY_ID[id].nombre).join(' + ');
  const saludo = cli.contacto ? `Hola ${cli.contacto.split(' ')[0]},` : 'Hola,';
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0C1424;font-size:15px;line-height:1.7">
      <p>${saludo}</p>
      <p>Te enviamos la oferta que has solicitado para <strong>${normNames}</strong>. Encontrarás todos los detalles en el PDF adjunto.</p>
      <p>Si tienes cualquier duda o quieres que la comentemos, respóndenos a este correo o escríbenos a <a href="mailto:hola@tuconsultor.com" style="color:#F5A623;font-weight:bold">hola@tuconsultor.com</a>. Estaremos encantados de ayudarte.</p>
      <p style="margin-top:20px">Un saludo,<br><strong>${cli.comercial || 'El equipo de TuConsultor'}</strong><br>Consultify · TuConsultor</p>
      <p style="color:#8896AD;font-size:12px;margin-top:20px">Instituto de Excelencia Europea S.L. · CIF B87093076 · Madrid<br>Desde 2006 gestionando con el corazón.</p>
    </div>`;

  const payload = {
    sender: { name: 'TuConsultor · Consultify', email: REMITENTE },
    to: [{ email, name: cli.contacto || cli.empresa || 'Cliente' }],
    replyTo: { email: 'hola@tuconsultor.com', name: 'TuConsultor' },
    subject: `Tu oferta ${numeroOferta} · ${normNames}`,
    htmlContent: html,
    attachment: [{ name: `Oferta_${numeroOferta}.pdf`, content: Buffer.from(pdfBuf).toString('base64') }],
  };
  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  if (resp.ok) return { ok: true };
  return { ok: false, motivo: `Brevo HTTP ${resp.status}` };
}

async function enviarCopiaInterna({ numeroOferta, cli, r, pdfBuf, url_pdf, url_pptx, email }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return; // sin clave, no se envía (no es bloqueante)

  const normNames = r.normas.map((id) => NORMA_BY_ID[id].nombre).join(' + ');
  const precioTxt = r.fraccionado
    ? `${eur(r.fraccionado.totalSinIva)} (proyecto, sin IVA) · ${eur(r.fraccionado.totalConIva)} con IVA`
    : `${eur(r.precioCatalogo)}${r.tipo === 'mes' ? '/mes' : ''} (sin IVA) · ${eur(r.totalConIva)} con IVA`;

  const html = `
    <div style="font-family:Arial,sans-serif;color:#0C1424;font-size:14px;line-height:1.6">
      <h2 style="color:#061B45;margin:0 0 4px">Nueva oferta emitida · ${numeroOferta}</h2>
      <p style="color:#5B6B86;margin:0 0 16px">Comercial asignado: <strong>${cli.comercial || 'Alejandro'}</strong></p>
      <table cellpadding="6" style="border-collapse:collapse;font-size:14px">
        <tr><td style="color:#5B6B86">Cliente</td><td><strong>${cli.empresa || '—'}</strong></td></tr>
        <tr><td style="color:#5B6B86">CIF</td><td>${cli.cif || '—'}</td></tr>
        <tr><td style="color:#5B6B86">Contacto</td><td>${cli.contacto || '—'}${cli.cargo ? ' · ' + cli.cargo : ''}</td></tr>
        <tr><td style="color:#5B6B86">Email cliente</td><td>${email || '—'}</td></tr>
        <tr><td style="color:#5B6B86">Normas</td><td>${normNames}</td></tr>
        <tr><td style="color:#5B6B86">Modelo</td><td>${r.modelo}</td></tr>
        <tr><td style="color:#5B6B86">Importe</td><td><strong>${precioTxt}</strong></td></tr>
      </table>
      <p style="margin:16px 0 4px"><a href="${url_pdf}" style="color:#F5A623;font-weight:bold">Descargar PDF</a> &nbsp;·&nbsp; <a href="${url_pptx}" style="color:#F5A623;font-weight:bold">Descargar PPT</a></p>
      <p style="color:#8896AD;font-size:12px;margin-top:20px">Instituto de Excelencia Europea S.L. · CIF B87093076 · Madrid<br>Hecho con amor en Madrid por TuConsultor · Desde 2006 gestionando con el corazón.</p>
    </div>`;

  const payload = {
    sender: { name: 'Consultify · Ofertas', email: REMITENTE },
    to: [{ email: COPIA_INTERNA, name: 'TuConsultor' }],
    subject: `Oferta ${numeroOferta} · ${cli.empresa || 'Cliente'} · ${normNames}`,
    htmlContent: html,
    attachment: [{ name: `Oferta_${numeroOferta}.pdf`, content: Buffer.from(pdfBuf).toString('base64') }],
  };

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ======================= HANDLER =======================
export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!base || !key) return Response.json({ ok: false, error: 'Backend sin configurar' }, { status: 500 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: 'JSON inválido' }, { status: 400 }); }

  // ── ETAPA 2 · ENVIAR una oferta YA generada (sin regenerar) ──────────────
  // Descarga el PDF guardado (url_pdf) y lo envía al cliente por email.
  if (body.action === 'enviar_existente') {
    const { url_pdf, email, empresa = '', contacto = '', comercial = 'Alejandro', numero_oferta = '', normas = [] } = body;
    if (!email) return Response.json({ ok: false, error: 'La oferta no tiene email de cliente.' }, { status: 400 });
    if (!url_pdf) return Response.json({ ok: false, error: 'La oferta no tiene PDF generado. Genérala primero.' }, { status: 400 });
    try {
      const pr = await fetch(url_pdf);
      if (!pr.ok) return Response.json({ ok: false, error: 'No se pudo descargar el PDF guardado.' }, { status: 502 });
      const pdfBuf = new Uint8Array(await pr.arrayBuffer());
      const cli = { empresa, contacto, comercial, email };
      const rInfo = { normas };
      const env = await enviarAlCliente({ numeroOferta: numero_oferta, cli, r: rInfo, pdfBuf, url_pdf, email });
      if (env.ok) return Response.json({ ok: true, enviado: true, email });
      return Response.json({ ok: false, error: `No se pudo enviar: ${env.motivo || 'error'}` }, { status: 502 });
    } catch (e) {
      return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
    }
  }

  const { normas = [], modelo = '', empresa = '', cif = '', contacto = '', cargo = '', ref = '', comercial = 'Alejandro', presupuesto_id, email = '', meses, tiene9001 = false, direccion = '', enviar_cliente = false } = body;
  const r = calcular(normas, modelo, { meses, tiene9001 });
  if (!r) return Response.json({ ok: false, error: 'Normas o modelo no válidos' }, { status: 400 });

  // ── Reglas comerciales ──
  // El motor de esta función no conoce las reglas comerciales (viven en la base
  // de datos y las aplica el navegador). Si el cliente nos manda su resultado,
  // manda el suyo: así el documento nunca contradice el precio que se vio en
  // pantalla. Recalculamos IVA, total y fraccionamiento sobre el precio final.
  const ov = body.override;
  if (ov && Number.isFinite(Number(ov.precioCatalogo))) {
    r.precioBase = Number(ov.precioBase ?? r.precioCatalogo);
    r.precioCatalogo = Number(ov.precioCatalogo);
    if (ov.horas) r.horas = ov.horas;
    if (Number.isFinite(Number(ov.hTotal))) r.hTotal = Number(ov.hTotal);
    r.reglasAplicadas = Array.isArray(ov.reglas) ? ov.reglas : [];
    r.iva = Math.round(r.precioCatalogo * IVA * 100) / 100;
    r.totalConIva = Math.round((r.precioCatalogo + r.iva) * 100) / 100;
    if (r.fraccionado) {
      const meses2 = r.fraccionado.meses;
      const totalSinIva = r.precioCatalogo * meses2;
      const totalConIvaFrac = Math.round(totalSinIva * (1 + IVA) * 100) / 100;
      const r2 = (x) => Math.round(x * 100) / 100;
      const c1 = r2(totalConIvaFrac * 0.50), c2 = r2(totalConIvaFrac * 0.25);
      r.fraccionado = { ...r.fraccionado, totalSinIva, totalConIva: totalConIvaFrac, cuota1: c1, cuota2: c2, cuota3: r2(totalConIvaFrac - c1 - c2) };
    }
  }
  r.disclaimer = body.disclaimer || DISCLAIMER_OFERTA;
  r.formaPagoElegida = body.forma_pago || null;          // 'unico' | 'dos'
  r.modeloMantenimiento = body.modelo_mantenimiento || null;
  // Enriquecer el resultado con nombres de norma y meses para el documento.
  r.normaNombres = normas.map((id) => (NORMA_BY_ID[id]?.nombre || id));
  r.meses = Math.max(parseInt(meses, 10) || (r.fraccionado?.meses) || 3, 1);
  // Anexo I: tareas por bloque (solo las que aplican a las normas elegidas).
  const anexo = tareasPorBloque(normas, modelo);

  // Número de oferta correlativo (OFE-AAAA-NNN): si no viene dado, lo pedimos
  // a la secuencia atómica en Postgres vía RPC.
  let numeroOferta = ref;
  if (!numeroOferta) {
    try {
      const rpc = await fetch(`${base}/rest/v1/rpc/siguiente_numero_oferta`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (rpc.ok) numeroOferta = (await rpc.json()) || '';
    } catch { /* si falla, seguimos sin número correlativo */ }
  }
  if (!numeroOferta) numeroOferta = `OFE-${new Date().getFullYear()}-${Date.now().toString(36).slice(-5).toUpperCase()}`;

  const cli = { empresa, cif, contacto, cargo, ref: numeroOferta, comercial, direccion, email };

  // ── Alta automática de empresa y contacto ──────────────────────────────────
  // Si quien pide la oferta no está en el CRM, se da de alta con el CIF como
  // clave. Se hace por RPC y no aquí a mano porque la función va en una
  // transacción: dos peticiones simultáneas del mismo CIF no crean dos fichas.
  // Entra como POTENCIAL y SIN REVISAR: los datos los teclea el cliente.
  let alta = null;
  if (cif) {
    try {
      const rp = await fetch(`${base}/rest/v1/rpc/alta_desde_oferta`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_cif: cif, p_empresa: empresa || '', p_email: email || null,
          p_contacto: contacto || null, p_telefono: body.telefono || null,
        }),
      });
      if (rp.ok) alta = await rp.json();
    } catch { /* el alta no puede impedir que salga la oferta */ }
  }
  const slug = (ref || empresa || 'oferta').toString().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'oferta';
  const stamp = Date.now();
  const carpeta = `${new Date().toISOString().slice(0, 7)}`; // YYYY-MM

  try {
    const [pdfBuf, pptxBuf] = await Promise.all([generarPDF(r, cli, anexo), generarPPTX(r, cli, anexo)]);
    const [url_pdf, url_pptx] = await Promise.all([
      subir(base, key, `${carpeta}/${slug}_${stamp}.pdf`, pdfBuf, 'application/pdf'),
      subir(base, key, `${carpeta}/${slug}_${stamp}.pptx`, pptxBuf, 'application/vnd.openxmlformats-officedocument.presentationml.presentation'),
    ]);

    // Si nos pasan el id del presupuesto, guardamos las URLs y el número de oferta en su fila
    if (presupuesto_id) {
      await fetch(`${base}/rest/v1/presupuestos?id=eq.${presupuesto_id}`, {
        method: 'PATCH',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({
          url_pdf, url_pptx, numero_oferta: numeroOferta,
          ...(alta?.empresa_id ? { empresa_id: alta.empresa_id } : {}),
          ...(alta?.contacto_id ? { contacto_id: alta.contacto_id } : {}),
        }),
      }).catch(() => {});
    }

    // Enviar copia de la oferta a la dirección interna (hola@tuconsultor.com) vía Brevo,
    // con el PDF adjunto. No bloquea la respuesta si falla.
    await enviarCopiaInterna({ numeroOferta, cli, r, pdfBuf, url_pdf, url_pptx, email }).catch(() => {});

    // Envío AL CLIENTE (solo si se solicita explícitamente y hay email).
    let envio_cliente = null;
    if (enviar_cliente) {
      envio_cliente = await enviarAlCliente({ numeroOferta, cli, r, pdfBuf, url_pdf, email }).catch((e) => ({ ok: false, motivo: String(e) }));
    }

    return Response.json({ ok: true, alta, url_pdf, url_pptx, numero_oferta: numeroOferta, precio: r.precioCatalogo, tipo: r.tipo, envio_cliente });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 502 });
  }
};

export const config = { path: '/.netlify/functions/generar-oferta' };
