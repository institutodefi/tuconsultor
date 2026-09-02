import { useEffect, useMemo, useRef, useState } from 'react';
import DialogoFicha from '../../components/DialogoFicha.jsx';
import { listTable, explicarErrorBd } from '../../lib/data.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth.jsx';

// ════════════════════════════════════════════════════════════════════════════
// FICHA DEL EMPLEADO
//
// Dos pestañas: sus datos y su documentación laboral.
//
// Las nóminas son de lo más sensible que guarda este sistema. El acceso está en
// la base —cada persona ve las suyas, Administración todas— y aquí se refleja:
// quien no es Administración no ve siquiera la pestaña de otra persona.
// ════════════════════════════════════════════════════════════════════════════

const TIPOS = [
  ['nomina', 'Nómina'], ['contrato', 'Contrato'], ['finiquito', 'Finiquito'],
  ['certificado', 'Certificado'], ['formacion', 'Formación'], ['prl', 'PRL'], ['otro', 'Otro'],
];
const ETQ = Object.fromEntries(TIPOS);

const ROL_ETQ = {
  superadmin: 'Superadministración', admin: 'Administración',
  director: 'Dirección de proyecto', consultor: 'Consultoría', gestion: 'Gestión',
};

const mesLargo = (f) => {
  if (!f) return null;
  const d = new Date(`${String(f).slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null
    : d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
};
const fmtPeso = (b) => (!b ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

/** El mes anterior, que es el periodo natural de una nómina que se sube hoy. */
const mesPasado = () => {
  const d = new Date();
  d.setDate(1); d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

async function llamar(payload) {
  const { data } = await supabase.auth.getSession();
  const r = await fetch('/api/empleado-documentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data?.session?.access_token || ''}` },
    body: JSON.stringify(payload),
  });
  return r.json();
}

export default function FichaEmpleado({ persona, onCerrar, onCambio }) {
  const { user, role } = useAuth();
  const esRrhh = ['superadmin', 'admin'].includes(role);
  const soyYo = String(persona?.id) === String(user?.id);
  // La documentación laboral solo la ve Administración, o la propia persona.
  const puedeVerDocs = esRrhh || soyYo;

  const [pestana, setPestana] = useState('datos');
  const [docs, setDocs] = useState(null);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const fichero = useRef(null);

  const cargar = async () => {
    if (!puedeVerDocs) { setDocs([]); return; }
    const d = await listTable('empleado_documentos').catch(() => []);
    setDocs((d || [])
      .filter((x) => String(x.perfil_id) === String(persona.id))
      // Por periodo, no por fecha de subida: una nómina de marzo cargada en
      // junio sigue siendo de marzo y debe salir donde le toca.
      .sort((a, b) => String(b.periodo || b.creado).localeCompare(String(a.periodo || a.creado))));
  };
  useEffect(() => { if (persona?.id) cargar(); }, [persona?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  const porTipo = useMemo(() => {
    const m = {};
    for (const d of docs || []) (m[d.tipo] ||= []).push(d);
    return m;
  }, [docs]);

  async function subir() {
    const f = fichero.current?.files?.[0];
    if (!f) { setMsg({ err: true, t: 'Elige un archivo.' }); return; }
    if (!form?.titulo?.trim()) { setMsg({ err: true, t: 'Ponle un título.' }); return; }
    setOcupado(true); setMsg(null);
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(',')[1]);
        r.onerror = () => rej(new Error('No se pudo leer el archivo.'));
        r.readAsDataURL(f);
      });
      const j = await llamar({
        action: 'subir', perfil_id: persona.id,
        tipo: form.tipo, titulo: form.titulo.trim(),
        periodo: form.periodo || null, notas: form.notas?.trim() || null,
        nombre: f.name, mime: f.type, base64,
      });
      if (!j.ok) throw new Error(j.error);
      setMsg({ err: false, t: 'Documento guardado.' });
      setForm(null); if (fichero.current) fichero.current.value = '';
      await cargar(); onCambio?.();
    } catch (e) { setMsg({ err: true, t: explicarErrorBd(e, 'empleado_documentos') }); }
    finally { setOcupado(false); }
  }

  async function abrir(d) {
    const j = await llamar({ action: 'enlace', documento_id: d.id });
    if (!j.ok) { setMsg({ err: true, t: j.error }); return; }
    window.open(j.url, '_blank', 'noopener');
  }

  async function borrar(d) {
    if (!window.confirm(`¿Eliminar «${d.titulo}»? No se puede deshacer.`)) return;
    setOcupado(true);
    try {
      const j = await llamar({ action: 'borrar', documento_id: d.id });
      if (!j.ok) throw new Error(j.error);
      await cargar();
    } catch (e) { setMsg({ err: true, t: e.message }); }
    finally { setOcupado(false); }
  }

  const nombre = `${persona?.nombre || ''} ${persona?.apellidos || ''}`.trim() || persona?.email;

  return (
    <DialogoFicha
      titulo={nombre}
      subtitulo={[ROL_ETQ[persona?.rol] || persona?.rol, persona?.nivel, persona?.email].filter(Boolean).join(' · ')}
      onCerrar={onCerrar}
      ancho="760px"
      pie={<button onClick={onCerrar} className="btn-orange !px-4 !py-1.5 text-[13px]">Cerrar</button>}
    >
      <div className="space-y-3">
        <div className="flex gap-1.5 border-b border-[#1E5468]">
          {[['datos', 'Datos'], ['docs', soyYo ? 'Mis documentos' : 'Documentación laboral']]
            .filter(([k]) => k === 'datos' || puedeVerDocs)
            .map(([k, etq]) => (
              <button key={k} onClick={() => setPestana(k)}
                className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-bold transition ${
                  pestana === k ? 'border-brand-orange text-[#EAF4F7]'
                    : 'border-transparent text-[#7FA7B4] hover:text-[#EAF4F7]'}`}>
                {etq}
              </button>
            ))}
        </div>

        {/* ── Datos ── */}
        {pestana === 'datos' && (
          <div className="space-y-3">
            <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
              {[
                ['Nombre', nombre],
                ['Correo', persona?.email || <span className="text-amber-200">sin correo en su ficha</span>],
                ['Rol', ROL_ETQ[persona?.rol] || persona?.rol],
                ['Nivel', persona?.nivel || '—'],
                ['Capacidad', persona?.capacidad_clientes ? `${persona.capacidad_clientes} clientes` : '—'],
                ['Estado', persona?.activo === false ? 'Inactivo' : 'Activo'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{k}</dt>
                  <dd className="text-[13px] text-[#EAF4F7]">{v}</dd>
                </div>
              ))}
            </dl>

            {Array.isArray(persona?.normas) && persona.normas.length > 0 && (
              <div>
                <p className="label !mb-1.5">Normas que domina</p>
                <div className="flex flex-wrap gap-1.5">
                  {persona.normas.map((n) => (
                    <span key={n} className="chip !px-2 !py-0.5 bg-brand-verde/15 text-[11px] text-brand-verdeTexto">{n}</span>
                  ))}
                </div>
              </div>
            )}

            {esRrhh && (
              <p className="text-[11.5px] text-[#7FA7B4]">
                El rol, el nivel y el estado se cambian en <b>Accesos</b>: de ahí depende
                qué ve esta persona al entrar.
              </p>
            )}
          </div>
        )}

        {/* ── Documentación laboral ── */}
        {pestana === 'docs' && puedeVerDocs && (
          <div className="space-y-3">
            {esRrhh && !form && (
              <button onClick={() => setForm({ tipo: 'nomina', titulo: '', periodo: mesPasado(), notas: '' })}
                className="btn-orange !px-3 !py-1 text-[12px]">+ Subir documento</button>
            )}

            {esRrhh && form && (
              <div className="rounded-xl border border-brand-orange/50 bg-[#0D3242] p-3">
                <div className="form-grid">
                  <div className="campo">
                    <label className="label" htmlFor="fe-tipo">Tipo</label>
                    <select id="fe-tipo" className="input" value={form.tipo}
                      onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                      {TIPOS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="campo">
                    <label className="label" htmlFor="fe-per">Periodo</label>
                    <input id="fe-per" type="month" className="input"
                      value={String(form.periodo || '').slice(0, 7)}
                      onChange={(e) => setForm({ ...form, periodo: e.target.value ? `${e.target.value}-01` : null })} />
                    <p className="campo-nota">El mes al que corresponde.</p>
                  </div>
                  <div className="campo sm:col-span-2">
                    <label className="label" htmlFor="fe-tit">Título</label>
                    <input id="fe-tit" className="input" value={form.titulo}
                      placeholder="Nómina marzo 2026"
                      onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
                  </div>
                  <div className="campo sm:col-span-2">
                    <label className="label" htmlFor="fe-file">Archivo</label>
                    <input id="fe-file" ref={fichero} type="file" className="input !py-1 !text-[12px]"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
                    <p className="campo-nota">PDF, imagen o Word. Máximo 15 MB.</p>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <button onClick={subir} disabled={ocupado} className="btn-orange !px-4 !py-1.5 text-[13px] disabled:opacity-50">
                    {ocupado ? 'Subiendo…' : 'Subir'}
                  </button>
                  <button onClick={() => { setForm(null); setMsg(null); }} className="btn-ghost !px-3 !py-1.5 text-[13px]">Cancelar</button>
                </div>
              </div>
            )}

            {msg && (
              <p className={`rounded-lg px-3 py-2 text-[12.5px] font-bold ${msg.err ? 'bg-red-500/12 text-red-200' : 'bg-emerald-500/12 text-emerald-200'}`}>
                {msg.t}
              </p>
            )}

            {docs === null ? (
              <p className="text-[12.5px] text-[#7FA7B4]">Cargando…</p>
            ) : docs.length === 0 ? (
              <p className="py-4 text-center text-[12.5px] text-[#7FA7B4]">
                {esRrhh ? 'Sin documentos todavía.' : 'Todavía no hay documentos tuyos aquí.'}
              </p>
            ) : (
              Object.entries(porTipo).map(([tipo, lista]) => (
                <div key={tipo}>
                  <p className="label !mb-1.5">{ETQ[tipo] || tipo} ({lista.length})</p>
                  <ul className="space-y-1">
                    {lista.map((d) => (
                      <li key={d.id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg border border-[#1E5468] bg-[#0B2E3D] px-2.5 py-1.5">
                        <button onClick={() => abrir(d)}
                          className="min-w-0 flex-1 truncate text-left text-[12.5px] font-bold text-[#EAF4F7] hover:text-brand-orange hover:underline">
                          {d.titulo}
                        </button>
                        {d.periodo && (
                          <span className="whitespace-nowrap text-[11px] text-[#9FC0CB]">{mesLargo(d.periodo)}</span>
                        )}
                        <span className="text-[10.5px] text-[#7FA7B4]">{fmtPeso(d.tamano)}</span>
                        {esRrhh && (
                          <button onClick={() => borrar(d)} disabled={ocupado}
                            className="text-[11px] font-bold text-red-300/70 hover:text-red-300">×</button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}

            <p className="text-[10.5px] leading-snug text-[#5E8494]">
              {esRrhh
                ? 'Solo Administración sube y elimina. Cada persona ve únicamente sus propios documentos.'
                : 'Estos documentos son solo tuyos: nadie más del equipo los ve, salvo Administración.'}
            </p>
          </div>
        )}
      </div>
    </DialogoFicha>
  );
}
