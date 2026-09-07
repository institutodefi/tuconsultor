import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { updateRow, listTable } from '../lib/data.js';
import { funcionesDe, filasGantt, procesosDe, pendientesProyecto, TONO_PENDIENTE } from '../lib/zonaCliente.js';
import { estadoAuditoriaProyecto, aISO } from '../lib/auditorias.js';

// ════════════════════════════════════════════════════════════════════════════
// ZONA CLIENTE · qué ve el cliente de este proyecto
//
// Lo decide el equipo desde la ficha del proyecto, función a función:
//   · PM tool: Gantt y gestión de tareas con responsables.
//   · Sus datos y documentos, enlazados a su ficha de cliente.
//   · Mapa de procesos: se activan uno a uno los procesos (PE1, PA4…) cuyas
//     tareas el cliente puede seguir.
// Se guarda en proyectos_cliente.funciones (v124) y se puede previsualizar.
// ════════════════════════════════════════════════════════════════════════════

export default function ZonaClienteConfig({ proyecto, tareas = [], sesiones = [], cliente = null, onGuardado }) {
  const [f, setF] = useState(() => funcionesDe(proyecto));
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState(null);
  const procesos = useMemo(() => procesosDe(filasGantt(tareas, [], proyecto)), [tareas, proyecto]);
  // Lo que el cliente tiene pendiente, tal como lo verá él (más lo interno).
  const [extra, setExtra] = useState({ certificados: [], documentos: [] });
  useEffect(() => {
    Promise.all([listTable('cliente_certificados').catch(() => []), listTable('cliente_documentos').catch(() => [])])
      .then(([c, dd]) => setExtra({ certificados: c || [], documentos: dd || [] }));
  }, [proyecto?.id]);
  const pendientes = useMemo(() => {
    const hoy = aISO(new Date());
    const filas = filasGantt(tareas, sesiones, proyecto, hoy);
    return pendientesProyecto({ proyecto, filas, cliente, certificados: extra.certificados, documentos: extra.documentos, auditoria: estadoAuditoriaProyecto(proyecto, extra.certificados, hoy) });
  }, [tareas, sesiones, proyecto, cliente, extra]);

  async function guardar(next) {
    setF(next); setOcupado(true); setMsg(null);
    try { await updateRow('proyectos_cliente', proyecto.id, { funciones: next }); onGuardado?.(next); setMsg('Guardado: el cliente ya lo ve así.'); }
    catch (e) { setMsg(/funciones/i.test(String(e?.message || e)) ? 'Falta aplicar la migración v124 (proyectos_cliente.funciones).' : `No se pudo guardar: ${e?.message || e}`); }
    finally { setOcupado(false); }
  }
  const toggle = (k) => guardar({ ...f, [k]: !f[k] });
  const toggleProceso = (cod) => guardar({ ...f, procesos: f.procesos.includes(cod) ? f.procesos.filter((x) => x !== cod) : [...f.procesos, cod] });
  const todos = () => guardar({ ...f, procesos: procesos.map((p) => p.codigo) });
  const ninguno = () => guardar({ ...f, procesos: [] });

  return (
    <div className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h4 className="text-[13.5px] font-extrabold text-[#EAF4F7]">Zona cliente · qué ve el cliente</h4>
          <p className="mt-0.5 text-[11.5px] text-[#7FA7B4]">Se activa por funciones. Lo que no esté activado, el cliente no lo ve.</p>
        </div>
        <Link to={`/consultores/proyectos/${proyecto.id}/cliente`} className="btn-ghost !px-3 !py-1 text-[12px]">Previsualizar como cliente →</Link>
      </div>

      <div className={`mt-3 rounded-xl border px-3 py-2 ${pendientes.some((x) => x.nivel === 'rojo') ? 'border-red-400/40 bg-red-500/[0.06]' : pendientes.length ? 'border-amber-300/40 bg-amber-400/[0.06]' : 'border-emerald-400/30 bg-emerald-500/[0.06]'}`}>
        <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#9FC0CB]">{pendientes.length ? `Pendiente para el cliente · ${pendientes.length}` : 'Al día'}</p>
        {pendientes.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {pendientes.map((x, i) => <span key={i} className={`chip border !px-2 !py-0.5 text-[11px] font-bold ${TONO_PENDIENTE[x.nivel].chip}`}>{x.texto}{x.interno ? ' · interno' : ''}</span>)}
          </div>
        ) : <p className="mt-1 text-[12px] text-emerald-200">Nada pendiente.</p>}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {[
          ['pm_tool', 'PM tool · Gantt y tareas', 'Planificación con el Gantt, tareas con responsable, fechas, estado y checklist. Solo lectura para el cliente.'],
          ['datos_cliente', 'Su empresa y documentos', 'Datos de empresa, sedes y normas certificadas con su alcance (editables, con propuestas de la IA desde sus documentos), más sus documentos. Todo enlazado a su ficha de cliente.'],
        ].map(([k, etq, desc]) => (
          <button key={k} type="button" onClick={() => toggle(k)} disabled={ocupado}
            className={`rounded-xl border p-3 text-left transition ${f[k] ? 'border-brand-verde/60 bg-brand-verde/10' : 'border-[#1E5468] bg-[#0B2E3D] hover:border-brand-orange/50'}`}>
            <p className="flex items-center justify-between text-[13px] font-extrabold text-[#EAF4F7]"><span>{etq}</span><span className={`chip !px-2 !py-0 text-[10px] ${f[k] ? 'bg-brand-verde/20 text-brand-verdeTexto' : 'bg-[#123F52] text-[#9FC0CB]'}`}>{f[k] ? 'activa' : 'apagada'}</span></p>
            <p className="mt-1 text-[11.5px] text-[#9FC0CB]">{desc}</p>
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-[#1E5468] bg-[#0B2E3D] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] font-extrabold text-[#EAF4F7]">Mapa de procesos · {f.procesos.length} de {procesos.length} activos</p>
          <div className="flex gap-2 text-[11px] font-bold">
            <button type="button" onClick={todos} disabled={ocupado} className="text-brand-orange hover:underline">Activar todos</button>
            <button type="button" onClick={ninguno} disabled={ocupado} className="text-[#7FA7B4] hover:text-[#EAF4F7]">Ninguno</button>
          </div>
        </div>
        {procesos.length === 0 ? (
          <p className="mt-1.5 text-[11.5px] text-[#7FA7B4]">Sin tareas volcadas todavía: los procesos salen de las tareas del proyecto.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {procesos.map((p) => {
              const on = f.procesos.includes(p.codigo);
              return (
                <button key={p.codigo} type="button" onClick={() => toggleProceso(p.codigo)} disabled={ocupado} title={p.nombre}
                  className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-bold transition ${on ? 'border-brand-verde/60 bg-brand-verde/15 text-brand-verdeTexto' : 'border-[#1E5468] text-[#9FC0CB] hover:border-brand-orange/60'}`}>
                  {on ? '✓ ' : ''}{p.codigo} <span className="font-medium opacity-70">· {p.n} tarea{p.n === 1 ? '' : 's'}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {msg && <p className="mt-2 text-[12px] font-bold text-[#9FC0CB]">{msg}</p>}
    </div>
  );
}
