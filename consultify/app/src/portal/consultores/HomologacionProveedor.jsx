import { useEffect, useState, useCallback } from 'react';
import { listTable, insertRow, updateRow, deleteRow } from '../../lib/data.js';
import { ESTADOS_HOMOLOGACION } from '../../lib/crm.js';

// ════════════════════════════════════════════════════════════════════════════
// Condiciones de homologación de un PROVEEDOR.
// Se añaden UNA A UNA (fila de alta siempre visible al final).
// ════════════════════════════════════════════════════════════════════════════

const TONO = {
  ambar: 'bg-brand-orange/15 text-brand-orange',
  azul:  'bg-brand-verde/15 text-brand-verdeTexto',
  verde: 'bg-emerald-500/15 text-emerald-300',
  rojo:  'bg-red-500/15 text-red-300',
  gris:  'bg-white/5 text-[#7FA7B4]',
};
const tonoDe = (k) => TONO[ESTADOS_HOMOLOGACION.find((e) => e.k === k)?.tono] || TONO.gris;

// Plantillas de arranque: un clic añade la condición típica en lugar de teclearla.
const SUGERENCIAS = [
  'Certificado ISO 9001 en vigor',
  'Certificado ISO 14001 en vigor',
  'Certificado ISO 45001 en vigor',
  'Póliza de responsabilidad civil',
  'Certificado de estar al corriente con la AEAT',
  'Certificado de estar al corriente con la Seguridad Social',
  'Justificante de alta en el RETA / TC2',
  'Acuerdo de confidencialidad firmado (NDA)',
  'Acuerdo de encargado del tratamiento (RGPD)',
  'Evaluación de riesgos laborales (coordinación de actividades)',
];

const VACIA = { concepto: '', requisito: '', estado: 'pendiente', obligatorio: true, fecha_validez: '', notas: '' };

export default function HomologacionProveedor({ empresa, puedeEditar, onCambio }) {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nueva, setNueva] = useState({ ...VACIA });
  const [editando, setEditando] = useState(null);
  const [error, setError] = useState(null);
  const [verSugerencias, setVerSugerencias] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const todas = await listTable('homologaciones').catch(() => []);
      const mias = (todas || [])
        .filter((h) => String(h.empresa_id) === String(empresa.id))
        .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999) || String(a.creado).localeCompare(String(b.creado)));
      setFilas(mias);
    } finally { setCargando(false); }
  }, [empresa.id]);
  useEffect(() => { cargar(); }, [cargar]);

  async function anadir(conceptoDirecto) {
    const concepto = (conceptoDirecto ?? nueva.concepto).trim();
    if (!concepto) { setError('Escribe la condición que le exiges al proveedor.'); return; }
    setError(null);
    try {
      await insertRow('homologaciones', {
        empresa_id: empresa.id,
        concepto,
        requisito: nueva.requisito?.trim() || null,
        estado: nueva.estado || 'pendiente',
        obligatorio: !!nueva.obligatorio,
        fecha_validez: nueva.fecha_validez || null,
        notas: nueva.notas?.trim() || null,
        orden: (filas.length + 1) * 10,
      });
      setNueva({ ...VACIA });
      setVerSugerencias(false);
      cargar(); onCambio && onCambio();
    } catch (e) {
      setError('No se pudo añadir: ' + (e.message || ''));
    }
  }

  async function guardarEdicion() {
    if (!editando?.concepto?.trim()) { setError('La condición no puede quedar vacía.'); return; }
    try {
      await updateRow('homologaciones', editando.id, {
        concepto: editando.concepto.trim(),
        requisito: editando.requisito?.trim() || null,
        estado: editando.estado,
        obligatorio: !!editando.obligatorio,
        fecha_validez: editando.fecha_validez || null,
        notas: editando.notas?.trim() || null,
        updated_at: new Date().toISOString(),
      });
      setEditando(null); setError(null); cargar(); onCambio && onCambio();
    } catch (e) { setError('No se pudo guardar: ' + (e.message || '')); }
  }

  async function cambiarEstado(h, estado) {
    try { await updateRow('homologaciones', h.id, { estado, updated_at: new Date().toISOString() }); cargar(); onCambio && onCambio(); }
    catch { setError('No se pudo cambiar el estado.'); }
  }

  async function borrar(h) {
    if (!window.confirm(`¿Eliminar la condición «${h.concepto}»?`)) return;
    try { await deleteRow('homologaciones', h.id); cargar(); onCambio && onCambio(); }
    catch { setError('No se pudo eliminar.'); }
  }

  // Resumen: ¿está homologado? Todas las obligatorias validadas y sin caducar.
  const obligatorias = filas.filter((h) => h.obligatorio && h.estado !== 'no_aplica');
  const validadas = obligatorias.filter((h) => h.estado === 'validado');
  const caducadas = filas.filter((h) => h.estado === 'caducado'
    || (h.fecha_validez && new Date(h.fecha_validez) < new Date() && h.estado !== 'no_aplica'));
  const homologado = obligatorias.length > 0 && validadas.length === obligatorias.length && caducadas.length === 0;

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-extrabold uppercase tracking-wide text-[#9FC0CB]">Condiciones de homologación</h4>
          <p className="mt-0.5 text-xs text-[#7FA7B4]">
            Requisitos que este proveedor debe cumplir. Se añaden de una en una.
          </p>
        </div>
        {obligatorias.length > 0 && (
          <span className={`chip ${homologado ? 'bg-emerald-500/15 text-emerald-300' : 'bg-brand-orange/15 text-brand-orange'}`}>
            {homologado ? '✓ Homologado' : `${validadas.length}/${obligatorias.length} validadas`}
          </span>
        )}
      </div>

      {caducadas.length > 0 && (
        <div className="rounded-xl bg-red-500/10 p-3 text-xs font-bold text-red-300">
          {caducadas.length} condición(es) caducada(s) o fuera de plazo.
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-500/10 p-3 text-xs font-bold text-red-300" onClick={() => setError(null)}>{error}</div>
      )}

      {cargando ? <p className="py-4 text-sm text-[#7FA7B4]">Cargando…</p> : (
        <div className="space-y-2">
          {filas.length === 0 && (
            <p className="rounded-xl border border-dashed border-[#1E5468] p-4 text-sm text-[#7FA7B4]">
              Aún no le has exigido ninguna condición. Añade la primera abajo.
            </p>
          )}

          {filas.map((h, i) => editando?.id === h.id ? (
            <div key={h.id} className="space-y-2 rounded-xl border border-brand-verde/40 bg-[#0D3242] p-3">
              <input className="input !py-2 text-sm" value={editando.concepto}
                onChange={(e) => setEditando({ ...editando, concepto: e.target.value })} placeholder="Condición" />
              <input className="input !py-2 text-sm" value={editando.requisito || ''}
                onChange={(e) => setEditando({ ...editando, requisito: e.target.value })} placeholder="Qué se le exige exactamente" />
              <div className="flex flex-wrap gap-2">
                <select className="input !w-auto !py-2 text-sm" value={editando.estado}
                  onChange={(e) => setEditando({ ...editando, estado: e.target.value })}>
                  {ESTADOS_HOMOLOGACION.map((e) => <option key={e.k} value={e.k}>{e.label}</option>)}
                </select>
                <input type="date" className="input !w-auto !py-2 text-sm" value={editando.fecha_validez || ''}
                  onChange={(e) => setEditando({ ...editando, fecha_validez: e.target.value })} title="Válido hasta" />
                <label className="flex items-center gap-2 text-xs font-bold text-[#9FC0CB]">
                  <input type="checkbox" checked={!!editando.obligatorio}
                    onChange={(e) => setEditando({ ...editando, obligatorio: e.target.checked })} /> Obligatoria
                </label>
              </div>
              <textarea rows={2} className="input !py-2 text-sm" value={editando.notas || ''}
                onChange={(e) => setEditando({ ...editando, notas: e.target.value })} placeholder="Notas" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditando(null)} className="btn-ghost !px-3 !py-1.5 text-xs">Cancelar</button>
                <button onClick={guardarEdicion} className="btn-orange !px-3 !py-1.5 text-xs">Guardar</button>
              </div>
            </div>
          ) : (
            <div key={h.id} className="flex items-start gap-3 rounded-xl border border-[#1E5468] bg-[#0D3242] p-3">
              <span className="mt-0.5 text-xs font-bold text-[#7FA7B4]">{String(i + 1).padStart(2, '0')}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[#EAF4F7]">{h.concepto}</span>
                  {!h.obligatorio && <span className="chip bg-white/5 text-[#7FA7B4]">opcional</span>}
                  <span className={`chip ${tonoDe(h.estado)}`}>{ESTADOS_HOMOLOGACION.find((e) => e.k === h.estado)?.label}</span>
                </div>
                {h.requisito && <p className="mt-1 text-xs text-[#9FC0CB]">{h.requisito}</p>}
                <p className="mt-1 text-[11px] text-[#7FA7B4]">
                  {h.fecha_validez ? `Válido hasta ${new Date(h.fecha_validez).toLocaleDateString('es-ES')}` : 'Sin fecha de caducidad'}
                  {h.notas ? ` · ${h.notas}` : ''}
                </p>
              </div>
              {puedeEditar && (
                <div className="flex shrink-0 items-center gap-1">
                  <select value={h.estado} onChange={(e) => cambiarEstado(h, e.target.value)}
                    className="input !w-32 !py-1 text-xs" aria-label="Estado de la condición">
                    {ESTADOS_HOMOLOGACION.map((e) => <option key={e.k} value={e.k}>{e.label}</option>)}
                  </select>
                  <button onClick={() => setEditando({ ...h })} className="px-1 text-xs text-[#7FA7B4] hover:text-[#EAF4F7]" title="Editar">✎</button>
                  <button onClick={() => borrar(h)} className="px-1 text-xs text-[#7FA7B4] hover:text-red-400" title="Eliminar">✕</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Alta de UNA condición */}
      {puedeEditar && (
        <div className="space-y-2 rounded-xl border border-dashed border-[#1E5468] p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#9FC0CB]">Añadir condición</p>
            <button onClick={() => setVerSugerencias((v) => !v)} className="text-xs font-bold text-brand-verdeTexto hover:underline">
              {verSugerencias ? 'ocultar habituales' : 'usar una habitual'}
            </button>
          </div>

          {verSugerencias && (
            <div className="flex flex-wrap gap-1.5">
              {SUGERENCIAS.filter((s) => !filas.some((h) => h.concepto === s)).map((s) => (
                <button key={s} onClick={() => anadir(s)}
                  className="rounded-full border border-[#1E5468] px-2.5 py-1 text-[11px] font-semibold text-[#9FC0CB] hover:border-brand-verde hover:text-[#EAF4F7]">
                  + {s}
                </button>
              ))}
            </div>
          )}

          <input className="input !py-2 text-sm" value={nueva.concepto} placeholder="Condición exigida (p. ej. Certificado ISO 9001 en vigor)"
            onChange={(e) => setNueva({ ...nueva, concepto: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && anadir()} />
          <input className="input !py-2 text-sm" value={nueva.requisito} placeholder="Detalle del requisito (opcional)"
            onChange={(e) => setNueva({ ...nueva, requisito: e.target.value })} />
          <div className="flex flex-wrap items-center gap-2">
            <select className="input !w-auto !py-2 text-sm" value={nueva.estado}
              onChange={(e) => setNueva({ ...nueva, estado: e.target.value })}>
              {ESTADOS_HOMOLOGACION.map((e) => <option key={e.k} value={e.k}>{e.label}</option>)}
            </select>
            <input type="date" className="input !w-auto !py-2 text-sm" value={nueva.fecha_validez}
              onChange={(e) => setNueva({ ...nueva, fecha_validez: e.target.value })} title="Válido hasta" />
            <label className="flex items-center gap-2 text-xs font-bold text-[#9FC0CB]">
              <input type="checkbox" checked={!!nueva.obligatorio}
                onChange={(e) => setNueva({ ...nueva, obligatorio: e.target.checked })} /> Obligatoria
            </label>
            <button onClick={() => anadir()} className="btn-orange !px-4 !py-2 text-sm">+ Añadir</button>
          </div>
        </div>
      )}
    </div>
  );
}
