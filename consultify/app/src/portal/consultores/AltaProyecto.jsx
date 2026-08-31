import { useState } from 'react';
import { insertRow } from '../../lib/data.js';
import { NORMAS, MODELO_IDS } from '../../lib/calcEngine.js';
import { empresasCliente, asegurarCliente } from '../../lib/clienteDeEmpresa.js';
import { nombreVisible } from '../../lib/crm.js';

// ════════════════════════════════════════════════════════════════════════════
// Alta rápida de proyecto desde una oferta o un contrato
//
// Antes había que ir a la pantalla de Proyectos, buscar el cliente y teclear a
// mano las normas, el modelo y las fechas que ya estaban en el contrato. Aquí
// el origen rellena todo y solo queda confirmar.
//
// `origen` es opcional: sin él se abre un proyecto desde cero, que hace falta
// para los clientes que ya trabajaban con nosotros antes de que existieran las
// ofertas en el sistema, o para trabajos que no vienen de una oferta.
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
  if (!origen) return '';
  const normas = (origen.normas || []).join(' + ');
  return [normas || 'Proyecto', origen.modelo].filter(Boolean).join(' · ');
}

/**
 * @param {object}   p
 * @param {object}  [p.origen]     oferta o contrato del que nace, si lo hay
 * @param {string}  [p.clienteId]  ficha de `clientes` ya resuelta (ficha de empresa)
 * @param {object[]}[p.empresas]   empresas del CRM, para elegir cuando no hay
 *                                 cliente fijado (pantalla de Proyectos)
 * @param {object[]}[p.clientes]   fichas de `clientes`, para resolver la empresa
 */
export default function AltaProyecto({ origen = null, tipo, clienteId, empresas, clientes = [], onCerrar, onCreado }) {
  const desdeCero = !origen;
  // Cuando no llega un cliente fijado hay que elegir empresa. Se listan las del
  // CRM marcadas como cliente, que es la misma lista de la pestaña Empresas: la
  // pantalla de Proyectos leía `clientes` y enseñaba otra distinta.
  const eligeEmpresa = !clienteId && Array.isArray(empresas);
  const opciones = eligeEmpresa ? empresasCliente(empresas) : [];
  const [empresaId, setEmpresaId] = useState('');
  const [form, setForm] = useState({
    nombre: nombrePropuesto(origen),
    normas: origen?.normas || [],
    modelo: origen?.modelo || '',
    estado: 'activo',
    fecha_inicio: origen?.fecha_inicio || hoyISO(),
    fecha_fin: origen?.fecha_fin || '',
    meses_estimados: origen?.meses || 12,
  });

  // Al elegir normas o modelo sin origen, el nombre se propone solo mientras
  // nadie lo haya escrito a mano.
  const [nombreTocado, setNombreTocado] = useState(false);
  const proponerNombre = (normas, modelo) => {
    if (nombreTocado) return form.nombre;
    const n = (normas || []).map((id) => NORMAS.find((x) => x.id === id)?.nombre || id).join(' + ');
    return [n || 'Proyecto', modelo].filter(Boolean).join(' · ');
  };
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  async function crear() {
    if (eligeEmpresa && !empresaId) { setError('Elige la empresa del proyecto.'); return; }
    if (!eligeEmpresa && !clienteId) {
      setError('Esta empresa no tiene ficha de cliente. Créala antes de abrir el proyecto.');
      return;
    }
    if (!form.nombre.trim()) { setError('Ponle un nombre al proyecto.'); return; }
    if (desdeCero && !form.normas.length) { setError('Selecciona al menos una norma.'); return; }
    if (form.fecha_inicio && form.fecha_fin && form.fecha_fin <= form.fecha_inicio) {
      setError('La fecha de fin debe ser posterior a la de inicio.'); return;
    }
    setGuardando(true); setError(null);
    try {
      // Si se eligió empresa, se resuelve su ficha operativa (creándola si no
      // existía) para poder colgar el proyecto.
      let idCliente = clienteId;
      if (eligeEmpresa) {
        const emp = opciones.find((e) => String(e.id) === String(empresaId));
        const r = await asegurarCliente(emp, clientes);
        idCliente = r.id;
      }
      const fila = await insertRow('proyectos_cliente', {
        cliente_id: idCliente,
        nombre: form.nombre.trim(),
        normas: form.normas,
        modelo: form.modelo || null,
        estado: form.estado,
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin || null,
        meses_estimados: Number(form.meses_estimados) || 12,
        // La trazabilidad del origen: sin esto no se puede saber qué contratos
        // firmados siguen sin proyecto.
        // Trazabilidad del origen. Sin origen no hay nada que trazar: el
        // proyecto se abre suelto y así queda registrado.
        ...(origen ? (tipo === 'contrato' ? { contrato_id: origen.id } : { oferta_id: origen.id }) : {}),
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
          {desdeCero
            ? 'Nuevo proyecto'
            : <>Abrir proyecto desde {tipo === 'contrato' ? 'el contrato' : 'la oferta'}{' '}
                <span className="text-brand-orange">{origen.numero || origen.numero_oferta}</span></>}
        </h4>
        <button type="button" onClick={onCerrar}
          className="text-[11.5px] font-bold text-[#7FA7B4] hover:text-[#EAF4F7]">Cancelar</button>
      </div>

      {eligeEmpresa && (
        <div className="mt-3">
          <label className="label !mb-1" htmlFor="ap-empresa">Empresa</label>
          <select id="ap-empresa" className="input h-[34px] !py-0 !text-[13px]"
            value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
            <option value="">— Elige la empresa —</option>
            {opciones.map((e) => (
              <option key={e.id} value={e.id}>{nombreVisible(e)}{e.cif ? ` · ${e.cif}` : ''}</option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-[#7FA7B4]">
            {opciones.length} empresa{opciones.length === 1 ? '' : 's'} marcada{opciones.length === 1 ? '' : 's'} como
            cliente en la pestaña Empresas.
          </p>
        </div>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="label !mb-1" htmlFor="ap-nombre">Nombre del proyecto</label>
          <input id="ap-nombre" className="input h-[34px] !py-0 !text-[13px]" value={form.nombre}
            placeholder="Por ejemplo: ISO 9001 · Implantación"
            onChange={(e) => { setNombreTocado(true); setForm({ ...form, nombre: e.target.value }); }} />
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

      {desdeCero ? (
        <div className="mt-3 space-y-3">
          <div>
            <p className="label !mb-1.5">Normas del proyecto</p>
            <div className="flex flex-wrap gap-1.5">
              {NORMAS.map((n) => {
                const puesta = form.normas.includes(n.id);
                return (
                  <button key={n.id} type="button"
                    onClick={() => {
                      const normas = puesta ? form.normas.filter((x) => x !== n.id) : [...form.normas, n.id];
                      setForm({ ...form, normas, nombre: proponerNombre(normas, form.modelo) });
                    }}
                    className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold transition ${
                      puesta ? 'bg-brand-orange text-[#0A2B3A]' : 'bg-[#0B2E3D] text-[#9FC0CB] hover:text-[#EAF4F7]'}`}>
                    {n.nombre}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="label !mb-1.5">Modelo</p>
            <div className="flex flex-wrap gap-1.5">
              {MODELO_IDS.map((m) => (
                <button key={m} type="button"
                  onClick={() => setForm({ ...form, modelo: m, nombre: proponerNombre(form.normas, m) })}
                  className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold transition ${
                    form.modelo === m ? 'bg-brand-orange text-[#0A2B3A]' : 'bg-[#0B2E3D] text-[#9FC0CB] hover:text-[#EAF4F7]'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[11.5px] text-[#7FA7B4]">
          {(form.normas || []).join(' + ') || 'Sin normas'}
          {form.modelo ? ` · ${form.modelo}` : ''} · se abre en estado activo.
        </p>
      )}

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
