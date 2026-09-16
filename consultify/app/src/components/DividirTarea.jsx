import { useMemo, useState } from 'react';
import DialogoFicha from './DialogoFicha.jsx';
import { planDivision } from '../lib/tareasHoras.js';

// ════════════════════════════════════════════════════════════════════════════
// DIVIDIR UNA TAREA ENTRE VARIAS PERSONAS (v142)
//
// Una tarea tiene un responsable. Cuando la van a hacer dos o tres personas,
// se parte: cada una se queda con su trozo de horas, con su propio
// responsable, su propio calendario de sesiones y su propio control de horas.
// El total de horas teóricas no cambia: se reparte.
//
// Se elige a la gente del proyecto y cuántas horas lleva cada uno (por defecto
// a partes iguales). La original se queda con la primera persona; las demás
// son copias con el mismo código y un sufijo (.1, .2, .3).
// ════════════════════════════════════════════════════════════════════════════

const r1 = (x) => Math.round(x * 10) / 10;

export default function DividirTarea({ tarea, titulo, teoricas, gente = [], onCerrar, onDividir }) {
  const [sel, setSel] = useState(() => {
    const ids = gente.slice(0, 2).map((g) => String(g.id));
    if (tarea?.consultor_id && !ids.includes(String(tarea.consultor_id))) ids[0] = String(tarea.consultor_id);
    return ids;
  });
  const [horas, setHoras] = useState({});     // perfil_id → horas escritas a mano
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);

  // Reparto: lo escrito a mano manda; el resto se reparte a partes iguales
  // de lo que queda.
  const reparto = useMemo(() => {
    const manual = sel.filter((id) => horas[id] !== undefined && horas[id] !== '');
    const sumaManual = manual.reduce((a, id) => a + (Number(horas[id]) || 0), 0);
    const libres = sel.filter((id) => !manual.includes(id));
    const resto = Math.max(0, teoricas - sumaManual);
    return sel.map((id) => ({ perfil_id: id, horas: manual.includes(id) ? (Number(horas[id]) || 0) : (libres.length ? r1(resto / libres.length) : 0) }));
  }, [sel, horas, teoricas]);
  const suma = r1(reparto.reduce((a, r) => a + r.horas, 0));
  const cuadra = Math.abs(suma - teoricas) < 0.06 && reparto.every((r) => r.horas > 0);
  const nombre = (id) => { const g = gente.find((x) => String(x.id) === String(id)); return g ? `${g.nombre}${g.nivel ? ` · ${g.nivel}` : ''}` : id; };

  function alternar(id) {
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    setHoras((h) => { const n = { ...h }; delete n[id]; return n; });
  }

  async function confirmar() {
    if (sel.length < 2) { setError('Elige al menos a dos personas.'); return; }
    if (!cuadra) { setError(`Las horas tienen que sumar ${teoricas} h y ser mayores que cero (ahora suman ${suma} h).`); return; }
    const plan = planDivision(tarea, teoricas, reparto);
    if (!plan) { setError('No se pudo calcular el reparto.'); return; }
    setOcupado(true); setError(null);
    try { await onDividir(plan); onCerrar(); } catch (e) { setError(String(e?.message || e)); }
    finally { setOcupado(false); }
  }

  return (
    <DialogoFicha titulo="Dividir la tarea entre varias personas" subtitulo={`${titulo} · ${teoricas} h teóricas`} onCerrar={onCerrar} ancho="560px"
      pie={<>
        <button type="button" onClick={onCerrar} className="btn-ghost !px-4 !py-1.5 text-[13px]">Cancelar</button>
        <button type="button" onClick={confirmar} disabled={ocupado || sel.length < 2 || !cuadra} className="btn-orange !px-4 !py-1.5 text-[13px] disabled:opacity-50">{ocupado ? 'Dividiendo…' : `Dividir en ${sel.length} partes`}</button>
      </>}>
      <div className="space-y-3 text-[12.5px]">
        <p className="text-[#9FC0CB]">Marca quién la hace y cuántas horas lleva cada uno. El total no cambia: se reparte. Cada parte tendrá su responsable, su calendario de sesiones y su control de horas.</p>
        {gente.length < 2 && <p className="rounded-lg bg-brand-orange/10 px-3 py-2 text-[12px] text-brand-orange">Hace falta más gente en el equipo del proyecto: añádela en «Equipo» y vuelve aquí.</p>}
        <div className="space-y-1.5">
          {gente.map((g) => {
            const id = String(g.id); const on = sel.includes(id);
            const r = reparto.find((x) => x.perfil_id === id);
            return (
              <label key={id} className={`flex cursor-pointer flex-wrap items-center gap-2 rounded-lg border px-3 py-2 ${on ? 'border-brand-orange/50 bg-brand-orange/[0.06]' : 'border-[#1E5468] bg-[#0B2E3D]'}`}>
                <input type="checkbox" checked={on} onChange={() => alternar(id)} />
                <span className="min-w-0 flex-1 font-bold text-[#EAF4F7]">{nombre(id)}{String(tarea?.consultor_id) === id && <span className="ml-1.5 text-[10.5px] font-semibold text-[#9FC0CB]">responsable actual</span>}</span>
                {on && (
                  <span className="flex items-center gap-1.5">
                    <input type="number" min="0" step="0.5" className="input !w-20 !px-2 !py-0.5 text-right !text-[12.5px]" value={horas[id] ?? ''} placeholder={String(r?.horas ?? 0)}
                      onChange={(e) => setHoras({ ...horas, [id]: e.target.value })} title="Horas de esta parte. Vacío: a partes iguales de lo que quede." />
                    <span className="text-[11px] text-[#7FA7B4]">h · {teoricas > 0 && r ? Math.round((r.horas / teoricas) * 100) : 0} %</span>
                  </span>
                )}
              </label>
            );
          })}
        </div>
        <p className={`text-[12px] font-bold ${cuadra ? 'text-emerald-300' : 'text-amber-200'}`}>Suman {suma} h de {teoricas} h{cuadra ? ' · cuadra' : ' · tienen que sumar el total'}</p>
        {error && <p className="rounded-lg bg-red-500/12 px-3 py-2 text-[12px] font-bold text-red-200">{error}</p>}
        <p className="text-[11px] text-[#7FA7B4]">Las sesiones ya programadas se quedan en la parte de la primera persona. Si te equivocas, «Deshacer la división» junta las partes que no tengan sesiones.</p>
      </div>
    </DialogoFicha>
  );
}
