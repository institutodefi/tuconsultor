import { useEffect, useMemo, useState } from 'react';
import { listTable, insertRow, updateRow, deleteRow, explicarErrorBd } from '../../lib/data.js';
import { useAuth } from '../../lib/auth.jsx';
import { horasSugeridasEquipo } from '../../lib/controlHoras.js';
const NIVELES_R = ['J1', 'J2', 'J3', 'Senior'];

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

export default function EquipoProyecto({ proyectoId, horasComprometidas = 0, repartoPrevisto: repartoProp = null, onRepartoGuardado }) {
  // El reparto por nivel del proyecto (de la oferta) se puede afinar aquí:
  // «J1 90 % · Senior 10 %». Es lo que reparte las horas entre el equipo.
  const [repartoPrevisto, setRepartoPrevisto] = useState(repartoProp);
  useEffect(() => { setRepartoPrevisto(repartoProp); }, [repartoProp]);
  const [editReparto, setEditReparto] = useState(null);
  const { role } = useAuth();
  const puedeAsignar = ['superadmin', 'admin', 'director'].includes(role);

  const [equipo, setEquipo] = useState(null);
  const [perfiles, setPerfiles] = useState([]);
  const [nuevo, setNuevo] = useState({ perfil_id: '', papel: 'consultor' });
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

  // Horas sugeridas por persona: las comprometidas del proyecto repartidas
  // según el reparto por nivel de la oferta (J1 80 % · Senior 20 %…) entre
  // las personas de cada nivel. Al aplicarlas quedan como horas_asignadas y
  // de ahí salen el control de horas y la programación.
  const sugeridas = useMemo(() => {
    if (!equipo?.length || !horasComprometidas) return null;
    const miembros = equipo.map((e) => ({ perfil_id: String(e.perfil_id), papel: e.papel || 'consultor', horas_asignadas: 0, nivel: e.nivel || nivelDe(e.perfil_id) }));
    return horasSugeridasEquipo(horasComprometidas, repartoPrevisto, miembros);
  }, [equipo, horasComprometidas, repartoPrevisto, perfiles]);
  const asignadasTotal = (equipo || []).reduce((a, e) => a + (Number(e.horas_asignadas) || 0), 0);
  const sugeridasDifieren = !!sugeridas && (equipo || []).some((e) => Math.abs((Number(e.horas_asignadas) || 0) - (sugeridas.horas[String(e.perfil_id)] || 0)) > 0.5);

  async function aplicarSugeridas() {
    if (!sugeridas) return;
    setOcupado(true); setMsg(null);
    try {
      for (const e of equipo) await updateRow('proyecto_equipo', e.id, { horas_asignadas: sugeridas.horas[String(e.perfil_id)] || 0 });
      await cargar();
      setMsg({ err: false, t: 'Horas asignadas según el reparto de la oferta. El control de horas y la programación ya las usan.' });
    } catch (x) { setMsg({ err: true, t: explicarErrorBd(x, 'proyecto_equipo') }); }
    finally { setOcupado(false); }
  }
  async function guardarReparto() {
    const suma = NIVELES_R.reduce((a, k) => a + (Number(editReparto[k]) || 0), 0);
    if (Math.abs(suma - 100) > 0.5) { setMsg({ err: true, t: `El reparto suma ${Math.round(suma)} %: tiene que sumar 100.` }); return; }
    setOcupado(true); setMsg(null);
    try {
      const r = Object.fromEntries(NIVELES_R.map((k) => [k, Number(editReparto[k]) || 0]));
      await updateRow('proyectos_cliente', proyectoId, { reparto_niveles: r });
      setRepartoPrevisto(r); setEditReparto(null); onRepartoGuardado?.(r);
      setMsg({ err: false, t: 'Reparto guardado. Las horas de cada persona salen de él salvo que tengan horas asignadas.' });
    } catch (x) { setMsg({ err: true, t: explicarErrorBd(x, 'proyectos_cliente') }); }
    finally { setOcupado(false); }
  }
  async function cambiarHoras(e, v) {
    const h = Math.max(0, Number(String(v).replace(',', '.')) || 0);
    try { await updateRow('proyecto_equipo', e.id, { horas_asignadas: h }); await cargar(); }
    catch (x) { setMsg({ err: true, t: explicarErrorBd(x, 'proyecto_equipo') }); }
  }


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
        // Sin horas: se reparten al programar cada tarea, que es donde se sabe
        // cuántas lleva y quién la hace. Pedirlas aquí obliga a inventarse un
        // número antes de tener la información.
      });
      setNuevo({ perfil_id: '', papel: 'consultor' });
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
          <span className="text-[11.5px] text-[#7FA7B4]">{horasComprometidas} h comprometidas en el proyecto</span>
        )}
      </div>

      {/* Lo que se previó al ofertar: qué parte del trabajo hace cada nivel.
          Es la guía para asignar; no obliga. */}
      {editReparto && (
        <div className="rounded-lg border border-brand-orange/40 bg-[#0B2E3D] px-3 py-2">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#9FC0CB]">Reparto de la carga por nivel</p>
          <div className="mt-1.5 flex flex-wrap items-end gap-2">
            {NIVELES_R.map((k) => (
              <label key={k} className="text-[11px] text-[#9FC0CB]">{k}
                <input type="number" min="0" max="100" step="5" className="input ml-1 !w-16 !px-1.5 !py-0.5 text-right !text-[12px]" value={editReparto[k] ?? 0} onChange={(ev) => setEditReparto({ ...editReparto, [k]: Math.max(0, Math.min(100, Number(ev.target.value) || 0)) })} /> %
              </label>
            ))}
            <button type="button" onClick={guardarReparto} disabled={ocupado} className="btn-orange !px-3 !py-1 text-[12px] disabled:opacity-50">Guardar</button>
            <button type="button" onClick={() => setEditReparto(null)} className="btn-ghost !px-2.5 !py-1 text-[12px]">Cancelar</button>
          </div>
        </div>
      )}
      {!editReparto && puedeAsignar && !(repartoPrevisto && Object.values(repartoPrevisto).some((v) => Number(v) > 0)) && (
        <p className="rounded-lg border border-dashed border-[#1E5468] px-3 py-2 text-[11.5px] text-[#7FA7B4]">
          Sin reparto por nivel: las horas se reparten a partes iguales entre quienes ejecutan.{' '}
          <button type="button" onClick={() => setEditReparto({ J1: 80, J2: 0, J3: 0, Senior: 20 })} className="font-bold text-brand-orange hover:underline">Definir reparto</button>
        </p>
      )}
      {!editReparto && repartoPrevisto && Object.values(repartoPrevisto).some((v) => Number(v) > 0) && (
        <p className="rounded-lg border border-brand-orange/30 bg-brand-orange/[0.06] px-3 py-2 text-[11.5px] text-[#DFF1F5]">
          <b className="text-brand-orange">Previsto en la oferta:</b>{' '}
          {['Senior', 'J3', 'J2', 'J1'].filter((k) => Number(repartoPrevisto[k]) > 0).map((k) => `${k} ${repartoPrevisto[k]} %`).join(' · ')}
          {' '}de la carga.
          {puedeAsignar && <button type="button" onClick={() => setEditReparto(Object.fromEntries(NIVELES_R.map((k) => [k, Number(repartoPrevisto[k]) || 0])))} className="ml-1.5 text-[11.5px] font-bold text-brand-orange hover:underline">Ajustar</button>}
          {' '}Asigna personas de esos niveles para que el coste cuadre con el precio.
          {sugeridas && Object.keys(sugeridas.horas).length > 0 && (
            <span className="mt-1 block">
              <b className="text-brand-orange">Horas estimadas por persona:</b>{' '}
              {equipo.map((e) => `${nombreDe(e.perfil_id)} ${sugeridas.horas[String(e.perfil_id)] || 0} h`).join(' · ')}
              {sugeridas.sinCubrir.length > 0 && <span className="text-amber-200"> · sin nadie de nivel {sugeridas.sinCubrir.join(', ')}: su parte va a los demás</span>}
              {puedeAsignar && sugeridasDifieren && (
                <button type="button" onClick={aplicarSugeridas} disabled={ocupado} className="ml-2 text-[11.5px] font-bold text-brand-orange hover:underline disabled:opacity-50">
                  {asignadasTotal > 0 ? 'Volver a las horas sugeridas' : 'Aplicar como horas asignadas'}
                </button>
              )}
            </span>
          )}
        </p>
      )}

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
              <span className="flex-1" />
              {puedeAsignar ? (
                <label className="flex items-center gap-1 text-[10.5px] text-[#7FA7B4]" title="Horas de este proyecto que le tocan. Mandan sobre el reparto por nivel.">
                  <input type="number" min="0" step="0.5" className="input !w-20 !px-1.5 !py-0.5 text-right !text-[12px]" defaultValue={e.horas_asignadas || ''} placeholder={sugeridas?.horas[String(e.perfil_id)] ? String(sugeridas.horas[String(e.perfil_id)]) : '0'}
                    key={`${e.id}-${e.horas_asignadas}`} onBlur={(ev) => { if (String(ev.target.value) !== String(e.horas_asignadas ?? '')) cambiarHoras(e, ev.target.value); }} disabled={ocupado} />
                  h
                </label>
              ) : (
                (Number(e.horas_asignadas) > 0 || sugeridas?.horas[String(e.perfil_id)]) ? <span className="text-[11px] text-[#9FC0CB]">{Number(e.horas_asignadas) > 0 ? `${e.horas_asignadas} h` : `≈ ${sugeridas.horas[String(e.perfil_id)]} h`}</span> : null
              )}
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
