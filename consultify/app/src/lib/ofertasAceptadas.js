// ════════════════════════════════════════════════════════════════════════════
// QUÉ OFERTAS PUEDEN CONVERTIRSE EN PROYECTO
//
// Regla: un proyecto SOLO nace de una oferta aceptada. No es burocracia, es lo
// que permite responder a «¿por qué estamos haciendo este trabajo y a qué
// precio?» sin depender de que alguien se acuerde.
//
// Antes se podía abrir un proyecto desde cero eligiendo empresa y tecleando las
// normas a mano. Eso producía proyectos sin precio, sin alcance pactado y sin
// nada que enseñar si el cliente discutía qué se había contratado.
// ════════════════════════════════════════════════════════════════════════════

import { normalizarCif } from './crm.js';

/** Una oferta está aceptada si lo dice su estado o si ya tiene contrato firmado. */
export function estaAceptada(oferta, contratos = []) {
  if ((oferta?.estado || '') === 'aceptada') return true;
  // Con contrato firmado, el estado de la oferta es lo de menos: se firmó.
  return contratos.some((c) => String(c.presupuesto_id) === String(oferta?.id)
    && c.estado === 'firmado');
}

/**
 * Ofertas aceptadas que todavía no tienen proyecto.
 *
 * Una oferta con proyecto ya abierto no se ofrece: duplicarlo generaría dos
 * proyectos cobrando lo mismo, y nadie sabría cuál es el bueno.
 *
 * @param {object} p
 * @param {object[]} p.presupuestos
 * @param {object[]} p.contratos
 * @param {object[]} p.proyectos     de `proyectos_cliente`
 * @param {string}  [p.cif]          para acotar a una empresa concreta
 */
export function ofertasParaProyecto({ presupuestos = [], contratos = [], proyectos = [], cif = null } = {}) {
  const conProyecto = new Set(proyectos.map((p) => String(p.oferta_id || '')));
  const contratosConProyecto = new Set(proyectos.map((p) => String(p.contrato_id || '')));
  const c = cif ? normalizarCif(cif) : null;

  return presupuestos
    .filter((o) => estaAceptada(o, contratos))
    .filter((o) => !conProyecto.has(String(o.id)))
    // Tampoco si el proyecto se abrió desde su contrato: es el mismo trabajo.
    .filter((o) => {
      const ct = contratos.find((x) => String(x.presupuesto_id) === String(o.id) && x.estado !== 'anulado');
      return !ct || !contratosConProyecto.has(String(ct.id));
    })
    .filter((o) => !c || normalizarCif(o.cif) === c)
    .sort((a, b) => String(b.aceptada_en || b.creado || '').localeCompare(String(a.aceptada_en || a.creado || '')));
}

/** El contrato de una oferta, si lo tiene y no está anulado. */
export const contratoDe = (oferta, contratos = []) =>
  contratos.find((c) => String(c.presupuesto_id) === String(oferta?.id) && c.estado !== 'anulado') || null;

/**
 * Todo lo que una oferta aporta al proyecto que nace de ella.
 * Las normas y el modelo se vuelcan tal cual: son lo que se pactó, y volver a
 * elegirlos a mano es la forma de que acaben sin coincidir con lo ofertado.
 */
export function datosDeOferta(oferta, contratos = []) {
  if (!oferta) return null;
  const ct = contratoDe(oferta, contratos);
  const normas = oferta.normas || [];
  return {
    oferta_id: oferta.id,
    contrato_id: ct?.id || null,
    normas,
    modelo: oferta.modelo || null,
    // El nombre por el que se busca después: normas + modelo.
    nombre: [normas.join(' + ') || 'Proyecto', oferta.modelo].filter(Boolean).join(' · '),
    fecha_inicio: oferta.fecha_inicio || null,
    fecha_fin: oferta.fecha_fin || null,
    fecha_certificacion: oferta.fecha_certificacion || null,
    meses_estimados: oferta.meses || null,
    precio_mes: oferta.tipo === 'mes' ? oferta.precio : null,
    precio_total: oferta.tipo !== 'mes' ? oferta.precio : null,
    cif: oferta.cif || null,
    empresa: oferta.empresa || null,
  };
}

/** Etiqueta de una oferta en un desplegable. */
export function etiquetaOferta(oferta, contratos = []) {
  const ct = contratoDe(oferta, contratos);
  const eur = (n) => Number(n || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  return [
    oferta.numero_oferta || 'sin número',
    oferta.empresa,
    (oferta.normas || []).join(' + ') || 'sin normas',
    oferta.modelo,
    `${eur(oferta.precio)}${oferta.tipo === 'mes' ? '/mes' : ''}`,
    ct?.estado === 'firmado' ? `contrato ${ct.numero}` : null,
  ].filter(Boolean).join(' · ');
}
