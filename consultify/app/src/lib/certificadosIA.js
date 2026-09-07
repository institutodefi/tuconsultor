// ════════════════════════════════════════════════════════════════════════════
// CERTIFICADOS LEÍDOS POR LA IA · de la nota del documento a la fila del
// certificado
//
// El lector de documentos (netlify/functions/documentos.mjs, acción
// `analizar`) devuelve un JSON con norma, emisor, número, alcance y fechas
// tal como aparecen en el PDF. Aquí se convierte en una propuesta de
// certificado (cliente_certificados) que el equipo revisa y guarda: la IA
// propone, la persona confirma.
//
// Funciones puras: se prueban desde Node (scripts/test-certificados-ia.mjs).
// ════════════════════════════════════════════════════════════════════════════

const S = (v) => String(v ?? '').trim();

// Textos que suelen salir en un certificado → id de norma del catálogo.
const NORMAS_ID = ['9001', '14001', '45001', '27001', '27701', '42001', '56001', '21001', '9004', '93200', '158101', '66181'];
const UNE = { 93200: 'une93200', 158101: 'une158101', 66181: 'une66181' };

/** «ISO 9001:2015», «UNE-EN ISO 14001», «ISO/IEC 27001» → «9001», «14001», «27001». */
export function normaIdDesdeTexto(texto) {
  const t = S(texto).toUpperCase().replace(/\s+/g, ' ');
  if (!t) return null;
  if (/\bENS\b|ESQUEMA NACIONAL/.test(t)) return 'ENS';
  if (/EFQM/.test(t)) return 'EFQM';
  if (/IGUALDAD/.test(t)) return 'igualdad';
  if (/MADRID EXCELENTE/.test(t)) return 'madridexcelente';
  for (const id of NORMAS_ID) {
    if (new RegExp(`(^|[^0-9])${id}([^0-9]|$)`).test(t)) return UNE[id] || id;
  }
  return t.replace(/\s*:\s*\d{4}$/, '');   // «ISO 22000» u otra: se deja tal cual, sin el año
}

/** Fecha «AAAA-MM-DD» a partir de lo que devuelva el lector (o de un texto). */
export function fechaISO(v) {
  const t = S(v);
  if (!t) return null;
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

/** Documentos que probablemente sean certificados: por tipo o por nombre. */
export const pareceCertificado = (d) => {
  const t = `${S(d?.tipo)} ${S(d?.titulo)} ${S(d?.nombre_fichero)} ${S(d?.descripcion)}`.toUpperCase();
  return S(d?.tipo).toLowerCase() === 'certificado' || /CERTIF|ISO ?\d{4,5}|AENOR|BUREAU|SGS|LLOYD|APPLUS|OCA|DNV|TÜV|TUV|INTERTEK|ENS\b/.test(t);
};

/**
 * Propuesta de certificado a partir de la nota de la IA de un documento.
 * @param doc    fila de cliente_documentos
 * @param datos  el JSON del lector (documento_notas.datos)
 * @returns null si la nota no trae ni norma ni fechas (no es un certificado)
 */
export function propuestaDesdeNota(doc, datos) {
  const d = datos || {};
  const norma = normaIdDesdeTexto(d.norma);
  const fc = fechaISO(d.valido_desde), fv = fechaISO(d.valido_hasta);
  const tipo = S(d.tipo).toLowerCase();
  if (!norma && !fc && !fv) return null;
  if (tipo && !['certificado', 'auditoria', 'otro', ''].includes(tipo) && !norma) return null;
  const avisos = Array.isArray(d.avisos) ? d.avisos.map(S).filter(Boolean) : [];
  if (!norma) avisos.unshift('No se ha reconocido la norma: indícala.');
  if (!fv) avisos.unshift('Sin fecha de validez en el documento.');
  return {
    cliente_id: doc?.cliente_id || null,
    proyecto_id: doc?.proyecto_id || null,
    documento_id: doc?.id || null,
    norma: norma || '',
    entidad: S(d.emisor) || '',
    numero: S(d.numero) || '',
    alcance: S(d.alcance) || '',
    fecha_certificacion: fc || '',
    fecha_validez: fv || '',
    confianza: ['alta', 'media', 'baja'].includes(S(d.confianza)) ? S(d.confianza) : 'media',
    avisos,
    razon_social: S(d.razon_social) || null,
    cif: S(d.cif) || null,
  };
}

/**
 * ¿Ya existe ese certificado? Por documento enlazado, o por cliente + norma.
 * Devuelve la fila existente (para actualizar) o null (para crear).
 */
export function certificadoExistente(propuesta, certificados = []) {
  const porDoc = certificados.find((c) => propuesta.documento_id && S(c.documento_id) === S(propuesta.documento_id));
  if (porDoc) return porDoc;
  return certificados.find((c) => S(c.cliente_id) === S(propuesta.cliente_id) && propuesta.norma && S(c.norma) === S(propuesta.norma)) || null;
}

/** Lo que se escribe en cliente_certificados a partir de la propuesta revisada. */
export function filaCertificado(p) {
  return {
    cliente_id: p.cliente_id, proyecto_id: p.proyecto_id || null,
    norma: S(p.norma), entidad: S(p.entidad) || null, numero: S(p.numero) || null, alcance: S(p.alcance) || null,
    fecha_certificacion: p.fecha_certificacion || null, fecha_validez: p.fecha_validez || null,
    documento_id: p.documento_id || null,
    notas: p.confianza ? `Leído por IA (confianza ${p.confianza}) y revisado.` : null,
  };
}

/** Errores que impiden guardar una propuesta. */
export function validarPropuesta(p) {
  const e = [];
  if (!S(p.norma)) e.push('norma');
  if (!p.cliente_id) e.push('cliente');
  if (p.fecha_certificacion && p.fecha_validez && p.fecha_validez < p.fecha_certificacion) e.push('la validez es anterior a la certificación');
  return e;
}

// ── Propuestas de empresa y sedes a partir de todos los documentos ──────────

const limpio = (v) => S(v).replace(/\s+/g, ' ');
const clave = (v) => limpio(v).toLowerCase().replace(/[.,;:]/g, '');

/** Una sede (objeto o texto suelto) → fila normalizada. */
export function sedeDesde(x, doc = null) {
  if (!x) return null;
  const o = typeof x === 'string' ? { direccion: x } : x;
  const direccion = limpio(o.direccion || o.calle || '');
  const poblacion = limpio(o.poblacion || o.localidad || o.ciudad || '');
  if (!direccion && !poblacion && !limpio(o.nombre)) return null;
  return {
    nombre: limpio(o.nombre) || null, direccion: direccion || null, cp: limpio(o.cp) || null,
    poblacion: poblacion || null, provincia: limpio(o.provincia) || null, pais: limpio(o.pais) || null,
    actividad: limpio(o.actividad) || null, documento_id: doc?.id || null, origen: 'ia',
  };
}
const claveSede = (s) => clave(`${s.direccion || ''} ${s.poblacion || ''}` || s.nombre || '');

/**
 * Junta lo leído en todos los documentos de un cliente:
 *   empresa   · campos con su valor más repetido (o el de mayor confianza)
 *   sedes     · sin duplicados, marcando las que ya existen
 *   certificados · una propuesta por documento que sea certificado
 *
 * @param lecturas  [{documento, datos, confianza}] (respuesta de `proponer`)
 * @param actual    { cliente, sedes, certificados } lo que ya hay guardado
 */
export function propuestasDesdeLecturas(lecturas = [], actual = {}) {
  const peso = { alta: 3, media: 2, baja: 1 };
  const votos = {};   // campo → { valor: {peso, fuentes[]} }
  const votar = (campo, valor, conf, doc) => {
    const v = limpio(valor); if (!v) return;
    const k = clave(v);
    votos[campo] = votos[campo] || {};
    const w = peso[conf] || 1;
    // Misma clave ("Industrias Norte, S.L." e "INDUSTRIAS NORTE SL") suman votos;
    // la grafía que se enseña es la del documento de más confianza.
    votos[campo][k] = votos[campo][k] || { valor: v, peso: 0, mejorPeso: 0, fuentes: [] };
    const e = votos[campo][k];
    if (w > e.mejorPeso) { e.valor = v; e.mejorPeso = w; }
    e.peso += w; e.fuentes.push(doc?.titulo || '');
  };
  const sedes = [];
  const certificados = [];
  for (const l of lecturas) {
    const d = l?.datos; if (!d) continue;
    const conf = l.confianza || d.confianza || 'media';
    const doc = l.documento;
    votar('empresa', d.razon_social, conf, doc);
    votar('cif', d.cif, conf, doc);
    votar('actividad', d.actividad, conf, doc);
    votar('representante', d.representante, conf, doc);
    votar('telefono', d.telefono, conf, doc); votar('email', d.email, conf, doc); votar('web', d.web, conf, doc);
    if (d.empleados != null && Number(d.empleados) > 0) votar('empleados', String(Math.round(Number(d.empleados))), conf, doc);
    const dom = d.domicilio && typeof d.domicilio === 'object' ? d.domicilio : (typeof d.domicilio === 'string' ? { direccion: d.domicilio } : null);
    if (dom) { votar('direccion', dom.direccion, conf, doc); votar('cp', dom.cp, conf, doc); votar('poblacion', dom.poblacion, conf, doc); votar('provincia', dom.provincia, conf, doc); votar('pais', dom.pais, conf, doc); }
    for (const x of Array.isArray(d.sedes) ? d.sedes : []) {
      const sd = sedeDesde(x, doc); if (!sd) continue;
      const k = claveSede(sd);
      if (!k || sedes.some((y) => claveSede(y) === k)) continue;
      sedes.push({ ...sd, yaExiste: (actual.sedes || []).some((y) => claveSede(y) === k), fuente: doc?.titulo || '' });
    }
    const cert = propuestaDesdeNota({ id: doc?.id, cliente_id: actual.cliente?.id || null }, d);
    if (cert && (cert.norma || cert.fecha_validez)) certificados.push({ ...cert, fuente: doc?.titulo || '', existente: certificadoExistente(cert, actual.certificados || []) });
  }
  const empresa = {};
  for (const [campo, m] of Object.entries(votos)) {
    const mejor = Object.values(m).sort((a, b) => b.peso - a.peso)[0];
    const actualV = limpio(actual.cliente?.[campo]);
    empresa[campo] = { valor: mejor.valor, fuentes: [...new Set(mejor.fuentes)], actual: actualV || null, cambia: clave(actualV) !== clave(mejor.valor), peso: mejor.peso };
  }
  return { empresa, sedes, certificados };
}
