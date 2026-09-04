import { useCallback, useEffect, useMemo, useState } from 'react';
import { listTable } from '../../lib/data.js';
import { useAuth } from '../../lib/auth.jsx';
import { ACCION_LABEL, ACCION_TONO } from '../../lib/registro.js';
import { can } from '../../lib/permisos.js';

// ════════════════════════════════════════════════════════════════════════════
// CONTROL DE ACCESOS · Superadministración y Administración
// Quién entra, cuándo y qué toca. La política de la base de datos ya impide que
// nadie más lo lea, y nadie —tampoco aquí— puede editarlo ni borrarlo: un
// registro que se puede alterar no prueba nada.
// ════════════════════════════════════════════════════════════════════════════

const RANGOS = [
  { k: 1, label: 'Hoy' }, { k: 7, label: '7 días' },
  { k: 30, label: '30 días' }, { k: 90, label: '90 días' }, { k: 0, label: 'Todo' },
];

export default function RegistroAccesos() {
  const { role } = useAuth();
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [dias, setDias] = useState(7);
  const [accion, setAccion] = useState('todas');
  const [busca, setBusca] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await listTable('registro_accesos').catch(() => []);
      (r || []).sort((a, b) => String(b.creado).localeCompare(String(a.creado)));
      setFilas(r || []);
    } finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(() => {
    const corte = dias ? Date.now() - dias * 864e5 : 0;
    const q = busca.trim().toLowerCase();
    return filas.filter((f) => {
      if (corte && new Date(f.creado).getTime() < corte) return false;
      if (accion !== 'todas' && f.accion !== accion) return false;
      if (q && !`${f.email || ''} ${f.entidad || ''} ${f.detalle || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [filas, dias, accion, busca]);

  const resumen = useMemo(() => {
    const personas = new Set(visibles.map((f) => f.email).filter(Boolean));
    const fallidas = visibles.filter((f) => f.accion === 'entrada_fallida').length;
    const entradas = visibles.filter((f) => f.accion === 'entrada').length;
    return { personas: personas.size, fallidas, entradas, total: visibles.length };
  }, [visibles]);

  function exportarCsv() {
    const cab = ['fecha', 'email', 'accion', 'entidad', 'entidad_id', 'detalle', 'agente'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cab.join(';')].concat(
      visibles.map((f) => [f.creado, f.email, f.accion, f.entidad, f.entidad_id, f.detalle, f.agente].map(esc).join(';')),
    ).join('\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `registro-accesos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  if (!can.verRegistroAccesos(role)) {
    return <div className="card text-sm font-medium text-[#9FC0CB]">Esta sección es solo para Administración y Superadministración.</div>;
  }

  const fmt = (t) => new Date(t).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Organización</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#EAF4F7]">Control de accesos</h1>
          <p className="mt-1 max-w-2xl text-sm font-medium text-[#9FC0CB]">
            Quién entra, cuándo y qué toca. Solo lo ven Administración y Superadministración, y no se puede editar
            ni borrar desde aquí: un registro alterable no prueba nada.
          </p>
        </div>
        <button onClick={exportarCsv} disabled={!visibles.length} className="btn-ghost !px-3 !py-2 text-xs disabled:opacity-40">
          ⇩ Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[['Líneas', resumen.total], ['Personas', resumen.personas], ['Entradas', resumen.entradas], ['Entradas fallidas', resumen.fallidas]].map(([k, v]) => (
          <div key={k} className={`rounded-xl p-3 ${k === 'Entradas fallidas' && v > 0 ? 'bg-red-500/12' : 'bg-[#0D3242]'}`}>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{k}</p>
            <p className={`mt-0.5 text-xl font-extrabold ${k === 'Entradas fallidas' && v > 0 ? 'text-red-300' : 'text-[#EAF4F7]'}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {RANGOS.map((r) => (
          <button key={r.k} onClick={() => setDias(r.k)}
            className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${
              dias === r.k ? 'border-brand-orange bg-brand-orange/15 text-brand-orange' : 'border-[#1E5468] text-[#9FC0CB] hover:border-brand-orange/60'}`}>
            {r.label}
          </button>
        ))}
        <select className="input !w-auto !py-1 !px-2 !text-[12px]" value={accion} onChange={(e) => setAccion(e.target.value)} aria-label="Filtrar por acción">
          <option value="todas">Todas las acciones</option>
          {Object.entries(ACCION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className="input !w-auto !py-1 !px-2 !text-[12px]" placeholder="Buscar correo, entidad…"
          value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar en el registro" />
      </div>

      {cargando ? <p className="py-8 text-center text-[#7FA7B4]">Cargando…</p> : visibles.length === 0 ? (
        <div className="card text-center text-sm font-medium text-[#9FC0CB]">
          No hay líneas en este rango.
          <span className="mt-2 block text-xs text-[#7FA7B4]">Si la tabla no existe todavía, ejecuta la migración v60 en Supabase.</span>
        </div>
      ) : (
        <div className="card !p-0 overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-b border-[#1E5468] text-[10px] uppercase tracking-wide text-[#7FA7B4]">
              <tr>
                <th className="px-3 py-2">Cuándo</th><th className="px-3 py-2">Quién</th>
                <th className="px-3 py-2">Acción</th><th className="px-3 py-2">Sobre</th>
                <th className="px-3 py-2">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {visibles.slice(0, 400).map((f) => (
                <tr key={f.id} className="border-b border-[#153F52] last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 text-[#9FC0CB]">{fmt(f.creado)}</td>
                  <td className="px-3 py-2 text-[#EAF4F7]">{f.email || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`chip !px-2 !py-0 text-[10px] ${ACCION_TONO[f.accion] || 'bg-white/8 text-[#9FC0CB]'}`}>
                      {ACCION_LABEL[f.accion] || f.accion}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[#9FC0CB]">{f.entidad || '—'}</td>
                  <td className="px-3 py-2 text-[#7FA7B4]">{f.detalle || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibles.length > 400 && (
            <p className="px-3 py-2 text-[11px] text-[#7FA7B4]">
              Se muestran las 400 líneas más recientes de {visibles.length}. Exporta a CSV para verlas todas.
            </p>
          )}
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-[#7FA7B4]">
        No se guarda la dirección IP: el navegador no la conoce y pedirla a un servicio externo supondría
        ceder datos a un tercero. Se registra el navegador, que basta para distinguir dispositivos.
        La retención recomendada es de doce meses; la limpieza se hace con la función
        <code className="mx-1 text-[#9FC0CB]">limpiar_registro_accesos()</code> de la migración v60.
      </p>
    </div>
  );
}
