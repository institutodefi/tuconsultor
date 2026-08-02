import { useMemo } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// EMBUDO DE OFERTAS
//
// Cuatro cifras que son las cuatro etapas por las que pasa una propuesta. Al
// pulsar una, la lista de abajo se filtra: el panel y el listado son la misma
// pantalla, no dos sitios distintos.
//
// «Contrato» no es un estado de la oferta: es que ya existe un contrato colgando
// de ella. Se cuenta aparte porque es la etapa que de verdad interesa mirar.
// ════════════════════════════════════════════════════════════════════════════

export const ETAPAS = [
  { k: 'proceso',  etq: 'En proceso',  desc: 'Borradores sin emitir',        color: 'text-[#9FC0CB]',        anillo: 'ring-[#3F7D93]' },
  { k: 'emitida',  etq: 'Emitidas',    desc: 'Esperando respuesta',          color: 'text-brand-orange',     anillo: 'ring-brand-orange' },
  { k: 'aceptada', etq: 'Aceptadas',   desc: 'Sin contrato todavía',         color: 'text-brand-verdeTexto', anillo: 'ring-brand-verde' },
  { k: 'contrato', etq: 'Con contrato', desc: 'Cerradas y formalizadas',     color: 'text-emerald-300',      anillo: 'ring-emerald-400' },
  { k: 'perdida',  etq: 'Rechazadas',  desc: 'Rechazadas o caducadas',       color: 'text-red-300',          anillo: 'ring-red-400' },
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

export default function EstadosOferta({ ofertas = [], contratos = [], filtro, setFiltro }) {
  const cuentas = useMemo(() => {
    const c = Object.fromEntries(ETAPAS.map((e) => [e.k, 0]));
    for (const o of ofertas) c[etapaDe(o, contratos)] += 1;
    return c;
  }, [ofertas, contratos]);

  return (
    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {ETAPAS.map((e) => {
        const activo = filtro === e.k;
        return (
          <button key={e.k} onClick={() => setFiltro(activo ? null : e.k)}
            className={`rounded-xl border border-[#1E5468] bg-[#0D3242] px-4 py-3 text-left transition hover:border-brand-orange ${
              activo ? `ring-1 ${e.anillo}` : ''}`}>
            <span className={`block text-2xl font-extrabold leading-none ${e.color}`}>{cuentas[e.k]}</span>
            <span className="mt-1 block text-[10.5px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{e.etq}</span>
            <span className="mt-0.5 block text-[10.5px] leading-tight text-[#5E8494]">{e.desc}</span>
          </button>
        );
      })}
    </div>
  );
}
