import { useEffect, useState, useCallback, useMemo } from 'react';
import { listTable, updateRow } from '../../lib/data.js';
import { useAuth } from '../../lib/auth.jsx';

const ESTADOS = ['nuevo', 'contactado', 'propuesta', 'ganado', 'perdido'];
const CHIP = {
  nuevo: 'bg-brand-verde/15 text-brand-verdeTexto',
  contactado: 'bg-sky-500/15 text-sky-300',
  propuesta: 'bg-brand-orange/15 text-brand-orange',
  ganado: 'bg-green-500/15 text-green-300',
  perdido: 'bg-red-500/15 text-red-300',
};

export default function Leads() {
  const { role, demo } = useAuth();
  const puedeEditar = ['superadmin', 'admin', 'director', 'consultor', 'gestion'].includes(role);
  const [leads, setLeads] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState('activos'); // activos | todos | ganado | perdido
  const [msg, setMsg] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const filas = demo
        ? [{ id: 1, creado: new Date().toISOString(), nombre: 'Laura Gómez', email: 'laura@acme.es', empresa: 'ACME Industrial',
             telefono: '600 000 000', producto: 'Suscripción Consultify', necesidad: 'ISO 9001', plazo: 'Compromiso',
             estado: 'nuevo', origen: '/consultify/', consentimiento_comercial: true, notas: '' }]
        : await listTable('leads');
      filas.sort((a, b) => (b.creado || '').localeCompare(a.creado || ''));
      setLeads(filas);
    } catch { setLeads([]); }
    finally { setCargando(false); }
  }, [demo]);
  useEffect(() => { cargar(); }, [cargar]);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return leads.filter(l => {
      if (filtro === 'activos' && ['ganado', 'perdido'].includes(l.estado)) return false;
      if (filtro === 'ganado' && l.estado !== 'ganado') return false;
      if (filtro === 'perdido' && l.estado !== 'perdido') return false;
      if (!t) return true;
      return `${l.nombre} ${l.empresa} ${l.email} ${l.producto} ${l.necesidad}`.toLowerCase().includes(t);
    });
  }, [leads, q, filtro]);

  const cambiar = async (lead, campos) => {
    setLeads(ls => ls.map(x => x.id === lead.id ? { ...x, ...campos } : x));
    if (demo) return;
    try { await updateRow('leads', lead.id, campos); }
    catch { setMsg({ ok: false, text: 'No se pudo guardar el cambio.' }); cargar(); }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Comercial</p>
          <h2 className="text-2xl font-extrabold tracking-tight">Clientes potenciales</h2>
          <p className="mt-1 text-sm text-[#9FC0CB]">Solicitudes llegadas desde los formularios de la web y de Consultify.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar…" className="input !w-52" aria-label="Buscar lead" />
          <select value={filtro} onChange={e => setFiltro(e.target.value)} className="input !w-40" aria-label="Filtrar por estado">
            <option value="activos">Activos</option><option value="todos">Todos</option>
            <option value="ganado">Ganados</option><option value="perdido">Perdidos</option>
          </select>
        </div>
      </div>
      {msg && <p className={`mb-3 text-sm font-bold ${msg.ok ? 'text-brand-verdeTexto' : 'text-red-300'}`}>{msg.text}</p>}
      {cargando ? <p className="text-sm text-[#9FC0CB]">Cargando…</p> : !lista.length ? (
        <div className="card text-center text-sm text-[#9FC0CB]">Sin clientes potenciales {filtro !== 'todos' ? 'en este filtro' : 'todavía'}. Llegarán solos desde los formularios de la web.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map(l => (
            <div key={l.id} className="card !p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-[220px]">
                  <p className="font-extrabold">{l.nombre || '—'} <span className="font-semibold text-[#9FC0CB]">· {l.empresa || 'sin empresa'}</span></p>
                  <p className="mt-0.5 text-sm text-[#9FC0CB]">
                    <a className="underline" href={`mailto:${l.email}`}>{l.email}</a>
                    {l.telefono ? <> · <a className="underline" href={`tel:${l.telefono}`}>{l.telefono}</a></> : null}
                  </p>
                  <p className="mt-1 text-xs text-[#7FA7B4]">
                    {new Date(l.creado).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {' · '}{l.producto || 'contacto web'}{l.necesidad ? ` · ${l.necesidad}` : ''}{l.plazo ? ` · ${l.plazo}` : ''}
                    {' · '}{l.consentimiento_comercial ? 'acepta comercial ✓' : 'sin consentimiento comercial'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`chip ${CHIP[l.estado] || ''}`}>{l.estado}</span>
                  {puedeEditar && (
                    <select value={l.estado} onChange={e => cambiar(l, { estado: e.target.value })} className="input !w-40 !py-1.5" aria-label="Cambiar estado">
                      {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  )}
                </div>
              </div>
              {l.mensaje && <p className="mt-2 rounded-xl bg-[#0D3242] p-3 text-sm text-[#CFE3E9]">{l.mensaje}</p>}
              {puedeEditar && (
                <textarea defaultValue={l.notas || ''} placeholder="Notas internas…" rows={1}
                  onBlur={e => e.target.value !== (l.notas || '') && cambiar(l, { notas: e.target.value })}
                  className="input mt-2 !py-2 text-sm" aria-label="Notas del lead" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
