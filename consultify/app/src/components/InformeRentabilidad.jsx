import { useEffect, useMemo, useState } from 'react';
import { calcular, fmtEUR, NIVELES, catalogoHorasDesdeFilas } from '../lib/calcEngine.js';
import { listTable } from '../lib/data.js';
import { numeroES } from '../lib/formato.js';

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

// Meses del proyecto para prorratear la planificación: hasta el fin de la
// oferta si lo tiene; si no, 12.
const mesesDe = (o) => {
  if (o?.fecha_inicio && o?.fecha_fin) {
    const a = new Date(`${String(o.fecha_inicio).slice(0, 10)}T12:00:00`), b = new Date(`${String(o.fecha_fin).slice(0, 10)}T12:00:00`);
    const m = Math.round((b - a) / (86400000 * 30.4375));
    if (m > 0) return m;
  }
  return Number(o?.meses) > 0 ? Number(o.meses) : 12;
};

export function rentabilidadDeOferta(o, catalogoHoras = null) {
  if (!o?.normas?.length || !o?.modelo) return null;
  const r = calcular(o.normas, o.modelo, {
    meses: mesesDe(o), complejidad: o.complejidad, sedes: o.sedes,
    fasesPlan: o.fases_plan || undefined, repartoNiveles: o.reparto_niveles || null,
    catalogoHoras, aplicarReglas: false,
  });
  if (!r) return null;
  // Se recalcula sobre el precio que se cobra de verdad (el de la oferta), no
  // sobre el de catálogo de hoy.
  const R = r.rentabilidad;
  const precio = Number(o.precio) || 0;
  const esMes = R.unidad === 'mes';
  const coste = R.coste;
  const margenReal = coste > 0 ? (precio - coste) / coste : null;
  const encaja = margenReal == null ? null : margenReal >= r.margen - 0.005 ? 'si' : margenReal >= r.margen / 2 ? 'justo' : 'no';
  const meses = R.mesesProrrata;
  return {
    precio, esMes, horas: R.horas, coste, debido: R.debido, diferencia: precio - R.debido, margenReal, encaja,
    precioHora: R.horas ? precio / R.horas : null, precioHoraDebido: R.precioHoraDebido,
    contrato: R.contrato, plan: R.plan, horasDetalle: R.horasDetalle,
    mensual: esMes ? { horas: R.mensual.horas, cobrado: precio, coste, resultado: precio - coste }
      : { horas: R.mensual.horas, cobrado: precio / meses, coste: coste / meses, resultado: (precio - coste) / meses },
    anual: esMes ? { meses: 12, horas: R.anual.horas, cobrado: precio * 12, coste: coste * 12, resultado: (precio - coste) * 12 }
      : { meses, horas: R.anual.horas, cobrado: precio, coste, resultado: precio - coste },
    reparto: R.reparto, manual: R.manual, porNivel: R.porNivel,
  };
}

export default function InformeRentabilidad({ ofertas = [] }) {
  const [soloVivas, setSoloVivas] = useState(true);
  const [abierto, setAbierto] = useState(true);   // abierto: se ve al entrar, recalculado con las ofertas cargadas
  // Horas planificadas por norma y modelo, de la tabla que se edita en
  // Sistemas de gestión. Sin ella, el catálogo embebido.
  const [catalogoHoras, setCatalogoHoras] = useState(null);
  useEffect(() => { listTable('tareas_catalogo').then((f) => setCatalogoHoras(catalogoHorasDesdeFilas(f || []))).catch(() => {}); }, []);

  const filas = useMemo(() => ofertas
    .filter((o) => !soloVivas || VIVAS.has(String(o.estado || 'emitida')))
    .map((o) => ({ o, r: rentabilidadDeOferta(o, catalogoHoras) }))
    .filter((x) => x.r)
    .sort((a, b) => (a.r.margenReal ?? 9) - (b.r.margenReal ?? 9)), [ofertas, soloVivas, catalogoHoras]);

  const tot = useMemo(() => {
    // Todo se puede sumar al mes y al año: en las cuotas, cuota × 12; en
    // bolsas e implantaciones, el total repartido en sus meses.
    const suma = (k, j) => filas.reduce((a, x) => a + (x.r[k]?.[j] || 0), 0);
    return {
      n: filas.length,
      mensual: { horas: suma('mensual', 'horas'), cobrado: suma('mensual', 'cobrado'), coste: suma('mensual', 'coste'), resultado: suma('mensual', 'resultado') },
      anual: { horas: suma('anual', 'horas'), cobrado: suma('anual', 'cobrado'), coste: suma('anual', 'coste'), resultado: suma('anual', 'resultado') },
      porDebajo: filas.filter((x) => x.r.encaja === 'no').length,
      justo: filas.filter((x) => x.r.encaja === 'justo').length,
    };
  }, [filas]);

  function exportarCsv() {
    const cab = ['Oferta', 'Cliente', 'Modelo', 'Normas', 'Estado', 'Horas contrato/mes', 'Horas plan/anio', 'Horas extra/mes', 'Horas a echar/mes', 'Cobrado/mes', 'Coste/mes', 'Resultado/mes', 'Horas/anio', 'Cobrado/anio', 'Coste/anio', 'Resultado/anio', 'EUR/h cobrado', 'EUR/h a cobrar', 'Margen real', 'Encaja', ...NIVELES.map((n) => `% ${n}`)];
    const r2 = (x) => Math.round((x || 0) * 100) / 100;
    const lineas = filas.map(({ o, r }) => [
      o.numero_oferta || '', o.empresa || '', o.modelo, (o.normas || []).join(' '), o.estado || '',
      r.contrato ? r.contrato.mes : '', h1(r.plan.anual), r.horasDetalle.extraMes || 0, h1(r.mensual.horas),
      r2(r.mensual.cobrado), r2(r.mensual.coste), r2(r.mensual.resultado),
      h1(r.anual.horas), r2(r.anual.cobrado), r2(r.anual.coste), r2(r.anual.resultado),
      r.precioHora == null ? '' : r2(r.precioHora), r.precioHoraDebido == null ? '' : r2(r.precioHoraDebido),
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
            {abierto ? '▾' : '▸'} Informe de rentabilidad · horas a echar, cobrado y coste, al mes y al año
          </h2>
          <p className="mt-0.5 text-[12px] text-[#9FC0CB]">
            {filas.length} oferta{filas.length === 1 ? '' : 's'} ·
            {tot.porDebajo ? <span className="text-red-300 font-bold"> {tot.porDebajo} por debajo del margen</span> : <span className="text-emerald-300 font-bold"> ninguna por debajo del margen</span>}
            {tot.justo ? <span className="text-amber-200 font-bold"> · {tot.justo} justas</span> : ''}
            <span className="text-[#7FA7B4]"> · {numeroES(tot.mensual.horas, null)} h/mes a echar · resultado {tot.anual.resultado >= 0 ? '+' : '−'}{fmtEUR(Math.abs(tot.anual.resultado))}/año</span>
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
            {[['Al mes', tot.mensual], ['Al año', tot.anual]].map(([etq, t]) => (
              <div key={etq} className="rounded-xl border border-[#1E5468] bg-[#0D3242] px-3 py-2 text-[12px]">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{etq} · {tot.n} oferta{tot.n === 1 ? '' : 's'}</p>
                <p className="mt-1 flex justify-between"><span className="text-[#9FC0CB]">Horas a echar</span><b className="text-[#EAF4F7]">{numeroES(t.horas, null)} h</b></p>
                <p className="flex justify-between"><span className="text-[#9FC0CB]">Cobrado</span><b className="text-[#EAF4F7]">{fmtEUR(t.cobrado)}</b></p>
                <p className="flex justify-between"><span className="text-[#9FC0CB]">Coste con la tarifa por nivel</span><b className="text-[#EAF4F7]">{fmtEUR(t.coste)}</b></p>
                <p className={`flex justify-between font-bold ${t.resultado >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  <span>Resultado</span><span>{t.resultado >= 0 ? '+' : '−'}{fmtEUR(Math.abs(t.resultado))}</span>
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[1100px] text-[12px]">
              <thead>
                <tr className="text-left text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">
                  <th className="py-1.5 pr-2">Oferta</th><th className="py-1.5 pr-2">Modelo · normas</th>
                  <th className="py-1.5 pr-2 text-right" title="Horas del contrato + las que pide la planificación por encima">A echar/mes</th>
                  <th className="py-1.5 pr-2 text-right">Cobrado/mes</th><th className="py-1.5 pr-2 text-right">Coste/mes</th>
                  <th className="py-1.5 pr-2 text-right">Resultado/mes</th>
                  <th className="py-1.5 pr-2 text-right">Horas/año</th><th className="py-1.5 pr-2 text-right">Resultado/año</th>
                  <th className="py-1.5 pr-2 text-right">€/h</th><th className="py-1.5 pr-2 text-right">Margen</th>
                  <th className="py-1.5 pr-2">Reparto</th><th className="py-1.5">Encaja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#153F52]">
                {filas.map(({ o, r }) => (
                  <tr key={o.id}>
                    <td className="py-1.5 pr-2">
                      <span className="block font-extrabold text-[#EAF4F7]">{o.numero_oferta || '—'}</span>
                      <span className="block truncate text-[11px] text-[#7FA7B4]" title={o.empresa}>{o.empresa || o.email || '—'}</span>
                    </td>
                    <td className="py-1.5 pr-2 text-[#CFE3E9]">
                      {o.modelo} <span className="text-[#7FA7B4]">· {(o.normas || []).join(' ')}</span>
                      {!r.esMes && <span className="block text-[10.5px] text-[#7FA7B4]">total en {r.anual.meses} meses</span>}
                    </td>
                    <td className="py-1.5 pr-2 text-right text-[#CFE3E9]" title={r.contrato ? `${r.contrato.mes} h por contrato + ${r.horasDetalle.extraMes} h por tareas a terminar · planificación ${numeroES(r.plan.anual, null)} h/año` : `${numeroES(r.plan.anual, null)} h planificadas`}>
                      {numeroES(r.mensual.horas, null)} h
                      {r.contrato && <span className="block text-[10px] text-[#7FA7B4]">{r.contrato.mes} contrato{r.horasDetalle.extraMes > 0 ? ` + ${numeroES(r.horasDetalle.extraMes, null)} tareas` : ''}</span>}
                    </td>
                    <td className="py-1.5 pr-2 text-right font-bold text-[#EAF4F7]">{fmtEUR(r.mensual.cobrado)}</td>
                    <td className="py-1.5 pr-2 text-right text-[#CFE3E9]">{fmtEUR(r.mensual.coste)}</td>
                    <td className={`py-1.5 pr-2 text-right font-bold ${r.mensual.resultado >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{r.mensual.resultado >= 0 ? '+' : '−'}{fmtEUR(Math.abs(r.mensual.resultado))}</td>
                    <td className="py-1.5 pr-2 text-right text-[#CFE3E9]">{numeroES(r.anual.horas, null)} h</td>
                    <td className={`py-1.5 pr-2 text-right font-bold ${r.anual.resultado >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{r.anual.resultado >= 0 ? '+' : '−'}{fmtEUR(Math.abs(r.anual.resultado))}</td>
                    <td className="py-1.5 pr-2 text-right text-[#CFE3E9]" title={`a cobrar por nivel ${r.precioHoraDebido ? fmtEUR(r.precioHoraDebido) : '—'}/h`}>
                      {r.precioHora ? fmtEUR(r.precioHora) : '—'}<span className="text-[10px] text-[#5E8494]"> / {r.precioHoraDebido ? fmtEUR(r.precioHoraDebido) : '—'}</span>
                    </td>
                    <td className={`py-1.5 pr-2 text-right font-bold ${TONO[r.encaja] || 'text-[#9FC0CB]'}`}>{pct(r.margenReal)}</td>
                    <td className="py-1.5 pr-2 text-[10.5px] text-[#9FC0CB]">
                      {NIVELES.filter((n) => r.reparto[n] > 0).map((n) => `${n} ${r.reparto[n]}%`).join(' · ')}{r.manual ? ' ✎' : ''}
                    </td>
                    <td className={`py-1.5 font-bold ${TONO[r.encaja] || 'text-[#9FC0CB]'}`}>{ETQ[r.encaja] || '—'}</td>
                  </tr>
                ))}
                {!filas.length && <tr><td colSpan={12} className="py-4 text-center text-[#7FA7B4]">Sin ofertas que valorar.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10.5px] leading-snug text-[#5E8494]">
            Horas a echar = las del contrato (horas del modelo por sistema más presenciales) o, si la planificación de tareas pide más, esa planificación prorrateada hasta el fin del proyecto (12 meses si no lo tiene); la diferencia son horas por tareas a terminar.
            Coste = horas de cada nivel × tarifa del nivel según el reparto. Margen = (cobrado − coste) ÷ coste. €/h = cobrado ÷ horas, junto a lo que habría que cobrar por nivel. «✎» indica reparto manual guardado en la oferta.
          </p>
        </>
      )}
    </section>
  );
}
