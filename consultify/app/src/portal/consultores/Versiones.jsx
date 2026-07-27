import { useCallback, useEffect, useMemo, useState } from 'react';
import { listTable, insertRow, updateRow, deleteRow } from '../../lib/data.js';
import { useAuth } from '../../lib/auth.jsx';
import { registrar } from '../../lib/registro.js';

// ════════════════════════════════════════════════════════════════════════════
// BACKLOG DE VERSIONES
// Qué se ha desplegado, cuándo y qué cambió. Sirve para dos cosas: saber a qué
// versión volver cuando algo se rompe, y tener trazabilidad del cambio, que es
// lo que pregunta cualquier auditoría de sistemas.
// ════════════════════════════════════════════════════════════════════════════

const TIPOS = [
  { k: 'funcionalidad', label: 'Funcionalidad', tono: 'bg-brand-verde/15 text-brand-verdeTexto' },
  { k: 'correccion',    label: 'Corrección',    tono: 'bg-brand-orange/15 text-brand-orange' },
  { k: 'seguridad',     label: 'Seguridad',     tono: 'bg-red-500/15 text-red-300' },
  { k: 'contenido',     label: 'Contenido',     tono: 'bg-sky-400/15 text-sky-300' },
  { k: 'datos',         label: 'Datos',         tono: 'bg-violet-400/15 text-violet-300' },
];
const ESTADOS = [
  { k: 'pendiente',  label: 'Pendiente',  tono: 'bg-white/8 text-[#9FC0CB]' },
  { k: 'desplegada', label: 'Desplegada', tono: 'bg-emerald-500/15 text-emerald-300' },
  { k: 'revertida',  label: 'Revertida',  tono: 'bg-red-500/15 text-red-300' },
];
const TIPO = Object.fromEntries(TIPOS.map((t) => [t.k, t]));
const ESTADO = Object.fromEntries(ESTADOS.map((e) => [e.k, e]));

const NUEVA = () => ({
  numero: '', titulo: '', notas: '', tipo: 'funcionalidad',
  estado: 'desplegada', fecha: new Date().toISOString().slice(0, 10),
});

export default function Versiones() {
  const { role, demo } = useAuth();
  const puedeEditar = ['superadmin', 'admin', 'director'].includes(role);

  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const [filtro, setFiltro] = useState('todas');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await listTable('versiones').catch(() => []);
      (r || []).sort((a, b) => String(b.fecha || b.creado).localeCompare(String(a.fecha || a.creado)));
      setFilas(r || []);
    } finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(
    () => filtro === 'todas' ? filas : filas.filter((f) => f.tipo === filtro || f.estado === filtro),
    [filas, filtro],
  );

  async function guardar() {
    if (!form.numero.trim()) { setMsg({ err: true, t: 'Falta el número de versión.' }); return; }
    if (!form.titulo.trim()) { setMsg({ err: true, t: 'Falta el título.' }); return; }
    const fila = {
      numero: form.numero.trim(), titulo: form.titulo.trim(),
      notas: form.notas?.trim() || null, tipo: form.tipo, estado: form.estado,
      fecha: form.fecha || null,
    };
    try {
      if (form.id) { await updateRow('versiones', form.id, fila); await registrar('editar', { entidad: 'versiones', entidad_id: form.id, detalle: fila.numero }); }
      else { const n = await insertRow('versiones', fila); await registrar('crear', { entidad: 'versiones', entidad_id: n?.id, detalle: fila.numero }); }
      setForm(null); await cargar();
      setMsg({ t: `Versión ${fila.numero} guardada.` });
    } catch (e) {
      const m = e?.message || String(e);
      setMsg({ err: true, t: /duplicate|unique/i.test(m) ? `Ya existe una versión con el número ${fila.numero}.` : `No se pudo guardar: ${m}` });
    }
  }

  async function borrar(v) {
    if (!window.confirm(`¿Eliminar ${v.numero} del backlog? El despliegue no se toca, solo el registro.`)) return;
    await deleteRow('versiones', v.id);
    await registrar('borrar', { entidad: 'versiones', entidad_id: v.id, detalle: v.numero });
    cargar();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Organización</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#EAF4F7]">Backlog de versiones</h1>
          <p className="mt-1 max-w-2xl text-sm font-medium text-[#9FC0CB]">
            Qué se ha desplegado, cuándo y qué cambió. Es la respuesta a «¿desde cuándo pasa esto?»
            y a la trazabilidad del cambio que pide cualquier auditoría.
          </p>
        </div>
        {puedeEditar && !form && (
          <button onClick={() => { setForm(NUEVA()); setMsg(null); }} className="btn-orange">+ Anotar versión</button>
        )}
      </div>

      {demo && <div className="rounded-xl bg-brand-orange/10 p-3 text-xs font-semibold text-brand-orange">Modo demo: los cambios no se guardan.</div>}
      {msg && (
        <div className={`rounded-xl px-3 py-2 text-xs font-bold ${msg.err ? 'bg-red-500/12 text-red-300' : 'bg-emerald-500/12 text-emerald-300'}`}>
          <button onClick={() => setMsg(null)} className="float-right text-[#7FA7B4] hover:text-white">×</button>{msg.t}
        </div>
      )}

      {form && (
        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-orange">
              {form.id ? 'Editar versión' : 'Nueva versión'}
            </h2>
            <button onClick={() => setForm(null)} className="text-xs font-bold text-[#7FA7B4] hover:text-[#EAF4F7]">Cancelar</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label" htmlFor="v-num">Número</label>
              <input id="v-num" className="input !py-1.5 !text-[13px]" placeholder="v86"
                value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="v-fecha">Fecha</label>
              <input id="v-fecha" type="date" className="input !py-1.5 !text-[13px]"
                value={form.fecha || ''} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="v-tipo">Tipo</label>
              <select id="v-tipo" className="input !py-1.5 !text-[13px]" value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                {TIPOS.map((t) => <option key={t.k} value={t.k}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="v-estado">Estado</label>
              <select id="v-estado" className="input !py-1.5 !text-[13px]" value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                {ESTADOS.map((x) => <option key={x.k} value={x.k}>{x.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="label" htmlFor="v-titulo">Título</label>
              <input id="v-titulo" className="input !py-1.5 !text-[13px]" placeholder="Banner de portada con siete anuncios"
                value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="label" htmlFor="v-notas">Qué cambió</label>
              <textarea id="v-notas" rows={3} className="input !py-1.5 !text-[13px]"
                placeholder="Una línea por cambio. Si hay migración de base de datos, ponlo aquí."
                value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={guardar} className="btn-orange !px-4 !py-1.5 text-xs">{form.id ? 'Guardar' : 'Anotar'}</button>
            <button onClick={() => setForm(null)} className="btn-ghost !px-3 !py-1.5 text-xs">Cancelar</button>
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-1.5">
        {[{ k: 'todas', label: 'Todas' }, ...TIPOS, ...ESTADOS].map((f) => (
          <button key={f.k} onClick={() => setFiltro(f.k)}
            className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${
              filtro === f.k ? 'border-brand-orange bg-brand-orange/15 text-brand-orange' : 'border-[#1E5468] text-[#9FC0CB] hover:border-brand-orange/60'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {cargando ? <p className="py-8 text-center text-[#7FA7B4]">Cargando…</p> : (
        <section className="space-y-2">
          {visibles.length === 0 && (
            <div className="card text-center text-sm font-medium text-[#9FC0CB]">
              No hay versiones anotadas.
              <span className="mt-2 block text-xs text-[#7FA7B4]">Si la tabla no existe todavía, ejecuta la migración v60 en Supabase.</span>
            </div>
          )}
          {visibles.map((v) => (
            <article key={v.id} className="card !p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-extrabold text-[#EAF4F7]">{v.numero}</span>
                    <span className={`chip !px-2 !py-0 text-[10px] ${TIPO[v.tipo]?.tono || ''}`}>{TIPO[v.tipo]?.label || v.tipo}</span>
                    <span className={`chip !px-2 !py-0 text-[10px] ${ESTADO[v.estado]?.tono || ''}`}>{ESTADO[v.estado]?.label || v.estado}</span>
                    {v.fecha && <span className="text-[11px] text-[#7FA7B4]">{new Date(`${v.fecha}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                  </div>
                  <p className="mt-1 text-sm font-bold text-[#EAF4F7]">{v.titulo}</p>
                  {v.notas && <p className="mt-1 whitespace-pre-line text-[12.5px] leading-relaxed text-[#9FC0CB]">{v.notas}</p>}
                </div>
                {puedeEditar && (
                  <div className="flex shrink-0 gap-1.5">
                    <button onClick={() => setForm({ ...v, fecha: v.fecha ? String(v.fecha).slice(0, 10) : '' })}
                      className="rounded-lg border border-[#1E5468] px-2.5 py-1 text-[11px] font-bold text-[#9FC0CB] hover:border-brand-verde hover:text-[#EAF4F7]">Editar</button>
                    <button onClick={() => borrar(v)} className="rounded-lg px-2 py-1 text-[11px] font-bold text-red-300 hover:text-red-200">Eliminar</button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
