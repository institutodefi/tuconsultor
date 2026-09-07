import { useEffect, useMemo, useState } from 'react';
import { listTable, insertRow, updateRow, deleteRow, explicarErrorBd } from '../lib/data.js';
import { balanceTarea } from '../lib/sesionesTarea.js';
import { esLaborable, FESTIVOS_2026 } from '../lib/agenda.js';

// ════════════════════════════════════════════════════════════════════════════
// PLANIFICADOR POR ARRASTRE · calendario del proyecto + tareas sin programar
//
// A la izquierda, las tareas del proyecto a las que les faltan horas por
// programar (sin sesiones, o cortas), con su responsable. A la derecha, un
// calendario mensual con las sesiones del proyecto. Se arrastra una tarea a
// un día y queda programada: una sesión de hasta 4 h (lo que falte, si es
// menos) a las 09:00, para la persona responsable de la tarea o, si no tiene,
// para quien esté elegido arriba. Las sesiones del calendario también se
// arrastran de un día a otro.
//
// Solo se puede programar a gente del proyecto (proyecto_equipo). Sustituye
// al «asignar consultor en lote», que asignaba sin decir cuándo.
// ════════════════════════════════════════════════════════════════════════════

const S = (v) => String(v ?? '');
const num = (v) => Number(v) || 0;
const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hoyISO = () => aISO(new Date());
const HORA_INICIO = '09:00';
const BLOQUE = 4;
const sumaHoras = (hhmm, h) => { const [H, M] = hhmm.split(':').map(Number); const t = H * 60 + M + Math.round(h * 60); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
const fmtH = (n) => `${(Math.round(num(n) * 10) / 10).toLocaleString('es-ES')} h`;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function PlanificadorArrastre({ proyecto, tareas = [], sesiones = [], horasTeoricas = (t) => num(t.horas), onGuardado, onAbrirTarea }) {
  const [perfiles, setPerfiles] = useState([]);
  const [equipoProyecto, setEquipoProyecto] = useState([]);
  const [festivos, setFestivos] = useState(new Set(FESTIVOS_2026.map((f) => f.fecha)));
  const [mes, setMes] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [responsableDefecto, setResponsableDefecto] = useState('');
  const [arrastrando, setArrastrando] = useState(null);   // {tipo:'tarea'|'sesion', id}
  const [sobre, setSobre] = useState(null);                // día bajo el cursor
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    Promise.all([listTable('perfiles').catch(() => []), listTable('proyecto_equipo').catch(() => []), listTable('festivos').catch(() => [])]).then(([ps, eq, fs]) => {
      setPerfiles(ps || []);
      setEquipoProyecto((eq || []).filter((e) => String(e.proyecto_id) === String(proyecto?.id)));
      if (fs?.length) setFestivos(new Set(fs.map((f) => S(f.fecha).slice(0, 10))));
    });
  }, [proyecto?.id]);

  // Gente del proyecto: solo a ellas se puede programar.
  const gente = useMemo(() => {
    const ids = new Set(equipoProyecto.map((e) => S(e.perfil_id)));
    return perfiles.filter((p) => ids.has(S(p.id)) && p.activo !== false)
      .sort((a, b) => (equipoProyecto.find((e) => S(e.perfil_id) === S(a.id))?.papel === 'responsable' ? -1 : 1))
      .map((p) => ({ id: S(p.id), nombre: `${p.nombre || ''} ${p.apellidos || ''}`.trim() || p.email, papel: equipoProyecto.find((e) => S(e.perfil_id) === S(p.id))?.papel || 'consultor', nivel: p.nivel || null }));
  }, [perfiles, equipoProyecto]);
  useEffect(() => { if (!responsableDefecto && gente.length) setResponsableDefecto(gente.find((g) => g.papel !== 'responsable')?.id || gente[0].id); }, [gente, responsableDefecto]);
  const nombreDe = (id) => gente.find((g) => g.id === S(id))?.nombre || perfiles.filter((p) => S(p.id) === S(id)).map((p) => `${p.nombre || ''} ${p.apellidos || ''}`.trim())[0] || null;

  // Sesiones del proyecto (las de sus tareas), por día.
  const idsTareas = useMemo(() => new Set(tareas.map((t) => S(t.id))), [tareas]);
  const sesionesProyecto = useMemo(() => sesiones.filter((s) => idsTareas.has(S(s.cliente_tarea_id)) && s.estado !== 'anulada'), [sesiones, idsTareas]);
  const porDia = useMemo(() => {
    const m = {};
    for (const s of sesionesProyecto) (m[S(s.fecha).slice(0, 10)] = m[S(s.fecha).slice(0, 10)] || []).push(s);
    for (const k of Object.keys(m)) m[k].sort((a, b) => S(a.hora_inicio).localeCompare(S(b.hora_inicio)));
    return m;
  }, [sesionesProyecto]);
  const tareaPor = useMemo(() => Object.fromEntries(tareas.map((t) => [S(t.id), t])), [tareas]);

  // Tareas a las que faltan horas por programar.
  const pendientes = useMemo(() => tareas.filter((t) => !t.hecha).map((t) => {
    const b = balanceTarea({ horas_teoricas: horasTeoricas(t) }, sesiones.filter((s) => S(s.cliente_tarea_id) === S(t.id)));
    return { t, b, faltan: Math.max(0, Math.round((b.teoricas - b.planificadas) * 10) / 10) };
  }).filter((x) => x.faltan > 0.4 && (!filtro || `${x.t.codigo} ${x.t.titulo}`.toLowerCase().includes(filtro.toLowerCase())))
    .sort((a, b) => S(a.t.codigo).localeCompare(S(b.t.codigo))), [tareas, sesiones, horasTeoricas, filtro]);

  // Rejilla del mes (semanas de lunes a domingo).
  const dias = useMemo(() => {
    const primero = new Date(mes.y, mes.m, 1);
    const desplaz = (primero.getDay() + 6) % 7;
    const inicio = new Date(mes.y, mes.m, 1 - desplaz);
    const out = [];
    for (let i = 0; i < 42; i++) { const d = new Date(inicio); d.setDate(inicio.getDate() + i); out.push({ iso: aISO(d), dia: d.getDate(), delMes: d.getMonth() === mes.m, laborable: esLaborable(d, festivos) }); }
    return out.slice(0, out[35].delMes ? 42 : 35);
  }, [mes, festivos]);
  const hoy = hoyISO();

  // ── Arrastrar y soltar ──
  const alSoltar = async (iso) => {
    const a = arrastrando; setArrastrando(null); setSobre(null);
    if (!a) return;
    setOcupado(true); setMsg(null);
    try {
      if (a.tipo === 'tarea') {
        const t = tareaPor[a.id]; if (!t) return;
        const b = pendientes.find((x) => S(x.t.id) === a.id);
        const faltan = b ? b.faltan : BLOQUE;
        const horas = Math.max(0.5, Math.min(BLOQUE, faltan));
        let consultor = S(t.consultor_id || '') || responsableDefecto;
        if (consultor && !gente.some((g) => g.id === consultor)) consultor = responsableDefecto;
        if (!consultor) { setMsg({ err: true, t: 'Sin nadie en el equipo del proyecto: asigna personas arriba antes de programar.' }); return; }
        // Sin `horas`: en la base es una columna generada (hora_fin − hora_inicio).
        const fila = { cliente_tarea_id: t.id, consultor_id: consultor, fecha: iso, hora_inicio: HORA_INICIO, hora_fin: sumaHoras(HORA_INICIO, horas), estado: 'programada', notas: null };
        // La sesión va detrás de las que ya haya ese día para esa persona.
        const ultima = (porDia[iso] || []).filter((s) => S(s.consultor_id) === consultor).map((s) => S(s.hora_fin).slice(0, 5)).sort().pop();
        if (ultima && ultima >= HORA_INICIO) { fila.hora_inicio = ultima; fila.hora_fin = sumaHoras(ultima, horas); }
        await insertRow('tarea_sesiones', fila);
        // La tarea queda con responsable si no lo tenía.
        if (!t.consultor_id) await updateRow('cliente_tareas', t.id, { consultor_id: consultor }).catch(() => {});
        setMsg({ err: false, t: `${t.codigo || t.titulo}: ${fmtH(horas)} el ${iso.split('-').reverse().join('/')} para ${nombreDe(consultor)}.` });
      } else if (a.tipo === 'sesion') {
        const s = sesionesProyecto.find((x) => S(x.id) === a.id); if (!s || S(s.fecha).slice(0, 10) === iso) return;
        await updateRow('tarea_sesiones', s.id, { fecha: iso });
        setMsg({ err: false, t: `Sesión movida al ${iso.split('-').reverse().join('/')}.` });
      }
      onGuardado?.();
    } catch (e) { setMsg({ err: true, t: explicarErrorBd(e, 'tarea_sesiones') }); }
    finally { setOcupado(false); }
  };
  const quitarSesion = async (s) => {
    if (!window.confirm('¿Quitar esta sesión del calendario?')) return;
    try { await deleteRow('tarea_sesiones', s.id); onGuardado?.(); } catch (e) { setMsg({ err: true, t: explicarErrorBd(e, 'tarea_sesiones') }); }
  };
  const cambiarPersona = async (s, id) => {
    try { await updateRow('tarea_sesiones', s.id, { consultor_id: id || null }); onGuardado?.(); } catch (e) { setMsg({ err: true, t: explicarErrorBd(e, 'tarea_sesiones') }); }
  };

  const totalFaltan = Math.round(pendientes.reduce((a, x) => a + x.faltan, 0) * 10) / 10;
  const ESTADO = { programada: 'border-sky-400/50 bg-sky-500/15 text-sky-100', hecha: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100', anulada: 'opacity-40' };

  return (
    <div className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h4 className="font-extrabold text-[#EAF4F7]">Programar arrastrando</h4>
          <p className="mt-0.5 text-[11.5px] text-[#7FA7B4]">Arrastra una tarea de la lista a un día del calendario y queda programada (hasta {BLOQUE} h a las {HORA_INICIO}, o lo que le falte). Las sesiones también se mueven de un día a otro. Solo a gente del proyecto.</p>
        </div>
        <label className="flex items-center gap-2 text-[11.5px] text-[#9FC0CB]">
          Sin responsable, programar a
          <select className="input !w-auto !py-1 !text-[12px]" value={responsableDefecto} onChange={(e) => setResponsableDefecto(e.target.value)}>
            {!gente.length && <option value="">— nadie en el proyecto —</option>}
            {gente.map((g) => <option key={g.id} value={g.id}>{g.nombre}{g.nivel ? ` · ${g.nivel}` : ''}{g.papel === 'responsable' ? ' (responsable)' : ''}</option>)}
          </select>
        </label>
      </div>
      {msg && <p className={`mt-2 text-[12px] font-bold ${msg.err ? 'text-red-300' : 'text-emerald-300'}`}>{msg.t}</p>}

      <div className="mt-3 grid gap-3 lg:grid-cols-[300px_1fr]">
        {/* ── Sin programar ── */}
        <div className="rounded-xl border border-[#1E5468] bg-[#0B2E3D] p-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#9FC0CB]">Sin programar · {pendientes.length}</p>
            <span className="text-[11px] text-[#7FA7B4]">{fmtH(totalFaltan)} por meter</span>
          </div>
          <input className="input mt-2 !py-1 !text-[12px]" placeholder="Filtrar…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
          <ul className="mt-2 max-h-[30rem] space-y-1 overflow-y-auto pr-1">
            {pendientes.map(({ t, b, faltan }) => {
              const resp = nombreDe(t.consultor_id);
              return (
                <li key={t.id} draggable={!ocupado}
                  onDragStart={(e) => { setArrastrando({ tipo: 'tarea', id: S(t.id) }); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', S(t.id)); } catch { /* Safari */ } }}
                  onDragEnd={() => { setArrastrando(null); setSobre(null); }}
                  className={`cursor-grab rounded-lg border px-2 py-1.5 active:cursor-grabbing ${arrastrando?.id === S(t.id) ? 'border-brand-orange bg-brand-orange/15' : 'border-[#1E5468] bg-[#0D3242] hover:border-brand-orange/60'}`}
                  title="Arrastra al calendario">
                  <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#EAF4F7]"><code className="shrink-0 whitespace-nowrap text-[10.5px] text-brand-verdeTexto">{t.codigo}</code><span className="truncate">{t.titulo}</span></p>
                  <p className="mt-0.5 flex items-center justify-between text-[10.5px] text-[#9FC0CB]">
                    <span className={resp ? '' : 'text-amber-200'}>{resp || 'sin responsable'}</span>
                    <span>{b.planificadas ? `${fmtH(b.planificadas)} de ` : ''}{fmtH(b.teoricas)} · faltan <b className="text-brand-orange">{fmtH(faltan)}</b></span>
                  </p>
                </li>
              );
            })}
            {!pendientes.length && <li className="rounded-lg border border-dashed border-[#1E5468] px-2 py-3 text-center text-[11.5px] text-[#7FA7B4]">{filtro ? 'Nada con ese filtro.' : 'Todo programado.'}</li>}
          </ul>
        </div>

        {/* ── Calendario ── */}
        <div>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setMes((m) => ({ y: m.m === 0 ? m.y - 1 : m.y, m: (m.m + 11) % 12 }))} className="btn-ghost !px-2.5 !py-1 text-[12px]">‹</button>
            <p className="text-[13px] font-extrabold capitalize text-[#EAF4F7]">{MESES[mes.m]} {mes.y}</p>
            <div className="flex gap-1">
              <button type="button" onClick={() => { const d = new Date(); setMes({ y: d.getFullYear(), m: d.getMonth() }); }} className="btn-ghost !px-2.5 !py-1 text-[12px]">Hoy</button>
              <button type="button" onClick={() => setMes((m) => ({ y: m.m === 11 ? m.y + 1 : m.y, m: (m.m + 1) % 12 }))} className="btn-ghost !px-2.5 !py-1 text-[12px]">›</button>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10.5px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{DIAS.map((d) => <div key={d}>{d}</div>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {dias.map((d) => {
              const ss = porDia[d.iso] || [];
              const puede = d.laborable && !!arrastrando;
              const horasDia = Math.round(ss.reduce((a, s) => a + num(s.horas), 0) * 10) / 10;
              return (
                <div key={d.iso}
                  onDragOver={(e) => { if (arrastrando && d.laborable) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (sobre !== d.iso) setSobre(d.iso); } }}
                  onDragLeave={() => { if (sobre === d.iso) setSobre(null); }}
                  onDrop={(e) => { e.preventDefault(); if (d.laborable) alSoltar(d.iso); }}
                  className={`min-h-[76px] rounded-lg border p-1 text-left transition ${d.delMes ? '' : 'opacity-40'} ${!d.laborable ? 'border-[#123F52] bg-[#0A2733]' : 'border-[#1E5468] bg-[#0B2E3D]'} ${sobre === d.iso && puede ? '!border-brand-orange bg-brand-orange/10' : ''} ${d.iso === hoy ? 'ring-1 ring-brand-orange/60' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-extrabold ${d.iso === hoy ? 'text-brand-orange' : d.laborable ? 'text-[#CFE3E9]' : 'text-[#5E8494]'}`}>{d.dia}</span>
                    {horasDia > 0 && <span className="text-[9.5px] text-[#7FA7B4]">{fmtH(horasDia)}</span>}
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    {ss.map((s) => {
                      const t = tareaPor[S(s.cliente_tarea_id)];
                      return (
                        <div key={s.id} draggable={!ocupado && s.estado !== 'hecha'}
                          onDragStart={(e) => { e.stopPropagation(); setArrastrando({ tipo: 'sesion', id: S(s.id) }); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', S(s.id)); } catch { /* Safari */ } }}
                          onDragEnd={() => { setArrastrando(null); setSobre(null); }}
                          className={`group rounded border px-1 py-0.5 text-[10px] leading-tight ${ESTADO[s.estado] || ESTADO.programada} ${s.estado !== 'hecha' ? 'cursor-grab' : ''}`}
                          title={`${t?.codigo || ''} ${t?.titulo || ''} · ${S(s.hora_inicio).slice(0, 5)}–${S(s.hora_fin).slice(0, 5)} · ${nombreDe(s.consultor_id) || 'sin persona'}${s.estado === 'hecha' ? ' · hecha' : ''}`}>
                          <button type="button" onClick={() => onAbrirTarea?.(t)} className="block w-full truncate text-left font-bold hover:underline">{t?.codigo || 'Tarea'} · {fmtH(s.horas)}</button>
                          <div className="flex items-center justify-between gap-1">
                            <select className="max-w-[80%] truncate bg-transparent text-[9.5px] text-current outline-none" value={S(s.consultor_id || '')} onChange={(e) => cambiarPersona(s, e.target.value)} onClick={(e) => e.stopPropagation()} title="Quién la hace (gente del proyecto)">
                              {!gente.some((g) => g.id === S(s.consultor_id)) && <option value={S(s.consultor_id || '')}>{nombreDe(s.consultor_id) || 'sin persona'}</option>}
                              {gente.map((g) => <option key={g.id} value={g.id}>{g.nombre.split(' ')[0]}</option>)}
                            </select>
                            {s.estado !== 'hecha' && <button type="button" onClick={() => quitarSesion(s)} className="hidden text-[10px] text-red-300 group-hover:inline" title="Quitar">×</button>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 text-[10.5px] text-[#5E8494]">Fines de semana y festivos no admiten sesiones. Pulsa el código de una sesión para abrir la tarea (horas, checklist y más sesiones).</p>
        </div>
      </div>
    </div>
  );
}
