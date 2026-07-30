import { useState } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// AJUSTES Y NOTAS DE ESTA OFERTA
//
// Distinto de las reglas comerciales: aquéllas valen para todo el que cumpla la
// condición; esto es un trato para esta oferta y solo esta.
//
// El motivo es obligatorio, y no por burocracia: un descuento sin motivo escrito
// es un número que nadie sabe justificar seis meses después. La base de datos lo
// exige también, así que aquí se pide antes de que falle allí.
//
// Las notas van en dos cajas separadas a propósito. Es demasiado fácil escribir
// «margen hasta 3.000 si aprietan» en el sitio equivocado y mandárselo al
// cliente en el PDF.
// ════════════════════════════════════════════════════════════════════════════

const TIPOS = [
  { k: 'descuento',   label: 'Descuento' },
  { k: 'recargo',     label: 'Recargo' },
  { k: 'nxm',         label: '2x1 y similares' },
  { k: 'precio_fijo', label: 'Precio cerrado' },
];

const VACIO = () => ({ tipo: 'descuento', unidad: 'porcentaje', valor: '', lleva: 2, paga: 1, concepto: '', motivo: '' });

const eur = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0);

export default function AjustesOferta({ ajustes, setAjustes, notas, setNotas, notasInternas, setNotasInternas, res }) {
  const [form, setForm] = useState(VACIO());
  const [error, setError] = useState(null);
  const [abierto, setAbierto] = useState(false);

  function anadir() {
    const f = { ...form };
    if (!f.motivo.trim() || f.motivo.trim().length < 5) {
      setError('El motivo es obligatorio y tiene que decir algo. Es lo que justifica el trato.');
      return;
    }
    if (f.tipo === 'nxm') {
      const lleva = Number(f.lleva), paga = Number(f.paga);
      if (!(lleva >= 2 && paga >= 1 && paga < lleva)) {
        setError('En un 2x1, lo que se paga tiene que ser menor que lo que se lleva.');
        return;
      }
      f.concepto = f.concepto.trim() || `${lleva}x${paga} en sedes`;
    } else {
      const v = Number(f.valor);
      if (!Number.isFinite(v) || v <= 0) { setError('Pon un importe o un porcentaje mayor que cero.'); return; }
      if (f.tipo !== 'precio_fijo' && f.unidad === 'porcentaje' && v > 100) {
        setError('Un porcentaje mayor de 100 no tiene sentido aquí.'); return;
      }
      f.valor = v;
    }
    setAjustes([...ajustes, f]);
    setForm(VACIO()); setError(null);
  }

  const quitar = (i) => setAjustes(ajustes.filter((_, j) => j !== i));
  const aplicados = res?.ajustes || [];

  return (
    <div className="mt-4 rounded-2xl border-[1.5px] border-[#1E5468] bg-[#0D3242] p-4">
      <button type="button" onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left">
        <span className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">
          Ajustes y notas de esta oferta
        </span>
        <span className="flex items-center gap-2 text-[11.5px] text-[#9FC0CB]">
          {ajustes.length > 0 && (
            <span className="chip !px-2 !py-0 bg-brand-verde/15 text-[10px] text-brand-verdeTexto">
              {ajustes.length} ajuste{ajustes.length === 1 ? '' : 's'}
            </span>
          )}
          {res?.ajusteOferta ? (
            <span className={`font-bold ${res.ajusteOferta < 0 ? 'text-brand-verdeTexto' : 'text-brand-orange'}`}>
              {res.ajusteOferta < 0 ? '' : '+'}{eur(res.ajusteOferta)}
            </span>
          ) : null}
          <span>{abierto ? '▲' : '▼'}</span>
        </span>
      </button>

      {abierto && (
        <div className="mt-3 space-y-4">
          <p className="text-[11.5px] leading-relaxed text-[#9FC0CB]">
            Son distintos de las reglas comerciales: éstas valen solo para esta oferta.
            Se aplican <b className="text-[#EAF4F7]">después</b> de las reglas, sobre el precio que salga de ellas.
          </p>

          {/* Lo ya añadido, con su efecto real */}
          {ajustes.length > 0 && (
            <ul className="space-y-1.5">
              {ajustes.map((a, i) => {
                const ap = aplicados[i];
                return (
                  <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-[#10394A] px-3 py-2">
                    <span className="chip !px-2 !py-0 bg-white/8 text-[10px] text-[#9FC0CB]">
                      {TIPOS.find((t) => t.k === a.tipo)?.label}
                    </span>
                    <span className="text-[13px] font-bold text-[#EAF4F7]">
                      {a.concepto || (a.tipo === 'nxm' ? `${a.lleva}x${a.paga}` : `${a.valor}${a.unidad === 'euros' ? ' €' : ' %'}`)}
                    </span>
                    {ap?.efecto ? (
                      <span className={`text-[12px] font-bold ${ap.efecto < 0 ? 'text-brand-verdeTexto' : 'text-brand-orange'}`}>
                        {ap.efecto < 0 ? '' : '+'}{eur(ap.efecto)}
                      </span>
                    ) : null}
                    <span className="w-full text-[11px] italic text-[#7FA7B4]">{a.motivo}</span>
                    <button type="button" onClick={() => quitar(i)}
                      className="ml-auto text-[11px] font-bold text-red-300 hover:text-red-200">Quitar</button>
                  </li>
                );
              })}
              {res?.precioAntesDeAjustes != null && res.ajusteOferta ? (
                <li className="flex items-baseline justify-between gap-2 border-t border-[#1E5468] px-3 pt-2 text-[12.5px]">
                  <span className="text-[#9FC0CB]">Catálogo {eur(res.precioAntesDeAjustes)} → esta oferta</span>
                  <span className="text-[15px] font-extrabold text-[#EAF4F7]">{eur(res.precioCatalogo)}</span>
                </li>
              ) : null}
            </ul>
          )}

          {/* Añadir uno */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="label" htmlFor="aj-tipo">Tipo</label>
              <select id="aj-tipo" className="input !py-1.5 !text-[13px]" value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                {TIPOS.map((t) => <option key={t.k} value={t.k}>{t.label}</option>)}
              </select>
            </div>

            {form.tipo === 'nxm' ? (
              <>
                <div>
                  <label className="label" htmlFor="aj-lleva">De cada</label>
                  <input id="aj-lleva" type="number" min="2" className="input !py-1.5 !text-[13px]" value={form.lleva}
                    onChange={(e) => setForm({ ...form, lleva: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="aj-paga">Se pagan</label>
                  <input id="aj-paga" type="number" min="1" className="input !py-1.5 !text-[13px]" value={form.paga}
                    onChange={(e) => setForm({ ...form, paga: e.target.value })} />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="label" htmlFor="aj-valor">{form.tipo === 'precio_fijo' ? 'Precio (€)' : 'Cuánto'}</label>
                  <input id="aj-valor" type="number" min="0" step="0.01" className="input !py-1.5 !text-[13px]" value={form.valor}
                    onChange={(e) => setForm({ ...form, valor: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="aj-unidad">Unidad</label>
                  <select id="aj-unidad" className="input !py-1.5 !text-[13px]" value={form.unidad}
                    disabled={form.tipo === 'precio_fijo'}
                    onChange={(e) => setForm({ ...form, unidad: e.target.value })}>
                    <option value="porcentaje">%</option>
                    <option value="euros">€</option>
                  </select>
                </div>
              </>
            )}

            <div className="lg:col-span-1">
              <label className="label" htmlFor="aj-concepto">Concepto <span className="text-[#7FA7B4]">(sale en la oferta)</span></label>
              <input id="aj-concepto" className="input !py-1.5 !text-[13px]" value={form.concepto}
                placeholder="2x1 en sedes" onChange={(e) => setForm({ ...form, concepto: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="aj-motivo">
              Motivo <span className="text-brand-orange">*</span>
              <span className="ml-1 font-normal text-[#7FA7B4]">— interno, no sale en la oferta</span>
            </label>
            <input id="aj-motivo" className="input !py-1.5 !text-[13px]" value={form.motivo}
              placeholder="Por qué se hace este trato" onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
          </div>

          {error && <p role="alert" className="rounded-lg bg-red-500/12 px-3 py-2 text-[12px] font-bold text-red-200">{error}</p>}

          <button type="button" onClick={anadir} className="btn-ghost !px-3 !py-1.5 text-xs">+ Añadir ajuste</button>

          {/* ── Notas ── */}
          <div className="grid gap-3 border-t border-[#1E5468] pt-3 lg:grid-cols-2">
            <div>
              <label className="label" htmlFor="aj-notas">
                Notas aclaratorias
                <span className="ml-1 font-normal text-brand-verdeTexto">— salen en el PDF y el PPT</span>
              </label>
              <textarea id="aj-notas" rows={4} className="input !py-1.5 !text-[13px]" value={notas || ''}
                onChange={(e) => setNotas(e.target.value)}
                placeholder={'Una por línea.\nEl alcance incluye solo las sedes de Madrid.\nLas sesiones se harán en remoto.'} />
            </div>
            <div>
              <label className="label" htmlFor="aj-internas">
                Notas internas
                <span className="ml-1 font-normal text-red-300">— NO salen en ningún documento</span>
              </label>
              <textarea id="aj-internas" rows={4} className="input !py-1.5 !text-[13px]" value={notasInternas || ''}
                onChange={(e) => setNotasInternas(e.target.value)}
                placeholder={'Margen de negociación, contactos, lo que no se enseña.'} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
