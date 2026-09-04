// ════════════════════════════════════════════════════════════════════════════
// Embudo de ofertas · clasificación
//
// Vivía dentro de `components/EstadosOferta.jsx`. Se saca aquí porque también
// lo necesita `lib/cartera.js` para contar aceptadas y rechazadas en la ficha
// de empresa, y un módulo de lógica no debería tener que importar un componente
// de React para clasificar una fila.
//
// Que las dos vistas usen esta misma función es lo que hace que las cifras del
// embudo y las de la ficha de empresa cuadren entre sí.
// ════════════════════════════════════════════════════════════════════════════

export const ETAPAS = [
  { k: 'proceso',  etq: 'En proceso',   desc: 'Borradores sin emitir',    color: 'text-[#9FC0CB]',        anillo: 'ring-[#3F7D93]' },
  { k: 'emitida',  etq: 'Emitidas',     desc: 'Esperando respuesta',      color: 'text-brand-orange',     anillo: 'ring-brand-orange' },
  { k: 'aceptada', etq: 'Aceptadas',    desc: 'Sin contrato todavía',     color: 'text-brand-verdeTexto', anillo: 'ring-brand-verde' },
  { k: 'contrato', etq: 'Con contrato', desc: 'Cerradas y formalizadas',  color: 'text-emerald-300',      anillo: 'ring-emerald-400' },
  { k: 'perdida',  etq: 'Rechazadas',   desc: 'Rechazadas o caducadas',   color: 'text-red-300',          anillo: 'ring-red-400' },
];

/** En qué etapa está una oferta. `contratos` es el listado completo. */
export function etapaDe(oferta, contratos = []) {
  const tieneContrato = contratos.some(
    (c) => String(c.presupuesto_id) === String(oferta.id) && c.estado !== 'anulado',
  );
  if (tieneContrato) return 'contrato';
  const e = oferta.estado || 'emitida';
  if (e === 'borrador') return 'proceso';
  if (e === 'aceptada') return 'aceptada';
  if (e === 'rechazada' || e === 'caducada') return 'perdida';
  return 'emitida';
}

/** Etapas que cuentan como ganadas y como perdidas. */
export const GANADAS = ['aceptada', 'contrato'];
export const PERDIDAS = ['perdida'];
