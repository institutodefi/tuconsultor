// ════════════════════════════════════════════════════════════════════════════
// OFERTA EN PDF · versión premium
//
// Diferencias con la anterior, que era funcional pero genérica:
//
//   · Tipografía de marca. Rubik incrustada en tres pesos en vez de Helvetica.
//     Es lo que más cambia la percepción de un documento, y lo único que no se
//     puede simular con color.
//   · Retícula real. Un módulo base de 8 pt gobierna márgenes, interlineado y
//     separación entre bloques, en vez de números sueltos por cada sección.
//   · Portada a sangre en navy, con el importe como protagonista.
//   · Jerarquía por peso y espacio, no por cajas y bordes.
//   · Las dos formas de pago de la implantación, enfrentadas para comparar.
//
// La función expuesta es la misma que la anterior, así que se cambia de una a
// otra tocando un solo import en generar-oferta.mjs.
// ════════════════════════════════════════════════════════════════════════════

import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { LOGO_TUCONSULTOR_BLANCO, LOGO_TUCONSULTOR } from './logos-oferta.mjs';
import {
  FUENTE_RUBIK_400, FUENTE_RUBIK_500, FUENTE_RUBIK_700,
  PIE_TUCONSULTOR, PIE_CONSULTIFY, PIE_ORBITA,
} from './assets-oferta.mjs';
// Mismos textos y misma paleta que el PPTX: fuente única.
import {
  RGB01, EMISOR, condiciones as condicionesComunes,
  REQUISITOS_LEGALES as LEGAL_COMUN, clausulas as clausulasComunes, propuesta as propuestaComun,
  nombresDeNormas, fasesDeLosPlanes, describirAjuste, emisorDe,
} from './contenido-oferta.mjs';
import { cuadroFacturacion, mesLargo } from '../../app/src/lib/facturacion.js';

const b64 = (s) => Buffer.from(s, 'base64');

// ── Paleta de marca ─────────────────────────────────────────────────────────
const c = (k) => rgb(...RGB01[k]);
const NAVY = c('navy'), NAVY_HOND = c('navyHondo'), TEAL = c('teal'), NARANJA = c('naranja');
const TINTA = c('tinta'), APAGADO = c('apagado'), LINEA = c('linea'), SUAVE = c('suave');
const BLANCO    = rgb(1, 1, 1);

// ── Retícula ────────────────────────────────────────────────────────────────
const U = 8;                   // módulo base
const A4 = [595.28, 841.89];
const MG = U * 7;              // margen 56 pt
const ANCHO = A4[0] - MG * 2;

const eur = (v) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0) + ' €';
const eur0 = (v) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(v || 0) + ' €';
const HOY = () => new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

/**
 * Fecha del documento. Es la de EMISIÓN de la oferta, no la del día en que se
 * genera el PDF: si no, regenerar una oferta de marzo en agosto la fecharía en
 * agosto y, con los 30 días de validez que constan en las condiciones, le
 * reabriría el plazo sin que nadie lo decidiera.
 */
/** «01 de octubre de 2026», o null si la fecha no vale. */
const fechaLarga = (f) => {
  if (!f) return null;
  const d = new Date(`${String(f).slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null
    : d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
};

const fechaDoc = (r) => fechaLarga(r?.fecha_emision) || HOY();

export async function generarPDFOferta(r, cli, anexo) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const reg  = await pdf.embedFont(b64(FUENTE_RUBIK_400), { subset: true });
  const med  = await pdf.embedFont(b64(FUENTE_RUBIK_500), { subset: true });
  const bold = await pdf.embedFont(b64(FUENTE_RUBIK_700), { subset: true });

  // Los tres logotipos del grupo, para el pie. Se leen de disco como las
  // fuentes: pesan 4,5 KB entre los tres y así no engordan el módulo en base64.
  const pieLogos = {};
  for (const [nombre, datos] of [['tuconsultor', PIE_TUCONSULTOR], ['consultify', PIE_CONSULTIFY], ['orbita', PIE_ORBITA]]) {
    try { pieLogos[nombre] = await pdf.embedPng(b64(datos)); }
    catch { /* si uno falla, el pie se dibuja con los demás */ }
  }

  let logoBlanco = null, logoColor = null;
  try { logoBlanco = await pdf.embedPng(Buffer.from(LOGO_TUCONSULTOR_BLANCO, 'base64')); } catch { /* sin logo */ }
  try { logoColor = await pdf.embedPng(Buffer.from(LOGO_TUCONSULTOR, 'base64')); } catch { /* sin logo */ }

  pdf.setTitle(`Oferta ${r.numero || ''} · ${cli?.empresa || ''}`.trim());
  // Quién emite ESTA oferta. Se resuelve una vez y se usa en todo el documento.
  const EM = emisorDe(r);
  pdf.setAuthor(EM.razonSocial);
  pdf.setSubject('Propuesta de servicios de consultoría de sistemas de gestión');
  pdf.setProducer('Orbita.PMTools');

  const esImpl = r.modelo === 'Implantación';
  const esMes = r.tipo === 'mes' && !esImpl;

  // ── Utilidades de dibujo ──────────────────────────────────────────────────
  const paginas = [];
  function nuevaPagina(fondo = BLANCO) {
    const p = pdf.addPage(A4);
    if (fondo !== BLANCO) { p.drawRectangle({ x: 0, y: 0, width: A4[0], height: A4[1], color: fondo }); }
    paginas.push(p);
    return p;
  }

  /** Parte un texto en líneas que caben en `ancho`. */
  function partir(txt, font, size, ancho) {
    const out = [];
    for (const parrafo of String(txt).split('\n')) {
      let linea = '';
      for (const palabra of parrafo.split(' ')) {
        const prueba = linea ? `${linea} ${palabra}` : palabra;
        if (font.widthOfTextAtSize(prueba, size) > ancho && linea) { out.push(linea); linea = palabra; }
        else linea = prueba;
      }
      out.push(linea);
    }
    return out;
  }

  // ══════════════════ 1 · PORTADA ══════════════════
  const cover = nuevaPagina(NAVY);
  cover.drawRectangle({ x: 0, y: 0, width: A4[0], height: U * 30, color: NAVY_HOND });
  // Filete de marca: teal → naranja, en tres tramos
  cover.drawRectangle({ x: 0, y: A4[1] - U * 0.75, width: A4[0] * 0.42, height: U * 0.75, color: TEAL });
  cover.drawRectangle({ x: A4[0] * 0.42, y: A4[1] - U * 0.75, width: A4[0] * 0.24, height: U * 0.75, color: rgb(0.55, 0.36, 0.08) });
  cover.drawRectangle({ x: A4[0] * 0.66, y: A4[1] - U * 0.75, width: A4[0] * 0.34, height: U * 0.75, color: NARANJA });

  if (logoBlanco) {
    const w = U * 21, h = w * (logoBlanco.height / logoBlanco.width);
    cover.drawImage(logoBlanco, { x: MG, y: A4[1] - U * 12 - h / 2, width: w, height: h });
  }

  let y = A4[1] - U * 26;
  cover.drawText('PROPUESTA DE SERVICIOS', { x: MG, y, size: 9, font: med, color: NARANJA, characterSpacing: 2.4 });

  y -= U * 5;
  const titulo = partir(cli?.empresa || 'Propuesta', bold, 30, ANCHO);
  for (const l of titulo.slice(0, 3)) { cover.drawText(l, { x: MG, y, size: 30, font: bold, color: BLANCO }); y -= U * 4.5; }

  y -= U * 1;
  const normNames = nombresDeNormas(r).join(' · ');
  for (const l of partir(normNames, reg, 12, ANCHO).slice(0, 3)) {
    cover.drawText(l, { x: MG, y, size: 12, font: reg, color: rgb(0.55, 0.72, 0.78) }); y -= U * 2.2;
  }

  // Importe protagonista, abajo
  const yImp = U * 19;
  cover.drawText(esMes ? 'CUOTA MENSUAL' : 'INVERSIÓN', { x: MG, y: yImp + U * 6.5, size: 8.5, font: med, color: TEAL, characterSpacing: 2 });
  const importe = esImpl ? (r.formasPago?.unico?.sinIva ?? r.precioCatalogo) : r.precioCatalogo;
  cover.drawText(eur0(importe), { x: MG, y: yImp + U * 1.5, size: 44, font: bold, color: BLANCO });
  const anchoImp = bold.widthOfTextAtSize(eur0(importe), 44);
  cover.drawText(esMes ? '/mes · sin impuestos' : 'sin impuestos', { x: MG + anchoImp + U, y: yImp + U * 1.9, size: 10, font: reg, color: rgb(0.55, 0.72, 0.78) });
  if (esImpl && r.formasPago) {
    cover.drawText(`con ${Math.round(r.formasPago.descuentoUnico * 100)} % de descuento por pago único`,
      { x: MG, y: yImp - U * 0.6, size: 9, font: reg, color: NARANJA });
  }

  // Pie de portada
  cover.drawText(`Oferta ${r.numero || ''}`.trim(), { x: MG, y: U * 5.5, size: 8.5, font: med, color: rgb(0.45, 0.6, 0.68) });
  cover.drawText(fechaDoc(r), { x: MG, y: U * 3.5, size: 8.5, font: reg, color: rgb(0.35, 0.5, 0.58) });
  const pieCover = EM.pieCorto;
  cover.drawText(pieCover, { x: A4[0] - MG - reg.widthOfTextAtSize(pieCover, 8), y: U * 3.5, size: 8, font: reg, color: rgb(0.35, 0.5, 0.58) });

  // ══════════════════ Páginas de contenido ══════════════════
  let p = null, cursor = 0;

  function cabeceraPagina() {
    p = nuevaPagina();
    p.drawRectangle({ x: 0, y: A4[1] - U * 0.5, width: A4[0], height: U * 0.5, color: NARANJA });
    if (logoColor) {
      const w = U * 13, h = w * (logoColor.height / logoColor.width);
      p.drawImage(logoColor, { x: MG, y: A4[1] - U * 5 - h / 2, width: w, height: h });
    }
    p.drawText(`Oferta ${r.numero || ''} · ${cli?.empresa || ''}`.slice(0, 62),
      { x: A4[0] - MG - reg.widthOfTextAtSize(`Oferta ${r.numero || ''} · ${cli?.empresa || ''}`.slice(0, 62), 7.5), y: A4[1] - U * 5, size: 7.5, font: reg, color: APAGADO });
    cursor = A4[1] - U * 11;
  }

  function espacio(u) { cursor -= U * u; }
  function hayHueco(u) { return cursor - U * u > U * 12; }   // deja libre la banda del pie
  function asegurar(u) { if (!p || !hayHueco(u)) cabeceraPagina(); }

  function seccion(txt, altoBloque = 9) {
    asegurar(altoBloque);
    espacio(1);
    p.drawText(txt.toUpperCase(), { x: MG, y: cursor, size: 8.5, font: med, color: NARANJA, characterSpacing: 1.8 });
    cursor -= U * 1.2;
    p.drawRectangle({ x: MG, y: cursor, width: U * 4, height: 1.5, color: NARANJA });
    cursor -= U * 3;
  }

  function titulo2(txt, size = 17) {
    asegurar(6);
    for (const l of partir(txt, bold, size, ANCHO)) {
      p.drawText(l, { x: MG, y: cursor, size, font: bold, color: TINTA });
      cursor -= size * 1.3;
    }
    cursor -= U * 1.5;
  }

  function parrafo(txt, size = 10.5) {
    for (const l of partir(txt, reg, size, ANCHO)) {
      asegurar(3);
      p.drawText(l, { x: MG, y: cursor, size, font: reg, color: TINTA });
      cursor -= size * 1.7;
    }
    cursor -= U;
  }

  function dato(etiqueta, valor, x, ancho) {
    p.drawText(etiqueta.toUpperCase(), { x, y: cursor, size: 7, font: med, color: APAGADO, characterSpacing: 1.2 });
    const v = partir(String(valor ?? '—'), med, 11, ancho);
    let yy = cursor - U * 2;
    for (const l of v.slice(0, 2)) { p.drawText(l, { x, y: yy, size: 11, font: med, color: TINTA }); yy -= U * 1.8; }
    return yy;
  }

  function rejillaDatos(pares) {
    const col = (ANCHO - U * 3) / 2;
    for (let i = 0; i < pares.length; i += 2) {
      asegurar(6);
      const y1 = dato(pares[i][0], pares[i][1], MG, col);
      const y2 = pares[i + 1] ? dato(pares[i + 1][0], pares[i + 1][1], MG + col + U * 3, col) : cursor;
      cursor = Math.min(y1, y2) - U * 1.5;
    }
    cursor -= U;
  }

  // ── 2 · Qué se ofrece ──
  cabeceraPagina();
  seccion('La propuesta');
  // El texto sale del módulo común: adapta el cierre según se implante un
  // sistema de gestión (auditoría de certificación) o un plan (registro ante la
  // autoridad laboral). Estaba escrito a mano aquí y decía «certificación»
  // también en las ofertas de plan de igualdad, que no se certifica.
  const prop = propuestaComun(r, cli);
  titulo2(prop.titulo);
  parrafo(prop.texto);

  rejillaDatos([
    ['Cliente', cli?.empresa || '—'],
    ['CIF', cli?.cif || '—'],
    // Nombre y cargo juntos: «Consoli Sánchez · Directora». El cargo llegaba
    // en `cli` pero no se imprimía, así que la oferta iba dirigida a un nombre
    // sin decir qué papel ocupa esa persona en la empresa.
    ['Persona de contacto',
     [cli?.contacto || cli?.email || '—', cli?.cargo].filter(Boolean).join(' · ')],
    ...(cli?.email && cli?.contacto ? [['Correo de contacto', cli.email]] : []),
    ['Modelo de servicio', r.modelo + (esImpl && r.meses ? ` · ${r.meses} meses` : '')],
    ['Sistemas incluidos', String(nombresDeNormas(r).length)],
    ['Dedicación estimada', `${r.hTotal} h`],
    ...(r.complejidad ? [['Complejidad', r.complejidad]] : []),
    ...(r.sedes && r.sedes > 1 ? [['Sedes o alcances', String(r.sedes)]] : []),
  ]);

  // ── 3 · Alcance ──
  seccion('Alcance');
  const listaNormas = nombresDeNormas(r);
  for (const n of listaNormas) {
    asegurar(3);
    p.drawRectangle({ x: MG, y: cursor + 3, width: U * 0.6, height: U * 0.6, color: TEAL });
    p.drawText(String(n), { x: MG + U * 2, y: cursor, size: 10.5, font: med, color: TINTA });
    cursor -= U * 2.6;
  }
  cursor -= U;

  // ── 3b · Fases de los planes ──
  // Un plan de igualdad no es un bloque indivisible: son fases con horas
  // propias. Quien lo contrata tiene derecho a ver cuáles entran.
  const planes = fasesDeLosPlanes(r);
  for (const plan of planes) {
    seccion(`Fases · ${plan.plan}`, 12);
    // Si el alcance es parcial hay que decirlo: enumerar cinco fases sin
    // aclarar que el plan tiene siete deja al cliente creyendo que compró todo.
    parrafo(plan.parcial
      ? `Se contratan ${plan.fases.length} de las ${plan.totalFases} fases del plan, ${plan.horas} horas en total. Las fases no incluidas quedan fuera del alcance y pueden contratarse por separado.`
      : `El plan se desarrolla en ${plan.fases.length} fases, ${plan.horas} horas en total. Cada una tiene sus tareas y su dedicación.`);
    for (const f of plan.fases) {
      const lineas = partir(f.tareas.join(' · '), reg, 9, ANCHO - U * 3);
      asegurar(lineas.length * 1.6 + 4);
      p.drawRectangle({ x: MG, y: cursor - U * 0.3, width: U * 0.35, height: U * 1.7, color: TEAL });
      p.drawText(f.nombre, { x: MG + U * 1.4, y: cursor, size: 10.5, font: bold, color: TINTA });
      const hs = `${f.horas} h`;
      p.drawText(hs, { x: MG + ANCHO - bold.widthOfTextAtSize(hs, 10.5), y: cursor, size: 10.5, font: bold, color: TEAL });
      cursor -= U * 2;
      for (const l of lineas) {
        p.drawText(l, { x: MG + U * 1.4, y: cursor, size: 9, font: reg, color: APAGADO });
        cursor -= U * 1.5;
      }
      cursor -= U * 0.8;
    }
  }

  // ── 3c · Calendario del encargo ──
  // Las tres fechas que definen el encargo, juntas y visibles. Antes solo se
  // veían indirectamente (la de emisión en la portada, la de primer pago en el
  // cuadro de facturación) y el cliente no tenía dónde leer cuándo empieza,
  // cuándo termina y cuándo está prevista la auditoría.
  {
    const fmt = fechaLarga;
    const hitos = [
      ['Inicio previsto', fmt(r.fecha_inicio)],
      [esImpl ? 'Fin del proyecto' : 'Fin de contrato', fmt(r.fecha_fin)],
      // La certificación es opcional: si no hay fecha se dice, en lugar de
      // dejar un hueco que parezca un error del documento.
      ['Certificación prevista', fmt(r.fecha_certificacion) || 'Por determinar'],
    ].filter(([, v]) => v);

    if (hitos.length) {
      seccion('Calendario', 12);
      asegurar(9);
      const anchoCol = ANCHO / hitos.length;
      const alturaCaja = U * 6.5;
      p.drawRectangle({ x: MG, y: cursor - alturaCaja + U * 2, width: ANCHO, height: alturaCaja,
        color: rgb(0.965, 0.976, 0.984) });
      p.drawRectangle({ x: MG, y: cursor - alturaCaja + U * 2, width: U * 0.4, height: alturaCaja, color: NARANJA });
      hitos.forEach(([etq, val], i) => {
        const x = MG + i * anchoCol + U * 1.6;
        p.drawText(etq.toUpperCase(), { x, y: cursor, size: 7.5, font: med, color: APAGADO, characterSpacing: 1.1 });
        p.drawText(val, { x, y: cursor - U * 2.4, size: 11, font: bold, color: TINTA });
      });
      cursor -= alturaCaja + U * 0.5;
    }
  }

  // ── 4 · Inversión ──
  // El pago adelantado añade una caja debajo: hay que reservarle sitio o se
  // dibuja encima de la de la cuota.
  seccion('Inversión', (esImpl ? 22 : 17) + (r.pagoAdelantado && r.adelantado ? 9 : 0));
  asegurar(14);
  const alturaCaja = esImpl ? U * 16 : U * 11;
  p.drawRectangle({ x: MG, y: cursor - alturaCaja + U * 2, width: ANCHO, height: alturaCaja, color: SUAVE });
  p.drawRectangle({ x: MG, y: cursor - alturaCaja + U * 2, width: U * 0.5, height: alturaCaja, color: NARANJA });

  let yc = cursor - U * 1;
  p.drawText(esMes ? 'CUOTA MENSUAL' : 'IMPORTE DEL PROYECTO', { x: MG + U * 3, y: yc, size: 7.5, font: med, color: APAGADO, characterSpacing: 1.4 });
  yc -= U * 4;
  p.drawText(eur(esImpl ? (r.formasPago?.dos?.sinIva ?? r.precioCatalogo) : r.precioCatalogo),
    { x: MG + U * 3, y: yc, size: 26, font: bold, color: TINTA });
  p.drawText(esMes ? '/mes sin impuestos' : 'sin impuestos', { x: MG + U * 3 + bold.widthOfTextAtSize(eur(r.precioCatalogo), 26) + U, y: yc + 3, size: 9.5, font: reg, color: APAGADO });
  yc -= U * 2.6;
  p.drawText('Impuestos indirectos no incluidos.',
    { x: MG + U * 3, y: yc, size: 9.5, font: reg, color: APAGADO });

  // Pago anual por adelantado: la cifra que de verdad se factura, junto a la
  // cuota. Enseñar solo la mensual cuando se cobra el año entero de una vez
  // deja al cliente sin el número que va a ver en su banco.
  if (r.pagoAdelantado && r.adelantado) {
    // Se arranca por debajo de la caja de la cuota, con un margen: la línea de
    // «impuestos indirectos» todavía ocupa espacio bajo el cursor.
    const alto = U * 4;
    const top = (cursor - alturaCaja + U * 2) - U * 1.2;
    p.drawRectangle({ x: MG, y: top - alto, width: ANCHO, height: alto, color: rgb(0.965, 0.976, 0.984) });
    p.drawRectangle({ x: MG, y: top - alto, width: U * 0.35, height: alto, color: NARANJA });
    p.drawText('PAGO ANUAL POR ADELANTADO', { x: MG + U * 1.4, y: top - U * 1.3, size: 7.5,
      font: med, color: APAGADO, characterSpacing: 1.1 });
    const cifra = eur(r.adelantado.total);
    p.drawText(cifra, { x: MG + U * 1.4, y: top - U * 3, size: 15, font: bold, color: TINTA });
    p.drawText(`${r.adelantado.mesesCobrados} mensualidades · ${r.adelantado.mesesServicio} meses de servicio`
      + `  ·  ahorro de ${eur(r.adelantado.ahorro)}`,
      { x: MG + U * 1.4 + bold.widthOfTextAtSize(cifra, 15) + U, y: top - U * 2.65,
        size: 8.5, font: reg, color: APAGADO });
    cursor = top - alto - U * 0.8;
  }
  cursor = cursor - alturaCaja - U;

  // ── Ajustes de esta oferta ──
  // Se enseñan: un descuento que no se ve no sirve de argumento comercial, y
  // uno que aparece sin explicar levanta la sospecha de que el precio de
  // partida estaba inflado.
  const ajustes = (r.ajustes || []).filter((a) => a.efecto);
  if (ajustes.length) {
    asegurar(ajustes.length * 2 + 6);
    p.drawText('CONDICIONES PARTICULARES DE ESTA PROPUESTA',
      { x: MG, y: cursor, size: 8, font: med, color: TEAL, characterSpacing: 1.2 });
    cursor -= U * 2;
    p.drawText(`Precio de catálogo: ${eur(r.precioAntesDeAjustes)}${esMes ? '/mes' : ''}`,
      { x: MG, y: cursor, size: 9.5, font: reg, color: APAGADO });
    cursor -= U * 2;
    for (const a of ajustes) {
      const d = describirAjuste(a);
      p.drawCircle({ x: MG + U * 0.5, y: cursor + 3, size: 1.4, color: TEAL });
      p.drawText(d.concepto, { x: MG + U * 1.6, y: cursor, size: 10, font: med, color: TINTA });
      p.drawText(d.efecto, { x: MG + ANCHO - med.widthOfTextAtSize(d.efecto, 10), y: cursor, size: 10, font: med,
                             color: a.efecto < 0 ? TEAL : NARANJA });
      cursor -= U * 2;
    }
    p.drawLine({ start: { x: MG, y: cursor + U * 0.6 }, end: { x: MG + ANCHO, y: cursor + U * 0.6 }, thickness: 0.6, color: LINEA });
    cursor -= U * 0.6;
    const final = `Precio de esta propuesta: ${eur(r.precioCatalogo)}${esMes ? '/mes' : ''}`;
    p.drawText(final, { x: MG, y: cursor, size: 11, font: bold, color: TINTA });
    cursor -= U * 3;
  }

  // ── 5 · Formas de pago (solo implantación) ──
  if (r.formasPago) {
    seccion('Formas de pago', 24);   // rótulo + entradilla + las dos tarjetas
    parrafo('La implantación no admite cuota mensual. Se abona de una de estas dos formas, a elección de la organización:');
    const opciones = [r.formasPago.unico, r.formasPago.dos];
    const anchoCol = (ANCHO - U * 2) / 2;
    asegurar(14);
    const yTop = cursor;
    let masBajo = cursor;
    opciones.forEach((op, i) => {
      const x = MG + i * (anchoCol + U * 2);
      const elegida = r.formaPagoElegida === op.id || (!r.formaPagoElegida && i === 0);
      p.drawRectangle({ x, y: yTop - U * 12, width: anchoCol, height: U * 13, color: BLANCO,
        borderColor: elegida ? NARANJA : LINEA, borderWidth: elegida ? 1.6 : 1 });
      let yy = yTop - U * 0.5;
      p.drawText(String.fromCharCode(65 + i), { x: x + U * 1.5, y: yy, size: 8, font: bold, color: elegida ? NARANJA : APAGADO });
      p.drawText(op.titulo, { x: x + U * 4, y: yy, size: 11.5, font: bold, color: TINTA });
      yy -= U * 3;
      p.drawText(eur(op.sinIva), { x: x + U * 1.5, y: yy, size: 16, font: bold, color: TINTA });
      p.drawText('sin impuestos', { x: x + U * 1.5 + bold.widthOfTextAtSize(eur(op.sinIva), 16) + 5, y: yy + 2, size: 7.5, font: reg, color: APAGADO });
      yy -= U * 2.2;
      if (op.ahorro) p.drawText(`Ahorras ${eur(op.ahorro)}`, { x: x + U * 1.5, y: yy, size: 9, font: med, color: TEAL });
      else if (op.cuota1SinIva) p.drawText(`${eur(op.cuota1SinIva)} + ${eur(op.cuota2SinIva)}`, { x: x + U * 1.5, y: yy, size: 9, font: med, color: APAGADO });
      yy -= U * 2.2;
      for (const l of partir(op.condicion, reg, 8.5, anchoCol - U * 3)) {
        p.drawText(l, { x: x + U * 1.5, y: yy, size: 8.5, font: reg, color: APAGADO });
        yy -= U * 1.4;
      }
      masBajo = Math.min(masBajo, yy);
    });
    cursor = Math.min(masBajo, yTop - U * 12) - U * 2;
  }

  // ── Cuadro de facturación ──
  // «12.000 € de implantación» no dice si entran este mes o repartidos en un
  // año, que es lo que el cliente necesita saber para su tesorería.
  {
    // ── Cuántas cuotas se listan ──
    // Ojo con `r.meses`: en una Implantación es la duración del proyecto, pero
    // en un modelo recurrente es el plazo hasta la certificación (3, 6, 8…),
    // NO la duración del contrato. El contrato recurrente es siempre de doce
    // meses de permanencia, así que el cuadro lista doce cuotas aunque la
    // certificación llegue antes.
    //
    // Esto también arregla las ofertas ya emitidas: llevan su `meses` guardado
    // en la fila del presupuesto y al regenerarlas se reenvía tal cual. Si el
    // número de cuotas dependiera de ese dato, una oferta antigua con meses: 3
    // seguiría saliendo con tres cuotas por mucho que se regenerara.
    const MESES_PERMANENCIA = 12;
    const mesesCuadro = r.tipo === 'mes' ? MESES_PERMANENCIA : r.meses;

    const cuadro = cuadroFacturacion({
      tipo: r.tipo, importe: r.precioCatalogo,
      // Con pago adelantado el calendario es UN cargo, no doce cuotas: el
      // cuadro es lo que el cliente compara con su extracto bancario.
      adelantado: !!r.pagoAdelantado,
      // Arranca en la fecha del primer pago, que por defecto es el mes de
      // inicio del proyecto pero puede diferir (anticipo, o arranque a mitad
      // de mes que se factura al siguiente).
      firma: r.fecha_primer_pago || r.fecha_inicio || null, meses: mesesCuadro,
      formaPago: r.formaPagoElegida || r.forma_pago,
      certificacion: r.fecha_certificacion || null,
    });
    // ── Pago anual por adelantado: NO hay calendario ──
    // Con un solo cargo, una tabla de cuatro columnas con una fila y una
    // columna «acumulado» que repite el mismo número es papel gastado. Lo que
    // el cliente necesita saber es cuánto y cuándo vence, y eso se dice mejor
    // como un vencimiento único.
    if (r.pagoAdelantado && r.adelantado) {
      seccion('Cuándo se factura', 16);
      parrafo(`Pago único por adelantado: se abonan ${r.adelantado.mesesCobrados} mensualidades `
        + `y se prestan ${r.adelantado.mesesServicio} meses de servicio.`);

      asegurar(9);
      const altoCaja = U * 7;
      const topCaja = cursor + U * 1.2;
      p.drawRectangle({ x: MG, y: topCaja - altoCaja, width: ANCHO, height: altoCaja, color: SUAVE });
      p.drawRectangle({ x: MG, y: topCaja - altoCaja, width: U * 0.5, height: altoCaja, color: NARANJA });

      // El vencimiento es la fecha del contrato: es cuando nace la obligación
      // de pago, no cuando empieza a prestarse el servicio.
      const fv = r.fecha_primer_pago || r.fecha_inicio || null;
      const venc = fv ? fechaLarga(fv) : 'a la firma del contrato';

      p.drawText('PAGO ÚNICO', { x: MG + U * 2, y: topCaja - U * 1.8, size: 7.5,
        font: med, color: APAGADO, characterSpacing: 1.4 });
      p.drawText(eur(r.adelantado.total), { x: MG + U * 2, y: topCaja - U * 4.2, size: 22, font: bold, color: TINTA });
      p.drawText('sin impuestos', { x: MG + U * 2 + bold.widthOfTextAtSize(eur(r.adelantado.total), 22) + U,
        y: topCaja - U * 4, size: 9, font: reg, color: APAGADO });

      const etqV = 'VENCIMIENTO';
      p.drawText(etqV, { x: MG + ANCHO - U * 2 - med.widthOfTextAtSize(etqV, 7.5), y: topCaja - U * 1.8,
        size: 7.5, font: med, color: APAGADO, characterSpacing: 1.4 });
      p.drawText(venc, { x: MG + ANCHO - U * 2 - bold.widthOfTextAtSize(venc, 11), y: topCaja - U * 4,
        size: 11, font: bold, color: TINTA });

      p.drawText(`Equivale a ${eur(r.precioCatalogo)}/mes durante ${r.adelantado.mesesServicio} meses`
        + `  ·  ahorro de ${eur(r.adelantado.ahorro)} frente al pago mensual`,
        { x: MG + U * 2, y: topCaja - U * 6, size: 8.5, font: reg, color: APAGADO });

      cursor = topCaja - altoCaja - U * 1.5;
    } else if (cuadro.filas.length > 1 || r.tipo === 'mes') {
      // Se reserva sitio para la cabecera y unas cuantas filas; el resto pagina
      // solo con `asegurar`. Pedir las doce de golpe forzaría un salto de página
      // aunque cupieran ocho.
      seccion('Cuándo se factura', Math.min(cuadro.filas.length, 8) * 2 + 12);
      parrafo(r.tipo === 'mes'
        ? `Cuota mensual desde el inicio del servicio. ${cuadro.filas.length} ${cuadro.filas.length === 1 ? 'cargo' : 'cargos'} durante la vigencia del contrato.`
        : 'Calendario de facturación previsto desde la firma.');

      // Cabecera
      asegurar(4);
      p.drawText('FECHA', { x: MG, y: cursor, size: 7.5, font: med, color: APAGADO, characterSpacing: 1.2 });
      p.drawText('CONCEPTO', { x: MG + U * 13, y: cursor, size: 7.5, font: med, color: APAGADO, characterSpacing: 1.2 });
      // Antes la segunda columna era el importe CON IVA. En un presupuesto sin
      // impuestos eso no tiene sitio: se sustituye por el acumulado, que sí
      // aporta (cuánto llevas comprometido a esa fecha).
      const hBase = 'IMPORTE', hTot = 'ACUMULADO';
      p.drawText(hBase, { x: MG + ANCHO - U * 13 - med.widthOfTextAtSize(hBase, 7.5), y: cursor, size: 7.5, font: med, color: APAGADO, characterSpacing: 1.2 });
      p.drawText(hTot, { x: MG + ANCHO - med.widthOfTextAtSize(hTot, 7.5), y: cursor, size: 7.5, font: med, color: APAGADO, characterSpacing: 1.2 });
      cursor -= U * 1.2;
      p.drawLine({ start: { x: MG, y: cursor }, end: { x: MG + ANCHO, y: cursor }, thickness: 0.6, color: LINEA });
      cursor -= U * 2;

      // Se listan TODAS las cuotas. Antes se recortaba a tres «para no repetir
      // filas iguales», pero el cliente necesita ver el calendario completo:
      // qué mes empieza, qué mes acaba y cuánto lleva comprometido en cada uno.
      const filas = cuadro.filas;
      let acumulado = 0;
      for (const f of filas) {
        asegurar(3);
        acumulado = Math.round((acumulado + Number(f.base || 0)) * 100) / 100;
        p.drawText(mesLargo(f.mes), { x: MG, y: cursor, size: 9.5, font: reg, color: TINTA });
        for (const l of partir(f.concepto, reg, 9.5, ANCHO - U * 27).slice(0, 1)) {
          p.drawText(l, { x: MG + U * 13, y: cursor, size: 9.5, font: reg, color: APAGADO });
        }
        const b = eur(f.base), t = eur(acumulado);
        p.drawText(b, { x: MG + ANCHO - U * 13 - reg.widthOfTextAtSize(b, 9.5), y: cursor, size: 9.5, font: reg, color: APAGADO });
        p.drawText(t, { x: MG + ANCHO - med.widthOfTextAtSize(t, 9.5), y: cursor, size: 9.5, font: med, color: TINTA });
        cursor -= U * 2;
      }

      p.drawLine({ start: { x: MG, y: cursor + U * 0.8 }, end: { x: MG + ANCHO, y: cursor + U * 0.8 }, thickness: 0.6, color: LINEA });
      cursor -= U * 0.4;
      const tot = `${eur(cuadro.totalBase)} en total · impuestos indirectos no incluidos`;
      p.drawText(tot, { x: MG + ANCHO - bold.widthOfTextAtSize(tot, 10), y: cursor, size: 10, font: bold, color: TINTA });
      cursor -= U * 3;
    }
  }

  // ── 6 · Condiciones ──
  seccion('Condiciones', 14);
  const condiciones = condicionesComunes(r);
  for (const c of condiciones) {
    const lineas = partir(c, reg, 9, ANCHO - U * 2.5);
    asegurar(lineas.length * 1.6 + 1);
    p.drawText('·', { x: MG, y: cursor, size: 11, font: bold, color: NARANJA });
    for (const l of lineas) {
      p.drawText(l, { x: MG + U * 2, y: cursor, size: 9, font: reg, color: APAGADO });
      cursor -= U * 1.6;
    }
    cursor -= U * 0.8;
  }


  // ── Notas aclaratorias de esta oferta ──
  if (r.notas && String(r.notas).trim()) {
    seccion('Notas de esta propuesta', 10);
    for (const linea of String(r.notas).split('\n').map((x) => x.trim()).filter(Boolean)) {
      const lineas = partir(linea, reg, 10, ANCHO - U * 2.5);
      asegurar(lineas.length * 1.7 + 1);
      p.drawRectangle({ x: MG, y: cursor - U * 0.3, width: U * 0.35, height: U * 1.5, color: TEAL });
      for (const l of lineas) {
        p.drawText(l, { x: MG + U * 1.6, y: cursor, size: 10, font: reg, color: TINTA });
        cursor -= U * 1.7;
      }
      cursor -= U * 0.8;
    }
    cursor -= U;
  }

  // ══════════════════ ACEPTACIÓN ══════════════════
  asegurar(20);
  seccion('Aceptación', 18);
  parrafo('La firma de este documento supone la aceptación de la propuesta y de las condiciones recogidas en los anexos.');

  {
    const colAncho = (ANCHO - U * 4) / 2;
    const yFirmas = cursor;
    const alto = U * 11;
    // Por TuConsultor
    p.drawRectangle({ x: MG, y: yFirmas - alto, width: colAncho, height: alto, color: SUAVE });
    p.drawText('POR ' + EM.marca.toUpperCase(), { x: MG + U * 1.5, y: yFirmas - U * 2, size: 7, font: med, color: APAGADO, characterSpacing: 1.2 });
    p.drawText(EM.firmante, { x: MG + U * 1.5, y: yFirmas - U * 4.4, size: 11.5, font: bold, color: TINTA });
    p.drawText(EM.cargo, { x: MG + U * 1.5, y: yFirmas - U * 6.2, size: 9, font: reg, color: APAGADO });
    // La razón social, en la firma: es la sociedad que se obliga.
    for (const l of partir(`${EM.razonSocial} · CIF ${EM.cif}`, reg, 8, colAncho - U * 3)) {
      p.drawText(l, { x: MG + U * 1.5, y: yFirmas - U * 7.4, size: 8, font: reg, color: APAGADO });
    }
    p.drawLine({ start: { x: MG + U * 1.5, y: yFirmas - U * 9 }, end: { x: MG + colAncho - U * 1.5, y: yFirmas - U * 9 }, thickness: 0.8, color: LINEA });
    p.drawText('Firma y fecha', { x: MG + U * 1.5, y: yFirmas - U * 10.3, size: 7, font: reg, color: APAGADO });

    // Por el cliente
    const x2 = MG + colAncho + U * 4;
    p.drawRectangle({ x: x2, y: yFirmas - alto, width: colAncho, height: alto, color: BLANCO, borderColor: LINEA, borderWidth: 1 });
    p.drawText('POR LA ORGANIZACIÓN', { x: x2 + U * 1.5, y: yFirmas - U * 2, size: 7, font: med, color: APAGADO, characterSpacing: 1.2 });
    for (const l of partir(cli?.empresa || '', bold, 11.5, colAncho - U * 3).slice(0, 1)) {
      p.drawText(l, { x: x2 + U * 1.5, y: yFirmas - U * 4.4, size: 11.5, font: bold, color: TINTA });
    }
    p.drawText(cli?.contacto || 'Persona con capacidad de firma', { x: x2 + U * 1.5, y: yFirmas - U * 6.2, size: 9, font: reg, color: APAGADO });
    p.drawLine({ start: { x: x2 + U * 1.5, y: yFirmas - U * 9 }, end: { x: x2 + colAncho - U * 1.5, y: yFirmas - U * 9 }, thickness: 0.8, color: LINEA });
    p.drawText('Firma y fecha', { x: x2 + U * 1.5, y: yFirmas - U * 10.3, size: 7, font: reg, color: APAGADO });
    cursor = yFirmas - alto - U * 2;
  }

  // ── Anexo I · tareas ──
  if (Array.isArray(anexo) && anexo.length) {
    cabeceraPagina();
    seccion('Anexo I');
    titulo2('Tareas incluidas', 15);
    parrafo('Relación de tareas del programa, agrupadas por proceso. Es el detalle de lo que se ejecuta, no un cronograma.');
    // El anexo llega como [{ bloque, subs: [...] }]. Antes se leía como
    // { proceso, subproceso } y por eso salía vacío: los campos no existían.
    for (const grupo of anexo) {
      const bloque = grupo.bloque || grupo.proceso || grupo.proc || '';
      const tareas = grupo.subs || grupo.tareas ||
        (grupo.subproceso || grupo.sub ? [grupo.subproceso || grupo.sub] : []);
      if (!bloque && !tareas.length) continue;

      asegurar(5);
      cursor -= U * 0.5;
      p.drawText(String(bloque).toUpperCase(), { x: MG, y: cursor, size: 8, font: med, color: TEAL, characterSpacing: 1.2 });
      cursor -= U * 1.6;
      p.drawLine({ start: { x: MG, y: cursor + U * 0.8 }, end: { x: MG + ANCHO, y: cursor + U * 0.8 }, thickness: 0.6, color: LINEA });
      cursor -= U * 0.8;

      for (const tarea of tareas) {
        const texto = typeof tarea === 'string' ? tarea : (tarea.subproceso || tarea.sub || tarea.titulo || '');
        if (!texto) continue;
        const lineas = partir(texto, reg, 9.5, ANCHO - U * 3);
        asegurar(lineas.length * 1.7 + 0.5);
        p.drawCircle({ x: MG + U * 0.8, y: cursor + 3, size: 1.2, color: NARANJA });
        for (const l of lineas) {
          p.drawText(l, { x: MG + U * 2.2, y: cursor, size: 9.5, font: reg, color: TINTA });
          cursor -= U * 1.7;
        }
      }
      cursor -= U;
    }
    if (!anexo.some((g) => (g.subs || []).length)) {
      parrafo('No hay tareas asociadas a los sistemas seleccionados en este modelo.');
    }
  }


  // ══════════════════ ANEXO II · REQUISITOS LEGALES ══════════════════
  cabeceraPagina();
  seccion('Anexo II');
  titulo2('Requisitos legales aplicables', 15);
  parrafo('Marco normativo que enmarca los servicios de esta propuesta. No es una lista exhaustiva ni sustituye al asesoramiento jurídico: el marco aplicable a cada organización depende de su sector, su tamaño y su actividad.');

  const LEGAL = LEGAL_COMUN;
  for (const [tit, txt] of LEGAL) {
    const lineas = partir(txt, reg, 9.5, ANCHO - U * 2);
    asegurar(lineas.length * 1.7 + 4);
    p.drawText(tit, { x: MG, y: cursor, size: 10.5, font: bold, color: TINTA });
    cursor -= U * 2.2;
    for (const l of lineas) {
      p.drawText(l, { x: MG, y: cursor, size: 9.5, font: reg, color: APAGADO });
      cursor -= U * 1.7;
    }
    cursor -= U * 1.2;
  }

  // ══════════════════ ANEXO III · CLÁUSULAS ══════════════════
  cabeceraPagina();
  seccion('Anexo III');
  titulo2('Qué se contrata exactamente', 15);
  parrafo('Este anexo explica en lenguaje claro cómo funciona el modelo contratado. Está aquí para que no haya interpretaciones distintas dentro de seis meses.');

  const CLAUSULAS = clausulasComunes(r);
  for (const [tit, txt] of CLAUSULAS) {
    const lineas = partir(txt, reg, 10, ANCHO - U * 2);
    asegurar(lineas.length * 1.8 + 5);
    p.drawRectangle({ x: MG, y: cursor - U * 0.4, width: U * 0.4, height: U * 1.8, color: NARANJA });
    p.drawText(tit, { x: MG + U * 1.6, y: cursor, size: 11, font: bold, color: TINTA });
    cursor -= U * 2.6;
    for (const l of lineas) {
      p.drawText(l, { x: MG + U * 1.6, y: cursor, size: 10, font: reg, color: TINTA });
      cursor -= U * 1.8;
    }
    cursor -= U * 1.5;
  }

  // ── Pie en todas las páginas de contenido ──
  const total = paginas.length;
  paginas.forEach((pg, i) => {
    if (i === 0) return;   // la portada no lleva pie

    // Banda navy al pie. No es capricho: el logotipo de TuConsultor y el de
    // Consultify solo existen en versión clara, pensada para fondo oscuro. Sobre
    // blanco, el de TuConsultor desaparece entero. La banda resuelve el problema
    // y de paso cierra el documento con el mismo navy de la portada.
    const ALTO_BANDA = U * 9;
    pg.drawRectangle({ x: 0, y: 0, width: A4[0], height: ALTO_BANDA, color: NAVY });
    pg.drawRectangle({ x: 0, y: ALTO_BANDA - 1.5, width: A4[0] * 0.42, height: 1.5, color: TEAL });
    pg.drawRectangle({ x: A4[0] * 0.42, y: ALTO_BANDA - 1.5, width: A4[0] * 0.58, height: 1.5, color: NARANJA });

    // Los tres logotipos. La esfera de Orbita va algo mayor: es una marca
    // cuadrada entre dos horizontales y al mismo alto se vería más pequeña.
    // Orbita ya es un lockup horizontal como los otros dos, no una esfera suelta.
    const ALTOS = { tuconsultor: U * 2.1, consultify: U * 1.9, orbita: U * 2.3 };
    const CENTRO = ALTO_BANDA / 2;

    // Se mide ANTES de dibujar. Antes se dibujaban los logos y luego el texto
    // legal se colocaba desde el borde derecho a ciegas: con tres logotipos y
    // una razón social larga, ambos acababan pisándose en la misma banda.
    const num = `${i + 1} / ${total}`;
    const anchoNum = med.widthOfTextAtSize(num, 7.5);

    let anchoLogos = 0;
    const piezas = [];
    for (const nombre of ['tuconsultor', 'consultify', 'orbita']) {
      const img = pieLogos[nombre];
      if (!img) continue;
      const hh = ALTOS[nombre];
      const ww = hh * (img.width / img.height);
      piezas.push({ nombre, img, h: hh, w: ww });
      anchoLogos += ww + U * 2;
    }
    if (piezas.length) anchoLogos -= U * 2;   // el último no lleva separación

    let x = MG;
    for (let k = 0; k < piezas.length; k++) {
      const { img, h: hh, w: ww } = piezas[k];
      pg.drawImage(img, { x, y: CENTRO - hh / 2, width: ww, height: hh });
      x += ww + U * 2;
      if (k < piezas.length - 1) {
        pg.drawCircle({ x: x - U, y: CENTRO, size: 0.9, color: rgb(0.35, 0.5, 0.58) });
      }
    }

    // El legal solo se dibuja si cabe de verdad entre los logos y el número de
    // página. Si no cabe entero se prueba una versión corta (razón social y
    // CIF); si tampoco, se omite: mejor un pie limpio que dos textos encimados.
    const libre = ANCHO - anchoLogos - anchoNum - U * 4;
    const largo = EM.legalPie;
    const corto = `${EM.razonSocial} · CIF ${EM.cif}`;
    const legal = reg.widthOfTextAtSize(largo, 7) <= libre ? largo
      : (reg.widthOfTextAtSize(corto, 7) <= libre ? corto : null);
    if (legal) {
      const anchoLegal = reg.widthOfTextAtSize(legal, 7);
      pg.drawText(legal, { x: MG + ANCHO - anchoNum - U * 2 - anchoLegal, y: CENTRO - 2.5, size: 7, font: reg, color: rgb(0.55, 0.68, 0.74) });
    }
    pg.drawText(num, { x: MG + ANCHO - anchoNum, y: CENTRO - 2.5, size: 7.5, font: med, color: BLANCO });
  });

  return Buffer.from(await pdf.save());
}
