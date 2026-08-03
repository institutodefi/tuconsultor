import { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import Dashboard from './consultores/Dashboard.jsx';
import Equipo from './consultores/Equipo.jsx';
import Empresas from './consultores/Empresas.jsx';
import Contactos from './consultores/Contactos.jsx';
import Ofertas from './consultores/Ofertas.jsx';
import ProyectosConfig from './consultores/ProyectosConfig.jsx';
import Agenda from './consultores/Agenda.jsx';
import MiAgenda from './consultores/MiAgenda.jsx';
import Sistemas from './consultores/Sistemas.jsx';
import ReglasComerciales from './consultores/ReglasComerciales.jsx';
import DashboardProyectos from './consultores/DashboardProyectos.jsx';
import Proveedores from './consultores/Proveedores.jsx';
import Versiones from './consultores/Versiones.jsx';
import RegistroAccesos from './consultores/RegistroAccesos.jsx';
import Accesibilidad from './consultores/Accesibilidad.jsx';
import GatePoliticas from './GatePoliticas.jsx';
import MisDatos from './consultores/MisDatos.jsx';
import Accesos from './consultores/Accesos.jsx';
import ProcesosInternos from './consultores/ProcesosInternos.jsx';
import GeneradorOfertas from '../pages/GeneradorOfertas.jsx';
import BarraVerComo from '../components/BarraVerComo.jsx';
import { useAuth } from '../lib/auth.jsx';
import { gruposParaRol, can } from '../lib/permisos.js';

// Iconos SVG inline (sin dependencias). 20×20, stroke currentColor.
const Icon = ({ name, className = 'h-5 w-5' }) => {
  const paths = {
    'calendar-check': <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" /></>,
    'layout-dashboard': <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>,
    'calendar-days': <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></>,
    'file-text': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></>,
    'shield-check': <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></>,
    'users': <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    'receipt': <><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
    'folder-kanban': <><path d="M4 20a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z" /><path d="M8 10v4M12 10v2M16 10v6" /></>,
    'user': <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>,
    'user-cog': <><circle cx="9" cy="7" r="4" /><path d="M2 21v-2a4 4 0 0 1 4-4h5" /><circle cx="18" cy="16" r="3" /><path d="M18 12v1M18 19v1M21.5 14l-.9.5M15.4 17.5l-.9.5M21.5 18l-.9-.5M15.4 14.5l-.9-.5" /></>,
    'key': <><circle cx="7.5" cy="15.5" r="4.5" /><path d="M10.7 12.3 21 2M16 7l3 3M18 5l3 3" /></>,
    'repeat': <><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></>,
    'building': <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" /></>,
    'contact': <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M15 8h3M15 12h3M7 16h10" /></>,
    'sliders-horizontal': <><path d="M3 6h18M3 12h18M3 18h18" /><circle cx="9" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="7" cy="18" r="2" /></>,
    'git-branch': <><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></>,
    'shield-alert': <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M12 8v4M12 16h.01" /></>,
    'accessibility': <><circle cx="12" cy="4.5" r="1.6" /><path d="M5 8.5l7 1.5 7-1.5M12 10v4M12 14l-2.5 6M12 14l2.5 6" /></>,
  };
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || null}
    </svg>
  );
};

function Guard({ ok, children }) {
  return ok ? children : <Navigate to="." replace />;
}

// ⚠ FUERA del componente: definirlo dentro hace que React lo trate como un
// tipo nuevo en cada renderizado y remonte todo el menú, perdiendo el foco y
// el estado de lo que haya dentro.
function NavItems({ onNavigate, grupos }) {
  return (
    <nav className="flex flex-col gap-5">
      {grupos.map((g, gi) => (
        <div key={gi}>
          {g.label && (
            <p className="px-3 mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#7FA7B4]">{g.label}</p>
          )}
          <div className="flex flex-col gap-0.5">
            {g.items.map((t) => (
              <div key={t.to}>
              <NavLink
                to={t.to}
                end={t.to === ''}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                    isActive
                      ? 'bg-brand-orange/15 text-[#EAF4F7] ring-1 ring-brand-orange/40'
                      : 'text-[#9FC0CB] hover:bg-[#0D3242] hover:text-[#EAF4F7]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name={t.icon} className={`h-5 w-5 shrink-0 ${isActive ? 'text-[#F9A83A]' : 'text-[#7FA7B4] group-hover:text-[#9FC0CB]'}`} />
                    <span className="truncate">{t.label}</span>
                  </>
                )}
              </NavLink>
                {/* Subentradas: se muestran cuando la sección está activa,
                    para no convertir la barra en una lista de veinte enlaces. */}
                {t.hijos && t.hijos.length > 0 && (
                  <div className="ml-8 mt-0.5 flex flex-col gap-0.5 border-l border-[#1E5468] pl-3">
                    {t.hijos.map((h) => (
                      <NavLink key={h.to} to={h.to} end onClick={onNavigate}
                        className={({ isActive }) =>
                          `truncate rounded-lg px-2 py-1.5 text-[12.5px] font-semibold transition ${
                            isActive ? 'text-[#F9A83A]' : 'text-[#7FA7B4] hover:text-[#EAF4F7]'}`}>
                        {h.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function ConsultorPortal() {
  const { role, politicasOk } = useAuth();
  const grupos = gruposParaRol(role);
  const verEquipo = can.gestionarEquipo(role);
  const verPlanAgendaSist = ['superadmin', 'admin', 'director', 'consultor'].includes(role);
  const verClientes = ['superadmin', 'admin', 'director', 'gestion'].includes(role);
  // CRM (Empresas · Contactos): el consultor también entra, así ve con quién habla.
  const verCrm = ['superadmin', 'admin', 'director', 'gestion', 'consultor'].includes(role);
  const [movilAbierto, setMovilAbierto] = useState(false);


  return (
    <>
      {!politicasOk && <GatePoliticas />}
      <BarraVerComo />
      <div className="mx-auto max-w-[1400px] px-3 sm:px-5 py-4 sm:py-8">
        {/* Barra superior móvil */}
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <div>
            <p className="eyebrow">Operaciones Consultify</p>
            <h1 className="mt-1 text-xl font-extrabold tracking-tight">Orbita.PMTools</h1>
          </div>
          <button onClick={() => setMovilAbierto(v => !v)} className="rounded-xl border border-[#1E5468] bg-[#10394A] p-2.5 text-[#B9D2DA]" aria-label="Menú">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
        {movilAbierto && (
          <div className="mb-4 rounded-2xl border border-[#1E5468] bg-[#10394A] p-3 lg:hidden">
            <NavItems grupos={grupos} onNavigate={() => setMovilAbierto(false)} />
          </div>
        )}

        <div className="flex gap-6">
          {/* Sidebar fija (desktop) */}
          <aside className="hidden lg:block w-60 shrink-0">
            <div className="sticky top-24">
              <p className="eyebrow px-3">Operaciones</p>
              <h1 className="mt-1 mb-6 px-3 text-2xl font-extrabold tracking-tight">Orbita.PMTools</h1>
              <NavItems grupos={grupos} />
            </div>
          </aside>

          {/* Contenido */}
          <main className="min-w-0 flex-1">
            <Routes>
              {/* Al entrar se aterriza en Mi agenda: lo primero es saber qué
                  toca hoy. Quien no tenga acceso a agenda (gestión, cliente)
                  sigue cayendo en el panel. */}
              <Route index element={verPlanAgendaSist ? <Navigate to="mi-agenda" replace /> : <Dashboard />} />
              <Route path="panel" element={<Dashboard />} />
              <Route path="proyectos" element={<Guard ok={verClientes}><ProyectosConfig /></Guard>} />
              <Route path="agenda" element={<Guard ok={verPlanAgendaSist}><Agenda /></Guard>} />
              <Route path="mi-agenda" element={<Guard ok={verPlanAgendaSist}><MiAgenda /></Guard>} />
              <Route path="planificador" element={<Guard ok={verPlanAgendaSist}><GeneradorOfertas /></Guard>} />
              <Route path="equipo" element={<Guard ok={verEquipo}><Equipo /></Guard>} />
              <Route path="accesos" element={<Guard ok={role === 'superadmin'}><Accesos /></Guard>} />
              <Route path="procesos-internos" element={<Guard ok={['superadmin','admin','director','consultor'].includes(role)}><ProcesosInternos /></Guard>} />
              <Route path="mis-datos" element={<MisDatos />} />
              <Route path="sistemas" element={<Guard ok={verEquipo}><Sistemas /></Guard>} />
              <Route path="reglas" element={<Guard ok={['superadmin','admin','director'].includes(role)}><ReglasComerciales /></Guard>} />
              <Route path="versiones" element={<Guard ok={['superadmin','admin','director'].includes(role)}><Versiones /></Guard>} />
              <Route path="registro" element={<Guard ok={role === 'superadmin'}><RegistroAccesos /></Guard>} />
              <Route path="accesibilidad" element={<Guard ok={['superadmin','admin','director'].includes(role)}><Accesibilidad /></Guard>} />
              {/* Fusionadas en «Empresas» (v56): se mantienen como redirección
                  para que no se rompan enlaces ni marcadores antiguos. */}
              {/* Clientes: la cartera es la pestaña de Empresas filtrada, y el
                  panel doble es el Dashboard con el foco puesto en clientes. */}
              <Route path="clientes" element={<Navigate to="../empresas?filtro=cliente" replace />} />
              <Route path="clientes/dashboard" element={<Guard ok={verClientes}><Dashboard soloClientes /></Guard>} />
              <Route path="proveedores" element={<Guard ok={verCrm}><Proveedores /></Guard>} />
              <Route path="proyectos/dashboard" element={<Guard ok={verPlanAgendaSist}><DashboardProyectos /></Guard>} />
              <Route path="proyectos/planificador" element={<Guard ok={verPlanAgendaSist}><Agenda /></Guard>} />
              <Route path="leads" element={<Navigate to="../empresas?filtro=potencial" replace />} />
              <Route path="empresas" element={<Guard ok={verCrm}><Empresas /></Guard>} />
              <Route path="contactos" element={<Guard ok={verCrm}><Contactos /></Guard>} />
              <Route path="ofertas" element={<Guard ok={verClientes}><Ofertas /></Guard>} />
              <Route path="*" element={<Navigate to="." replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </>
  );
}
