import { useCallback, useEffect, useState } from 'react';
import { listTable, updateRow } from '../../lib/data.js';
import { supabase, DEMO } from '../../lib/supabase.js';

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

  const cargar = useCallback(async () => {
    const [t, c, p] = await Promise.all([
      listTable('tareas_programadas').catch(() => []),
      listTable('proyecto_contextos').catch(() => []),
      listTable('proyectos_cliente').catch(() => []),
    ]);
    setTareas(t || []); setContextos(c || []); setProyectos(p || []);
    // Los pendientes por horizonte: de la función de la base; si no llega
    // (demo), se calculan aquí con lo cargado. El dato es el mismo.
    let h = null;
    if (!DEMO) {
      const { data } = await supabase.rpc('pendiente_por_horizonte').then((r) => r, () => ({ data: null }));
      h = data;
    }
    if (!h) {
      const hoy = new Date(new Date().toDateString());
      h = (p || []).filter((x) => x.fecha_limite).map((x) => {
        const dias = Math.round((new Date(`${x.fecha_limite}T00:00:00`) - hoy) / 864e5);
        const cts = (c || []).filter((k) => String(k.proyecto_id) === String(x.id)).map((k) => String(k.id));
        const pend = (t || []).filter((k) => cts.includes(String(k.contexto_id)) && ['pendiente', 'programada'].includes(k.estado)).length;
        return dias <= 90 && pend ? { proyecto_id: x.id, codigo_proyecto: x.codigo, fecha_limite: x.fecha_limite,
          horizonte: dias <= 30 ? 30 : dias <= 60 ? 60 : 90, pendientes: pend } : null;
      }).filter(Boolean);
    }
    setHorizonte(h || []);
    setCargando(false);
  }, []);
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

  if (cargando) return <p className="font-semibold text-[#9FC0CB]">Cargando agenda…</p>;

  const activas = tareas.filter((t) => t.estado !== 'anulada' && t.estado !== 'hecha');
  const hoy = hoyISO();
  const atrasadas = activas.filter((t) => t.fecha && t.fecha < hoy);
  const sinFecha = activas.filter((t) => !t.fecha);
  const proximas = activas.filter((t) => t.fecha && t.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const porDia = proximas.reduce((m, t) => { (m[t.fecha] = m[t.fecha] || []).push(t); return m; }, {});

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

      {Object.entries(porDia).map(([dia, ts]) => (
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
    </div>
  );
}
