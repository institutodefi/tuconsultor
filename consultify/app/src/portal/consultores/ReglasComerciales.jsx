import { useCallback, useEffect, useMemo, useState } from 'react';
import { listTable, insertRow, updateRow, deleteRow } from '../../lib/data.js';
import { useAuth } from '../../lib/auth.jsx';
import {
  TIPOS_REGLA, TIPO_REGLA, NIVELES, CANALES, REGLA_NUEVA,
  describirEfecto, describirCondiciones, validarRegla, reglaVigente, aLista,
} from '../../lib/reglas.js';
import { NORMAS, MODELO_IDS, calcular, fmtEUR } from '../../lib/calcEngine.js';
import { COMPLEJIDADES, PERFILES, MAX_EQUIPO } from '../../lib/proyecto.js';

// ════════════════════════════════════════════════════════════════════════════
// REGLAS COMERCIALES
// Se dan de alta de una en una. El generador de ofertas (web e interno) las
// aplica en vivo, así que las ofertas son dinámicas: cambian con lo vigente.
// ════════════════════════════════════════════════════════════════════════════

const TONO_TIPO = {
  descuento:    'bg-emerald-400/15 text-emerald-300',
  recargo:      'bg-red-400/15 text-red-300',
  optimizacion: 'bg-brand-verde/15 text-brand-verdeTexto',
  precio_hora:  'bg-brand-orange/15 text-brand-orange',
  margen:       'bg-sky-400/15 text-sky-300',
};

export default function ReglasComerciales() {
  const { role, demo } = useAuth();
  const puedeEditar = ['superadmin', 'admin', 'director'].includes(role);

  const [reglas, setReglas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(null);      // null = formulario cerrado
  const [errores, setErrores] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);

  // Simulador
  const [simNormas, setSimNormas] = useState(['9001', '14001']);
  const [simModelo, setSimModelo] = useState('Implicación');
  const [simCanal, setSimCanal] = useState('web');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await listTable('reglas_comerciales').catch(() => []);
      (r || []).sort((a, b) => (Number(a.prioridad ?? 100) - Number(b.prioridad ?? 100)) || String(a.nombre).localeCompare(String(b.nombre)));
      setReglas(r || []);
    } finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  // ── Simulación: precio sin reglas vs. con reglas vigentes ──
  const sim = useMemo(() => {
    const sinReglas = calcular(simNormas, simModelo, { canal: simCanal });
    const conReglas = calcular(simNormas, simModelo, { canal: simCanal, reglas });
    return { sinReglas, conReglas };
  }, [simNormas, simModelo, simCanal, reglas]);

  const abrirNueva = () => { setForm(REGLA_NUEVA()); setErrores([]); };
  const abrirEdicion = (r) => {
    setForm({
      ...r,
      modelos: aLista(r.modelos), normas: aLista(r.normas),
      complejidad: aLista(r.complejidad), perfiles: aLista(r.perfiles),
      min_sedes: r.min_sedes ?? '', max_sedes: r.max_sedes ?? '',
      min_personas: r.min_personas ?? '', max_personas: r.max_personas ?? '',
      vigente_desde: r.vigente_desde ? String(r.vigente_desde).slice(0, 10) : '',
      vigente_hasta: r.vigente_hasta ? String(r.vigente_hasta).slice(0, 10) : '',
      min_sistemas: r.min_sistemas ?? '', max_sistemas: r.max_sistemas ?? '',
      nivel: r.nivel || '', notas: r.notas || '',
    });
    setErrores([]);
  };

  async function guardar() {
    const errs = validarRegla(form);
    if (errs.length) { setErrores(errs); return; }
    setGuardando(true); setErrores([]);
    const fila = {
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      activa: !!form.activa,
      prioridad: Number(form.prioridad) || 100,
      modelos: aLista(form.modelos),
      normas: aLista(form.normas),
      complejidad: aLista(form.complejidad),
      min_sedes: form.min_sedes === '' ? null : Number(form.min_sedes),
      max_sedes: form.max_sedes === '' ? null : Number(form.max_sedes),
      perfiles: aLista(form.perfiles),
      min_personas: form.min_personas === '' ? null : Number(form.min_personas),
      max_personas: form.max_personas === '' ? null : Number(form.max_personas),
      min_sistemas: form.min_sistemas === '' ? null : Number(form.min_sistemas),
      max_sistemas: form.max_sistemas === '' ? null : Number(form.max_sistemas),
      solo_si_tiene_9001: form.solo_si_tiene_9001 === '' ? null : form.solo_si_tiene_9001,
      vigente_desde: form.vigente_desde || null,
      vigente_hasta: form.vigente_hasta || null,
      canal: form.canal || 'todos',
      valor: Number(form.valor),
      unidad: form.unidad,
      nivel: form.nivel || null,
      notas: form.notas?.trim() || null,
    };
    try {
      if (form.id) await updateRow('reglas_comerciales', form.id, fila);
      else await insertRow('reglas_comerciales', fila);
      setForm(null);
      await cargar();
      setAviso(form.id ? 'Regla actualizada.' : 'Regla añadida. Ya se aplica a las ofertas que cumplan sus condiciones.');
      setTimeout(() => setAviso(null), 5000);
    } catch (e) {
      setErrores([`No se pudo guardar: ${e?.message || e}`]);
    } finally { setGuardando(false); }
  }

  async function alternar(r) {
    await updateRow('reglas_comerciales', r.id, { activa: !r.activa });
    cargar();
  }
  async function borrar(r) {
    if (!window.confirm(`¿Eliminar la regla «${r.nombre}»? Las ofertas ya emitidas no cambian.`)) return;
    await deleteRow('reglas_comerciales', r.id);
    cargar();
  }

  const tipo = form ? TIPO_REGLA[form.tipo] : null;
  const toggleEnLista = (campo, v) => setForm((f) => ({
    ...f, [campo]: aLista(f[campo]).includes(v) ? aLista(f[campo]).filter((x) => x !== v) : [...aLista(f[campo]), v],
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Comercial</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#EAF4F7]">Reglas comerciales</h1>
          <p className="mt-1 max-w-2xl text-sm font-medium text-[#9FC0CB]">
            Se añaden de una en una y las ofertas se calculan con ellas en vivo: descuentos por campaña,
            optimización de horas al integrar sistemas, precio/hora por modelo o margen específico.
          </p>
        </div>
        {puedeEditar && !form && <button onClick={abrirNueva} className="btn-orange">+ Añadir regla</button>}
      </div>

      {demo && <div className="rounded-xl bg-brand-orange/10 p-3 text-xs font-semibold text-brand-orange">Modo demo: los cambios no se guardan.</div>}
      {aviso && <div className="rounded-xl bg-brand-verde/15 p-3 text-xs font-bold text-brand-verdeTexto">{aviso}</div>}

      {/* ── Formulario de alta / edición ── */}
      {form && (
        <section className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-orange">
              {form.id ? 'Editar regla' : 'Nueva regla'}
            </h2>
            <button onClick={() => setForm(null)} className="text-xs font-bold text-[#9FC0CB] hover:text-[#EAF4F7]">Cancelar</button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="r-nombre">Nombre de la regla</label>
              <input id="r-nombre" className="input" placeholder="p. ej. Septiembre · Relación −10 %"
                value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="r-tipo">Tipo de regla</label>
              <select id="r-tipo" className="input" value={form.tipo}
                onChange={(e) => {
                  const t = TIPO_REGLA[e.target.value];
                  setForm({ ...form, tipo: e.target.value, unidad: t.unidades[0], nivel: t.pideNivel ? form.nivel : '' });
                }}>
                {TIPOS_REGLA.map((t) => <option key={t.k} value={t.k}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {tipo && (
            <p className="rounded-xl bg-[#0D3242] p-3 text-xs font-medium leading-relaxed text-[#B9D2DA]">
              {tipo.ayuda} <span className="block mt-1 text-[#7FA7B4]">Ejemplo: {tipo.ejemplo}</span>
            </p>
          )}

          {/* Efecto */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="r-valor">Valor</label>
              <input id="r-valor" type="number" step="0.01" className="input" placeholder="10"
                value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="r-unidad">Unidad</label>
              <select id="r-unidad" className="input" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })}>
                {(tipo?.unidades || []).map((u) => (
                  <option key={u} value={u}>{u === 'porcentaje' ? '% porcentaje' : u === 'euros' ? '€ euros' : '× factor'}</option>
                ))}
              </select>
            </div>
            {tipo?.pideNivel && (
              <div>
                <label className="label" htmlFor="r-nivel">Nivel de consultoría</label>
                <select id="r-nivel" className="input" value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })}>
                  <option value="">Todos los niveles</option>
                  {NIVELES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Condiciones */}
          <div className="rounded-xl border border-[#1E5468] p-4">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-wider text-[#B9D2DA]">
              ¿Cuándo se aplica? <span className="font-medium normal-case tracking-normal text-[#7FA7B4]">— lo que dejes vacío no filtra</span>
            </p>

            <p className="label !mb-2">Modelos</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {MODELO_IDS.map((m) => {
                const on = aLista(form.modelos).includes(m);
                return (
                  <button key={m} type="button" onClick={() => toggleEnLista('modelos', m)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${on ? 'border-brand-verde bg-brand-verde/20 text-brand-verdeTexto' : 'border-[#1E5468] text-[#9FC0CB] hover:border-brand-verde'}`}>
                    {m}
                  </button>
                );
              })}
            </div>

            <p className="label !mb-2">Normas que debe incluir la oferta</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {NORMAS.map((n) => {
                const on = aLista(form.normas).includes(n.id);
                return (
                  <button key={n.id} type="button" onClick={() => toggleEnLista('normas', n.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${on ? 'border-brand-orange bg-brand-orange/20 text-brand-orange' : 'border-[#1E5468] text-[#9FC0CB] hover:border-brand-orange'}`}>
                    {n.nombre}
                  </button>
                );
              })}
            </div>

            {/* ── Características del proyecto ── */}
            <div className="mb-4 rounded-xl bg-[#0D3242] p-3">
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-brand-orange">Características del proyecto</p>

              <p className="label !mb-1.5">Complejidad</p>
              <div className="mb-3 flex flex-wrap gap-2">
                {COMPLEJIDADES.map((c) => {
                  const on = aLista(form.complejidad).includes(c.k);
                  return (
                    <button key={c.k} type="button" title={c.ayuda} onClick={() => toggleEnLista('complejidad', c.k)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${on ? 'border-brand-orange bg-brand-orange/20 text-brand-orange' : 'border-[#1E5468] text-[#9FC0CB] hover:border-brand-orange'}`}>
                      {c.label}
                    </button>
                  );
                })}
              </div>

              <p className="label !mb-1.5">El equipo debe incluir</p>
              <div className="mb-3 flex flex-wrap gap-2">
                {PERFILES.map((pf) => {
                  const on = aLista(form.perfiles).includes(pf.k);
                  return (
                    <button key={pf.k} type="button" title={`${pf.tarifa} €/h`} onClick={() => toggleEnLista('perfiles', pf.k)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${on ? 'border-brand-verde bg-brand-verde/20 text-brand-verdeTexto' : 'border-[#1E5468] text-[#9FC0CB] hover:border-brand-verde'}`}>
                      {pf.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="label" htmlFor="r-minsedes">Mínimo de sedes</label>
                  <input id="r-minsedes" type="number" min="1" className="input !py-1.5 !text-[13px]" value={form.min_sedes}
                    onChange={(e) => setForm({ ...form, min_sedes: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="r-maxsedes">Máximo de sedes</label>
                  <input id="r-maxsedes" type="number" min="1" className="input !py-1.5 !text-[13px]" value={form.max_sedes}
                    onChange={(e) => setForm({ ...form, max_sedes: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="r-minper">Equipo mínimo</label>
                  <input id="r-minper" type="number" min="0" max={MAX_EQUIPO} className="input !py-1.5 !text-[13px]" value={form.min_personas}
                    onChange={(e) => setForm({ ...form, min_personas: e.target.value })} />
                </div>
                <div>
                  <label className="label" htmlFor="r-maxper">Equipo máximo</label>
                  <input id="r-maxper" type="number" min="0" max={MAX_EQUIPO} className="input !py-1.5 !text-[13px]" value={form.max_personas}
                    onChange={(e) => setForm({ ...form, max_personas: e.target.value })} />
                  <p className="mt-1 text-[10.5px] text-[#7FA7B4]">Tope: {MAX_EQUIPO} personas</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="label" htmlFor="r-min">Mínimo de sistemas</label>
                <input id="r-min" type="number" min="1" className="input" value={form.min_sistemas}
                  onChange={(e) => setForm({ ...form, min_sistemas: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="r-max">Máximo de sistemas</label>
                <input id="r-max" type="number" min="1" className="input" value={form.max_sistemas}
                  onChange={(e) => setForm({ ...form, max_sistemas: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="r-desde">Vigente desde</label>
                <input id="r-desde" type="date" className="input" value={form.vigente_desde}
                  onChange={(e) => setForm({ ...form, vigente_desde: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="r-hasta">Vigente hasta</label>
                <input id="r-hasta" type="date" className="input" value={form.vigente_hasta}
                  onChange={(e) => setForm({ ...form, vigente_hasta: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="r-canal">Canal</label>
                <select id="r-canal" className="input" value={form.canal} onChange={(e) => setForm({ ...form, canal: e.target.value })}>
                  {CANALES.map((c) => <option key={c.k} value={c.k}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="r-9001">ISO 9001 previa</label>
                <select id="r-9001" className="input"
                  value={form.solo_si_tiene_9001 === null || form.solo_si_tiene_9001 === '' ? '' : String(form.solo_si_tiene_9001)}
                  onChange={(e) => setForm({ ...form, solo_si_tiene_9001: e.target.value === '' ? null : e.target.value === 'true' })}>
                  <option value="">Indiferente</option>
                  <option value="true">Solo si ya la tiene certificada</option>
                  <option value="false">Solo si no la tiene</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="r-prio">Prioridad</label>
                <input id="r-prio" type="number" className="input" value={form.prioridad}
                  onChange={(e) => setForm({ ...form, prioridad: e.target.value })} />
              </div>
              <div className="flex items-end">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-[#EAF4F7]">
                  <input type="checkbox" checked={!!form.activa} className="h-4 w-4 accent-brand-orange"
                    onChange={(e) => setForm({ ...form, activa: e.target.checked })} />
                  Activa
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="r-notas">Notas internas</label>
            <textarea id="r-notas" rows={2} className="input" placeholder="Por qué existe esta regla, quién la autorizó…"
              value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </div>

          {errores.length > 0 && (
            <ul className="space-y-1 rounded-xl bg-red-500/15 p-3 text-xs font-bold text-red-200">
              {errores.map((e, i) => <li key={i}>· {e}</li>)}
            </ul>
          )}

          <div className="flex gap-3">
            <button onClick={guardar} disabled={guardando} className="btn-orange">
              {guardando ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Añadir regla'}
            </button>
            <button onClick={() => setForm(null)} className="btn-ghost">Cancelar</button>
          </div>
        </section>
      )}

      {/* ── Listado ── */}
      {cargando ? <p className="py-10 text-center text-[#7FA7B4]">Cargando…</p> : (
        <section className="space-y-2">
          {reglas.length === 0 && (
            <div className="card text-center text-sm font-medium text-[#9FC0CB]">
              Todavía no hay reglas. Sin reglas, las ofertas salen a tarifa de catálogo.
              {puedeEditar && <> <button onClick={abrirNueva} className="font-bold text-brand-orange underline">Añade la primera</button>.</>}
              <span className="mt-2 block text-xs text-[#7FA7B4]">Si la tabla no existe todavía, ejecuta la migración v57 en Supabase.</span>
            </div>
          )}
          {reglas.map((r) => {
            const vigente = reglaVigente(r);
            return (
              <article key={r.id} className={`card !p-4 ${r.activa ? '' : 'opacity-55'}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`chip !px-2 !py-0.5 text-[10px] ${TONO_TIPO[r.tipo] || 'bg-white/10 text-[#9FC0CB]'}`}>
                        {TIPO_REGLA[r.tipo]?.label || r.tipo}
                      </span>
                      <h3 className="text-sm font-extrabold text-[#EAF4F7]">{r.nombre}</h3>
                      {!r.activa && <span className="chip !px-2 !py-0.5 bg-white/10 text-[10px] text-[#9FC0CB]">Desactivada</span>}
                      {r.activa && !vigente && <span className="chip !px-2 !py-0.5 bg-red-400/15 text-[10px] text-red-300">Fuera de vigencia</span>}
                    </div>
                    <p className="mt-1 text-xs font-bold text-brand-orange">{describirEfecto(r)}</p>
                    <p className="mt-0.5 text-xs font-medium text-[#9FC0CB]">{describirCondiciones(r)}</p>
                    {r.notas && <p className="mt-1 text-[11px] italic text-[#7FA7B4]">{r.notas}</p>}
                  </div>
                  {puedeEditar && (
                    <div className="flex shrink-0 items-center gap-2">
                      <button onClick={() => alternar(r)} className="rounded-lg border border-[#1E5468] px-3 py-1.5 text-xs font-bold text-[#9FC0CB] hover:border-brand-verde hover:text-[#EAF4F7]">
                        {r.activa ? 'Desactivar' : 'Activar'}
                      </button>
                      <button onClick={() => abrirEdicion(r)} className="rounded-lg border border-[#1E5468] px-3 py-1.5 text-xs font-bold text-[#9FC0CB] hover:border-brand-verde hover:text-[#EAF4F7]">
                        Editar
                      </button>
                      <button onClick={() => borrar(r)} className="rounded-lg px-2 py-1.5 text-xs font-bold text-red-300 hover:text-red-200">Eliminar</button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* ── Simulador ── */}
      <section className="card">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">Simulador · efecto real de las reglas</h2>
        <p className="mt-1 text-xs font-medium text-[#9FC0CB]">Comprueba aquí qué precio sale antes y después de aplicar lo que está vigente.</p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="label !mb-2">Normas</p>
            <div className="flex flex-wrap gap-2">
              {NORMAS.map((n) => {
                const on = simNormas.includes(n.id);
                const base = n.id === '9001';
                return (
                  <button key={n.id} type="button"
                    onClick={() => setSimNormas((s) => s.includes(n.id) ? s.filter((x) => x !== n.id) : [...s, n.id])}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${on ? 'border-brand-orange bg-brand-orange/20 text-brand-orange' : 'border-[#1E5468] text-[#9FC0CB] hover:border-brand-orange'} ${base && !on ? 'opacity-70' : ''}`}>
                    {n.nombre}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="s-modelo">Modelo</label>
              <select id="s-modelo" className="input" value={simModelo} onChange={(e) => setSimModelo(e.target.value)}>
                {MODELO_IDS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="s-canal">Canal</label>
              <select id="s-canal" className="input" value={simCanal} onChange={(e) => setSimCanal(e.target.value)}>
                <option value="web">Web (pública)</option>
                <option value="interno">Interno (equipo)</option>
              </select>
            </div>
          </div>
        </div>

        {sim.conReglas && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[#0D3242] p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Tarifa de catálogo</p>
              <p className="mt-1 text-lg font-extrabold text-[#9FC0CB]">
                {fmtEUR(sim.sinReglas.precioCatalogo)}{sim.sinReglas.tipo === 'mes' ? '/mes' : ''}
              </p>
              <p className="text-[11px] text-[#7FA7B4]">{sim.sinReglas.hTotal} h</p>
            </div>
            <div className="rounded-xl bg-brand-orange/15 p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-brand-orange">Con reglas aplicadas</p>
              <p className="mt-1 text-lg font-extrabold text-[#EAF4F7]">
                {fmtEUR(sim.conReglas.precioCatalogo)}{sim.conReglas.tipo === 'mes' ? '/mes' : ''}
              </p>
              <p className="text-[11px] text-[#B9D2DA]">{sim.conReglas.hTotal} h</p>
            </div>
            <div className="rounded-xl bg-[#0D3242] p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Diferencia</p>
              <p className={`mt-1 text-lg font-extrabold ${sim.conReglas.precioCatalogo < sim.sinReglas.precioCatalogo ? 'text-emerald-300' : sim.conReglas.precioCatalogo > sim.sinReglas.precioCatalogo ? 'text-red-300' : 'text-[#9FC0CB]'}`}>
                {sim.conReglas.precioCatalogo === sim.sinReglas.precioCatalogo ? 'sin cambio'
                  : `${sim.conReglas.precioCatalogo > sim.sinReglas.precioCatalogo ? '+' : '−'}${fmtEUR(Math.abs(sim.conReglas.precioCatalogo - sim.sinReglas.precioCatalogo))}`}
              </p>
              <p className="text-[11px] text-[#7FA7B4]">{sim.conReglas.reglas.length} regla(s) aplicada(s)</p>
            </div>
          </div>
        )}

        {sim.conReglas?.reglas?.length > 0 && (
          <ul className="mt-3 space-y-1">
            {sim.conReglas.reglas.map((t, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-[#0D3242] px-3 py-2 text-xs">
                <span className="font-bold text-[#EAF4F7]">{t.nombre}</span>
                <span className="text-brand-orange">{t.efecto}</span>
                <span className="text-[#7FA7B4]">· {t.detalle}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
