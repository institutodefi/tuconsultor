import { useEffect, useMemo, useState } from 'react';
import { listTable, explicarErrorBd } from '../../lib/data.js';
import { useAuth } from '../../lib/auth.jsx';
import {
  getFestivos, getVacaciones, getTareasInternas, crearTareaInterna, actualizarTareaInterna, borrarTareaInterna,
  capacidadMes, TIPO_BY_ID, MESES, toISO,
} from '../../lib/agenda.js';
import SesionesTarea from './SesionesTarea.jsx';

// ════════════════════════════════════════════════════════════════════════════
// TAREAS INTERNAS · gestión y coordinación · procesos internos
//
// El 30 % de la jornada que no va a proyectos: 10 % de gestión y coordinación
// y 20 % de procesos internos. Hasta ahora ese tiempo no se podía poner en el
// calendario, así que la agenda enseñaba una jornada del 70 % y el resto no
// existía.
//
// Cada consultor crea aquí sus tareas internas y las programa en sesiones,
// igual que las de proyecto: la sesión cuelga de `tarea_sesiones` por
// `tarea_interna_id` y aparece en Mi agenda, en la agenda del equipo y en el
// control de horas, restando de su bolsa.
//
// Las de procesos internos salen del mapa de procesos del portal
// (`procesos_internos` y sus subprocesos): no se inventa el nombre, se elige
// el proceso y, si procede, el subproceso.
// ════════════════════════════════════════════════════════════════════════════

const h1 = (n) => `${(Math.round((Number(n) || 0) * 10) / 10).toLocaleString('es-ES')} h`;
const VACIA = (tipo) => ({ tipo, proceso_interno_id: '', subproceso_id: '', titulo: '', horas: 4, descripcion: '' });

export default function TareasInternas({ compacto = false }) {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [nueva, setNueva] = useState(null);
  const [abierta, setAbierta] = useState(null);
  const [error, setError] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [verCerradas, setVerCerradas] = useState(false);

  const cargar = async () => {
    const year = new Date().getFullYear();
    const [internas, sesiones, procs, subs, bandas, festivos, vacaciones, cons] = await Promise.all([
      getTareasInternas().catch(() => null),          // null: la tabla no existe (v116 sin aplicar)
      listTable('tarea_sesiones').catch(() => []),
      listTable('procesos_internos').catch(() => []),
      listTable('procesos_subprocesos').catch(() => []),
      listTable('procesos_bandas').catch(() => []),
      getFestivos(year).catch(() => []),
      user?.id ? getVacaciones(user.id, year).catch(() => []) : Promise.resolve([]),
      listTable('consultores').catch(() => []),
    ]);
    const yo = (cons || []).find((c) => String(c.id) === String(user?.id));
    setD({ internas, sesiones, procs, subs, bandas, festivos, vacaciones, pctJornada: yo?.pct_jornada ?? 100 });
  };
  useEffect(() => { if (user?.id) cargar(); }, [user?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lo mío, con sus horas ──
  const mias = useMemo(() => {
    if (!d?.internas) return [];
    return d.internas
      .filter((t) => String(t.consultor_id) === String(user?.id))
      .map((t) => {
        const ss = d.sesiones.filter((s) => String(s.tarea_interna_id) === String(t.id) && s.estado !== 'anulada');
        return {
          ...t,
          programadas: ss.reduce((a, s) => a + (Number(s.horas) || 0), 0),
          ejecutadas: ss.filter((s) => s.estado === 'hecha').reduce((a, s) => a + (Number(s.horas) || 0), 0),
          nSesiones: ss.length,
        };
      })
      .sort((a, b) => (a.estado === 'cerrada') - (b.estado === 'cerrada') || String(b.creado).localeCompare(String(a.creado)));
  }, [d, user?.id]);

  // ── Las dos bolsas de este mes ──
  const mes = useMemo(() => {
    if (!d) return null;
    const hoy = new Date();
    const fest = new Set(d.festivos.map((f) => String(f.fecha).slice(0, 10)));
    const vac = new Set(d.vacaciones.map((v) => String(v.fecha).slice(0, 10)));
    // El % de jornada viene de la ficha; si no se ha cargado, jornada completa.
    const cap = capacidadMes(hoy.getFullYear(), hoy.getMonth(), fest, vac, d.pctJornada ?? 100);
    const pref = toISO(hoy).slice(0, 7);
    const enMes = (t) => d.sesiones.filter((s) => String(s.consultor_id) === String(user?.id) && s.estado !== 'anulada'
      && String(s.fecha).slice(0, 10).startsWith(pref)
      && d.internas?.some((x) => String(x.id) === String(s.tarea_interna_id) && (x.tipo === 'coordinacion' ? 'gestion' : x.tipo) === t));
    const suma = (ss) => ss.reduce((a, s) => a + (Number(s.horas) || 0), 0);
    const g = enMes('gestion'), pi = enMes('proceso_interno');
    return {
      etq: `${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`,
      gestion: { cap: cap.gestion, prog: suma(g), hechas: suma(g.filter((s) => s.estado === 'hecha')) },
      proceso_interno: { cap: cap.proceso_interno, prog: suma(pi), hechas: suma(pi.filter((s) => s.estado === 'hecha')) },
    };
  }, [d, user?.id]);

  const procsActivos = useMemo(() => (d?.procs || []).filter((p) => p.activo !== false)
    .sort((a, b) => (a.orden ?? 100) - (b.orden ?? 100)), [d]);
  const bandaDe = (p) => (d?.bandas || []).find((b) => String(b.id) === String(p.banda_id));
  const subsDe = (pid) => (d?.subs || []).filter((s) => String(s.proceso_id) === String(pid)).sort((a, b) => (a.orden ?? 100) - (b.orden ?? 100));
  const procDe = (id) => procsActivos.find((p) => String(p.id) === String(id));
  const subDe = (id) => (d?.subs || []).find((s) => String(s.id) === String(id));

  // El título se propone desde el proceso elegido; se puede cambiar.
  const elegirProceso = (pid) => {
    const p = procDe(pid);
    setNueva((n) => ({ ...n, proceso_interno_id: pid, subproceso_id: '', titulo: p ? `${p.codigo ? `${p.codigo} · ` : ''}${p.nombre}` : n.titulo }));
  };
  const elegirSub = (sid) => {
    const s = subDe(sid);
    const p = procDe(nueva?.proceso_interno_id);
    setNueva((n) => ({ ...n, subproceso_id: sid, titulo: s ? `${s.codigo ? `${s.codigo} · ` : ''}${s.nombre}` : (p ? `${p.codigo ? `${p.codigo} · ` : ''}${p.nombre}` : n.titulo) }));
  };

  async function guardar() {
    if (!nueva.titulo.trim()) { setError('Ponle un nombre.'); return; }
    if (nueva.tipo === 'proceso_interno' && !nueva.proceso_interno_id) { setError('Elige el proceso interno.'); return; }
    setOcupado(true); setError(null);
    try {
      const t = await crearTareaInterna({
        consultor_id: user.id, tipo: nueva.tipo,
        proceso_interno_id: nueva.tipo === 'proceso_interno' ? (nueva.proceso_interno_id || null) : null,
        subproceso_id: nueva.tipo === 'proceso_interno' ? (nueva.subproceso_id || null) : null,
        titulo: nueva.titulo.trim(), descripcion: nueva.descripcion?.trim() || null,
        horas: Number(nueva.horas) || 0,
      });
      setNueva(null);
      await cargar();
      // Se abre directamente el calendario: crear la tarea sin ponerle
      // sesiones es dejarla a medias.
      if (t?.id) setAbierta({ ...t, programadas: 0, ejecutadas: 0 });
    } catch (e) { setError(explicarErrorBd(e, 'tareas_internas')); }
    finally { setOcupado(false); }
  }

  async function cerrar(t, estado) {
    setOcupado(true);
    try { await actualizarTareaInterna(t.id, { estado }); await cargar(); }
    catch (e) { setError(explicarErrorBd(e, 'tareas_internas')); }
    finally { setOcupado(false); }
  }

  async function borrar(t) {
    if (!window.confirm(`¿Eliminar «${t.titulo}»? Se borran también sus ${t.nSesiones} sesión${t.nSesiones === 1 ? '' : 'es'}.`)) return;
    setOcupado(true);
    try { await borrarTareaInterna(t.id); await cargar(); }
    catch (e) { setError(explicarErrorBd(e, 'tareas_internas')); }
    finally { setOcupado(false); }
  }

  if (!d) return <p className="text-[12.5px] text-[#7FA7B4]">Cargando tareas internas…</p>;

  if (d.internas === null) {
    return (
      <div className="card">
        <h3 className="text-[15px] font-extrabold text-[#EAF4F7]">Gestión y procesos internos</h3>
        <p className="mt-1.5 text-[13px] text-[#9FC0CB]">
          Falta aplicar la migración v116 en la base de datos: hasta entonces no se pueden crear tareas internas.
        </p>
      </div>
    );
  }

  const Bolsa = ({ etq, corto, b, color }) => {
    const p = b.cap > 0 ? Math.min(100, Math.round((b.prog / b.cap) * 100)) : 0;
    const e = b.cap > 0 ? Math.min(100, Math.round((b.hechas / b.cap) * 100)) : 0;
    const pasado = b.prog > b.cap + 0.05;
    return (
      <div>
        <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
          <span className="font-bold text-[#CFE3E9]"><span className="mr-1 rounded bg-[#0D3242] px-1 text-[9.5px] text-[#9FC0CB]">{corto}</span>{etq}</span>
          <span className={`font-bold ${pasado ? 'text-red-300' : 'text-[#9FC0CB]'}`}>{h1(b.prog)} <span className="font-medium text-[#7FA7B4]">/ {h1(b.cap)}</span></span>
        </div>
        <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-[#0D3242]">
          <div className="absolute inset-y-0 left-0 rounded-full opacity-45" style={{ width: `${p}%`, background: pasado ? '#DC2626' : color }} />
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${e}%`, background: pasado ? '#DC2626' : color }} />
        </div>
      </div>
    );
  };

  const visibles = mias.filter((t) => verCerradas || t.estado !== 'cerrada');
  const nCerradas = mias.filter((t) => t.estado === 'cerrada').length;

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-extrabold text-[#EAF4F7]">Gestión y procesos internos</h3>
          <p className="mt-0.5 text-[12px] text-[#9FC0CB]">
            El 30 % de la jornada que no va a proyectos: {Math.round(TIPO_BY_ID.gestion.pct * 100)} % gestión y coordinación,
            {' '}{Math.round(TIPO_BY_ID.proceso_interno.pct * 100)} % procesos internos. Crea la tarea y ponle sesiones: entran en tu agenda.
          </p>
        </div>
        {!nueva && (
          <div className="flex gap-2">
            <button onClick={() => { setNueva(VACIA('gestion')); setError(null); }} className="btn-ghost !px-3 !py-1.5 text-[12.5px]">+ Gestión</button>
            <button onClick={() => { setNueva(VACIA('proceso_interno')); setError(null); }} className="btn-orange !px-3 !py-1.5 text-[12.5px]">+ Proceso interno</button>
          </div>
        )}
      </div>

      {mes && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Bolsa etq={`${TIPO_BY_ID.gestion.nombre} · ${mes.etq}`} corto="G" b={mes.gestion} color="#4C6BB4" />
          <Bolsa etq={`${TIPO_BY_ID.proceso_interno.nombre} · ${mes.etq}`} corto="PI" b={mes.proceso_interno} color="#0e7490" />
        </div>
      )}

      {/* ── Alta ── */}
      {nueva && (
        <div className="mt-3 rounded-xl border border-brand-orange/50 bg-[#0D3242] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label !mb-0">Tipo</span>
            {['gestion', 'proceso_interno'].map((t) => (
              <button key={t} type="button" onClick={() => setNueva({ ...VACIA(t), horas: nueva.horas })}
                className={`chip border text-xs font-bold ${nueva.tipo === t ? 'border-brand-orange bg-brand-orange/15 text-[#EAF4F7]' : 'border-[#1E5468] text-[#9FC0CB]'}`}>
                {TIPO_BY_ID[t].nombre}
              </button>
            ))}
          </div>

          {nueva.tipo === 'proceso_interno' && (
            <div className="form-grid mt-3">
              <div className="campo sm:col-span-2">
                <label className="label" htmlFor="ti-proc">Proceso interno</label>
                <select id="ti-proc" className="input" value={nueva.proceso_interno_id} onChange={(e) => elegirProceso(e.target.value)}>
                  <option value="">— elige un proceso del mapa —</option>
                  {(d.bandas.length ? d.bandas.slice().sort((a, b) => (a.orden ?? 100) - (b.orden ?? 100)) : [{ id: null, titulo: 'Procesos' }]).map((b) => {
                    const ps = procsActivos.filter((p) => b.id === null || String(p.banda_id) === String(b.id));
                    if (!ps.length) return null;
                    return (
                      <optgroup key={b.id || 'todas'} label={b.titulo}>
                        {ps.map((p) => <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} · ` : ''}{p.nombre}</option>)}
                      </optgroup>
                    );
                  })}
                  {/* Procesos sin banda, si los hay */}
                  {procsActivos.filter((p) => !p.banda_id || !bandaDe(p)).length > 0 && (
                    <optgroup label="Sin banda">
                      {procsActivos.filter((p) => !p.banda_id || !bandaDe(p)).map((p) => <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} · ` : ''}{p.nombre}</option>)}
                    </optgroup>
                  )}
                </select>
                <p className="campo-nota">{procsActivos.length ? 'Del mapa de procesos del portal.' : 'No hay procesos internos dados de alta: se crean en Procesos internos.'}</p>
              </div>
              {nueva.proceso_interno_id && subsDe(nueva.proceso_interno_id).length > 0 && (
                <div className="campo sm:col-span-2">
                  <label className="label" htmlFor="ti-sub">Subproceso (opcional)</label>
                  <select id="ti-sub" className="input" value={nueva.subproceso_id} onChange={(e) => elegirSub(e.target.value)}>
                    <option value="">— el proceso entero —</option>
                    {subsDe(nueva.proceso_interno_id).map((s) => <option key={s.id} value={s.id}>{s.codigo ? `${s.codigo} · ` : ''}{s.nombre}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="form-grid mt-3">
            <div className="campo sm:col-span-2">
              <label className="label" htmlFor="ti-tit">Nombre</label>
              <input id="ti-tit" className="input" value={nueva.titulo}
                placeholder={nueva.tipo === 'gestion' ? 'Reunión semanal de equipo, coordinación con cliente, seguimiento…' : 'Se propone desde el proceso; puedes cambiarlo'}
                onChange={(e) => setNueva({ ...nueva, titulo: e.target.value })} />
            </div>
            <div className="campo">
              <label className="label" htmlFor="ti-h">Horas previstas</label>
              <input id="ti-h" type="number" min="0" step="0.5" className="input" value={nueva.horas}
                onChange={(e) => setNueva({ ...nueva, horas: e.target.value })} />
              <p className="campo-nota">El marco. Las sesiones dirán las de verdad.</p>
            </div>
            <div className="campo sm:col-span-3">
              <input className="input !py-1.5 !text-[12.5px]" placeholder="Descripción (opcional)" value={nueva.descripcion}
                onChange={(e) => setNueva({ ...nueva, descripcion: e.target.value })} />
            </div>
          </div>

          {error && <p className="mt-2 text-[12px] font-bold text-red-300">{error}</p>}
          <div className="mt-2 flex gap-2">
            <button onClick={guardar} disabled={ocupado} className="btn-orange !px-4 !py-1.5 text-[13px] disabled:opacity-40">
              {ocupado ? 'Guardando…' : 'Crear y programar'}
            </button>
            <button onClick={() => { setNueva(null); setError(null); }} className="btn-ghost !px-3 !py-1.5 text-[13px]">Cancelar</button>
          </div>
        </div>
      )}

      {error && !nueva && <p className="mt-2 text-[12px] font-bold text-red-300">{error}</p>}

      {/* ── Mis tareas internas ── */}
      {visibles.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-[#1E5468] px-3 py-3 text-center text-[12px] text-[#7FA7B4]">
          Sin tareas internas. Las reuniones de equipo, la coordinación y el trabajo en los procesos de la casa también son jornada: créalas aquí.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {visibles.map((t) => {
            const p = procDe(t.proceso_interno_id);
            const bolsa = TIPO_BY_ID[t.tipo] || TIPO_BY_ID.gestion;
            return (
              <li key={t.id} className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg border px-2.5 py-1.5 ${
                t.estado === 'cerrada' ? 'border-[#1E5468] opacity-60' : 'border-[#1E5468] bg-[#0B2E3D]'}`}>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${t.tipo === 'proceso_interno' ? 'bg-cyan-700/40 text-cyan-100' : 'bg-indigo-600/40 text-indigo-100'}`}>{bolsa.corto}</span>
                <button onClick={() => setAbierta(t)} className="min-w-0 flex-1 truncate text-left text-[12.5px] font-bold text-[#EAF4F7] hover:text-brand-orange hover:underline" title="Abrir el calendario de esta tarea">
                  {t.titulo}
                </button>
                {p && !compacto && <span className="truncate text-[10.5px] text-[#7FA7B4]" title={p.nombre}>{p.codigo || p.nombre}</span>}
                <span className="text-[11px] text-[#9FC0CB]">
                  <b className="text-[#CFE3E9]">{h1(t.programadas)}</b> programadas · {h1(t.ejecutadas)} hechas · marco {h1(t.horas)}
                </span>
                <button onClick={() => setAbierta(t)} className="text-[11px] font-bold text-brand-orange hover:underline">calendario</button>
                {t.estado === 'cerrada'
                  ? <button onClick={() => cerrar(t, 'abierta')} disabled={ocupado} className="text-[11px] font-bold text-[#7FA7B4] hover:underline">reabrir</button>
                  : <button onClick={() => cerrar(t, 'cerrada')} disabled={ocupado} className="text-[11px] font-bold text-[#7FA7B4] hover:text-emerald-300">cerrar</button>}
                <button onClick={() => borrar(t)} disabled={ocupado} className="text-[11px] font-bold text-red-300/70 hover:text-red-300">×</button>
              </li>
            );
          })}
        </ul>
      )}
      {nCerradas > 0 && (
        <button onClick={() => setVerCerradas((v) => !v)} className="mt-2 text-[11.5px] font-bold text-[#7FA7B4] hover:text-[#CFE3E9]">
          {verCerradas ? 'Ocultar cerradas' : `Ver ${nCerradas} cerrada${nCerradas === 1 ? '' : 's'}`}
        </button>
      )}

      {abierta && (
        <SesionesTarea
          tarea={{ id: abierta.id, titulo: abierta.titulo, codigo: (TIPO_BY_ID[abierta.tipo] || TIPO_BY_ID.gestion).corto, horas_teoricas: abierta.horas, subproceso: procDe(abierta.proceso_interno_id)?.nombre }}
          contexto={{ norma: (TIPO_BY_ID[abierta.tipo] || TIPO_BY_ID.gestion).nombre }}
          campoTarea="tarea_interna_id"
          consultorPorDefecto={user?.id}
          onCerrar={() => setAbierta(null)}
          onGuardado={cargar}
        />
      )}
    </div>
  );
}
