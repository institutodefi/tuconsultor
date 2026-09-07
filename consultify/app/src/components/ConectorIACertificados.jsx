import { useEffect, useMemo, useState } from 'react';
import { listTable, insertRow, updateRow, explicarErrorBd } from '../lib/data.js';
import { supabase, DEMO } from '../lib/supabase.js';
import { NORMAS, NORMA_BY_ID } from '../lib/calcEngine.js';
import { pareceCertificado, propuestaDesdeNota, certificadoExistente, filaCertificado, validarPropuesta } from '../lib/certificadosIA.js';
import { proximaAuditoriaDeCertificado, fmt } from '../lib/auditorias.js';

// ════════════════════════════════════════════════════════════════════════════
// CONECTOR DE IA · leer los certificados de los documentos del cliente
//
// En la planificación de auditorías, en vez de teclear cada certificado: se
// elige el cliente, se marcan sus documentos (los que parecen certificados
// vienen marcados), la IA los lee (la misma que analiza documentos en la
// ficha: netlify/functions/documentos.mjs, acción `analizar`) y propone una
// fila por certificado: norma, entidad, número, alcance, fechas y la próxima
// auditoría estimada.
//
// Nada se guarda solo. Cada propuesta se revisa —se puede corregir campo a
// campo— y se guarda con un botón: la IA propone, la persona confirma. Si ya
// hay un certificado de esa norma para el cliente, se actualiza; si no, se
// crea. Si el documento ya tenía nota de la IA, se reutiliza sin volver a
// leerlo.
// ════════════════════════════════════════════════════════════════════════════

async function llamar(payload) {
  const { data } = await supabase.auth.getSession();
  const r = await fetch('/api/documentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data?.session?.access_token || ''}` },
    body: JSON.stringify(payload),
  });
  return r.json();
}

const CONF = { alta: 'bg-emerald-500/20 text-emerald-200', media: 'bg-amber-400/20 text-amber-100', baja: 'bg-red-500/20 text-red-200' };
const hoyISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export default function ConectorIACertificados({ clientes = [], nombreCliente = (c) => c?.empresa || '—', onGuardado }) {
  const [abierto, setAbierto] = useState(false);
  const [clienteId, setClienteId] = useState('');
  const [docs, setDocs] = useState([]);
  const [notas, setNotas] = useState({});
  const [certs, setCerts] = useState([]);
  const [marcados, setMarcados] = useState(new Set());
  const [leyendo, setLeyendo] = useState(null);      // {i, n}
  const [propuestas, setPropuestas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!abierto) return;
    Promise.all([
      listTable('cliente_documentos').catch(() => []),
      listTable('documento_notas').catch(() => []),
      listTable('cliente_certificados').catch(() => []),
    ]).then(([d, n, c]) => {
      setDocs(d || []); setCerts(c || []);
      setNotas(Object.fromEntries((n || []).map((x) => [String(x.documento_id), x])));
    });
  }, [abierto]);

  const clientesConDocs = useMemo(() => {
    const ids = new Set(docs.map((d) => String(d.cliente_id)));
    return clientes.filter((c) => ids.has(String(c.id))).sort((a, b) => nombreCliente(a).localeCompare(nombreCliente(b)));
  }, [clientes, docs, nombreCliente]);

  const docsCliente = useMemo(() => docs.filter((d) => String(d.cliente_id) === String(clienteId)), [docs, clienteId]);
  useEffect(() => { setMarcados(new Set(docsCliente.filter(pareceCertificado).map((d) => String(d.id)))); setPropuestas([]); setMsg(null); }, [clienteId, docsCliente.length]);   // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id) => setMarcados((m) => { const s = new Set(m); if (s.has(id)) s.delete(id); else s.add(id); return s; });

  async function leer() {
    const lista = docsCliente.filter((d) => marcados.has(String(d.id)));
    if (!lista.length) { setMsg({ err: true, t: 'Marca al menos un documento.' }); return; }
    setMsg(null); setPropuestas([]);
    const out = [];
    for (let i = 0; i < lista.length; i++) {
      const d = lista[i];
      setLeyendo({ i: i + 1, n: lista.length, titulo: d.titulo });
      let datos = notas[String(d.id)]?.datos || null;
      let error = null;
      if (!datos || !datos.norma) {
        if (DEMO) {
          datos = { tipo: 'certificado', norma: 'ISO 9001:2015', emisor: 'AENOR', numero: 'ER-0000/2025', alcance: 'Alcance de demostración', valido_desde: '2025-03-01', valido_hasta: '2028-02-28', confianza: 'media', avisos: ['Modo demo: datos de ejemplo'] };
        } else {
          try {
            const j = await llamar({ action: 'analizar', documento_id: d.id });
            if (j?.ok) datos = j.nota?.datos || null; else error = j?.error || 'sin respuesta';
          } catch (e) { error = e.message; }
        }
      }
      const p = datos ? propuestaDesdeNota(d, datos) : null;
      out.push({
        clave: String(d.id), doc: d, incluir: !!p && !error,
        error, sinCertificado: !p && !error,
        ...(p || { cliente_id: d.cliente_id, documento_id: d.id, norma: '', entidad: '', numero: '', alcance: '', fecha_certificacion: '', fecha_validez: '', confianza: 'baja', avisos: [] }),
      });
    }
    setLeyendo(null);
    setPropuestas(out);
    if (!out.some((p) => p.incluir)) setMsg({ err: true, t: 'La IA no ha encontrado ningún certificado en esos documentos.' });
  }

  const editar = (clave, campo, valor) => setPropuestas((ps) => ps.map((p) => (p.clave === clave ? { ...p, [campo]: valor } : p)));

  async function guardar() {
    const aGuardar = propuestas.filter((p) => p.incluir);
    const conError = aGuardar.map((p) => ({ p, e: validarPropuesta(p) })).filter((x) => x.e.length);
    if (conError.length) { setMsg({ err: true, t: `Revisa antes de guardar: ${conError.map((x) => `«${x.p.doc.titulo}»: ${x.e.join(', ')}`).join(' · ')}` }); return; }
    setGuardando(true); setMsg(null);
    let creados = 0, actualizados = 0;
    try {
      for (const p of aGuardar) {
        const fila = filaCertificado(p);
        const ex = certificadoExistente(p, certs);
        if (ex) { await updateRow('cliente_certificados', ex.id, fila); actualizados++; }
        else { await insertRow('cliente_certificados', fila); creados++; }
      }
      setMsg({ err: false, t: `Guardado: ${creados} certificado(s) nuevo(s), ${actualizados} actualizado(s). La planificación ya los tiene en cuenta.` });
      setPropuestas([]);
      onGuardado?.();
      const c = await listTable('cliente_certificados').catch(() => []); setCerts(c || []);
    } catch (e) { setMsg({ err: true, t: explicarErrorBd(e, 'cliente_certificados') }); }
    finally { setGuardando(false); }
  }

  const hoy = hoyISO();
  const nIncluidas = propuestas.filter((p) => p.incluir).length;

  return (
    <div className="card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <button onClick={() => setAbierto((v) => !v)} className="text-left">
          <h2 className="text-[15px] font-extrabold text-[#EAF4F7]">{abierto ? '▾' : '▸'} ✦ Leer certificados con IA</h2>
          <p className="mt-0.5 text-[11.5px] text-[#7FA7B4]">Lee los documentos del cliente (certificados en PDF o imagen) y propone norma, entidad, número, alcance y fechas. Tú revisas y guardas: nada se escribe solo.</p>
        </button>
      </div>

      {abierto && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="campo !w-[320px]">
              <label className="label" htmlFor="ia-cli">Cliente</label>
              <select id="ia-cli" className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">— elige un cliente con documentos —</option>
                {clientesConDocs.map((c) => <option key={c.id} value={c.id}>{nombreCliente(c)} · {docs.filter((d) => String(d.cliente_id) === String(c.id)).length} doc.</option>)}
              </select>
            </div>
            <button onClick={leer} disabled={!clienteId || !marcados.size || !!leyendo} className="btn-orange !px-4 !py-2 text-[13px] disabled:opacity-50">
              {leyendo ? `Leyendo ${leyendo.i}/${leyendo.n}…` : `✦ Leer ${marcados.size} documento${marcados.size === 1 ? '' : 's'}`}
            </button>
            {!clientesConDocs.length && docs.length === 0 && <span className="text-[12px] text-[#7FA7B4]">Ningún cliente tiene documentos subidos todavía.</span>}
          </div>

          {clienteId && (
            <div className="rounded-xl border border-[#1E5468] bg-[#0B2E3D] p-3">
              <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#9FC0CB]">Documentos del cliente · {docsCliente.length}</p>
              {docsCliente.length === 0 ? <p className="mt-1 text-[12px] text-[#7FA7B4]">Sin documentos.</p> : (
                <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
                  {docsCliente.map((d) => {
                    const on = marcados.has(String(d.id));
                    const leido = !!notas[String(d.id)];
                    return (
                      <li key={d.id}>
                        <label className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] ${on ? 'border-brand-orange/60 bg-brand-orange/10' : 'border-[#1E5468]'}`}>
                          <input type="checkbox" className="mt-0.5" checked={on} onChange={() => toggle(String(d.id))} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-bold text-[#EAF4F7]">{d.titulo}</span>
                            <span className="block text-[10.5px] text-[#7FA7B4]">{d.tipo || 'documento'}{d.nombre_fichero ? ` · ${d.nombre_fichero}` : ''}{leido ? ' · ya leído por la IA' : ''}{pareceCertificado(d) ? ' · parece un certificado' : ''}</span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {leyendo && <p className="text-[12px] font-bold text-[#9FC0CB]">Leyendo «{leyendo.titulo}» ({leyendo.i} de {leyendo.n})…</p>}

          {propuestas.length > 0 && (
            <div className="rounded-xl border border-brand-orange/50 bg-[#0D3242] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12.5px] font-extrabold text-[#EAF4F7]">Propuestas de la IA · revisa y guarda ({nIncluidas} marcadas)</p>
                <button onClick={guardar} disabled={guardando || !nIncluidas} className="btn-orange !px-4 !py-1.5 text-[13px] disabled:opacity-50">{guardando ? 'Guardando…' : `Guardar ${nIncluidas} certificado${nIncluidas === 1 ? '' : 's'}`}</button>
              </div>
              <div className="mt-2 space-y-2">
                {propuestas.map((p) => {
                  const ex = p.incluir ? certificadoExistente(p, certs) : null;
                  const prox = p.fecha_validez || p.fecha_certificacion ? proximaAuditoriaDeCertificado({ fecha_certificacion: p.fecha_certificacion, fecha_validez: p.fecha_validez }, hoy) : null;
                  const errores = p.incluir ? validarPropuesta(p) : [];
                  return (
                    <div key={p.clave} className={`rounded-xl border p-2.5 ${p.error ? 'border-red-400/40' : p.sinCertificado ? 'border-[#1E5468] opacity-70' : 'border-[#1E5468] bg-[#0B2E3D]'}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#EAF4F7]">
                          <input type="checkbox" checked={!!p.incluir} disabled={!!p.error || p.sinCertificado} onChange={(e) => editar(p.clave, 'incluir', e.target.checked)} />
                          {p.doc.titulo}
                        </label>
                        {p.error && <span className="text-[11px] font-bold text-red-300">No se pudo leer: {p.error}</span>}
                        {p.sinCertificado && <span className="text-[11px] text-[#7FA7B4]">La IA no ve un certificado en este documento.</span>}
                        {!p.error && !p.sinCertificado && <span className={`chip !px-2 !py-0 text-[10px] font-extrabold ${CONF[p.confianza]}`}>confianza {p.confianza}</span>}
                        {ex && <span className="chip !px-2 !py-0 bg-[#123F52] text-[10px] font-bold text-[#9FC0CB]">actualizará el certificado existente</span>}
                        {!ex && p.incluir && <span className="chip !px-2 !py-0 bg-[#123F52] text-[10px] font-bold text-[#9FC0CB]">nuevo</span>}
                        {prox?.fecha && <span className="ml-auto text-[11px] text-[#9FC0CB]">Próxima auditoría estimada: <b className="text-[#EAF4F7]">{prox.tipo === 'caducado' ? 'caducado' : fmt(prox.fecha)}</b></span>}
                      </div>
                      {!p.error && !p.sinCertificado && (
                        <>
                          <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                            <div className="campo">
                              <label className="label">Norma</label>
                              <select className={`input !py-1.5 !text-[12.5px] ${errores.includes('norma') ? '!border-red-400' : ''}`} value={NORMA_BY_ID[p.norma] ? p.norma : (p.norma ? '__otra' : '')}
                                onChange={(e) => editar(p.clave, 'norma', e.target.value === '__otra' ? (NORMA_BY_ID[p.norma] ? '' : p.norma) : e.target.value)}>
                                <option value="">— norma —</option>
                                {NORMAS.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                                <option value="__otra">Otra</option>
                              </select>
                              {!NORMA_BY_ID[p.norma] && <input className="input mt-1 !py-1 !text-[12px]" placeholder="ENS, EFQM…" value={p.norma} onChange={(e) => editar(p.clave, 'norma', e.target.value)} />}
                            </div>
                            <div className="campo"><label className="label">Entidad</label><input className="input !py-1.5 !text-[12.5px]" value={p.entidad} onChange={(e) => editar(p.clave, 'entidad', e.target.value)} /></div>
                            <div className="campo"><label className="label">Nº certificado</label><input className="input !py-1.5 !text-[12.5px]" value={p.numero} onChange={(e) => editar(p.clave, 'numero', e.target.value)} /></div>
                            <div className="campo"><label className="label">Certificación</label><input type="date" className="input !py-1.5 !text-[12.5px]" value={p.fecha_certificacion} onChange={(e) => editar(p.clave, 'fecha_certificacion', e.target.value)} /></div>
                            <div className="campo"><label className="label">Validez</label><input type="date" className={`input !py-1.5 !text-[12.5px] ${errores.some((e) => /validez/.test(e)) ? '!border-red-400' : ''}`} value={p.fecha_validez} onChange={(e) => editar(p.clave, 'fecha_validez', e.target.value)} /></div>
                            <div className="campo"><label className="label">Titular en el documento</label><p className="text-[12px] text-[#9FC0CB]">{p.razon_social ? `Titular: ${p.razon_social}` : '—'}{p.cif ? ` · ${p.cif}` : ''}</p></div>
                            <div className="campo sm:col-span-3 lg:col-span-6"><label className="label">Alcance</label><input className="input !py-1.5 !text-[12.5px]" value={p.alcance} onChange={(e) => editar(p.clave, 'alcance', e.target.value)} /></div>
                          </div>
                          {p.avisos?.length > 0 && <p className="mt-1.5 text-[11px] text-amber-100">⚠ {p.avisos.join(' · ')}</p>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {msg && <p className={`rounded-xl px-3 py-2 text-[12.5px] font-bold ${msg.err ? 'bg-red-500/12 text-red-200' : 'bg-emerald-500/12 text-emerald-200'}`}>{msg.t}</p>}
        </div>
      )}
    </div>
  );
}
