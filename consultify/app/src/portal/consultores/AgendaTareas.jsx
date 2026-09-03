import { useCallback, useEffect, useMemo, useState } from 'react';
import { listTable, updateRow } from '../../lib/data.js';
import { supabase, DEMO } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth.jsx';
import { can } from '../../lib/permisos.js';
import SesionesTarea from './SesionesTarea.jsx';

// ════════════════════════════════════════════════════════════════════════════
// AGENDA · la otra cara del planificador
//
// Lee y escribe LA MISMA tabla que el planificador: tareas_programadas.
// Cambiar aquí una fecha es cambiarla allí, porque es la misma fila. No hay
// sincronización que pueda fallar: hay una sola verdad.
//
// Arriba, lo pendiente a 30/60/90 días de cada fecha límite: es lo primero
// que un consultor necesita ver al abrir el día.
// ════════════════════════════════════════════════════════════════════════════

const NORMA_ETQ = { '9001': '9001', '14001': '14001', '27001': '27001', '45001': '45001' };
const fmtDia = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const hoyISO = () => new Date().toISOString().slice(0, 10);

export default function AgendaTareas() {
  const [tareas, setTareas] = useState([]);
  const [contextos, setContextos] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [horizonte, setHorizonte] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState(null);

  const { user, role } = useAuth();
  const [verTodoElEquipo, setVerTodoElEquipo] = useState(true);
  const [sesiones, setSesiones] = useState([]);
  const [perfiles, setPerfiles] = useState([]);
  // Tarea abierta desde la agenda. Se ve una sesión y se quiere cambiar algo:
  // tener que ir a Proyectos, buscar el proyecto y luego la tarea es un viaje
  // que nadie hace, así que el dato se queda sin corregir.
  const [tareaAbierta, setTareaAbierta] = useState(null);
  // Dos formas de mirar lo mismo. Por tarea sirve para «qué hay que hacer»; en
  // calendario, para «cómo está la semana». Una sola vista obliga a llevar la
  // otra en la cabeza.
  const [vista, setVista] = useState('lista');
  // Periodo del calendario y cuántos periodos me he movido desde hoy.
  const [periodo, setPeriodo] = useState('semana');
  const [desplaz, setDesplaz] = useState(0);

  const cargar = useCallback(async () => {
    const [t, c, p, eq, ses, ct, pf] = await Promise.all([
      listTable('tareas_programadas').catch(() => []),
      listTable('proyecto_contextos').catch(() => []),
      listTable('proyectos_cliente').catch(() => []),
      listTable('proyecto_equipo').catch(() => []),
      // Las sesiones: es donde están las horas. Sin esto la agenda enseñaba
      // tareas con fecha pero sin franja horaria, así que no se veía cuánto
      // ocupa cada cosa ni si un día está lleno.
      listTable('tarea_sesiones').catch(() => []),
      listTable('cliente_tareas').catch(() => []),
      listTable('perfiles').catch(() => []),
    ]);

    // ── La agenda del equipo, acotada a lo propio ──
    // Un consultor ve los proyectos EN LOS QUE ESTÁ, no todos. La agenda
    // completa de la casa no le sirve para nada y le enseña la carga de
    // trabajo de clientes que no lleva.
    //
    // Administración y dirección sí la ven entera: repartir trabajo exige ver
    // dónde está el que ya hay.
    const verTodo = ['superadmin', 'admin', 'director'].includes(role);
    const mios = new Set((eq || [])
      .filter((x) => String(x.perfil_id) === String(user?.id))
      .map((x) => String(x.proyecto_id)));

    const proyectosVisibles = verTodo ? (p || []) : (p || []).filter((x) => mios.has(String(x.id)));
    const idsVisibles = new Set(proyectosVisibles.map((x) => String(x.id)));
    const ctxVisibles = (c || []).filter((k) => idsVisibles.has(String(k.proyecto_id)));
    const idsCtx = new Set(ctxVisibles.map((k) => String(k.id)));

    setTareas((t || []).filter((k) => !k.contexto_id || idsCtx.has(String(k.contexto_id))));
    setContextos(ctxVisibles);
    setProyectos(proyectosVisibles);
    setVerTodoElEquipo(verTodo);
    setPerfiles(pf || []);

    // Sesiones de los proyectos visibles, con el título de su tarea.
    const idsCT = new Set((ct || [])
      .filter((x) => idsVisibles.has(String(x.proyecto_id)))
      .map((x) => String(x.id)));
    const porTarea = Object.fromEntries((ct || []).map((x) => [String(x.id), x]));
    setSesiones((ses || [])
      .filter((s) => s.estado !== 'anulada' && idsCT.has(String(s.cliente_tarea_id)))
      .map((s) => ({ ...s, tarea: porTarea[String(s.cliente_tarea_id)] || null })));
    // Reasignados a las variables que usa el resto de la función.
    const c2 = ctxVisibles, p2 = proyectosVisibles;
    // Los pendientes por horizonte: de la función de la base; si no llega
    // (demo), se calculan aquí con lo cargado. El dato es el mismo.
    let h = null;
    if (!DEMO) {
      const { data } = await supabase.rpc('pendiente_por_horizonte').then((r) => r, () => ({ data: null }));
      h = data;
    }
    if (!h) {
      const hoy = new Date(new Date().toDateString());
      h = p2.filter((x) => x.fecha_limite).map((x) => {
        const dias = Math.round((new Date(`${x.fecha_limite}T00:00:00`) - hoy) / 864e5);
        const cts = c2.filter((k) => String(k.proyecto_id) === String(x.id)).map((k) => String(k.id));
        const pend = (t || []).filter((k) => cts.includes(String(k.contexto_id)) && ['pendiente', 'programada'].includes(k.estado)).length;
        return dias <= 90 && pend ? { proyecto_id: x.id, codigo_proyecto: x.codigo, fecha_limite: x.fecha_limite,
          horizonte: dias <= 30 ? 30 : dias <= 60 ? 60 : 90, pendientes: pend } : null;
      }).filter(Boolean);
    }
    setHorizonte(h || []);
    setCargando(false);
  }, [user?.id, role]);
  useEffect(() => { cargar(); }, [cargar]);

  const ctxDe = (id) => contextos.find((c) => String(c.id) === String(id));
  const proyDe = (t) => { const c = ctxDe(t.contexto_id); return c ? proyectos.find((p) => String(p.id) === String(c.proyecto_id)) : null; };

  async function mover(t, fecha) {
    try {
      await updateRow('tareas_programadas', t.id, { fecha: fecha || null, estado: fecha ? 'programada' : 'pendiente' });
      await cargar();   // el planificador verá el cambio: misma tabla
    } catch (e) { setMsg({ err: true, t: `${e?.message || e}` }); }
  }
  async function hecha(t) {
    const horas = t.estado === 'hecha' ? null
      : Number(prompt('Horas reales dedicadas:', '2') || 0) || null;
    try {
      await updateRow('tareas_programadas', t.id, t.estado === 'hecha'
        ? { estado: t.fecha ? 'programada' : 'pendiente', hecha_en: null, horas_reales: null }
        : { estado: 'hecha', hecha_en: new Date().toISOString(), horas_reales: horas });
      await cargar();
    } catch (e) { setMsg({ err: true, t: `${e?.message || e}` }); }
  }

  // Los `useMemo` van ANTES del return de «Cargando»: React exige que se
  // ejecuten siempre los mismos hooks en el mismo orden. Colocados después,
  // en el primer render no corrían y en el segundo sí, y eso lanza el error
  // #310 —«se han renderizado más hooks que en el render anterior»— que tumba
  // la pantalla entera.

  // ── Vista de calendario ──
  //
  // Cuatro periodos, porque son cuatro preguntas distintas:
  //
  //   día      ¿cómo está hoy? Franjas horarias, una columna por persona.
  //   semana   ¿cómo va la semana? Es la vista de trabajo habitual.
  //   mes      ¿dónde se acumula la carga? Rejilla de días con las horas.
  //   año      ¿cómo se reparte el año? Doce meses con su total.
  //
  // A más rango, menos detalle: en un año no caben las franjas horarias, y
  // meterlas convertiría la pantalla en ruido.

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  /** El rango visible según el periodo y el desplazamiento. */
  const rango = useMemo(() => {
    // `base` y no `base`: hay otra `base` en el componente y tener dos con el
    // mismo nombre obliga a mirar el ámbito para saber cuál se está usando.
    const base = new Date(); base.setHours(0, 0, 0, 0);

    if (periodo === 'dia') {
      const d = new Date(base); d.setDate(d.getDate() + desplaz);
      return { dias: [iso(d)], etiqueta: d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) };
    }

    if (periodo === 'semana') {
      const l = new Date(base);
      l.setDate(l.getDate() - ((l.getDay() + 6) % 7) + desplaz * 7);   // lunes
      const dias = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(l); d.setDate(l.getDate() + i); return iso(d);
      });
      const f = new Date(`${dias[6]}T12:00:00`);
      return {
        dias,
        etiqueta: `${l.getDate()} ${l.toLocaleDateString('es-ES', { month: 'short' })} – ${f.getDate()} ${f.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`,
      };
    }

    if (periodo === 'mes') {
      const m = new Date(base.getFullYear(), base.getMonth() + desplaz, 1);
      const ultimo = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      return {
        dias: Array.from({ length: ultimo }, (_, i) => iso(new Date(m.getFullYear(), m.getMonth(), i + 1))),
        etiqueta: m.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        // Hueco inicial para que el día 1 caiga en su columna de la semana.
        offset: (new Date(m.getFullYear(), m.getMonth(), 1).getDay() + 6) % 7,
      };
    }

    // Año: se trabaja por meses, no por días.
    const y = base.getFullYear() + desplaz;
    return {
      meses: Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`),
      etiqueta: String(y),
      dias: [],
    };
  }, [periodo, desplaz]);

  /** Horas de un consultor en un día. */
  const sesionesDe = (consultorId, dia) => sesiones.filter((s) =>
    String(s.consultor_id || 'sin') === String(consultorId)
    && String(s.fecha).slice(0, 10) === dia);

  const horasEn = (lista) => Math.round(lista.reduce((a, s) => a + (Number(s.horas) || 0), 0) * 10) / 10;

  /** Quién aparece: solo los que tienen algo en el rango. */
  const consultoresRango = useMemo(() => {
    const enRango = (s) => {
      const f = String(s.fecha).slice(0, 10);
      return periodo === 'anio' ? f.startsWith(rango.etiqueta) : rango.dias.includes(f);
    };
    return [...new Set(sesiones.filter(enRango).map((s) => String(s.consultor_id || 'sin')))];
  }, [sesiones, rango, periodo]);

  /** Sesiones de un consultor en un mes «AAAA-MM». */
  const sesionesDelMes = (consultorId, mes) => sesiones.filter((s) =>
    String(s.consultor_id || 'sin') === String(consultorId)
    && String(s.fecha).slice(0, 7) === mes);

  /** Color de una celda según lo cargada que esté. */
  const tonoCarga = (hs, tope) => {
    if (!hs) return '';
    const p = hs / tope;
    return p >= 1 ? 'bg-red-400/25' : p >= 0.75 ? 'bg-amber-300/20' : 'bg-brand-orange/15';
  };

  // ── Datos de la vista por tarea ──
  // Quedaron fuera al reescribir el calendario; se restauran aquí, antes de
  // los componentes que los usan.
  const nombreDe = (id) => {
    const p = perfiles.find((x) => String(x.id) === String(id));
    return p ? `${p.nombre || ''} ${p.apellidos || ''}`.trim() || p.email : 'sin asignar';
  };

  const hoy = new Date(new Date().toDateString()).toISOString().slice(0, 10);

  // Tareas con fecha (sin sesión), separadas entre vencidas y por venir.
  const proximas = tareas.filter((t) => t.fecha && String(t.fecha).slice(0, 10) >= hoy && t.estado !== 'hecha');
  const atrasadas = tareas.filter((t) => t.fecha && String(t.fecha).slice(0, 10) < hoy && t.estado !== 'hecha');
  // Tareas sin fecha: existen pero no están en ningún calendario.
  const sinFecha = tareas.filter((t) => !t.fecha && t.estado !== 'hecha');

  const porDia = proximas.reduce((m, t) => {
    const d = String(t.fecha).slice(0, 10);
    (m[d] = m[d] || []).push(t); return m;
  }, {});

  // Sesiones agrupadas por día, con su total.
  const sesionesPorDia = sesiones.reduce((m, s) => {
    const d = String(s.fecha).slice(0, 10);
    (m[d] = m[d] || []).push(s); return m;
  }, {});
  for (const d of Object.keys(sesionesPorDia)) {
    sesionesPorDia[d].sort((a, b) => String(a.hora_inicio).localeCompare(String(b.hora_inicio)));
  }
  const horasDelDia = (d) => horasEn(sesionesPorDia[d] || []);

  /** Una sesión con su franja: la hora es el dato que faltaba. */
  const FilaSesion = ({ s }) => (
    <li className={`flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-1.5 ${
      s.estado === 'hecha' ? 'bg-emerald-500/[0.08]' : 'bg-[#0D3242]'}`}>
      <span className="whitespace-nowrap text-[11.5px] font-extrabold text-brand-orange">
        {String(s.hora_inicio).slice(0, 5)}–{String(s.hora_fin).slice(0, 5)}
      </span>
      <span className="whitespace-nowrap text-[10.5px] font-bold text-[#7FA7B4]">{s.horas} h</span>
      {s.tarea?.codigo && (
        <code className="text-[11px] font-extrabold tracking-wide text-brand-verdeTexto">{s.tarea.codigo}</code>
      )}
      <button onClick={() => s.tarea && setTareaAbierta(s.tarea)}
        disabled={!s.tarea}
        className="min-w-0 flex-1 truncate text-left text-[12px] text-[#DFF1F5] hover:text-brand-orange hover:underline disabled:hover:text-[#DFF1F5] disabled:hover:no-underline"
        title="Abrir la tarea: código, nombre y sesiones">
        {s.tarea?.titulo || 'Tarea'}
      </button>
      {s.tarea?.norma_id && <span className="chip !px-1.5 !py-0 text-[9.5px]">{s.tarea.norma_id}</span>}
      <span className="truncate text-[10.5px] text-[#7FA7B4]">{nombreDe(s.consultor_id)}</span>
      {s.estado === 'hecha' && <span className="text-[10.5px] font-bold text-emerald-300">hecha</span>}
    </li>
  );

  const Fila = ({ t }) => {
    const p = proyDe(t); const c = ctxDe(t.contexto_id);
    return (
      <li title={`${t.titulo}${t.ayuda ? ' — ' + t.ayuda : ''}`}
        className="flex flex-wrap items-center gap-2 rounded-lg bg-[#0D3242] px-2.5 py-1.5">
        <button onClick={() => hecha(t)} aria-label="Marcar hecha"
          className="grid h-4 w-4 shrink-0 place-items-center rounded border-[1.5px] border-[#3F7D93] text-[10px]" />
        <code className="text-[11.5px] font-extrabold tracking-wide text-brand-orange">{t.codigo}</code>
        <span className="min-w-0 flex-1 truncate text-[12px] text-[#DFF1F5]">{t.titulo}</span>
        {c && <span className="chip !px-1.5 !py-0 text-[9.5px]">{NORMA_ETQ[c.norma] || c.norma}</span>}
        {p && <span className="truncate text-[10.5px] font-bold text-[#7FA7B4]" title={p.nombre || ''}>{p.codigo || ''}</span>}
        <input type="date" value={t.fecha || ''} onChange={(e) => mover(t, e.target.value)}
          className="input !w-[128px] !px-1.5 !py-0.5 !text-[11px]" />
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">Operación</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#EAF4F7]">Agenda</h1>
        <p className="mt-1 text-sm text-[#9FC0CB]">
          La misma tabla que el planificador: mover una tarea aquí la mueve allí, porque es la misma fila.
        </p>
      </div>

      {msg && <p className={`rounded-lg px-3 py-2 text-[12.5px] font-bold ${msg.err ? 'bg-red-500/12 text-red-200' : 'bg-emerald-500/12 text-emerald-200'}`}>{msg.t}</p>}

      {/* Pendiente a 30 / 60 / 90 días de la fecha límite */}
      {horizonte.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-3">
          {[30, 60, 90].map((h) => {
            const de = horizonte.filter((x) => x.horizonte === h);
            const total = de.reduce((s, x) => s + Number(x.pendientes || 0), 0);
            return (
              <div key={h} className={`rounded-xl border p-3 ${
                h === 30 ? 'border-red-400/40 bg-red-500/8' : h === 60 ? 'border-brand-orange/40 bg-brand-orange/8' : 'border-[#1E5468] bg-[#0D3242]'}`}>
                <p className={`text-[11px] font-extrabold uppercase tracking-wide ${
                  h === 30 ? 'text-red-300' : h === 60 ? 'text-brand-orange' : 'text-[#9FC0CB]'}`}>
                  A menos de {h} días
                </p>
                <p className="mt-0.5 text-xl font-extrabold text-[#EAF4F7]">{total} <span className="text-[12px] font-bold text-[#7FA7B4]">pendientes</span></p>
                {de.slice(0, 3).map((x) => (
                  <p key={x.proyecto_id} className="truncate text-[11px] text-[#9FC0CB]">
                    {x.codigo_proyecto || x.proyecto_id.slice(0, 8)} · límite {new Date(`${x.fecha_limite}T00:00:00`).toLocaleDateString('es-ES')}
                  </p>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {atrasadas.length > 0 && (
        <section>
          <h2 className="mb-1.5 text-[12px] font-extrabold uppercase tracking-wide text-red-300">Atrasadas · {atrasadas.length}</h2>
          <ul className="space-y-1">{atrasadas.map((t) => <Fila key={t.id} t={t} />)}</ul>
        </section>
      )}

      {/* ── Las dos vistas ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-xl border border-[#1E5468] p-0.5">
          {[['lista', 'Por tarea'], ['calendario', 'Calendario']].map(([k, etq]) => (
            <button key={k} onClick={() => setVista(k)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                vista === k ? 'bg-navy-800 text-white' : 'text-[#9FC0CB] hover:text-[#CFE3E9]'}`}>
              {etq}
            </button>
          ))}
        </div>
        {vista === 'calendario' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-[#1E5468] p-0.5">
              {[['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes'], ['anio', 'Año']].map(([k, etq]) => (
                <button key={k} onClick={() => { setPeriodo(k); setDesplaz(0); }}
                  className={`rounded-lg px-2.5 py-1 text-[13px] font-bold transition ${
                    periodo === k ? 'bg-navy-800 text-white' : 'text-[#9FC0CB] hover:text-[#CFE3E9]'}`}>
                  {etq}
                </button>
              ))}
            </div>
            <button onClick={() => setDesplaz(desplaz - 1)} className="btn-ghost !px-2.5 !py-1 text-sm">←</button>
            <span className="min-w-[180px] text-center text-[12.5px] font-bold text-[#EAF4F7]">
              {rango.etiqueta}
            </span>
            <button onClick={() => setDesplaz(desplaz + 1)} className="btn-ghost !px-2.5 !py-1 text-sm">→</button>
            {desplaz !== 0 && (
              <button onClick={() => setDesplaz(0)} className="text-[12px] font-bold text-brand-orange hover:underline">
                hoy
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Calendario ── */}
      {vista === 'calendario' && (
        consultoresRango.length === 0 ? (
          <p className="card py-6 text-center text-[12.5px] text-[#7FA7B4]">
            Nada programado en este {periodo === 'dia' ? 'día' : periodo === 'semana' ? 'periodo' : periodo === 'mes' ? 'mes' : 'año'}.
          </p>
        ) : (
          <div className="card !p-3 overflow-x-auto">

            {/* ── DÍA · franjas horarias, una columna por persona ── */}
            {periodo === 'dia' && (
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${consultoresRango.length}, minmax(180px, 1fr))` }}>
                {consultoresRango.map((cid) => {
                  const ss = sesionesDe(cid, rango.dias[0])
                    .sort((a, b) => String(a.hora_inicio).localeCompare(String(b.hora_inicio)));
                  const hs = horasEn(ss);
                  return (
                    <div key={cid}>
                      <div className="mb-1.5 border-b border-[#1E5468] pb-1">
                        <p className="truncate text-[12.5px] font-bold text-[#EAF4F7]">
                          {cid === 'sin' ? 'Sin asignar' : nombreDe(cid)}
                        </p>
                        <p className={`text-[10.5px] font-bold ${hs > 8 ? 'text-red-300' : 'text-[#7FA7B4]'}`}>{hs} h</p>
                      </div>
                      {ss.map((s) => (
                        <button key={s.id} onClick={() => s.tarea && setTareaAbierta(s.tarea)}
                          className={`mb-1 block w-full rounded-lg px-2 py-1.5 text-left transition hover:brightness-125 ${
                            s.estado === 'hecha' ? 'bg-emerald-500/20' : 'bg-brand-orange/20'}`}>
                          <span className="block text-[11px] font-extrabold text-brand-orange">
                            {String(s.hora_inicio).slice(0, 5)}–{String(s.hora_fin).slice(0, 5)}
                          </span>
                          <span className="block truncate text-[11.5px] text-[#EAF4F7]">
                            {s.tarea?.codigo ? `${s.tarea.codigo} · ` : ''}{s.tarea?.titulo || 'Tarea'}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── SEMANA · una fila por persona, siete columnas ── */}
            {periodo === 'semana' && (
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr>
                    <th className="w-36 border-b border-[#1E5468] p-1.5 text-left text-[10.5px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Consultor</th>
                    {rango.dias.map((d) => {
                      const f = new Date(`${d}T12:00:00`);
                      const finde = [0, 6].includes(f.getDay());
                      const esHoy = d === iso(new Date());
                      return (
                        <th key={d} className={`border-b border-[#1E5468] p-1.5 text-center text-[10.5px] font-bold ${
                          esHoy ? 'text-brand-orange' : finde ? 'text-[#5E8494]' : 'text-[#9FC0CB]'}`}>
                          {f.toLocaleDateString('es-ES', { weekday: 'short' })}
                          <span className="block text-[13px] font-extrabold">{f.getDate()}</span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {consultoresRango.map((cid) => (
                    <tr key={cid} className="align-top">
                      <td className="border-b border-[#153F52] p-1.5">
                        <span className="block truncate text-[12px] font-bold text-[#EAF4F7]">
                          {cid === 'sin' ? 'Sin asignar' : nombreDe(cid)}
                        </span>
                        <span className="text-[10.5px] text-[#7FA7B4]">
                          {horasEn(rango.dias.flatMap((d) => sesionesDe(cid, d)))} h
                        </span>
                      </td>
                      {rango.dias.map((d) => {
                        const ss = sesionesDe(cid, d);
                        const hs = horasEn(ss);
                        return (
                          <td key={d} className="border-b border-l border-[#153F52] p-1 align-top">
                            {hs > 8 && <span className="mb-0.5 block text-center text-[9.5px] font-extrabold text-red-300">{hs} h</span>}
                            {ss.map((s) => (
                              <button key={s.id} onClick={() => s.tarea && setTareaAbierta(s.tarea)}
                                title={`${s.tarea?.titulo || ''} · ${s.horas} h`}
                                className={`mb-1 block w-full rounded-md px-1.5 py-1 text-left transition hover:brightness-125 ${
                                  s.estado === 'hecha' ? 'bg-emerald-500/20' : 'bg-brand-orange/20'}`}>
                                <span className="block text-[10px] font-extrabold text-[#EAF4F7]">{String(s.hora_inicio).slice(0, 5)}</span>
                                <span className="block truncate text-[10px] text-[#CFE3E9]">{s.tarea?.codigo || s.tarea?.titulo || 'Tarea'}</span>
                              </button>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* ── MES · rejilla de días con las horas del equipo ──
                En un mes no caben las franjas: lo que se busca aquí es dónde
                se acumula la carga, no a qué hora empieza cada cosa. */}
            {periodo === 'mes' && (
              <div>
                <div className="grid grid-cols-7 gap-1">
                  {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((d) => (
                    <div key={d} className="pb-1 text-center text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{d}</div>
                  ))}
                  {Array.from({ length: rango.offset || 0 }).map((_, i) => <div key={`h${i}`} />)}
                  {rango.dias.map((d) => {
                    const ss = sesiones.filter((s) => String(s.fecha).slice(0, 10) === d);
                    const hs = horasEn(ss);
                    const personas = new Set(ss.map((s) => String(s.consultor_id || 'sin'))).size;
                    const esHoy = d === iso(new Date());
                    // El tope del día es 8 h por persona con algo agendado.
                    return (
                      <button key={d} onClick={() => { setPeriodo('dia'); setDesplaz(Math.round((new Date(`${d}T12:00:00`) - new Date(iso(new Date()) + 'T12:00:00')) / 86400000)); }}
                        className={`min-h-[64px] rounded-lg border p-1.5 text-left transition hover:border-brand-orange/60 ${
                          esHoy ? 'border-brand-orange/60' : 'border-[#153F52]'} ${tonoCarga(hs, 8 * Math.max(1, personas))}`}>
                        <span className={`block text-[11px] font-extrabold ${esHoy ? 'text-brand-orange' : 'text-[#CFE3E9]'}`}>
                          {new Date(`${d}T12:00:00`).getDate()}
                        </span>
                        {hs > 0 && (
                          <>
                            <span className="block text-[12px] font-extrabold text-[#EAF4F7]">{hs} h</span>
                            <span className="block text-[9.5px] text-[#7FA7B4]">{personas} persona{personas === 1 ? '' : 's'}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[10.5px] text-[#5E8494]">Pulsa un día para verlo por horas.</p>
              </div>
            )}

            {/* ── AÑO · doce meses por persona ── */}
            {periodo === 'anio' && (
              <table className="w-full min-w-[860px] border-collapse">
                <thead>
                  <tr>
                    <th className="w-36 border-b border-[#1E5468] p-1.5 text-left text-[10.5px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Consultor</th>
                    {rango.meses.map((mes) => (
                      <th key={mes} className="border-b border-[#1E5468] p-1 text-center text-[10px] font-bold text-[#9FC0CB]">
                        {new Date(`${mes}-01T12:00:00`).toLocaleDateString('es-ES', { month: 'short' })}
                      </th>
                    ))}
                    <th className="border-b border-[#1E5468] p-1 text-right text-[10px] font-extrabold text-[#7FA7B4]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {consultoresRango.map((cid) => {
                    const total = horasEn(rango.meses.flatMap((mes) => sesionesDelMes(cid, mes)));
                    return (
                      <tr key={cid}>
                        <td className="border-b border-[#153F52] p-1.5 truncate text-[12px] font-bold text-[#EAF4F7]">
                          {cid === 'sin' ? 'Sin asignar' : nombreDe(cid)}
                        </td>
                        {rango.meses.map((mes) => {
                          const hs = horasEn(sesionesDelMes(cid, mes));
                          // 120 h al mes es una jornada completa a 6 h al día.
                          return (
                            <td key={mes} className={`border-b border-l border-[#153F52] p-1 text-center text-[11px] font-bold ${
                              tonoCarga(hs, 120)} ${hs ? 'text-[#EAF4F7]' : 'text-[#3F6478]'}`}>
                              {hs || '·'}
                            </td>
                          );
                        })}
                        <td className="border-b border-l border-[#153F52] p-1 text-right text-[11.5px] font-extrabold text-brand-orange">
                          {total}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )
      )}

      {/* ── Por tarea ── */}
      {vista === 'lista' && Object.entries(sesionesPorDia).sort(([a], [b]) => a.localeCompare(b)).map(([dia, ss]) => (
        <div key={`s-${dia}`} className="card !p-3">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <p className="text-[12.5px] font-extrabold text-[#EAF4F7]">{fmtDia(dia)}</p>
            <p className="text-[11px] font-bold text-[#7FA7B4]">{horasDelDia(dia)} h · {ss.length} sesión{ss.length === 1 ? '' : 'es'}</p>
          </div>
          <ul className="space-y-1">{ss.map((s) => <FilaSesion key={s.id} s={s} />)}</ul>
        </div>
      ))}

      {vista === 'lista' && Object.entries(porDia).map(([dia, ts]) => (
        <section key={dia}>
          <h2 className="mb-1.5 text-[12px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">
            {dia === hoy ? 'Hoy · ' : ''}{fmtDia(dia)}
          </h2>
          <ul className="space-y-1">{ts.map((t) => <Fila key={t.id} t={t} />)}</ul>
        </section>
      ))}
      {!Object.keys(porDia).length && !atrasadas.length && (
        <p className="card py-5 text-center text-[12.5px] text-[#7FA7B4]">Nada programado por delante.</p>
      )}

      {sinFecha.length > 0 && (
        <section>
          <h2 className="mb-1.5 text-[12px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Sin programar · {sinFecha.length}</h2>
          <ul className="space-y-1">{sinFecha.map((t) => <Fila key={t.id} t={t} />)}</ul>
        </section>
      )}
      {tareaAbierta && (
        <SesionesTarea
          tarea={{
            id: tareaAbierta.id, titulo: tareaAbierta.titulo, codigo: tareaAbierta.codigo,
            horas_teoricas: tareaAbierta.horas, subproceso: tareaAbierta.subproceso,
          }}
          contexto={{ norma: tareaAbierta.norma_id }}
          proyectoId={tareaAbierta.proyecto_id}
          campoTarea="cliente_tarea_id"
          editable
          onCerrar={() => setTareaAbierta(null)}
          onGuardado={cargar}
        />
      )}
    </div>
  );
}
