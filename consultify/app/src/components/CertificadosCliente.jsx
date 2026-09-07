import { useEffect, useMemo, useState } from 'react';
import { listTable, insertRow, updateRow, deleteRow, explicarErrorBd } from '../lib/data.js';
import { useAuth } from '../lib/auth.jsx';
import { can } from '../lib/permisos.js';
import { NORMAS, NORMA_BY_ID } from '../lib/calcEngine.js';
import { proximaAuditoriaDeCertificado, diasHasta, semaforoDias, fmt, TONO, aISO } from '../lib/auditorias.js';

// ════════════════════════════════════════════════════════════════════════════
// CERTIFICADOS DEL CLIENTE
//
// Norma · entidad · alcance · fecha de certificación · fecha de validez. Una
// fila por certificado, con el PDF enlazado si está subido en Documentos.
//
// De cada uno se calcula cuándo toca la próxima auditoría externa (cada año
// desde la certificación, y la renovación al vencer la validez): es lo que
// alimenta el aviso del panel de auditorías.
// ════════════════════════════════════════════════════════════════════════════

const hoyISO = () => aISO(new Date());
const VACIO = () => ({ norma: '9001', entidad: '', numero: '', alcance: '', fecha_certificacion: '', fecha_validez: '', documento_id: '', notas: '' });

/** Validez por defecto: tres años menos un día desde la certificación. */
const validezDesde = (iso) => {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`); d.setFullYear(d.getFullYear() + 3); d.setDate(d.getDate() - 1);
  return aISO(d);
};

export default function CertificadosCliente({ clienteId, proyectoId = null, titulo = 'Certificados' }) {
  const { role } = useAuth();
  const puedeEditar = can.esEquipo(role);
  const [certs, setCerts] = useState(null);
  const [docs, setDocs] = useState([]);
  const [form, setForm] = useState(null);      // alta o edición ({id} si edita)
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = async () => {
    const [c, d] = await Promise.all([
      listTable('cliente_certificados').catch(() => null),   // null: v118 sin aplicar
      listTable('cliente_documentos').catch(() => []),
    ]);
    setSinTabla(c === null);
    setCerts((c || []).filter((x) => String(x.cliente_id) === String(clienteId))
      .sort((a, b) => String(a.norma).localeCompare(String(b.norma)) || String(b.fecha_certificacion || '').localeCompare(String(a.fecha_certificacion || ''))));
    setDocs((d || []).filter((x) => String(x.cliente_id) === String(clienteId)));
  };
  const [sinTabla, setSinTabla] = useState(false);
  useEffect(() => { if (clienteId) cargar(); }, [clienteId]);   // eslint-disable-line react-hooks/exhaustive-deps

  const hoy = hoyISO();
  const filas = useMemo(() => (certs || []).map((c) => {
    const p = proximaAuditoriaDeCertificado(c, hoy);
    const dias = p.fecha ? diasHasta(p.fecha, hoy) : null;
    return { ...c, proxima: p, dias, color: p.tipo === 'caducado' ? 'rojo' : semaforoDias(dias) };
  }), [certs, hoy]);

  const nombreNorma = (id) => NORMA_BY_ID[id]?.nombre || id;
  const docDe = (id) => docs.find((d) => String(d.id) === String(id));

  async function guardar() {
    if (!form.norma?.trim()) { setMsg({ err: true, t: 'Indica la norma.' }); return; }
    if (form.fecha_certificacion && form.fecha_validez && form.fecha_validez < form.fecha_certificacion) { setMsg({ err: true, t: 'La validez no puede ser anterior a la certificación.' }); return; }
    setOcupado(true); setMsg(null);
    const fila = {
      cliente_id: clienteId, proyecto_id: proyectoId || null,
      norma: form.norma.trim(), entidad: form.entidad?.trim() || null, numero: form.numero?.trim() || null,
      alcance: form.alcance?.trim() || null,
      fecha_certificacion: form.fecha_certificacion || null, fecha_validez: form.fecha_validez || null,
      documento_id: form.documento_id || null, notas: form.notas?.trim() || null,
    };
    try {
      if (form.id) await updateRow('cliente_certificados', form.id, fila);
      else await insertRow('cliente_certificados', fila);
      setForm(null); await cargar();
      setMsg({ err: false, t: form.id ? 'Certificado actualizado.' : 'Certificado registrado.' });
    } catch (e) { setMsg({ err: true, t: explicarErrorBd(e, 'cliente_certificados') }); }
    finally { setOcupado(false); }
  }

  async function borrar(c) {
    if (!window.confirm(`¿Eliminar el certificado ${nombreNorma(c.norma)}${c.entidad ? ` de ${c.entidad}` : ''}?`)) return;
    setOcupado(true);
    try { await deleteRow('cliente_certificados', c.id); await cargar(); }
    catch (e) { setMsg({ err: true, t: explicarErrorBd(e, 'cliente_certificados') }); }
    finally { setOcupado(false); }
  }

  if (certs === null) return <p className="text-[12.5px] text-[#7FA7B4]">Cargando certificados…</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-extrabold text-[#EAF4F7]">{titulo} ({certs.length})</h3>
        {puedeEditar && !form && !sinTabla && (
          <button onClick={() => { setForm(VACIO()); setMsg(null); }} className="btn-orange !px-3 !py-1 text-[12px]">+ Añadir certificado</button>
        )}
      </div>

      {sinTabla && (
        <p className="rounded-xl border border-dashed border-[#1E5468] px-3 py-3 text-center text-[12.5px] text-[#7FA7B4]">
          Falta aplicar la migración v118 en la base de datos para registrar certificados.
        </p>
      )}

      {msg && <p className={`rounded-xl px-3 py-2 text-[12.5px] font-bold ${msg.err ? 'bg-red-500/12 text-red-200' : 'bg-emerald-500/12 text-emerald-200'}`}>{msg.t}</p>}

      {form && (
        <div className="rounded-xl border border-brand-orange/50 bg-[#0D3242] p-3">
          <div className="form-grid">
            <div className="campo">
              <label className="label" htmlFor="cc-norma">Norma</label>
              <select id="cc-norma" className="input" value={NORMA_BY_ID[form.norma] ? form.norma : '__otra'}
                onChange={(e) => setForm({ ...form, norma: e.target.value === '__otra' ? '' : e.target.value })}>
                {NORMAS.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                <option value="__otra">Otra (ENS, EFQM, sello…)</option>
              </select>
              {!NORMA_BY_ID[form.norma] && (
                <input className="input mt-1.5 !py-1.5 !text-[12.5px]" placeholder="Nombre de la norma o sello" value={form.norma}
                  onChange={(e) => setForm({ ...form, norma: e.target.value })} />
              )}
            </div>
            <div className="campo">
              <label className="label" htmlFor="cc-ent">Entidad certificadora</label>
              <input id="cc-ent" className="input" placeholder="AENOR, Bureau Veritas, OCA…" value={form.entidad}
                onChange={(e) => setForm({ ...form, entidad: e.target.value })} />
            </div>
            <div className="campo">
              <label className="label" htmlFor="cc-num">Nº de certificado</label>
              <input id="cc-num" className="input" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
            </div>
            <div className="campo sm:col-span-3">
              <label className="label" htmlFor="cc-alc">Alcance</label>
              <input id="cc-alc" className="input" placeholder="Tal como figura en el certificado" value={form.alcance}
                onChange={(e) => setForm({ ...form, alcance: e.target.value })} />
            </div>
            <div className="campo">
              <label className="label" htmlFor="cc-fc">Fecha de certificación</label>
              <input id="cc-fc" type="date" className="input" value={form.fecha_certificacion}
                onChange={(e) => setForm({ ...form, fecha_certificacion: e.target.value, fecha_validez: form.fecha_validez || validezDesde(e.target.value) })} />
            </div>
            <div className="campo">
              <label className="label" htmlFor="cc-fv">Fecha de validez</label>
              <input id="cc-fv" type="date" className="input" value={form.fecha_validez}
                onChange={(e) => setForm({ ...form, fecha_validez: e.target.value })} />
              <p className="campo-nota">Se propone a tres años. Auditoría de seguimiento cada año.</p>
            </div>
            <div className="campo">
              <label className="label" htmlFor="cc-doc">Documento</label>
              <select id="cc-doc" className="input" value={form.documento_id} onChange={(e) => setForm({ ...form, documento_id: e.target.value })}>
                <option value="">— sin enlazar —</option>
                {docs.map((d) => <option key={d.id} value={d.id}>{d.titulo}</option>)}
              </select>
              <p className="campo-nota">El PDF, si ya está subido en Documentos.</p>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={guardar} disabled={ocupado} className="btn-orange !px-4 !py-1.5 text-[13px] disabled:opacity-50">{ocupado ? 'Guardando…' : 'Guardar'}</button>
            <button onClick={() => { setForm(null); setMsg(null); }} className="btn-ghost !px-3 !py-1.5 text-[13px]">Cancelar</button>
          </div>
        </div>
      )}

      {filas.length === 0 ? (
        !sinTabla && <p className="py-3 text-center text-[12.5px] text-[#7FA7B4]">Sin certificados registrados. Añade cada uno con su norma, entidad, alcance y fechas: de ahí sale el aviso de auditoría externa.</p>
      ) : (
        <ul className="divide-y divide-[#153F52]">
          {filas.map((c) => {
            const T = TONO[c.color];
            const doc = docDe(c.documento_id);
            return (
              <li key={c.id} className="py-2.5">
                <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: T.punto }} title={T.etq} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-[#EAF4F7]">
                      {nombreNorma(c.norma)}{c.entidad ? <span className="font-medium text-[#9FC0CB]"> · {c.entidad}</span> : ''}
                      {c.numero ? <span className="ml-1 text-[11px] font-semibold text-[#7FA7B4]">nº {c.numero}</span> : ''}
                    </span>
                    {c.alcance && <span className="block text-[11.5px] text-[#B9D2DA]">{c.alcance}</span>}
                    <span className="block text-[11px] text-[#7FA7B4]">
                      Certificado {fmt(c.fecha_certificacion)} · válido hasta {fmt(c.fecha_validez)}
                      {doc && <> · <span className="text-brand-verdeTexto">{doc.titulo}</span></>}
                    </span>
                  </span>
                  <span className={`chip border !px-2 !py-0.5 text-[10.5px] font-extrabold ${T.chip}`}>
                    {c.proxima.tipo === 'caducado' ? `caducado ${fmt(c.proxima.fecha)}`
                      : c.proxima.fecha ? `${c.proxima.tipo === 'renovacion' ? 'renovación' : 'seguimiento'} ${fmt(c.proxima.fecha)} · ${c.dias} d`
                      : 'sin fechas'}
                  </span>
                  {puedeEditar && (
                    <span className="flex gap-2">
                      <button onClick={() => setForm({ ...VACIO(), ...c, entidad: c.entidad || '', numero: c.numero || '', alcance: c.alcance || '', fecha_certificacion: c.fecha_certificacion || '', fecha_validez: c.fecha_validez || '', documento_id: c.documento_id || '', notas: c.notas || '' })}
                        className="text-[11px] font-bold text-[#7FA7B4] hover:text-brand-orange">✎</button>
                      <button onClick={() => borrar(c)} className="text-[11px] font-bold text-red-300/70 hover:text-red-300">×</button>
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
