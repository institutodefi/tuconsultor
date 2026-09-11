import { useMemo, useState } from 'react';
import { ROLES_CONTACTO, emailValido } from '../../lib/crm.js';
import { empresasDelGrupo, planCopia } from '../../lib/copiarContactos.js';

// ════════════════════════════════════════════════════════════════════════════
// CONTACTOS AL CREAR LA EMPRESA
//
// Antes solo se podían asignar contactos con la empresa ya creada, y eso obliga
// a guardar, esperar y volver. Aquí se apuntan durante el alta y se crean
// después, en la misma operación.
//
// Se quedan en memoria hasta que la empresa existe: no tienen a qué vincularse
// antes. Si el guardado de la empresa falla, no queda ningún contacto suelto.
//
// Tres formas de apuntar a alguien, para no teclear lo que ya está en el CRM:
//   · elegirlo de la base de contactos (se vincula la misma persona);
//   · copiar los de otra empresa del grupo (la matriz, si se ha indicado);
//   · escribirlo nuevo. Y cualquiera de la lista se puede editar sin quitarlo.
// ════════════════════════════════════════════════════════════════════════════

const VACIO = () => ({ nombre: '', apellidos: '', email: '', movil: '', rol: 'directivo' });
const S = (v) => String(v ?? '');

export default function ContactosAlta({ lista, setLista, contactos = [], empresas = [], vinculos = [], empresa = null }) {
  const [form, setForm] = useState(VACIO());
  const [editando, setEditando] = useState(null);     // índice en edición, o null
  const [error, setError] = useState(null);
  const [modo, setModo] = useState('nuevo');          // nuevo | base | copiar
  const [busqueda, setBusqueda] = useState('');
  const [origen, setOrigen] = useState('');

  // Empresas del grupo primero (la matriz la primera); después el resto.
  const grupo = useMemo(() => empresasDelGrupo(empresa || {}, empresas), [empresa, empresas]);
  const otras = useMemo(() => empresas.filter((e) => !grupo.some((g) => S(g.id) === S(e.id)) && S(e.id) !== S(empresa?.id))
    .sort((a, b) => S(a.nombre_comercial || a.nombre).localeCompare(S(b.nombre_comercial || b.nombre), 'es')), [empresas, grupo, empresa]);
  const origenEfectivo = origen || (grupo[0] ? S(grupo[0].id) : '');
  const nombreEmpresa = (e) => e?.nombre_comercial?.trim() || e?.nombre || '';

  const rolEtq = (k) => (k === 'secundario' ? 'Secundario' : (ROLES_CONTACTO.find((r) => r.k === k)?.corto || k));

  function validar(c, idx = null) {
    const n = S(c.nombre).trim();
    if (!n) return 'Falta el nombre.';
    const email = S(c.email).trim().toLowerCase();
    if (!c.contacto_id) {
      if (!email) return 'Falta el correo: es lo que identifica a un contacto.';
      if (!emailValido(email)) return `«${email}» no es un correo válido.`;
    }
    if (email && lista.some((x, j) => j !== idx && S(x.email).toLowerCase() === email)) return 'Ya has añadido ese correo a esta empresa.';
    if (c.contacto_id && lista.some((x, j) => j !== idx && S(x.contacto_id) === S(c.contacto_id))) return 'Esa persona ya está en la lista.';
    if (['facturacion', 'proyecto'].includes(c.rol) && lista.some((x, j) => j !== idx && x.rol === c.rol)) {
      return `Ya hay alguien como ${rolEtq(c.rol).toLowerCase()}. Solo puede haber uno; el resto van como secundarios.`;
    }
    return null;
  }

  function guardarForm() {
    const c = { ...form, nombre: S(form.nombre).trim(), email: S(form.email).trim().toLowerCase() };
    const e = validar(c, editando);
    if (e) { setError(e); return; }
    if (editando != null) setLista(lista.map((x, j) => (j === editando ? { ...x, ...c } : x)));
    else setLista([...lista, c]);
    setForm(VACIO()); setEditando(null); setError(null);
  }
  function editar(i) {
    const c = lista[i];
    setForm({ nombre: c.nombre || '', apellidos: c.apellidos || '', email: c.email || '', movil: c.movil || '', rol: c.rol || 'secundario', contacto_id: c.contacto_id || null });
    setEditando(i); setModo('nuevo'); setError(null);
  }
  const quitar = (i) => { setLista(lista.filter((_, j) => j !== i)); if (editando === i) { setEditando(null); setForm(VACIO()); } };

  // ── Elegir de la base de contactos ──
  const candidatos = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    const ya = new Set(lista.map((x) => S(x.contacto_id)).filter(Boolean));
    return contactos
      .filter((c) => !ya.has(S(c.id)))
      .filter((c) => !t || [c.nombre, c.apellidos, c.email, c.cargo].filter(Boolean).join(' ').toLowerCase().includes(t))
      .sort((a, b) => `${a.nombre} ${a.apellidos || ''}`.localeCompare(`${b.nombre} ${b.apellidos || ''}`, 'es'))
      .slice(0, 30);
  }, [contactos, lista, busqueda]);
  const empresasDe = (cid) => vinculos.filter((v) => S(v.contacto_id) === S(cid)).map((v) => nombreEmpresa(empresas.find((e) => S(e.id) === S(v.empresa_id)))).filter(Boolean);
  function elegir(c) {
    const rol = lista.some((x) => x.rol === 'directivo') ? 'secundario' : 'directivo';
    const fila = { contacto_id: c.id, nombre: c.nombre || '', apellidos: c.apellidos || '', email: S(c.email).toLowerCase(), movil: c.movil || '', cargo: c.cargo || null, rol };
    const e = validar(fila); if (e) { setError(e); return; }
    setLista([...lista, fila]); setError(null);
  }

  // ── Copiar de otra empresa ──
  const plan = useMemo(() => (origenEfectivo ? planCopia(origenEfectivo, '__nueva__', vinculos) : []), [origenEfectivo, vinculos]);
  function copiar() {
    const ya = new Set(lista.map((x) => S(x.contacto_id)).filter(Boolean));
    const nuevas = [];
    for (const p of plan) {
      if (ya.has(S(p.contacto_id))) continue;
      const c = contactos.find((x) => S(x.id) === S(p.contacto_id)); if (!c) continue;
      let rol = p.rol;
      if (['facturacion', 'proyecto'].includes(rol) && [...lista, ...nuevas].some((x) => x.rol === rol)) rol = 'secundario';
      nuevas.push({ contacto_id: c.id, nombre: c.nombre || '', apellidos: c.apellidos || '', email: S(c.email).toLowerCase(), movil: c.movil || '', cargo: p.cargo || c.cargo || null, rol });
    }
    if (!nuevas.length) { setError('No hay nada que copiar: esa empresa no tiene contactos que no estén ya en la lista.'); return; }
    setLista([...lista, ...nuevas]); setError(null);
  }

  return (
    <div className="space-y-3">
      <p className="text-[11.5px] leading-relaxed text-[#9FC0CB]">
        Se vincularán al crear la empresa. El primero con rol de dirección queda como contacto principal. Los que ya estén en el CRM no se duplican.
      </p>

      {lista.length > 0 && (
        <ul className="space-y-1">
          {lista.map((c, i) => (
            <li key={i} className={`flex flex-wrap items-center gap-2 rounded-lg px-3 py-1.5 ${editando === i ? 'bg-brand-orange/10 ring-1 ring-brand-orange/50' : 'bg-[#0D3242]'}`}>
              <span className="chip !px-2 !py-0 bg-brand-verde/15 text-[10px] text-brand-verdeTexto">{rolEtq(c.rol)}</span>
              <span className="text-[12.5px] font-bold text-[#EAF4F7]">{c.nombre} {c.apellidos}</span>
              <span className="text-[11.5px] text-[#9FC0CB]">{c.email || <span className="text-amber-200">sin correo</span>}</span>
              {c.movil && <span className="text-[11.5px] text-[#7FA7B4]">· {c.movil}</span>}
              {c.contacto_id && <span className="text-[10px] font-bold text-[#7FA7B4]">· ya en el CRM</span>}
              <span className="ml-auto flex gap-2">
                <button type="button" onClick={() => editar(i)} className="text-[11px] font-bold text-brand-verdeTexto hover:underline">Editar</button>
                <button type="button" onClick={() => quitar(i)} className="text-[11px] font-bold text-red-300 hover:text-red-200">Quitar</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex overflow-hidden rounded-xl border border-[#1E5468] text-[11.5px] font-bold">
        {[['nuevo', editando != null ? 'Editando' : 'Escribir nuevo'], ['base', `De la base de contactos (${contactos.length})`], ['copiar', 'Copiar de otra empresa']].map(([k, l]) => (
          <button key={k} type="button" onClick={() => { setModo(k); setError(null); }}
            className={`flex-1 px-3 py-1.5 ${modo === k ? 'bg-brand-verde text-[#061F2B]' : 'text-[#9FC0CB] hover:text-[#EAF4F7]'}`}>{l}</button>
        ))}
      </div>

      {modo === 'nuevo' && (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="label" htmlFor="ca-nombre">Nombre <span className="text-brand-orange">*</span></label>
              <input id="ca-nombre" className="input !py-1.5 !text-[13px]" value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="ca-apellidos">Apellidos</label>
              <input id="ca-apellidos" className="input !py-1.5 !text-[13px]" value={form.apellidos}
                onChange={(e) => setForm({ ...form, apellidos: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="ca-email">Correo {form.contacto_id ? null : <span className="text-brand-orange">*</span>}</label>
              <input id="ca-email" type="email" className="input !py-1.5 !text-[13px]" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="ca-movil">Móvil</label>
              <input id="ca-movil" type="tel" className="input !py-1.5 !text-[13px]" value={form.movil}
                onChange={(e) => setForm({ ...form, movil: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="ca-rol">Rol</label>
              <select id="ca-rol" className="input !py-1.5 !text-[13px]" value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                {ROLES_CONTACTO.map((r) => <option key={r.k} value={r.k}>{r.corto}</option>)}
                <option value="secundario">Secundario</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={guardarForm} className="btn-ghost !px-3 !py-1.5 text-xs">
              {editando != null ? 'Guardar cambios' : '+ Añadir contacto a la lista'}
            </button>
            {editando != null && (
              <button type="button" onClick={() => { setEditando(null); setForm(VACIO()); setError(null); }} className="text-xs font-bold text-[#7FA7B4] hover:text-[#EAF4F7]">cancelar edición</button>
            )}
          </div>
        </>
      )}

      {modo === 'base' && (
        <div className="space-y-2">
          <input className="input !py-1.5 !text-[13px]" value={busqueda} placeholder="Buscar por nombre, correo o cargo…" autoFocus
            onChange={(e) => setBusqueda(e.target.value)} />
          <div className="max-h-52 space-y-0.5 overflow-y-auto">
            {candidatos.length === 0 && <p className="p-2 text-[11.5px] text-[#7FA7B4]">{contactos.length ? 'Nadie coincide (o ya están en la lista).' : 'No hay contactos en el CRM todavía.'}</p>}
            {candidatos.map((c) => {
              const emps = empresasDe(c.id);
              return (
                <button key={c.id} type="button" onClick={() => elegir(c)}
                  className="block w-full rounded-lg px-2 py-1 text-left hover:bg-[#10394A]">
                  <span className="text-[12.5px] font-bold text-[#EAF4F7]">{c.nombre} {c.apellidos || ''}</span>
                  <span className="ml-2 text-[11px] text-[#9FC0CB]">{c.email || 'sin correo'}{c.cargo ? ` · ${c.cargo}` : ''}</span>
                  {emps.length > 0 && <span className="ml-2 text-[10.5px] text-[#7FA7B4]">· {emps.slice(0, 3).join(', ')}{emps.length > 3 ? '…' : ''}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {modo === 'copiar' && (
        <div className="space-y-2">
          {!empresas.length ? <p className="text-[11.5px] text-[#7FA7B4]">No hay otras empresas de las que copiar.</p> : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[11.5px] font-bold text-[#9FC0CB]" htmlFor="ca-origen">Copiar los contactos de</label>
                <select id="ca-origen" className="input !w-auto !py-1.5 !text-[12.5px]" value={origenEfectivo} onChange={(e) => setOrigen(e.target.value)}>
                  {!grupo.length && !origen && <option value="">— elige una empresa —</option>}
                  {grupo.length > 0 && <optgroup label="Del mismo grupo">{grupo.map((e) => <option key={e.id} value={e.id}>{nombreEmpresa(e)}{S(e.id) === S(empresa?.empresa_matriz_id) ? ' (matriz)' : ''}</option>)}</optgroup>}
                  <optgroup label="Otras empresas">{otras.map((e) => <option key={e.id} value={e.id}>{nombreEmpresa(e)}</option>)}</optgroup>
                </select>
                <button type="button" onClick={copiar} disabled={!plan.length} className="btn-ghost !px-3 !py-1.5 text-xs disabled:opacity-50">
                  Copiar {plan.length ? `${plan.length} contacto${plan.length === 1 ? '' : 's'}` : ''}
                </button>
              </div>
              {origenEfectivo && (
                <ul className="max-h-40 space-y-0.5 overflow-y-auto text-[11.5px] text-[#CFE3E9]">
                  {plan.length === 0 && <li className="text-[#7FA7B4]">Esa empresa no tiene contactos.</li>}
                  {plan.map((p) => { const c = contactos.find((x) => S(x.id) === S(p.contacto_id)); return c ? (
                    <li key={p.contacto_id}><span className="chip !px-1.5 !py-0 mr-1.5 bg-brand-verde/15 text-[10px] text-brand-verdeTexto">{rolEtq(p.rol)}</span>{c.nombre} {c.apellidos || ''} <span className="text-[#7FA7B4]">{c.email}</span></li>
                  ) : null; })}
                </ul>
              )}
              {!empresa?.empresa_matriz_id && grupo.length === 0 && (
                <p className="text-[11px] text-[#7FA7B4]">Si indicas la empresa matriz en el formulario, saldrá aquí la primera.</p>
              )}
            </>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-500/12 px-3 py-2 text-[12px] font-bold text-red-200">{error}</p>
      )}
    </div>
  );
}
