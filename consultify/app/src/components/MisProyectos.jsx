import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listTable } from '../lib/data.js';
import { useAuth } from '../lib/auth.jsx';

// ════════════════════════════════════════════════════════════════════════════
// MIS PROYECTOS
//
// Los proyectos en los que esta persona está asignada, con las tres cifras que
// importan: comprometido, planificado y ejecutado.
//
// Sale de `proyecto_equipo` y no de las tareas que ya tenga asignadas, que
// sería circular: sin tareas no vería el proyecto, y sin ver el proyecto no
// puede programarse tareas.
// ════════════════════════════════════════════════════════════════════════════

const fmt = (f) => {
  if (!f) return null;
  const d = new Date(`${String(f).slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' });
};
const dias = (f) => {
  if (!f) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${String(f).slice(0, 10)}T12:00:00`) - hoy) / 86400000);
};
const h1 = (n) => `${Math.round((Number(n) || 0) * 10) / 10} h`;

const ETQ_PAPEL = { responsable: 'Responsable', consultor: 'Consultor', apoyo: 'Apoyo' };

export default function MisProyectos({ perfilId = null, titulo = 'Mis proyectos' }) {
  const { user } = useAuth();
  const id = perfilId || user?.id;
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    if (!id) return;
    let vivo = true;
    Promise.all([
      listTable('proyecto_equipo').catch(() => []),
      listTable('proyectos_cliente').catch(() => []),
      listTable('clientes').catch(() => []),
      listTable('empresas').catch(() => []),
      listTable('cliente_tareas').catch(() => []),
      listTable('tarea_sesiones').catch(() => []),
    ]).then(([eq, pr, cl, em, ta, se]) => {
      if (vivo) setDatos({ eq, pr, cl, em, ta, se });
    }).catch(() => vivo && setDatos({ eq: [], pr: [], cl: [], em: [], ta: [], se: [] }));
    return () => { vivo = false; };
  }, [id]);

  const mios = useMemo(() => {
    if (!datos) return [];
    const norm = (s) => String(s || '').toUpperCase().replace(/[\s.-]/g, '');
    return datos.eq
      .filter((e) => String(e.perfil_id) === String(id))
      .map((e) => {
        const p = datos.pr.find((x) => String(x.id) === String(e.proyecto_id));
        if (!p) return null;
        const cli = datos.cl.find((c) => String(c.id) === String(p.cliente_id));
        const emp = cli?.cif ? datos.em.find((x) => norm(x.cif) === norm(cli.cif)) : null;
        const tareas = datos.ta.filter((t) => String(t.proyecto_id) === String(p.id));
        const ids = new Set(tareas.map((t) => String(t.id)));
        const ses = datos.se.filter((s) => ids.has(String(s.cliente_tarea_id)) && s.estado !== 'anulada');

        return {
          ...p,
          papel: e.papel,
          horasAsignadas: e.horas_asignadas,
          cliente: emp?.nombre_comercial?.trim() || emp?.nombre || cli?.empresa || '—',
          // Las tres cifras. Comprometido sale del catálogo del modelo, que es
          // lo que se ofertó; no de lo que alguien haya planificado después.
          comprometidas: tareas.reduce((a, t) => a + (Number(t.horas) || 0), 0),
          planificadas: ses.reduce((a, s) => a + (Number(s.horas) || 0), 0),
          ejecutadas: ses.filter((s) => s.estado === 'hecha').reduce((a, s) => a + (Number(s.horas) || 0), 0),
          nTareas: tareas.length,
          nPlanificadas: new Set(ses.map((s) => String(s.cliente_tarea_id))).size,
          nEjecutadas: new Set(ses.filter((s) => s.estado === 'hecha').map((s) => String(s.cliente_tarea_id))).size,
        };
      })
      .filter(Boolean)
      // Lo que urge primero: el proyecto con la fecha límite más cercana.
      .sort((a, b) => String(a.fecha_limite || '9999').localeCompare(String(b.fecha_limite || '9999')));
  }, [datos, id]);

  const total = useMemo(() => mios.reduce((a, p) => ({
    comprometidas: a.comprometidas + p.comprometidas,
    planificadas: a.planificadas + p.planificadas,
    ejecutadas: a.ejecutadas + p.ejecutadas,
    tareas: a.tareas + p.nTareas,
    tPlan: a.tPlan + p.nPlanificadas,
    tEjec: a.tEjec + p.nEjecutadas,
  }), { comprometidas: 0, planificadas: 0, ejecutadas: 0, tareas: 0, tPlan: 0, tEjec: 0 }), [mios]);

  if (!datos) return <p className="text-[12.5px] text-[#7FA7B4]">Cargando proyectos…</p>;

  if (!mios.length) {
    return (
      <div className="card">
        <h3 className="text-[15px] font-extrabold text-[#EAF4F7]">{titulo}</h3>
        <p className="mt-1.5 text-[13px] text-[#9FC0CB]">
          No tienes proyectos asignados. El equipo de cada proyecto lo asigna dirección
          desde la ficha del proyecto.
        </p>
      </div>
    );
  }

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[15px] font-extrabold text-[#EAF4F7]">{titulo} ({mios.length})</h3>
      </div>

      {/* Las seis cifras del conjunto. Comprometido es lo vendido; planificado,
          lo que está en calendario; ejecutado, lo cerrado. Juntas dicen si vas
          sobrado o ahogado antes de que sea tarde. */}
      <div className="grid grid-cols-3 gap-2">
        {[
          ['Comprometidas', h1(total.comprometidas), `${total.tareas} tareas`],
          ['Planificadas', h1(total.planificadas), `${total.tPlan} tareas`],
          ['Ejecutadas', h1(total.ejecutadas), `${total.tEjec} tareas`],
        ].map(([etq, v, pie], i) => (
          <div key={etq} className="rounded-xl border border-[#1E5468] bg-[#0D3242] px-3 py-2">
            <p className={`text-lg font-extrabold leading-none ${
              i === 0 ? 'text-[#EAF4F7]' : i === 1 ? 'text-brand-orange' : 'text-emerald-300'}`}>{v}</p>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{etq}</p>
            <p className="mt-0.5 text-[10.5px] text-[#7FA7B4]">{pie}</p>
          </div>
        ))}
      </div>

      {total.comprometidas > 0 && total.planificadas < total.comprometidas && (
        <p className="text-[11.5px] font-bold text-amber-200">
          Quedan {h1(total.comprometidas - total.planificadas)} sin programar.
        </p>
      )}

      <ul className="divide-y divide-[#153F52]">
        {mios.map((p) => {
          const d = dias(p.fecha_limite);
          return (
            <li key={p.id} className="py-2.5">
              <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                <Link to={`/consultores/proyectos?proyecto=${p.id}`}
                  className="min-w-0 flex-1 hover:text-brand-orange">
                  <span className="block truncate text-[13px] font-bold text-[#EAF4F7]">{p.cliente}</span>
                  <span className="block truncate text-[11.5px] text-[#7FA7B4]">
                    {p.nombre}
                    {p.papel === 'responsable' && (
                      <span className="ml-1.5 font-bold text-brand-orange">· {ETQ_PAPEL[p.papel]}</span>
                    )}
                  </span>
                </Link>

                {d != null && (
                  <span className={`chip !px-2 !py-0.5 text-[10.5px] font-extrabold ${
                    d < 0 ? 'bg-red-500/20 text-red-200'
                      : d <= 30 ? 'bg-red-500/15 text-red-300'
                      : d <= 60 ? 'bg-amber-400/15 text-amber-200'
                      : 'bg-[#123F52] text-[#9FC0CB]'}`}>
                    {d < 0 ? `vencido hace ${-d} d` : `${d} d`}
                  </span>
                )}

                <span className="whitespace-nowrap text-[11.5px]">
                  <span className="font-bold text-brand-orange">{h1(p.planificadas)}</span>
                  <span className="text-[#7FA7B4]"> de {h1(p.comprometidas)}</span>
                </span>
              </div>

              {/* Barra: lo planificado sobre lo comprometido, con lo ejecutado
                  dentro. Un número dice cuánto; la barra dice si vas justo. */}
              {p.comprometidas > 0 && (
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#0B2E3D]">
                  <div className="h-full rounded-full bg-brand-orange/50"
                    style={{ width: `${Math.min(100, (p.planificadas / p.comprometidas) * 100)}%` }}>
                    <div className="h-full rounded-full bg-emerald-400"
                      style={{ width: p.planificadas ? `${Math.min(100, (p.ejecutadas / p.planificadas) * 100)}%` : 0 }} />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
