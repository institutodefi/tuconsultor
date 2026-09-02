import { useEffect, useMemo, useState } from 'react';
import { listTable, updateRow, explicarErrorBd } from '../lib/data.js';
import { useAuth } from '../lib/auth.jsx';
import { can } from '../lib/permisos.js';
import { POR_DEFECTO, olvidarReglas } from '../lib/reglasComerciales.js';

// ════════════════════════════════════════════════════════════════════════════
// TARIFAS Y REGLAS DE PRECIO
//
// Lo que estaba dentro del código: tarifas por nivel, margen, descuentos,
// suelos. Ahora se ve y se edita.
//
// Se muestra a todo el equipo —saber a qué tarifa se factura una hora es
// información de trabajo, no un secreto— pero solo Administración las cambia:
// mover una tarifa mueve el precio de todas las ofertas que se preparen a
// partir de ese momento.
// ════════════════════════════════════════════════════════════════════════════

const GRUPOS = [
  ['tarifas', 'Tarifas por nivel', 'Coste por hora de cada nivel. De aquí sale el precio de todo lo demás.'],
  ['margen', 'Margen e impuestos', 'Lo que separa el coste del precio de venta.'],
  ['descuentos', 'Descuentos', 'Se aplican sobre el precio de catálogo.'],
  ['suelos', 'Mínimos', 'Por debajo de estos importes no se baja, aunque el cálculo lo permita.'],
  ['servicios', 'Servicios aparte', 'Lo que no entra en el modelo y se factura por separado.'],
  ['general', 'Otros parámetros', null],
];

const fmt = (v, unidad) => {
  const n = Number(v) || 0;
  if (unidad === 'euros') return `${n.toLocaleString('es-ES')} €`;
  if (unidad === 'porcentaje') return `${n} %`;
  if (unidad === 'horas') return `${n} h`;
  return String(n);
};

export default function TarifasEditables() {
  const { role } = useAuth();
  const puedeEditar = can.verEconomico(role) && ['superadmin', 'admin'].includes(role);

  const [filas, setFilas] = useState(null);
  const [borrador, setBorrador] = useState({});
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [historico, setHistorico] = useState([]);

  const cargar = async () => {
    const [r, hist] = await Promise.all([
      listTable('reglas_comerciales').catch(() => null),
      listTable('reglas_comerciales_historico').catch(() => []),
    ]);
    setFilas(r);
    setHistorico((hist || []).sort((a, b) => String(b.cuando).localeCompare(String(a.cuando))).slice(0, 8));
  };
  useEffect(() => { cargar(); }, []);

  const porGrupo = useMemo(() => {
    const m = {};
    for (const f of filas || []) (m[f.grupo || 'general'] ||= []).push(f);
    for (const g of Object.keys(m)) m[g].sort((a, b) => (a.orden || 0) - (b.orden || 0));
    return m;
  }, [filas]);

  const cambios = Object.entries(borrador).filter(([k, v]) => {
    const f = (filas || []).find((x) => x.clave === k);
    return f && String(v) !== String(f.valor) && v !== '';
  });

  async function guardar() {
    setOcupado(true); setMsg(null);
    const fallos = [];
    for (const [clave, valor] of cambios) {
      const f = filas.find((x) => x.clave === clave);
      const n = Number(valor);
      // Los topes evitan el error de tecleo que se propaga a todas las ofertas.
      if (!Number.isFinite(n)
        || (f.minimo != null && n < Number(f.minimo))
        || (f.maximo != null && n > Number(f.maximo))) {
        fallos.push(`${f.etiqueta}: fuera de ${f.minimo}–${f.maximo}`);
        continue;
      }
      try { await updateRow('reglas_comerciales', clave, { valor: n }, 'clave'); }
      catch (e) { fallos.push(`${f.etiqueta}: ${explicarErrorBd(e, 'reglas_comerciales')}`); }
    }
    setBorrador({});
    olvidarReglas();          // el motor vuelve a leerlas
    await cargar();
    setOcupado(false);
    setMsg(fallos.length
      ? { err: true, t: fallos.join(' · ') }
      : { err: false, t: 'Guardado. Las ofertas nuevas usan ya estos valores.' });
  }

  if (filas === null) {
    return (
      <div className="card">
        <h3 className="text-[15px] font-extrabold text-[#EAF4F7]">Tarifas y reglas de precio</h3>
        <p className="mt-1.5 text-[13px] font-bold text-amber-200">
          Falta aplicar la migración v112 en Supabase.
        </p>
        <p className="mt-1 text-[12.5px] text-[#9FC0CB]">
          Mientras tanto el motor calcula con sus valores internos, así que los precios
          siguen saliendo bien. Estos son:
        </p>
        <ul className="mt-2 grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
          {Object.entries(POR_DEFECTO).map(([k, v]) => (
            <li key={k} className="text-[11.5px] text-[#7FA7B4]">
              {k.replace(/_/g, ' ')}: <b className="text-[#CFE3E9]">{v}</b>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-extrabold text-[#EAF4F7]">Tarifas y reglas de precio</h3>
          <p className="mt-0.5 text-[12px] text-[#9FC0CB]">
            De aquí sale el precio de cada oferta.
            {puedeEditar
              ? ' Un cambio afecta a las que se preparen a partir de ahora; las ya emitidas no se tocan.'
              : ' Las modifica Administración.'}
          </p>
        </div>
        {cambios.length > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={() => setBorrador({})} className="btn-ghost !px-3 !py-1.5 text-[13px]">Descartar</button>
            <button onClick={guardar} disabled={ocupado} className="btn-orange !px-4 !py-1.5 text-[13px] disabled:opacity-50">
              {ocupado ? 'Guardando…' : `Guardar ${cambios.length} cambio${cambios.length === 1 ? '' : 's'}`}
            </button>
          </div>
        )}
      </div>

      {msg && (
        <p className={`rounded-lg px-3 py-2 text-[12.5px] font-bold ${msg.err ? 'bg-red-500/12 text-red-200' : 'bg-emerald-500/12 text-emerald-200'}`}>
          {msg.t}
        </p>
      )}

      {GRUPOS.filter(([g]) => porGrupo[g]?.length).map(([g, etq, nota]) => (
        <div key={g}>
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-brand-orange">{etq}</p>
          {nota && <p className="mb-1.5 text-[11.5px] text-[#7FA7B4]">{nota}</p>}
          <ul className="divide-y divide-[#153F52]">
            {porGrupo[g].map((f) => {
              const tocado = borrador[f.clave] != null && String(borrador[f.clave]) !== String(f.valor);
              return (
                <li key={f.clave} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold text-[#EAF4F7]">{f.etiqueta}</span>
                    {f.descripcion && (
                      <span className="block text-[11px] leading-snug text-[#7FA7B4]">{f.descripcion}</span>
                    )}
                  </span>
                  {puedeEditar ? (
                    <span className="flex items-center gap-1.5">
                      <input type="number" step="0.5"
                        min={f.minimo ?? undefined} max={f.maximo ?? undefined}
                        className={`input !h-8 !w-24 !py-0 text-right !text-[13px] ${tocado ? '!border-brand-orange' : ''}`}
                        value={borrador[f.clave] ?? f.valor}
                        onChange={(e) => setBorrador({ ...borrador, [f.clave]: e.target.value })} />
                      <span className="w-6 text-[11.5px] text-[#7FA7B4]">
                        {f.unidad === 'euros' ? '€' : f.unidad === 'porcentaje' ? '%' : f.unidad === 'horas' ? 'h' : ''}
                      </span>
                    </span>
                  ) : (
                    <span className="text-[13px] font-bold text-[#CFE3E9]">{fmt(f.valor, f.unidad)}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {/* Rastro de cambios: si dentro de seis meses una oferta parece rara, hay
          que poder ver qué valía esa regla y quién la cambió. */}
      {historico.length > 0 && (
        <details className="rounded-xl border border-[#1E5468] px-3 py-2">
          <summary className="cursor-pointer text-[12px] font-bold text-[#7FA7B4]">
            Últimos cambios ({historico.length})
          </summary>
          <ul className="mt-1.5 space-y-0.5">
            {historico.map((x) => (
              <li key={x.id} className="text-[11.5px] text-[#9FC0CB]">
                {new Date(x.cuando).toLocaleDateString('es-ES')} ·{' '}
                <b className="text-[#CFE3E9]">{x.clave.replace(/_/g, ' ')}</b>{' '}
                {x.valor_antes} → <b className="text-brand-orange">{x.valor_nuevo}</b>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
