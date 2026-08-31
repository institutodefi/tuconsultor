import { useAuth } from '../lib/auth.jsx';
import { ROL_LABEL } from '../lib/permisos.js';

export default function BarraVerComo() {
  const { realRole, viewAs, role, verComo, resetVista, puedeVerComo, vistasPermitidas } = useAuth();
  if (!puedeVerComo) return null;

  // El propio rol primero —para volver— y debajo los que puede previsualizar.
  // La lista sale de `auth`, que solo deja bajar de nivel: ofrecer aquí un
  // botón de «superadministrador» a Administración sería enseñar una puerta
  // que no abre.
  const VISTAS = [realRole, ...vistasPermitidas.slice().reverse()];

  const simulando = Boolean(viewAs);

  return (
    <div className={`w-full text-sm ${simulando ? 'bg-brand-orange text-[#EAF4F7]' : 'bg-navy-900 text-white'}`}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <span className="flex items-center gap-2 font-bold">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          {simulando ? `Viendo como: ${ROL_LABEL[viewAs]}` : `Tu vista · ${ROL_LABEL[realRole]}`}
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          {VISTAS.map((r) => {
            const activo = role === r;
            return (
              <button key={r} onClick={() => verComo(r)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition
                  ${activo
                    ? (simulando ? 'bg-navy-900 text-white' : 'bg-[#10394A] text-[#EAF4F7]')
                    : (simulando ? 'bg-white/30 hover:bg-white/50' : 'bg-white/10 hover:bg-white/20')}`}>
                {ROL_LABEL[r]}
              </button>
            );
          })}
        </div>

        {simulando && (
          <button onClick={resetVista}
            className="ml-auto rounded-lg bg-navy-900 px-3 py-1 text-xs font-bold text-white hover:bg-navy-800">
            ← Volver a mi vista
          </button>
        )}
      </div>
    </div>
  );
}
