// ════════════════════════════════════════════════════════════════════════════
// CONTRATO EN PDF
//
// Mismo lenguaje visual que la oferta —Rubik incrustada, retícula de 8 pt, pie
// con las tres marcas— pero NO es la oferta con otro título.
//
// Un contrato se lee distinto: quien lo firma busca quién se obliga, a qué, por
// cuánto y hasta cuándo. Por eso va con cláusulas numeradas, comparecientes
// arriba y una portada sobria: aquí el importe no es el reclamo, es un dato más.
//
// Todo sale del contrato guardado, que congeló lo aceptado. Si la oferta cambia
// después, este documento sigue diciendo lo que se firmó.
// ════════════════════════════════════════════════════════════════════════════

import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {
  FUENTE_RUBIK_400, FUENTE_RUBIK_500, FUENTE_RUBIK_700,
  PIE_TUCONSULTOR, PIE_CONSULTIFY, PIE_ORBITA,
} from './assets-oferta.mjs';
import { LOGO_TUCONSULTOR_BLANCO, LOGO_TUCONSULTOR } from './logos-oferta.mjs';
import { RGB01, emisorDe, fmtEur, fechaLarga, nombresDeNormas } from './contenido-oferta.mjs';

const b64 = (s) => Buffer.from(s, 'base64');
const c = (k) => rgb(...RGB01[k]);
const NAVY = c('navy'), NAVY_HOND = c('navyHondo'), TEAL = c('teal'), NARANJA = c('naranja');
const TINTA = c('tinta'), APAGADO = c('apagado'), LINEA = c('linea'), SUAVE = c('suave');
const BLANCO = rgb(1, 1, 1);

const U = 8;
const A4 = [595.28, 841.89];
const MG = U * 7;
const ANCHO = A4[0] - MG * 2;

const fecha = (iso) => iso
  ? new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
  : '—';

export async function generarPDFContrato(contrato, oferta = {}) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const reg = await pdf.embedFont(b64(FUENTE_RUBIK_400), { subset: true });
  const med = await pdf.embedFont(b64(FUENTE_RUBIK_500), { subset: true });
  const bold = await pdf.embedFont(b64(FUENTE_RUBIK_700), { subset: true });

  const EM = emisorDe({ emisora_id: contrato.emisora_id });
  const normas = nombresDeNormas({ normas: contrato.normas });
  const esImpl = contrato.modelo === 'Implantación';
  const importe = Number(contrato.importe || 0);
  // NOTA: el contrato fija la BASE sin impuestos. El tipo impositivo no se
  // imprime porque depende del domicilio fiscal del cliente en la fecha de
  // devengo (IVA / IGIC / IPSI / inversión del sujeto pasivo / no sujeta).
  // El cálculo del impuesto vive en lib/facturacion.js, para facturar.

  pdf.setTitle(`Contrato ${contrato.numero} · ${contrato.cliente_empresa}`);
  pdf.setAuthor(EM.razonSocial);
  pdf.setSubject('Contrato de prestación de servicios de consultoría');
  pdf.setProducer('Orbita.PMTools');

  let logoBlanco = null, logoColor = null;
  try { logoBlanco = await pdf.embedPng(b64(LOGO_TUCONSULTOR_BLANCO)); } catch { /* sin logo */ }
  try { logoColor = await pdf.embedPng(b64(LOGO_TUCONSULTOR)); } catch { /* sin logo */ }
  const pieLogos = {};
  for (const [n, d] of [['tuconsultor', PIE_TUCONSULTOR], ['consultify', PIE_CONSULTIFY], ['orbita', PIE_ORBITA]]) {
    try { pieLogos[n] = await pdf.embedPng(b64(d)); } catch { /* uno menos */ }
  }

  const paginas = [];
  let p = null, cursor = 0;

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

  function nuevaPagina(fondo = BLANCO) {
    const pg = pdf.addPage(A4);
    if (fondo !== BLANCO) pg.drawRectangle({ x: 0, y: 0, width: A4[0], height: A4[1], color: fondo });
    paginas.push(pg);
    return pg;
  }

  function cabecera() {
    p = nuevaPagina();
    p.drawRectangle({ x: 0, y: A4[1] - U * 0.5, width: A4[0], height: U * 0.5, color: NARANJA });
    if (logoColor) {
      const w = U * 12, h = w * (logoColor.height / logoColor.width);
      p.drawImage(logoColor, { x: MG, y: A4[1] - U * 5 - h / 2, width: w, height: h });
    }
    const ref = `Contrato ${contrato.numero}`;
    p.drawText(ref, { x: A4[0] - MG - reg.widthOfTextAtSize(ref, 7.5), y: A4[1] - U * 5, size: 7.5, font: reg, color: APAGADO });
    cursor = A4[1] - U * 11;
  }

  const hueco = (u) => cursor - U * u > U * 12;
  const asegurar = (u) => { if (!p || !hueco(u)) cabecera(); };

  function rotulo(txt, alto = 8) {
    asegurar(alto);
    cursor -= U;
    p.drawText(txt.toUpperCase(), { x: MG, y: cursor, size: 8.5, font: med, color: NARANJA, characterSpacing: 1.8 });
    cursor -= U * 1.2;
    p.drawRectangle({ x: MG, y: cursor, width: U * 4, height: 1.5, color: NARANJA });
    cursor -= U * 2.6;
  }

  function parrafo(txt, size = 10) {
    for (const l of partir(txt, reg, size, ANCHO)) {
      asegurar(3);
      p.drawText(l, { x: MG, y: cursor, size, font: reg, color: TINTA });
      cursor -= size * 1.75;
    }
    cursor -= U * 0.8;
  }

  /** Cláusula numerada: el formato que espera quien lee un contrato. */
  function clausula(n, titulo, cuerpo) {
    const lineas = partir(cuerpo, reg, 10, ANCHO - U * 1.5);
    asegurar(lineas.length * 1.75 + 5);
    p.drawText(`${n}.`, { x: MG, y: cursor, size: 11, font: bold, color: NARANJA });
    p.drawText(titulo, { x: MG + U * 2.2, y: cursor, size: 11, font: bold, color: TINTA });
    cursor -= U * 2.4;
    for (const l of lineas) {
      p.drawText(l, { x: MG + U * 2.2, y: cursor, size: 10, font: reg, color: TINTA });
      cursor -= U * 1.75;
    }
    cursor -= U * 1.4;
  }

  // ══════════════════ PORTADA ══════════════════
  const cover = nuevaPagina(NAVY);
  cover.drawRectangle({ x: 0, y: 0, width: A4[0], height: U * 24, color: NAVY_HOND });
  cover.drawRectangle({ x: 0, y: A4[1] - U * 0.75, width: A4[0] * 0.42, height: U * 0.75, color: TEAL });
  cover.drawRectangle({ x: A4[0] * 0.42, y: A4[1] - U * 0.75, width: A4[0] * 0.58, height: U * 0.75, color: NARANJA });

  if (logoBlanco) {
    const w = U * 19, h = w * (logoBlanco.height / logoBlanco.width);
    cover.drawImage(logoBlanco, { x: MG, y: A4[1] - U * 12 - h / 2, width: w, height: h });
  }

  let y = A4[1] - U * 26;
  cover.drawText('CONTRATO DE PRESTACIÓN DE SERVICIOS', { x: MG, y, size: 9, font: med, color: NARANJA, characterSpacing: 2.2 });
  y -= U * 5;
  // El nombre del cliente puede ser largo; se reduce antes que recortarlo.
  const nombreCli = String(contrato.cliente_empresa || '');
  const cuerpo = nombreCli.length > 52 ? 20 : nombreCli.length > 34 ? 24 : 28;
  for (const l of partir(nombreCli, bold, cuerpo, ANCHO)) {
    cover.drawText(l, { x: MG, y, size: cuerpo, font: bold, color: BLANCO });
    y -= cuerpo * 1.32;
  }

  y -= U * 2;
  for (const l of partir(normas.join(' · '), reg, 11.5, ANCHO).slice(0, 3)) {
    cover.drawText(l, { x: MG, y, size: 11.5, font: reg, color: rgb(0.55, 0.72, 0.78) });
    y -= U * 2.1;
  }

  // Aquí el importe NO es el reclamo: es un dato entre otros.
  const yb = U * 15;
  const datos = [
    ['Número', contrato.numero],
    ['Fecha', fecha(contrato.fecha_contrato)],
    ['Modelo', contrato.modelo + (esImpl && contrato.meses ? ` · ${contrato.meses} meses` : '')],
    ['Importe', `${fmtEur(importe)} sin impuestos`],
  ];
  datos.forEach(([k, v], i) => {
    const x = MG + (i % 2) * (ANCHO / 2);
    const yy = yb + (i < 2 ? U * 5 : 0);
    cover.drawText(k.toUpperCase(), { x, y: yy + U * 1.8, size: 7.5, font: med, color: TEAL, characterSpacing: 1.4 });
    cover.drawText(String(v), { x, y: yy, size: 13, font: bold, color: BLANCO });
  });

  cover.drawText(EM.razonSocial, { x: MG, y: U * 5.5, size: 8.5, font: med, color: rgb(0.45, 0.6, 0.68) });
  cover.drawText(`CIF ${EM.cif} · ${EM.domicilio}`, { x: MG, y: U * 3.5, size: 8, font: reg, color: rgb(0.35, 0.5, 0.58) });

  // ══════════════════ COMPARECIENTES ══════════════════
  cabecera();
  rotulo('Reunidos');
  parrafo(`En ${EM.domicilio || 'Madrid'}, a ${fecha(contrato.fecha_contrato)}.`);

  const partes = [
    ['DE UNA PARTE', EM.razonSocial, `CIF ${EM.cif}`, EM.domicilio,
     `Representada por ${EM.firmante}, en calidad de ${EM.cargo}.`, 'En adelante, la CONSULTORA.'],
    ['DE OTRA PARTE', contrato.cliente_empresa, contrato.cliente_cif ? `CIF ${contrato.cliente_cif}` : '',
     '', contrato.cliente_firmante ? `Representada por ${contrato.cliente_firmante}${contrato.cliente_cargo ? `, ${contrato.cliente_cargo}` : ''}.` : '',
     'En adelante, la ORGANIZACIÓN.'],
  ];
  for (const [rot, nombre, cif, dom, repre, alias] of partes) {
    asegurar(10);
    p.drawText(rot, { x: MG, y: cursor, size: 7.5, font: med, color: APAGADO, characterSpacing: 1.4 });
    cursor -= U * 2;
    for (const l of partir(nombre, bold, 12, ANCHO)) {
      p.drawText(l, { x: MG, y: cursor, size: 12, font: bold, color: TINTA });
      cursor -= U * 2;
    }
    for (const t of [cif, dom, repre, alias].filter(Boolean)) {
      for (const l of partir(t, reg, 9.5, ANCHO)) {
        p.drawText(l, { x: MG, y: cursor, size: 9.5, font: reg, color: APAGADO });
        cursor -= U * 1.6;
      }
    }
    cursor -= U * 1.5;
  }

  parrafo('Ambas partes se reconocen capacidad legal suficiente para contratar y obligarse, y a tal efecto');
  asegurar(4);
  p.drawText('EXPONEN', { x: MG, y: cursor, size: 10, font: bold, color: TINTA, characterSpacing: 1.5 });
  cursor -= U * 2.6;
  parrafo(`Que la ORGANIZACIÓN precisa servicios de consultoría para ${
    esImpl ? 'la implantación' : 'el mantenimiento'} de ${normas.join(', ')}, y que la CONSULTORA los presta ` +
    'profesionalmente. Que la ORGANIZACIÓN ha aceptado la propuesta que da origen a este contrato. ' +
    'Y que, en consecuencia, acuerdan las siguientes');

  // ══════════════════ CLÁUSULAS ══════════════════
  rotulo('Cláusulas', 12);

  const meses = contrato.meses;
  const CL = [
    ['Objeto',
     `${contrato.objeto}\n\nEl alcance concreto es el que consta en el Anexo I de la propuesta aceptada, que se incorpora a este contrato y forma parte de él.`],
    ['Duración',
     esImpl
       ? `El proyecto tiene una duración estimada de ${meses || '—'} meses desde su inicio efectivo. Termina cuando el objeto queda cumplido; no se prorroga tácitamente.`
       : 'La duración es de doce meses desde la fecha de firma. El compromiso de ambas partes se extiende a la '
         + 'totalidad de ese periodo.\n\nUn mes antes de la fecha de finalización, la CONSULTORA emitirá una oferta '
         + 'de renovación para el siguiente periodo anual, con el alcance y la dedicación revisados. La renovación '
         + 'requiere aceptación expresa de la ORGANIZACIÓN: no opera de forma automática ni por silencio.'],
    ['Precio',
     // El contrato fija la base. El impuesto se determina al facturar según el
     // domicilio fiscal del cliente: puede ser IVA, IGIC, IPSI, inversión del
     // sujeto pasivo (intracomunitario con VIES) u operación no sujeta.
     `${fmtEur(importe)}${contrato.tipo === 'mes' ? ' al mes' : ''}, impuestos indirectos no incluidos. ` +
     'Sobre dicho importe se repercutirán los impuestos indirectos que resulten de aplicación conforme a la ' +
     'normativa vigente y al domicilio fiscal de la ORGANIZACIÓN en la fecha de devengo.' +
     (contrato.forma_pago === 'unico'
       ? '\n\nForma de pago: un solo pago al inicio del proyecto, con el descuento por pago único ya aplicado al importe anterior.'
       : contrato.forma_pago === 'dos'
         ? '\n\nForma de pago: 50 % a la firma, para arrancar el proyecto, y 50 % antes del inicio de las auditorías.'
         : '')],
    ['Qué incluye y qué no',
     'Lo contratado son dos cosas a la vez: una dedicación y un conjunto de tareas concretas. Cumplidas las tareas y alcanzados los objetivos del periodo, el trabajo está completo y no existe obligación de consumir horas restantes. Se mantiene la asistencia técnica sin coste añadido.\n\n' +
     (esImpl ? '' :
       'Lo anterior no altera el compromiso de pago: la cuota mensual se devenga íntegra durante los doce meses de '
       + 'vigencia, con independencia de las horas efectivamente empleadas en cada periodo. La cuota retribuye la '
       + 'disponibilidad del equipo y el resultado comprometido, no un consumo de horas.\n\n') +
     'Todo encargo ajeno al alcance —nuevos sistemas, sedes adicionales, auditorías no previstas, formación específica— se presupuesta por separado antes de ejecutarse y se factura aparte. Nunca se ejecuta trabajo fuera de alcance sin presupuesto aceptado.\n\n' +
     'No incluye las tasas de la entidad de certificación ni los gastos de desplazamiento fuera de la Comunidad de Madrid.'],
    ['Obligaciones de la ORGANIZACIÓN',
     'Facilitar la información y el acceso necesarios, designar un interlocutor con capacidad de decisión, y disponer de los recursos internos para las tareas que le corresponden. El incumplimiento de estas obligaciones puede afectar al calendario sin responsabilidad para la CONSULTORA.'],
    ['Confidencialidad',
     'Ambas partes guardarán secreto de cuanta información conozcan por razón de este contrato, durante su vigencia y los cinco años siguientes a su terminación.'],
    ['Protección de datos',
     'Las partes actúan como responsables independientes del tratamiento de los datos de contacto necesarios para ejecutar el contrato. Si la prestación implicase acceso a datos personales responsabilidad de la ORGANIZACIÓN, se firmará el correspondiente encargo de tratamiento conforme al artículo 28 del Reglamento (UE) 2016/679.'],
    ['Propiedad intelectual',
     'La documentación del sistema elaborada para la ORGANIZACIÓN es de su propiedad desde su entrega. Las metodologías, plantillas y herramientas de la CONSULTORA, incluida Orbita.PMTools, siguen siendo de su titularidad y se ceden en uso mientras dure el contrato.'],
    ['Terminación',
     'Cualquiera de las partes puede resolver el contrato por incumplimiento grave de la otra, previo requerimiento escrito y un plazo de quince días para subsanar. La resolución no afecta a los trabajos ya ejecutados, que se liquidarán conforme a lo realizado.'],
    ['Ley aplicable y jurisdicción',
     'Este contrato se rige por la legislación española. Las partes se someten a los juzgados y tribunales de Madrid, con renuncia a cualquier otro fuero que pudiera corresponderles.'],
  ];
  CL.forEach(([t, cuerpo], i) => clausula(i + 1, t, cuerpo));

  if (contrato.notas) {
    rotulo('Condiciones particulares', 10);
    parrafo(String(contrato.notas));
  }

  // ══════════════════ FIRMAS ══════════════════
  asegurar(20);
  rotulo('Y en prueba de conformidad', 18);
  parrafo('Ambas partes firman este contrato por duplicado y a un solo efecto, en el lugar y la fecha indicados.');

  {
    const col = (ANCHO - U * 4) / 2;
    const yF = cursor;
    const alto = U * 12;
    const bloques = [
      ['POR LA CONSULTORA', EM.firmante, EM.cargo, `${EM.razonSocial} · CIF ${EM.cif}`, SUAVE, null],
      ['POR LA ORGANIZACIÓN', contrato.cliente_firmante || '', contrato.cliente_cargo || '',
       `${contrato.cliente_empresa}${contrato.cliente_cif ? ` · CIF ${contrato.cliente_cif}` : ''}`, BLANCO, LINEA],
    ];
    bloques.forEach(([rot, nombre, cargo, pie, fondo, borde], i) => {
      const x = MG + i * (col + U * 4);
      p.drawRectangle({ x, y: yF - alto, width: col, height: alto, color: fondo,
        ...(borde ? { borderColor: borde, borderWidth: 1 } : {}) });
      p.drawText(rot, { x: x + U * 1.5, y: yF - U * 2, size: 7, font: med, color: APAGADO, characterSpacing: 1.2 });
      for (const l of partir(nombre, bold, 11, col - U * 3).slice(0, 1)) {
        p.drawText(l, { x: x + U * 1.5, y: yF - U * 4.2, size: 11, font: bold, color: TINTA });
      }
      for (const l of partir(cargo, reg, 9, col - U * 3).slice(0, 1)) {
        p.drawText(l, { x: x + U * 1.5, y: yF - U * 5.8, size: 9, font: reg, color: APAGADO });
      }
      let yy = yF - U * 7.2;
      for (const l of partir(pie, reg, 7.5, col - U * 3).slice(0, 2)) {
        p.drawText(l, { x: x + U * 1.5, y: yy, size: 7.5, font: reg, color: APAGADO });
        yy -= U * 1.2;
      }
      p.drawLine({ start: { x: x + U * 1.5, y: yF - U * 10.4 }, end: { x: x + col - U * 1.5, y: yF - U * 10.4 }, thickness: 0.8, color: LINEA });
      p.drawText('Firma y sello', { x: x + U * 1.5, y: yF - U * 11.5, size: 7, font: reg, color: APAGADO });
    });
    cursor = yF - alto - U * 2;
  }

  // ── Pie con las tres marcas, igual que en la oferta ──
  const total = paginas.length;
  paginas.forEach((pg, i) => {
    if (i === 0) return;
    const ALTO = U * 9;
    pg.drawRectangle({ x: 0, y: 0, width: A4[0], height: ALTO, color: NAVY });
    pg.drawRectangle({ x: 0, y: ALTO - 1.5, width: A4[0] * 0.42, height: 1.5, color: TEAL });
    pg.drawRectangle({ x: A4[0] * 0.42, y: ALTO - 1.5, width: A4[0] * 0.58, height: 1.5, color: NARANJA });
    const ALTOS = { tuconsultor: U * 2.1, consultify: U * 1.9, orbita: U * 2.3 };
    const CENTRO = ALTO / 2;
    let x = MG;
    for (const n of ['tuconsultor', 'consultify', 'orbita']) {
      const img = pieLogos[n];
      if (!img) continue;
      const h = ALTOS[n], w = h * (img.width / img.height);
      pg.drawImage(img, { x, y: CENTRO - h / 2, width: w, height: h });
      x += w + U * 2;
      if (n !== 'orbita') pg.drawCircle({ x: x - U, y: CENTRO, size: 0.9, color: rgb(0.35, 0.5, 0.58) });
    }
    const legal = `${EM.razonSocial} · CIF ${EM.cif}`;
    const num = `${i + 1} / ${total}`;
    const an = med.widthOfTextAtSize(num, 7.5);
    pg.drawText(legal, { x: MG + ANCHO - an - U * 2 - reg.widthOfTextAtSize(legal, 7), y: CENTRO - 2.5, size: 7, font: reg, color: rgb(0.55, 0.68, 0.74) });
    pg.drawText(num, { x: MG + ANCHO - an, y: CENTRO - 2.5, size: 7.5, font: med, color: BLANCO });
  });

  return Buffer.from(await pdf.save());
}
