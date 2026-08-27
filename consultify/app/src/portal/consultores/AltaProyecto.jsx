import { useState } from 'react';
import { insertRow } from '../../lib/data.js';

// ════════════════════════════════════════════════════════════════════════════
// Alta rápida de proyecto desde una oferta o un contrato
//
// Antes había que ir a la pantalla de Proyectos, buscar el cliente y teclear a
// mano las normas, el modelo y las fechas que ya estaban en el contrato. Aquí
// el origen rellena todo y solo queda confirmar.
//
// Se guarda `contrato_id` u `oferta_id` para saber de dónde viene cada
// proyecto: es lo que permite después contar los contratos firmados que aún no
// tienen proyecto abierto.
// ════════════════════════════════════════════════════════════════════════════

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Nombre por defecto: las normas y el modelo, que es como se busca luego. */
function nombrePropuesto(origen) {
  const normas = (origen.normas || []).join(' + ');
  return [normas || 'Proyecto', origen.modelo].filter(Boolean).join(' · ');
}

export default function AltaProyecto({ origen, tipo, clienteId, onCerrar, onCreado }) {
  const [form, setForm] = useState({
    nombre: nombrePropuesto(origen),
    normas: origen.normas || [],
    modelo: origen.modelo || '',
    estado: 'activo',
    fecha_inicio: origen.fecha_inicio || hoyISO(),
    fecha_fin: origen.fecha_fin || '',
    meses_estimados: origen.meses || 12,
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  async function crear() {
    if (!clienteId) {
      setError('Esta empresa no tiene ficha de cliente. Créala antes de abrir el proyecto.');
      return;
    }
    if (!form.nombre.trim()) { setError('Ponle un nombre al proyecto.'); return; }
    if (form.fecha_inicio && form.fecha_fin && form.fecha_fin <= form.fecha_inicio) {
      setError('La fecha de fin debe ser posterior a la de inicio.'); return;
    }
    setGuardando(true); setError(null);
    try {
      const fila = await insertRow('proyectos_cliente', {
        cliente_id: clienteId,
        nombre: form.nombre.trim(),
        normas: form.normas,
        modelo: form.modelo || null,
        estado: form.estado,
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin || null,
        meses_estimados: Number(form.meses_estimados) || 12,
        // La trazabilidad del origen: sin esto no se puede saber qué contratos
        // firmados siguen sin proyecto.
        ...(tipo === 'contrato' ? { contrato_id: origen.id } : { oferta_id: origen.id }),
      });
      onCreado?.(fila);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-xl border border-brand-orange/50 bg-[#0D3242] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-[13px] font-extrabold text-[#EAF4F7]">
          Abrir proyecto desde {tipo === 'contrato' ? 'el contrato' : 'la oferta'}{' '}
          <span className="text-brand-orange">{origen.numero || origen.numero_oferta}</span>
        </h4>
        <button type="button" onClick={onCerrar}
          className="text-[11.5px] font-bold text-[#7FA7B4] hover:text-[#EAF4F7]">Cancelar</button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="label !mb-1" htmlFor="ap-nombre">Nombre del proyecto</label>
          <input id="ap-nombre" className="input h-[34px] !py-0 !text-[13px]" value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </div>
        <div>
          <label className="label !mb-1" htmlFor="ap-inicio">Inicio</label>
          <input id="ap-inicio" type="date" className="input h-[34px] !py-0 !text-[13px]"
            value={form.fecha_inicio || ''}
            onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} />
        </div>
        <div>
          <label className="label !mb-1" htmlFor="ap-fin">Fin</label>
          <input id="ap-fin" type="date" className="input h-[34px] !py-0 !text-[13px]"
            value={form.fecha_fin || ''}
            onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} />
        </div>
      </div>

      <p className="mt-2 text-[11.5px] text-[#7FA7B4]">
        {(form.normas || []).join(' + ') || 'Sin normas'}
        {form.modelo ? ` · ${form.modelo}` : ''} · se abre en estado activo.
      </p>

      {error && <p className="mt-2 text-[12px] font-bold text-red-300">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={crear} disabled={guardando}
          className="btn-primary !py-1.5 !text-[13px] disabled:opacity-50">
          {guardando ? 'Creando…' : 'Crear proyecto'}
        </button>
      </div>
    </div>
  );
}
