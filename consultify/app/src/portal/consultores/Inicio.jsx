import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listTable } from '../../lib/data.js';
import { useAuth } from '../../lib/auth.jsx';
import { can } from '../../lib/permisos.js';
import MisProyectos from '../../components/MisProyectos.jsx';
import CuadroTareas from '../../components/CuadroTareas.jsx';
import AuditoriasExternas from '../../components/AuditoriasExternas.jsx';
import { getTareasInternas } from '../../lib/agenda.js';
import ResumenDelDia from '../../components/ResumenDelDia.jsx';

// ════════════════════════════════════════════════════════════════════════════
// INICIO · lo primero que ve cualquiera al entrar
//
// Antes, cada rol aterrizaba en una pantalla distinta —agenda, panel de
// gestión— y encontrar lo propio dependía de saber en qué menú buscarlo. Los
// consultores no veían sus proyectos porque el bloque estaba en una pantalla a
// la que no llegaban.
//
// Aquí va lo que cada persona necesita ver primero: qué tiene hoy, qué lleva y
// los accesos a lo que usa de verdad. Nada de cifras de gestión para quien no
// las gestiona.
// ════════════════════════════════════════════════════════════════════════════

const saludo = () => {
  const h = new Date().getHours();
  return h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
};

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Los accesos de cada rol, en el orden en que se usan. */
function accesosDe(role) {
  const todos = [
    { to: 'mi-agenda', etq: 'Mi agenda', nota: 'Lo que tengo hoy', icono: '📅',
      roles: ['superadmin', 'admin', 'director', 'consultor', 'gestion'] },
    { to: 'proyectos', etq: 'Proyectos', nota: 'Cartera y planificación', icono: '📁',
      roles: ['superadmin', 'admin', 'director', 'consultor', 'gestion'] },
    { to: 'agenda', etq: 'Agenda del equipo', nota: 'Mis proyectos, por semana', icono: '🗓️',
      roles: ['superadmin', 'admin', 'director', 'consultor'] },
    { to: 'control-horas', etq: 'Control de horas', nota: 'Capacidad y horas por consultor', icono: '⏱️',
      roles: ['superadmin', 'admin', 'director', 'consultor'] },
    { to: 'empresas', etq: 'Empresas', nota: 'Clientes y proveedores', icono: '🏢',
      roles: ['superadmin', 'admin', 'director', 'consultor', 'gestion'] },
    { to: 'contactos', etq: 'Contactos', nota: 'Personas del CRM', icono: '👤',
      roles: ['superadmin', 'admin', 'director', 'consultor', 'gestion'] },
    { to: 'ofertas', etq: 'Ofertas', nota: 'Histórico y seguimiento', icono: '📄',
      roles: ['superadmin', 'admin', 'director', 'consultor'] },
    { to: 'planificador', etq: 'Generador de ofertas', nota: 'Calcular y emitir', icono: '🧮',
      roles: ['superadmin', 'admin', 'director', 'consultor'] },
    { to: 'sistemas', etq: 'Sistemas de gestión', nota: 'Catálogo de tareas', icono: '📚',
      roles: ['superadmin', 'admin', 'director', 'consultor', 'gestion'] },
    { to: 'equipo', etq: 'Equipo', nota: 'Personas y documentación', icono: '👥',
      roles: ['superadmin', 'admin', 'director', 'consultor', 'gestion'] },
    { to: 'dashboard', etq: 'Panel de gestión', nota: 'Cifras del negocio', icono: '📊',
      roles: ['superadmin', 'admin'] },
    { to: 'accesos', etq: 'Accesos', nota: 'Quién entra y con qué rol', icono: '🔑',
      roles: ['superadmin', 'admin'] },
  ];
  return todos.filter((a) => a.roles.includes(role));
}

export default function Inicio() {
  const { user, role } = useAuth();
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      listTable('perfiles').catch(() => []),
      listTable('tarea_sesiones').catch(() => []),
      listTable('cliente_tareas').catch(() => []),
      getTareasInternas().catch(() => []),
    ]).then(([ps, ss, ts, ti]) => vivo && setDatos({ ps, ss, ts, ti }))
      .catch(() => vivo && setDatos({ ps: [], ss: [], ts: [], ti: [] }));
    return () => { vivo = false; };
  }, []);

  const yo = datos?.ps.find((p) => String(p.id) === String(user?.id));
  const nombre = (yo?.nombre || '').split(' ')[0] || '';

  // Lo de hoy y lo de esta semana, de sus propias sesiones.
  const jornada = useMemo(() => {
    if (!datos) return null;
    const hoy = hoyISO();
    const en7 = new Date(); en7.setDate(en7.getDate() + 7);
    const limite = `${en7.getFullYear()}-${String(en7.getMonth() + 1).padStart(2, '0')}-${String(en7.getDate()).padStart(2, '0')}`;

    const mias = datos.ss.filter((s) => String(s.consultor_id) === String(user?.id) && s.estado !== 'anulada');
    const deHoy = mias.filter((s) => String(s.fecha).slice(0, 10) === hoy);
    const semana = mias.filter((s) => {
      const f = String(s.fecha).slice(0, 10);
      return f > hoy && f <= limite;
    });
    const atrasadas = mias.filter((s) => String(s.fecha).slice(0, 10) < hoy && s.estado !== 'hecha');

    const horas = (l) => Math.round(l.reduce((a, s) => a + (Number(s.horas) || 0), 0) * 10) / 10;
    return {
      hoy: deHoy, semana, atrasadas,
      horasHoy: horas(deHoy), horasSemana: horas(semana),
    };
  }, [datos, user?.id]);

  const tituloDe = (s) => datos?.ts.find((t) => String(t.id) === String(s.cliente_tarea_id))?.titulo
    || datos?.ti.find((t) => String(t.id) === String(s.tarea_interna_id))?.titulo || 'Tarea';
  const accesos = accesosDe(role);

  return (
    <div className="space-y-6">
      {/* ── Accesos directos, arriba y pequeños ──
          Son el menú de trabajo de cada rol: una fila de chips, no una
          parrilla de tarjetas que empujaba lo importante fuera de la vista. */}
      <div className="flex flex-wrap gap-1.5">
        {accesos.map((a) => (
          <Link key={a.to} to={a.to} title={a.nota}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1E5468] bg-[#0D3242] px-2.5 py-1 text-[12px] font-bold text-[#CFE3E9] transition hover:border-brand-orange/60 hover:text-brand-orange">
            <span aria-hidden="true" className="text-[13px]">{a.icono}</span>{a.etq}
          </Link>
        ))}
      </div>

      <div>
        <p className="eyebrow">Inicio</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {saludo()}{nombre ? `, ${nombre}` : ''}
        </h1>
      </div>

      {/* ── Lo que hay que hacer, contado por la IA (una vez al día) ── */}
      <ResumenDelDia user={user} nombre={nombre} />

      {/* ── Lo de hoy ── */}
      {jornada && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card !p-4">
            <p className="text-2xl font-extrabold leading-none text-[#EAF4F7]">{jornada.hoy.length}</p>
            <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Hoy</p>
            <p className="mt-0.5 text-[12px] text-[#9FC0CB]">{jornada.horasHoy} h programadas</p>
          </div>
          <div className="card !p-4">
            <p className="text-2xl font-extrabold leading-none text-brand-orange">{jornada.semana.length}</p>
            <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Próximos 7 días</p>
            <p className="mt-0.5 text-[12px] text-[#9FC0CB]">{jornada.horasSemana} h</p>
          </div>
          <div className="card !p-4">
            <p className={`text-2xl font-extrabold leading-none ${jornada.atrasadas.length ? 'text-red-300' : 'text-emerald-300'}`}>
              {jornada.atrasadas.length}
            </p>
            <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Sin cerrar</p>
            <p className="mt-0.5 text-[12px] text-[#9FC0CB]">
              {jornada.atrasadas.length ? 'Ya pasaron de fecha' : 'Todo al día'}
            </p>
          </div>
        </div>
      )}

      {/* Lo de hoy, con nombre y hora: un número no dice qué hay que hacer. */}
      {jornada?.hoy.length > 0 && (
        <div className="card">
          <h3 className="text-[14px] font-extrabold text-[#EAF4F7]">Hoy</h3>
          <ul className="mt-2 divide-y divide-[#153F52]">
            {jornada.hoy
              .sort((a, b) => String(a.hora_inicio).localeCompare(String(b.hora_inicio)))
              .map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2">
                  <span className="whitespace-nowrap text-[12.5px] font-bold text-brand-orange">
                    {String(s.hora_inicio).slice(0, 5)}–{String(s.hora_fin).slice(0, 5)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-[#EAF4F7]">{tituloDe(s)}</span>
                  {s.estado === 'hecha' && <span className="text-[11px] font-bold text-emerald-300">hecha</span>}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* ── Mis proyectos ──
          Aquí y no en una pantalla interior: es lo primero que alguien necesita
          saber al entrar, y esconderlo en un menú es como no tenerlo. */}
      <MisProyectos />

      {/* Auditorías externas que se acercan o siguen sin fecha: todo el
          equipo tiene que verlo, no solo administración. */}
      {can.esEquipo(role) && <AuditoriasExternas compacto soloAvisos />}

      {/* Cómo van las horas en conjunto. Debajo de los proyectos: primero qué
          llevo, luego si voy bien de tiempo. */}
      <CuadroTareas titulo="Cuadro de tareas" />

    </div>
  );
}
