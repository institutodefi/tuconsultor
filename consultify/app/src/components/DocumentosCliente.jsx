import { useEffect, useMemo, useRef, useState } from 'react';
import { listTable, explicarErrorBd } from '../lib/data.js';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { can } from '../lib/permisos.js';

// ════════════════════════════════════════════════════════════════════════════
// DOCUMENTOS DEL CLIENTE
//
// Certificados, informes de auditoría, escrituras, pólizas. Los ve el cliente
// (los suyos) y todo el equipo (todos).
//
// La NOTA de la IA es distinta: solo el equipo. No es una descripción para el
// cliente, es una lectura nuestra para saber qué dice de verdad un certificado
// —alcance literal, sedes, CIF, fechas— sin abrirlo entero. Puede contener
// errores del modelo, así que se marca con su confianza y se puede revisar.
// ════════════════════════════════════════════════════════════════════════════

const TIPOS = [
  ['certificado', 'Certificado'], ['auditoria', 'Informe de auditoría'],
  ['escritura', 'Escritura'], ['poder', 'Poder de representación'],
  ['politica', 'Política'], ['organigrama', 'Organigrama'],
  ['licencia', 'Licencia'], ['seguro', 'Póliza de seguro'], ['otro', 'Otro'],
];
const ETQ_TIPO = Object.fromEntries(TIPOS);

const fmtFecha = (f) => {
  if (!f) return '—';
  const d = new Date(String(f).slice(0, 10) + 'T12:00:00');
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-ES');
};
const fmtPeso = (b) => (!b ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

const diasHasta = (f) => {
  if (!f) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(String(f).slice(0, 10) + 'T12:00:00') - hoy) / 86400000);
};

async function llamar(payload) {
  const { data } = await supabase.auth.getSession();
  const r = await fetch('/api/documentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data?.session?.access_token || ''}` },
    body: JSON.stringify(payload),
  });
  return r.json();
}

export default function DocumentosCliente({ clienteId, proyectoId = null, titulo = 'Documentos' }) {
  const { role } = useAuth();
  const esEquipo = can.esEquipo(role);

  const [docs, setDocs] = useState(null);
  const [notas, setNotas] = useState({});
  const [msg, setMsg] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [analizando, setAnalizando] = useState(null);
  const [abierta, setAbierta] = useState(null);
  const [form, setForm] = useState(null);
  const fichero = useRef(null);

  const cargar = async () => {
    const d = await listTable('cliente_documentos').catch(() => []);
    const mios = (d || []).filter((x) => String(x.cliente_id) === String(clienteId));
    setDocs(mios.sort((a, b) => String(b.creado).localeCompare(String(a.creado))));
    // Las notas solo se piden si eres del equipo: para el cliente, la política
    // devolvería vacío igualmente, pero no tiene sentido pedirlas.
    if (esEquipo) {
      const n = await listTable('documento_notas').catch(() => []);
      setNotas(Object.fromEntries((n || []).map((x) => [String(x.documento_id), x])));
    }
  };
  useEffect(() => { if (clienteId) cargar(); }, [clienteId]);   // eslint-disable-line react-hooks/exhaustive-deps

  const caducan = useMemo(() => (docs || []).filter((d) => {
    const n = diasHasta(d.valido_hasta);
    return n != null && n <= 60;
  }), [docs]);

  async function subir() {
    const f = fichero.current?.files?.[0];
    if (!f) { setMsg({ err: true, t: 'Elige un archivo.' }); return; }
    if (!form?.titulo?.trim()) { setMsg({ err: true, t: 'Ponle un título al documento.' }); return; }
    setSubiendo(true); setMsg(null);
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(',')[1]);
        r.onerror = () => rej(new Error('No se pudo leer el archivo.'));
        r.readAsDataURL(f);
      });
      const j = await llamar({
        action: 'subir', cliente_id: clienteId, proyecto_id: proyectoId,
        titulo: form.titulo.trim(), tipo: form.tipo, descripcion: form.descripcion || null,
        nombre: f.name, mime: f.type, base64,
      });
      if (!j.ok) throw new Error(j.error || 'No se pudo subir.');
      setMsg({ err: false, t: 'Documento subido.' });
      setForm(null); if (fichero.current) fichero.current.value = '';
      await cargar();
    } catch (e) {
      setMsg({ err: true, t: explicarErrorBd(e, 'cliente_documentos') });
    } finally { setSubiendo(false); }
  }

  async function abrir(d) {
    const j = await llamar({ action: 'enlace', documento_id: d.id });
    if (!j.ok) { setMsg({ err: true, t: j.error }); return; }
    window.open(j.url, '_blank', 'noopener');
  }

  async function analizar(d) {
    setAnalizando(d.id); setMsg(null);
    try {
      const j = await llamar({ action: 'analizar', documento_id: d.id });
      if (!j.ok) throw new Error(j.error);
      await cargar();
      setAbierta(d.id);
      const n = Object.keys(j.propuestas || {}).length;
      setMsg({ err: false, t: n ? `Documento leído. Propone ${n} dato(s) para la ficha.` : 'Documento leído.' });
    } catch (e) {
      setMsg({ err: true, t: `No se pudo analizar: ${e.message}` });
    } finally { setAnalizando(null); }
  }

  if (!docs) return <p className="text-[12.5px] text-[#7FA7B4]">Cargando documentos…</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-extrabold text-[#EAF4F7]">{titulo} ({docs.length})</h3>
        {!form && (
          <button onClick={() => setForm({ titulo: '', tipo: 'certificado', descripcion: '' })}
            className="btn-orange !px-3 !py-1 text-[12px]">+ Subir documento</button>
        )}
      </div>

      {/* Un certificado caducado o a punto de caducar es lo primero que hay que
          ver: de él depende que el cliente siga acreditado. */}
      {caducan.length > 0 && (
        <p className="rounded-xl border border-amber-300/40 bg-amber-400/[0.07] px-3 py-2 text-[12.5px] font-bold text-amber-200">
          {caducan.length === 1
            ? '1 documento caducado o a punto de caducar'
            : `${caducan.length} documentos caducados o a punto de caducar`}
          <span className="ml-1 font-medium text-[#DFF1F5]">— revisa las fechas de validez.</span>
        </p>
      )}

      {msg && (
        <p className={`rounded-xl px-3 py-2 text-[12.5px] font-bold ${msg.err ? 'bg-red-500/12 text-red-200' : 'bg-emerald-500/12 text-emerald-200'}`}>
          {msg.t}
        </p>
      )}

      {form && (
        <div className="rounded-xl border border-brand-orange/50 bg-[#0D3242] p-3">
          <div className="form-grid">
            <div className="campo sm:col-span-2">
              <label className="label" htmlFor="dc-tit">Título</label>
              <input id="dc-tit" className="input" value={form.titulo}
                placeholder="Certificado ISO 9001 · OCA Global"
                onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div className="campo">
              <label className="label" htmlFor="dc-tipo">Tipo</label>
              <select id="dc-tipo" className="input" value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                {TIPOS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="campo">
              <label className="label" htmlFor="dc-file">Archivo</label>
              <input id="dc-file" ref={fichero} type="file" className="input !py-1 !text-[12px]"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" />
              <p className="campo-nota">PDF, imagen o Word. Máximo 20 MB.</p>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={subir} disabled={subiendo} className="btn-orange !px-4 !py-1.5 text-[13px] disabled:opacity-50">
              {subiendo ? 'Subiendo…' : 'Subir'}
            </button>
            <button onClick={() => { setForm(null); setMsg(null); }} className="btn-ghost !px-3 !py-1.5 text-[13px]">Cancelar</button>
          </div>
        </div>
      )}

      {docs.length === 0 ? (
        <p className="py-5 text-center text-[12.5px] text-[#7FA7B4]">
          Todavía no hay documentos. Sube aquí certificados, informes de auditoría y cualquier
          documentación que deba constar en el expediente.
        </p>
      ) : (
        <ul className="divide-y divide-[#153F52]">
          {docs.map((d) => {
            const nota = notas[String(d.id)];
            const dias = diasHasta(d.valido_hasta);
            const vencido = dias != null && dias < 0;
            const cerca = dias != null && dias >= 0 && dias <= 60;
            return (
              <li key={d.id} className="py-2.5">
                <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                  <span className="min-w-0 flex-1">
                    <button onClick={() => abrir(d)}
                      className="block truncate text-[13px] font-bold text-[#EAF4F7] hover:text-brand-orange hover:underline">
                      {d.titulo}
                    </button>
                    <span className="text-[11px] text-[#7FA7B4]">
                      {ETQ_TIPO[d.tipo] || d.tipo}
                      {d.norma ? ` · ${d.norma}` : ''}{d.emisor ? ` · ${d.emisor}` : ''}
                      {d.tamano ? ` · ${fmtPeso(d.tamano)}` : ''}
                      {d.subido_por_cliente ? ' · aportado por el cliente' : ''}
                    </span>
                  </span>

                  {d.valido_hasta && (
                    <span className={`chip !px-2 !py-0.5 text-[10.5px] font-extrabold ${
                      vencido ? 'bg-red-500/20 text-red-200'
                        : cerca ? 'bg-amber-400/20 text-amber-200'
                        : 'bg-[#123F52] text-[#9FC0CB]'}`}>
                      {vencido ? `caducó ${fmtFecha(d.valido_hasta)}` : `vence ${fmtFecha(d.valido_hasta)}`}
                    </span>
                  )}

                  {esEquipo && (
                    nota ? (
                      <button onClick={() => setAbierta(abierta === d.id ? null : d.id)}
                        className="text-[11px] font-bold text-brand-verdeTexto hover:underline">
                        {abierta === d.id ? 'ocultar nota' : 'ver nota'}
                      </button>
                    ) : (
                      <button onClick={() => analizar(d)} disabled={analizando === d.id}
                        className="text-[11px] font-bold text-[#7FA7B4] hover:text-brand-orange disabled:opacity-50"
                        title="Leer el documento y extraer alcance, fechas, CIF y sedes">
                        {analizando === d.id ? 'leyendo…' : '✦ analizar'}
                      </button>
                    )
                  )}
                </div>

                {esEquipo && abierta === d.id && nota && <Nota nota={nota} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── La nota, solo para el equipo ────────────────────────────────────────────
function Nota({ nota }) {
  const d = nota.datos || {};
  const filas = [
    ['Razón social', d.razon_social], ['CIF', d.cif],
    ['Norma', d.norma], ['Emisor', d.emisor], ['Nº', d.numero],
    ['Alcance', d.alcance],
    ['Sedes', Array.isArray(d.sedes) && d.sedes.length ? d.sedes.join(' · ') : null],
    ['Validez', [d.valido_desde, d.valido_hasta].filter(Boolean).join(' → ') || null],
  ].filter(([, v]) => v);

  const tono = { alta: 'text-emerald-300', media: 'text-[#9FC0CB]', baja: 'text-amber-200' }[nota.confianza] || 'text-[#9FC0CB]';

  return (
    <div className="mt-2 rounded-xl border border-brand-verde/40 bg-[#0B2E3D] p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-brand-verdeTexto">
          Nota de análisis · uso interno
        </p>
        <p className={`text-[11px] font-bold ${tono}`}>confianza {nota.confianza}</p>
      </div>

      {nota.resumen && <p className="mt-1.5 text-[12.5px] leading-snug text-[#DFF1F5]">{nota.resumen}</p>}

      {filas.length > 0 && (
        <dl className="mt-2 grid gap-x-3 gap-y-1 sm:grid-cols-2">
          {filas.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{k}</dt>
              <dd className="text-[12px] text-[#EAF4F7]">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {Array.isArray(d.avisos) && d.avisos.length > 0 && (
        <ul className="mt-2 space-y-0.5 rounded-lg bg-amber-400/10 px-2.5 py-2">
          {d.avisos.map((a, i) => (
            <li key={i} className="text-[11.5px] font-bold text-amber-200">· {a}</li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-[10.5px] leading-snug text-[#5E8494]">
        Lectura automática del documento. No se muestra al cliente y puede contener errores:
        contrasta los datos antes de usarlos en una oferta o un contrato.
      </p>
    </div>
  );
}
