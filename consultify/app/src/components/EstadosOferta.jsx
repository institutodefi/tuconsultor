import { useMemo } from 'react';
import { ETAPAS, etapaDe } from '../lib/ofertas.js';

// La clasificación vive en `lib/ofertas.js` para que también pueda usarla la
// ficha de empresa. Se reexporta para no romper lo que ya importaba de aquí.
export { ETAPAS, etapaDe };

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
