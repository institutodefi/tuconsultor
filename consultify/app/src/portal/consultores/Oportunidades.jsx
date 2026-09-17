import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listTable, insertRow, updateRow, deleteRow } from '../../lib/data.js';
import { useAuth } from '../../lib/auth.jsx';
import { nombreVisible } from '../../lib/crm.js';

// ════════════════════════════════════════════════════════════════════════════
// OPORTUNIDADES · el embudo comercial
//
// Lo que faltaba y no estaba en ninguna parte. Cuidado con confundirlo con lo
// que ya había, porque son tres cosas distintas:
//
//   · `empresas.estado_comercial` → el ciclo de vida de una EMPRESA
//     (potencial, activo, inactivo, perdido). Una empresa puede ser cliente
//     activo y tener a la vez una oportunidad abierta.
//   · `presupuestos.estado`       → el estado de una OFERTA ya emitida.
//     Empieza cuando ya has hecho la propuesta: después de lo difícil.
//   · la oportunidad              → el TRATO que se está trabajando, desde que
//     aparece hasta que se gana o se pierde, con importe y fecha de cierre.
//
// Tablero y no tabla: un embudo se entiende mirándolo, no leyéndolo. Se mueve
// con el selector de cada tarjeta y no arrastrando: arrastrar en una tabla de
// consultoría se usa dos veces y se equivoca una.
// ════════════════════════════════════════════════════════════════════════════

// La probabilidad por defecto de cada fase. No es adivinación: es el punto de
// partida para que la previsión ponderada signifique algo desde el primer día.
// Se puede cambiar oportunidad a oportunidad cuando se sabe más.
export const FASES = [
  { k: 'nueva',       label: 'Nueva',       prob: 10, color: 'bg-white/10 text-[#9FC0CB]' },
  { k: 'contactada',  label: 'Contactada',  prob: 20, color: 'bg-sky-500/15 text-sky-200' },
  { k: 'cualificada', label: 'Cualificada', prob: 40, color: 'bg-brand-verde/15 text-brand-verdeTexto' },
  { k: 'propuesta',   label: 'Propuesta',   prob: 60, color: 'bg-brand-orange/15 text-brand-orange' },
  { k: 'negociacion', label: 'Negociación', prob: 80, color: 'bg-amber-500/15 text-amber-200' },
];
const CERRADAS = [
  { k: 'ganada',  label: 'Ganada',  prob: 100, color: 'bg-emerald-500/15 text-emerald-300' },
  { k: 'perdida', label: 'Perdida', prob: 0,   color: 'bg-red-500/15 text-red-200' },
];
const TODAS = [...FASES, ...CERRADAS];
const faseDe = (k) => TODAS.find((f) => f.k === k) || FASES[0];

const eur = (n) => (Number(n) || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const hoy = () => new Date().toISOString().slice(0, 10);

/** La probabilidad que vale: la puesta a mano, y si no la de la fase. */
const probDe = (o) => (o.probabilidad ?? faseDe(o.fase).prob);

export default function Oportunidades() {
  const { user, role } = useAuth();
  const puedeEditar = ['superadmin', 'admin', 'director', 'comercial', 'gestion'].includes(role);

  const [oportunidades, setOportunidades] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [equipo, setEquipo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState(null);
  const [q, setQ] = useState('');
  const [soloMias, setSoloMias] = useState(false);
  const [verCerradas, setVerCerradas] = useState(false);
  const [nueva, setNueva] = useState(null);       // formulario de alta
  const [editando, setEditando] = useState(null); // id en edición

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [o, e, c, p] = await Promise.all([
        listTable('oportunidades').catch(() => []),
        listTable('empresas').catch(() => []),
        listTable('contactos').catch(() => []),
        listTable('perfiles').catch(() => []),
      ]);
      setOportunidades(o || []); setEmpresas(e || []); setContactos(c || []); setEquipo(p || []);
    } finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const empresaDe = useCallback((id) => empresas.find((e) => String(e.id) === String(id)), [empresas]);
  const nombreDe = useCallback((id) => {
    const p = equipo.find((x) => String(x.id) === String(id));
    return p ? (`${p.nombre || ''} ${p.apellidos || ''}`.trim() || p.email) : null;
  }, [equipo]);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return oportunidades.filter((o) => {
      if (soloMias && String(o.responsable_id || '') !== String(user?.id || '')) return false;
      if (!t) return true;
      const emp = empresaDe(o.empresa_id);
      return [o.titulo, emp ? nombreVisible(emp) : '', o.notas, o.origen].filter(Boolean).join(' ').toLowerCase().includes(t);
    });
  }, [oportunidades, q, soloMias, user?.id, empresaDe]);

  const abiertas = useMemo(() => lista.filter((o) => !['ganada', 'perdida'].includes(o.fase)), [lista]);

  // Las tres cifras que importan. La ponderada es la única que sirve para
  // prometer algo: sumar el embudo entero y llamarlo previsión es cómo se
  // llega a fin de trimestre con la mitad.
  const totales = useMemo(() => {
    const bruto = abiertas.reduce((n, o) => n + (Number(o.importe) || 0), 0);
    const ponderado = abiertas.reduce((n, o) => n + (Number(o.importe) || 0) * probDe(o) / 100, 0);
    const ganadas = lista.filter((o) => o.fase === 'ganada');
    const perdidas = lista.filter((o) => o.fase === 'perdida');
    const decididas = ganadas.length + perdidas.length;
    return {
      bruto, ponderado, n: abiertas.length,
      ganado: ganadas.reduce((n, o) => n + (Number(o.importe) || 0), 0),
      conversion: decididas ? Math.round((ganadas.length / decididas) * 100) : null,
    };
  }, [abiertas, lista]);

  const porFase = useMemo(() => {
    const m = {};
    for (const f of [...FASES, ...(verCerradas ? CERRADAS : [])]) {
      const xs = lista.filter((o) => o.fase === f.k)
        .sort((a, b) => String(a.fecha_cierre || '9999').localeCompare(String(b.fecha_cierre || '9999')));
      m[f.k] = { fase: f, xs, total: xs.reduce((n, o) => n + (Number(o.importe) || 0), 0) };
    }
    return m;
  }, [lista, verCerradas]);

  const avisar = (t) => { setMsg(t); setTimeout(() => setMsg(null), 3500); };

  async function guardarNueva(e) {
    e.preventDefault();
    if (!nueva.empresa_id || !nueva.titulo?.trim()) { avisar('Hacen falta empresa y título.'); return; }
    try {
      await insertRow('oportunidades', {
        empresa_id: nueva.empresa_id,
        contacto_id: nueva.contacto_id || null,
        titulo: nueva.titulo.trim(),
        fase: nueva.fase || 'nueva',
        importe: nueva.importe === '' ? null : Number(nueva.importe),
        fecha_cierre: nueva.fecha_cierre || null,
        origen: nueva.origen || null,
        // Quien la crea la trabaja, salvo que diga otra cosa. Es la misma
        // regla que con las cuentas: nada nace huérfano.
        responsable_id: nueva.responsable_id || user?.id || null,
        notas: nueva.notas || null,
      });
      setNueva(null); avisar('Oportunidad creada.'); cargar();
    } catch (err) { avisar(`No se pudo crear: ${err?.message || err}`); }
  }

  async function cambiar(o, patch) {
    try { await updateRow('oportunidades', o.id, patch); cargar(); }
    catch (err) { avisar(`No se pudo guardar: ${err?.message || err}`); }
  }

  async function borrar(o) {
    if (!window.confirm(`Se va a eliminar «${o.titulo}». No se puede deshacer.`)) return;
    try { await deleteRow('oportunidades', o.id); avisar('Eliminada.'); cargar(); }
    catch (err) { avisar(`No se pudo eliminar: ${err?.message || err}`); }
  }

  const contactosDe = (empresaId) => contactos.filter((c) => String(c.empresa_id || '') === String(empresaId));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Comercial</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#EAF4F7]">Oportunidades</h1>
          <p className="mt-1 text-sm font-medium text-[#9FC0CB]">
            El trato que se está trabajando, desde que aparece hasta que se gana o se pierde. Cuando llega a propuesta, la oferta se genera desde aquí.
          </p>
        </div>
        {puedeEditar && (
          <button onClick={() => setNueva({ fase: 'nueva', importe: '', fecha_cierre: '', responsable_id: user?.id || '' })}
            className="btn-primary !px-4 !py-2 text-[13px]">+ Nueva oportunidad</button>
        )}
      </div>

      {msg && <p className="rounded-xl bg-brand-orange/10 px-3 py-2 text-[12.5px] font-bold text-brand-orange">{msg}</p>}

      {/* Las cifras. La ponderada delante: es la que se puede prometer. */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Cifra etq="Previsión ponderada" valor={eur(totales.ponderado)} pie={`${totales.n} abierta(s)`} destacada />
        <Cifra etq="Embudo bruto" valor={eur(totales.bruto)} pie="suma sin ponderar" />
        <Cifra etq="Ganado" valor={eur(totales.ganado)} pie="oportunidades cerradas" />
        <Cifra etq="Conversión" valor={totales.conversion === null ? '—' : `${totales.conversion} %`}
          pie={totales.conversion === null ? 'sin cerradas todavía' : 'ganadas sobre decididas'} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: título, empresa, notas…" className="input max-w-sm !py-1.5 !text-[12.5px]" />
        <label className="flex items-center gap-1.5 text-[12px] font-bold text-[#9FC0CB]">
          <input type="checkbox" checked={soloMias} onChange={(e) => setSoloMias(e.target.checked)} /> Solo las mías
        </label>
        <label className="flex items-center gap-1.5 text-[12px] font-bold text-[#9FC0CB]">
          <input type="checkbox" checked={verCerradas} onChange={(e) => setVerCerradas(e.target.checked)} /> Ver cerradas
        </label>
        <span className="text-[12px] text-[#7FA7B4]">{lista.length} de {oportunidades.length}</span>
      </div>

      {nueva && puedeEditar && (
        <form onSubmit={guardarNueva} className="space-y-2 rounded-xl border border-[#1E5468] bg-[#0D3242] p-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Campo etq="Empresa *">
              <select className="input !py-1.5 !text-[13px]" value={nueva.empresa_id || ''}
                onChange={(e) => setNueva({ ...nueva, empresa_id: e.target.value, contacto_id: '' })}>
                <option value="">— elegir —</option>
                {[...empresas].sort((a, b) => nombreVisible(a).localeCompare(nombreVisible(b), 'es'))
                  .map((e) => <option key={e.id} value={e.id}>{nombreVisible(e)}</option>)}
              </select>
            </Campo>
            <Campo etq="Título *">
              <input className="input !py-1.5 !text-[13px]" value={nueva.titulo || ''} placeholder="ISO 27001 + ENS"
                onChange={(e) => setNueva({ ...nueva, titulo: e.target.value })} />
            </Campo>
            <Campo etq="Contacto">
              <select className="input !py-1.5 !text-[13px]" value={nueva.contacto_id || ''}
                onChange={(e) => setNueva({ ...nueva, contacto_id: e.target.value })}>
                <option value="">— ninguno —</option>
                {contactosDe(nueva.empresa_id).map((c) => <option key={c.id} value={c.id}>{c.nombre} {c.apellidos || ''}</option>)}
              </select>
            </Campo>
            <Campo etq="Importe (€)">
              <input className="input !py-1.5 !text-[13px]" type="number" min="0" step="100" value={nueva.importe}
                onChange={(e) => setNueva({ ...nueva, importe: e.target.value })} />
            </Campo>
            <Campo etq="Cierre previsto">
              <input className="input !py-1.5 !text-[13px]" type="date" min={hoy()} value={nueva.fecha_cierre}
                onChange={(e) => setNueva({ ...nueva, fecha_cierre: e.target.value })} />
            </Campo>
            <Campo etq="Fase">
              <select className="input !py-1.5 !text-[13px]" value={nueva.fase}
                onChange={(e) => setNueva({ ...nueva, fase: e.target.value })}>
                {FASES.map((f) => <option key={f.k} value={f.k}>{f.label}</option>)}
              </select>
            </Campo>
            <Campo etq="Responsable">
              <select className="input !py-1.5 !text-[13px]" value={nueva.responsable_id || ''}
                onChange={(e) => setNueva({ ...nueva, responsable_id: e.target.value })}>
                <option value="">— sin asignar —</option>
                {equipo.filter((x) => x.activo !== false && x.rol !== 'cliente')
                  .map((x) => <option key={x.id} value={x.id}>{nombreDe(x.id)}</option>)}
              </select>
            </Campo>
            <Campo etq="Origen">
              <input className="input !py-1.5 !text-[13px]" value={nueva.origen || ''} placeholder="LinkedIn, referencia, web…"
                onChange={(e) => setNueva({ ...nueva, origen: e.target.value })} />
            </Campo>
            <Campo etq="Notas">
              <input className="input !py-1.5 !text-[13px]" value={nueva.notas || ''}
                onChange={(e) => setNueva({ ...nueva, notas: e.target.value })} />
            </Campo>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary !px-3 !py-1.5 text-[12.5px]">Crear</button>
            <button type="button" onClick={() => setNueva(null)} className="btn-ghost !px-3 !py-1.5 text-[12.5px]">Cancelar</button>
          </div>
        </form>
      )}

      {cargando ? (
        <p className="card py-8 text-center text-[13px] text-[#7FA7B4]">Cargando…</p>
      ) : !lista.length ? (
        <p className="card py-8 text-center text-[13px] text-[#7FA7B4]">
          {oportunidades.length ? 'Ninguna oportunidad con ese filtro.' : 'Todavía no hay oportunidades. La primera se crea con el botón de arriba.'}
        </p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {Object.values(porFase).map(({ fase, xs, total }) => (
            <div key={fase.k} className="rounded-xl border border-[#1E5468] bg-[#0D3242]/60 p-2">
              <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
                <span className={`chip !px-2 !py-0.5 text-[10.5px] font-extrabold ${fase.color}`}>{fase.label}</span>
                <span className="text-[10.5px] font-bold text-[#7FA7B4]">{xs.length} · {eur(total)}</span>
              </div>
              <div className="space-y-1.5">
                {!xs.length && <p className="px-1 py-3 text-center text-[11px] text-[#5F8494]">Vacía</p>}
                {xs.map((o) => (
                  <Tarjeta
                    key={o.id} o={o} empresa={empresaDe(o.empresa_id)}
                    contacto={contactos.find((c) => String(c.id) === String(o.contacto_id))}
                    responsable={nombreDe(o.responsable_id)}
                    puedeEditar={puedeEditar} abierta={editando === o.id}
                    onAbrir={() => setEditando(editando === o.id ? null : o.id)}
                    onCambiar={(patch) => cambiar(o, patch)} onBorrar={() => borrar(o)}
                    equipo={equipo} nombreDe={nombreDe}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Cifra({ etq, valor, pie, destacada = false }) {
  return (
    <div className={`rounded-xl border p-3 ${destacada ? 'border-brand-orange/40 bg-brand-orange/[0.07]' : 'border-[#1E5468] bg-[#0D3242]'}`}>
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{etq}</p>
      <p className={`mt-0.5 text-xl font-extrabold tracking-tight ${destacada ? 'text-brand-orange' : 'text-[#EAF4F7]'}`}>{valor}</p>
      <p className="text-[11px] font-medium text-[#7FA7B4]">{pie}</p>
    </div>
  );
}

function Campo({ etq, children }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{etq}</span>
      {children}
    </label>
  );
}

function Tarjeta({ o, empresa, contacto, responsable, puedeEditar, abierta, onAbrir, onCambiar, onBorrar, equipo, nombreDe }) {
  const prob = probDe(o);
  // Lo que el generador de ofertas sabe leer. Si falta algo, allí se pide: es
  // mejor llegar con cuatro campos puestos que con ninguno.
  const prefill = {
    empresa: empresa ? nombreVisible(empresa) : '',
    cif: empresa?.cif || '',
    email: contacto?.email || empresa?.email || '',
    telefono: contacto?.telefono || empresa?.telefono || '',
    contacto: contacto?.nombre || '',
    contacto_apellidos: contacto?.apellidos || '',
  };
  // Una fecha de cierre pasada en una oportunidad abierta no es un detalle:
  // es la señal más barata de que el embudo está contando algo que no existe.
  const vencida = o.fecha_cierre && o.fecha_cierre < hoy() && !['ganada', 'perdida'].includes(o.fase);

  return (
    <div className={`rounded-lg border bg-[#0A2B3A] p-2 transition ${vencida ? 'border-red-500/40' : 'border-[#1E5468]'}`}>
      <button type="button" onClick={onAbrir} className="block w-full text-left">
        <p className="truncate text-[12.5px] font-extrabold leading-tight text-[#EAF4F7]">{o.titulo}</p>
        {empresa && (
          <p className="truncate text-[11px] font-semibold text-[#9FC0CB]">{nombreVisible(empresa)}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] font-bold">
          <span className="text-brand-orange">{eur(o.importe)}</span>
          <span className="text-[#5F8494]">·</span>
          <span className="text-[#7FA7B4]">{prob} %</span>
          {o.fecha_cierre && <>
            <span className="text-[#5F8494]">·</span>
            <span className={vencida ? 'text-red-300' : 'text-[#7FA7B4]'}>
              {new Date(`${o.fecha_cierre}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
            </span>
          </>}
        </div>
        {responsable && <p className="mt-0.5 truncate text-[10.5px] text-[#5F8494]">{responsable}</p>}
      </button>

      {abierta && (
        <div className="mt-2 space-y-1.5 border-t border-[#1E5468] pt-2">
          {puedeEditar ? (
            <>
              <select className="input !py-1 !text-[11.5px]" value={o.fase}
                onChange={(e) => onCambiar({ fase: e.target.value })} title="Mover de fase">
                {TODAS.map((f) => <option key={f.k} value={f.k}>{f.label}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-1.5">
                <input className="input !py-1 !text-[11.5px]" type="number" min="0" step="100" defaultValue={o.importe ?? ''}
                  placeholder="Importe" onBlur={(e) => {
                    const v = e.target.value === '' ? null : Number(e.target.value);
                    if (String(v) !== String(o.importe ?? '')) onCambiar({ importe: v });
                  }} />
                <input className="input !py-1 !text-[11.5px]" type="date" defaultValue={o.fecha_cierre || ''}
                  onBlur={(e) => { if (e.target.value !== (o.fecha_cierre || '')) onCambiar({ fecha_cierre: e.target.value || null }); }} />
              </div>
              <input className="input !py-1 !text-[11.5px]" type="number" min="0" max="100" defaultValue={o.probabilidad ?? ''}
                placeholder={`Probabilidad (${faseDe(o.fase).prob} % por la fase)`}
                onBlur={(e) => {
                  const v = e.target.value === '' ? null : Number(e.target.value);
                  if (String(v) !== String(o.probabilidad ?? '')) onCambiar({ probabilidad: v });
                }} />
              <select className="input !py-1 !text-[11.5px]" value={o.responsable_id || ''}
                onChange={(e) => onCambiar({ responsable_id: e.target.value || null })} title="Responsable">
                <option value="">— sin asignar —</option>
                {equipo.filter((x) => x.activo !== false && x.rol !== 'cliente')
                  .map((x) => <option key={x.id} value={x.id}>{nombreDe(x.id)}</option>)}
              </select>
              {o.fase === 'perdida' && (
                <input className="input !py-1 !text-[11.5px]" defaultValue={o.motivo_perdida || ''} placeholder="¿Por qué se perdió?"
                  onBlur={(e) => { if (e.target.value !== (o.motivo_perdida || '')) onCambiar({ motivo_perdida: e.target.value || null }); }} />
              )}
            </>
          ) : (
            <p className="text-[11px] text-[#7FA7B4]">{o.notas || 'Sin notas.'}</p>
          )}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {/* Del embudo a la oferta sin copiar nada a mano. El generador ya
                sabía prerrellenarse desde la ficha de un cliente
                (`location.state.clientePrefill`): se reutiliza ese mismo
                camino en vez de inventar otro. */}
            <Link to="../planificador" state={{ clientePrefill: prefill }}
              className="rounded border border-[#1E5468] px-2 py-1 text-[10.5px] font-bold text-[#9FC0CB] hover:border-brand-orange/50 hover:text-[#EAF4F7]">
              Generar oferta →
            </Link>
            {empresa && (
              <Link to={`../empresas?e=${o.empresa_id}`}
                className="rounded border border-[#1E5468] px-2 py-1 text-[10.5px] font-bold text-[#9FC0CB] hover:border-brand-verde/50 hover:text-[#EAF4F7]">
                Ver cuenta
              </Link>
            )}
            {puedeEditar && (
              <button onClick={onBorrar} className="rounded border border-red-500/30 px-2 py-1 text-[10.5px] font-bold text-red-300 hover:bg-red-500/10">
                Eliminar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
