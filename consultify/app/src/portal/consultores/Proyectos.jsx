import { useEffect, useMemo, useState } from 'react';
import { listTable, insertRow, updateRow, deleteRow } from '../../lib/data.js';
import { NORMAS, NORMA_BY_ID, MODELO_IDS, calcular, fmtEUR } from '../../lib/calcEngine.js';
import { useAuth } from '../../lib/auth.jsx';
import {
  semaforo, TONO_SEMAFORO, ordenarPorUrgencia, resumen, fechaFinPorDefecto,
  fmtFecha, necesitaRenovacion, DIAS_AVISO_AMARILLO, DIAS_AVISO_ROJO,
} from '../../lib/proyectos.js';

const ESTADOS = ['implantación', 'activo', 'pausado', 'cerrado'];
const COLOR_ESTADO = { activo: 'bg-green-100 text-green-800', 'implantación': 'bg-brand-orange/20 text-[#F9A83A]', pausado: 'bg-[#123F52] text-[#9FC0CB]', cerrado: 'bg-[#0D3242] text-[#7FA7B4]' };
const VACIO = { cliente_id: '', normas: ['9001'], modelo: 'Implicación', consultor_id: '', estado: 'implantación', fecha_inicio: '', fecha_fin: '', fecha_auditoria: '', notas: '' };

export default function Proyectos() {
  const { verEconomico } = useAuth();
  const [proyectos, setProyectos] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [consultores, setConsultores] = useState([]);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState(null);

  const load = () => Promise.all([listTable('proyectos'), listTable('clientes'), listTable('consultores')])
    .then(([p, cl, co]) => { setProyectos(p); setClientes(cl); setConsultores(co); })
    .catch(() => setProyectos([]));
  useEffect(() => { load(); }, []);

  // Cálculo en vivo del formulario
  const calc = useMemo(() => form?.normas?.length ? calcular(form.normas, form.modelo) : null, [form?.normas, form?.modelo]);

  // Fecha de fin que correspondería al modelo y al inicio elegidos.
  const sugerenciaFin = useMemo(() => (form ? fechaFinPorDefecto(form) : ''), [form?.modelo, form?.fecha_inicio, form?.fecha_auditoria]);

  // Filtrado inteligente: solo consultores activos que dominan TODAS las normas del proyecto
  const consultoresAptos = useMemo(() => {
    if (!form?.normas?.length) return consultores.filter(c => c.activo);
    return consultores.filter(c => c.activo && form.normas.every(n => (c.normas || []).includes(n)));
  }, [consultores, form?.normas]);

  async function guardar(e) {
    e.preventDefault(); setErr(null);
    if (!form.normas.length) { setErr('Selecciona al menos una norma.'); return; }
    if (form.fecha_inicio && form.fecha_fin && form.fecha_fin <= form.fecha_inicio) {
      setErr('La fecha de fin debe ser posterior a la de inicio.'); return;
    }
    const payload = {
      cliente_id: form.cliente_id || null,
      normas: form.normas, modelo: form.modelo,
      consultor_id: form.consultor_id || null,
      estado: form.estado,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
      fecha_auditoria: form.fecha_auditoria || null,
      renovacion_emitida: form.renovacion_emitida || null,
      notas: form.notas,
      h_total_mes: calc?.tipo === 'mes' ? calc.hTotal : null,
      precio_mes: calc?.tipo === 'mes' ? calc.precioCatalogo : null,
      precio_total: calc?.tipo === 'bolsa' ? calc.precioCatalogo : null,
    };
    try {
      if (form.id) await updateRow('proyectos', form.id, payload);
      else await insertRow('proyectos', payload);
      setForm(null); load();
    } catch (e2) { setErr(e2.message); }
  }

  async function borrar(id) {
    if (!confirm('¿Eliminar este proyecto?')) return;
    await deleteRow('proyectos', id); load();
  }

  // Ordenados por urgencia: lo que vence antes, arriba. Un listado por fecha de
  // alta obliga a buscar lo urgente; este lo pone delante.
  const ordenados = useMemo(() => ordenarPorUrgencia(proyectos || []), [proyectos]);
  const avisos = useMemo(() => ordenados.filter(necesitaRenovacion), [ordenados]);

  if (!proyectos) return <p className="font-semibold text-[#9FC0CB]">Cargando…</p>;

  const nombreCliente = id => clientes.find(c => c.id === id)?.empresa || '—';
  const nombreConsultor = id => consultores.find(c => c.id === id)?.nombre || 'Sin asignar';
  const abrir = (p) => setForm({ ...VACIO, ...p, normas: [...new Set(['9001', ...(p.normas || [])])], consultor_id: p.consultor_id || '', cliente_id: p.cliente_id || '' });

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setForm({ ...VACIO })} className="btn-orange">+ Nuevo proyecto</button>
      </div>

      {form && (
        <form onSubmit={guardar} className="card space-y-5">
          <h3 className="font-extrabold">{form.id ? 'Editar proyecto' : 'Nuevo proyecto'} <span className="ml-2 text-sm font-semibold text-[#7FA7B4]">la calculadora aplica el catálogo v2026</span></h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="p-cliente">Cliente</label>
              <select id="p-cliente" required className="input" value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })}>
                <option value="">— Selecciona —</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.empresa}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="p-modelo">Modelo</label>
              <select id="p-modelo" className="input" value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })}>
                {MODELO_IDS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <p className="label">Normas del proyecto <span className="normal-case text-[#7FA7B4]">(ISO 9001 siempre incluida)</span></p>
            <div className="flex flex-wrap gap-2">
              {NORMAS.map(n => {
                const on = form.normas.includes(n.id);
                const fija = n.id === '9001';
                return (
                  <button type="button" key={n.id} aria-disabled={fija}
                    onClick={() => { if (fija) return; setForm({ ...form, normas: on ? form.normas.filter(x => x !== n.id) : [...form.normas, n.id], consultor_id: '' }); }}
                    className={`chip border transition ${fija ? 'border-navy-800 bg-navy-800 text-white cursor-default' : on ? 'border-brand-orange bg-brand-orange/15 text-[#EAF4F7]' : 'border-[#1E5468] bg-[#10394A] text-[#9FC0CB] hover:border-navy-400'}`}>
                    {n.nombre}{fija ? ' ✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {calc && verEconomico && (
            <div className="rounded-2xl bg-navy-900 p-4 text-white">
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
                <p className="text-2xl font-extrabold">{fmtEUR(calc.precioCatalogo)}<span className="text-sm font-bold text-white/60">{calc.tipo === 'mes' ? '/mes' : ' único'}</span></p>
                <p className="font-semibold text-white/70">{calc.hTotal} h{calc.tipo === 'mes' ? '/mes' : ''} · J2 {calc.horas.J2} h · J3 {calc.horas.J3} h · Senior {calc.horas.Senior} h</p>
                <p className="font-semibold text-white/50">exacto {fmtEUR(calc.precioExacto)} · coste {fmtEUR(calc.coste)}</p>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label" htmlFor="p-consultor">Consultor/a {form.normas.length > 0 && <span className="normal-case text-[#7FA7B4]">({consultoresAptos.length} disponibles)</span>}</label>
              <select id="p-consultor" className="input" value={form.consultor_id} onChange={e => setForm({ ...form, consultor_id: e.target.value })}>
                <option value="">Sin asignar</option>
                {consultoresAptos.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.nivel})</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="p-estado">Estado</label>
              <select id="p-estado" className="input" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                {ESTADOS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="p-inicio">Fecha de inicio</label>
              <input id="p-inicio" type="date" className="input" value={form.fecha_inicio || ''}
                onChange={e => {
                  // Al fijar el inicio se propone el fin según el modelo. Se
                  // propone, no se impone: si ya había una fecha puesta a mano
                  // no se pisa.
                  const fi = e.target.value;
                  const sugerida = fechaFinPorDefecto({ ...form, fecha_inicio: fi });
                  setForm({ ...form, fecha_inicio: fi, fecha_fin: form.fecha_fin || sugerida });
                }} />
            </div>
            <div>
              <label className="label" htmlFor="p-audit">Auditoría externa</label>
              <input id="p-audit" type="date" className="input" value={form.fecha_auditoria || ''}
                onChange={e => setForm({ ...form, fecha_auditoria: e.target.value })} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label" htmlFor="p-fin">Fecha de fin de contrato</label>
              <input id="p-fin" type="date" className="input" value={form.fecha_fin || ''}
                onChange={e => setForm({ ...form, fecha_fin: e.target.value })} />
              {sugerenciaFin && sugerenciaFin !== form.fecha_fin && (
                <button type="button" onClick={() => setForm({ ...form, fecha_fin: sugerenciaFin })}
                  className="mt-1 text-[11.5px] font-bold text-[#F9A83A] hover:underline">
                  Usar {fmtFecha(sugerenciaFin)} ({form.modelo === 'Implantación' ? 'auditoría o 12 meses' : '12 meses de contrato'})
                </button>
              )}
            </div>
            <div>
              <label className="label" htmlFor="p-renov">Renovación emitida el</label>
              <input id="p-renov" type="date" className="input" value={form.renovacion_emitida || ''}
                onChange={e => setForm({ ...form, renovacion_emitida: e.target.value })} />
              <p className="mt-1 text-[11.5px] text-[#7FA7B4]">Al rellenarla, el aviso deja de saltar.</p>
            </div>
            {form.fecha_fin && (
              <div className="sm:col-span-2">
                <p className="label">Aviso de renovación</p>
                {(() => {
                  const s = semaforo(form);
                  const t = TONO_SEMAFORO[s.nivel];
                  return (
                    <div className={`rounded-xl border ${t.borde} bg-[#0D3242] px-3 py-2.5`}>
                      <p className={`chip ${t.chip} !px-2.5 !py-0.5 text-[11px] font-extrabold`}>{s.etiqueta}</p>
                      <p className="mt-1.5 text-[12px] leading-snug text-[#B9D2DA]">
                        {s.detalle || `Fin de contrato: ${fmtFecha(form.fecha_fin)}. La oferta de renovación se emite un mes antes.`}
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {form.modelo === 'Apoyo' && form.fecha_auditoria && diasHasta(form.fecha_auditoria) < 60 && (
            <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-300">⚠ Apoyo no es contratable a menos de 60 días de la auditoría externa ({diasHasta(form.fecha_auditoria)} días). Cambia el modelo o la fecha.</p>
          )}

          <div><label className="label" htmlFor="p-notas">Notas</label><textarea id="p-notas" rows="2" className="input" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></div>

          {err && <p className="text-sm font-bold text-red-300">{err}</p>}
          <div className="flex gap-3">
            <button className="btn-primary" disabled={form.modelo === 'Apoyo' && form.fecha_auditoria && diasHasta(form.fecha_auditoria) < 60}>Guardar</button>
            <button type="button" onClick={() => setForm(null)} className="btn-ghost">Cancelar</button>
          </div>
        </form>
      )}

      {/* Aviso de vencimientos. Solo aparece si hay algo que hacer: una barra
          permanente se vuelve invisible a las dos semanas. */}
      {avisos.length > 0 && (
        <div className="card border-l-4 border-l-amber-300 !py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[15px] font-extrabold text-[#EAF4F7]">
              {avisos.length} proyecto{avisos.length > 1 ? 's' : ''} pendiente{avisos.length > 1 ? 's' : ''} de renovación
            </h3>
            <p className="text-[11.5px] font-semibold text-[#7FA7B4]">
              Aviso a {DIAS_AVISO_AMARILLO} días · urgente a {DIAS_AVISO_ROJO}
            </p>
          </div>
          <ul className="mt-3 space-y-1.5">
            {avisos.map(p => {
              const s = semaforo(p); const t = TONO_SEMAFORO[s.nivel];
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${t.punto}`} aria-hidden="true" />
                  <button onClick={() => abrir(p)} className="font-extrabold text-[#EAF4F7] hover:underline">
                    {nombreCliente(p.cliente_id)}
                  </button>
                  <span className="text-[#7FA7B4]">{p.modelo}</span>
                  <span className={`chip ${t.chip} !px-2 !py-0.5 text-[10.5px] font-extrabold`}>{s.etiqueta}</span>
                  <span className="text-[#9FC0CB]">fin {fmtFecha(p.fecha_fin)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[1020px] text-sm">
          <caption className="sr-only">Proyectos, ordenados por proximidad del fin de contrato</caption>
          <thead><tr className="border-b border-[#1E5468] text-left text-xs font-bold uppercase tracking-wider text-[#7FA7B4]">
            <th className="px-5 py-3">Cliente</th><th className="px-5 py-3">Normas</th><th className="px-5 py-3">Modelo</th><th className="px-5 py-3">Consultor/a</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3">Inicio</th><th className="px-5 py-3">Fin</th><th className="px-5 py-3">Vencimiento</th>{verEconomico && <th className="px-5 py-3 text-right">Precio</th>}<th className="px-5 py-3 text-right">Acciones</th>
          </tr></thead>
          <tbody className="divide-y divide-navy-50">
            {ordenados.map(p => {
              const s = semaforo(p); const t = TONO_SEMAFORO[s.nivel];
              const urge = s.nivel === 'rojo' || s.nivel === 'vencido';
              return (
              <tr key={p.id} className={urge ? 'bg-red-500/[0.06]' : s.nivel === 'amarillo' ? 'bg-amber-400/[0.05]' : undefined}>
                <td className="px-5 py-3 font-extrabold">{nombreCliente(p.cliente_id)}</td>
                <td className="px-5 py-3 font-medium text-[#9FC0CB]">{(p.normas || []).map(id => NORMA_BY_ID[id]?.nombre || id).join(' + ')}</td>
                <td className="px-5 py-3 font-semibold">{p.modelo}</td>
                <td className="px-5 py-3 font-medium">{nombreConsultor(p.consultor_id)}</td>
                <td className="px-5 py-3"><span className={`chip ${COLOR_ESTADO[p.estado] || COLOR_ESTADO.pausado}`}>{p.estado}</span></td>
                <td className="px-5 py-3 font-medium text-[#9FC0CB] whitespace-nowrap">{fmtFecha(p.fecha_inicio)}</td>
                <td className="px-5 py-3 font-semibold whitespace-nowrap">{fmtFecha(p.fecha_fin)}</td>
                <td className="px-5 py-3 whitespace-nowrap">
                  <span className={`chip ${t.chip} !px-2.5 !py-0.5 text-[11px] font-extrabold`}>{s.etiqueta}</span>
                  {p.renovacion_emitida && (
                    <span className="ml-1.5 text-[10.5px] font-bold text-emerald-300" title={`Renovación emitida el ${fmtFecha(p.renovacion_emitida)}`}>✓ renov.</span>
                  )}
                </td>
                {verEconomico && <td className="px-5 py-3 text-right font-extrabold">{p.precio_mes ? `${fmtEUR(p.precio_mes)}/mes` : p.precio_total ? fmtEUR(p.precio_total) : '—'}</td>}
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button onClick={() => abrir(p)} className="font-bold text-[#CFE3E9] hover:underline">Editar</button>
                  <button onClick={() => borrar(p.id)} className="ml-4 font-bold text-red-300 hover:underline">Eliminar</button>
                </td>
              </tr>
            ); })}
            {!ordenados.length && <tr><td colSpan={verEconomico ? 10 : 9} className="px-5 py-8 text-center font-medium text-[#9FC0CB]">Sin proyectos activos.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function diasHasta(fecha) {
  return Math.ceil((new Date(fecha) - new Date()) / 86400000);
}
