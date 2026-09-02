import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTable } from '../../lib/data.js';
import { NORMA_BY_ID } from '../../lib/calcEngine.js';
import { ROL_LABEL } from '../../lib/permisos.js';
import FichaEmpleado from './FichaEmpleado.jsx';

// El equipo se deriva de los ACCESOS (perfiles con login). Esta pestaña es de
// solo lectura: para dar de alta, cambiar rol/nivel o quitar a alguien, se usa
// el panel de Accesos (invitación). Así equipo y accesos son siempre lo mismo.
export default function Equipo() {
  // Ficha en emergente: los datos de una persona y su documentación laboral
  // no caben en una fila de tabla, y las nóminas necesitan su propio sitio.
  const [ficha, setFicha] = useState(null);

  const navigate = useNavigate();
  const [rows, setRows] = useState(null);

  // Se lee de `perfiles`, no de `consultores`.
  //
  // `consultores` es la tabla antigua y muchas de sus filas no tienen correo:
  // por eso faltaban en la lista. `perfiles` es la que tiene la cuenta, el rol
  // real y el correo, y es de donde depende lo que cada persona ve al entrar.
  // Se completa con el nivel y las normas de `consultores` cuando existan.
  const cargar = () => Promise.all([
    listTable('perfiles').catch(() => []),
    listTable('consultores').catch(() => []),
  ]).then(([ps, cs]) => {
    const porId = new Map((cs || []).map((c) => [String(c.user_id), c]));
    setRows((ps || [])
      .filter((p) => ['superadmin', 'admin', 'director', 'consultor', 'gestion'].includes(p.rol))
      .map((p) => {
        const c = porId.get(String(p.id)) || {};
        return {
          ...p,
          nivel: p.nivel || c.nivel || null,
          normas: (p.normas?.length ? p.normas : c.normas) || [],
          capacidad_clientes: p.capacidad_clientes || c.capacidad_clientes || null,
        };
      })
      .sort((a, b) => String(a.nombre || a.email || '').localeCompare(String(b.nombre || b.email || ''))));
  });

  useEffect(() => { cargar(); }, []);

  if (!rows) return <p className="font-semibold text-[#9FC0CB]">Cargando…</p>;
  const nombreCompleto = (c) => [c.nombre, c.apellidos].filter(Boolean).join(' ');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Organización</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Equipo</h1>
          <p className="mt-1 text-sm font-medium text-[#9FC0CB]">El equipo se deriva de los miembros con acceso. Para dar de alta o modificar, usa Accesos.</p>
        </div>
        <button onClick={() => navigate('/consultores/accesos')} className="btn-primary !px-4 !py-2 text-sm">Gestionar en Accesos →</button>
      </div>

      <div className="rounded-xl bg-brand-orange/10 p-3 text-xs font-semibold text-[#F9A83A]">
        Un miembro del equipo existe solo si tiene acceso. Las altas, bajas, roles y niveles se gestionan al invitar desde Accesos.
      </div>

      {rows.length === 0 ? (
        <div className="card"><p className="text-sm font-medium text-[#9FC0CB]">Aún no hay miembros de equipo con acceso. Invita al primero desde Accesos.</p></div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E5468] bg-navy-50/50 text-left text-xs font-bold uppercase tracking-wide text-[#9FC0CB]">
                <th className="px-5 py-3">Miembro</th>
                <th className="px-3 py-3">Rol</th>
                <th className="px-3 py-3">Nivel</th>
                <th className="px-3 py-3">Normas</th>
                <th className="px-3 py-3 text-right">Capacidad</th>
                <th className="px-3 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.id} onClick={() => setFicha(c)}
                  className="cursor-pointer border-b border-navy-50 last:border-0 transition hover:bg-[#10394A]">
                  <td className="px-5 py-3">
                    <div className="font-bold text-[#EAF4F7]">{nombreCompleto(c) || '—'}</div>
                    {/* El correo faltaba en quienes se invitaron y no completaron
                        ficha: `perfiles.email` quedaba vacío aunque en la cuenta
                        sí estuviera. La migración v109 lo rellena; hasta
                        entonces, se dice en vez de dejar el hueco en blanco. */}
                    <div className="text-xs text-[#9FC0CB]">
                      {c.email || <span className="text-amber-200/70">sin correo en la ficha</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[#B9D2DA]">{ROL_LABEL[c.rol] || c.rol || '—'}</td>
                  <td className="px-3 py-3">{c.nivel ? <span className="rounded-full bg-[#123F52] px-2 py-0.5 text-xs font-bold text-[#B9D2DA]">{c.nivel}</span> : '—'}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(c.normas || []).length ? c.normas.map(n => <span key={n} className="rounded bg-[#0D3242] px-1.5 py-0.5 text-[10px] font-bold text-[#9FC0CB]">{NORMA_BY_ID[n]?.id || n}</span>) : <span className="text-[#7FA7B4]">—</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-[#B9D2DA]">{c.capacidad_clientes ?? '—'}</td>
                  <td className="px-3 py-3">{c.activo ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">Activo</span> : <span className="rounded-full bg-[#123F52] px-2 py-0.5 text-xs font-bold text-[#9FC0CB]">Inactivo</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {ficha && (
        <FichaEmpleado persona={ficha} onCerrar={() => setFicha(null)} onCambio={cargar} />
      )}
    </div>
  );
}
