import { useEffect, useMemo, useState } from 'react';
import { listTable, insertRow, updateRow, deleteRow, explicarErrorBd } from '../../lib/data.js';
import { useAuth } from '../../lib/auth.jsx';

// ════════════════════════════════════════════════════════════════════════════
// EQUIPO DEL PROYECTO
//
// Quién trabaja en este proyecto y con qué papel. De aquí sale «mis proyectos»
// en el panel de cada consultor.
//
// Antes el equipo colgaba del CLIENTE: un cliente, un equipo fijo. Pero un
// mismo cliente puede tener una implantación de 27001 con el especialista en
// seguridad y un mantenimiento de 9001 con otra persona; con el equipo atado al
// cliente había que poner a los dos en todo o dejar a uno sin ver su trabajo.
//
// Asignar equipo lo hace dirección: reparte carga de otras personas y
// compromete su agenda.
// ════════════════════════════════════════════════════════════════════════════

const PAPELES = [
  ['responsable', 'Responsable', 'Rinde cuentas del proyecto'],
  ['consultor', 'Consultor', 'Ejecuta las tareas'],
  ['apoyo', 'Apoyo', 'Participación puntual'],
];
const ETQ = Object.fromEntries(PAPELES.map(([k, v]) => [k, v]));

export default function EquipoProyecto({ proyectoId, horasComprometidas = 0 }) {
  const { role } = useAuth();
  const puedeAsignar = ['superadmin', 'admin', 'director'].includes(role);

  const [equipo, setEquipo] = useState(null);
  const [perfiles, setPerfiles] = useState([]);
  const [nuevo, setNuevo] = useState({ perfil_id: '', papel: 'consultor', horas_asignadas: '' });
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = async () => {
    const [e, p] = await Promise.all([
      listTable('proyecto_equipo').catch(() => []),
      listTable('perfiles').catch(() => []),
    ]);
    setEquipo((e || []).filter((x) => String(x.proyecto_id) === String(proyectoId)));
    setPerfiles((p || [])
      .filter((x) => ['consultor', 'director', 'admin', 'superadmin'].includes(x.rol) && x.activo !== false)
      .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''))));
  };
  useEffect(() => { if (proyectoId) cargar(); }, [proyectoId]);   // eslint-disable-line react-hooks/exhaustive-deps

  const nombreDe = (id) => {
    const p = perfiles.find((x) => String(x.id) === String(id));
    return p ? `${p.nombre || ''} ${p.apellidos || ''}`.trim() || p.email : 'desconocido';
  };
  const nivelDe = (id) => perfiles.find((x) => String(x.id) === String(id))?.nivel || null;

  const libres = useMemo(
    () => perfiles.filter((p) => !(equipo || []).some((e) => String(e.perfil_id) === String(p.id))),
    [perfiles, equipo],
  );

  const repartidas = (equipo || []).reduce((a, e) => a + (Number(e.horas_asignadas) || 0), 0);
  const sinRepartir = Math.round((horasComprometidas - repartidas) * 10) / 10;

  async function anadir() {
    if (!nuevo.perfil_id) { setMsg({ err: true, t: 'Elige a quién asignas.' }); return; }
    setOcupado(true); setMsg(null);
    try {
      // Un solo responsable: si ya hay otro, baja a consultor. La base tiene un
      // índice único que lo impediría, así que se resuelve antes de insertar.
      if (nuevo.papel === 'responsable') {
        const actual = (equipo || []).find((e) => e.papel === 'responsable');
        if (actual) await updateRow('proyecto_equipo', actual.id, { papel: 'consultor' });
      }
      await insertRow('proyecto_equipo', {
        proyecto_id: proyectoId,
        perfil_id: nuevo.perfil_id,
        papel: nuevo.papel,
        horas_asignadas: nuevo.horas_asignadas ? Number(nuevo.horas_asignadas) : null,
      });
      setNuevo({ perfil_id: '', papel: 'consultor', horas_asignadas: '' });
      await cargar();
    } catch (e) { setMsg({ err: true, t: explicarErrorBd(e, 'proyecto_equipo') }); }
    finally { setOcupado(false); }
  }

  async function cambiarPapel(e, papel) {
    setOcupado(true);
    try {
      if (papel === 'responsable') {
        const actual = (equipo || []).find((x) => x.papel === 'responsable' && x.id !== e.id);
        if (actual) await updateRow('proyecto_equipo', actual.id, { papel: 'consultor' });
      }
      await updateRow('proyecto_equipo', e.id, { papel });
      await cargar();
    } catch (x) { setMsg({ err: true, t: explicarErrorBd(x, 'proyecto_equipo') }); }
    finally { setOcupado(false); }
  }

  async function quitar(e) {
    if (!window.confirm(`¿Quitar a ${nombreDe(e.perfil_id)} del proyecto?\n\nDejará de verlo en su panel. Las tareas que ya tenga programadas siguen en su agenda.`)) return;
    setOcupado(true);
    try { await deleteRow('proyecto_equipo', e.id); await cargar(); }
    catch (x) { setMsg({ err: true, t: explicarErrorBd(x, 'proyecto_equipo') }); }
    finally { setOcupado(false); }
  }

  if (equipo === null) return <p className="text-[12.5px] text-[#7FA7B4]">Cargando equipo…</p>;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-[13.5px] font-extrabold text-[#EAF4F7]">Equipo asignado ({equipo.length})</h4>
        {horasComprometidas > 0 && (
          <span className="text-[11.5px] text-[#7FA7B4]">
            {repartidas} de {horasComprometidas} h repartidas
            {sinRepartir > 0 && <span className="ml-1 font-bold text-amber-200">· {sinRepartir} h sin asignar</span>}
            {sinRepartir < 0 && <span className="ml-1 font-bold text-red-300">· {-sinRepartir} h de más</span>}
          </span>
        )}
      </div>

      {equipo.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#1E5468] px-3 py-2.5 text-[12px] text-[#7FA7B4]">
          Nadie asignado. Sin equipo, este proyecto no aparece en el panel de ningún consultor.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {equipo.sort((a, b) => (a.papel === 'responsable' ? -1 : 1)).map((e) => (
            <li key={e.id} className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg border px-2.5 py-1.5 ${
              e.papel === 'responsable' ? 'border-brand-orange/40 bg-brand-orange/[0.06]' : 'border-[#1E5468] bg-[#0B2E3D]'}`}>
              <span className="text-[12.5px] font-bold text-[#EAF4F7]">{nombreDe(e.perfil_id)}</span>
              {nivelDe(e.perfil_id) && (
                <span className="chip !px-1.5 !py-0 bg-[#123F52] text-[10px] text-[#9FC0CB]">{nivelDe(e.perfil_id)}</span>
              )}
              {puedeAsignar ? (
                <select value={e.papel} onChange={(ev) => cambiarPapel(e, ev.target.value)} disabled={ocupado}
                  className="rounded-lg border border-[#1E5468] bg-[#10394A] px-2 py-0.5 text-[11px] font-bold text-[#CFE3E9]">
                  {PAPELES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              ) : (
                <span className="text-[11.5px] font-bold text-[#9FC0CB]">{ETQ[e.papel]}</span>
              )}
              {e.horas_asignadas && (
                <span className="text-[11.5px] font-bold text-brand-orange">{e.horas_asignadas} h</span>
              )}
              <span className="flex-1" />
              {puedeAsignar && (
                <button onClick={() => quitar(e)} disabled={ocupado}
                  className="text-[11px] font-bold text-red-300/70 hover:text-red-300">×</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {puedeAsignar && libres.length > 0 && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-[#1E5468] bg-[#0D3242] px-2.5 py-2">
          <select className="input !h-8 !w-auto !py-0 !text-[12.5px]" value={nuevo.perfil_id}
            onChange={(ev) => setNuevo({ ...nuevo, perfil_id: ev.target.value })}>
            <option value="">— añadir a alguien —</option>
            {libres.map((p) => (
              <option key={p.id} value={p.id}>
                {`${p.nombre || ''} ${p.apellidos || ''}`.trim() || p.email}{p.nivel ? ` · ${p.nivel}` : ''}
              </option>
            ))}
          </select>
          <select className="input !h-8 !w-auto !py-0 !text-[12.5px]" value={nuevo.papel}
            onChange={(ev) => setNuevo({ ...nuevo, papel: ev.target.value })}>
            {PAPELES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="number" min="0" step="0.5" placeholder="horas"
            className="input !h-8 !w-20 !py-0 !text-[12.5px]" value={nuevo.horas_asignadas}
            onChange={(ev) => setNuevo({ ...nuevo, horas_asignadas: ev.target.value })} />
          <button onClick={anadir} disabled={ocupado || !nuevo.perfil_id}
            className="btn-orange !px-3 !py-1 text-[12px] disabled:opacity-40">Asignar</button>
        </div>
      )}

      {!puedeAsignar && (
        <p className="text-[11px] text-[#7FA7B4]">El equipo lo asigna dirección de proyecto.</p>
      )}
      {msg && <p className={`text-[12px] font-bold ${msg.err ? 'text-red-300' : 'text-emerald-300'}`}>{msg.t}</p>}
    </div>
  );
}
