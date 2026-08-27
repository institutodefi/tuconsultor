// ═══════════════════════════════════════════════════════════════════════════
// Cartera de una empresa · ofertas, contratos y proyectos
// ---------------------------------------------------------------------------
// El CRM tiene la información repartida en cuatro tablas que no se conocen
// entre sí:
//
//   empresas          ficha del CRM (la que se está viendo)
//   presupuestos      ofertas emitidas          → cruza por `cif`
//   contratos         contratos                 → cruza por `cliente_cif`
//   clientes          alta operativa del cliente→ cruza por `cif`
//   proyectos_cliente proyectos                 → cuelga de `clientes.id`
//
// Sobre la tabla de proyectos: existen dos, `proyectos` y `proyectos_cliente`.
// La operativa —la que tiene pantalla en el portal, tareas colgando y de la que
// lee el panel de proyectos— es `proyectos_cliente`. `proyectos` no está
// montada en ninguna ruta. Se usa la primera, que además permite enlazar a una
// pantalla que existe de verdad.
//
// La única llave común es el CIF. Por eso se normaliza antes de comparar: en la
// práctica el mismo CIF aparece como «B-84867670», «b84867670» y «B84867670 »,
// y sin normalizar la ficha sale vacía aunque haya cinco ofertas emitidas.
//
// Como respaldo, cuando una oferta no trae CIF se compara por nombre de empresa
// normalizado. Es menos fiable, así que esas coincidencias se marcan para poder
// distinguirlas en la interfaz.
// ═══════════════════════════════════════════════════════════════════════════

import { normalizarCif } from './crm.js';
import { semaforo as semaforoProyecto, necesitaRenovacion } from './proyectos.js';
import { etapaDe, GANADAS, PERDIDAS } from './ofertas.js';

/** Normaliza un nombre de empresa para comparar: sin forma jurídica ni ruido. */
export function normalizarNombre(s) {
  return String(s || '')
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,]/g, ' ')
    .replace(/\b(S\s*L\s*U?|S\s*A\s*U?|SOCIEDAD LIMITADA|SOCIEDAD ANONIMA|SLU|SAU|SL|SA)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const coincide = (empresa, cif, nombre) => {
  const c = normalizarCif(cif);
  if (c && normalizarCif(empresa.cif) && c === normalizarCif(empresa.cif)) return 'cif';
  const n = normalizarNombre(nombre);
  if (n && n === normalizarNombre(empresa.nombre)) return 'nombre';
  if (n && empresa.nombre_comercial && n === normalizarNombre(empresa.nombre_comercial)) return 'nombre';
  return null;
};

const desc = (a, b) => String(b || '').localeCompare(String(a || ''));

/**
 * Cruza las cuatro tablas para una empresa.
 * @returns {{ofertas, contratos, proyectos, resumen}}
 */
export function carteraDe(empresa, { presupuestos = [], contratos = [], clientes = [], proyectos = [] } = {}) {
  if (!empresa) return { ofertas: [], contratos: [], proyectos: [], resumen: vacio() };

  const ofertas = presupuestos
    .map((o) => ({ ...o, _match: coincide(empresa, o.cif, o.empresa) }))
    .filter((o) => o._match)
    .sort((a, b) => desc(a.fecha_emision || a.creado, b.fecha_emision || b.creado));

  const cts = contratos
    .map((c) => ({ ...c, _match: coincide(empresa, c.cliente_cif, c.cliente_empresa) }))
    .filter((c) => c._match)
    .sort((a, b) => desc(a.fecha_contrato, b.fecha_contrato));

  // Los proyectos cuelgan de `clientes`, no de `empresas`: primero hay que
  // localizar las fichas de cliente que corresponden a esta empresa.
  const idsCliente = new Set(
    clientes.filter((c) => coincide(empresa, c.cif, c.empresa)).map((c) => String(c.id)),
  );
  const prj = proyectos
    .filter((p) => idsCliente.has(String(p.cliente_id)))
    .map((p) => ({ ...p, sem: semaforoProyecto(p) }))
    .sort((a, b) => a.sem.orden - b.sem.orden
      || String(a.fecha_fin || '9999').localeCompare(String(b.fecha_fin || '9999')));

  return { ofertas, contratos: cts, proyectos: prj, resumen: resumir(ofertas, cts, prj) };
}

const vacio = () => ({
  ofertas: 0, ofertasAbiertas: 0, contratos: 0, contratosFirmados: 0,
  proyectos: 0, proyectosActivos: 0, renovaciones: 0, alerta: null,
  facturacionAnual: 0, ultimaActividad: null,
});

// `proyectos_cliente` usa activo | pausado | cerrado; `proyectos` añade
// 'implantación'. Se aceptan los dos vocabularios.
const ESTADOS_ACTIVOS = ['implantación', 'activo'];

function resumir(ofertas, contratos, proyectos) {
  const idsContratados = new Set(contratos.map((c) => c.presupuesto_id));
  const firmados = contratos.filter((c) => c.estado === 'firmado');
  const activos = proyectos.filter((p) => ESTADOS_ACTIVOS.includes(p.estado));

  // Una oferta sigue «abierta» si no ha derivado en contrato y no está anulada.
  const abiertas = ofertas.filter((o) => !idsContratados.has(o.id) && o.estado !== 'anulada');

  // Ingreso anual comprometido, solo de lo vivo. Los recurrentes van a doce
  // meses; los proyectos cerrados no cuentan.
  const facturacionAnual = activos.reduce((a, p) => {
    if (p.precio_mes) return a + Number(p.precio_mes) * 12;
    if (p.precio_total) return a + Number(p.precio_total);
    return a;
  }, 0);

  const renovaciones = activos.filter(necesitaRenovacion).length;

  // ── Ofertas ganadas y perdidas ──
  // Misma clasificación que el embudo de la pantalla de Ofertas, para que las
  // cifras cuadren entre las dos vistas. Una oferta con contrato cuenta como
  // aceptada aunque su campo `estado` no se haya llegado a tocar: lo que manda
  // es que se firmó.
  const etapas = ofertas.map((o) => etapaDe(o, contratos));
  const aceptadas = etapas.filter((e) => GANADAS.includes(e)).length;
  const rechazadas = etapas.filter((e) => PERDIDAS.includes(e)).length;
  // La tasa se calcula solo sobre lo resuelto: contar como pérdidas las que
  // siguen esperando respuesta hundiría el porcentaje sin motivo.
  const resueltas = aceptadas + rechazadas;
  const tasaAceptacion = resueltas ? Math.round((aceptadas / resueltas) * 100) : null;

  // ── Proyectos por estado ──
  // «Pendiente» no es un estado de la tabla: es un contrato firmado que aún no
  // tiene proyecto abierto. Es el hueco que hay que vigilar, porque ahí hay
  // trabajo vendido que nadie ha arrancado.
  const idsConProyecto = new Set(proyectos.map((p) => String(p.contrato_id || '')));
  const pendientes = firmados.filter((c) => !idsConProyecto.has(String(c.id)));
  const proyPendientes = pendientes.length;
  const proyCerrados = proyectos.filter((p) => p.estado === 'cerrado').length;
  const proyPausados = proyectos.filter((p) => p.estado === 'pausado').length;

  // Lo que hay que mirar primero. Se elige UNA sola cosa a propósito: una lista
  // de cinco avisos no se lee, y el más urgente se pierde entre los demás.
  let alerta = null;
  const vencido = activos.find((p) => p.sem.nivel === 'vencido');
  const rojo = activos.find((p) => p.sem.nivel === 'rojo');
  const ambar = activos.find((p) => p.sem.nivel === 'amarillo');
  if (vencido) alerta = { nivel: 'rojo', texto: `Contrato vencido hace ${Math.abs(vencido.sem.dias)} días` };
  else if (rojo) alerta = { nivel: 'rojo', texto: `Contrato vence en ${rojo.sem.dias} días · renovación pendiente` };
  else if (ambar) alerta = { nivel: 'ambar', texto: `Contrato vence en ${ambar.sem.dias} días · prepara la renovación` };
  else if (proyPendientes) alerta = { nivel: 'ambar', texto: `${proyPendientes} contrato${proyPendientes > 1 ? 's' : ''} firmado${proyPendientes > 1 ? 's' : ''} sin proyecto abierto` };
  else if (abiertas.length) alerta = { nivel: 'ambar', texto: `${abiertas.length} oferta${abiertas.length > 1 ? 's' : ''} sin cerrar` };
  else if (!activos.length && contratos.length) alerta = { nivel: 'gris', texto: 'Sin proyectos activos' };

  const fechas = [
    ...ofertas.map((o) => o.fecha_emision || o.creado),
    ...contratos.map((c) => c.fecha_contrato),
  ].filter(Boolean).sort();

  return {
    ofertas: ofertas.length, ofertasAbiertas: abiertas.length,
    contratos: contratos.length, contratosFirmados: firmados.length,
    proyectos: proyectos.length, proyectosActivos: activos.length,
    renovaciones, alerta, facturacionAnual,
    ultimaActividad: fechas.length ? fechas[fechas.length - 1] : null,
    aceptadas, rechazadas, tasaAceptacion,
    proyPendientes, proyCerrados, proyPausados,
    contratosSinProyecto: pendientes,   // para poder ofrecer el alta directa
  };
}

/** Resumen de una línea para el encabezado plegado de la caja. */
export function resumenCartera(r) {
  const p = [];
  if (r.ofertas) p.push(`${r.ofertas} oferta${r.ofertas > 1 ? 's' : ''}`);
  if (r.contratos) p.push(`${r.contratos} contrato${r.contratos > 1 ? 's' : ''}`);
  if (r.proyectosActivos) p.push(`${r.proyectosActivos} activo${r.proyectosActivos > 1 ? 's' : ''}`);
  return p.length ? p.join(' · ') : 'sin actividad';
}

export const fmtEur = (n) =>
  Number(n || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export const fmtFecha = (f) => {
  if (!f) return '—';
  const d = new Date(String(f).length <= 10 ? `${f}T12:00:00` : f);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-ES');
};
