import { useState } from 'react';
import DialogoFicha from './DialogoFicha.jsx';
import { normalizarSubtareas } from '../lib/subtareas.js';

// ════════════════════════════════════════════════════════════════════════════
// DEFINICIÓN DE UNA TAREA DEL CATÁLOGO · el popup de Sistemas de gestión
//
// Qué es la tarea (definición) y de qué se compone (subtareas). Es lo que se
// lleva cada proyecto al volcar sus tareas, como checklist marcable. Se abre
// desde la fila de la tarea; guardar escribe en todas las filas de modelo de
// ese subproceso, porque la definición es de la tarea, no del modelo.
//
// «Guardar y llevar a proyectos abiertos» además actualiza las tareas vivas
// que nacieron de esta fila: definición nueva y checklist mezclada (lo ya
// marcado sigue marcado).
// ════════════════════════════════════════════════════════════════════════════

export default function DefinicionTarea({ grupo, norma, definicion = '', subtareas = [], esBase = false, editable = true, onGuardar, onCerrar }) {
  const [def, setDef] = useState(definicion || '');
  const [lista, setLista] = useState(normalizarSubtareas(subtareas).map((x) => x.texto));
  const [nueva, setNueva] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState(null);

  // Con la propuesta base sin fijar, guardar siempre tiene sentido: la deja escrita en el catálogo.
  const cambiado = esBase || def !== (definicion || '') || JSON.stringify(lista) !== JSON.stringify(normalizarSubtareas(subtareas).map((x) => x.texto));

  const anadir = () => { const t = nueva.trim(); if (!t) return; setLista((l) => [...l, t]); setNueva(''); };
  const mover = (i, d) => setLista((l) => { const j = i + d; if (j < 0 || j >= l.length) return l; const c = [...l]; [c[i], c[j]] = [c[j], c[i]]; return c; });
  const quitar = (i) => setLista((l) => l.filter((_, j) => j !== i));
  const editar = (i, v) => setLista((l) => l.map((x, j) => (j === i ? v : x)));

  async function guardar(llevar) {
    setOcupado(true); setMsg(null);
    try {
      const r = await onGuardar({ definicion: def.trim() || null, subtareas: lista.map((t) => t.trim()).filter(Boolean).map((texto) => ({ texto })), llevar });
      setMsg(r?.mensaje || 'Guardado.');
      if (r?.cerrar !== false) onCerrar?.();
    } catch (e) { setMsg(`No se pudo guardar: ${e?.message || e}`); }
    finally { setOcupado(false); }
  }

  return (
    <DialogoFicha
      titulo={grupo?.subproceso || 'Tarea'}
      subtitulo={[norma, grupo?.proceso].filter(Boolean).join(' · ')}
      onCerrar={onCerrar}
      ancho="720px"
      haycambios={cambiado}
      pie={editable ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {msg && <span className="mr-auto text-[12px] font-bold text-[#9FC0CB]">{msg}</span>}
          <button onClick={onCerrar} className="btn-ghost !px-3 !py-1.5 text-[13px]">Cancelar</button>
          <button onClick={() => guardar(false)} disabled={ocupado || !cambiado} className="btn-ghost !px-3 !py-1.5 text-[13px] disabled:opacity-50">Guardar en el catálogo</button>
          <button onClick={() => guardar(true)} disabled={ocupado} className="btn-orange !px-4 !py-1.5 text-[13px] disabled:opacity-50"
            title="Guarda en el catálogo y actualiza la definición y la checklist de las tareas de los proyectos abiertos que nacen de esta">
            {ocupado ? 'Guardando…' : 'Guardar y llevar a proyectos abiertos'}
          </button>
        </div>
      ) : <button onClick={onCerrar} className="btn-orange !px-4 !py-1.5 text-[13px]">Cerrar</button>}
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="dt-def">Definición de la tarea</label>
          <textarea id="dt-def" className="input min-h-[96px] !text-[13px]" readOnly={!editable} value={def}
            placeholder="Qué es esta tarea, qué se revisa o se entrega, y qué evidencia deja en el sistema."
            onChange={(e) => setDef(e.target.value)} />
          <p className="campo-nota">Se copia a la tarea de cada proyecto al volcarla; allí se puede matizar.</p>
        </div>

        <div>
          <p className="label">Subtareas · la checklist ({lista.length})</p>
          {esBase && <p className="mb-1.5 rounded-lg bg-brand-orange/10 px-3 py-1.5 text-[11.5px] text-brand-orange">Propuesta de la estructura base de TuConsultor para este subproceso y esta norma. Retócala si hace falta y guarda para fijarla en el catálogo.</p>}
          {lista.length === 0 && <p className="rounded-lg border border-dashed border-[#1E5468] px-3 py-2.5 text-[12px] text-[#7FA7B4]">Sin subtareas. Añade los pasos en el orden en que se hacen: en el proyecto se marcarán uno a uno.</p>}
          <ol className="space-y-1">
            {lista.map((t, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span className="w-5 shrink-0 text-right text-[11px] font-bold text-[#7FA7B4]">{i + 1}.</span>
                <input className="input !py-1 !text-[12.5px]" readOnly={!editable} value={t} onChange={(e) => editar(i, e.target.value)} />
                {editable && (
                  <span className="flex shrink-0 gap-0.5">
                    <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="grid h-6 w-6 place-items-center rounded border border-[#1E5468] text-[11px] text-[#9FC0CB] hover:border-brand-orange disabled:opacity-30" title="Subir">↑</button>
                    <button type="button" onClick={() => mover(i, 1)} disabled={i === lista.length - 1} className="grid h-6 w-6 place-items-center rounded border border-[#1E5468] text-[11px] text-[#9FC0CB] hover:border-brand-orange disabled:opacity-30" title="Bajar">↓</button>
                    <button type="button" onClick={() => quitar(i)} className="grid h-6 w-6 place-items-center rounded border border-[#1E5468] text-[11px] text-red-300/80 hover:border-red-400" title="Quitar">×</button>
                  </span>
                )}
              </li>
            ))}
          </ol>
          {editable && (
            <div className="mt-2 flex gap-1.5">
              <input className="input !py-1.5 !text-[12.5px]" placeholder="Nueva subtarea… (Intro para añadir)" value={nueva}
                onChange={(e) => setNueva(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); anadir(); } }} />
              <button type="button" onClick={anadir} className="btn-ghost shrink-0 !px-3 !py-1.5 text-[12.5px]">+ Añadir</button>
            </div>
          )}
        </div>
      </div>
    </DialogoFicha>
  );
}
