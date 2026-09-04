import { useEffect, useMemo, useState } from 'react';
import { listTable, insertRow, deleteRow } from '../lib/data.js';

// ════════════════════════════════════════════════════════════════════════════
// QUÉ NOS PRESTA CADA PROVEEDOR
//
// De una lista cerrada, no escrito a mano. Escribiéndolo acabas con
// «Formación», «formacion» y «Form.» como tres cosas distintas, y entonces no
// puedes responder a «¿quién nos da formación?», que es justo para lo que sirve.
//
// Los críticos van marcados: son los que influyen en lo que recibe el cliente
// final, y la 9001 pide controlarlos más de cerca.
// ════════════════════════════════════════════════════════════════════════════

export default function ServiciosProveedor({ empresa, puedeEditar }) {
  const [tipos, setTipos] = useState([]);
  const [mios, setMios] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [msg, setMsg] = useState(null);

  const cargar = () => Promise.all([
    listTable('tipos_servicio').catch(() => []),
    listTable('empresa_servicios').catch(() => []),
  ]).then(([t, e]) => {
    setTipos((t || []).filter((x) => x.activo !== false).sort((a, b) => (a.orden || 0) - (b.orden || 0)));
    setMios((e || []).filter((x) => String(x.empresa_id) === String(empresa?.id)));
  });

  useEffect(() => { if (empresa?.id) cargar(); }, [empresa?.id]);

  const porFamilia = useMemo(() => {
    const m = new Map();
    for (const t of tipos) {
      if (!m.has(t.familia)) m.set(t.familia, []);
      m.get(t.familia).push(t);
    }
    return [...m.entries()];
  }, [tipos]);

  const tiene = (id) => mios.some((x) => x.servicio_id === id);

  async function alternar(t) {
    try {
      const ya = mios.find((x) => x.servicio_id === t.id);
      if (ya) await deleteRow('empresa_servicios', ya.id);
      else await insertRow('empresa_servicios', { empresa_id: empresa.id, servicio_id: t.id });
      await cargar(); setMsg(null);
    } catch (e) { setMsg({ err: true, t: `${e?.message || e}` }); }
  }

  if (!empresa?.id) return null;
  const puestos = mios.map((x) => tipos.find((t) => t.id === x.servicio_id)).filter(Boolean);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {puestos.length === 0 && <span className="text-[12px] text-[#7FA7B4]">Sin servicios asignados.</span>}
        {puestos.map((t) => (
          <span key={t.id}
            className={`chip !px-2 !py-0.5 text-[11px] font-bold ${
              t.critico ? 'bg-brand-orange/15 text-brand-orange' : 'bg-white/8 text-[#9FC0CB]'}`}
            title={t.critico ? 'Crítico: influye en lo que recibe el cliente final' : t.familia}>
            {t.critico && '● '}{t.nombre}
          </span>
        ))}
        {puedeEditar && (
          <button type="button" onClick={() => setAbierto((v) => !v)}
            className="text-[11.5px] font-bold text-brand-orange hover:underline">
            {abierto ? 'Cerrar' : puestos.length ? 'Cambiar' : '+ Añadir servicios'}
          </button>
        )}
      </div>

      {msg && <p className="text-[11.5px] font-bold text-red-300">{msg.t}</p>}

      {abierto && puedeEditar && (
        <div className="space-y-3 rounded-xl bg-[#0D3242] p-3">
          <p className="text-[11px] text-[#7FA7B4]">
            <span className="text-brand-orange">●</span> Crítico: influye en lo que recibe el cliente final.
            La ISO 9001 pide controlarlos más de cerca.
          </p>
          {porFamilia.map(([familia, ts]) => (
            <div key={familia}>
              <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{familia}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {ts.map((t) => {
                  const on = tiene(t.id);
                  return (
                    <button key={t.id} type="button" onClick={() => alternar(t)}
                      className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-bold transition ${
                        on ? 'border-brand-verde bg-brand-verde/15 text-brand-verdeTexto'
                           : 'border-[#1E5468] text-[#9FC0CB] hover:border-brand-verde/60'}`}>
                      {on ? '✓ ' : ''}{t.critico && !on ? '● ' : ''}{t.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
