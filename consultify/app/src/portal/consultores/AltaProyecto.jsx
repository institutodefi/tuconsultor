import { useEffect, useMemo, useState } from 'react';
import { insertRow, listTable, explicarErrorBd } from '../../lib/data.js';
import { NORMA_BY_ID } from '../../lib/calcEngine.js';
import { asegurarCliente } from '../../lib/clienteDeEmpresa.js';
import { ofertasParaProyecto, datosDeOferta, etiquetaOferta, contratoDe } from '../../lib/ofertasAceptadas.js';
import { normalizarCif } from '../../lib/crm.js';

// ════════════════════════════════════════════════════════════════════════════
// ALTA DE PROYECTO · SIEMPRE DESDE UNA OFERTA ACEPTADA
//
// Un proyecto nace de una oferta aceptada, nunca suelto. Antes se podía abrir
// eligiendo empresa y tecleando las normas a mano, y salían proyectos sin
// precio, sin alcance pactado y sin nada que enseñar si el cliente discutía qué
// se había contratado.
//
// Las normas, el modelo y las fechas se VUELCAN de la oferta y no se piden otra
// vez: volver a elegirlos es la forma de que acaben sin coincidir con lo que se
// firmó. Se pueden ajustar después, pero se parte de lo pactado.
// ════════════════════════════════════════════════════════════════════════════

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const nombreNorma = (id) => NORMA_BY_ID[id]?.nombre || id;

/**
 * @param {object}   p
 * @param {object}  [p.origen]     oferta concreta, si se abre desde su tarjeta
 * @param {string}  [p.clienteId]  ficha de `clientes` ya resuelta
 * @param {string}  [p.cif]        para acotar las ofertas a una empresa
 * @param {object[]}[p.empresas]   empresas del CRM, para resolver el cliente
 * @param {object[]}[p.clientes]   fichas de `clientes`
 */
export default function AltaProyecto({
  origen = null, clienteId = null, cif = null, empresas = [], clientes = [], onCerrar, onCreado,
}) {
  const [datos, setDatos] = useState(null);      // presupuestos, contratos, proyectos
  const [errorCarga, setErrorCarga] = useState(null);
  const [ofertaId, setOfertaId] = useState(origen?.id ? String(origen.id) : '');
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      listTable('presupuestos').catch(() => []),
      listTable('contratos').catch(() => []),
      listTable('proyectos_cliente').catch(() => []),
      clientes.length ? Promise.resolve(clientes) : listTable('clientes').catch(() => []),
    ]).then(([p, c, pr, cl]) => {
      if (vivo) setDatos({ presupuestos: p, contratos: c, proyectos: pr, clientes: cl });
    }).catch((e) => vivo && setErrorCarga(e?.message || String(e)));
    return () => { vivo = false; };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const elegibles = useMemo(
    () => (datos ? ofertasParaProyecto({ ...datos, cif }) : []),
    [datos, cif],
  );

  const oferta = useMemo(
    () => elegibles.find((o) => String(o.id) === ofertaId) || null,
    [elegibles, ofertaId],
  );

  // Al elegir oferta se vuelca todo. Solo quedan editables el nombre y las
  // fechas: lo demás es lo pactado y cambiarlo aquí sería contradecir la oferta.
  useEffect(() => {
    if (!oferta) { setForm(null); return; }
    const d = datosDeOferta(oferta, datos?.contratos || []);
    setForm({
      ...d,
      nombre: d.nombre,
      estado: 'activo',
      fecha_inicio: d.fecha_inicio || hoyISO(),
      fecha_fin: d.fecha_fin || '',
    });
    setError(null);
  }, [ofertaId]);   // eslint-disable-line react-hooks/exhaustive-deps

  async function crear() {
    if (!oferta || !form) { setError('Elige antes la oferta aceptada de la que nace el proyecto.'); return; }
    if (!form.nombre.trim()) { setError('Ponle un nombre al proyecto.'); return; }
    if (form.fecha_inicio && form.fecha_fin && form.fecha_fin <= form.fecha_inicio) {
      setError('La fecha de fin debe ser posterior a la de inicio.'); return;
    }
    setGuardando(true); setError(null);
    try {
      // El proyecto cuelga de la ficha operativa del cliente. Se resuelve por
      // CIF desde la empresa de la oferta, creándola si no existiera.
      let idCliente = clienteId;
      if (!idCliente) {
        const c = normalizarCif(oferta.cif);
        const ficha = (datos.clientes || []).find((x) => normalizarCif(x.cif) === c);
        if (ficha) idCliente = ficha.id;
        else {
          const emp = empresas.find((e) => normalizarCif(e.cif) === c)
            || { nombre: oferta.empresa, cif: oferta.cif };
          const r = await asegurarCliente(emp, datos.clientes || []);
          idCliente = r.id;
        }
      }

      const fila = await insertRow('proyectos_cliente', {
        cliente_id: idCliente,
        nombre: form.nombre.trim(),
        // Volcados de la oferta, sin tocar.
        normas: form.normas,
        modelo: form.modelo,
        estado: form.estado,
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin || null,
        meses_estimados: Number(form.meses_estimados) || 12,
        // Trazabilidad: proyecto → contrato → oferta.
        oferta_id: form.oferta_id,
        contrato_id: form.contrato_id,
      });
      onCreado?.(fila);
    } catch (e) {
      setError(explicarErrorBd(e, 'proyectos_cliente'));
    } finally {
      setGuardando(false);
    }
  }

  const ct = oferta ? contratoDe(oferta, datos?.contratos || []) : null;

  return (
    <div className="rounded-xl border border-brand-orange/50 bg-[#0D3242] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-[13px] font-extrabold text-[#EAF4F7]">Abrir proyecto desde una oferta aceptada</h4>
        <button type="button" onClick={onCerrar}
          className="text-[11.5px] font-bold text-[#7FA7B4] hover:text-[#EAF4F7]">Cancelar</button>
      </div>

      {errorCarga && <p className="mt-2 text-[12px] font-bold text-red-300">No se pudo consultar: {errorCarga}</p>}
      {!datos && !errorCarga && <p className="mt-2 text-[12px] text-[#7FA7B4]">Buscando ofertas aceptadas…</p>}

      {datos && elegibles.length === 0 && (
        <div className="mt-3 rounded-lg bg-amber-400/10 px-3 py-2.5 text-[12.5px] text-amber-200">
          <p className="font-bold">No hay ofertas aceptadas pendientes de proyecto.</p>
          <p className="mt-1 font-medium text-[#DFF1F5]">
            Un proyecto nace siempre de una oferta aceptada: es lo que fija el alcance y el precio.
            Ve al histórico de ofertas y marca «El cliente la acepta» en la que corresponda.
          </p>
        </div>
      )}

      {datos && elegibles.length > 0 && (
        <>
          <div className="mt-3">
            <label className="label" htmlFor="ap-oferta">Oferta aceptada</label>
            <select id="ap-oferta" className="input" value={ofertaId}
              onChange={(e) => setOfertaId(e.target.value)}>
              <option value="">— elige la oferta —</option>
              {elegibles.map((o) => (
                <option key={o.id} value={String(o.id)}>{etiquetaOferta(o, datos.contratos)}</option>
              ))}
            </select>
            <p className="campo-nota">
              {elegibles.length} oferta{elegibles.length === 1 ? '' : 's'} aceptada{elegibles.length === 1 ? '' : 's'} sin proyecto abierto.
            </p>
          </div>

          {form && (
            <>
              {/* Lo pactado, en solo lectura: se enseña para que se vea qué se
                  está abriendo, no para cambiarlo aquí. */}
              <div className="mt-3 rounded-lg border border-[#1E5468] bg-[#0B2E3D] px-3 py-2.5">
                <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Se vuelca de la oferta</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {form.normas.length
                    ? form.normas.map((n) => (
                        <span key={n} className="chip bg-brand-verde/15 !px-2 !py-0.5 text-[11px] text-brand-verdeTexto">
                          {nombreNorma(n)}
                        </span>
                      ))
                    : <span className="text-[11.5px] font-bold text-amber-200">La oferta no tiene normas asignadas.</span>}
                  <span className="chip bg-brand-orange/15 !px-2 !py-0.5 text-[11px] text-brand-orange">{form.modelo || 'sin modelo'}</span>
                </div>
                <p className="mt-1.5 text-[11px] text-[#7FA7B4]">
                  {ct ? `Contrato ${ct.numero}` : 'Sin contrato todavía: el proyecto queda ligado a la oferta.'}
                </p>
              </div>

              <div className="form-grid mt-3">
                <div className="campo sm:col-span-2">
                  <label className="label" htmlFor="ap-nombre">Nombre del proyecto</label>
                  <input id="ap-nombre" className="input" value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                </div>
                <div className="campo">
                  <label className="label" htmlFor="ap-inicio">Inicio</label>
                  <input id="ap-inicio" type="date" className="input" value={form.fecha_inicio || ''}
                    onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} />
                </div>
                <div className="campo">
                  <label className="label" htmlFor="ap-fin">Fin</label>
                  <input id="ap-fin" type="date" className="input" value={form.fecha_fin || ''}
                    onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} />
                </div>
              </div>
            </>
          )}

          {error && <p className="mt-2 text-[12px] font-bold text-red-300">{error}</p>}

          <div className="mt-3">
            <button type="button" onClick={crear} disabled={guardando || !form}
              className="btn-orange !py-1.5 !text-[13px] disabled:opacity-40">
              {guardando ? 'Creando…' : 'Crear proyecto'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
