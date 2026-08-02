import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { ROL_LABEL, can } from '../lib/permisos.js';

export default function Shell({ children }) {
  const { user, role, realRole, logout, demo, verEconomico , verComo, resetVista } = useAuth();
  const [verRoles, setVerRoles] = useState(false);
  const navItem = ({ isActive }) =>
    (isActive
      ? 'rounded-xl px-4 py-2.5 bg-brand-verde/15 text-brand-verdeTexto font-bold'
      : 'rounded-xl px-4 py-2.5 text-[#9FC0CB] transition hover:bg-white/5 hover:text-[#EAF4F7]');

  const esEquipo = can.esEquipo(role);
  const esCliente = role === 'cliente';

  return (
    <div className="min-h-screen md:flex">
      {/* ── Barra lateral Orbita (manual A5: 248px, #061F2B, logo vertical) ── */}
      <aside className="hidden md:flex md:flex-col fixed inset-y-0 left-0 z-40 w-[248px] bg-[#061F2B] border-r border-white/10">
        <a href="/app/" className="flex justify-center pt-8 pb-6">
          <img src="/app/marca/orbita-vertical-anim.svg" alt="Orbita.PMTools" className="tc-logo-animado w-40 h-auto" />
        </a>
        <nav className="flex flex-col gap-1 px-4 text-sm font-semibold">
          <a href="/" className="rounded-xl px-4 py-2.5 text-[#9FC0CB] transition hover:bg-white/5 hover:text-[#EAF4F7]">Web</a>
          {(!user || verEconomico) && <NavLink to="/calculadora" className={navItem}>Calcula tu oferta</NavLink>}
          {user && esCliente && <NavLink to="/clientes" className={navItem}>Zona clientes</NavLink>}
          {user && esEquipo && <NavLink to="/consultores" className={navItem}>Orbita.PMTools</NavLink>}
        </nav>
        <div className="mt-auto px-4 pb-6">
          {demo && <span className="chip mb-3 w-full justify-center bg-brand-verde/15 text-brand-verdeTexto">Modo demo</span>}
          {user ? (
            <div className="rounded-2xl bg-[#10394A] p-3 text-center">
              <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand-verde text-sm font-extrabold text-[#061F2B]">
                {(user.email || '?').charAt(0).toUpperCase()}
              </span>
              <p className="truncate text-xs font-bold text-[#EAF4F7]">{user.email}</p>
              {/* Al pulsar el rol se despliegan los demás: superadministración
                  necesita moverse entre niveles para ver lo que ve cada quien,
                  y también desde la zona de clientes. Quien no es superadmin ve
                  su rol como una etiqueta y no pasa nada más. */}
              {realRole === 'superadmin' ? (
                <>
                  <button onClick={() => setVerRoles((v) => !v)}
                    className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#061F2B] px-2 py-0.5 text-[11px] font-bold text-[#B9D2DA] transition hover:text-[#EAF4F7]"
                    aria-expanded={verRoles} aria-label="Cambiar el nivel desde el que se ve la aplicación">
                    {ROL_LABEL[role] || role}
                    {role !== 'superadmin' && <span className="text-brand-verdeTexto">· viendo como</span>}
                    <span className="opacity-70">{verRoles ? '▲' : '▼'}</span>
                  </button>
                  {verRoles && (
                    <div className="mt-2 space-y-1 rounded-xl bg-[#061F2B] p-2">
                      <p className="px-1 pb-1 text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Ver como</p>
                      {['superadmin', 'admin', 'director', 'consultor', 'gestion', 'cliente'].map((r) => (
                        <button key={r}
                          onClick={() => { r === 'superadmin' ? resetVista() : verComo(r); setVerRoles(false); }}
                          className={`block w-full truncate rounded-lg px-2 py-1.5 text-left text-[11.5px] font-bold transition ${
                            role === r ? 'bg-brand-orange/20 text-brand-orange' : 'text-[#9FC0CB] hover:bg-white/5 hover:text-[#EAF4F7]'}`}>
                          {role === r ? '✓ ' : ''}{ROL_LABEL[r] || r}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#061F2B] px-2 py-0.5 text-[11px] font-bold text-[#B9D2DA]">
                  {ROL_LABEL[role] || role}
                </span>
              )}
              <button onClick={logout} className="btn-ghost mt-3 w-full !py-2">Salir</button>
            </div>
          ) : (
            <Link to="/acceso" className="btn-primary w-full">Acceder</Link>
          )}
        </div>
      </aside>

      {/* ── Cabecera móvil ── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#061F2B]/95 backdrop-blur md:hidden">
        <div className="flex h-[60px] items-center justify-between px-4">
          <a href="/app/" className="flex items-center">
            <img src="/app/marca/orbita-horizontal.svg" alt="Orbita.PMTools" className="tc-logo-animado h-9 w-auto" />
          </a>
          <div className="flex items-center gap-2">
            {user && esCliente && <NavLink to="/clientes" className="text-xs font-bold text-[#EAF4F7]">Zona clientes</NavLink>}
            {user && esEquipo && <NavLink to="/consultores" className="text-xs font-bold text-[#EAF4F7]">Orbita.PMTools</NavLink>}
            {user
              ? <button onClick={logout} className="btn-ghost !px-3 !py-1.5 text-xs">Salir</button>
              : <Link to="/acceso" className="btn-primary !px-3 !py-1.5 text-xs">Acceder</Link>}
          </div>
        </div>
      </header>

      <div className="flex min-h-screen flex-1 flex-col md:ml-[248px]">
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/10 bg-[#061F2B] py-8 text-center text-xs text-[#9FC0CB]">
        <img src="/app/marca/orbita-horizontal.svg" alt="Orbita.PMTools" className="mx-auto mb-3 h-8 w-auto opacity-90" />
        <p>Consultify · Instituto de Excelencia Europea S.L. · CIF B87093076 · Madrid</p>
        <p className="mt-1">Precios sin IVA salvo indicación · <a href="/" className="transition hover:text-brand-orange">consultify.tuconsultor.com</a></p>
        <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px]">
          <a href="/legal/aviso-legal.html" className="transition hover:text-brand-orange">Aviso legal</a>
          <a href="/legal/privacidad.html" className="transition hover:text-brand-orange">Privacidad</a>
          <a href="/legal/cookies.html" className="transition hover:text-brand-orange">Cookies</a>
          <a href="#" className="abrir-cookies transition hover:text-brand-orange">Configurar cookies</a>
        </p>
        <p className="mt-3 text-[11px] font-semibold italic text-brand-orange/90">Hecho con amor en Madrid por TuConsultor · Desde 2006 gestionando con el corazón</p>
      </footer>
      <a href="/app/acceso" aria-label="Orbita.PMTools" title="Orbita.PMTools"
         className="tc-logo-animado fixed bottom-5 right-5 z-10 hidden md:block opacity-80 transition hover:opacity-100"
         style={{ width: 72, height: 72 }}>
        <img src="/app/marca/orbita-isotipo-anim.svg" alt="" style={{ width: '100%', height: '100%' }} />
      </a>
      </div>
    </div>
  );
}
