import { useEffect, useMemo, useState } from 'react';
import { listTable } from '../../lib/data.js';

// ════════════════════════════════════════════════════════════════════════════
// CABECERA DE MI AGENDA
//
// Lo primero que se ve al entrar. Tres bloques, en este orden a propósito:
//
//   1 · Tareas pendientes con semáforo de vencimientos — lo urgente primero
//   2 · Mis clientes asignados — de quién respondo
//   3 · Resumen de tareas — la foto del mes
//
// El semáforo mide contra HOY, no contra el mes seleccionado en el resto de la
// pantalla: una tarea vencida de marzo sigue vencida en julio.
// ════════════════════════════════════════════════════════════════════════════

const hoy0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const dias = (iso) => {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return Math.round((d - hoy0()) / 864e5);
};

// Tramos del semáforo. El orden importa: se evalúa de arriba abajo.
const TRAMOS = [
  { k: 'vencida', label: 'Vencidas',    test: (d) => d < 0,            tono: 'bg-red-500/15 text-red-300 border-red-500/40',        punto: 'bg-red-400' },
  { k: 'hoy',     label: 'Hoy',         test: (d) => d === 0,          tono: 'bg-brand-orange/15 text-brand-orange border-brand-orange/40', punto: 'bg-brand-orange' },
  { k: 'semana',  label: '7 días',      test: (d) => d > 0 && d <= 7,  tono: 'bg-amber-400/12 text-amber-300 border-amber-400/30',  punto: 'bg-amber-300' },
  { k: 'despues', label: 'Más adelante',test: (d) => d > 7,            tono: 'bg-white/6 text-[#9FC0CB] border-[#1E5468]',          punto: 'bg-[#3F7D93]' },
];
const tramoDe = (d) => (d == null ? 'despues' : (TRAMOS.find((t) => t.test(d))?.k || 'despues'));

const fmtFecha = (iso) => iso
  ? new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  : '—';

export default function ResumenAgenda({ tareas, yo }) {
  const [proyectos, setProyectos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [tramoAbierto, setTramoAbierto] = useState('vencida');

  useEffect(() => {
    Promise.all([
      listTable('proyectos').catch(() => []),
      listTable('empresas').catch(() => []),
    ]).then(([p, e]) => { setProyectos(p || []); setEmpresas(e || []); });
  }, []);

  // ── 1 · Pendientes con su tramo de vencimiento ──
  const pendientes = useMemo(
    () => (tareas || []).filter((t) => t.estado !== 'completada'),
    [tareas],
  );

  const porTramo = useMemo(() => {
    const m = { vencida: [], hoy: [], semana: [], despues: [] };
    for (const t of pendientes) m[tramoDe(dias(t.fecha_prevista))].push(t);
    for (const k of Object.keys(m)) {
      m[k].sort((a, b) => String(a.fecha_prevista).localeCompare(String(b.fecha_prevista)));
    }
    return m;
  }, [pendientes]);

  // ── 2 · Mis clientes: los de los proyectos donde soy responsable ──
  const misClientes = useMemo(() => {
    if (!yo?.id) return [];
    const mios = proyectos.filter((p) => String(p.consultor_id) === String(yo.id));
    const porEmpresa = new Map();
    for (const p of mios) {
      const clave = String(p.empresa_id || p.cliente_id || p.id);
      if (!porEmpresa.has(clave)) porEmpresa.set(clave, { proyectos: [], empresa: null });
      porEmpresa.get(clave).proyectos.push(p);
    }
    for (const [clave, v] of porEmpresa) {
      v.empresa = empresas.find((e) => String(e.id) === clave) || null;
    }
    // Tareas pendientes de cada cliente, para poder ordenarlos por urgencia
    return [...porEmpresa.entries()].map(([clave, v]) => {
      const ids = new Set(v.proyectos.map((p) => String(p.id)));
      const suyas = pendientes.filter((t) => ids.has(String(t.proyecto_id)));
      const vencidas = suyas.filter((t) => dias(t.fecha_prevista) < 0).length;
      return {
        clave,
        nombre: v.empresa?.nombre_comercial || v.empresa?.nombre || v.proyectos[0]?.nombre || 'Sin nombre',
        nProyectos: v.proyectos.length,
        pendientes: suyas.length,
        vencidas,
      };
    }).sort((a, b) => b.vencidas - a.vencidas || b.pendientes - a.pendientes);
  }, [proyectos, empresas, yo, pendientes]);

  // ── 3 · Resumen ──
  const resumen = useMemo(() => {
    const todas = tareas || [];
    const compl = todas.filter((t) => t.estado === 'completada');
    const curso = todas.filter((t) => t.estado === 'en_curso');
    const hPrev = todas.reduce((a, t) => a + (Number(t.horas_previstas) || 0), 0);
    const hReal = todas.reduce((a, t) => a + (Number(t.horas_reales) || 0), 0);
    const porTipo = {};
    for (const t of todas) porTipo[t.tipo || 'produccion'] = (porTipo[t.tipo || 'produccion'] || 0) + 1;
    return {
      total: todas.length,
      completadas: compl.length,
      enCurso: curso.length,
      pendientes: pendientes.length,
      pct: todas.length ? Math.round((compl.length / todas.length) * 100) : 0,
      hPrev: Math.round(hPrev * 10) / 10,
      hReal: Math.round(hReal * 10) / 10,
      porTipo,
    };
  }, [tareas, pendientes]);

  const lista = porTramo[tramoAbierto] || [];

  return (
    <div className="space-y-4">
      {/* ── 1 · Semáforo de vencimientos ── */}
      <section className="card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-extrabold text-[#EAF4F7]">Tareas pendientes</h2>
          <p className="text-[11.5px] text-[#9FC0CB]">
            {pendientes.length} sin cerrar · el semáforo se mide contra hoy, no contra el mes elegido
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TRAMOS.map((tr) => {
            const n = porTramo[tr.k].length;
            const activo = tramoAbierto === tr.k;
            return (
              <button key={tr.k} onClick={() => setTramoAbierto(tr.k)}
                className={`rounded-xl border p-3 text-left transition ${tr.tono} ${activo ? 'ring-2 ring-white/20' : 'opacity-90 hover:opacity-100'}`}>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tr.punto}`} />
                  <span className="text-[11px] font-extrabold uppercase tracking-wide">{tr.label}</span>
                </div>
                <p className="mt-1 text-2xl font-extrabold">{n}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-3">
          {lista.length === 0 ? (
            <p className="py-3 text-center text-[12.5px] text-[#7FA7B4]">
              {tramoAbierto === 'vencida' ? 'Nada vencido. Así da gusto.' : 'Sin tareas en este tramo.'}
            </p>
          ) : (
            <ul className="divide-y divide-[#153F52]">
              {lista.slice(0, 8).map((t) => {
                const d = dias(t.fecha_prevista);
                return (
                  <li key={t.id} className="flex items-center gap-3 py-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${TRAMOS.find((x) => x.k === tramoDe(d))?.punto}`} />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-[#EAF4F7]">{t.titulo}</span>
                    <span className="shrink-0 text-[11.5px] text-[#9FC0CB]">{fmtFecha(t.fecha_prevista)}</span>
                    <span className={`shrink-0 text-[11px] font-bold ${d < 0 ? 'text-red-300' : 'text-[#7FA7B4]'}`}>
                      {d == null ? '' : d < 0 ? `${Math.abs(d)} d de retraso` : d === 0 ? 'hoy' : `en ${d} d`}
                    </span>
                  </li>
                );
              })}
              {lista.length > 8 && (
                <li className="pt-2 text-[11.5px] text-[#7FA7B4]">y {lista.length - 8} más en este tramo</li>
              )}
            </ul>
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── 2 · Mis clientes asignados ── */}
        <section className="card">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-extrabold text-[#EAF4F7]">Mis clientes asignados</h2>
            <span className="text-[11.5px] text-[#9FC0CB]">{misClientes.length}</span>
          </div>
          {misClientes.length === 0 ? (
            <p className="py-4 text-center text-[12.5px] text-[#7FA7B4]">
              No hay proyectos con tu nombre como responsable.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-[#153F52]">
              {misClientes.slice(0, 7).map((c) => (
                <li key={c.clave} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-[#EAF4F7]">{c.nombre}</span>
                    <span className="text-[11px] text-[#7FA7B4]">
                      {c.nProyectos} proyecto{c.nProyectos === 1 ? '' : 's'} · {c.pendientes} pendiente{c.pendientes === 1 ? '' : 's'}
                    </span>
                  </span>
                  {c.vencidas > 0 && (
                    <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[10.5px] font-extrabold text-red-300">
                      {c.vencidas} vencida{c.vencidas === 1 ? '' : 's'}
                    </span>
                  )}
                </li>
              ))}
              {misClientes.length > 7 && (
                <li className="pt-2 text-[11.5px] text-[#7FA7B4]">y {misClientes.length - 7} más</li>
              )}
            </ul>
          )}
        </section>

        {/* ── 3 · Resumen de tareas ── */}
        <section className="card">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-extrabold text-[#EAF4F7]">Resumen de tareas</h2>
            <span className="text-[11.5px] text-[#9FC0CB]">{resumen.total} este año</span>
          </div>

          <div className="mt-2">
            <div className="flex items-baseline justify-between">
              <span className="text-[11.5px] text-[#9FC0CB]">Completadas</span>
              <span className="text-[13px] font-extrabold text-[#EAF4F7]">{resumen.pct} %</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-brand-verde" style={{ width: `${resumen.pct}%` }} />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[['Completadas', resumen.completadas, 'text-emerald-300'],
              ['En curso', resumen.enCurso, 'text-brand-orange'],
              ['Pendientes', resumen.pendientes, 'text-[#EAF4F7]']].map(([k, v, tono]) => (
              <div key={k} className="rounded-lg bg-[#0D3242] p-2.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{k}</p>
                <p className={`mt-0.5 text-lg font-extrabold ${tono}`}>{v}</p>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[11.5px] leading-relaxed text-[#9FC0CB]">
            <b className="text-[#EAF4F7]">{resumen.hPrev} h</b> previstas ·{' '}
            <b className="text-[#EAF4F7]">{resumen.hReal} h</b> imputadas
            {resumen.hPrev > 0 && resumen.hReal > 0 && (
              <> · desviación <b className={resumen.hReal > resumen.hPrev ? 'text-red-300' : 'text-emerald-300'}>
                {resumen.hReal > resumen.hPrev ? '+' : ''}{Math.round((resumen.hReal - resumen.hPrev) * 10) / 10} h
              </b></>
            )}
          </p>
        </section>
      </div>
    </div>
  );
}
