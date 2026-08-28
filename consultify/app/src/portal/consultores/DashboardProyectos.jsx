import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { listTable } from '../../lib/data.js';
import {
  semaforo, TONO_SEMAFORO, necesitaRenovacion, resumen as resumenVencimiento,
  DIAS_AVISO_AMARILLO, DIAS_AVISO_ROJO, fmtFecha as fmtFechaLarga,
} from '../../lib/proyectos.js';

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
    // Dos relojes distintos, y conviene no mezclarlos:
    //   · el del TRABAJO: ¿llega el proyecto a su fecha con las tareas hechas?
    //   · el del CONTRATO: ¿cuándo vence y hay que emitir la renovación?
    // Un proyecto puede ir perfecto de tareas y estar a 20 días de vencer sin
    // que nadie haya mandado la oferta del año siguiente.
    const sem = semaforo(p);
    return {
      ...p, tareas: suyas.length, hechas, pct, diasRestantes: d,
      cliente: cliente?.empresa || cliente?.nombre || '—',
      consultor: quien ? `${quien.nombre} ${quien.apellidos || ''}`.trim() : null,
      sem, renovar: necesitaRenovacion(p),
      // Un proyecto va mal si le queda menos tiempo del que le falta trabajo.
      enRiesgo: d != null && d >= 0 && pct != null && pct < 100 && (d < 45 && pct < 70),
      vencido: d != null && d < 0 && pct != null && pct < 100,
    };
  }), [proyectos, tareas, clientes, consultores]);

  const lista = useMemo(() => conDatos.filter((p) => {
    if (String(filtro).startsWith('tipo:')) {
      return !esCerrado(p) && (p.modelo || p.tipo || 'Sin clasificar') === String(filtro).slice(5);
    }
    if (filtro === 'activos') return !esCerrado(p);
    if (filtro === 'riesgo') return p.enRiesgo || p.vencido;
    if (filtro === 'renovar') return !esCerrado(p) && p.renovar;
    return true;
  }), [conDatos, filtro]);

  // Reparto por tipo de servicio. Un panel que solo dice «12 proyectos» no
  // ayuda; saber que 8 son implantaciones y 4 acompañamiento, sí.
  const porTipo = useMemo(() => {
    const m = new Map();
    for (const p of conDatos) {
      if (esCerrado(p)) continue;
      const k = p.modelo || p.tipo || 'Sin clasificar';
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [conDatos]);

  const resumen = useMemo(() => ({
    activos: conDatos.filter((p) => !esCerrado(p)).length,
    riesgo: conDatos.filter((p) => p.enRiesgo || p.vencido).length,
    cerrados: conDatos.filter(esCerrado).length,
    tareas: conDatos.reduce((a, p) => a + p.tareas, 0),
    hechas: conDatos.reduce((a, p) => a + p.hechas, 0),
    renovar: conDatos.filter((p) => !esCerrado(p) && p.renovar).length,
  }), [conDatos]);

  // Vencimientos de contrato, ordenados por urgencia. Lo que vence antes, arriba.
  const venc = useMemo(() => resumenVencimiento(proyectos), [proyectos]);
  const porVencer = useMemo(() => conDatos
    .filter((p) => !esCerrado(p) && p.renovar)
    .sort((a, b) => a.sem.orden - b.sem.orden || String(a.fecha_fin || '9999').localeCompare(String(b.fecha_fin || '9999'))),
  [conDatos]);

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
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
        {[
          ['Proyectos activos', resumen.activos, 'text-[#EAF4F7]', 'activos'],
          ['Con el plazo en riesgo', resumen.riesgo, resumen.riesgo ? 'text-red-300' : 'text-[#EAF4F7]', 'riesgo'],
          ['Renovaciones pendientes', resumen.renovar, resumen.renovar ? 'text-brand-orange' : 'text-[#EAF4F7]', 'renovar'],
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

      {/* ── Vencimientos de contrato ──
          Sección propia y con el semáforo delante: es lo único de este panel
          que caduca. Un proyecto que vence sin oferta de renovación es un año
          de ingresos que se pierde por no mirar el calendario. */}
      <section className={`card ${venc.rojo + venc.vencido > 0 ? 'border-l-4 border-l-red-400' : venc.amarillo > 0 ? 'border-l-4 border-l-amber-300' : ''}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-extrabold text-[#EAF4F7]">Vencimientos de contrato</h2>
          <p className="text-[11px] font-semibold text-[#7FA7B4]">
            Aviso a {DIAS_AVISO_AMARILLO} días · urgente a {DIAS_AVISO_ROJO} · la renovación se emite un mes antes
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Vencidos', venc.vencido, 'vencido'],
            [`≤ ${DIAS_AVISO_ROJO} días`, venc.rojo, 'rojo'],
            [`≤ ${DIAS_AVISO_AMARILLO} días`, venc.amarillo, 'amarillo'],
            ['Sin fecha de fin', venc.sin_fecha, 'sin_fecha'],
          ].map(([etq, n, nivel]) => (
            <div key={etq} className={`rounded-xl border ${TONO_SEMAFORO[nivel].borde} bg-[#0D3242] px-3 py-2.5`}>
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${TONO_SEMAFORO[nivel].punto}`} aria-hidden="true" />
                <span className="text-2xl font-extrabold leading-none text-[#EAF4F7]">{n}</span>
              </span>
              <span className="mt-1 block text-[10.5px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{etq}</span>
            </div>
          ))}
        </div>

        {porVencer.length === 0 ? (
          <p className="py-4 text-center text-[12.5px] text-[#7FA7B4]">
            Ninguna renovación pendiente. Todo al día.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[#153F52]">
            {porVencer.map((p) => {
              const t = TONO_SEMAFORO[p.sem.nivel];
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${t.punto}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-[#EAF4F7]">{p.nombre || p.cliente}</span>
                    <span className="text-[11.5px] text-[#7FA7B4]">
                      {p.cliente}{p.modelo ? ` · ${p.modelo}` : ''}{p.consultor ? ` · ${p.consultor}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={`chip ${t.chip} !px-2.5 !py-0.5 text-[11px] font-extrabold`}>{p.sem.etiqueta}</span>
                    <span className="mt-0.5 block text-[11px] text-[#9FC0CB]">
                      {fmtFechaLarga(p.fecha_inicio)} → {fmtFechaLarga(p.fecha_fin)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Por tipo de servicio: pulsar filtra la lista */}
      {porTipo.length > 0 && (
        <section className="card">
          <h2 className="text-sm font-extrabold text-[#EAF4F7]">Por tipo de servicio</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {porTipo.map(([tipo, n]) => (
              <button key={tipo} onClick={() => setFiltro(filtro === `tipo:${tipo}` ? 'activos' : `tipo:${tipo}`)}
                className={`rounded-xl border border-[#1E5468] bg-[#0D3242] px-3 py-2.5 text-left transition hover:border-brand-orange ${
                  filtro === `tipo:${tipo}` ? 'ring-1 ring-brand-orange' : ''}`}>
                <span className="block text-2xl font-extrabold leading-none text-[#EAF4F7]">{n}</span>
                <span className="mt-1 block truncate text-[10.5px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{tipo}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Los proyectos */}
      <section className="card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-extrabold text-[#EAF4F7]">
            {String(filtro).startsWith('tipo:') ? `Proyectos · ${String(filtro).slice(5)}`
              : filtro === 'riesgo' ? 'Proyectos con el plazo en riesgo'
              : filtro === 'renovar' ? 'Proyectos pendientes de renovación'
              : filtro === 'todos' ? 'Todos los proyectos' : 'Proyectos activos'}
          </h2>
          <span className="text-[11.5px] text-[#9FC0CB]">{lista.length}</span>
        </div>

        {lista.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-[#7FA7B4]">
            {filtro === 'riesgo' ? 'Ningún proyecto en riesgo. Bien.'
              : filtro === 'renovar' ? 'Ninguna renovación pendiente.'
              : 'No hay proyectos que mostrar.'}
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

                  {p.sem.nivel !== 'ok' && p.sem.nivel !== 'sin_fecha' && (
                    <span className={`chip ${TONO_SEMAFORO[p.sem.nivel].chip} !px-2 !py-0.5 shrink-0 text-[10.5px] font-extrabold`}
                      title={`Fin de contrato: ${fmtFechaLarga(p.fecha_fin)}`}>
                      contrato {p.sem.etiqueta}
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
