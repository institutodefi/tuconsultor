import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { listTable } from '../../lib/data.js';
import { useAuth } from '../../lib/auth.jsx';
import { NORMA_BY_ID, MODELOS } from '../../lib/calcEngine.js';
import { funcionesDe, filasGantt, procesosDe, resumenProyecto, ESTADOS_TAREA, pendientesProyecto, TONO_PENDIENTE } from '../../lib/zonaCliente.js';
import { estadoAuditoriaProyecto } from '../../lib/auditorias.js';
import GanttProyecto from '../../components/GanttProyecto.jsx';
import PlanificadorArrastre from '../../components/PlanificadorArrastre.jsx';
import DocumentosCliente from '../../components/DocumentosCliente.jsx';
import MisDatosCliente from './MisDatosCliente.jsx';
import DatosEmpresaCliente from './DatosEmpresaCliente.jsx';
import ResumenEmpresa from './ResumenEmpresa.jsx';
import { rolCuenta } from '../../lib/cuentaClientePuro.js';
import { normalizarSubtareas } from '../../lib/subtareas.js';
import { numeroES as nES } from '../../lib/formato.js';
const numeroES = (v) => nES(v, null);   // horas sin ceros de relleno: «4 h», «2,5 h»

// ════════════════════════════════════════════════════════════════════════════
// EL PROYECTO, VISTO POR EL CLIENTE
//
// Un panel por proyecto, con lo que el equipo le haya activado (funciones):
//   1. PM tool · Gantt y gestión de tareas con responsables, fechas, estado y
//      checklist. Solo lectura para el cliente: lo que hay que hacer, quién y
//      cuándo, tal como lo lleva su consultor.
//   2. Su empresa: datos de empresa, sedes y normas certificadas con su
//      alcance (editables, con propuestas leídas de sus documentos por IA),
//      más sus documentos. Todo enlazado a su ficha de cliente.
//   3. Mapa de procesos: los procesos que se le van activando, con sus tareas
//      y su avance.
//
// El equipo puede abrir esta misma vista desde la ficha del proyecto
// («previsualizar»): así ve lo que ve el cliente.
// ════════════════════════════════════════════════════════════════════════════

const fmt = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function ProyectoCliente({ proyectoId: idProp = null, previsualizacion = false }) {
  const { id: idRuta } = useParams();
  const proyectoId = idProp || idRuta;
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [seccion, setSeccion] = useState('panel');   // panel | datos | procesos
  const [tareaAbierta, setTareaAbierta] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const [proyectos, tareas, sesiones, equipo, clientes, contactos, certificados, documentos, empresas, usuariosCuenta, perfiles] = await Promise.all([
        listTable('proyectos_cliente').catch(() => []),
        listTable('cliente_tareas').catch(() => []),
        listTable('tarea_sesiones').catch(() => []),
        listTable('equipo_visible_proyecto').catch(() => []),
        listTable('clientes').catch(() => []),
        listTable('contactos').catch(() => []),
        listTable('cliente_certificados').catch(() => []),
        listTable('cliente_documentos').catch(() => []),
        listTable('empresas').catch(() => []),
        listTable('cliente_usuarios').catch(() => []),
        previsualizacion ? listTable('perfiles').catch(() => []) : Promise.resolve([]),
      ]);
      if (!vivo) return;
      const p = proyectos.find((x) => String(x.id) === String(proyectoId)) || null;
      const cliente = p ? clientes.find((c) => String(c.id) === String(p.cliente_id)) || null : null;
      const correo = (user?.email || '').toLowerCase();
      const contacto = contactos.find((c) => (c.email || '').toLowerCase() === correo) || null;
      // Nombre comercial de la empresa (CRM) si lo hay; si no, el de la ficha de cliente.
      const cif = (x) => String(x || '').toUpperCase().replace(/[\s.-]/g, '');
      const empresa = cliente?.cif ? empresas.find((e) => cif(e.cif) === cif(cliente.cif)) : null;
      setD({ p, tareas, sesiones, equipo: equipo.filter((e) => String(e.proyecto_id) === String(proyectoId)), cliente, contacto, certificados, documentos, usuariosCuenta, perfiles, nombreCliente: empresa?.nombre_comercial || empresa?.nombre || cliente?.empresa || null });
    })();
    return () => { vivo = false; };
  }, [proyectoId, user?.email, recarga]);

  const hoy = hoyISO();
  const filas = useMemo(() => (d?.p ? filasGantt(d.tareas, d.sesiones, d.p, hoy) : []), [d, hoy]);
  const funciones = useMemo(() => funcionesDe(d?.p), [d]);
  // Administrador de cuenta: edita los datos de su empresa. Usuario de cuenta:
  // solo los ve. El equipo, en previsualización, lo ve como administrador.
  const rol = useMemo(() => {
    if (previsualizacion) return 'admin';
    if (!d?.cliente) return null;
    const r = rolCuenta(user, d.cliente, d.usuariosCuenta || []);
    if (r) return r;
    const correo = (user?.email || '').toLowerCase();
    return correo && (d.cliente.email || '').toLowerCase() === correo ? 'admin' : 'usuario';
  }, [d, user, previsualizacion]);
  const procesos = useMemo(() => procesosDe(filas), [filas]);
  const resumen = useMemo(() => resumenProyecto(filas), [filas]);
  // Lo que tiene pendiente: certificación, auditoría externa, tareas con
  // retraso, certificados y documentos que faltan, datos incompletos.
  const pendientes = useMemo(() => {
    if (!d?.p) return [];
    const auditoria = estadoAuditoriaProyecto(d.p, d.certificados || [], hoy);
    return pendientesProyecto({ proyecto: d.p, filas, cliente: d.cliente, certificados: d.certificados || [], documentos: d.documentos || [], auditoria })
      .filter((x) => previsualizacion || !x.interno);   // lo interno solo lo ve el equipo
  }, [d, filas, hoy, previsualizacion]);
  // Nombre de quien lleva una tarea: del equipo visible del proyecto; si no
  // está ahí (alguien de administración programó sin estar en el equipo), de
  // perfiles cuando quien mira es del equipo, y «Equipo TuConsultor» para el
  // cliente: nunca «por asignar» si hay alguien detrás.
  const nombreDe = (id) => {
    if (!id) return null;
    const e = (d?.equipo || []).find((x) => String(x.perfil_id) === String(id));
    if (e) return `${e.nombre || ''} ${e.apellidos || ''}`.trim();
    const pf = (d?.perfiles || []).find((x) => String(x.id) === String(id));
    if (pf) return `${pf.nombre || ''} ${pf.apellidos || ''}`.trim() || pf.email;
    return 'Equipo TuConsultor';
  };

  if (!d) return <p className="font-semibold text-[#9FC0CB]">Cargando tu proyecto…</p>;
  if (!d.p) return <div className="card"><p className="font-bold text-[#EAF4F7]">No encontramos este proyecto.</p><Link to={previsualizacion ? '/consultores/proyectos' : '/cliente'} className="mt-2 inline-block text-sm font-bold text-brand-orange">← Volver</Link></div>;

  const p = d.p;
  const normas = (p.normas || []).map((n) => NORMA_BY_ID[n]?.nombre || n).join(' + ');
  const procesosActivos = procesos.filter((pr) => funciones.procesos.includes(pr.codigo));
  const responsable = d.equipo.find((e) => e.papel === 'responsable') || d.equipo[0];
  const visibles = filas.filter((f) => filtroEstado === 'todas' || f.estado === filtroEstado);
  const nadaActivo = !funciones.pm_tool && !funciones.datos_cliente && !procesosActivos.length;

  const secciones = [
    funciones.pm_tool && ['panel', 'Panel y tareas'],
    funciones.datos_cliente && ['datos', 'Mi empresa y documentos'],
    procesosActivos.length > 0 && ['procesos', `Mapa de procesos (${procesosActivos.length})`],
  ].filter(Boolean);
  const seccionActiva = secciones.some(([k]) => k === seccion) ? seccion : (secciones[0]?.[0] || null);

  return (
    <div className="space-y-4">
      {previsualizacion && (
        <p className="rounded-xl border border-brand-orange/50 bg-brand-orange/10 px-3 py-2 text-[12.5px] font-bold text-brand-orange">
          Vista previa de lo que ve <b>{d.nombreCliente || 'el cliente'}</b> con las funciones activadas ahora. <Link to={`/consultores/proyectos/${p.id}`} className="underline">Volver a la ficha</Link>
        </p>
      )}

      {/* Cabecera */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link to={previsualizacion ? `/consultores/proyectos/${p.id}` : '/cliente'} className="block text-[12px] font-bold text-[#9FC0CB] hover:text-brand-orange">← {previsualizacion ? 'Ficha del proyecto' : 'Mis servicios'}</Link>
            <p className="eyebrow mt-2">{d.nombreCliente ? `${d.nombreCliente} · tu proyecto` : 'Tu proyecto'}</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#EAF4F7]">{normas || p.nombre}</h1>
            <p className="mt-1 text-sm text-[#9FC0CB]">
              Modelo {p.modelo}{MODELOS[p.modelo]?.claim ? ` · ${MODELOS[p.modelo].claim}` : ''}{p.codigo ? ` · ${p.codigo}` : ''}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-4">
            {[['Inicio', fmt(p.fecha_inicio)], ['Certificación prevista', fmt(p.fecha_limite || p.fecha_certificacion)], ['Fin', fmt(p.fecha_fin)], ['Tu consultor', responsable ? `${responsable.nombre || ''} ${responsable.apellidos || ''}`.trim() : '—']].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-[#1E5468] bg-[#0D3242] px-3 py-2">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{k}</p>
                <p className="mt-0.5 font-bold text-[#EAF4F7]">{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Señal de lo pendiente: lo rojo primero. Sin nada, se dice. */}
        <div className={`mt-4 rounded-xl border px-3 py-2 ${pendientes.some((x) => x.nivel === 'rojo') ? 'border-red-400/40 bg-red-500/[0.06]' : pendientes.length ? 'border-amber-300/40 bg-amber-400/[0.06]' : 'border-emerald-400/30 bg-emerald-500/[0.06]'}`}>
          <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#9FC0CB]">{pendientes.length ? `Pendiente · ${pendientes.length}` : 'Al día'}</p>
          {pendientes.length ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {pendientes.map((x, i) => (
                <button key={i} onClick={() => setSeccion(x.seccion)} className={`chip border !px-2 !py-0.5 text-left text-[11px] font-bold ${TONO_PENDIENTE[x.nivel].chip}`} title="Ir a la sección">
                  {x.texto}{x.interno ? ' · interno' : ''}
                </button>
              ))}
            </div>
          ) : <p className="mt-1 text-[12px] text-emerald-200">Nada pendiente: certificación, auditoría, tareas y documentación en orden.</p>}
        </div>

        {funciones.pm_tool && filas.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[['Avance', `${resumen.pct} %`, 'text-brand-verdeTexto'], ['Tareas', resumen.n, 'text-[#EAF4F7]'], ['Hechas', resumen.hechas, 'text-emerald-300'], ['En curso', resumen.enCurso, 'text-amber-200'], ['Con retraso', resumen.retrasadas, resumen.retrasadas ? 'text-red-300' : 'text-[#EAF4F7]'], ['Horas', `${numeroES(resumen.horasHechas)} / ${numeroES(resumen.horas)} h`, 'text-[#EAF4F7]']].map(([k, v, c]) => (
              <div key={k} className="rounded-xl bg-[#0D3242] px-3 py-2">
                <p className={`text-xl font-extrabold leading-none ${c}`}>{v}</p>
                <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{k}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {nadaActivo ? (
        <div className="card"><p className="text-sm text-[#9FC0CB]">Tu consultor está preparando este espacio. Pronto verás aquí el seguimiento del proyecto.</p></div>
      ) : (
        <>
          {secciones.length > 1 && (
            <div className="flex gap-1.5 border-b border-[#1E5468]">
              {secciones.map(([k, etq]) => (
                <button key={k} onClick={() => setSeccion(k)}
                  className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-bold transition ${seccionActiva === k ? 'border-brand-orange text-[#EAF4F7]' : 'border-transparent text-[#7FA7B4] hover:text-[#EAF4F7]'}`}>{etq}</button>
              ))}
            </div>
          )}

          {/* 1 · PM tool */}
          {seccionActiva === 'panel' && funciones.pm_tool && (
            <>
              <section className="card">
                <h2 className="text-sm font-extrabold text-[#EAF4F7]">Planificación</h2>
                <p className="mt-0.5 mb-3 text-[11.5px] text-[#7FA7B4]">Cada tarea entre su inicio y su fin, por proceso. La línea naranja es hoy.</p>
                <GanttProyecto filas={filas} proyecto={p} nombreDe={nombreDe} hoy={hoy} onAbrir={setTareaAbierta} />
              </section>

              {/* El equipo programa desde aquí igual que desde la ficha del
                  proyecto: mismo planificador por arrastre, misma regla (solo
                  gente del proyecto). El cliente no lo ve. */}
              {previsualizacion && (
                <PlanificadorArrastre proyecto={p} nombreCliente={d.nombreCliente || ''} tareas={d.tareas.filter((t) => String(t.proyecto_id) === String(p.id))} sesiones={d.sesiones}
                  onGuardado={() => setRecarga((n) => n + 1)} onAbrirTarea={(t) => t && setTareaAbierta(filas.find((f) => String(f.id) === String(t.id)) || null)} />
              )}

              <section className="card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-extrabold text-[#EAF4F7]">Tareas y responsables</h2>
                  <div className="flex gap-1 rounded-lg bg-[#0D3242] p-0.5 text-[11px] font-bold">
                    {[['todas', `Todas (${filas.length})`], ['en_curso', 'En curso'], ['programada', 'Programadas'], ['retrasada', 'Con retraso'], ['hecha', 'Hechas']].map(([k, etq]) => (
                      <button key={k} onClick={() => setFiltroEstado(k)} className={`rounded-md px-2 py-1 ${filtroEstado === k ? 'bg-brand-orange text-[#0B2A38]' : 'text-[#9FC0CB] hover:text-[#EAF4F7]'}`}>{etq}</button>
                    ))}
                  </div>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-[12.5px]">
                    <thead>
                      <tr className="text-left text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">
                        <th className="py-1.5 pr-2">Tarea</th><th className="py-1.5 pr-2">Proceso</th><th className="py-1.5 pr-2">Responsable</th>
                        <th className="py-1.5 pr-2">Fechas</th><th className="py-1.5 pr-2">Estado</th><th className="py-1.5 text-right">Avance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#153F52]">
                      {visibles.map((f) => {
                        const E = ESTADOS_TAREA[f.estado];
                        return (
                          <tr key={f.id} className="cursor-pointer hover:bg-white/[0.03]" onClick={() => setTareaAbierta(f)}>
                            <td className="py-2 pr-2">{f.codigo && <code className="block text-[10.5px] font-bold text-brand-verdeTexto">{f.codigo}</code>}<span className="block font-bold text-[#EAF4F7]">{f.subproceso && !f.titulo.toUpperCase().startsWith(f.subproceso) ? `${f.subproceso} · ` : ''}{f.titulo}</span></td>
                            <td className="py-2 pr-2 text-[#CFE3E9]">{f.proceso}<span className="block truncate text-[10.5px] text-[#7FA7B4]" title={f.procesoNombre}>{f.procesoNombre}</span></td>
                            <td className="py-2 pr-2 text-[#CFE3E9]">{nombreDe(f.responsableId) || <span className="text-[#7FA7B4]">por asignar</span>}</td>
                            <td className="py-2 pr-2 text-[#CFE3E9]">{f.inicio ? `${fmt(f.inicio)}${f.fin && f.fin !== f.inicio ? ` → ${fmt(f.fin)}` : ''}` : <span className="text-[#7FA7B4]">sin fecha</span>}</td>
                            <td className="py-2 pr-2"><span className="chip !px-2 !py-0.5 text-[10.5px] font-extrabold" style={{ background: `${E.color}33`, color: E.color }}>{E.etq}</span></td>
                            <td className="py-2 text-right">
                              <span className="text-[#EAF4F7]">{f.pct} %</span>
                              {f.horas > 0 && <span className="block text-[10px] text-[#7FA7B4]">{numeroES(f.horasHechas)} / {numeroES(f.horas)} h</span>}
                              {f.checklist.total > 0 && <span className="block text-[10px] text-[#7FA7B4]">{f.checklist.hechas}/{f.checklist.total} pasos</span>}
                            </td>
                          </tr>
                        );
                      })}
                      {!visibles.length && <tr><td colSpan={6} className="py-4 text-center text-[#7FA7B4]">Nada con ese filtro.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {/* 2 · Su empresa: datos, sedes, normas certificadas y documentos */}
          {seccionActiva === 'datos' && funciones.datos_cliente && (
            <div className="space-y-4">
              {rol === 'admin'
                ? <DatosEmpresaCliente cliente={d.cliente} proyectoId={p.id} email={user?.email} onGuardado={() => setRecarga((n) => n + 1)} />
                : <ResumenEmpresa cliente={d.cliente} rol={rol || 'usuario'} />}
              {d.cliente && <section className="card"><DocumentosCliente clienteId={d.cliente.id} titulo="Mis documentos" /></section>}
              <details className="card">
                <summary className="cursor-pointer text-sm font-extrabold text-[#EAF4F7]">Mis datos personales y contraseña</summary>
                <p className="mt-0.5 mb-3 text-[11.5px] text-[#7FA7B4]">Tu nombre, cargo y teléfonos como persona de contacto, y la contraseña de tu acceso.</p>
                <MisDatosCliente contacto={d.contacto} empresa={d.cliente} email={user?.email} onGuardado={() => setRecarga((n) => n + 1)} />
              </details>
            </div>
          )}

          {/* 3 · Mapa de procesos */}
          {seccionActiva === 'procesos' && procesosActivos.length > 0 && (
            <section className="card">
              <h2 className="text-sm font-extrabold text-[#EAF4F7]">Mapa de procesos</h2>
              <p className="mt-0.5 mb-3 text-[11.5px] text-[#7FA7B4]">Los procesos de tu sistema de gestión que ya están activos, con sus tareas y su avance. Iremos activando el resto.</p>
              <div className="grid gap-3 md:grid-cols-2">
                {procesosActivos.map((pr) => (
                  <div key={pr.codigo} className="rounded-xl border border-[#1E5468] bg-[#0D3242] p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-extrabold text-[#EAF4F7]">{pr.codigo} · {pr.nombre}</p>
                      <span className="text-[12px] font-bold text-brand-verdeTexto">{pr.pct} %</span>
                    </div>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-brand-verde" style={{ width: `${pr.pct}%` }} /></span>
                    <ul className="mt-2 space-y-1">
                      {pr.tareas.map((t) => { const E = ESTADOS_TAREA[t.estado]; return (
                        <li key={t.id}>
                          <button onClick={() => setTareaAbierta(t)} className="flex w-full items-center gap-2 text-left text-[12px] text-[#DFF1F5] hover:text-brand-orange">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: E.color }} />
                            <span className="min-w-0 flex-1 truncate">
                              {t.codigo && <code className="mr-1 text-[10.5px] font-bold text-brand-verdeTexto">{t.codigo}</code>}
                              {t.subproceso && <span className="mr-1 text-[10.5px] font-bold text-[#9FC0CB]">{t.subproceso}</span>}
                              {t.subprocesoNombre || t.titulo}
                            </span>
                            <span className="shrink-0 text-[10.5px] text-[#7FA7B4]">{t.horas ? `${numeroES(t.horas)} h · ` : ''}{t.checklist.total ? `${t.checklist.hechas}/${t.checklist.total}` : `${t.pct} %`}</span>
                          </button>
                        </li>
                      ); })}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Detalle de una tarea (solo lectura) */}
      {tareaAbierta && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-3 sm:items-center" onClick={() => setTareaAbierta(null)}>
          <div className="w-full max-w-xl rounded-2xl border border-[#1E5468] bg-[#0B2A38] p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{tareaAbierta.proceso} · {tareaAbierta.procesoNombre}</p>
                <h3 className="mt-0.5 text-[16px] font-extrabold text-[#EAF4F7]">{tareaAbierta.titulo}</h3>
              </div>
              <button onClick={() => setTareaAbierta(null)} className="text-[#9FC0CB] hover:text-[#EAF4F7]">✕</button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
              {[['Responsable', nombreDe(tareaAbierta.responsableId) || 'por asignar'], ['Fechas', tareaAbierta.inicio ? `${fmt(tareaAbierta.inicio)}${tareaAbierta.fin && tareaAbierta.fin !== tareaAbierta.inicio ? ` → ${fmt(tareaAbierta.fin)}` : ''}` : 'sin fecha'], ['Estado', ESTADOS_TAREA[tareaAbierta.estado].etq]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-[#0D3242] px-2.5 py-1.5"><p className="text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{k}</p><p className="mt-0.5 font-bold text-[#EAF4F7]">{v}</p></div>
              ))}
            </div>
            {tareaAbierta.definicion && <p className="mt-3 whitespace-pre-line text-[12.5px] leading-snug text-[#DFF1F5]">{tareaAbierta.definicion}</p>}
            {normalizarSubtareas(tareaAbierta.subtareas).length > 0 && (
              <ul className="mt-3 space-y-1">
                {normalizarSubtareas(tareaAbierta.subtareas).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px]">
                    <span className={`mt-0.5 inline-block h-4 w-4 shrink-0 rounded border text-center text-[10px] leading-4 ${s.hecha ? 'border-emerald-400 bg-emerald-500/30 text-emerald-200' : 'border-[#1E5468]'}`}>{s.hecha ? '✓' : ''}</span>
                    <span className={s.hecha ? 'text-[#7FA7B4] line-through' : 'text-[#EAF4F7]'}>{s.texto}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[10.5px] text-[#5E8494]">{numeroES(tareaAbierta.horas)} h previstas · {numeroES(tareaAbierta.horasHechas)} h hechas · {tareaAbierta.sesiones} sesión{tareaAbierta.sesiones === 1 ? '' : 'es'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
