import { useMemo, useState } from 'react';
import { FASES, calcularFases, TARIFA_PROYECTO } from '../lib/fases.js';

// ════════════════════════════════════════════════════════════════════════════
// CÁLCULO POR FASES · Planes de Igualdad y Diversidad
//
// Estos planes no se cobran por cuota mensual como los sistemas ISO: son
// proyectos con tarifa plana de 99 €/h y fases contratables por separado.
// Por eso van en su propio bloque y no mezclados en el precio de los sistemas.
//
// La regla de integración se aplica sola cuando están los dos planes: descuenta
// las horas comunes según lo compartible que es cada fase de verdad.
// ════════════════════════════════════════════════════════════════════════════

const PLAN_LABEL = {
  igualdad: 'Plan de Igualdad',
  'igualdad-seg': 'Plan de Igualdad con seguimiento',
  diversidad: 'Plan de Diversidad',
  'diversidad-seg': 'Plan de Diversidad con seguimiento',
};

const eur = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function FasesPlanes({ planes, onTotal }) {
  const activos = planes.filter((p) => FASES[p]);
  const [sel, setSel] = useState({});
  const [abierta, setAbierta] = useState(null);

  // Por defecto van todas las fases de cada plan seleccionado.
  const seleccion = useMemo(() => {
    const s = {};
    for (const p of activos) s[p] = sel[p] || FASES[p].map((f) => f.id);
    return s;
  }, [activos, sel]);

  const res = useMemo(() => {
    if (!activos.length) return null;
    const r = calcularFases(activos, seleccion);
    onTotal && onTotal(r);
    return r;
  }, [activos, seleccion]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!activos.length) return null;

  const alternar = (plan, id) => setSel((s) => {
    const actual = s[plan] || FASES[plan].map((f) => f.id);
    return { ...s, [plan]: actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id] };
  });
  const todas = (plan, si) => setSel((s) => ({ ...s, [plan]: si ? FASES[plan].map((f) => f.id) : [] }));

  return (
    <div className="rounded-2xl border-[1.5px] border-[#1E5468] bg-[#0D3242] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-extrabold uppercase tracking-wide text-brand-orange">Cálculo por fases</h3>
        <p className="text-[11.5px] text-[#9FC0CB]">Tarifa de proyecto: {TARIFA_PROYECTO} €/h · fases contratables por separado</p>
      </div>

      {activos.map((plan) => {
        const ids = seleccion[plan];
        const horasPlan = FASES[plan].filter((f) => ids.includes(f.id)).reduce((a, f) => a + f.horas, 0);
        return (
          <section key={plan} className="mt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-bold text-[#EAF4F7]">{PLAN_LABEL[plan]}</p>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-[#9FC0CB]">{horasPlan} h · {eur(horasPlan * TARIFA_PROYECTO)}</span>
                <button onClick={() => todas(plan, true)} className="text-brand-verdeTexto hover:underline">todas</button>
                <span className="text-[#1E5468]">|</span>
                <button onClick={() => todas(plan, false)} className="text-[#7FA7B4] hover:underline">ninguna</button>
              </div>
            </div>

            <div className="mt-1.5 space-y-1">
              {FASES[plan].map((f) => {
                const on = ids.includes(f.id);
                const clave = `${plan}-${f.id}`;
                const nuevas = f.tareas.filter((t) => t.nueva);
                return (
                  <div key={f.id} className={`rounded-lg border ${on ? 'border-[#1E5468] bg-[#10394A]' : 'border-transparent bg-[#0A2B3A]/40'}`}>
                    <div className="flex items-center gap-2 px-2.5 py-1.5">
                      <button onClick={() => alternar(plan, f.id)}
                        className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] text-[11px] font-bold ${
                          on ? 'border-brand-verde bg-brand-verde text-[#061F2B]' : 'border-[#3F7D93]'}`}
                        aria-pressed={on} aria-label={`${on ? 'Quitar' : 'Añadir'} ${f.nombre}`}>
                        {on ? '✓' : ''}
                      </button>
                      <button onClick={() => setAbierta(abierta === clave ? null : clave)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <span className={`min-w-0 flex-1 truncate text-[12.5px] ${on ? 'text-[#EAF4F7]' : 'text-[#7FA7B4]'}`}>{f.nombre}</span>
                        {nuevas.length > 0 && (
                          <span className="chip !px-1.5 !py-0 bg-brand-verde/15 text-[9.5px] text-brand-verdeTexto">
                            {nuevas.reduce((a, t) => a + t.h, 0)} h nuevas
                          </span>
                        )}
                        <span className={`shrink-0 text-[12px] font-bold ${on ? 'text-[#EAF4F7]' : 'text-[#7FA7B4]'}`}>{f.horas} h</span>
                      </button>
                    </div>
                    {abierta === clave && (
                      <ul className="space-y-0.5 border-t border-[#1E5468] px-2.5 py-2">
                        {f.tareas.map((t, i) => (
                          <li key={i} className="flex gap-2 text-[11.5px] leading-snug text-[#9FC0CB]">
                            <span className="w-9 shrink-0 text-right font-bold text-[#7FA7B4]">{t.h} h</span>
                            <span className="min-w-0">{t.t}{t.nueva && <span className="ml-1.5 text-brand-verdeTexto">· nueva</span>}</span>
                          </li>
                        ))}
                        <li className="pt-1 text-[11px] italic text-[#7FA7B4]">
                          Compartible con el otro plan: {Math.round(f.compartible * 100)} %. {f.motivoCompartible}
                        </li>
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Integración: solo aparece si van los dos planes */}
      {res?.ahorroHoras > 0 && (
        <div className="mt-3 rounded-xl bg-brand-verde/12 p-3">
          <p className="text-[12px] font-extrabold uppercase tracking-wide text-brand-verdeTexto">Regla de integración aplicada</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#B9D2DA]">
            Al contratar los dos planes no se repiten las tareas comunes: <b className="text-[#EAF4F7]">−{res.ahorroHoras} h</b>
            {' '}({eur(res.integracion.importe)}). No se descuenta el 100 % de lo común porque
            <b className="text-[#EAF4F7]"> son dos documentos con contenido y registro propios</b>: se comparte el método, no la redacción.
          </p>
          <ul className="mt-2 space-y-0.5">
            {res.integracion.detalle.filter((d) => d.ahorro > 0).map((d, i) => (
              <li key={i} className="flex gap-2 text-[11px] text-[#9FC0CB]">
                <span className="w-14 shrink-0 text-right font-bold text-brand-verdeTexto">−{d.ahorro} h</span>
                <span className="min-w-0">{d.fase} · {d.comunes} h comunes al {Math.round(d.compartible * 100)} %</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {res && (
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 border-t border-[#1E5468] pt-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Total del proyecto</p>
            <p className="text-[11.5px] text-[#9FC0CB]">
              {res.horas} h × {TARIFA_PROYECTO} €
              {res.ahorroHoras > 0 && <> · antes de integrar: {res.horasBrutas} h / {eur(res.importeSinIntegrar)}</>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-[#EAF4F7]">{eur(res.importe)}<span className="ml-1 text-[12px] font-bold text-[#7FA7B4]">sin IVA</span></p>
            <p className="text-[11.5px] text-[#9FC0CB]">{eur(res.total)} con IVA</p>
          </div>
        </div>
      )}
    </div>
  );
}
