import { useState } from 'react';
import { listTable, updateRow } from '../lib/data.js';
import { cambiosFila } from '../lib/capitalizar.js';

// ════════════════════════════════════════════════════════════════════════════
// MAYÚSCULAS Y MINÚSCULAS · revisar y arreglar lo que ya está en la base (v137)
//
// Lo nuevo entra limpio (lib/capitalizar.js). Esto es para lo que ya había:
// enseña qué cambiaría en cada fila, se desmarca lo que no convenga y se
// aplica. Las reglas son las mismas que al guardar, así que aplicar dos veces
// no cambia nada la segunda.
// ════════════════════════════════════════════════════════════════════════════

const TABLAS = [['empresas', 'Empresas'], ['contactos', 'Contactos'], ['clientes', 'Clientes'], ['presupuestos', 'Ofertas']];
const ETIQUETA = (t, f) => t === 'empresas' ? (f.nombre_comercial || f.nombre) : t === 'contactos' ? `${f.nombre || ''} ${f.apellidos || ''}`.trim() : t === 'clientes' ? f.empresa : (f.numero_oferta || f.empresa);

export default function LimpiezaMayusculas({ onCambio }) {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [lista, setLista] = useState(null);      // [{tabla, id, etiqueta, cambios:[[campo, antes, despues]]}]
  const [fuera, setFuera] = useState(() => new Set());
  const [msg, setMsg] = useState(null);

  async function revisar() {
    setCargando(true); setMsg(null); setFuera(new Set());
    try {
      const out = [];
      for (const [tabla] of TABLAS) {
        const filas = await listTable(tabla).catch(() => []);
        for (const f of filas) {
          const cambios = cambiosFila(tabla, f);
          if (cambios.length) out.push({ tabla, id: f.id, etiqueta: ETIQUETA(tabla, f), cambios });
        }
      }
      setLista(out);
      if (!out.length) setMsg({ err: false, t: 'Todo está ya como debe: nada que cambiar.' });
    } catch (e) { setMsg({ err: true, t: String(e?.message || e) }); }
    finally { setCargando(false); }
  }

  async function aplicar() {
    if (!lista) return;
    setCargando(true); setMsg(null);
    let hechas = 0; let fallos = 0;
    for (const fila of lista) {
      if (fuera.has(`${fila.tabla}:${fila.id}`)) continue;
      const patch = Object.fromEntries(fila.cambios.map(([k, , v]) => [k, v]));
      try { await updateRow(fila.tabla, fila.id, patch); hechas += 1; } catch { fallos += 1; }
    }
    setCargando(false);
    setMsg({ err: fallos > 0, t: `${hechas} fila${hechas === 1 ? '' : 's'} corregida${hechas === 1 ? '' : 's'}${fallos ? ` · ${fallos} no se pudieron guardar` : ''}.` });
    setLista(null);
    onCambio?.();
  }

  const toggle = (k) => setFuera((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const pendientes = lista ? lista.filter((f) => !fuera.has(`${f.tabla}:${f.id}`)).length : 0;

  return (
    <div>
      <button type="button" onClick={() => { setAbierto((v) => !v); if (!abierto && !lista) revisar(); }} className="btn-ghost !px-3 !py-1.5 text-xs" title="Razones sociales, nombres, correos y CIF con una sola forma">
        Aa Mayúsculas
      </button>
      {abierto && (
        <div className="mt-2 space-y-2 rounded-xl border border-[#1E5468] bg-[#0D3242] p-3">
          <p className="text-[11.5px] leading-relaxed text-[#7FA7B4]">
            Lo escrito todo en mayúsculas (o todo en minúsculas) pasa a «Nombre Propio»; siglas, formas jurídicas (SL, S.A.) y lo ya escrito con mezcla se respetan. Correos en minúsculas y CIF en mayúsculas. Desmarca lo que no quieras tocar.
          </p>
          {cargando && <p className="text-[12px] font-bold text-[#9FC0CB]">{lista ? 'Aplicando…' : 'Revisando…'}</p>}
          {lista && lista.length > 0 && (
            <>
              <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                {TABLAS.filter(([t]) => lista.some((f) => f.tabla === t)).map(([t, l]) => (
                  <div key={t}>
                    <p className="mt-1 text-[10.5px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{l} · {lista.filter((f) => f.tabla === t).length}</p>
                    {lista.filter((f) => f.tabla === t).map((f) => {
                      const k = `${f.tabla}:${f.id}`;
                      return (
                        <label key={k} className={`flex items-start gap-2 rounded-lg px-2 py-1 text-[11.5px] hover:bg-white/5 ${fuera.has(k) ? 'opacity-50' : ''}`}>
                          <input type="checkbox" className="mt-0.5" checked={!fuera.has(k)} onChange={() => toggle(k)} />
                          <span className="min-w-0">
                            {f.cambios.map(([campo, antes, despues]) => (
                              <span key={campo} className="block truncate"><span className="text-[#7FA7B4]">{campo}:</span> <s className="text-[#7FA7B4]">{antes}</s> → <b className="text-[#EAF4F7]">{despues}</b></span>
                            ))}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={aplicar} disabled={cargando || !pendientes} className="btn-orange !px-3 !py-1.5 text-xs disabled:opacity-50">Corregir {pendientes} fila{pendientes === 1 ? '' : 's'}</button>
                <button type="button" onClick={revisar} disabled={cargando} className="text-[11px] font-bold text-[#9FC0CB] hover:text-[#EAF4F7]">volver a revisar</button>
              </div>
            </>
          )}
          {lista && !lista.length && !msg && <p className="text-[12px] text-[#9FC0CB]">Nada que cambiar.</p>}
          {msg && <p className={`text-[12px] font-bold ${msg.err ? 'text-red-300' : 'text-emerald-300'}`}>{msg.t}</p>}
          {!lista && !cargando && <button type="button" onClick={revisar} className="text-[11px] font-bold text-brand-orange hover:underline">Revisar ahora</button>}
        </div>
      )}
    </div>
  );
}
