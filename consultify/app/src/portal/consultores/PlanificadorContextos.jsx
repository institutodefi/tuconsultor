import { useCallback, useEffect, useMemo, useState } from 'react';
import { listTable, insertRow, updateRow, deleteRow } from '../../lib/data.js';
import { supabase, DEMO } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth.jsx';
import DialogoFicha from '../../components/DialogoFicha.jsx';

// ════════════════════════════════════════════════════════════════════════════
// PLANIFICADOR POR CONTEXTOS
//
// Las reglas que gobiernan esta pantalla, tal como se decidieron:
//
// · NO hay programación previa: la hace el consultor, tarea a tarea. Lo único
//   automático es la SIMULACIÓN, que propone un reparto y NO guarda nada
//   hasta que el consultor lo acepta.
//
// · NUNCA se integra. Cada norma es un contexto y sus tareas son suyas.
//   Tres sistemas = tres columnas de trabajo, aunque se despachen juntas.
//
// · El código es corto (9001-01) y la explicación larga vive en la
//   descripción, que se lee al pasar el cursor por encima.
//
// · Esta tabla ES la agenda: lo que se programa aquí sale allí y al revés,
//   porque son la misma fila. No hay dos verdades que sincronizar.
// ════════════════════════════════════════════════════════════════════════════

const NORMA_ETQ = { '9001': 'ISO 9001', '14001': 'ISO 14001', '27001': 'ISO 27001', '45001': 'ISO 45001' };
const fmt = (iso) => iso ? new Date(`${String(iso).slice(0,10)}T00:00:00`).toLocaleDateString('es-ES') : 'sin fecha';
const hoyISO = () => new Date().toISOString().slice(0, 10);

export default function PlanificadorContextos() {
  const { role } = useAuth();
  // La ayuda de cada tarea la editan consultores y administración; las
  // empresas la LEEN como guía. El icono es el mismo: cambia lo que abre.
  const puedeEditarAyuda = ['superadmin', 'admin', 'director', 'consultor'].includes(role);
  const [proyectos, setProyectos] = useState([]);
  const [contextos, setContextos] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pid, setPid] = useState('');
  const [msg, setMsg] = useState(null);
  const [nuevas, setNuevas] = useState({});          // texto de alta por contexto
  const [subprocesos, setSubprocesos] = useState({}); // subproceso de alta por contexto
  const [ayudaDe, setAyudaDe] = useState(null);       // tarea con la ficha de ayuda abierta
  const [ayudaTxt, setAyudaTxt] = useState('');
  const [simulacion, setSimulacion] = useState(null); // propuesta SIN guardar

  const [sinOferta, setSinOferta] = useState([]);

  const cargar = useCallback(() => Promise.all([
    listTable('proyectos_cliente').catch(() => []),
    listTable('proyecto_contextos').catch(() => []),
    listTable('tareas_programadas').catch(() => []),
    // Para saber qué proyectos tienen detrás una oferta aceptada.
    listTable('presupuestos').catch(() => []),
    listTable('contratos').catch(() => []),
  ]).then(([p, c, t, pres, ctr]) => {
    const base = (p || []).filter((x) => x.fecha_limite || c?.some((k) => String(k.proyecto_id) === String(x.id)));

    // ── Solo se planifica lo que tiene oferta aceptada detrás ──
    // Planificar es repartir horas y comprometer al equipo. Hacerlo sobre un
    // proyecto sin oferta aceptada es trabajar sin alcance ni precio pactados:
    // si el cliente discute qué se había contratado, no hay nada que enseñar.
    const conOferta = (x) => {
      const of = (pres || []).find((o) => String(o.id) === String(x.oferta_id));
      if (of) return of.estado === 'aceptada'
        || (ctr || []).some((k) => String(k.presupuesto_id) === String(of.id) && k.estado === 'firmado');
      // Puede venir por contrato en vez de por oferta: también vale.
      return !!x.contrato_id && (ctr || []).some((k) => String(k.id) === String(x.contrato_id) && k.estado === 'firmado');
    };

    const listos = base.filter(conOferta);
    // Los que quedan fuera NO se ocultan sin más: se dicen, con su motivo.
    // Un proyecto que desaparece del desplegable sin explicación se interpreta
    // como un fallo del sistema, y alguien acaba creándolo otra vez.
    setSinOferta(base.filter((x) => !conOferta(x)));
    setProyectos(listos);
    setContextos(c || []); setTareas(t || []);
  }).finally(() => setCargando(false)), []);

  useEffect(() => { cargar(); }, [cargar]);

  const proyecto = proyectos.find((p) => String(p.id) === String(pid)) || null;
  const misContextos = contextos.filter((c) => String(c.proyecto_id) === String(pid));
  const tareasDe = (cid) => tareas
    .filter((t) => String(t.contexto_id) === String(cid) && t.estado !== 'anulada')
    .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo)));

  /** El código sale de la base para no pisarse entre dos consultores a la vez. */
  async function anadir(ctx) {
    const titulo = (nuevas[ctx.id] || '').trim();
    if (titulo.length < 3) { setMsg({ err: true, t: 'La tarea tiene que decir algo.' }); return; }
    try {
      const sub = (subprocesos[ctx.id] || '').trim() || null;
      let codigo = `${ctx.norma}-01`;
      if (!DEMO) {
        const { data } = await supabase.rpc('codigo_tarea', { p_contexto: ctx.id, p_subproceso: sub });
        if (data) codigo = data;
      }
      await insertRow('tareas_programadas', {
        contexto_id: ctx.id, codigo, titulo, subproceso: sub,
        estado: 'pendiente',
      });
      setNuevas((n) => ({ ...n, [ctx.id]: '' }));
      setMsg(null); await cargar();
    } catch (e) { setMsg({ err: true, t: `${e?.message || e}` }); }
  }

  async function programar(t, fecha) {
    try {
      await updateRow('tareas_programadas', t.id, {
        fecha: fecha || null,
        estado: fecha ? 'programada' : 'pendiente',
      });
      await cargar();
    } catch (e) { setMsg({ err: true, t: `${e?.message || e}` }); }
  }

  async function hecha(t) {
    const horas = t.estado === 'hecha' ? null
      : Number(prompt('Horas reales dedicadas (ej. 2.5):', t.duracion_min ? String(t.duracion_min / 60) : '2') || 0) || null;
    try {
      await updateRow('tareas_programadas', t.id, t.estado === 'hecha'
        ? { estado: t.fecha ? 'programada' : 'pendiente', hecha_en: null, horas_reales: null }
        : { estado: 'hecha', hecha_en: new Date().toISOString(), horas_reales: horas });
      await cargar();
    } catch (e) { setMsg({ err: true, t: `${e?.message || e}` }); }
  }

  const quitar = async (t) => { try { await deleteRow('tareas_programadas', t.id); await cargar(); } catch (e) { setMsg({ err: true, t: `${e?.message || e}` }); } };

  /** SIMULACIÓN: reparte las tareas sin fecha entre hoy y la fecha límite,
   *  a razón de una por semana laborable por contexto. NO guarda: enseña la
   *  propuesta y espera. La programación es del consultor, no del sistema. */
  function simular() {
    if (!proyecto?.fecha_limite) { setMsg({ err: true, t: 'El proyecto no tiene fecha límite.' }); return; }
    const fin = new Date(`${proyecto.fecha_limite}T00:00:00`);
    const hoy = new Date(new Date().toDateString());
    if (fin <= hoy) { setMsg({ err: true, t: 'La fecha límite ya pasó: simular no tiene sentido.' }); return; }
    const propuesta = [];
    for (const ctx of misContextos) {
      const sinFecha = tareasDe(ctx.id).filter((t) => !t.fecha && t.estado !== 'hecha');
      if (!sinFecha.length) continue;
      const paso = Math.max(1, Math.floor((fin - hoy) / 864e5 / (sinFecha.length + 1)));
      sinFecha.forEach((t, i) => {
        const d = new Date(hoy.getTime() + paso * (i + 1) * 864e5);
        // A día laborable: sábado → viernes, domingo → lunes
        if (d.getDay() === 6) d.setDate(d.getDate() - 1);
        if (d.getDay() === 0) d.setDate(d.getDate() + 1);
        propuesta.push({ tarea: t, fecha: d.toISOString().slice(0, 10), norma: ctx.norma });
      });
    }
    if (!propuesta.length) { setMsg({ err: false, t: 'No hay tareas sin programar.' }); return; }
    setSimulacion(propuesta);
  }

  async function aplicarSimulacion() {
    try {
      for (const p of simulacion) {
        await updateRow('tareas_programadas', p.tarea.id, { fecha: p.fecha, estado: 'programada' });
      }
      setSimulacion(null);
      setMsg({ err: false, t: `${simulacion.length} tarea(s) programadas.` });
      await cargar();
    } catch (e) { setMsg({ err: true, t: `${e?.message || e}` }); }
  }

  async function recodificar() {
    if (DEMO) { setMsg({ err: false, t: 'En demostración no se recodifica.' }); return; }
    try {
      const { data, error } = await supabase.rpc('recodificar_tareas', { p_proyecto: pid });
      if (error) throw error;
      setMsg({ err: false, t: `${data} tarea(s) recodificadas por orden de fecha.` });
      await cargar();
    } catch (e) { setMsg({ err: true, t: `${e?.message || e}` }); }
  }

  const dias = proyecto?.fecha_limite
    ? Math.round((new Date(`${proyecto.fecha_limite}T00:00:00`) - new Date(new Date().toDateString())) / 864e5)
    : null;

  if (cargando) return <p className="font-semibold text-[#9FC0CB]">Cargando planificador…</p>;

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Proyectos</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#EAF4F7]">Planificador</h1>
        <p className="mt-1 text-sm text-[#9FC0CB]">
          Cada norma es un contexto y sus tareas se programan por separado. La programación es tuya:
          la simulación propone, tú decides.
        </p>
      </div>

      <select className="input !py-2 !text-[13px] max-w-xl" value={pid} onChange={(e) => { setPid(e.target.value); setSimulacion(null); }}>
        <option value="">— Elige un proyecto —</option>
        {proyectos.map((p) => (
          <option key={p.id} value={p.id}>{p.codigo || p.nombre || p.id.slice(0, 8)} · límite {fmt(p.fecha_limite)}</option>
        ))}
      </select>

      {/* Los excluidos, dichos con su motivo. Ocultarlos sin más se interpreta
          como un fallo y alguien acaba creando el proyecto otra vez. */}
      {sinOferta.length > 0 && (
        <details className="rounded-xl border border-amber-300/40 bg-amber-400/[0.07] px-3 py-2">
          <summary className="cursor-pointer text-[12.5px] font-bold text-amber-200">
            {sinOferta.length} proyecto{sinOferta.length === 1 ? '' : 's'} sin oferta aceptada · no se puede{sinOferta.length === 1 ? '' : 'n'} planificar
          </summary>
          <p className="mt-1.5 text-[11.5px] leading-snug text-[#DFF1F5]">
            Planificar reparte horas y compromete al equipo. Sin una oferta aceptada detrás no hay alcance
            ni precio pactados, así que estos proyectos quedan fuera hasta que su oferta se acepte
            en el histórico.
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {sinOferta.map((x) => (
              <li key={x.id} className="text-[11.5px] text-[#9FC0CB]">
                · {x.codigo || x.nombre || String(x.id).slice(0, 8)}
                {!x.oferta_id && !x.contrato_id ? ' — creado sin oferta' : ' — su oferta aún no está aceptada'}
              </li>
            ))}
          </ul>
        </details>
      )}

      {msg && <p className={`rounded-lg px-3 py-2 text-[12.5px] font-bold ${msg.err ? 'bg-red-500/12 text-red-200' : 'bg-emerald-500/12 text-emerald-200'}`}>{msg.t}</p>}

      {proyecto && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {dias != null && (
              <span className={`chip !px-2.5 !py-1 text-[11.5px] font-extrabold ${
                dias < 30 ? 'bg-red-500/15 text-red-300' : dias < 60 ? 'bg-brand-orange/15 text-brand-orange' : 'bg-white/8 text-[#9FC0CB]'}`}>
                {dias < 0 ? `Vencido hace ${-dias} días` : `${dias} días hasta la fecha límite`}
              </span>
            )}
            <button onClick={simular} className="btn-ghost !px-3 !py-1.5 text-xs">▶ Simular reparto</button>
            <button onClick={recodificar} className="btn-ghost !px-3 !py-1.5 text-xs" title="Renumera 9001-01, 9001-02… por orden de fecha">↻ Recodificar</button>
          </div>

          {/* La propuesta de la simulación: se mira y se decide */}
          {simulacion && (
            <div className="rounded-xl border border-brand-orange/40 bg-brand-orange/8 p-3">
              <p className="text-[12.5px] font-extrabold text-brand-orange">
                Propuesta: {simulacion.length} tarea(s) repartidas hasta el {fmt(proyecto.fecha_limite)}
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {simulacion.map((p) => (
                  <li key={p.tarea.id} className="text-[12px] text-[#EAF4F7]">
                    <code className="text-[#9FC0CB]">{p.tarea.codigo}</code> {p.tarea.titulo}
                    <b className="ml-2 text-brand-orange">→ {fmt(p.fecha)}</b>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2">
                <button onClick={aplicarSimulacion} className="btn-orange !px-3 !py-1.5 text-xs">Aplicar</button>
                <button onClick={() => setSimulacion(null)} className="btn-ghost !px-3 !py-1.5 text-xs">Descartar</button>
              </div>
            </div>
          )}

          {/* Un bloque por contexto: NUNCA se mezclan */}
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {misContextos.map((ctx) => {
              const ts = tareasDe(ctx.id);
              const hechas = ts.filter((t) => t.estado === 'hecha').length;
              return (
                <section key={ctx.id} className="rounded-xl border border-[#1E5468] bg-[#0D3242] p-3">
                  <header className="mb-2 flex items-center gap-2">
                    <h2 className="text-[14px] font-extrabold text-[#EAF4F7]">{NORMA_ETQ[ctx.norma] || ctx.norma}</h2>
                    <span className="ml-auto text-[11px] text-[#7FA7B4]">{hechas}/{ts.length} hechas</span>
                  </header>

                  <ul className="space-y-1.5">
                    {ts.map((t) => (
                      <li key={t.id} title={`${t.titulo}${t.descripcion ? ' — ' + t.descripcion : ''}`}
                        className="flex flex-wrap items-center gap-2 rounded-lg bg-[#10394A] px-2 py-1.5">
                        <button onClick={() => hecha(t)}
                          className={`grid h-4 w-4 shrink-0 place-items-center rounded border-[1.5px] text-[10px] font-bold ${
                            t.estado === 'hecha' ? 'border-brand-verde bg-brand-verde text-[#061F2B]' : 'border-[#3F7D93]'}`}
                          aria-label={t.estado === 'hecha' ? 'Hecha' : 'Marcar hecha'}>
                          {t.estado === 'hecha' ? '✓' : ''}
                        </button>
                        {/* El código es lo que se ve: corto, máx. 10 caracteres.
                            El título completo, al pasar el cursor por la fila. */}
                        <code className="text-[11.5px] font-extrabold tracking-wide text-brand-orange">{t.codigo}</code>
                        <span className={`min-w-0 flex-1 truncate text-[11.5px] ${t.estado === 'hecha' ? 'text-[#7FA7B4]' : 'text-[#B9D2DA]'}`}>
                          {t.titulo}
                        </span>
                        <button onClick={() => { setAyudaDe(t); setAyudaTxt(t.ayuda || ''); }}
                          title={puedeEditarAyuda ? 'Editar la ayuda de esta tarea' : 'Ver la ayuda de esta tarea'}
                          aria-label="Ayuda de la tarea"
                          className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#3F7D93] text-[10px] font-bold text-[#9FC0CB] hover:border-brand-orange hover:text-brand-orange">
                          i
                        </button>
                        <input type="date" value={t.fecha || ''} disabled={t.estado === 'hecha'}
                          onChange={(e) => programar(t, e.target.value)}
                          className="input !w-[130px] !px-1.5 !py-0.5 !text-[11px]" />
                        <button onClick={() => quitar(t)} className="text-[11px] font-bold text-red-300/70 hover:text-red-300">×</button>
                      </li>
                    ))}
                    {!ts.length && <li className="py-2 text-center text-[11.5px] text-[#7FA7B4]">Sin tareas. Añade la primera.</li>}
                  </ul>

                  <div className="mt-2 flex gap-1.5">
                    <input className="input !w-[110px] !py-1.5 !text-[11px]" placeholder="Subproceso"
                      title="Base del código: DOCUMEN-01, AUDITOR-02… Máximo 7 letras; sin él se usa la norma."
                      value={subprocesos[ctx.id] || ''} maxLength={24}
                      onChange={(e) => setSubprocesos((n) => ({ ...n, [ctx.id]: e.target.value }))} />
                    <input className="input !py-1.5 !text-[12.5px] flex-1" placeholder={`Nueva tarea de ${NORMA_ETQ[ctx.norma] || ctx.norma}…`}
                      value={nuevas[ctx.id] || ''}
                      onChange={(e) => setNuevas((n) => ({ ...n, [ctx.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && anadir(ctx)} />
                    <button onClick={() => anadir(ctx)} className="btn-ghost !px-2.5 !py-1 text-xs">+</button>
                  </div>
                </section>
              );
            })}
            {!misContextos.length && (
              <p className="card py-6 text-center text-[12.5px] text-[#7FA7B4] lg:col-span-2 xl:col-span-3">
                Este proyecto no tiene contextos: dale normas al darlo de alta.
              </p>
            )}
          </div>
        </>
      )}
      {ayudaDe && (
        <DialogoFicha
          titulo={ayudaDe.titulo}
          subtitulo={ayudaDe.codigo}
          onCerrar={() => setAyudaDe(null)}
          ancho="640px"
        >
          <div>

            {puedeEditarAyuda ? (
              <>
                <p className="mb-1.5 text-[11px] text-[#7FA7B4]">
                  Esta ayuda la ven las empresas como guía de la tarea. Escríbela para ellas.
                </p>
                <textarea rows={7} className="input w-full !text-[13px]" value={ayudaTxt}
                  onChange={(e) => setAyudaTxt(e.target.value)}
                  placeholder="Qué hay que hacer, qué evidencias se esperan, dónde está la plantilla…" />
                <div className="mt-2.5 flex justify-end gap-2">
                  <button onClick={() => setAyudaDe(null)} className="btn-ghost !px-3 !py-1.5 text-xs">Cancelar</button>
                  <button className="btn-orange !px-3 !py-1.5 text-xs"
                    onClick={async () => {
                      try {
                        await updateRow('tareas_programadas', ayudaDe.id, { ayuda: ayudaTxt.trim() || null });
                        setAyudaDe(null); await cargar();
                      } catch (e) { setMsg({ err: true, t: `${e?.message || e}` }); }
                    }}>
                    Guardar ayuda
                  </button>
                </div>
              </>
            ) : (
              <div className="whitespace-pre-wrap rounded-xl bg-[#10394A] p-3.5 text-[13px] leading-relaxed text-[#DFF1F5]">
                {ayudaDe.ayuda || 'Esta tarea todavía no tiene ayuda escrita.'}
              </div>
            )}
          </div>
        </DialogoFicha>
      )}
    </div>
  );
}
