import { fmtEUR } from '../lib/calcEngine.js';

// ════════════════════════════════════════════════════════════════════════════
// RENTABILIDAD DE LA OFERTA · el cuadro del lateral
//
// Para quien oferta, no para el cliente: el precio que se está dando, las
// horas que hay que echar, a cuánto sale la hora y si eso encaja con lo que
// la casa tiene que cobrar por cada nivel (tarifa × margen objetivo).
//
// «Debido» es lo que exige la carga: horas de cada nivel × precio/hora del
// nivel. La diferencia con el precio ofertado es lo que se está regalando
// (negativa) o lo que se cobra de más (positiva, normalmente por los suelos).
// ════════════════════════════════════════════════════════════════════════════

const TONO = {
  si:    { chip: 'bg-emerald-500/20 text-emerald-200', etq: 'Encaja', punto: '#22C55E' },
  justo: { chip: 'bg-amber-400/20 text-amber-100', etq: 'Justo', punto: '#F5A623' },
  no:    { chip: 'bg-red-500/20 text-red-200', etq: 'Por debajo', punto: '#EF4444' },
};
const pct = (x) => `${Math.round((x || 0) * 100)} %`;
const h1 = (n) => `${Math.round((Number(n) || 0) * 10) / 10}`;

export default function RentabilidadOferta({ r, esMes = false, compacto = false }) {
  if (!r) return null;
  const T = TONO[r.encaja] || { chip: 'bg-white/10 text-white/70', etq: '—', punto: '#5E8494' };
  const u = esMes ? '/mes' : '';
  const sobra = r.diferencia >= 0;

  return (
    <div className="mt-3 rounded-2xl bg-white/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-orange">Rentabilidad · uso interno</p>
        <span className={`chip !px-2 !py-0.5 text-[10.5px] font-extrabold ${T.chip}`}>
          {T.etq}{r.margenReal != null ? ` · margen ${pct(r.margenReal)}` : ''}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[12px]">
        <div className="rounded-lg bg-white/5 px-2.5 py-1.5">
          <span className="block text-[10px] text-white/55">Precio ofertado</span>
          <b className="text-[14px] text-white">{fmtEUR(r.precio)}<span className="text-[10px] font-medium text-white/50">{u}</span></b>
        </div>
        <div className="rounded-lg bg-white/5 px-2.5 py-1.5">
          <span className="block text-[10px] text-white/55">Horas a echar</span>
          <b className="text-[14px] text-white">{h1(r.horas)} h<span className="text-[10px] font-medium text-white/50">{u}</span></b>
        </div>
        <div className="rounded-lg bg-white/5 px-2.5 py-1.5">
          <span className="block text-[10px] text-white/55">Precio/hora cobrado</span>
          <b className="text-[14px] text-white">{r.precioHora != null ? `${fmtEUR(r.precioHora)}/h` : '—'}</b>
        </div>
        <div className="rounded-lg bg-white/5 px-2.5 py-1.5">
          <span className="block text-[10px] text-white/55">Precio/hora debido</span>
          <b className="text-[14px] text-white">{r.precioHoraDebido != null ? `${fmtEUR(r.precioHoraDebido)}/h` : '—'}</b>
        </div>
      </div>

      <p className={`mt-2 text-[11.5px] font-bold ${sobra ? 'text-emerald-200' : 'text-red-200'}`}>
        {sobra
          ? `Se cobran ${fmtEUR(r.diferencia)}${u} por encima de lo que exige la carga (${fmtEUR(r.debido)}${u}).`
          : `Faltan ${fmtEUR(-r.diferencia)}${u} para lo que exige la carga (${fmtEUR(r.debido)}${u}).`}
      </p>

      {!compacto && (
        <table className="mt-2 w-full text-[11px]">
          <thead>
            <tr className="text-left text-[9.5px] font-extrabold uppercase tracking-wide text-white/50">
              <th className="py-1">Nivel</th>
              <th className="py-1 text-right">Horas</th>
              <th className="py-1 text-right">Tarifa</th>
              <th className="py-1 text-right">A cobrar/h</th>
              <th className="py-1 text-right">Debido</th>
            </tr>
          </thead>
          <tbody>
            {r.porNivel.filter((n) => n.horas > 0).map((n) => (
              <tr key={n.nivel} className="border-t border-white/10">
                <td className="py-1 font-bold text-white">{n.nivel} <span className="font-medium text-white/50">{r.reparto[n.nivel]} %</span></td>
                <td className="py-1 text-right text-white/85">{h1(n.horas)}</td>
                <td className="py-1 text-right text-white/85">{n.tarifa} €</td>
                <td className="py-1 text-right text-white/85">{n.precioHora} €</td>
                <td className="py-1 text-right font-bold text-white">{fmtEUR(n.debido)}</td>
              </tr>
            ))}
            <tr className="border-t border-white/20">
              <td className="py-1 font-extrabold text-white" colSpan={4}>Debido según la carga · margen {pct(r.margenObjetivo)}</td>
              <td className="py-1 text-right font-extrabold text-white">{fmtEUR(r.debido)}{u}</td>
            </tr>
          </tbody>
        </table>
      )}
      <p className="mt-1.5 text-[10px] leading-snug text-white/45">
        A cobrar/h = tarifa del nivel × (1 + margen objetivo). Coste con la tarifa aplicada: {fmtEUR(r.coste)}{u}.
        {r.manual ? ' Reparto manual.' : ' Reparto automático por norma.'}
      </p>
    </div>
  );
}
