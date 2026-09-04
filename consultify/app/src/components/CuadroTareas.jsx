import { useEffect, useMemo, useState } from 'react';
import { listTable } from '../lib/data.js';
import { useAuth } from '../lib/auth.jsx';
import { can } from '../lib/permisos.js';
import { mismoModelo } from '../lib/calcEngine.js';

// ════════════════════════════════════════════════════════════════════════════
// CUADRO DE MANDO DE TAREAS
//
// La misma pregunta a dos alturas: ¿vamos bien de horas?
//
//   global          todas las tareas de todos los proyectos visibles
//   por proyecto    pasando `proyectoId`
//
// Las tres cifras son siempre las mismas y significan lo mismo:
//
//   TEÓRICAS      lo que el catálogo de sistemas de gestión asigna. Es lo que
//                 se ofertó, y el único número que no se mueve.
//   PROGRAMADAS   la suma de las sesiones en calendario.
//   EJECUTADAS    la suma de las sesiones cerradas.
//
// Comparar programadas contra teóricas dice si el trabajo cabe. Comparar
// ejecutadas contra programadas dice si se está cumpliendo. Son dos preguntas
// distintas y por eso hay dos barras, no una.
// ════════════════════════════════════════════════════════════════════════════

const h1 = (n) => `${Math.round((Number(n) || 0) * 10) / 10} h`;
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : null);

const diasHasta = (f) => {
  if (!f) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${String(f).slice(0, 10)}T12:00:00`) - hoy) / 86400000);
};

export default function CuadroTareas({ proyectoId = null, titulo = 'Cuadro de tareas' }) {
  const { user, role } = useAuth();
  const [d, setD] = useState(null);
  const [porNorma, setPorNorma] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      listTable('cliente_tareas').catch(() => []),
      listTable('tarea_sesiones').catch(() => []),
      listTable('tareas_catalogo').catch(() => []),
      listTable('proyectos_cliente').catch(() => []),
      listTable('clientes').catch(() => []),
      listTable('empresas').catch(() => []),
      listTable('proyecto_equipo').catch(() => []),
      listTable('perfiles').catch(() => []),
    ]).then((r) => vivo && setD({
      tareas: r[0], sesiones: r[1], catalogo: r[2], proyectos: r[3],
      clientes: r[4], empresas: r[5], equipo: r[6], perfiles: r[7],
    })).catch(() => vivo && setD({ tareas: [], sesiones: [], catalogo: [], proyectos: [], clientes: [], empresas: [], equipo: [], perfiles: [] }));
    return () => { vivo = false; };
  }, []);

  const datos = useMemo(() => {
    if (!d) return null;
    const norm = (s) => String(s || '').toUpperCase().replace(/[\s.-]/g, '');

    // Qué proyectos entran. Consultoría solo ve los suyos: el estado de la
    // cartera entera no le sirve y le enseña clientes que no lleva.
    const verTodo = ['superadmin', 'admin', 'director'].includes(role);
    const mios = new Set(d.equipo
      .filter((e) => String(e.perfil_id) === String(user?.id))
      .map((e) => String(e.proyecto_id)));

    const proyectos = d.proyectos
      .filter((p) => (proyectoId ? String(p.id) === String(proyectoId) : true))
      .filter((p) => verTodo || mios.has(String(p.id)));
    const idsP = new Set(proyectos.map((p) => String(p.id)));

    // Horas teóricas: del catálogo, por enlace directo o por coincidencia.
    const teoricasDe = (t) => {
      const c = (t.catalogo_id && d.catalogo.find((x) => String(x.id) === String(t.catalogo_id)))
        || d.catalogo.find((x) => String(x.norma_id) === String(t.norma_id)
          && mismoModelo(x.modelo, t.modelo)
          && String(x.subproceso || '') === String(t.subproceso || '')
          && String(x.proceso || '') === String(t.proceso || ''));
      const n = Number(c?.horas_base) || 0;
      return n > 0 ? n : (Number(t.horas) || 0);
    };

    const tareas = d.tareas.filter((t) => idsP.has(String(t.proyecto_id)));
    const porTarea = {};
    for (const s of d.sesiones) {
      if (s.estado === 'anulada') continue;
      const k = String(s.cliente_tarea_id);
      (porTarea[k] = porTarea[k] || []).push(s);
    }

    const filas = tareas.map((t) => {
      const ss = porTarea[String(t.id)] || [];
      const teo = teoricasDe(t);
      const prog = ss.reduce((a, s) => a + (Number(s.horas) || 0), 0);
      const ejec = ss.filter((s) => s.estado === 'hecha').reduce((a, s) => a + (Number(s.horas) || 0), 0);
      const p = d.proyectos.find((x) => String(x.id) === String(t.proyecto_id));
      const cli = d.clientes.find((c) => String(c.id) === String(p?.cliente_id));
      const emp = cli?.cif ? d.empresas.find((e) => norm(e.cif) === norm(cli.cif)) : null;
      return {
        ...t, teo, prog, ejec, nSes: ss.length,
        proyecto: p,
        cliente: emp?.nombre_comercial?.trim() || emp?.nombre || cli?.empresa || '—',
        // Estado de cada tarea, que es lo que se cuenta arriba.
        estado: !ss.length ? 'sin_programar'
          : ejec >= teo && teo > 0 ? 'completada'
          : prog + 0.5 < teo ? 'corta'
          : prog > teo + 0.5 ? 'pasada'
          : 'programada',
      };
    });

    const sum = (f, k) => Math.round(f.reduce((a, x) => a + x[k], 0) * 10) / 10;
    const cuenta = (e) => filas.filter((f) => f.estado === e).length;

    // Agrupado por norma o por proyecto, según el alcance.
    const grupos = {};
    for (const f of filas) {
      const k = proyectoId || porNorma ? (f.norma_id || '—') : String(f.proyecto?.id || '—');
      (grupos[k] = grupos[k] || { clave: k, filas: [] }).filas.push(f);
    }
    const resumenGrupos = Object.values(grupos).map((g) => ({
      clave: g.clave,
      etiqueta: (proyectoId || porNorma) ? g.clave : (g.filas[0]?.cliente || '—'),
      sub: (proyectoId || porNorma) ? null : (g.filas[0]?.proyecto?.nombre || ''),
      n: g.filas.length,
      teo: sum(g.filas, 'teo'), prog: sum(g.filas, 'prog'), ejec: sum(g.filas, 'ejec'),
      limite: g.filas[0]?.proyecto?.fecha_limite || null,
      sinProgramar: g.filas.filter((f) => f.estado === 'sin_programar').length,
    })).sort((a, b) => b.teo - a.teo);

    return {
      filas,
      teo: sum(filas, 'teo'), prog: sum(filas, 'prog'), ejec: sum(filas, 'ejec'),
      total: filas.length,
      sinProgramar: cuenta('sin_programar'),
      cortas: cuenta('corta'),
      pasadas: cuenta('pasada'),
      completadas: cuenta('completada'),
      grupos: resumenGrupos,
      nProyectos: proyectos.length,
    };
  }, [d, proyectoId, role, user?.id, porNorma]);

  if (!datos) return <p className="text-[12.5px] text-[#7FA7B4]">Cargando cuadro de tareas…</p>;

  if (!datos.total) {
    return (
      <div className="card">
        <h3 className="text-[15px] font-extrabold text-[#EAF4F7]">{titulo}</h3>
        <p className="mt-1.5 text-[13px] text-[#9FC0CB]">
          {proyectoId
            ? 'Este proyecto no tiene tareas todavía. Se vuelcan solas al elegir normas y modelo.'
            : 'No hay tareas en los proyectos que ves.'}
        </p>
      </div>
    );
  }

  const pProg = pct(datos.prog, datos.teo);
  const pEjec = pct(datos.ejec, datos.teo);

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[15px] font-extrabold text-[#EAF4F7]">
          {titulo} <span className="font-medium text-[#7FA7B4]">· {datos.total} tareas</span>
        </h3>
        {!proyectoId && (
          <button onClick={() => setPorNorma(!porNorma)}
            className="text-[11.5px] font-bold text-[#7FA7B4] hover:text-brand-orange">
            {porNorma ? 'ver por proyecto' : 'ver por norma'}
          </button>
        )}
      </div>

      {/* ── Las tres cifras ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          ['Teóricas', h1(datos.teo), 'del catálogo', 'text-[#EAF4F7]'],
          ['Programadas', h1(datos.prog), pProg != null ? `${pProg}% de lo comprometido` : '—', 'text-brand-orange'],
          ['Ejecutadas', h1(datos.ejec), pEjec != null ? `${pEjec}% de lo comprometido` : '—', 'text-emerald-300'],
        ].map(([etq, v, pie, tono]) => (
          <div key={etq} className="rounded-xl border border-[#1E5468] bg-[#0D3242] px-3 py-2">
            <p className={`text-lg font-extrabold leading-none ${tono}`}>{v}</p>
            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{etq}</p>
            <p className="mt-0.5 text-[10.5px] text-[#7FA7B4]">{pie}</p>
          </div>
        ))}
      </div>

      {/* Dos barras y no una: «cabe el trabajo» y «se está cumpliendo» son
          preguntas distintas y pueden ir en sentidos opuestos. */}
      {datos.teo > 0 && (
        <div className="space-y-1.5">
          <div>
            <div className="flex justify-between text-[10.5px] text-[#7FA7B4]">
              <span>Programado sobre lo comprometido</span><span>{pProg}%</span>
            </div>
            <div className="mt-0.5 h-2 w-full overflow-hidden rounded-full bg-[#0B2E3D]">
              <div className={`h-full rounded-full ${datos.prog > datos.teo ? 'bg-red-400' : 'bg-brand-orange'}`}
                style={{ width: `${Math.min(100, pProg)}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10.5px] text-[#7FA7B4]">
              <span>Ejecutado</span><span>{pEjec}%</span>
            </div>
            <div className="mt-0.5 h-2 w-full overflow-hidden rounded-full bg-[#0B2E3D]">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, pEjec)}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Estado de las tareas ── */}
      <div className="flex flex-wrap gap-1.5">
        {[
          [datos.sinProgramar, 'sin programar', 'bg-[#123F52] text-[#9FC0CB]'],
          [datos.cortas, 'faltan horas', 'bg-amber-400/15 text-amber-200'],
          [datos.pasadas, 'pasadas de horas', 'bg-red-500/15 text-red-300'],
          [datos.completadas, 'completadas', 'bg-emerald-500/15 text-emerald-300'],
        ].filter(([n]) => n > 0).map(([n, etq, cls]) => (
          <span key={etq} className={`chip !px-2 !py-0.5 text-[11px] font-bold ${cls}`}>{n} {etq}</span>
        ))}
      </div>

      {datos.sinProgramar > 0 && (
        <p className="text-[11.5px] font-bold text-amber-200">
          Quedan {h1(datos.teo - datos.prog)} sin llevar al calendario.
        </p>
      )}

      {/* ── Desglose ── */}
      {datos.grupos.length > 1 && (
        <ul className="divide-y divide-[#153F52]">
          {datos.grupos.map((g) => {
            const dias = diasHasta(g.limite);
            const p = pct(g.prog, g.teo);
            return (
              <li key={g.clave} className="py-2">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-[#EAF4F7]">
                    {g.etiqueta}
                    {g.sub && <span className="ml-1.5 font-normal text-[#7FA7B4]">{g.sub}</span>}
                  </span>
                  {dias != null && dias <= 60 && (
                    <span className={`chip !px-1.5 !py-0 text-[10px] font-extrabold ${
                      dias < 0 ? 'bg-red-500/20 text-red-200' : 'bg-amber-400/15 text-amber-200'}`}>
                      {dias < 0 ? `vencido ${-dias} d` : `${dias} d`}
                    </span>
                  )}
                  <span className="whitespace-nowrap text-[11.5px]">
                    <span className="font-bold text-brand-orange">{h1(g.prog)}</span>
                    <span className="text-[#7FA7B4]"> de {h1(g.teo)}</span>
                    {g.ejec > 0 && <span className="ml-1.5 font-bold text-emerald-300">{h1(g.ejec)} hechas</span>}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#0B2E3D]">
                    <div className={`h-full rounded-full ${g.prog > g.teo ? 'bg-red-400' : 'bg-brand-orange/60'}`}
                      style={{ width: `${Math.min(100, p || 0)}%` }} />
                  </div>
                  <span className="whitespace-nowrap text-[10px] text-[#7FA7B4]">
                    {g.n} tareas{g.sinProgramar ? ` · ${g.sinProgramar} sin programar` : ''}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
