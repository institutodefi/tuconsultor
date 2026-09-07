import { useEffect, useState } from 'react';
import { updateRow, listTable } from '../lib/data.js';
import { normalizarSubtareas, marcarSubtarea, progresoChecklist } from '../lib/subtareas.js';

// ════════════════════════════════════════════════════════════════════════════
// CHECKLIST DE UNA TAREA DE PROYECTO
//
// La definición y las subtareas que la tarea heredó del catálogo (Sistemas de
// gestión), marcables una a una. Cada marca se guarda al momento en
// cliente_tareas.subtareas, con la fecha. Quien lleva el proyecto puede
// añadir pasos propios de este cliente; no cambian el catálogo.
//
// Carga la fila por su id si no se le pasa entera: así sirve desde el panel
// del proyecto, desde la agenda del consultor y desde donde haga falta.
// ════════════════════════════════════════════════════════════════════════════

const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fmt = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '');

export default function ChecklistTarea({ tareaId, tarea = null, editable = true, compacto = false, onCambio }) {
  const [fila, setFila] = useState(tarea && tarea.subtareas !== undefined ? tarea : null);
  const [lista, setLista] = useState(normalizarSubtareas(tarea?.subtareas));
  const [definicion, setDefinicion] = useState(tarea?.definicion || '');
  const [editandoDef, setEditandoDef] = useState(false);
  const [nueva, setNueva] = useState('');
  const [editando, setEditando] = useState(null);   // {i, texto}
  const [ocupado, setOcupado] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (fila || !tareaId) return;
    listTable('cliente_tareas').then((ts) => {
      const t = (ts || []).find((x) => String(x.id) === String(tareaId));
      if (t) { setFila(t); setLista(normalizarSubtareas(t.subtareas)); setDefinicion(t.definicion || ''); }
      else setFila({ id: tareaId, subtareas: [] });
    }).catch(() => setFila({ id: tareaId, subtareas: [] }));
  }, [tareaId, fila]);

  const id = fila?.id || tareaId;
  const p = progresoChecklist(lista);

  async function guardar(nuevaLista, nuevaDef = definicion) {
    const antes = lista;
    setLista(nuevaLista); setOcupado(true); setErr(null);
    try {
      await updateRow('cliente_tareas', id, { subtareas: nuevaLista, definicion: nuevaDef?.trim() || null });
      onCambio?.({ subtareas: nuevaLista, definicion: nuevaDef });
    } catch (e) { setLista(antes); setErr(`No se pudo guardar: ${e?.message || e}`); }
    finally { setOcupado(false); }
  }

  const marcar = (i, hecha) => guardar(marcarSubtarea(lista, i, hecha, hoyISO()));
  const anadir = () => { const t = nueva.trim(); if (!t) return; setNueva(''); guardar([...lista, { texto: t, hecha: false, fecha: null }]); };
  const quitar = (i) => guardar(lista.filter((_, j) => j !== i));
  const renombrar = () => { if (!editando) return; const t = editando.texto.trim(); const i = editando.i; setEditando(null); if (!t) return; guardar(lista.map((x, j) => (j === i ? { ...x, texto: t } : x))); };

  if (!fila) return <p className="text-[12px] text-[#7FA7B4]">Cargando checklist…</p>;
  if (!lista.length && !definicion && !editable) return null;

  return (
    <div className={`rounded-xl border border-[#1E5468] bg-[#0B2E3D] ${compacto ? 'p-2.5' : 'p-3'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#9FC0CB]">
          Qué hay que hacer
          {p.total > 0 && <span className={`ml-2 chip !px-1.5 !py-0 text-[10px] ${p.completa ? 'bg-emerald-500/20 text-emerald-200' : 'bg-[#123F52] text-[#9FC0CB]'}`}>{p.hechas}/{p.total}{p.completa ? ' · completa' : ''}</span>}
        </p>
        {p.total > 0 && (
          <span className="block h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full rounded-full bg-brand-verde transition-all" style={{ width: `${p.pct || 0}%` }} />
          </span>
        )}
      </div>

      {/* Definición */}
      {editandoDef ? (
        <div className="mt-2">
          <textarea className="input min-h-[72px] !text-[12.5px]" value={definicion} onChange={(e) => setDefinicion(e.target.value)} placeholder="Definición de la tarea para este cliente" />
          <div className="mt-1 flex gap-2">
            <button onClick={() => { setEditandoDef(false); guardar(lista, definicion); }} className="btn-orange !px-3 !py-1 text-[12px]">Guardar</button>
            <button onClick={() => { setEditandoDef(false); setDefinicion(fila.definicion || ''); }} className="btn-ghost !px-3 !py-1 text-[12px]">Cancelar</button>
          </div>
        </div>
      ) : definicion ? (
        <p className="mt-1.5 whitespace-pre-line text-[12.5px] leading-snug text-[#DFF1F5]">
          {definicion}{editable && <button onClick={() => setEditandoDef(true)} className="ml-2 text-[11px] font-bold text-[#7FA7B4] hover:text-brand-orange">✎</button>}
        </p>
      ) : editable && !compacto ? (
        <button onClick={() => setEditandoDef(true)} className="mt-1.5 text-[11.5px] font-bold text-[#7FA7B4] hover:text-brand-orange">+ Añadir definición</button>
      ) : null}

      {/* Subtareas */}
      {lista.length > 0 && (
        <ul className="mt-2 space-y-1">
          {lista.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[#22C55E]" checked={!!s.hecha} disabled={!editable || ocupado}
                onChange={(e) => marcar(i, e.target.checked)} aria-label={s.texto} />
              {editando?.i === i ? (
                <input autoFocus className="input min-w-0 flex-1 !py-0.5 !text-[12.5px]" value={editando.texto}
                  onChange={(e) => setEditando({ i, texto: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); renombrar(); } if (e.key === 'Escape') setEditando(null); }}
                  onBlur={renombrar} />
              ) : (
                <span className={`min-w-0 flex-1 text-[12.5px] leading-snug ${s.hecha ? 'text-[#7FA7B4] line-through' : 'text-[#EAF4F7]'}`}
                  onDoubleClick={() => editable && setEditando({ i, texto: s.texto })} title={editable ? 'Doble clic para editar' : ''}>
                  {s.texto}{s.hecha && s.fecha && <span className="ml-1.5 text-[10.5px] no-underline text-[#5E8494]">{fmt(s.fecha)}</span>}
                </span>
              )}
              {editable && editando?.i !== i && <button onClick={() => setEditando({ i, texto: s.texto })} className="shrink-0 text-[11px] text-[#7FA7B4] hover:text-brand-orange" title="Editar el texto">✎</button>}
              {editable && <button onClick={() => quitar(i)} className="shrink-0 text-[11px] text-red-300/60 hover:text-red-300" title="Quitar de esta tarea">×</button>}
            </li>
          ))}
        </ul>
      )}
      {!lista.length && !compacto && <p className="mt-1.5 text-[12px] text-[#7FA7B4]">Sin subtareas{editable ? ': añade los pasos de esta tarea, o defínelos en Sistemas de gestión para que lleguen a todos los proyectos' : ''}.</p>}

      {editable && (
        <div className="mt-2 flex gap-1.5">
          <input className="input !py-1 !text-[12px]" placeholder="Añadir un paso para este cliente… (Intro)" value={nueva}
            onChange={(e) => setNueva(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); anadir(); } }} />
          <button type="button" onClick={anadir} className="btn-ghost shrink-0 !px-2.5 !py-1 text-[12px]">+</button>
        </div>
      )}
      {err && <p className="mt-1.5 text-[11.5px] font-bold text-red-300">{err}</p>}
    </div>
  );
}
