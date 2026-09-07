import { fmtEUR } from '../lib/calcEngine.js';
import { numeroES } from '../lib/formato.js';

// ════════════════════════════════════════════════════════════════════════════
// RENTABILIDAD DE LA OFERTA · el cuadro del lateral (uso interno)
//
// Responde a tres preguntas, en este orden:
//   1. ¿Cuántas horas hay que ECHAR? Las del contrato (horas del modelo por
//      sistema más las presenciales) y, si la planificación de tareas pide
//      más, las que faltan «por tareas a terminar». Con la carga anual del
//      proyecto según los sistemas de gestión, prorrateada hasta el fin.
//   2. ¿Qué deja al mes y al año? Cobrado, coste con la tarifa de cada nivel
//      según el reparto, resultado y margen.
//   3. ¿Encaja con lo que la casa tiene que cobrar por nivel?
// ════════════════════════════════════════════════════════════════════════════

const TONO = {
  si:    { chip: 'bg-emerald-500/20 text-emerald-200', etq: 'Encaja' },
  justo: { chip: 'bg-amber-400/20 text-amber-100', etq: 'Justo' },
  no:    { chip: 'bg-red-500/20 text-red-200', etq: 'Por debajo' },
};
const pct = (x) => `${Math.round((x || 0) * 100)} %`;
const h = (n) => `${numeroES(n, null)} h`;

export default function RentabilidadOferta({ r, esMes = false, compacto = false }) {
  if (!r) return null;
  const T = TONO[r.encaja] || { chip: 'bg-white/10 text-white/70', etq: '—' };
  const u = esMes ? '/mes' : '';
  const hd = r.horasDetalle || {};
  const c = r.contrato;
  const sobra = r.diferencia >= 0;
  const signo = (n) => (n >= 0 ? '+' : '−');

  return (
    <div className="mt-3 rounded-2xl bg-white/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-orange">Rentabilidad · uso interno</p>
        <span className={`chip !px-2 !py-0.5 text-[10.5px] font-extrabold ${T.chip}`}>
          {T.etq}{r.margenReal != null ? ` · margen ${pct(r.margenReal)}` : ''}
        </span>
      </div>

      {/* 1 · Horas que hay que echar */}
      <div className="mt-2 rounded-xl bg-white/5 px-2.5 py-2 text-[11.5px]">
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-white/55">Horas que hay que echar</p>
        {c ? (
          <>
            <p className="mt-1 flex justify-between gap-2">
              <span className="text-white/75">Por contrato · {c.porSistema} h online × {c.sistemas} sistema{c.sistemas === 1 ? '' : 's'}{c.presenciales ? ` + ${c.presenciales} h presenciales` : ''}</span>
              <b className="text-white">{h(c.mes)}/mes</b>
            </p>
            <p className="flex justify-between gap-2">
              <span className="text-white/75">Planificación · {h(r.plan.anual)}/año en {r.plan.prorrata} meses</span>
              <b className="text-white">{h(r.plan.mes)}/mes</b>
            </p>
            {hd.extraMes > 0 ? (
              <p className="flex justify-between gap-2 text-amber-100">
                <span>Por tareas a terminar, además del contrato</span>
                <b>+{h(hd.extraMes)}/mes</b>
              </p>
            ) : (
              <p className="text-[10.5px] text-emerald-200">La planificación cabe en las horas del contrato.</p>
            )}
            <p className="mt-1 flex justify-between gap-2 border-t border-white/10 pt-1">
              <span className="font-bold text-white">A echar</span>
              <b className="text-[13px] text-white">{h(hd.mes)}/mes · {h(hd.anual)}/año</b>
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 flex justify-between gap-2">
              <span className="text-white/75">Planificación de tareas{r.plan.factor !== 1 ? ` · bolsa al ${Math.round(r.plan.factor * 100)} %` : ''}</span>
              <b className="text-white">{h(hd.total)}</b>
            </p>
            <p className="flex justify-between gap-2">
              <span className="text-white/75">Al mes, en {r.mesesProrrata} meses</span>
              <b className="text-white">{h(hd.mes)}/mes</b>
            </p>
          </>
        )}
        {r.plan.porNorma?.length > 0 && (
          <p className="mt-1 text-[10px] leading-snug text-white/45">
            {r.plan.porNorma.map((n) => `${n.nombre} ${numeroES(n.horas, null)} h`).join(' · ')}{esMes ? ' al año' : ''} · {r.plan.porNorma[0].origen}
          </p>
        )}
      </div>

      {/* 2 · Mensual y anual */}
      <table className="mt-2 w-full text-[11.5px]">
        <thead>
          <tr className="text-left text-[9.5px] font-extrabold uppercase tracking-wide text-white/50">
            <th className="py-1"></th>
            <th className="py-1 text-right">{esMes ? 'Al mes' : `Al mes (${r.mesesProrrata})`}</th>
            <th className="py-1 text-right">{esMes ? 'Al año' : 'Total'}</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-white/10">
            <td className="py-1 text-white/75">Horas</td>
            <td className="py-1 text-right text-white/85">{h(r.mensual.horas)}</td>
            <td className="py-1 text-right text-white/85">{h(r.anual.horas)}</td>
          </tr>
          <tr className="border-t border-white/10">
            <td className="py-1 text-white/75">Cobrado</td>
            <td className="py-1 text-right font-bold text-white">{fmtEUR(r.mensual.cobrado)}</td>
            <td className="py-1 text-right font-bold text-white">{fmtEUR(r.anual.cobrado)}</td>
          </tr>
          <tr className="border-t border-white/10">
            <td className="py-1 text-white/75">Coste con la tarifa por nivel</td>
            <td className="py-1 text-right text-white/85">{fmtEUR(r.mensual.coste)}</td>
            <td className="py-1 text-right text-white/85">{fmtEUR(r.anual.coste)}</td>
          </tr>
          <tr className="border-t border-white/20">
            <td className="py-1 font-extrabold text-white">Resultado</td>
            <td className={`py-1 text-right font-extrabold ${r.mensual.resultado >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>{signo(r.mensual.resultado)}{fmtEUR(Math.abs(r.mensual.resultado))}</td>
            <td className={`py-1 text-right font-extrabold ${r.anual.resultado >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>{signo(r.anual.resultado)}{fmtEUR(Math.abs(r.anual.resultado))}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[12px]">
        <div className="rounded-lg bg-white/5 px-2.5 py-1.5">
          <span className="block text-[10px] text-white/55">Precio/hora cobrado</span>
          <b className="text-[14px] text-white">{r.precioHora != null ? `${fmtEUR(r.precioHora)}/h` : '—'}</b>
        </div>
        <div className="rounded-lg bg-white/5 px-2.5 py-1.5">
          <span className="block text-[10px] text-white/55">A cobrar por nivel</span>
          <b className="text-[14px] text-white">{r.precioHoraDebido != null ? `${fmtEUR(r.precioHoraDebido)}/h` : '—'}</b>
        </div>
      </div>

      <p className={`mt-2 text-[11.5px] font-bold ${sobra ? 'text-emerald-200' : 'text-red-200'}`}>
        {sobra
          ? `Se cobran ${fmtEUR(r.diferencia)}${u} por encima de lo que exigen las horas a echar con el margen objetivo (${fmtEUR(r.debido)}${u}).`
          : `Faltan ${fmtEUR(-r.diferencia)}${u} para lo que exigen las horas a echar con el margen objetivo (${fmtEUR(r.debido)}${u}).`}
      </p>

      {/* 3 · Por nivel */}
      {!compacto && (
        <table className="mt-2 w-full text-[11px]">
          <thead>
            <tr className="text-left text-[9.5px] font-extrabold uppercase tracking-wide text-white/50">
              <th className="py-1">Nivel</th>
              <th className="py-1 text-right">h{u}</th>
              <th className="py-1 text-right">Tarifa</th>
              <th className="py-1 text-right">Coste{u}</th>
              <th className="py-1 text-right">A cobrar/h</th>
            </tr>
          </thead>
          <tbody>
            {r.porNivel.filter((n) => n.horas > 0).map((n) => (
              <tr key={n.nivel} className="border-t border-white/10">
                <td className="py-1 font-bold text-white">{n.nivel} <span className="font-medium text-white/50">{n.pct} %</span></td>
                <td className="py-1 text-right text-white/85">{numeroES(n.horas, null)}</td>
                <td className="py-1 text-right text-white/85">{n.tarifa} €</td>
                <td className="py-1 text-right text-white/85">{fmtEUR(n.coste)}</td>
                <td className="py-1 text-right text-white/85">{n.precioHora} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-1.5 text-[10px] leading-snug text-white/45">
        Margen = (cobrado − coste) ÷ coste; objetivo {pct(r.margenObjetivo)}. A cobrar/h = tarifa del nivel × (1 + margen objetivo).
        {r.manual ? ' Reparto manual.' : ' Reparto automático por norma.'}
      </p>
    </div>
  );
}
