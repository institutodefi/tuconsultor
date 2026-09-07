import { useMemo, useState } from 'react';
import { calcular, fmtEUR, NIVELES } from '../lib/calcEngine.js';

// ════════════════════════════════════════════════════════════════════════════
// INFORME DE RENTABILIDAD DE LAS OFERTAS
//
// Por cada oferta emitida: lo que se DEBERÍA cobrar según la carga (horas de
// cada nivel × precio/hora del nivel, sin reglas ni suelos) y lo que
// EFECTIVAMENTE se está cobrando (el precio de la oferta). La diferencia,
// oferta a oferta y en total, es el dinero que se regala o el que sobra.
//
// La carga se recalcula con el motor a partir de lo guardado en la oferta:
// normas, modelo, meses, complejidad, equipo, fases y reparto por nivel. Las
// reglas comerciales se desactivan a propósito: el «debido» es la referencia
// limpia, y las reglas ya están dentro del precio cobrado.
// ════════════════════════════════════════════════════════════════════════════

const VIVAS = new Set(['borrador', 'emitida', 'aceptada']);
const TONO = { si: 'text-emerald-300', justo: 'text-amber-200', no: 'text-red-300' };
const ETQ = { si: 'encaja', justo: 'justo', no: 'por debajo' };
const h1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const pct = (x) => (x == null ? '—' : `${Math.round(x * 100)} %`);

export function rentabilidadDeOferta(o) {
  if (!o?.normas?.length || !o?.modelo) return null;
  const r = calcular(o.normas, o.modelo, {
    meses: o.meses, complejidad: o.complejidad, sedes: o.sedes, equipo: o.equipo || null,
    fasesPlan: o.fases_plan || undefined, repartoNiveles: o.reparto_niveles || null,
    aplicarReglas: false,
  });
  if (!r) return null;
  const precio = Number(o.precio) || 0;
  const horas = r.rentabilidad.horas;
  const debido = r.rentabilidad.debido;
  const coste = r.rentabilidad.coste;
  const margenReal = coste > 0 ? (precio - coste) / coste : null;
  const encaja = margenReal == null ? null : margenReal >= r.margen - 0.005 ? 'si' : margenReal >= r.margen / 2 ? 'justo' : 'no';
  return {
    precio, horas, debido, coste, margenReal, encaja, esMes: r.tipo === 'mes' && o.modelo !== 'Implantación',
    precioHora: horas ? precio / horas : null, precioHoraDebido: horas ? debido / horas : null,
    diferencia: precio - debido, reparto: r.rentabilidad.reparto, manual: r.rentabilidad.manual, porNivel: r.rentabilidad.porNivel,
  };
}

export default function InformeRentabilidad({ ofertas = [] }) {
  const [soloVivas, setSoloVivas] = useState(true);
  const [abierto, setAbierto] = useState(true);   // abierto: se ve al entrar, recalculado con las ofertas cargadas

  const filas = useMemo(() => ofertas
    .filter((o) => !soloVivas || VIVAS.has(String(o.estado || 'emitida')))
    .map((o) => ({ o, r: rentabilidadDeOferta(o) }))
    .filter((x) => x.r)
    .sort((a, b) => a.r.diferencia - b.r.diferencia), [ofertas, soloVivas]);

  const tot = useMemo(() => {
    // Los totales se dan por unidad: al mes en recurrentes, total en el resto.
    const mes = filas.filter((x) => x.r.esMes), unicas = filas.filter((x) => !x.r.esMes);
    const suma = (arr, k) => arr.reduce((a, x) => a + (x.r[k] || 0), 0);
    return {
      mes: { n: mes.length, precio: suma(mes, 'precio'), debido: suma(mes, 'debido'), horas: suma(mes, 'horas') },
      unicas: { n: unicas.length, precio: suma(unicas, 'precio'), debido: suma(unicas, 'debido'), horas: suma(unicas, 'horas') },
      porDebajo: filas.filter((x) => x.r.encaja === 'no').length,
      justo: filas.filter((x) => x.r.encaja === 'justo').length,
    };
  }, [filas]);

  function exportarCsv() {
    const cab = ['Oferta', 'Cliente', 'Modelo', 'Normas', 'Estado', 'Unidad', 'Horas', 'Precio cobrado', 'Debido segun carga', 'Diferencia', 'EUR/h cobrado', 'EUR/h debido', 'Margen real', 'Encaja', ...NIVELES.map((n) => `% ${n}`)];
    const lineas = filas.map(({ o, r }) => [
      o.numero_oferta || '', o.empresa || '', o.modelo, (o.normas || []).join(' '), o.estado || '', r.esMes ? 'mes' : 'total',
      h1(r.horas), r.precio, r.debido, Math.round(r.diferencia * 100) / 100,
      r.precioHora == null ? '' : Math.round(r.precioHora * 100) / 100, r.precioHoraDebido == null ? '' : Math.round(r.precioHoraDebido * 100) / 100,
      r.margenReal == null ? '' : Math.round(r.margenReal * 1000) / 10, ETQ[r.encaja] || '', ...NIVELES.map((n) => r.reparto[n]),
    ]);
    const csv = [cab, ...lineas].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `rentabilidad-ofertas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <section className="card mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={() => setAbierto((v) => !v)} className="text-left">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-orange">
            {abierto ? '▾' : '▸'} Informe de rentabilidad · lo debido según la carga frente a lo cobrado
          </h2>
          <p className="mt-0.5 text-[12px] text-[#9FC0CB]">
            {filas.length} oferta{filas.length === 1 ? '' : 's'} ·
            {tot.porDebajo ? <span className="text-red-300 font-bold"> {tot.porDebajo} por debajo del margen</span> : <span className="text-emerald-300 font-bold"> ninguna por debajo del margen</span>}
            {tot.justo ? <span className="text-amber-200 font-bold"> · {tot.justo} justas</span> : ''}
          </p>
        </button>
        <div className="flex items-center gap-3 text-[12px] font-bold text-[#9FC0CB]">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={soloVivas} onChange={(e) => setSoloVivas(e.target.checked)} /> Solo vivas</label>
          <button onClick={exportarCsv} className="btn-ghost !px-3 !py-1 text-[12px]">↓ CSV</button>
        </div>
      </div>

      {abierto && (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[['Cuotas mensuales', tot.mes, '/mes'], ['Bolsas e implantaciones', tot.unicas, '']].map(([etq, t, u]) => t.n > 0 && (
              <div key={etq} className="rounded-xl border border-[#1E5468] bg-[#0D3242] px-3 py-2 text-[12px]">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{etq} · {t.n}</p>
                <p className="mt-1 flex justify-between"><span className="text-[#9FC0CB]">Cobrado</span><b className="text-[#EAF4F7]">{fmtEUR(t.precio)}{u}</b></p>
                <p className="flex justify-between"><span className="text-[#9FC0CB]">Debido según carga</span><b className="text-[#EAF4F7]">{fmtEUR(t.debido)}{u}</b></p>
                <p className={`flex justify-between font-bold ${t.precio - t.debido >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  <span>Diferencia</span><span>{t.precio - t.debido >= 0 ? '+' : ''}{fmtEUR(t.precio - t.debido)}{u}</span>
                </p>
                <p className="flex justify-between text-[#9FC0CB]"><span>Horas</span><span>{h1(t.horas)} h{u}</span></p>
              </div>
            ))}
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[900px] text-[12px]">
              <thead>
                <tr className="text-left text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">
                  <th className="py-1.5 pr-2">Oferta</th><th className="py-1.5 pr-2">Modelo · normas</th>
                  <th className="py-1.5 pr-2 text-right">Horas</th><th className="py-1.5 pr-2 text-right">Cobrado</th>
                  <th className="py-1.5 pr-2 text-right">Debido</th><th className="py-1.5 pr-2 text-right">Diferencia</th>
                  <th className="py-1.5 pr-2 text-right">€/h</th><th className="py-1.5 pr-2 text-right">Margen</th>
                  <th className="py-1.5 pr-2">Reparto</th><th className="py-1.5">Encaja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#153F52]">
                {filas.map(({ o, r }) => {
                  const u = r.esMes ? '/mes' : '';
                  return (
                    <tr key={o.id}>
                      <td className="py-1.5 pr-2">
                        <span className="block font-extrabold text-[#EAF4F7]">{o.numero_oferta || '—'}</span>
                        <span className="block truncate text-[11px] text-[#7FA7B4]" title={o.empresa}>{o.empresa || o.email || '—'}</span>
                      </td>
                      <td className="py-1.5 pr-2 text-[#CFE3E9]">{o.modelo} <span className="text-[#7FA7B4]">· {(o.normas || []).join(' ')}</span></td>
                      <td className="py-1.5 pr-2 text-right text-[#CFE3E9]">{h1(r.horas)}{u}</td>
                      <td className="py-1.5 pr-2 text-right font-bold text-[#EAF4F7]">{fmtEUR(r.precio)}{u}</td>
                      <td className="py-1.5 pr-2 text-right text-[#CFE3E9]">{fmtEUR(r.debido)}{u}</td>
                      <td className={`py-1.5 pr-2 text-right font-bold ${r.diferencia >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{r.diferencia >= 0 ? '+' : ''}{fmtEUR(r.diferencia)}</td>
                      <td className="py-1.5 pr-2 text-right text-[#CFE3E9]" title={`debido ${r.precioHoraDebido ? fmtEUR(r.precioHoraDebido) : '—'}/h`}>
                        {r.precioHora ? fmtEUR(r.precioHora) : '—'}<span className="text-[10px] text-[#5E8494]"> / {r.precioHoraDebido ? fmtEUR(r.precioHoraDebido) : '—'}</span>
                      </td>
                      <td className={`py-1.5 pr-2 text-right font-bold ${TONO[r.encaja] || 'text-[#9FC0CB]'}`}>{pct(r.margenReal)}</td>
                      <td className="py-1.5 pr-2 text-[10.5px] text-[#9FC0CB]">
                        {NIVELES.filter((n) => r.reparto[n] > 0).map((n) => `${n} ${r.reparto[n]}%`).join(' · ')}{r.manual ? ' ✎' : ''}
                      </td>
                      <td className={`py-1.5 font-bold ${TONO[r.encaja] || 'text-[#9FC0CB]'}`}>{ETQ[r.encaja] || '—'}</td>
                    </tr>
                  );
                })}
                {!filas.length && <tr><td colSpan={10} className="py-4 text-center text-[#7FA7B4]">Sin ofertas que valorar.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10.5px] leading-snug text-[#5E8494]">
            Debido = horas de cada nivel × tarifa del nivel × (1 + margen objetivo), sin reglas comerciales ni suelos. €/h = cobrado ÷ horas, junto al debido por hora.
            Margen = (cobrado − coste con la tarifa aplicada) ÷ coste. «✎» indica reparto manual guardado en la oferta.
          </p>
        </>
      )}
    </section>
  );
}
