import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { listTable } from '../../lib/data.js';

// ════════════════════════════════════════════════════════════════════════════
// PANEL DE PROYECTOS
//
// El panel general dice cuántos proyectos hay; éste dice CÓMO van. Son dos
// preguntas distintas y mezclarlas deja las dos a medias.
//
// Lo que se mira de un proyecto en marcha es siempre lo mismo: si llega a la
// fecha, qué falta y quién lo lleva. Eso es lo que hay aquí.
// ════════════════════════════════════════════════════════════════════════════

const CERRADOS = ['cerrado', 'cancelado', 'finalizado'];
const esCerrado = (p) => CERRADOS.includes(String(p?.estado || '').toLowerCase());

const dias = (iso) => {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((d - hoy) / 864e5);
};

const fmtFecha = (iso) => iso
  ? new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })
  : '—';

export default function DashboardProyectos() {
  const [proyectos, setProyectos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [consultores, setConsultores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('activos');

  useEffect(() => {
    Promise.all([
      listTable('proyectos_cliente').catch(() => []),
      listTable('clientes').catch(() => []),
      listTable('cliente_tareas').catch(() => []),
      listTable('consultores').catch(() => []),
    ]).then(([p, c, t, co]) => {
      setProyectos(p || []); setClientes(c || []); setTareas(t || []); setConsultores(co || []);
    }).finally(() => setCargando(false));
  }, []);

  const conDatos = useMemo(() => proyectos.map((p) => {
    const suyas = tareas.filter((t) => String(t.proyecto_id) === String(p.id));
    const hechas = suyas.filter((t) => t.estado === 'completada').length;
    const pct = suyas.length ? Math.round((hechas / suyas.length) * 100) : null;
    const d = dias(p.fecha_certificacion || p.fecha_fin);
    const cliente = clientes.find((c) => String(c.id) === String(p.cliente_id));
    const quien = consultores.find((c) => String(c.id) === String(p.consultor_id));
    return {
      ...p, tareas: suyas.length, hechas, pct, diasRestantes: d,
      cliente: cliente?.empresa || cliente?.nombre || '—',
      consultor: quien ? `${quien.nombre} ${quien.apellidos || ''}`.trim() : null,
      // Un proyecto va mal si le queda menos tiempo del que le falta trabajo.
      enRiesgo: d != null && d >= 0 && pct != null && pct < 100 && (d < 45 && pct < 70),
      vencido: d != null && d < 0 && pct != null && pct < 100,
    };
  }), [proyectos, tareas, clientes, consultores]);

  const lista = useMemo(() => conDatos.filter((p) => (
    filtro === 'activos' ? !esCerrado(p)
      : filtro === 'riesgo' ? (p.enRiesgo || p.vencido)
      : true
  )), [conDatos, filtro]);

  const resumen = useMemo(() => ({
    activos: conDatos.filter((p) => !esCerrado(p)).length,
    riesgo: conDatos.filter((p) => p.enRiesgo || p.vencido).length,
    cerrados: conDatos.filter(esCerrado).length,
    tareas: conDatos.reduce((a, p) => a + p.tareas, 0),
    hechas: conDatos.reduce((a, p) => a + p.hechas, 0),
  }), [conDatos]);

  if (cargando) return <p className="font-semibold text-[#9FC0CB]">Cargando proyectos…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Cartera</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#EAF4F7]">Panel de proyectos</h1>
          <p className="mt-1 text-sm text-[#9FC0CB]">
            Cómo van los proyectos en marcha: plazo, avance y quién los lleva.
          </p>
        </div>
        <NavLink to="../proyectos" className="btn-ghost !px-3 !py-1.5 text-xs">Ver la cartera completa →</NavLink>
      </div>

      {/* Las cifras */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Proyectos activos', resumen.activos, 'text-[#EAF4F7]', 'activos'],
          ['Con el plazo en riesgo', resumen.riesgo, resumen.riesgo ? 'text-red-300' : 'text-[#EAF4F7]', 'riesgo'],
          ['Cerrados', resumen.cerrados, 'text-[#9FC0CB]', 'todos'],
          ['Tareas completadas', resumen.tareas ? `${Math.round((resumen.hechas / resumen.tareas) * 100)} %` : '—', 'text-brand-verdeTexto', null],
        ].map(([etq, valor, color, f]) => (
          <button key={etq} onClick={() => f && setFiltro(f)} disabled={!f}
            className={`card !p-4 text-left transition ${f ? 'hover:border-brand-orange' : 'cursor-default'} ${filtro === f ? 'ring-1 ring-brand-orange' : ''}`}>
            <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{etq}</p>
            <p className={`mt-1 text-2xl font-extrabold ${color}`}>{valor}</p>
          </button>
        ))}
      </div>

      {/* Los proyectos */}
      <section className="card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-extrabold text-[#EAF4F7]">
            {filtro === 'riesgo' ? 'Proyectos con el plazo en riesgo' : filtro === 'todos' ? 'Todos los proyectos' : 'Proyectos activos'}
          </h2>
          <span className="text-[11.5px] text-[#9FC0CB]">{lista.length}</span>
        </div>

        {lista.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-[#7FA7B4]">
            {filtro === 'riesgo' ? 'Ningún proyecto en riesgo. Bien.' : 'No hay proyectos que mostrar.'}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-[#153F52]">
            {lista.map((p) => (
              <li key={p.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold text-[#EAF4F7]">{p.nombre || p.cliente}</span>
                    <span className="text-[11.5px] text-[#7FA7B4]">
                      {p.cliente}{p.consultor ? ` · ${p.consultor}` : ''}
                    </span>
                  </span>

                  {p.pct != null && (
                    <span className="w-28 shrink-0">
                      <span className="mb-1 block text-right text-[11px] font-bold text-[#9FC0CB]">{p.pct} %</span>
                      <span className="block h-1.5 overflow-hidden rounded-full bg-white/10">
                        <span className="block h-full rounded-full bg-brand-verde" style={{ width: `${p.pct}%` }} />
                      </span>
                    </span>
                  )}

                  <span className="w-32 shrink-0 text-right">
                    <span className="block text-[11.5px] text-[#9FC0CB]">{fmtFecha(p.fecha_certificacion || p.fecha_fin)}</span>
                    {p.diasRestantes != null && (
                      <span className={`text-[11px] font-bold ${
                        p.vencido ? 'text-red-300' : p.enRiesgo ? 'text-brand-orange' : 'text-[#7FA7B4]'}`}>
                        {p.diasRestantes < 0 ? `${Math.abs(p.diasRestantes)} d de retraso` : `${p.diasRestantes} d`}
                      </span>
                    )}
                  </span>
                </div>

                {(p.vencido || p.enRiesgo) && (
                  <p className={`mt-1.5 text-[11.5px] ${p.vencido ? 'text-red-300' : 'text-brand-orange'}`}>
                    {p.vencido
                      ? 'Pasó la fecha y quedan tareas sin cerrar.'
                      : `Quedan ${p.diasRestantes} días y va por el ${p.pct} %.`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
