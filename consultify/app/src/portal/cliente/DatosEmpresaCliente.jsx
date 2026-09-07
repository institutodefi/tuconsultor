import { useEffect, useMemo, useState } from 'react';
import { supabase, DEMO } from '../../lib/supabase.js';
import { listTable, insertRow, updateRow, deleteRow, explicarErrorBd } from '../../lib/data.js';
import { NORMAS, NORMA_BY_ID } from '../../lib/calcEngine.js';
import { propuestasDesdeLecturas, filaCertificado, validarPropuesta } from '../../lib/certificadosIA.js';
import { aISO } from '../../lib/auditorias.js';

// ════════════════════════════════════════════════════════════════════════════
// MI EMPRESA · zona de clientes
//
// Lo que gestiona el propio cliente de su ficha, sin pedírnoslo por correo:
//   1. Datos de empresa (razón social, CIF, domicilio, actividad, plantilla,
//      representante…). Se guardan en `clientes` (columnas de la v125).
//   2. Sedes / centros de trabajo (`cliente_sedes`, v125).
//   3. Normas certificadas y sus alcances (`cliente_certificados`).
//
// Y el conector: «Proponer desde mis documentos» lee todo lo que ha subido
// (certificados, escrituras, CIF, memorias…) y propone datos, sedes y
// certificados. Nada se guarda solo: se marca lo que se quiere aplicar, se
// corrige lo que haga falta y se pulsa «Aplicar». La IA propone, la persona
// confirma.
// ════════════════════════════════════════════════════════════════════════════

// Fuera del componente, a propósito: dentro, React lo trataría como un tipo
// nuevo en cada renderizado y el campo perdería el foco al escribir.
function Campo({ id, etq, tipo = 'text', v, set, ancho = '', disabled = false, placeholder = '' }) {
  return (
    <div className={ancho}>
      <label className="label" htmlFor={id}>{etq}</label>
      <input id={id} type={tipo} className={`input !py-1.5 !text-[13px] ${disabled ? 'opacity-60' : ''}`} placeholder={placeholder}
        value={v ?? ''} disabled={disabled} onChange={(e) => set(e.target.value)} />
    </div>
  );
}

const Aviso = ({ msg }) => (msg ? (
  <p role={msg.err ? 'alert' : 'status'} className={`mt-3 rounded-lg px-3 py-2 text-[12.5px] font-bold ${msg.err ? 'bg-red-500/12 text-red-200' : 'bg-emerald-500/12 text-emerald-200'}`}>{msg.t}</p>
) : null);

const CAMPOS_EMPRESA = ['empresa', 'nombre_comercial', 'cif', 'actividad', 'sector', 'empleados', 'representante', 'telefono', 'email', 'web', 'direccion', 'cp', 'poblacion', 'provincia', 'pais'];
const ETQ = {
  empresa: 'Razón social', nombre_comercial: 'Nombre comercial', cif: 'CIF', actividad: 'Actividad', sector: 'Sector', empleados: 'Plantilla (personas)',
  representante: 'Representante legal', telefono: 'Teléfono', email: 'Correo de la empresa', web: 'Web',
  direccion: 'Dirección (domicilio social)', cp: 'Código postal', poblacion: 'Población', provincia: 'Provincia', pais: 'País',
};
const desdeCliente = (c) => Object.fromEntries(CAMPOS_EMPRESA.map((k) => [k, c?.[k] == null ? '' : String(c[k])]));
const SEDE_VACIA = () => ({ nombre: '', direccion: '', cp: '', poblacion: '', provincia: '', pais: 'España', actividad: '', principal: false, notas: '' });
const CERT_VACIO = () => ({ norma: '9001', entidad: '', numero: '', alcance: '', fecha_certificacion: '', fecha_validez: '', documento_id: '' });
const validezDesde = (iso) => { if (!iso) return ''; const d = new Date(`${iso}T12:00:00`); d.setFullYear(d.getFullYear() + 3); d.setDate(d.getDate() - 1); return aISO(d); };
const fmt = (iso) => (iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const nombreNorma = (id) => NORMA_BY_ID[id]?.nombre || id || '—';
const CONF = { alta: 'bg-emerald-500/20 text-emerald-200', media: 'bg-amber-400/20 text-amber-100', baja: 'bg-red-500/20 text-red-200' };
const errorMigracion = (e) => (/cliente_sedes|nombre_comercial|representante|could not find the '(direccion|cp|poblacion|provincia|pais|web|actividad|empleados|sector)'/i.test(String(e?.message || e)) ? ' Falta aplicar la migración v125 (datos de empresa y sedes).' : '');

async function llamar(payload) {
  const { data } = await supabase.auth.getSession();
  const r = await fetch('/api/documentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data?.session?.access_token || ''}` },
    body: JSON.stringify(payload),
  });
  return r.json();
}

// Lo que devolvería `proponer` en modo demostración: una lectura por documento.
function lecturasDemo(docs) {
  return docs.map((d) => (String(d.tipo).toLowerCase() === 'certificado'
    ? { documento: d, confianza: 'alta', datos: { tipo: 'certificado', norma: 'ISO 45001:2018', emisor: 'Bureau Veritas', numero: 'ES-045-2025', alcance: 'Diseño y fabricación de estructuras metálicas', razon_social: 'Industrias Norte, S.L.', cif: 'B12345678', valido_desde: '2025-03-01', valido_hasta: '2028-02-28', sedes: [{ direccion: 'C/ Mayor 1', cp: '28001', poblacion: 'Madrid', provincia: 'Madrid' }, { nombre: 'Planta de Getafe', direccion: 'Pol. Ind. Sur, nave 5', cp: '28906', poblacion: 'Getafe', provincia: 'Madrid', actividad: 'Fabricación' }], confianza: 'alta', avisos: ['Modo demo: datos de ejemplo'] } }
    : { documento: d, confianza: 'media', datos: { tipo: 'escritura', razon_social: 'INDUSTRIAS NORTE SL', cif: 'B12345678', domicilio: { direccion: 'C/ Mayor 1', cp: '28001', poblacion: 'Madrid', provincia: 'Madrid', pais: 'España' }, actividad: 'Fabricación de estructuras metálicas', representante: 'María López', empleados: 42, sedes: ['Avda. de la Industria 12, 28923 Alcorcón (Madrid)'], confianza: 'media', avisos: ['Modo demo: datos de ejemplo'] } }));
}

export default function DatosEmpresaCliente({ cliente, proyectoId = null, onGuardado }) {
  const clienteId = cliente?.id;
  const [f, setF] = useState(() => desdeCliente(cliente));
  useEffect(() => { setF(desdeCliente(cliente)); }, [cliente?.id]);
  const [msg, setMsg] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [sedes, setSedes] = useState([]);
  const [certs, setCerts] = useState([]);
  const [docs, setDocs] = useState([]);
  const [sinSedes, setSinSedes] = useState(false);
  const [formSede, setFormSede] = useState(null);
  const [formCert, setFormCert] = useState(null);
  const [msgSede, setMsgSede] = useState(null);
  const [msgCert, setMsgCert] = useState(null);

  // Conector IA
  const [leyendo, setLeyendo] = useState(false);
  const [prop, setProp] = useState(null);      // propuestasDesdeLecturas(...) + marcas
  const [msgIA, setMsgIA] = useState(null);
  const [aplicando, setAplicando] = useState(false);

  const cargar = async () => {
    if (!clienteId) return;
    const [s, c, d] = await Promise.all([
      listTable('cliente_sedes').catch(() => null),
      listTable('cliente_certificados').catch(() => []),
      listTable('cliente_documentos').catch(() => []),
    ]);
    setSinSedes(s === null);
    const mio = (x) => String(x.cliente_id) === String(clienteId);
    setSedes((s || []).filter(mio).sort((a, b) => Number(b.principal) - Number(a.principal) || String(a.creado || '').localeCompare(String(b.creado || ''))));
    setCerts((c || []).filter(mio).sort((a, b) => String(a.norma).localeCompare(String(b.norma))));
    setDocs((d || []).filter(mio));
  };
  useEffect(() => { cargar(); }, [clienteId]);

  const docDe = (id) => docs.find((x) => String(x.id) === String(id));

  // ── 1 · Datos de empresa ────────────────────────────────────────────────
  async function guardarEmpresa() {
    if (!f.empresa.trim()) { setMsg({ err: true, t: 'La razón social no puede quedar vacía.' }); return; }
    setGuardando(true); setMsg(null);
    try {
      const patch = {};
      for (const k of CAMPOS_EMPRESA) {
        const v = f[k].trim();
        patch[k] = k === 'empleados' ? (v ? Math.max(0, Math.round(Number(v.replace(',', '.')) || 0)) : null) : (v || null);
      }
      await updateRow('clientes', clienteId, patch);
      setMsg({ err: false, t: 'Datos de empresa guardados. Tu consultor los ve al momento.' });
      onGuardado?.();
    } catch (e) { setMsg({ err: true, t: `No se pudo guardar: ${explicarErrorBd(e, 'clientes')}${errorMigracion(e)}` }); }
    finally { setGuardando(false); }
  }

  // ── 2 · Sedes ───────────────────────────────────────────────────────────
  async function guardarSede() {
    const s = formSede;
    if (!s.direccion.trim() && !s.nombre.trim() && !s.poblacion.trim()) { setMsgSede({ err: true, t: 'Pon al menos el nombre, la dirección o la población.' }); return; }
    setMsgSede(null);
    try {
      const fila = { cliente_id: clienteId, nombre: s.nombre.trim() || null, direccion: s.direccion.trim() || null, cp: s.cp.trim() || null, poblacion: s.poblacion.trim() || null, provincia: s.provincia.trim() || null, pais: s.pais.trim() || 'España', actividad: s.actividad.trim() || null, principal: !!s.principal, notas: s.notas?.trim() || null, origen: s.origen || 'manual', documento_id: s.documento_id || null };
      if (s.id) await updateRow('cliente_sedes', s.id, fila); else await insertRow('cliente_sedes', fila);
      if (fila.principal) for (const o of sedes) if (o.principal && String(o.id) !== String(s.id)) await updateRow('cliente_sedes', o.id, { principal: false }).catch(() => {});
      setFormSede(null); await cargar(); onGuardado?.();
    } catch (e) { setMsgSede({ err: true, t: `No se pudo guardar: ${explicarErrorBd(e, 'cliente_sedes')}${errorMigracion(e)}` }); }
  }
  async function borrarSede(s) {
    if (!window.confirm(`¿Quitar la sede «${s.nombre || s.direccion || s.poblacion}»?`)) return;
    try { await deleteRow('cliente_sedes', s.id); await cargar(); onGuardado?.(); }
    catch (e) { setMsgSede({ err: true, t: `No se pudo quitar: ${e?.message || e}` }); }
  }

  // ── 3 · Normas certificadas y alcances ──────────────────────────────────
  async function guardarCert() {
    const c = formCert;
    if (!c.norma) { setMsgCert({ err: true, t: 'Indica la norma.' }); return; }
    if (c.fecha_certificacion && c.fecha_validez && c.fecha_validez < c.fecha_certificacion) { setMsgCert({ err: true, t: 'La validez no puede ser anterior a la certificación.' }); return; }
    setMsgCert(null);
    try {
      const fila = { cliente_id: clienteId, proyecto_id: proyectoId || null, norma: c.norma, entidad: c.entidad.trim() || null, numero: c.numero.trim() || null, alcance: c.alcance.trim() || null, fecha_certificacion: c.fecha_certificacion || null, fecha_validez: c.fecha_validez || null, documento_id: c.documento_id || null };
      if (c.id) await updateRow('cliente_certificados', c.id, fila); else await insertRow('cliente_certificados', fila);
      setFormCert(null); await cargar(); onGuardado?.();
    } catch (e) { setMsgCert({ err: true, t: `No se pudo guardar: ${explicarErrorBd(e, 'cliente_certificados')}` }); }
  }
  async function borrarCert(c) {
    if (!window.confirm(`¿Quitar el certificado ${nombreNorma(c.norma)}?`)) return;
    try { await deleteRow('cliente_certificados', c.id); await cargar(); onGuardado?.(); }
    catch (e) { setMsgCert({ err: true, t: `No se pudo quitar: ${e?.message || e}` }); }
  }

  // ── Conector IA: proponer desde los documentos ──────────────────────────
  async function proponer() {
    if (!docs.length) { setMsgIA({ err: true, t: 'Aún no has subido documentos. Sube certificados, escrituras, el CIF o memorias en «Mis documentos» y vuelve a probar.' }); return; }
    setLeyendo(true); setMsgIA(null); setProp(null);
    try {
      let lecturas;
      if (DEMO) { await new Promise((r) => setTimeout(r, 400)); lecturas = lecturasDemo(docs); }
      else {
        const j = await llamar({ action: 'proponer', cliente_id: clienteId });
        if (!j?.ok) throw new Error(j?.error || 'Sin respuesta del lector de documentos.');
        lecturas = j.documentos || [];
      }
      const p = propuestasDesdeLecturas(lecturas, { cliente: { ...cliente, ...Object.fromEntries(CAMPOS_EMPRESA.map((k) => [k, f[k]])) }, sedes, certificados: certs });
      const leidas = lecturas.filter((l) => l.datos).length;
      setProp({
        empresa: Object.entries(p.empresa).filter(([k]) => CAMPOS_EMPRESA.includes(k)).map(([campo, x]) => ({ campo, ...x, marcado: x.cambia })),
        sedes: p.sedes.map((s) => ({ ...s, marcado: !s.yaExiste })),
        certificados: p.certificados.map((c) => ({ ...c, marcado: true, cliente_id: clienteId, proyecto_id: proyectoId || null })),
        leidas, total: lecturas.length,
      });
      if (!leidas) setMsgIA({ err: true, t: 'No se ha podido leer ningún documento (solo se leen PDF e imágenes).' });
    } catch (e) { setMsgIA({ err: true, t: `No se pudo leer: ${e?.message || e}` }); }
    finally { setLeyendo(false); }
  }
  const setPropEmpresa = (i, patch) => setProp((p) => ({ ...p, empresa: p.empresa.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const setPropSede = (i, patch) => setProp((p) => ({ ...p, sedes: p.sedes.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const setPropCert = (i, patch) => setProp((p) => ({ ...p, certificados: p.certificados.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const nMarcados = prop ? prop.empresa.filter((x) => x.marcado).length + prop.sedes.filter((x) => x.marcado).length + prop.certificados.filter((x) => x.marcado).length : 0;

  async function aplicar() {
    if (!prop || !nMarcados) return;
    setAplicando(true); setMsgIA(null);
    const hecho = []; const errores = [];
    try {
      const campos = prop.empresa.filter((x) => x.marcado);
      if (campos.length) {
        const patch = {};
        for (const x of campos) patch[x.campo] = x.campo === 'empleados' ? (Math.round(Number(x.valor)) || null) : (String(x.valor).trim() || null);
        try { await updateRow('clientes', clienteId, patch); setF((prev) => ({ ...prev, ...Object.fromEntries(campos.map((x) => [x.campo, String(x.valor)])) })); hecho.push(`${campos.length} dato${campos.length === 1 ? '' : 's'} de empresa`); }
        catch (e) { errores.push(`datos de empresa: ${explicarErrorBd(e, 'clientes')}${errorMigracion(e)}`); }
      }
      let nS = 0;
      for (const s of prop.sedes.filter((x) => x.marcado)) {
        try { await insertRow('cliente_sedes', { cliente_id: clienteId, nombre: s.nombre || null, direccion: s.direccion || null, cp: s.cp || null, poblacion: s.poblacion || null, provincia: s.provincia || null, pais: s.pais || 'España', actividad: s.actividad || null, principal: false, origen: 'ia', documento_id: s.documento_id || null, notas: s.fuente ? `Propuesta desde «${s.fuente}» y confirmada.` : null }); nS++; }
        catch (e) { errores.push(`sede ${s.direccion || s.nombre}: ${explicarErrorBd(e, 'cliente_sedes')}${errorMigracion(e)}`); }
      }
      if (nS) hecho.push(`${nS} sede${nS === 1 ? '' : 's'}`);
      let nC = 0;
      for (const c of prop.certificados.filter((x) => x.marcado)) {
        const errs = validarPropuesta(c);
        if (errs.length) { errores.push(`certificado ${c.fuente}: falta ${errs.join(', ')}`); continue; }
        try {
          const fila = filaCertificado(c);
          if (c.existente?.id) await updateRow('cliente_certificados', c.existente.id, fila); else await insertRow('cliente_certificados', fila);
          nC++;
        } catch (e) { errores.push(`certificado ${nombreNorma(c.norma)}: ${explicarErrorBd(e, 'cliente_certificados')}`); }
      }
      if (nC) hecho.push(`${nC} certificado${nC === 1 ? '' : 's'}`);
      await cargar(); onGuardado?.();
      setProp(null);
      setMsgIA({ err: errores.length > 0, t: `${hecho.length ? `Aplicado: ${hecho.join(', ')}.` : 'Nada aplicado.'}${errores.length ? ` Con errores: ${errores.join(' · ')}` : ''}` });
    } finally { setAplicando(false); }
  }

  const sedePrincipalTexto = useMemo(() => [f.direccion, f.cp, f.poblacion].filter(Boolean).join(', '), [f]);

  if (!clienteId) {
    return <section className="card"><p className="text-[12.5px] text-[#9FC0CB]">Tu usuario todavía no está enlazado a una ficha de cliente. Escríbenos y lo enlazamos en un minuto.</p></section>;
  }

  return (
    <div className="space-y-4">
      {/* ── Conector IA ── */}
      <section className="card border-brand-orange/30">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-[#EAF4F7]">✦ Completar desde mis documentos</h2>
            <p className="mt-0.5 text-[11.5px] text-[#7FA7B4]">
              Leemos lo que has subido (certificados, escrituras, CIF, memorias…) y te proponemos datos de empresa, sedes y normas certificadas con su alcance.
              Nada se guarda solo: revisa, corrige y aplica lo que quieras. Cuantos más documentos subas, más información podremos completar.
            </p>
          </div>
          <button type="button" onClick={proponer} disabled={leyendo} className="btn-orange !px-4 !py-1.5 text-xs disabled:opacity-50">
            {leyendo ? 'Leyendo documentos…' : `Proponer desde mis documentos (${docs.length})`}
          </button>
        </div>
        <Aviso msg={msgIA} />
        {prop && (
          <div className="mt-3 space-y-3">
            <p className="text-[11.5px] font-bold text-[#9FC0CB]">Leídos {prop.leidas} de {prop.total} documentos. Marca lo que quieras aplicar (lo que ya coincide con tu ficha viene desmarcado).</p>

            {prop.empresa.length > 0 && (
              <div className="rounded-xl border border-[#1E5468] bg-[#0B2E3D] p-3">
                <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#9FC0CB]">Datos de empresa</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {prop.empresa.map((x, i) => (
                    <label key={x.campo} className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 ${x.marcado ? 'border-brand-verde/50 bg-brand-verde/[0.08]' : 'border-[#1E5468]'}`}>
                      <input type="checkbox" className="mt-1" checked={x.marcado} onChange={(e) => setPropEmpresa(i, { marcado: e.target.checked })} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10.5px] font-bold text-[#7FA7B4]">{ETQ[x.campo]}{x.cambia ? '' : ' · ya coincide'}</span>
                        <input className="input mt-0.5 !py-1 !text-[12.5px]" value={x.valor} onChange={(e) => setPropEmpresa(i, { valor: e.target.value, marcado: true })} />
                        <span className="mt-0.5 block text-[10px] text-[#7FA7B4]">{x.actual ? `Ahora: ${x.actual} · ` : ''}de {x.fuentes.filter(Boolean).join(', ') || 'documento'}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {prop.sedes.length > 0 && (
              <div className="rounded-xl border border-[#1E5468] bg-[#0B2E3D] p-3">
                <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#9FC0CB]">Sedes encontradas</p>
                <div className="mt-2 space-y-2">
                  {prop.sedes.map((s, i) => (
                    <div key={i} className={`rounded-lg border px-2.5 py-2 ${s.marcado ? 'border-brand-verde/50 bg-brand-verde/[0.08]' : 'border-[#1E5468]'}`}>
                      <label className="flex items-center gap-2 text-[12px] font-bold text-[#EAF4F7]">
                        <input type="checkbox" checked={s.marcado} onChange={(e) => setPropSede(i, { marcado: e.target.checked })} />
                        {s.yaExiste ? 'Ya está en tus sedes' : 'Nueva sede'} <span className="font-medium text-[#7FA7B4]">· de {s.fuente || 'documento'}</span>
                      </label>
                      <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
                        <input className="input !py-1 !text-[12.5px]" placeholder="Nombre" value={s.nombre || ''} onChange={(e) => setPropSede(i, { nombre: e.target.value })} />
                        <input className="input !py-1 !text-[12.5px] sm:col-span-2" placeholder="Dirección" value={s.direccion || ''} onChange={(e) => setPropSede(i, { direccion: e.target.value })} />
                        <input className="input !py-1 !text-[12.5px]" placeholder="CP" value={s.cp || ''} onChange={(e) => setPropSede(i, { cp: e.target.value })} />
                        <input className="input !py-1 !text-[12.5px]" placeholder="Población" value={s.poblacion || ''} onChange={(e) => setPropSede(i, { poblacion: e.target.value })} />
                        <input className="input !py-1 !text-[12.5px]" placeholder="Provincia" value={s.provincia || ''} onChange={(e) => setPropSede(i, { provincia: e.target.value })} />
                        <input className="input !py-1 !text-[12.5px]" placeholder="País" value={s.pais || ''} onChange={(e) => setPropSede(i, { pais: e.target.value })} />
                        <input className="input !py-1 !text-[12.5px] sm:col-span-2" placeholder="Actividad en esta sede" value={s.actividad || ''} onChange={(e) => setPropSede(i, { actividad: e.target.value })} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {prop.certificados.length > 0 && (
              <div className="rounded-xl border border-[#1E5468] bg-[#0B2E3D] p-3">
                <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#9FC0CB]">Normas certificadas y alcances</p>
                <div className="mt-2 space-y-2">
                  {prop.certificados.map((c, i) => (
                    <div key={i} className={`rounded-lg border px-2.5 py-2 ${c.marcado ? 'border-brand-verde/50 bg-brand-verde/[0.08]' : 'border-[#1E5468]'}`}>
                      <label className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-[#EAF4F7]">
                        <input type="checkbox" checked={c.marcado} onChange={(e) => setPropCert(i, { marcado: e.target.checked })} />
                        {c.existente ? `Actualizar ${nombreNorma(c.existente.norma)}` : 'Nuevo certificado'}
                        <span className={`chip !px-2 !py-0 text-[10px] ${CONF[c.confianza] || ''}`}>confianza {c.confianza}</span>
                        <span className="font-medium text-[#7FA7B4]">· de {c.fuente || 'documento'}</span>
                      </label>
                      {c.avisos?.length > 0 && <p className="mt-1 text-[10.5px] text-amber-100">{c.avisos.join(' · ')}</p>}
                      <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
                        <select className="input !py-1 !text-[12.5px]" value={c.norma} onChange={(e) => setPropCert(i, { norma: e.target.value })}>
                          <option value="">— norma —</option>
                          {NORMAS.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                          {c.norma && !NORMA_BY_ID[c.norma] && <option value={c.norma}>{c.norma}</option>}
                        </select>
                        <input className="input !py-1 !text-[12.5px]" placeholder="Entidad certificadora" value={c.entidad} onChange={(e) => setPropCert(i, { entidad: e.target.value })} />
                        <input className="input !py-1 !text-[12.5px]" placeholder="Nº de certificado" value={c.numero} onChange={(e) => setPropCert(i, { numero: e.target.value })} />
                        <input className="input !py-1 !text-[12.5px] sm:col-span-3" placeholder="Alcance" value={c.alcance} onChange={(e) => setPropCert(i, { alcance: e.target.value })} />
                        <div><span className="block text-[10px] text-[#7FA7B4]">Certificación</span><input type="date" className="input !py-1 !text-[12.5px]" value={c.fecha_certificacion} onChange={(e) => setPropCert(i, { fecha_certificacion: e.target.value })} /></div>
                        <div><span className="block text-[10px] text-[#7FA7B4]">Válido hasta</span><input type="date" className="input !py-1 !text-[12.5px]" value={c.fecha_validez} onChange={(e) => setPropCert(i, { fecha_validez: e.target.value })} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!prop.empresa.length && !prop.sedes.length && !prop.certificados.length && <p className="text-[12px] text-[#9FC0CB]">No se ha encontrado nada nuevo en los documentos.</p>}

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={aplicar} disabled={aplicando || !nMarcados} className="btn-orange !px-4 !py-1.5 text-xs disabled:opacity-50">{aplicando ? 'Aplicando…' : `Aplicar lo marcado (${nMarcados})`}</button>
              <button type="button" onClick={() => setProp(null)} className="btn-ghost !px-3 !py-1.5 text-xs">Descartar</button>
            </div>
          </div>
        )}
      </section>

      {/* ── 1 · Datos de empresa ── */}
      <section className="card">
        <h2 className="text-sm font-extrabold text-[#EAF4F7]">Datos de empresa</h2>
        <p className="mt-0.5 text-[11.5px] text-[#7FA7B4]">Los de tu ficha de cliente. Puedes corregirlos aquí; tu consultor los ve al momento.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo id="de-empresa" etq={ETQ.empresa} v={f.empresa} set={(x) => setF({ ...f, empresa: x })} />
          <Campo id="de-nc" etq={ETQ.nombre_comercial} v={f.nombre_comercial} set={(x) => setF({ ...f, nombre_comercial: x })} />
          <Campo id="de-cif" etq={ETQ.cif} v={f.cif} set={(x) => setF({ ...f, cif: x })} />
          <Campo id="de-act" etq={ETQ.actividad} v={f.actividad} set={(x) => setF({ ...f, actividad: x })} ancho="sm:col-span-2" />
          <Campo id="de-sector" etq={ETQ.sector} v={f.sector} set={(x) => setF({ ...f, sector: x })} />
          <Campo id="de-emp" etq={ETQ.empleados} tipo="number" v={f.empleados} set={(x) => setF({ ...f, empleados: x })} />
          <Campo id="de-rep" etq={ETQ.representante} v={f.representante} set={(x) => setF({ ...f, representante: x })} />
          <Campo id="de-tel" etq={ETQ.telefono} tipo="tel" v={f.telefono} set={(x) => setF({ ...f, telefono: x })} />
          <Campo id="de-email" etq={ETQ.email} tipo="email" v={f.email} set={(x) => setF({ ...f, email: x })} />
          <Campo id="de-web" etq={ETQ.web} v={f.web} set={(x) => setF({ ...f, web: x })} placeholder="https://" />
          <Campo id="de-dir" etq={ETQ.direccion} v={f.direccion} set={(x) => setF({ ...f, direccion: x })} ancho="sm:col-span-2 lg:col-span-3" />
          <Campo id="de-cp" etq={ETQ.cp} v={f.cp} set={(x) => setF({ ...f, cp: x })} />
          <Campo id="de-pob" etq={ETQ.poblacion} v={f.poblacion} set={(x) => setF({ ...f, poblacion: x })} />
          <Campo id="de-prov" etq={ETQ.provincia} v={f.provincia} set={(x) => setF({ ...f, provincia: x })} />
          <Campo id="de-pais" etq={ETQ.pais} v={f.pais} set={(x) => setF({ ...f, pais: x })} placeholder="España" />
        </div>
        <Aviso msg={msg} />
        <button onClick={guardarEmpresa} disabled={guardando} className="btn-orange mt-3 !px-4 !py-1.5 text-xs disabled:opacity-50">{guardando ? 'Guardando…' : 'Guardar datos de empresa'}</button>
      </section>

      {/* ── 2 · Sedes ── */}
      <section className="card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-[#EAF4F7]">Sedes y centros de trabajo · {sedes.length}</h2>
            <p className="mt-0.5 text-[11.5px] text-[#7FA7B4]">Cada centro que entra en el alcance de tus sistemas de gestión.{sedePrincipalTexto ? ` Domicilio social: ${sedePrincipalTexto}.` : ''}</p>
          </div>
          {!formSede && <button type="button" onClick={() => setFormSede(SEDE_VACIA())} disabled={sinSedes} className="btn-ghost !px-3 !py-1 text-[12px] disabled:opacity-50">+ Añadir sede</button>}
        </div>
        {sinSedes && <p className="mt-2 text-[12px] font-bold text-amber-100">Las sedes se activan al aplicar la migración v125.</p>}
        {sedes.length > 0 && (
          <ul className="mt-3 divide-y divide-[#1E5468]/60">
            {sedes.map((s) => (
              <li key={s.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-[#EAF4F7]">{s.nombre || s.direccion || s.poblacion}{s.principal && <span className="chip ml-2 bg-brand-verde/20 !px-2 !py-0 text-[10px] text-brand-verdeTexto">principal</span>}{s.origen === 'ia' && <span className="chip ml-1 bg-[#123F52] !px-2 !py-0 text-[10px] text-[#9FC0CB]">✦ desde documentos</span>}</p>
                  <p className="text-[11.5px] text-[#9FC0CB]">{[s.nombre ? s.direccion : null, s.cp, s.poblacion, s.provincia, s.pais && s.pais !== 'España' ? s.pais : null].filter(Boolean).join(', ')}{s.actividad ? ` · ${s.actividad}` : ''}</p>
                </div>
                <div className="flex gap-2 text-[11.5px] font-bold">
                  <button type="button" onClick={() => setFormSede({ ...SEDE_VACIA(), ...s })} className="text-brand-orange hover:underline">Editar</button>
                  <button type="button" onClick={() => borrarSede(s)} className="text-[#7FA7B4] hover:text-red-300">Quitar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!sedes.length && !sinSedes && !formSede && <p className="mt-2 text-[12px] text-[#9FC0CB]">Sin sedes registradas. Añádelas a mano o propónlas desde tus documentos.</p>}
        {formSede && (
          <div className="mt-3 rounded-xl border border-[#1E5468] bg-[#0B2E3D] p-3">
            <p className="text-[12px] font-extrabold text-[#EAF4F7]">{formSede.id ? 'Editar sede' : 'Nueva sede'}</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <Campo id="sd-nombre" etq="Nombre (p. ej. Planta de Getafe)" v={formSede.nombre} set={(x) => setFormSede({ ...formSede, nombre: x })} />
              <Campo id="sd-dir" etq="Dirección" v={formSede.direccion} set={(x) => setFormSede({ ...formSede, direccion: x })} ancho="sm:col-span-2" />
              <Campo id="sd-cp" etq="Código postal" v={formSede.cp} set={(x) => setFormSede({ ...formSede, cp: x })} />
              <Campo id="sd-pob" etq="Población" v={formSede.poblacion} set={(x) => setFormSede({ ...formSede, poblacion: x })} />
              <Campo id="sd-prov" etq="Provincia" v={formSede.provincia} set={(x) => setFormSede({ ...formSede, provincia: x })} />
              <Campo id="sd-pais" etq="País" v={formSede.pais} set={(x) => setFormSede({ ...formSede, pais: x })} />
              <Campo id="sd-act" etq="Actividad en esta sede" v={formSede.actividad} set={(x) => setFormSede({ ...formSede, actividad: x })} ancho="sm:col-span-2" />
              <label className="flex items-center gap-2 text-[12.5px] font-bold text-[#EAF4F7] sm:col-span-3">
                <input type="checkbox" checked={!!formSede.principal} onChange={(e) => setFormSede({ ...formSede, principal: e.target.checked })} /> Es la sede principal
              </label>
            </div>
            <Aviso msg={msgSede} />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={guardarSede} className="btn-orange !px-4 !py-1.5 text-xs">Guardar sede</button>
              <button type="button" onClick={() => { setFormSede(null); setMsgSede(null); }} className="btn-ghost !px-3 !py-1.5 text-xs">Cancelar</button>
            </div>
          </div>
        )}
        {!formSede && <Aviso msg={msgSede} />}
      </section>

      {/* ── 3 · Normas certificadas y alcances ── */}
      <section className="card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-extrabold text-[#EAF4F7]">Normas certificadas y alcances · {certs.length}</h2>
            <p className="mt-0.5 text-[11.5px] text-[#7FA7B4]">Cada certificado en vigor con su entidad, alcance y fechas. De aquí salen los avisos de auditoría y renovación.</p>
          </div>
          {!formCert && <button type="button" onClick={() => setFormCert(CERT_VACIO())} className="btn-ghost !px-3 !py-1 text-[12px]">+ Añadir norma certificada</button>}
        </div>
        {certs.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead><tr className="text-[10.5px] uppercase tracking-wide text-[#7FA7B4]"><th className="pb-1 pr-2">Norma</th><th className="pb-1 pr-2">Entidad</th><th className="pb-1 pr-2">Alcance</th><th className="pb-1 pr-2">Certificación</th><th className="pb-1 pr-2">Válido hasta</th><th className="pb-1" /></tr></thead>
              <tbody className="divide-y divide-[#1E5468]/60">
                {certs.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 pr-2 font-bold text-[#EAF4F7]">{nombreNorma(c.norma)}{c.numero && <span className="block text-[10.5px] font-medium text-[#7FA7B4]">{c.numero}</span>}</td>
                    <td className="py-2 pr-2 text-[#CFE3E9]">{c.entidad || '—'}</td>
                    <td className="max-w-[28ch] py-2 pr-2 text-[#CFE3E9]"><span className="line-clamp-2" title={c.alcance || ''}>{c.alcance || '—'}</span>{c.documento_id && docDe(c.documento_id) && <span className="block text-[10.5px] text-[#7FA7B4]">📎 {docDe(c.documento_id).titulo}</span>}</td>
                    <td className="py-2 pr-2 text-[#CFE3E9]">{fmt(c.fecha_certificacion)}</td>
                    <td className="py-2 pr-2 text-[#CFE3E9]">{fmt(c.fecha_validez)}</td>
                    <td className="py-2 text-right text-[11.5px] font-bold">
                      <button type="button" onClick={() => setFormCert({ ...CERT_VACIO(), ...c, entidad: c.entidad || '', numero: c.numero || '', alcance: c.alcance || '', fecha_certificacion: c.fecha_certificacion || '', fecha_validez: c.fecha_validez || '', documento_id: c.documento_id || '' })} className="text-brand-orange hover:underline">Editar</button>
                      <button type="button" onClick={() => borrarCert(c)} className="ml-2 text-[#7FA7B4] hover:text-red-300">Quitar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!certs.length && !formCert && <p className="mt-2 text-[12px] text-[#9FC0CB]">Sin certificados registrados. Añádelos a mano o sube el certificado en «Mis documentos» y propónlo desde ahí.</p>}
        {formCert && (
          <div className="mt-3 rounded-xl border border-[#1E5468] bg-[#0B2E3D] p-3">
            <p className="text-[12px] font-extrabold text-[#EAF4F7]">{formCert.id ? 'Editar certificado' : 'Nueva norma certificada'}</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="ct-norma">Norma</label>
                <select id="ct-norma" className="input !py-1.5 !text-[13px]" value={formCert.norma} onChange={(e) => setFormCert({ ...formCert, norma: e.target.value })}>
                  {NORMAS.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                  {formCert.norma && !NORMA_BY_ID[formCert.norma] && <option value={formCert.norma}>{formCert.norma}</option>}
                </select>
              </div>
              <Campo id="ct-ent" etq="Entidad certificadora" v={formCert.entidad} set={(x) => setFormCert({ ...formCert, entidad: x })} />
              <Campo id="ct-num" etq="Nº de certificado" v={formCert.numero} set={(x) => setFormCert({ ...formCert, numero: x })} />
              <div className="sm:col-span-3">
                <label className="label" htmlFor="ct-alc">Alcance (tal como figura en el certificado)</label>
                <textarea id="ct-alc" rows={2} className="input !py-1.5 !text-[13px]" value={formCert.alcance} onChange={(e) => setFormCert({ ...formCert, alcance: e.target.value })} />
              </div>
              <Campo id="ct-fc" etq="Fecha de certificación" tipo="date" v={formCert.fecha_certificacion} set={(x) => setFormCert({ ...formCert, fecha_certificacion: x, fecha_validez: formCert.fecha_validez || validezDesde(x) })} />
              <Campo id="ct-fv" etq="Válido hasta" tipo="date" v={formCert.fecha_validez} set={(x) => setFormCert({ ...formCert, fecha_validez: x })} />
              <div>
                <label className="label" htmlFor="ct-doc">Documento (el PDF del certificado)</label>
                <select id="ct-doc" className="input !py-1.5 !text-[13px]" value={formCert.documento_id} onChange={(e) => setFormCert({ ...formCert, documento_id: e.target.value })}>
                  <option value="">— sin enlazar —</option>
                  {docs.map((d) => <option key={d.id} value={d.id}>{d.titulo}</option>)}
                </select>
              </div>
            </div>
            <Aviso msg={msgCert} />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={guardarCert} className="btn-orange !px-4 !py-1.5 text-xs">Guardar certificado</button>
              <button type="button" onClick={() => { setFormCert(null); setMsgCert(null); }} className="btn-ghost !px-3 !py-1.5 text-xs">Cancelar</button>
            </div>
          </div>
        )}
        {!formCert && <Aviso msg={msgCert} />}
      </section>
    </div>
  );
}
