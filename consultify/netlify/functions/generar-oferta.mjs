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
// Único generador del PDF de oferta. La variante anterior («Knowledgefy») se
// archivó en `_archivo/` el 26/08/2026: llevaba tiempo sin usarse y su texto
// legal ya había divergido del que se emite. Si hace falta otro formato, se
// añade como variante aquí dentro, leyendo las cláusulas de
// contenido-oferta.mjs, para que el texto legal siga teniendo una sola fuente.
import { generarPDFOferta } from './documento-oferta-premium.mjs';
import { LOGO_CONSULTIFY, LOGO_TUCONSULTOR } from './logos-oferta.mjs';
import { PIE_TUCONSULTOR, PIE_CONSULTIFY, PIE_ORBITA } from './assets-oferta.mjs';
import { LOGO_TUCONSULTOR_BLANCO } from './logos-oferta.mjs';
import { HEX, EMISOR, condiciones, REQUISITOS_LEGALES, clausulas, propuesta, fmtEur, fmtEur0, fechaLarga, nombresDeNormas, fasesDeLosPlanes, describirAjuste, emisorDe } from './contenido-oferta.mjs';

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

// ═══════════════════ MOTOR DE CÁLCULO · UNO SOLO ═══════════════════════════
// Antes había aquí una RÉPLICA de app/src/lib/calcEngine.js, con la advertencia
// de replicar a mano cualquier cambio de precio. No se replicó: la copia se
// quedó con el Plan de Igualdad en 30 h y nivel J2 cuando el motor real tenía
// 101 h y J3, y las ofertas salieron con un importe distinto al que el cliente
// vio en pantalla. Un documento con dos cálculos dentro.
//
// Ahora se importa el motor de verdad. esbuild sigue los imports relativos y lo
// empaqueta con la función, así que la razón por la que estaba duplicado —«no
// comparten el bundle»— no era cierta.
import {
  NORMAS, NORMA_BY_ID, MODELOS, TARIFA, MARGEN, IVA as IVA_MOTOR, calcular,
} from '../../app/src/lib/calcEngine.js';
import { DISCLAIMER_OFERTA } from '../../app/src/lib/legal.js';

const eur = (v) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0) + ' €';

// ======================= GENERADORES =======================
const NAVY = rgb(0.024, 0.106, 0.271);  // #061B45
const ORANGE = rgb(0.961, 0.651, 0.137); // #F5A623
const MUTED = rgb(0.357, 0.42, 0.525);
const HOY = () => new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

/** Suma meses a una fecha ISO respetando el fin de mes (31 ene + 1 = 28 feb). */
function sumarMesesISO(fechaISO, meses, masUnDia = false) {
  if (!fechaISO) return null;
  const d = new Date(`${String(fechaISO).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const dia = d.getDate();
  d.setMonth(d.getMonth() + meses);
  if (d.getDate() < dia) d.setDate(0);      // 31 ene → 28 feb
  if (masUnDia) d.setDate(d.getDate() + 1);
  // Se formatea en local: la fecha se creó al mediodía justamente para que
  // `toISOString` no cambie de día, pero se deja explícito para no depender de
  // ese detalle.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-${String(d.getDate()).padStart(2, '0')}`;
}

async function generarPDF(r, cli, anexo) {
  // Delega en documento-oferta-premium.mjs, que monta el documento desde cero
  // en cada llamada: por eso una oferta regenerada sale siempre con la
  // redacción vigente de las cláusulas, no con la del día en que se emitió.
  const buf = await generarPDFOferta(r, cli, anexo);
  return Buffer.from(buf);
}

async function generarPPTX(r, cli, anexo) {
  // ── Reflejo del PDF: misma paleta, mismas secciones, mismos textos ──
  // Todo lo que se escribe aquí sale de contenido-oferta.mjs, que es la misma
  // fuente que usa el PDF. Si cambia una cláusula, cambia en los dos.
  const C = HEX;
  // Quién emite: se resuelve LO PRIMERO, porque los metadatos del archivo ya lo
  // usan. Estaba declarado más abajo y el PPT reventaba antes de empezar.
  const EM = emisorDe(r);
  const esImpl = r.modelo === 'Implantación';
  const esMes = r.tipo === 'mes' && !esImpl;
  const normNames = nombresDeNormas(r);

  const p = new PptxGenJS();
  p.defineLayout({ name: 'W', width: 10, height: 5.63 }); p.layout = 'W';
  p.author = EM.razonSocial; p.company = EM.marca;
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
    s.addText(legal || EM.legalPie,
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
  const nombreCli = String(cli?.empresa || 'Propuesta');
  s.addText(nombreCli, { x: 0.6, y: 1.7, w: 8.8, h: 1.0, fontFace: F,
    fontSize: nombreCli.length > 52 ? 22 : (nombreCli.length > 34 ? 26 : 30),
    bold: true, color: C.blanco, valign: 'top' });
  s.addText(normNames.join('  ·  '), { x: 0.6, y: 2.65, w: 8.8, h: 0.5, fontFace: F, fontSize: 12, color: C.claro });

  const impPortada = esImpl ? ((r.formasPago && r.formasPago.unico.sinIva) || r.precioCatalogo) : r.precioCatalogo;
  s.addText(esMes ? 'CUOTA MENSUAL' : 'INVERSIÓN', { x: 0.6, y: 3.45, w: 9, h: 0.22, fontFace: F, fontSize: 9, bold: true, color: C.teal, charSpacing: 2 });
  s.addText([
    { text: fmtEur0(impPortada), options: { fontSize: 38, bold: true, color: C.blanco } },
    { text: esMes ? '  /mes · sin impuestos' : '  sin impuestos', options: { fontSize: 11, color: C.claro } },
  ], { x: 0.6, y: 3.7, w: 8.8, h: 0.7, fontFace: F });
  if (esImpl && r.formasPago) {
    s.addText('con ' + Math.round(r.formasPago.descuentoUnico * 100) + ' % de descuento por pago único',
      { x: 0.6, y: 4.35, w: 8.8, h: 0.26, fontFace: F, fontSize: 10, color: C.naranja });
  }
  s.addText('Oferta ' + (r.numero || '') + '  ·  ' + fechaLarga(), { x: 0.6, y: 4.65, w: 5, h: 0.26, fontFace: F, fontSize: 9, color: C.claro });
  pie(s, EM.pieCorto);

  // ══════════ 2 · La propuesta ══════════
  const prop = propuesta(r, cli);
  s = p.addSlide(); s.background = { color: C.blanco };
  seccion(s, 'La propuesta', prop.titulo);
  s.addText(prop.texto, { x: 0.6, y: 1.6, w: 8.8, h: 0.8, fontFace: F, fontSize: 12, color: C.tinta, lineSpacingMultiple: 1.3 });
  const datos = [
    ['Cliente', cli?.empresa || '—'], ['CIF', cli?.cif || '—'],
    // La persona a la que va dirigida faltaba en el PPT, aunque sí estaba en el
    // PDF. Es lo primero que mira quien recibe la presentación: si va a su
    // nombre o al de otro.
    ['Persona de contacto',
     [cli?.contacto || cli?.email || '—', cli?.cargo].filter(Boolean).join(' · ')],
    ['Modelo de servicio', r.modelo + (esImpl && r.meses ? ' · ' + r.meses + ' meses' : '')],
    ['Dedicación estimada', r.hTotal + ' h'],
  ];
  if (r.complejidad) datos.push(['Complejidad', r.complejidad]);
  if (r.sedes && r.sedes > 1) datos.push(['Sedes o alcances', String(r.sedes)]);
  // Las tres fechas del encargo, también aquí: el PPT es lo que se proyecta en
  // la reunión y es donde surgen las preguntas de calendario.
  const fFecha = (f) => {
    if (!f) return null;
    const d = new Date(`${String(f).slice(0, 10)}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null
      : d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  };
  if (r.fecha_inicio) datos.push(['Inicio previsto', fFecha(r.fecha_inicio)]);
  if (r.fecha_fin) datos.push([esImpl ? 'Fin del proyecto' : 'Fin de contrato', fFecha(r.fecha_fin)]);
  if (r.fecha_inicio || r.fecha_certificacion) {
    datos.push(['Certificación prevista', fFecha(r.fecha_certificacion) || 'Por determinar']);
  }
  if (r.pagoAdelantado && r.adelantado) {
    datos.push(['Forma de pago', `Anual por adelantado · ${r.adelantado.mesesCobrados} × ${r.adelantado.mesesServicio}`]);
  }
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
  // El pago adelantado, junto a la cuota: es la cifra que se factura de verdad.
  s.addText(r.pagoAdelantado && r.adelantado
    ? `Pago anual por adelantado: ${fmtEur(r.adelantado.total)} · ${r.adelantado.mesesCobrados} mensualidades, `
      + `${r.adelantado.mesesServicio} meses de servicio · ahorro de ${fmtEur(r.adelantado.ahorro)}\nImpuestos indirectos no incluidos.`
    : 'Impuestos indirectos no incluidos.',
    { x: 6.55, y: 2.0, w: 2.8, h: 0.5, fontFace: F, fontSize: 10, color: C.apagado });

  const ajustes = (r.ajustes || []).filter(function (a) { return a.efecto; });
  if (ajustes.length) {
    s.addText('CONDICIONES PARTICULARES', { x: 6.3, y: 2.7, w: 3.1, h: 0.2, fontFace: F, fontSize: 7.5, bold: true, color: C.teal, charSpacing: 1 });
    let yy = 2.92;
    s.addText('Catálogo: ' + fmtEur(r.precioAntesDeAjustes), { x: 6.3, y: yy, w: 3.1, h: 0.2, fontFace: F, fontSize: 8.5, color: C.apagado });
    yy += 0.22;
    ajustes.slice(0, 3).forEach(function (a) {
      const d = describirAjuste(a);
      s.addText(d.concepto, { x: 6.3, y: yy, w: 2.1, h: 0.2, fontFace: F, fontSize: 8.5, color: C.tinta });
      s.addText(d.efecto, { x: 8.4, y: yy, w: 1.0, h: 0.2, fontFace: F, fontSize: 8.5, bold: true,
                            color: a.efecto < 0 ? C.teal : C.naranja, align: 'right' });
      yy += 0.22;
    });
  }

  if (r.formasPago) {
    s.addText('FORMAS DE PAGO', { x: 0.6, y: 2.95, w: 9, h: 0.22, fontFace: F, fontSize: 9, bold: true, color: C.naranja, charSpacing: 2 });
    [r.formasPago.unico, r.formasPago.dos].forEach(function (f, i) {
      const x = 0.6 + i * 4.6;
      const elegida = r.formaPagoElegida === f.id || (!r.formaPagoElegida && i === 0);
      s.addShape(p.ShapeType.rect, { x: x, y: 3.25, w: 4.3, h: 1.55, fill: { color: C.blanco },
        line: { color: elegida ? C.naranja : C.linea, width: elegida ? 1.6 : 1 } });
      s.addText(String.fromCharCode(65 + i) + ' · ' + f.titulo, { x: x + 0.2, y: 3.38, w: 4, h: 0.3, fontFace: F, fontSize: 13, bold: true, color: C.tinta });
      s.addText(fmtEur(f.sinIva) + '  sin impuestos', { x: x + 0.2, y: 3.7, w: 4, h: 0.34, fontFace: F, fontSize: 15, bold: true, color: C.tinta });
      s.addText(f.id === 'unico' ? 'Ahorras ' + fmtEur(f.ahorro) : fmtEur(f.cuota1) + ' + ' + fmtEur(f.cuota2),
        { x: x + 0.2, y: 4.04, w: 4, h: 0.24, fontFace: F, fontSize: 10, bold: true, color: f.id === 'unico' ? C.teal : C.apagado });
      s.addText(f.condicion, { x: x + 0.2, y: 4.28, w: 3.95, h: 0.45, fontFace: F, fontSize: 8.5, color: C.apagado });
    });
  }
  pie(s);

  // ══════════ 3b · Fases de los planes ══════════
  for (const plan of fasesDeLosPlanes(r)) {
    const bloques = plan.fases.slice();
    while (bloques.length) {
      const tanda = bloques.splice(0, 4);
      s = p.addSlide(); s.background = { color: C.blanco };
      seccion(s, 'Fases del plan', plan.plan);
      s.addText(`${plan.fases.length} fases · ${plan.horas} horas en total`,
        { x: 0.6, y: 1.55, w: 8.8, h: 0.24, fontFace: F, fontSize: 11, color: C.apagado });
      tanda.forEach(function (f, i) {
        const y = 1.95 + i * 0.78;
        s.addShape(p.ShapeType.rect, { x: 0.6, y: y, w: 0.06, h: 0.26, fill: { color: C.teal } });
        s.addText(f.nombre, { x: 0.82, y: y - 0.04, w: 7.2, h: 0.3, fontFace: F, fontSize: 12, bold: true, color: C.tinta });
        s.addText(f.horas + ' h', { x: 8.1, y: y - 0.04, w: 1.3, h: 0.3, fontFace: F, fontSize: 12, bold: true, color: C.teal, align: 'right' });
        s.addText(f.tareas.join(' · '), { x: 0.82, y: y + 0.26, w: 8.5, h: 0.44, fontFace: F, fontSize: 9, color: C.apagado });
      });
      pie(s);
    }
  }

  // ══════════ 4 · Condiciones ══════════
  s = p.addSlide(); s.background = { color: C.blanco };
  seccion(s, 'Condiciones');
  condiciones(r).forEach(function (c, i) {
    s.addShape(p.ShapeType.rect, { x: 0.6, y: 1.2 + i * 0.72, w: 0.07, h: 0.24, fill: { color: C.naranja } });
    s.addText(c, { x: 0.85, y: 1.12 + i * 0.72, w: 8.5, h: 0.62, fontFace: F, fontSize: 10.5, color: C.apagado, lineSpacingMultiple: 1.25 });
  });
  pie(s);

  // ══════════ 4b · Notas de esta propuesta ══════════
  if (r.notas && String(r.notas).trim()) {
    const lineas = String(r.notas).split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
    s = p.addSlide(); s.background = { color: C.blanco };
    seccion(s, 'Notas de esta propuesta', 'Lo acordado para este caso');
    lineas.slice(0, 8).forEach(function (l, i) {
      const y = 1.7 + i * 0.42;
      s.addShape(p.ShapeType.rect, { x: 0.6, y: y, w: 0.06, h: 0.26, fill: { color: C.teal } });
      s.addText(l, { x: 0.85, y: y - 0.04, w: 8.5, h: 0.36, fontFace: F, fontSize: 11, color: C.tinta });
    });
    pie(s);
  }

  // ══════════ 5 · Aceptación ══════════
  s = p.addSlide(); s.background = { color: C.blanco };
  seccion(s, 'Aceptación', 'Conformidad de las partes');
  s.addText('La firma de este documento supone la aceptación de la propuesta y de las condiciones recogidas en los anexos.',
    { x: 0.6, y: 1.6, w: 8.8, h: 0.4, fontFace: F, fontSize: 11, color: C.tinta });
  const firmas = [
    ['POR ' + EM.marca.toUpperCase(), EM.firmante, EM.cargo + ' · ' + EM.razonSocial, C.suave, null],
    ['POR LA ORGANIZACIÓN', cli?.empresa || '', cli?.contacto || 'Persona con capacidad de firma', C.blanco, C.linea],
  ];
  firmas.forEach(function (f, i) {
    const x = 0.6 + i * 4.6;
    const forma = { x: x, y: 2.2, w: 4.3, h: 2.3, fill: { color: f[3] } };
    if (f[4]) forma.line = { color: f[4], width: 1 };
    s.addShape(p.ShapeType.rect, forma);
    s.addText(f[0], { x: x + 0.25, y: 2.38, w: 3.8, h: 0.22, fontFace: F, fontSize: 8, bold: true, color: C.apagado, charSpacing: 1 });
    // La razón social del cliente puede ser larga —«FUNDACION GENERAL DE LA
    // UNIVERSIDAD POLITECNICA DE MADRID» son 57 caracteres—: caja de dos líneas
    // y cuerpo que se reduce cuando no cabe, en vez de recortar el nombre.
    const largo = String(f[1] || '').length;
    s.addText(f[1], { x: x + 0.25, y: 2.62, w: 3.8, h: 0.62,
                      fontFace: F, fontSize: largo > 46 ? 11 : (largo > 30 ? 12.5 : 14),
                      bold: true, color: C.tinta, valign: 'top', shrinkText: true });
    s.addText(f[2], { x: x + 0.25, y: 3.26, w: 3.8, h: 0.4, fontFace: F, fontSize: 9.5, color: C.apagado });
    s.addShape(p.ShapeType.line, { x: x + 0.25, y: 4.08, w: 3.8, h: 0, line: { color: C.linea, width: 1 } });
    s.addText('Firma y fecha', { x: x + 0.25, y: 4.14, w: 3.8, h: 0.22, fontFace: F, fontSize: 8, color: C.apagado });
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
    ? `${eur(r.fraccionado.totalSinIva)} (proyecto) · impuestos indirectos no incluidos`
    : `${eur(r.precioCatalogo)}${r.tipo === 'mes' ? '/mes' : ''} · impuestos indirectos no incluidos`;

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
  // `fecha_inicio` y `fecha_certificacion` se leen más abajo, al enriquecer `r`.
  // El motor del servidor recibe lo mismo que el del navegador. Sin `fasesPlan`,
  // `ajustes` y `preciosSistema` recalculaba con el plan entero, sin el trato
  // pactado y con la tarifa de catálogo: el PDF salía con un importe distinto
  // al que se acababa de guardar en el CRM.
  const r = calcular(normas, modelo, {
    meses, tiene9001,
    fasesPlan: body.fasesPlan || body.fases_plan || undefined,
    ajustes: body.ajustes || [],
    preciosSistema: body.preciosSistema || body.precios_sistema || null,
    aplicarReglas: body.aplicar_reglas !== false,
    pagoAdelantado: body.pago_adelantado === true,
  });
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
    const r2 = (x) => Math.round(x * 100) / 100;
    r.iva = r2(r.precioCatalogo * IVA_MOTOR);
    r.totalConIva = r2(r.precioCatalogo + r.iva);

    // Las formas de pago TAMBIÉN se rehacen. Antes no se tocaban y se quedaban
    // con el precio anterior: el documento acababa con el importe de un cálculo
    // y las cuotas de otro. Es lo que hizo que una oferta llevara 11.650 € de
    // total y 4.200 € de importe en la misma página.
    if (r.formasPago) {
      const base = r.precioCatalogo;
      const dto = r.formasPago.descuentoUnico ?? 0.05;
      const unicoSinIva = r2(base * (1 - dto));
      const cuota = r2(base / 2);
      r.formasPago = {
        ...r.formasPago,
        unico: { ...r.formasPago.unico, sinIva: unicoSinIva, iva: r2(unicoSinIva * IVA_MOTOR),
                 total: r2(unicoSinIva * (1 + IVA_MOTOR)), ahorro: r2(base - unicoSinIva) },
        dos: { ...r.formasPago.dos, sinIva: base, iva: r2(base * IVA_MOTOR),
               total: r2(base * (1 + IVA_MOTOR)),
               cuota1: r2(cuota * (1 + IVA_MOTOR)),
               cuota2: r2(base * (1 + IVA_MOTOR) - r2(cuota * (1 + IVA_MOTOR))),
               // Cuotas sin impuestos: es lo que se imprime en la oferta.
               cuota1SinIva: cuota,
               cuota2SinIva: r2(base - cuota) },
      };
    }
    if (r.fraccionado) {
      const totalConIvaFrac = r2(r.precioCatalogo * (1 + IVA_MOTOR));
      const c1 = r2(totalConIvaFrac / 2);
      const c1Sin = r2(r.precioCatalogo / 2);
      r.fraccionado = { ...r.fraccionado, totalSinIva: r.precioCatalogo, totalConIva: totalConIvaFrac,
                        cuota1: c1, cuota2: r2(totalConIvaFrac - c1), cuota3: 0,
                        cuota1SinIva: c1Sin, cuota2SinIva: r2(r.precioCatalogo - c1Sin) };
    }
  }
  r.disclaimer = body.disclaimer || DISCLAIMER_OFERTA;
  r.formaPagoElegida = body.forma_pago || null;          // 'unico' | 'dos'
  r.notas = body.notas_oferta || body.notas || null;     // solo las que ve el cliente
  r.fasesPlan = body.fasesPlan || body.fases_plan || null;  // fases contratadas de cada plan
  r.emisora_id = body.emisora_id || 'trescore';            // sociedad que emite
  r.modeloMantenimiento = body.modelo_mantenimiento || null;
  // Enriquecer el resultado con nombres de norma y meses para el documento.
  // Se escriben las dos variantes del nombre: hubo documentos que leían una y
  // otros la otra, y la portada acabó enseñando el identificador interno.
  r.normaNombres = normas.map((id) => (NORMA_BY_ID[id]?.nombre || id));
  r.normasNombres = r.normaNombres;
  // Duración en meses. El fallback de 3 estaba pensado para Implantación y se
  // aplicaba también a los recurrentes: el cuadro de facturación salía con tres
  // cuotas en un contrato de doce. En recurrentes el fallback es la permanencia
  // del modelo, doce meses.
  const esRecurrente = r.tipo === 'mes' && modelo !== 'Implantación';
  r.meses = Math.max(parseInt(meses, 10) || (r.fraccionado?.meses) || (esRecurrente ? 12 : 3), 1);

  // ── Fechas del encargo ──
  // Sin esto, `cuadroFacturacion` no recibía fecha de firma y arrancaba el
  // calendario en la fecha de HOY: una oferta emitida en agosto para un
  // servicio que empieza en octubre facturaba desde agosto.
  r.fecha_inicio = body.fecha_inicio || null;
  r.fecha_certificacion = body.fecha_certificacion || null;
  // Fecha de emisión: la del documento y el arranque de los 30 días de validez.
  // Sin esto el PDF se fechaba con el día en que se generaba, así que regenerar
  // una oferta de marzo en agosto la fechaba en agosto y reabría el plazo.
  r.fecha_emision = body.fecha_emision || null;
  // Primer pago: por defecto el mes de inicio del proyecto. De aquí arranca el
  // cuadro de facturación.
  r.fecha_primer_pago = body.fecha_primer_pago || body.fecha_inicio || null;
  // Fin de contrato, independiente de la certificación. Si no llega, se deriva
  // a doce meses del inicio: es la permanencia del modelo.
  // Doce meses y un día en los recurrentes: con el fin en el mismo día del mes
  // el contrato se queda a un día de los doce completos y el plazo sale de once.
  r.fecha_fin = body.fecha_fin
    || (body.fecha_inicio ? sumarMesesISO(body.fecha_inicio, 12, r.tipo === 'mes' && modelo !== 'Implantación') : null);
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

  const cli = { empresa, cif, contacto, cargo, ref: numeroOferta, comercial, direccion, email,
    telefono: body.telefono || null };

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

    // ── RED DE SEGURIDAD ──────────────────────────────────────────────────
    // Si el navegador no consiguió crear la fila (una columna que falta, una
    // política, un fallo de red), el documento ya está generado y el cliente lo
    // va a recibir. Que no quede registrado es peor que cualquiera de esos
    // fallos: queda un PDF con un número de oferta que el sistema no conoce.
    // Aquí se crea con la clave de servicio, que no depende de esas políticas.
    if (!presupuesto_id && numeroOferta && base && key) {
      try {
        const ya = await fetch(
          `${base}/rest/v1/presupuestos?numero_oferta=eq.${encodeURIComponent(numeroOferta)}&select=id`,
          { headers: { apikey: key, Authorization: `Bearer ${key}` } });
        const filas = ya.ok ? await ya.json() : [];
        if (!filas.length) {
          await fetch(`${base}/rest/v1/presupuestos`, {
            method: 'POST',
            headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
                       Prefer: 'return=minimal' },
            body: JSON.stringify({
              numero_oferta: numeroOferta, empresa, nombre: contacto || null, email: email || null,
              telefono: body.telefono || null, cif: cif || null, cargo: cargo || null,
              normas, modelo, precio: Math.round(r.precioCatalogo), tipo: r.tipo,
              comercial: comercial || null, url_pdf, url_pptx,
              complejidad: body.complejidad || null, sedes: body.sedes || 1,
              fases_plan: body.fasesPlan || body.fases_plan || null,
              notas_oferta: r.notas || null,
              forma_pago: body.forma_pago || null,
              emisora_id: r.emisora_id,
              modelo_mantenimiento: body.modelo_mantenimiento || null,
              ...(alta?.empresa_id ? { empresa_id: alta.empresa_id } : {}),
              ...(alta?.contacto_id ? { contacto_id: alta.contacto_id } : {}),
            }),
          });
        }
      } catch (e) { console.error('red de seguridad del histórico', e); }
    }

    return Response.json({ ok: true, alta, url_pdf, url_pptx, numero_oferta: numeroOferta, precio: r.precioCatalogo, tipo: r.tipo, envio_cliente });
  } catch (e) {
    return Response.json({ ok: false, error: String(e.message || e) }, { status: 502 });
  }
};

export const config = { path: '/.netlify/functions/generar-oferta' };
