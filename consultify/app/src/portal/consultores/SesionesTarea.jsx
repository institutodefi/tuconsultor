import { useEffect, useMemo, useState } from 'react';
import DialogoFicha from '../../components/DialogoFicha.jsx';
import { listTable, insertRow, updateRow, deleteRow, explicarErrorBd } from '../../lib/data.js';
import { horasEntre, balanceTarea, sesionesTrasCertificacion, solapes } from '../../lib/sesionesTarea.js';

// ════════════════════════════════════════════════════════════════════════════
// PROGRAMAR UNA TAREA · EN UNA O VARIAS SESIONES
//
// Una tarea de 8 horas no se hace de una sentada. Aquí se añaden las sesiones
// que hagan falta, cada una con fecha, hora de inicio y fin y responsable, y
// sus horas se suman.
//
// Lo que NO se puede tocar son las horas teóricas: son las que se ofertaron. Si
// se pudieran editar, la desviación se «arreglaría» moviendo el objetivo.
//
// Cada sesión, en cuanto tiene fecha y responsable, está en la agenda de esa
// persona: la agenda lee `tarea_sesiones`, no hay nada que sincronizar.
// ════════════════════════════════════════════════════════════════════════════

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmt = (f) => {
  if (!f) return '';
  const d = new Date(`${String(f).slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' });
};
const esPasado = (f) => {
  if (!f) return false;
  const hoy = new Date(); hoy.setHours(23, 59, 59, 999);
  return new Date(`${String(f).slice(0, 10)}T12:00:00`) <= hoy;
};

const VACIA = () => ({ fecha: hoyISO(), hora_inicio: '09:00', hora_fin: '13:00', consultor_id: '', notas: '' });

export default function SesionesTarea({
  tarea, contexto, fechaCertificacion, onCerrar, onGuardado,
  // De qué tabla cuelga la tarea. Conviven `cliente_tareas` (panel del
  // proyecto) y `tareas_programadas` (planificador por contextos); la sesión
  // apunta a una o a otra, nunca a las dos.
  campoTarea = 'tarea_id',
}) {
  const [sesiones, setSesiones] = useState(null);
  const [todas, setTodas] = useState([]);       // de todo el mundo, para ver solapes
  const [equipo, setEquipo] = useState([]);
  const [nueva, setNueva] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);

  const cargar = async () => {
    const [ss, ps] = await Promise.all([
      listTable('tarea_sesiones').catch(() => []),
      listTable('perfiles').catch(() => []),
    ]);
    setTodas(ss || []);
    setSesiones((ss || []).filter((s) => String(s[campoTarea]) === String(tarea.id))
      .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)) || String(a.hora_inicio).localeCompare(String(b.hora_inicio))));
    setEquipo((ps || [])
      .filter((p) => ['consultor', 'director', 'admin', 'superadmin'].includes(p.rol) && p.activo !== false)
      .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''))));
  };
  useEffect(() => { cargar(); }, [tarea?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  const bal = useMemo(() => balanceTarea(tarea, sesiones || []), [tarea, sesiones]);
  const tarde = useMemo(
    () => sesionesTrasCertificacion(sesiones || [], fechaCertificacion),
    [sesiones, fechaCertificacion],
  );

  const nombreDe = (id) => {
    const p = equipo.find((x) => String(x.id) === String(id));
    return p ? `${p.nombre || ''} ${p.apellidos || ''}`.trim() || p.email : 'sin asignar';
  };

  const horasNueva = nueva ? horasEntre(nueva.hora_inicio, nueva.hora_fin) : 0;
  const choques = nueva?.consultor_id ? solapes(todas, { ...nueva, id: null }) : [];

  async function anadir() {
    if (!nueva.fecha) { setError('Pon una fecha.'); return; }
    if (!horasNueva) { setError('La hora de fin tiene que ser posterior a la de inicio.'); return; }
    setOcupado(true); setError(null);
    try {
      await insertRow('tarea_sesiones', {
        [campoTarea]: tarea.id,
        consultor_id: nueva.consultor_id || null,
        fecha: nueva.fecha,
        hora_inicio: nueva.hora_inicio,
        hora_fin: nueva.hora_fin,
        notas: nueva.notas?.trim() || null,
        // Si la sesión ya pasó se puede dar por hecha desde el principio: se
        // están cargando proyectos en marcha con trabajo de meses atrás.
        estado: 'programada',
      });
      setNueva(null);
      await cargar();
      onGuardado?.();
    } catch (e) { setError(explicarErrorBd(e, 'tarea_sesiones')); }
    finally { setOcupado(false); }
  }

  async function cambiarEstado(s, estado) {
    setOcupado(true);
    try {
      await updateRow('tarea_sesiones', s.id, { estado });
      await cargar(); onGuardado?.();
    } catch (e) { setError(explicarErrorBd(e, 'tarea_sesiones')); }
    finally { setOcupado(false); }
  }

  async function borrar(s) {
    if (!window.confirm('¿Eliminar esta sesión? Desaparecerá de la agenda del consultor.')) return;
    setOcupado(true);
    try { await deleteRow('tarea_sesiones', s.id); await cargar(); onGuardado?.(); }
    catch (e) { setError(explicarErrorBd(e, 'tarea_sesiones')); }
    finally { setOcupado(false); }
  }

  const TONO = {
    sin_planificar: 'text-[#7FA7B4]', corto: 'text-amber-200',
    ajustado: 'text-emerald-300', pasado: 'text-red-300',
  };
  const ETQ = {
    sin_planificar: 'sin planificar', corto: 'faltan horas por planificar',
    ajustado: 'ajustado a lo comprometido', pasado: 'por encima de lo comprometido',
  };

  return (
    <DialogoFicha
      titulo={tarea?.titulo || 'Programar tarea'}
      subtitulo={[tarea?.codigo, contexto?.norma, tarea?.subproceso].filter(Boolean).join(' · ')}
      onCerrar={onCerrar}
      ancho="760px"
      pie={<button onClick={onCerrar} className="btn-orange !px-4 !py-1.5 text-[13px]">Cerrar</button>}
    >
      <div className="space-y-3">
        {/* ── Lo comprometido frente a lo planificado ──
            Las teóricas se enseñan como dato, no como campo: no se editan. */}
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Comprometidas', bal.teoricas, 'del modelo · no editable'],
            ['Planificadas', bal.planificadas, `${bal.nSesiones} sesión${bal.nSesiones === 1 ? '' : 'es'}`],
            ['Ejecutadas', bal.ejecutadas, 'sesiones cerradas'],
          ].map(([etq, v, pie]) => (
            <div key={etq} className="rounded-xl border border-[#1E5468] bg-[#0D3242] px-3 py-2">
              <p className="text-xl font-extrabold leading-none text-[#EAF4F7]">{v} h</p>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{etq}</p>
              <p className="mt-0.5 text-[10.5px] text-[#7FA7B4]">{pie}</p>
            </div>
          ))}
        </div>

        <p className={`text-[12.5px] font-bold ${TONO[bal.estado]}`}>
          {ETQ[bal.estado]}
          {bal.estado !== 'sin_planificar' && bal.dif !== 0 && (
            <span className="ml-1 font-medium">
              ({bal.dif > 0 ? '+' : ''}{bal.dif} h sobre las {bal.teoricas} comprometidas)
            </span>
          )}
        </p>

        {/* El aviso que más importa: trabajo planificado para después de la
            auditoría no sirve para llegar a ella. */}
        {tarde.length > 0 && (
          <div className="rounded-xl border border-red-400/50 bg-red-500/10 px-3 py-2.5">
            <p className="text-[12.5px] font-bold text-red-200">
              {tarde.length === 1 ? '1 sesión programada' : `${tarde.length} sesiones programadas`} DESPUÉS
              de la certificación ({fmt(fechaCertificacion)})
            </p>
            <p className="mt-0.5 text-[11.5px] text-[#DFF1F5]">
              Ese trabajo no llega a la auditoría. Adelántalo, o déjalo si es seguimiento posterior a propósito.
            </p>
          </div>
        )}

        {/* ── Sesiones ── */}
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="label !mb-0">Sesiones</p>
            {!nueva && (
              <button onClick={() => setNueva(VACIA())} className="text-[12px] font-bold text-brand-orange hover:underline">
                + añadir sesión
              </button>
            )}
          </div>

          {sesiones === null ? (
            <p className="mt-1.5 text-[12px] text-[#7FA7B4]">Cargando…</p>
          ) : sesiones.length === 0 ? (
            <p className="mt-1.5 rounded-lg border border-dashed border-[#1E5468] px-3 py-3 text-center text-[12px] text-[#7FA7B4]">
              Sin programar. Añade la primera sesión: entrará en la agenda del consultor que elijas.
            </p>
          ) : (
            <ul className="mt-1.5 space-y-1.5">
              {sesiones.map((s) => {
                const pasada = esPasado(s.fecha);
                const post = fechaCertificacion && String(s.fecha).slice(0, 10) > String(fechaCertificacion).slice(0, 10);
                return (
                  <li key={s.id}
                    className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg border px-2.5 py-1.5 ${
                      s.estado === 'anulada' ? 'border-[#1E5468] opacity-50'
                        : post ? 'border-red-400/40 bg-red-500/[0.06]'
                        : s.estado === 'hecha' ? 'border-emerald-400/40 bg-emerald-500/[0.06]'
                        : 'border-[#1E5468] bg-[#0B2E3D]'}`}>
                    <span className="text-[12.5px] font-bold text-[#EAF4F7]">{fmt(s.fecha)}</span>
                    <span className="text-[12px] text-[#9FC0CB]">{String(s.hora_inicio).slice(0, 5)}–{String(s.hora_fin).slice(0, 5)}</span>
                    <span className="text-[12px] font-bold text-brand-orange">
                      {s.horas ?? horasEntre(s.hora_inicio, s.hora_fin)} h
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11.5px] text-[#7FA7B4]">
                      {nombreDe(s.consultor_id)}{s.notas ? ` · ${s.notas}` : ''}
                    </span>

                    {s.estado === 'hecha' ? (
                      <button onClick={() => cambiarEstado(s, 'programada')} disabled={ocupado}
                        className="text-[11px] font-bold text-emerald-300 hover:underline">✓ hecha</button>
                    ) : s.estado === 'anulada' ? (
                      <button onClick={() => cambiarEstado(s, 'programada')} disabled={ocupado}
                        className="text-[11px] font-bold text-[#7FA7B4] hover:underline">reactivar</button>
                    ) : (
                      <button onClick={() => cambiarEstado(s, 'hecha')} disabled={ocupado || !pasada}
                        title={pasada ? 'Darla por ejecutada' : 'Solo cuando la fecha haya llegado'}
                        className="text-[11px] font-bold text-[#7FA7B4] hover:text-emerald-300 disabled:opacity-30">
                        marcar hecha
                      </button>
                    )}
                    <button onClick={() => borrar(s)} disabled={ocupado}
                      className="text-[11px] font-bold text-red-300/70 hover:text-red-300">×</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Nueva sesión ── */}
        {nueva && (
          <div className="rounded-xl border border-brand-orange/50 bg-[#0D3242] p-3">
            <div className="form-grid">
              <div className="campo">
                <label className="label" htmlFor="s-fecha">Fecha</label>
                <input id="s-fecha" type="date" className="input" value={nueva.fecha}
                  onChange={(e) => setNueva({ ...nueva, fecha: e.target.value })} />
              </div>
              <div className="campo">
                <label className="label" htmlFor="s-ini">Desde</label>
                <input id="s-ini" type="time" className="input" value={nueva.hora_inicio}
                  onChange={(e) => setNueva({ ...nueva, hora_inicio: e.target.value })} />
              </div>
              <div className="campo">
                <label className="label" htmlFor="s-fin">Hasta</label>
                <input id="s-fin" type="time" className="input" value={nueva.hora_fin}
                  onChange={(e) => setNueva({ ...nueva, hora_fin: e.target.value })} />
                <p className="campo-nota">{horasNueva ? `${horasNueva} h` : 'El fin debe ser posterior.'}</p>
              </div>
              <div className="campo">
                <label className="label" htmlFor="s-cons">Responsable</label>
                <select id="s-cons" className="input" value={nueva.consultor_id}
                  onChange={(e) => setNueva({ ...nueva, consultor_id: e.target.value })}>
                  <option value="">— sin asignar —</option>
                  {equipo.map((p) => (
                    <option key={p.id} value={p.id}>
                      {`${p.nombre || ''} ${p.apellidos || ''}`.trim() || p.email}{p.nivel ? ` · ${p.nivel}` : ''}
                    </option>
                  ))}
                </select>
                <p className="campo-nota">Entra en su agenda ese día.</p>
              </div>
            </div>

            <input className="input mt-2 !py-1.5 !text-[12.5px]" placeholder="Notas de la sesión (opcional)"
              value={nueva.notas} onChange={(e) => setNueva({ ...nueva, notas: e.target.value })} />

            {choques.length > 0 && (
              <p className="mt-2 rounded-lg bg-amber-400/10 px-2.5 py-2 text-[11.5px] font-bold text-amber-200">
                {nombreDe(nueva.consultor_id)} ya tiene algo a esa hora:
                {' '}{choques.map((c) => `${String(c.hora_inicio).slice(0, 5)}–${String(c.hora_fin).slice(0, 5)}`).join(', ')}.
                Se puede guardar igualmente, pero mira si es lo que quieres.
              </p>
            )}

            {fechaCertificacion && String(nueva.fecha) > String(fechaCertificacion).slice(0, 10) && (
              <p className="mt-2 rounded-lg bg-red-500/10 px-2.5 py-2 text-[11.5px] font-bold text-red-200">
                Esta fecha es posterior a la certificación ({fmt(fechaCertificacion)}): ese trabajo no llega a la auditoría.
              </p>
            )}

            {error && <p className="mt-2 text-[12px] font-bold text-red-300">{error}</p>}

            <div className="mt-2 flex gap-2">
              <button onClick={anadir} disabled={ocupado || !horasNueva}
                className="btn-orange !px-4 !py-1.5 text-[13px] disabled:opacity-40">
                {ocupado ? 'Guardando…' : `Añadir ${horasNueva ? `${horasNueva} h` : 'sesión'}`}
              </button>
              <button onClick={() => { setNueva(null); setError(null); }}
                className="btn-ghost !px-3 !py-1.5 text-[13px]">Cancelar</button>
            </div>
          </div>
        )}

        {error && !nueva && <p className="text-[12px] font-bold text-red-300">{error}</p>}
      </div>
    </DialogoFicha>
  );
}
