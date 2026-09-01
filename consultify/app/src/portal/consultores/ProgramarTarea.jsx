import { useEffect, useMemo, useState } from 'react';
import DialogoFicha from '../../components/DialogoFicha.jsx';
import { updateRow, listTable, explicarErrorBd } from '../../lib/data.js';
import { puedeDarsePorHecha } from '../../lib/volcadoTareas.js';

// ════════════════════════════════════════════════════════════════════════════
// PROGRAMAR UNA TAREA
//
// Poner fecha y responsable. En cuanto tiene las dos cosas, la tarea aparece en
// la agenda de ese consultor: `tareas_programadas` es la misma tabla que lee la
// agenda, así que no hay nada que sincronizar. Una tabla, una verdad.
//
// Y se puede dar por hecha si la fecha ya pasó. Hace falta ahora, durante la
// implantación del modelo: se están cargando proyectos en marcha y hay tareas
// de hace meses que ya se hicieron. Marcar como hecha algo con fecha futura, en
// cambio, no se permite: sería registrar trabajo que aún no ha ocurrido.
// ════════════════════════════════════════════════════════════════════════════

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtFecha = (f) => {
  if (!f) return '';
  const d = new Date(`${String(f).slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

/** Sábado o domingo: se avisa, no se impide. Hay auditorías en fin de semana. */
const esFinDeSemana = (f) => {
  if (!f) return false;
  const d = new Date(`${String(f).slice(0, 10)}T12:00:00`);
  return [0, 6].includes(d.getDay());
};

export default function ProgramarTarea({ tarea, contexto, onCerrar, onGuardado }) {
  const [f, setF] = useState({
    fecha: tarea?.fecha || '',
    hora_inicio: tarea?.hora_inicio || '',
    duracion_min: tarea?.duracion_min || '',
    consultor_id: tarea?.consultor_id || '',
    descripcion: tarea?.descripcion || '',
    horas_reales: tarea?.horas_reales || '',
  });
  const [equipo, setEquipo] = useState([]);
  const [ocupadas, setOcupadas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    listTable('perfiles').then((ps) => setEquipo(
      (ps || [])
        .filter((p) => ['consultor', 'director', 'admin', 'superadmin'].includes(p.rol) && p.activo !== false)
        .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''))),
    )).catch(() => setEquipo([]));
    listTable('tareas_programadas').then((ts) => setOcupadas(ts || [])).catch(() => setOcupadas([]));
  }, []);

  // Qué tiene ya ese consultor ese día. No bloquea —a veces se solapan a
  // propósito— pero programar a ciegas es como se acaba con tres visitas el
  // mismo martes.
  const carga = useMemo(() => {
    if (!f.fecha || !f.consultor_id) return null;
    const suyas = ocupadas.filter((t) => String(t.consultor_id) === String(f.consultor_id)
      && String(t.fecha || '').slice(0, 10) === f.fecha
      && String(t.id) !== String(tarea?.id)
      && t.estado !== 'anulada');
    const minutos = suyas.reduce((a, t) => a + (Number(t.duracion_min) || 0), 0);
    return { n: suyas.length, horas: Math.round(minutos / 6) / 10, titulos: suyas.map((t) => t.titulo) };
  }, [f.fecha, f.consultor_id, ocupadas, tarea?.id]);

  const pasada = puedeDarsePorHecha(f.fecha);
  const finde = esFinDeSemana(f.fecha);

  async function guardar(marcarHecha = false) {
    if (marcarHecha && !pasada) {
      setError('Solo se puede dar por hecha una tarea con fecha de hoy o anterior.');
      return;
    }
    setGuardando(true); setError(null);
    try {
      const patch = {
        fecha: f.fecha || null,
        hora_inicio: f.hora_inicio || null,
        duracion_min: f.duracion_min ? Number(f.duracion_min) : null,
        consultor_id: f.consultor_id || null,
        descripcion: f.descripcion?.trim() || null,
      };
      if (marcarHecha) {
        patch.estado = 'hecha';
        // La fecha de ejecución es la de la tarea, no la de hoy: se está
        // registrando trabajo pasado y fecharlo hoy falsearía el histórico.
        patch.hecha_en = new Date(`${f.fecha}T12:00:00`).toISOString();
        patch.horas_reales = f.horas_reales ? Number(f.horas_reales) : null;
      } else if (tarea?.estado === 'hecha') {
        // Reabrir
        patch.estado = f.fecha ? 'programada' : 'pendiente';
        patch.hecha_en = null;
        patch.horas_reales = null;
      } else {
        patch.estado = f.fecha ? 'programada' : 'pendiente';
      }
      await updateRow('tareas_programadas', tarea.id, patch);
      onGuardado?.();
    } catch (e) {
      setError(explicarErrorBd(e, 'tareas_programadas'));
    } finally { setGuardando(false); }
  }

  const nombreDe = (id) => {
    const p = equipo.find((x) => String(x.id) === String(id));
    return p ? `${p.nombre || ''} ${p.apellidos || ''}`.trim() || p.email : '—';
  };

  return (
    <DialogoFicha
      titulo={tarea?.titulo || 'Programar tarea'}
      subtitulo={[tarea?.codigo, contexto?.norma, tarea?.subproceso].filter(Boolean).join(' · ')}
      onCerrar={onCerrar}
      haycambios
      ancho="680px"
      pie={<>
        <button onClick={onCerrar} className="btn-ghost !px-4 !py-1.5 text-[13px]">Cancelar</button>
        {tarea?.estado === 'hecha' ? (
          <button onClick={() => guardar(false)} disabled={guardando}
            className="btn-ghost !px-4 !py-1.5 text-[13px]">Reabrir</button>
        ) : (
          <button onClick={() => guardar(true)} disabled={guardando || !pasada}
            title={pasada ? 'Registrarla como ejecutada' : 'Solo con fecha de hoy o anterior'}
            className="rounded-full border border-emerald-400/50 px-4 py-1.5 text-[13px] font-bold text-emerald-300 transition hover:bg-emerald-500/10 disabled:opacity-30">
            ✓ Ya está hecha
          </button>
        )}
        <button onClick={() => guardar(false)} disabled={guardando}
          className="btn-orange !px-4 !py-1.5 text-[13px] disabled:opacity-50">
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </>}
    >
      <div className="space-y-3">
        <div className="form-grid">
          <div className="campo">
            <label className="label" htmlFor="pt-fecha">Fecha</label>
            <input id="pt-fecha" type="date" className="input" value={f.fecha}
              onChange={(e) => setF({ ...f, fecha: e.target.value })} />
            <p className="campo-nota">
              {f.fecha ? fmtFecha(f.fecha) : 'Sin fecha queda pendiente, fuera del calendario.'}
            </p>
          </div>
          <div className="campo">
            <label className="label" htmlFor="pt-hora">Hora</label>
            <input id="pt-hora" type="time" className="input" value={f.hora_inicio}
              onChange={(e) => setF({ ...f, hora_inicio: e.target.value })} />
            <p className="campo-nota">Opcional. Sin hora ocupa el día entero.</p>
          </div>
          <div className="campo">
            <label className="label" htmlFor="pt-dur">Duración</label>
            <div className="flex items-center gap-2">
              <input id="pt-dur" type="number" min="15" step="15" className="input" value={f.duracion_min}
                onChange={(e) => setF({ ...f, duracion_min: e.target.value })} />
              <span className="text-[12px] font-bold text-[#7FA7B4]">min</span>
            </div>
            <p className="campo-nota">
              {f.duracion_min ? `${(Number(f.duracion_min) / 60).toFixed(1)} h` : 'Del catálogo del modelo.'}
            </p>
          </div>
          <div className="campo">
            <label className="label" htmlFor="pt-cons">Responsable</label>
            <select id="pt-cons" className="input" value={f.consultor_id}
              onChange={(e) => setF({ ...f, consultor_id: e.target.value })}>
              <option value="">— sin asignar —</option>
              {equipo.map((p) => (
                <option key={p.id} value={p.id}>
                  {`${p.nombre || ''} ${p.apellidos || ''}`.trim() || p.email}{p.nivel ? ` · ${p.nivel}` : ''}
                </option>
              ))}
            </select>
            <p className="campo-nota">
              {f.consultor_id && f.fecha
                ? 'Aparecerá en su agenda ese día.'
                : 'Con fecha y responsable entra en su calendario.'}
            </p>
          </div>
        </div>

        {finde && (
          <p className="rounded-lg bg-amber-400/10 px-3 py-2 text-[12px] font-bold text-amber-200">
            Es fin de semana. Si es una auditoría o una visita pactada, adelante.
          </p>
        )}

        {carga && carga.n > 0 && (
          <div className="rounded-lg border border-[#1E5468] bg-[#0B2E3D] px-3 py-2">
            <p className="text-[12px] font-bold text-[#EAF4F7]">
              {nombreDe(f.consultor_id)} ya tiene {carga.n} tarea{carga.n === 1 ? '' : 's'} ese día
              {carga.horas ? ` · ${carga.horas} h` : ''}
            </p>
            <ul className="mt-1 space-y-0.5">
              {carga.titulos.slice(0, 4).map((t, i) => (
                <li key={i} className="truncate text-[11.5px] text-[#9FC0CB]">· {t}</li>
              ))}
              {carga.titulos.length > 4 && <li className="text-[11.5px] text-[#7FA7B4]">· y {carga.titulos.length - 4} más</li>}
            </ul>
          </div>
        )}

        <div className="campo">
          <label className="label" htmlFor="pt-desc">Notas de la tarea</label>
          <textarea id="pt-desc" rows={3} className="input !h-auto !py-2" value={f.descripcion}
            placeholder="Qué hay que preparar, con quién, qué se entrega…"
            onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
        </div>

        {/* Cerrar una tarea del pasado: hace falta al cargar proyectos que ya
            estaban en marcha. */}
        {pasada && tarea?.estado !== 'hecha' && (
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/[0.07] px-3 py-2.5">
            <p className="text-[12.5px] font-bold text-emerald-300">Esta fecha ya ha pasado</p>
            <p className="mt-0.5 text-[11.5px] text-[#DFF1F5]">
              Si el trabajo se hizo, márcalo con «Ya está hecha». Se registrará con fecha
              {' '}{fmtFecha(f.fecha)}, no con la de hoy.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <label className="label !mb-0" htmlFor="pt-hr">Horas reales</label>
              <input id="pt-hr" type="number" min="0" step="0.5"
                className="input !h-8 !w-24 !py-0 !text-[12.5px]" value={f.horas_reales}
                placeholder={f.duracion_min ? String(Number(f.duracion_min) / 60) : ''}
                onChange={(e) => setF({ ...f, horas_reales: e.target.value })} />
              <span className="text-[11.5px] text-[#7FA7B4]">para el planificado frente a real</span>
            </div>
          </div>
        )}

        {tarea?.estado === 'hecha' && (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-[12.5px] font-bold text-emerald-300">
            Hecha{tarea.hecha_en ? ` el ${new Date(tarea.hecha_en).toLocaleDateString('es-ES')}` : ''}
            {tarea.horas_reales ? ` · ${tarea.horas_reales} h reales` : ''}
          </p>
        )}

        {error && <p className="text-[12.5px] font-bold text-red-300">{error}</p>}
      </div>
    </DialogoFicha>
  );
}
