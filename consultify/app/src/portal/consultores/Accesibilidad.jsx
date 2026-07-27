import { useCallback, useEffect, useMemo, useState } from 'react';
import { listTable, updateRow } from '../../lib/data.js';
import { useAuth } from '../../lib/auth.jsx';
import { registrar } from '../../lib/registro.js';

// ════════════════════════════════════════════════════════════════════════════
// AUDITORÍA INTERNA DE ACCESIBILIDAD · UNE 139803:2012
//
// Checklist permanente de los 61 criterios (A, AA y AAA) con aplicabilidad,
// método de verificación, estado y evidencia. Es lo que sostiene la declaración
// de accesibilidad del RD 1112/2018: sin método y fecha registrados, una
// declaración de conformidad no aguanta una revisión externa.
// ════════════════════════════════════════════════════════════════════════════

const METODOS = [
  { k: 'manual',     label: 'Inspección manual',      ayuda: 'Revisión del código y del comportamiento a mano' },
  { k: 'automatico', label: 'Validador automático',   ayuda: 'axe, WAVE, Lighthouse u otra herramienta' },
  { k: 'lector',     label: 'Lector de pantalla',     ayuda: 'NVDA, JAWS o VoiceOver' },
  { k: 'teclado',    label: 'Solo teclado',           ayuda: 'Recorrido completo sin ratón' },
  { k: 'contraste',  label: 'Medición de contraste',  ayuda: 'Ratio calculado sobre el color real' },
  { k: 'zoom',       label: 'Ampliación 200 %/400 %', ayuda: 'Reflujo y pérdida de contenido' },
  { k: 'usuarios',   label: 'Prueba con personas',    ayuda: 'Validación con personas usuarias reales' },
];
const METODO = Object.fromEntries(METODOS.map((m) => [m.k, m]));

const ESTADOS = [
  { k: 'pendiente', label: 'Pendiente', tono: 'bg-white/8 text-[#9FC0CB]' },
  { k: 'cumple',    label: 'Cumple',    tono: 'bg-emerald-500/15 text-emerald-300' },
  { k: 'parcial',   label: 'Parcial',   tono: 'bg-brand-orange/15 text-brand-orange' },
  { k: 'no_cumple', label: 'No cumple', tono: 'bg-red-500/15 text-red-300' },
];
const ESTADO = Object.fromEntries(ESTADOS.map((e) => [e.k, e]));
const NIVELES = ['A', 'AA', 'AAA'];

// De dónde viene cada criterio. Importa para saber qué es exigible: en España el
// RD 1112/2018 remite a EN 301 549, que apunta a WCAG 2.1 AA. Lo que solo está en
// la 2.2 es mejora voluntaria.
const ORIGENES = [
  { k: 'une',    label: 'UNE 139803',  corto: 'UNE',     tono: 'bg-brand-orange/15 text-brand-orange',
    ayuda: 'Está en UNE 139803:2012, es decir en WCAG 2.0. Exigible.' },
  { k: 'wcag21', label: 'WCAG 2.1',    corto: 'WCAG 2.1', tono: 'bg-sky-400/15 text-sky-300',
    ayuda: 'Añadido en WCAG 2.1. Lo referencia EN 301 549, que es lo que aplica el RD 1112/2018.' },
  { k: 'wcag22', label: 'WCAG 2.2',    corto: 'WCAG 2.2', tono: 'bg-violet-400/15 text-violet-300',
    ayuda: 'Añadido en WCAG 2.2. Mejora voluntaria, todavía no exigida por norma en España.' },
];
const ORIGEN = Object.fromEntries(ORIGENES.map((o) => [o.k, o]));

// Las cinco vías por las que un criterio puede quedar fuera. WCAG no tiene un
// «no aplica» genérico: cada vía se justifica de forma distinta.
const MECANISMOS = [
  { k: 'condicion_no_se_da', label: 'La condición no se da',
    ayuda: 'El disparo del criterio no ocurre (no hay audio, no hay atajos…). Se declara CUMPLIDO, no «no aplicable».' },
  { k: 'excepcion_del_criterio', label: 'Excepción del propio criterio',
    ayuda: 'El texto del criterio lo exime: texto grande, decoración, logotipos, objetivos en línea…' },
  { k: 'esencial', label: 'Es esencial',
    ayuda: 'Quitarlo cambiaría la información o la función, y no hay otra vía conforme. Hay que justificar el «no hay otra vía».' },
  { k: 'agente_de_usuario', label: 'Lo decide el navegador',
    ayuda: 'La apariencia la determina el agente de usuario y el autor no la modifica.' },
  { k: 'fuera_de_alcance', label: 'Fuera del alcance declarado',
    ayuda: 'No entra en las páginas o procesos que declara la evaluación.' },
];
const MECANISMO = Object.fromEntries(MECANISMOS.map((m) => [m.k, m]));

export default function Accesibilidad() {
  const { role, demo } = useAuth();
  const puedeEditar = ['superadmin', 'admin', 'director'].includes(role);

  const [filas, setFilas] = useState([]);
  const [conf, setConf] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nivel, setNivel] = useState('AAA');
  const [estadoF, setEstadoF] = useState('todos');
  const [origenF, setOrigenF] = useState('todos');
  const [abierto, setAbierto] = useState(null);
  const [msg, setMsg] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [c, k] = await Promise.all([
        listTable('accesibilidad_criterios').catch(() => []),
        listTable('accesibilidad_conformidad').catch(() => []),
      ]);
      const orden = (a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true });
      setFilas((c || []).slice().sort(orden));
      setConf((k || []).slice().sort(orden));
    } finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  // Resumen por nivel. El porcentaje se calcula SOBRE LOS APLICABLES: contar los
  // no aplicables como incumplimientos falsearía el resultado a la baja.
  const resumen = useMemo(() => NIVELES.map((n) => {
    const del = filas.filter((f) => f.nivel === n);
    const apl = del.filter((f) => f.aplicable !== false);
    const cumple = apl.filter((f) => f.estado === 'cumple').length;
    return {
      nivel: n, total: del.length, aplicables: apl.length,
      noAplicables: del.filter((f) => f.aplicable === false).length,
      cumple, parcial: apl.filter((f) => f.estado === 'parcial').length,
      noCumple: apl.filter((f) => f.estado === 'no_cumple').length,
      pendientes: apl.filter((f) => f.estado === 'pendiente').length,
      pct: apl.length ? Math.round((cumple / apl.length) * 100) : 0,
    };
  }), [filas]);

  const visibles = useMemo(() => filas.filter((f) => {
    if (nivel !== 'todos' && f.nivel !== nivel) return false;
    if (origenF !== 'todos' && (f.origen || 'une') !== origenF) return false;
    if (estadoF === 'no_aplicables') return f.aplicable === false;
    if (estadoF !== 'todos' && (f.estado !== estadoF || f.aplicable === false)) return false;
    return true;
  }), [filas, nivel, estadoF, origenF]);

  const porPrincipio = useMemo(() => {
    const m = {};
    for (const f of visibles) (m[f.principio] = m[f.principio] || []).push(f);
    return m;
  }, [visibles]);

  async function guardar(c, cambios) {
    const fila = { ...c, ...cambios };
    if (fila.aplicable === false && !String(fila.justificacion || '').trim()) {
      setMsg({ err: true, t: `${c.codigo}: para marcarlo como no aplicable hace falta justificarlo. Es lo primero que mira una revisión externa.` });
      return;
    }
    if (fila.aplicable === false && !fila.mecanismo) {
      setMsg({ err: true, t: `${c.codigo}: elige por qué vía queda fuera. WCAG no tiene un «no aplica» genérico: son cinco mecanismos distintos y cada uno se justifica de otra forma.` });
      return;
    }
    try {
      await updateRow('accesibilidad_criterios', c.codigo, {
        aplicable: fila.aplicable, justificacion: fila.justificacion?.trim() || null,
        metodos: fila.metodos || [], estado: fila.estado, mecanismo: fila.mecanismo || null,
        observaciones: fila.observaciones?.trim() || null,
        evidencia: fila.evidencia?.trim() || null,
        revisado_en: new Date().toISOString(),
      }, 'codigo');
      setFilas((prev) => prev.map((x) => x.codigo === c.codigo ? { ...fila, revisado_en: new Date().toISOString() } : x));
      await registrar('editar', { entidad: 'accesibilidad_criterios', entidad_id: c.codigo, detalle: `${c.codigo} → ${fila.estado}` });
      setMsg({ t: `${c.codigo} actualizado.` });
    } catch (e) {
      const m = e?.message || String(e);
      setMsg({ err: true, t: /accesibilidad_justifica/.test(m) ? `${c.codigo}: falta la justificación de la no aplicabilidad.` : `No se pudo guardar: ${m}` });
    }
  }

  function exportar() {
    const cab = ['codigo', 'nivel', 'origen', 'principio', 'titulo', 'aplicable', 'mecanismo', 'justificacion', 'metodos', 'estado', 'observaciones', 'evidencia', 'revisado_en'];
    const esc = (v) => `"${String(Array.isArray(v) ? v.join(' / ') : (v ?? '')).replace(/"/g, '""')}"`;
    const csv = [cab.join(';')].concat(filas.map((f) => cab.map((k) => esc(f[k])).join(';'))).join('\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `accesibilidad-une139803-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    registrar('exportar', { entidad: 'accesibilidad_criterios', detalle: `${filas.length} criterios` });
  }

  if (!puedeEditar && role !== 'superadmin') {
    return <div className="card text-sm font-medium text-[#9FC0CB]">Esta sección es solo para superadministración.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Organización</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#EAF4F7]">Accesibilidad · UNE 139803:2012</h1>
          <p className="mt-1 max-w-2xl text-sm font-medium text-[#9FC0CB]">
            Auditoría interna permanente: aplicabilidad, método de verificación, estado y evidencia de cada
            criterio. Es lo que sostiene la declaración de accesibilidad del RD 1112/2018.
          </p>
        </div>
        <button onClick={exportar} disabled={!filas.length} className="btn-ghost !px-3 !py-2 text-xs disabled:opacity-40">⇩ Exportar CSV</button>
      </div>

      {demo && <div className="rounded-xl bg-brand-orange/10 p-3 text-xs font-semibold text-brand-orange">Modo demo: los cambios no se guardan.</div>}
      {msg && (
        <div className={`rounded-xl px-3 py-2 text-xs font-bold ${msg.err ? 'bg-red-500/12 text-red-300' : 'bg-emerald-500/12 text-emerald-300'}`}>
          <button onClick={() => setMsg(null)} className="float-right pl-2 text-[#7FA7B4] hover:text-white">×</button>{msg.t}
        </div>
      )}

      {/* Resumen por nivel */}
      <div className="grid gap-2 sm:grid-cols-3">
        {resumen.map((r) => (
          <div key={r.nivel} className="rounded-xl border border-[#1E5468] bg-[#10394A] p-3">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-extrabold text-[#EAF4F7]">Nivel {r.nivel}</p>
              <p className={`text-2xl font-extrabold ${r.pct === 100 ? 'text-emerald-300' : r.pct >= 60 ? 'text-brand-orange' : 'text-[#9FC0CB]'}`}>{r.pct}%</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-brand-verde" style={{ width: `${r.pct}%` }} />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[#9FC0CB]">
              {r.aplicables} aplicables de {r.total} · {r.cumple} cumplen · {r.parcial} parciales ·
              {' '}{r.noCumple} no cumplen · {r.pendientes} pendientes
              {r.noAplicables > 0 && <> · {r.noAplicables} no aplicables</>}
            </p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-1.5">
        {['todos', ...NIVELES].map((n) => (
          <button key={n} onClick={() => setNivel(n)}
            className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${
              nivel === n ? 'border-brand-orange bg-brand-orange/15 text-brand-orange' : 'border-[#1E5468] text-[#9FC0CB] hover:border-brand-orange/60'}`}>
            {n === 'todos' ? 'Todos los niveles' : `Nivel ${n}`}
          </button>
        ))}
        <span className="mx-1 text-[#1E5468]">|</span>
        {[{ k: 'todos', label: 'Todo el origen' }, ...ORIGENES].map((o) => (
          <button key={o.k} onClick={() => setOrigenF(o.k)} title={o.ayuda}
            className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${
              origenF === o.k ? 'border-sky-400 bg-sky-400/15 text-sky-300' : 'border-[#1E5468] text-[#9FC0CB] hover:border-sky-400/60'}`}>
            {o.label}
          </button>
        ))}
        <span className="mx-1 text-[#1E5468]">|</span>
        {[{ k: 'todos', label: 'Todos' }, ...ESTADOS, { k: 'no_aplicables', label: 'No aplicables' }].map((e) => (
          <button key={e.k} onClick={() => setEstadoF(e.k)}
            className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${
              estadoF === e.k ? 'border-brand-verde bg-brand-verde/15 text-brand-verdeTexto' : 'border-[#1E5468] text-[#9FC0CB] hover:border-brand-verde/60'}`}>
            {e.label}
          </button>
        ))}
      </div>

      {cargando ? <p className="py-8 text-center text-[#7FA7B4]">Cargando…</p> : filas.length === 0 ? (
        <div className="card text-center text-sm font-medium text-[#9FC0CB]">
          El checklist está vacío.
          <span className="mt-2 block text-xs text-[#7FA7B4]">Ejecuta la migración v61 en Supabase: trae los 61 criterios ya cargados.</span>
        </div>
      ) : (
        Object.entries(porPrincipio).map(([princ, items]) => (
          <section key={princ} className="space-y-1.5">
            <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-brand-orange">{princ} · {items.length}</h2>
            {items.map((c) => {
              const ab = abierto === c.codigo;
              return (
                <article key={c.codigo} className={`overflow-hidden rounded-xl border bg-[#10394A] ${c.aplicable === false ? 'border-[#1E5468] opacity-70' : 'border-[#1E5468]'}`}>
                  <button onClick={() => setAbierto(ab ? null : c.codigo)}
                    className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left hover:bg-[#12455A]">
                    <span className="font-mono text-[12px] font-bold text-[#7FA7B4]">{c.codigo}</span>
                    <span className="chip !px-1.5 !py-0 bg-white/8 text-[10px] text-[#9FC0CB]">{c.nivel}</span>
                    <span className={`chip !px-1.5 !py-0 text-[10px] ${ORIGEN[c.origen || 'une']?.tono}`}
                      title={ORIGEN[c.origen || 'une']?.ayuda}>{ORIGEN[c.origen || 'une']?.corto}</span>
                    {c.obsoleto && <span className="chip !px-1.5 !py-0 bg-white/8 text-[10px] text-[#7FA7B4]" title="Retirado en WCAG 2.2, pero sigue en UNE 139803:2012">obsoleto</span>}
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-[#EAF4F7]">{c.titulo}</span>
                    {c.aplicable === false
                      ? <span className="chip !px-2 !py-0 bg-white/8 text-[10px] text-[#7FA7B4]">No aplicable</span>
                      : <span className={`chip !px-2 !py-0 text-[10px] ${ESTADO[c.estado]?.tono}`}>{ESTADO[c.estado]?.label}</span>}
                    {(c.metodos || []).length > 0 && (
                      <span className="text-[10px] text-[#7FA7B4]">{(c.metodos || []).length} método(s)</span>
                    )}
                  </button>

                  {ab && (
                    <div className="space-y-3 border-t border-[#1E5468] p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Aplicabilidad</span>
                        {[['true', 'Aplicable'], ['false', 'No aplicable'], ['null', 'Sin decidir']].map(([v, l]) => {
                          const activo = String(c.aplicable) === v;
                          return (
                            <button key={v} disabled={!puedeEditar}
                              onClick={() => guardar(c, { aplicable: v === 'null' ? null : v === 'true' })}
                              className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                                activo ? 'border-brand-verde bg-brand-verde/20 text-brand-verdeTexto' : 'border-[#1E5468] text-[#9FC0CB] hover:border-brand-verde/60'}`}>
                              {l}
                            </button>
                          );
                        })}
                      </div>

                      {(c.aplicable === false || c.mecanismo) && (
                        <div>
                          <p className="label !mb-1.5">
                            Mecanismo de aplicabilidad {c.aplicable === false && <span className="text-brand-orange">*</span>}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {MECANISMOS.map((m) => (
                              <button key={m.k} disabled={!puedeEditar} title={m.ayuda}
                                onClick={() => guardar(c, { mecanismo: c.mecanismo === m.k ? null : m.k })}
                                className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                                  c.mecanismo === m.k ? 'border-sky-400 bg-sky-400/20 text-sky-300' : 'border-[#1E5468] text-[#9FC0CB] hover:border-sky-400/60'}`}>
                                {m.label}
                              </button>
                            ))}
                          </div>
                          {c.mecanismo && (
                            <p className="mt-1.5 text-[11px] leading-relaxed text-[#7FA7B4]">{MECANISMO[c.mecanismo]?.ayuda}</p>
                          )}
                        </div>
                      )}

                      {c.aplicable === false && (
                        <div>
                          <label className="label" htmlFor={`j-${c.codigo}`}>Justificación de la no aplicabilidad <span className="text-brand-orange">*</span></label>
                          <textarea id={`j-${c.codigo}`} rows={2} className="input !py-1.5 !text-[13px]"
                            defaultValue={c.justificacion || ''}
                            placeholder="Por qué este criterio no aplica al sitio. Ej.: no se publica vídeo grabado."
                            onBlur={(e) => e.target.value !== (c.justificacion || '') && guardar(c, { justificacion: e.target.value })} />
                        </div>
                      )}

                      {c.aplicable !== false && (
                        <>
                          <div>
                            <p className="label !mb-1.5">Métodos de verificación empleados</p>
                            <div className="flex flex-wrap gap-1.5">
                              {METODOS.map((m) => {
                                const on = (c.metodos || []).includes(m.k);
                                return (
                                  <button key={m.k} disabled={!puedeEditar} title={m.ayuda}
                                    onClick={() => guardar(c, { metodos: on ? (c.metodos || []).filter((x) => x !== m.k) : [...(c.metodos || []), m.k] })}
                                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
                                      on ? 'border-brand-verde bg-brand-verde/20 text-brand-verdeTexto' : 'border-[#1E5468] text-[#9FC0CB] hover:border-brand-verde/60'}`}>
                                    {on ? '✓ ' : ''}{m.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Estado</span>
                            {ESTADOS.map((e) => (
                              <button key={e.k} disabled={!puedeEditar} onClick={() => guardar(c, { estado: e.k })}
                                className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                                  c.estado === e.k ? 'border-brand-orange bg-brand-orange/20 text-brand-orange' : 'border-[#1E5468] text-[#9FC0CB] hover:border-brand-orange/60'}`}>
                                {e.label}
                              </button>
                            ))}
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <label className="label" htmlFor={`o-${c.codigo}`}>Observaciones</label>
                              <textarea id={`o-${c.codigo}`} rows={2} className="input !py-1.5 !text-[13px]"
                                defaultValue={c.observaciones || ''}
                                onBlur={(e) => e.target.value !== (c.observaciones || '') && guardar(c, { observaciones: e.target.value })} />
                            </div>
                            <div>
                              <label className="label" htmlFor={`e-${c.codigo}`}>Evidencia</label>
                              <input id={`e-${c.codigo}`} className="input !py-1.5 !text-[13px]"
                                placeholder="Enlace al informe, captura o página revisada"
                                defaultValue={c.evidencia || ''}
                                onBlur={(e) => e.target.value !== (c.evidencia || '') && guardar(c, { evidencia: e.target.value })} />
                            </div>
                          </div>
                        </>
                      )}

                      {c.revisado_en && (
                        <p className="text-[11px] text-[#7FA7B4]">
                          Última revisión: {new Date(c.revisado_en).toLocaleString('es-ES')}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        ))
      )}

      {/* Los nueve requisitos de conformidad */}
      {conf.length > 0 && (
        <section className="card space-y-2">
          <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-brand-orange">
            Requisitos de conformidad · {conf.length}
          </h2>
          <p className="text-[11.5px] text-[#9FC0CB]">
            Se evalúan aparte de los criterios: sin ellos no hay conformidad aunque todos los criterios cumplan.
          </p>
          {conf.map((k) => (
            <div key={k.codigo} className="rounded-lg bg-[#0D3242] p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-[#7FA7B4]">{k.codigo}</span>
                <span className="min-w-0 flex-1 text-[12.5px] font-bold text-[#EAF4F7]">{k.requisito}</span>
                <div className="flex gap-1">
                  {ESTADOS.map((e) => (
                    <button key={e.k} disabled={!puedeEditar}
                      onClick={async () => {
                        await updateRow('accesibilidad_conformidad', k.codigo, { estado: e.k }, 'codigo');
                        setConf((prev) => prev.map((x) => x.codigo === k.codigo ? { ...x, estado: e.k } : x));
                      }}
                      className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                        k.estado === e.k ? e.tono : 'text-[#7FA7B4] hover:text-[#EAF4F7]'}`}>
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
              {k.verificacion && <p className="mt-1 text-[11.5px] leading-relaxed text-[#9FC0CB]">{k.verificacion}</p>}
            </div>
          ))}
        </section>
      )}

      <p className="text-[11px] leading-relaxed text-[#7FA7B4]">
        <strong>Un criterio cuya condición no se da se declara CUMPLIDO, no «no aplicable»:</strong> en una
        declaración formal de conformidad la categoría «no aplicable» no existe. Por eso hay que elegir el mecanismo.
        {' '}El porcentaje se calcula <strong>sobre los criterios aplicables</strong>: contar los no aplicables como
        incumplimientos falsearía el resultado a la baja. Un criterio marcado como no aplicable exige justificación
        escrita, y la base de datos lo impide si falta.
      </p>
    </div>
  );
}
