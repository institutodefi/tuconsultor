// ════════════════════════════════════════════════════════════════════════════
// LOS DATOS EFECTIVOS DE UN PROYECTO
//
// Un proyecto aparece con datos repartidos en cuatro tablas:
//
//   proyectos_cliente  nombre, estado, fechas… y una COPIA de normas y modelo
//   clientes           la ficha operativa de la que cuelga (razón social)
//   empresas           el CRM, donde está el nombre comercial
//   presupuestos       la oferta de la que nace: el alcance y el modelo pactados
//
// Eso producía dos problemas visibles en la cartera:
//   · se enseñaba la razón social de `clientes` en vez del nombre comercial
//   · normas y modelo salían vacíos, porque la copia del proyecto nunca se
//     rellenó en los creados antes de que el alta partiera de una oferta
//
// Aquí se resuelve en un solo sitio, con una regla clara: **la oferta manda**.
// La copia del proyecto solo se usa si no hay oferta, o si alguien la ajustó a
// mano después —y en ese caso se avisa del desfase en vez de elegir en
// silencio—.
// ════════════════════════════════════════════════════════════════════════════

import { normalizarCif, nombreVisible } from './crm.js';

const norm = (s) => String(s || '')
  .toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[.,]/g, ' ')
  .replace(/\b(S\s*L\s*U?|S\s*A\s*U?|SLU|SAU|SL|SA)\b/g, ' ')
  .replace(/\s+/g, ' ').trim();

const mismasNormas = (a = [], b = []) => {
  const x = [...a].map(String).sort().join('|');
  const y = [...b].map(String).sort().join('|');
  return x === y;
};

/**
 * Datos efectivos de un proyecto, con la procedencia de cada uno.
 *
 * @param {object} proyecto  fila de `proyectos_cliente`
 * @param {object} ctx
 * @param {object[]} ctx.clientes
 * @param {object[]} ctx.empresas
 * @param {object[]} ctx.presupuestos
 * @param {object[]} [ctx.contratos]
 */
export function resolverProyecto(proyecto, { clientes = [], empresas = [], presupuestos = [], contratos = [] } = {}) {
  if (!proyecto) return null;

  const cliente = clientes.find((c) => String(c.id) === String(proyecto.cliente_id)) || null;

  // La empresa del CRM: por CIF y, si no hay, por razón social normalizada.
  // El CIF puede venir con guiones o en minúsculas de una importación antigua.
  const cif = normalizarCif(cliente?.cif);
  const empresa = (cif && empresas.find((e) => normalizarCif(e.cif) === cif))
    || (cliente?.empresa && empresas.find((e) => norm(e.nombre) === norm(cliente.empresa)
      || norm(e.nombre_comercial) === norm(cliente.empresa)))
    || null;

  // La oferta: primero por vínculo directo, luego a través del contrato.
  let oferta = presupuestos.find((o) => String(o.id) === String(proyecto.oferta_id)) || null;
  if (!oferta && proyecto.contrato_id) {
    const ct = contratos.find((c) => String(c.id) === String(proyecto.contrato_id));
    if (ct) oferta = presupuestos.find((o) => String(o.id) === String(ct.presupuesto_id)) || null;
  }

  // ── Normas y modelo: manda la oferta ──
  const normasProy = (proyecto.normas || []).map(String);
  const normasOferta = (oferta?.normas || []).map(String);
  const normas = normasOferta.length ? normasOferta : normasProy;
  const modelo = oferta?.modelo || proyecto.modelo || null;

  // Desfase: el proyecto tiene copia propia y NO coincide con la oferta. No se
  // corrige solo: puede ser un ajuste deliberado —se amplió el alcance sin
  // reemitir— y sobreescribirlo borraría esa decisión.
  const desfases = [];
  if (oferta && normasProy.length && normasOferta.length && !mismasNormas(normasProy, normasOferta)) {
    desfases.push({ campo: 'normas', enProyecto: normasProy.join(' + '), enOferta: normasOferta.join(' + ') });
  }
  if (oferta && proyecto.modelo && oferta.modelo && proyecto.modelo !== oferta.modelo) {
    desfases.push({ campo: 'modelo', enProyecto: proyecto.modelo, enOferta: oferta.modelo });
  }

  return {
    ...proyecto,
    // Nombre comercial de la empresa; si no lo hay, la razón social de la ficha
    // operativa, que es lo único que quedaba antes.
    cliente,
    empresa,
    nombreCliente: empresa ? nombreVisible(empresa) : (cliente?.empresa || '—'),
    razonSocial: empresa?.nombre || cliente?.empresa || null,
    cif: empresa?.cif || cliente?.cif || null,

    oferta,
    numeroOferta: oferta?.numero_oferta || null,
    normas,
    modelo,
    // De dónde salen, para poder decirlo en pantalla.
    origenAlcance: normasOferta.length ? 'oferta' : (normasProy.length ? 'proyecto' : 'ninguno'),
    desfases,
    sinOferta: !oferta,
  };
}

/** Resuelve una lista entera. */
export const resolverProyectos = (proyectos = [], ctx = {}) =>
  proyectos.map((p) => resolverProyecto(p, ctx)).filter(Boolean);
