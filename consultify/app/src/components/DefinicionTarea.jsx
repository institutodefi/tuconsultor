import { useState } from 'react';
import DialogoFicha from './DialogoFicha.jsx';
import { normalizarSubtareas } from '../lib/subtareas.js';
import { normalizarEvidencias } from '../lib/evidencias.js';

// ════════════════════════════════════════════════════════════════════════════
// LA FICHA DE UN SUBPROCESO DEL CATÁLOGO · el popup de Sistemas de gestión
//
// Cuatro cosas, y cada una responde a una pregunta distinta:
//
//   Definición  · qué es esta tarea
//   Subtareas   · de qué pasos se compone (se marcan en el proyecto)
//   Evidencias  · qué hay que poder ENSEÑAR cuando venga el auditor
//   Entradas y salidas · de dónde viene el trabajo y qué deja hecho
//
// Subtareas y evidencias se parecen en la forma y no en lo que significan: una
// subtarea es trabajo que se hace; una evidencia es un documento que tiene que
// existir, estar vigente y responder a un requisito. Por eso van separadas.
//
// Se guarda en TODAS las filas de modelo del subproceso: la ficha es de la
// tarea, no del modelo. Lo que cambia por modelo son las horas, y eso se edita
// en la tabla.
//
// «Guardar y llevar a proyectos abiertos» además actualiza las tareas vivas
// que nacieron de esta fila: la checklist se mezcla (lo ya marcado sigue
// marcado) y las evidencias también (lo aportado no se tira nunca).
// ════════════════════════════════════════════════════════════════════════════

const PESTANAS = [
  ['definicion', 'Definición'],
  ['subtareas', 'Subtareas'],
  ['evidencias', 'Evidencias'],
  ['flujo', 'Entradas y salidas'],
];

export default function DefinicionTarea({
  grupo, norma, definicion = '', subtareas = [], evidencias = [], entradas = '', salidas = '',
  esBase = false, editable = true, onGuardar, onCerrar,
}) {
  const [pestana, setPestana] = useState('definicion');
  const [def, setDef] = useState(definicion || '');
  const [lista, setLista] = useState(normalizarSubtareas(subtareas).map((x) => x.texto));
  const [evs, setEvs] = useState(normalizarEvidencias(evidencias));
  const [ent, setEnt] = useState(entradas || '');
  const [sal, setSal] = useState(salidas || '');
  const [nueva, setNueva] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState(null);

  const mismo = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  // Con la propuesta base sin fijar, guardar siempre tiene sentido: la deja escrita en el catálogo.
  const cambiado = esBase
    || def !== (definicion || '')
    || ent !== (entradas || '') || sal !== (salidas || '')
    || !mismo(lista, normalizarSubtareas(subtareas).map((x) => x.texto))
    || !mismo(evs, normalizarEvidencias(evidencias));

  // ── Subtareas ──
  const anadir = () => { const t = nueva.trim(); if (!t) return; setLista((l) => [...l, t]); setNueva(''); };
  const mover = (i, d) => setLista((l) => { const j = i + d; if (j < 0 || j >= l.length) return l; const c = [...l]; [c[i], c[j]] = [c[j], c[i]]; return c; });
  const quitar = (i) => setLista((l) => l.filter((_, j) => j !== i));
  const editar = (i, v) => setLista((l) => l.map((x, j) => (j === i ? v : x)));

  // ── Evidencias ──
  const evAnadir = () => setEvs((l) => [...l, { titulo: '', definicion: '', requisito: '', obligatoria: true }]);
  const evEditar = (i, campo, v) => setEvs((l) => l.map((x, j) => (j === i ? { ...x, [campo]: v } : x)));
  const evQuitar = (i) => setEvs((l) => l.filter((_, j) => j !== i));
  const evMover = (i, d) => setEvs((l) => { const j = i + d; if (j < 0 || j >= l.length) return l; const c = [...l]; [c[i], c[j]] = [c[j], c[i]]; return c; });

  async function guardar(llevar) {
    setOcupado(true); setMsg(null);
    try {
      const r = await onGuardar({
        definicion: def.trim() || null,
        subtareas: lista.map((t) => t.trim()).filter(Boolean).map((texto) => ({ texto })),
        evidencias: normalizarEvidencias(evs),
        entradas: ent.trim() || null,
        salidas: sal.trim() || null,
        llevar,
      });
      setMsg(r?.mensaje || 'Guardado.');
      if (r?.cerrar !== false) onCerrar?.();
    } catch (e) { setMsg(`No se pudo guardar: ${e?.message || e}`); }
    finally { setOcupado(false); }
  }

  const cuenta = { subtareas: lista.length, evidencias: evs.length };

  return (
    <DialogoFicha
      titulo={grupo?.subproceso || 'Tarea'}
      subtitulo={[norma, grupo?.proceso].filter(Boolean).join(' · ')}
      onCerrar={onCerrar}
      ancho="760px"
      haycambios={cambiado}
      pie={editable ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {msg && <span className="mr-auto text-[12px] font-bold text-[#9FC0CB]">{msg}</span>}
          <button onClick={onCerrar} className="btn-ghost !px-3 !py-1.5 text-[13px]">Cancelar</button>
          <button onClick={() => guardar(false)} disabled={ocupado || !cambiado} className="btn-ghost !px-3 !py-1.5 text-[13px] disabled:opacity-50">Guardar en el catálogo</button>
          <button onClick={() => guardar(true)} disabled={ocupado} className="btn-orange !px-4 !py-1.5 text-[13px] disabled:opacity-50"
            title="Guarda en el catálogo y actualiza la definición, la checklist y las evidencias de las tareas de los proyectos abiertos que nacen de esta">
            {ocupado ? 'Guardando…' : 'Guardar y llevar a proyectos abiertos'}
          </button>
        </div>
      ) : <button onClick={onCerrar} className="btn-orange !px-4 !py-1.5 text-[13px]">Cerrar</button>}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap overflow-hidden rounded-xl border border-[#1E5468] text-[11.5px] font-bold">
          {PESTANAS.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setPestana(k)}
              className={`px-3 py-1.5 ${pestana === k ? 'bg-brand-verde text-[#061F2B]' : 'text-[#9FC0CB] hover:text-[#EAF4F7]'}`}>
              {l}{cuenta[k] ? ` (${cuenta[k]})` : ''}
            </button>
          ))}
        </div>

        {pestana === 'definicion' && (
          <div>
            <label className="label" htmlFor="dt-def">Definición de la tarea</label>
            <textarea id="dt-def" className="input min-h-[140px] !text-[13px]" readOnly={!editable} value={def}
              placeholder="Qué es esta tarea, qué se revisa o se entrega, y qué deja hecho en el sistema."
              onChange={(e) => setDef(e.target.value)} />
            <p className="campo-nota">Se copia a la tarea de cada proyecto al volcarla; allí se puede matizar.</p>
          </div>
        )}

        {pestana === 'subtareas' && (
          <div>
            <p className="label">La checklist ({lista.length})</p>
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
        )}

        {pestana === 'evidencias' && (
          <div>
            <p className="label">Lo que hay que poder enseñar ({evs.length})</p>
            <p className="campo-nota mb-2">
              Una evidencia no es una subtarea: es un documento que tiene que existir, estar vigente y responder a un requisito.
              Se heredan al programar el proyecto y allí se adaptan, se aportan y se revisan.
            </p>
            {evs.length === 0 && (
              <p className="rounded-lg border border-dashed border-[#1E5468] px-3 py-2.5 text-[12px] text-[#7FA7B4]">
                Sin evidencias. Si en la auditoría de este subproceso hay que enseñar algo —un acta, un registro, un procedimiento firmado—, va aquí.
              </p>
            )}
            <div className="space-y-2">
              {evs.map((e, i) => (
                <div key={i} className="rounded-lg border border-[#1E5468] bg-[#0A2B3A] p-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 shrink-0 text-right text-[11px] font-bold text-[#7FA7B4]">{i + 1}.</span>
                    <input className="input !py-1 !text-[12.5px]" readOnly={!editable} value={e.titulo} placeholder="Acta de la revisión por la dirección"
                      onChange={(ev) => evEditar(i, 'titulo', ev.target.value)} />
                    {editable && (
                      <span className="flex shrink-0 gap-0.5">
                        <button type="button" onClick={() => evMover(i, -1)} disabled={i === 0} className="grid h-6 w-6 place-items-center rounded border border-[#1E5468] text-[11px] text-[#9FC0CB] hover:border-brand-orange disabled:opacity-30" title="Subir">↑</button>
                        <button type="button" onClick={() => evMover(i, 1)} disabled={i === evs.length - 1} className="grid h-6 w-6 place-items-center rounded border border-[#1E5468] text-[11px] text-[#9FC0CB] hover:border-brand-orange disabled:opacity-30" title="Bajar">↓</button>
                        <button type="button" onClick={() => evQuitar(i)} className="grid h-6 w-6 place-items-center rounded border border-[#1E5468] text-[11px] text-red-300/80 hover:border-red-400" title="Quitar">×</button>
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 grid gap-1.5 pl-6 sm:grid-cols-[1fr_120px_auto]">
                    {/* La definición es lo que va a leer la IA para decidir si
                        el documento aportado sirve. Cuanto más concreta, menos
                        discutible el veredicto. */}
                    <input className="input !py-1 !text-[12px]" readOnly={!editable} value={e.definicion} placeholder="Qué tiene que contener para servir: firma, fecha, alcance, acuerdos…"
                      onChange={(ev) => evEditar(i, 'definicion', ev.target.value)} />
                    <input className="input !py-1 !text-[12px]" readOnly={!editable} value={e.requisito} placeholder="Apartado (9.3.3)"
                      onChange={(ev) => evEditar(i, 'requisito', ev.target.value)} />
                    <label className="flex items-center gap-1.5 whitespace-nowrap text-[11.5px] font-bold text-[#9FC0CB]">
                      <input type="checkbox" disabled={!editable} checked={e.obligatoria !== false}
                        onChange={(ev) => evEditar(i, 'obligatoria', ev.target.checked)} />
                      Obligatoria
                    </label>
                  </div>
                </div>
              ))}
            </div>
            {editable && (
              <button type="button" onClick={evAnadir} className="btn-ghost mt-2 !px-3 !py-1.5 text-[12.5px]">+ Añadir evidencia</button>
            )}
          </div>
        )}

        {pestana === 'flujo' && (
          <div className="space-y-3">
            <div>
              <label className="label" htmlFor="dt-ent">Entradas</label>
              <textarea id="dt-ent" className="input min-h-[80px] !text-[13px]" readOnly={!editable} value={ent}
                placeholder="De dónde viene el trabajo: qué información, qué documento o qué proceso anterior lo dispara."
                onChange={(e) => setEnt(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="dt-sal">Salidas</label>
              <textarea id="dt-sal" className="input min-h-[80px] !text-[13px]" readOnly={!editable} value={sal}
                placeholder="Qué deja hecho y quién lo recibe: el proceso siguiente, la dirección, el auditor."
                onChange={(e) => setSal(e.target.value)} />
            </div>
            <p className="campo-nota">Es lo que se ve en la ficha del proceso dentro del mapa de cada cliente.</p>
          </div>
        )}
      </div>
    </DialogoFicha>
  );
}
