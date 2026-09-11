import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listTable, insertRow, updateRow, explicarErrorBd } from '../lib/data.js';
import { normalizarCif, emailValido } from '../lib/crm.js';
import ConsentimientoRgpd from './ConsentimientoRgpd.jsx';

// ════════════════════════════════════════════════════════════════════════════
// LA PERSONA QUE PIDIÓ LA OFERTA · en el histórico, debajo del cliente
//
// Quien pide una oferta desde la web entra en el CRM solo (empresa y contacto
// sin revisar, v67). Aquí, sin salir del histórico, se ven y se corrigen sus
// datos, se marcan como revisados, se le pide el consentimiento RGPD y, si la
// oferta es anterior a la v67 o vino sin CIF, se añade al CRM.
// ════════════════════════════════════════════════════════════════════════════

const S = (v) => String(v ?? '');
const low = (v) => S(v).trim().toLowerCase();

// Una carga para toda la tabla: son dos listas que no cambian entre filas.
let cache = null;
async function cargarCrm(fuerza = false) {
  if (cache && !fuerza) return cache;
  const [contactos, empresas, vinculos] = await Promise.all([listTable('contactos').catch(() => []), listTable('empresas').catch(() => []), listTable('empresa_contactos').catch(() => [])]);
  cache = { contactos, empresas, vinculos };
  return cache;
}

export default function ContactoDeOferta({ oferta, puedeEditar = true, onCambio }) {
  const [crm, setCrm] = useState(cache);
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => { if (!crm) cargarCrm().then(setCrm); }, [crm]);
  const recargar = async () => { setCrm(await cargarCrm(true)); onCambio?.(); };

  const contacto = useMemo(() => {
    if (!crm) return null;
    return crm.contactos.find((c) => oferta.contacto_id && String(c.id) === String(oferta.contacto_id))
      || crm.contactos.find((c) => low(c.email) && low(c.email) === low(oferta.email)) || null;
  }, [crm, oferta.contacto_id, oferta.email]);
  const empresa = useMemo(() => {
    if (!crm) return null;
    const cif = normalizarCif(oferta.cif);
    return crm.empresas.find((e) => oferta.empresa_id && String(e.id) === String(oferta.empresa_id))
      || (cif ? crm.empresas.find((e) => normalizarCif(e.cif) === cif) : null) || null;
  }, [crm, oferta.empresa_id, oferta.cif]);

  if (!oferta.email && !oferta.nombre) return null;
  const pendiente = (contacto && contacto.revisado === false) || (empresa && empresa.revisado === false);

  async function guardar() {
    setOcupado(true); setMsg(null);
    try {
      if (!S(form.nombre).trim()) throw new Error('Falta el nombre.');
      if (form.email && !emailValido(form.email)) throw new Error('El correo no es válido.');
      const patch = { nombre: S(form.nombre).trim(), apellidos: S(form.apellidos).trim() || null, cargo: S(form.cargo).trim() || null, email: low(form.email) || null, telefono: S(form.telefono).trim() || null, movil: S(form.movil).trim() || null, revisado: true };
      await updateRow('contactos', contacto.id, patch);
      if (empresa && (S(form.empresa_nombre).trim() !== S(empresa.nombre) || S(form.nombre_comercial).trim() !== S(empresa.nombre_comercial || ''))) {
        await updateRow('empresas', empresa.id, { nombre: S(form.empresa_nombre).trim() || empresa.nombre, nombre_comercial: S(form.nombre_comercial).trim() || null, revisado: true });
      }
      // La oferta refleja el nombre y el correo corregidos.
      await updateRow('presupuestos', oferta.id, { nombre: `${patch.nombre} ${patch.apellidos || ''}`.trim(), email: patch.email || oferta.email, cargo: patch.cargo || oferta.cargo, telefono: patch.telefono || oferta.telefono, contacto_nombre: patch.nombre, contacto_apellidos: patch.apellidos }).catch(() => {});
      setForm(null); setMsg({ err: false, t: 'Datos guardados y marcados como revisados.' });
      await recargar();
    } catch (e) { setMsg({ err: true, t: explicarErrorBd(e, 'contactos') }); }
    finally { setOcupado(false); }
  }
  async function revisar() {
    setOcupado(true); setMsg(null);
    try {
      if (contacto && contacto.revisado === false) await updateRow('contactos', contacto.id, { revisado: true });
      if (empresa && empresa.revisado === false) await updateRow('empresas', empresa.id, { revisado: true });
      setMsg({ err: false, t: 'Marcado como revisado.' }); await recargar();
    } catch (e) { setMsg({ err: true, t: explicarErrorBd(e, 'contactos') }); }
    finally { setOcupado(false); }
  }
  async function anadirAlCrm() {
    setOcupado(true); setMsg(null);
    try {
      let emp = empresa;
      const cif = normalizarCif(oferta.cif);
      if (!emp) {
        if (!cif) throw new Error('La oferta no tiene CIF: edítala y ponlo antes de añadir la empresa.');
        emp = await insertRow('empresas', { nombre: oferta.empresa || cif, cif, email: low(oferta.email) || null, telefono: oferta.telefono || null, estado_comercial: 'potencial', es_cliente: false, origen: 'calculadora', revisado: true });
      }
      let con = contacto;
      if (!con) {
        if (!emailValido(oferta.email)) throw new Error('La oferta no tiene un correo válido de la persona.');
        con = await insertRow('contactos', { nombre: oferta.contacto_nombre || S(oferta.nombre).split(' ')[0] || oferta.email, apellidos: oferta.contacto_apellidos || S(oferta.nombre).split(' ').slice(1).join(' ') || null, cargo: oferta.cargo || null, email: low(oferta.email), telefono: oferta.telefono || null, origen: 'calculadora', revisado: true });
      }
      const ya = crm.vinculos.some((v) => String(v.empresa_id) === String(emp.id) && String(v.contacto_id) === String(con.id));
      if (!ya) await insertRow('empresa_contactos', { empresa_id: emp.id, contacto_id: con.id, rol: 'directivo', principal: !crm.vinculos.some((v) => String(v.empresa_id) === String(emp.id) && v.principal) });
      await updateRow('presupuestos', oferta.id, { empresa_id: emp.id, contacto_id: con.id }).catch(() => {});
      setMsg({ err: false, t: 'Añadido al CRM: empresa y contacto enlazados a la oferta.' });
      await recargar();
    } catch (e) { setMsg({ err: true, t: explicarErrorBd(e, 'contactos') }); }
    finally { setOcupado(false); }
  }

  const cabecera = (
    <button type="button" onClick={() => setAbierto((v) => !v)} className="mt-1 flex flex-wrap items-center gap-1.5 text-left text-[10.5px] font-bold">
      <span className={pendiente ? 'text-amber-200' : contacto ? 'text-brand-verdeTexto' : 'text-[#7FA7B4]'}>
        {!crm ? '…' : contacto ? (pendiente ? '⚠ Sin revisar en el CRM' : '✓ En el CRM') : '＋ No está en el CRM'}
      </span>
      {contacto && (contacto.rgpd_aceptado ? <span className="text-emerald-300">· RGPD ✓</span> : <span className="text-amber-200">· RGPD pendiente</span>)}
      <span className="text-[#7FA7B4]">{abierto ? '▲' : '▼'}</span>
    </button>
  );

  return (
    <div>
      {cabecera}
      {abierto && crm && (
        <div className="mt-1.5 space-y-2 rounded-lg border border-[#1E5468] bg-[#0B2E3D] p-2.5 text-[11.5px]">
          {contacto ? (
            <>
              {!form ? (
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-[#EAF4F7]">{contacto.nombre} {contacto.apellidos || ''}{contacto.cargo ? <span className="ml-1.5 font-normal text-[#9FC0CB]">{contacto.cargo}</span> : null}</p>
                    <p className="text-[#9FC0CB]">{contacto.email || 'sin correo'}{contacto.telefono ? ` · ${contacto.telefono}` : ''}{contacto.movil ? ` · ${contacto.movil}` : ''}</p>
                    {empresa && <p className="text-[#9FC0CB]">{empresa.nombre}{empresa.nombre_comercial ? ` «${empresa.nombre_comercial}»` : ''} · {empresa.cif || 'sin CIF'}{empresa.revisado === false ? <span className="ml-1 text-amber-200">· sin revisar</span> : ''}</p>}
                  </div>
                  {puedeEditar && (
                    <div className="flex shrink-0 flex-wrap gap-2 font-bold">
                      <button type="button" onClick={() => setForm({ nombre: contacto.nombre || '', apellidos: contacto.apellidos || '', cargo: contacto.cargo || '', email: contacto.email || '', telefono: contacto.telefono || '', movil: contacto.movil || '', empresa_nombre: empresa?.nombre || '', nombre_comercial: empresa?.nombre_comercial || '' })} className="text-brand-orange hover:underline">✎ Editar datos</button>
                      {pendiente && <button type="button" onClick={revisar} disabled={ocupado} className="text-emerald-300 hover:underline disabled:opacity-50">✓ Marcar revisado</button>}
                      <Link to={`/consultores/contactos?c=${contacto.id}`} className="text-[#9FC0CB] hover:text-[#EAF4F7]">Ficha contacto</Link>
                      {empresa && <Link to={`/consultores/empresas?e=${empresa.id}`} className="text-[#9FC0CB] hover:text-[#EAF4F7]">Ficha empresa</Link>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[['nombre', 'Nombre'], ['apellidos', 'Apellidos'], ['cargo', 'Cargo'], ['email', 'Correo'], ['telefono', 'Teléfono'], ['movil', 'Móvil'], ['empresa_nombre', 'Razón social'], ['nombre_comercial', 'Nombre comercial']].map(([k, l]) => (
                      <label key={k} className="block">
                        <span className="label !mb-0.5">{l}</span>
                        <input className="input !py-1 !text-[12px]" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={guardar} disabled={ocupado} className="btn-orange !px-3 !py-1 text-[11.5px] disabled:opacity-50">{ocupado ? 'Guardando…' : 'Guardar y marcar revisado'}</button>
                    <button type="button" onClick={() => setForm(null)} className="text-[11px] font-bold text-[#7FA7B4]">cancelar</button>
                  </div>
                </div>
              )}
              <ConsentimientoRgpd contacto={contacto} puedeEditar={puedeEditar} onCambio={recargar} compacto />
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[#CFE3E9]">{oferta.nombre || '—'} · {oferta.email || 'sin correo'}{oferta.cargo ? ` · ${oferta.cargo}` : ''}{oferta.telefono ? ` · ${oferta.telefono}` : ''}</p>
              {puedeEditar && <button type="button" onClick={anadirAlCrm} disabled={ocupado} className="btn-ghost !px-2.5 !py-1 text-[11.5px] disabled:opacity-50">{ocupado ? '…' : '＋ Añadir al CRM'}</button>}
            </div>
          )}
          {msg && <p className={`text-[11.5px] font-bold ${msg.err ? 'text-red-300' : 'text-emerald-300'}`}>{msg.t}</p>}
        </div>
      )}
    </div>
  );
}
