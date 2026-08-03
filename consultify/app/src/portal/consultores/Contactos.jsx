import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listTable, insertRow, updateRow, deleteRow, brevoFn } from '../../lib/data.js';
import { useAuth } from '../../lib/auth.jsx';
import { emailValido, semaforoContacto, ROLES_CONTACTO, ROL_LABEL } from '../../lib/crm.js';

// ════════════════════════════════════════════════════════════════════════════
// CONTACTOS · las personas del CRM.
//
// Reglas del modelo (v56):
//   · El email es OBLIGATORIO y único.
//   · Ningún contacto debe quedar sin empresa: al crearlo se exige elegir una
//     y su rol. Si por lo que sea se queda huérfano, sale en ROJO.
// La sincronización con Empresas es automática porque es la MISMA tabla: aquí
// solo se ve desde el lado de la persona.
// ════════════════════════════════════════════════════════════════════════════

const VACIO = {
  nombre: '', apellidos: '', cargo: '', email: '', telefono: '',
  consentimiento_marketing: false, _empresa_id: '', _rol: 'secundario',
};

const FILTROS = [
  ['todos',      'Todos'],
  ['consent',    'Con consentimiento'],
  ['huerfanos',  'Sin empresa o sin email'],
];

export default function Contactos() {
  const { role, demo } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const puedeEditar = ['superadmin', 'admin', 'director', 'gestion'].includes(role);
  const puedeBorrar = ['superadmin', 'admin'].includes(role);

  const [contactos, setContactos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [vinculos, setVinculos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState(params.get('filtro') === 'huerfanos' ? 'huerfanos' : 'todos');
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const [sync, setSync] = useState(false);

  const sel = params.get('c');
  const seleccionar = (id) => { setForm(null); if (id) setParams({ c: String(id) }); else setParams({}); };

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [c, e, v] = await Promise.all([
        listTable('contactos').catch(() => []),
        listTable('empresas').catch(() => []),
        listTable('empresa_contactos').catch(() => []),
      ]);
      (c || []).sort((a, b) => `${a.nombre} ${a.apellidos || ''}`.localeCompare(`${b.nombre} ${b.apellidos || ''}`));
      setContactos(c || []); setEmpresas(e || []); setVinculos(v || []);
    } finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  // Una entrada por EMPRESA, con todos sus roles dentro.
  //
  // Desde la v69 una persona puede tener varios roles en la misma empresa
  // —directiva, de facturación y de proyecto a la vez, que en una pyme es lo
  // normal—. Esto devolvía un elemento por vínculo, así que la ficha decía
  // «Empresas (3)» repitiendo tres veces la misma. Ahora se agrupa.
  const empresasDe = useCallback((cid) => {
    const porEmpresa = new Map();
    for (const v of vinculos) {
      if (String(v.contacto_id) !== String(cid)) continue;
      const e = empresas.find((x) => String(x.id) === String(v.empresa_id));
      if (!e) continue;
      const k = String(e.id);
      if (!porEmpresa.has(k)) porEmpresa.set(k, { e, vincs: [], vinc: v });
      const g = porEmpresa.get(k);
      g.vincs.push(v);
      // El vínculo «principal» representa a la empresa: es el rol que manda.
      if (v.principal || (!g.vinc.principal && v.rol === 'directivo')) g.vinc = v;
    }
    return [...porEmpresa.values()];
  }, [vinculos, empresas]);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return contactos.filter((c) => {
      const n = vinculos.filter((v) => String(v.contacto_id) === String(c.id)).length;
      if (filtro === 'consent' && !c.consentimiento_marketing) return false;
      if (filtro === 'huerfanos' && n > 0 && emailValido(c.email)) return false;
      if (!t) return true;
      return [c.nombre, c.apellidos, c.email, c.telefono, c.cargo].filter(Boolean).join(' ').toLowerCase().includes(t);
    });
  }, [contactos, vinculos, q, filtro]);

  const contacto = sel ? contactos.find((c) => String(c.id) === String(sel)) : null;
  const nHuerfanos = useMemo(() => contactos.filter((c) =>
    !vinculos.some((v) => String(v.contacto_id) === String(c.id)) || !emailValido(c.email)).length,
    [contactos, vinculos]);

  // ── Guardar ───────────────────────────────────────────────────────────────
  async function guardar() {
    if (!form.nombre?.trim()) { setMsg({ err: true, t: 'El nombre es obligatorio.' }); return; }
    if (!emailValido(form.email)) { setMsg({ err: true, t: 'El email es obligatorio y debe ser válido.' }); return; }

    const duplicado = contactos.find((c) =>
      String(c.id) !== String(form.id) &&
      (c.email || '').trim().toLowerCase() === form.email.trim().toLowerCase());
    if (duplicado) {
      setMsg({ err: true, t: `Ese email ya lo tiene «${duplicado.nombre} ${duplicado.apellidos || ''}». Los emails no se repiten en el CRM.` });
      return;
    }
    // Alta: hay que decir a qué empresa pertenece (no debe haber contacto sin empresa)
    if (!form.id && !form._empresa_id) {
      setMsg({ err: true, t: 'Elige la empresa a la que pertenece: ningún contacto puede quedar sin empresa.' });
      return;
    }

    try {
      const payload = {
        nombre: form.nombre.trim(),
        apellidos: form.apellidos?.trim() || null,
        cargo: form.cargo?.trim() || null,
        email: form.email.trim(),
        telefono: form.telefono?.trim() || null,
        consentimiento_marketing: !!form.consentimiento_marketing,
      };
      if (form.consentimiento_marketing && !form._teniaConsent) payload.consentimiento_fecha = new Date().toISOString();

      if (form.id) {
        await updateRow('contactos', form.id, payload);
        setMsg({ t: 'Contacto guardado.' });
      } else {
        const nuevo = await insertRow('contactos', payload);
        if (nuevo?.id) {
          try {
            await insertRow('empresa_contactos', {
              empresa_id: form._empresa_id,
              contacto_id: nuevo.id,
              rol: form._rol || 'secundario',
              principal: form._rol === 'directivo',
              cargo: payload.cargo,
            });
            setMsg({ t: 'Contacto creado y vinculado a su empresa.' });
          } catch {
            setMsg({ err: true, t: 'Contacto creado, pero ese rol ya estaba ocupado en la empresa: entró como secundario.' });
            await insertRow('empresa_contactos', {
              empresa_id: form._empresa_id, contacto_id: nuevo.id, rol: 'secundario', principal: false,
            }).catch(() => {});
          }
          seleccionar(nuevo.id);
        }
      }
      setForm(null); cargar();
    } catch (e) {
      setMsg({ err: true, t: 'No se pudo guardar: ' + (e.message || '') });
    }
  }

  async function borrar(c) {
    if (!window.confirm(`¿Eliminar a «${c.nombre} ${c.apellidos || ''}»? Se quitará de todas sus empresas.`)) return;
    try { await deleteRow('contactos', c.id); seleccionar(null); cargar(); }
    catch { setMsg({ err: true, t: 'No se pudo eliminar.' }); }
  }

  async function sincronizarBrevo(c) {
    if (!emailValido(c.email)) { setMsg({ err: true, t: 'El contacto no tiene un email válido.' }); return; }
    if (!c.consentimiento_marketing) { setMsg({ err: true, t: 'Sin consentimiento RGPD no se puede enviar a Brevo.' }); return; }
    setSync(true); setMsg(null);
    try {
      const emps = empresasDe(c.id);
      const ppal = (emps.find((x) => x.vinc.rol === 'directivo') || emps[0])?.e;
      const r = await brevoFn({ action: 'sincronizar_cliente', cliente: {
        email: c.email, contacto: c.nombre, contacto_apellidos: c.apellidos,
        empresa: ppal?.nombre || '', cif: ppal?.cif || '', cargo: c.cargo || '',
        telefono: c.telefono || '', web: ppal?.web || '',
        tipo: ppal?.es_proveedor && !ppal?.es_cliente ? 'Proveedor'
            : ppal?.estado_comercial === 'potencial' ? 'Potencial' : 'Cliente',
      } });
      if (r?.ok) {
        await updateRow('contactos', c.id, { brevo_sincronizado_en: new Date().toISOString(), brevo_id: r.id || c.brevo_id });
        setMsg({ t: '✓ Enviado a Brevo. Recibirá el email de doble opt-in.' }); cargar();
      } else setMsg({ err: true, t: 'Brevo: ' + (r?.error || 'error desconocido') });
    } catch (e) { setMsg({ err: true, t: 'Error al sincronizar: ' + (e.message || '') }); }
    setSync(false);
  }

  async function sincronizarTodos() {
    const elegibles = contactos.filter((c) => emailValido(c.email) && c.consentimiento_marketing);
    if (!elegibles.length) { setMsg({ err: true, t: 'No hay contactos con email y consentimiento.' }); return; }
    if (!window.confirm(`Se enviarán ${elegibles.length} contacto(s) a Brevo. ¿Continuar?`)) return;
    setSync(true); setMsg(null);
    let ok = 0, err = 0;
    for (const c of elegibles) {
      try {
        const emps = empresasDe(c.id);
        const ppal = (emps.find((x) => x.vinc.rol === 'directivo') || emps[0])?.e;
        const r = await brevoFn({ action: 'sincronizar_cliente', cliente: {
          email: c.email, contacto: c.nombre, contacto_apellidos: c.apellidos,
          empresa: ppal?.nombre || '', cif: ppal?.cif || '', cargo: c.cargo || '',
        } });
        if (r?.ok) { ok++; await updateRow('contactos', c.id, { brevo_sincronizado_en: new Date().toISOString() }); }
        else err++;
      } catch { err++; }
    }
    setMsg({ t: `✓ ${ok} enviado(s) a Brevo${err ? ` · ${err} con error` : ''}.` });
    setSync(false); cargar();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">CRM</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#EAF4F7]">Contactos</h1>
          <p className="mt-1 text-sm font-medium text-[#9FC0CB]">
            Las personas del CRM. Email obligatorio y siempre con empresa. A Brevo solo van los que han dado consentimiento.
          </p>
        </div>
        {puedeEditar && (
          <div className="flex flex-wrap gap-2">
            <button onClick={sincronizarTodos} disabled={sync} className="btn-ghost !px-4 !py-2 text-sm disabled:opacity-40">
              {sync ? 'Enviando…' : '✉ Sincronizar todos'}
            </button>
            <button onClick={() => { setForm({ ...VACIO }); setParams({}); }} className="btn-orange">+ Nuevo contacto</button>
          </div>
        )}
      </div>

      {demo && <div className="rounded-xl bg-brand-orange/10 p-3 text-xs font-semibold text-brand-orange">Modo demo: los cambios no se guardan.</div>}
      {msg && (
        <div className={`rounded-xl p-3 text-sm font-bold ${msg.err ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'}`}
          onClick={() => setMsg(null)}>{msg.t}</div>
      )}

      {nHuerfanos > 0 && filtro !== 'huerfanos' && (
        <div className="flex items-center gap-3 rounded-xl bg-red-500/10 p-3 text-xs font-bold text-red-300">
          <span>{nHuerfanos} contacto(s) sin empresa o sin email válido.</span>
          <button onClick={() => setFiltro('huerfanos')} className="underline hover:text-red-200">verlos</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, email…" className="input max-w-xs !py-2" />
        <div className="flex flex-wrap overflow-hidden rounded-xl border border-[#1E5468] text-xs font-bold">
          {FILTROS.map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)}
              className={`px-3 py-2 ${filtro === k ? 'bg-brand-verde text-[#061F2B]' : 'text-[#9FC0CB] hover:text-[#EAF4F7]'}`}>
              {l}{k === 'huerfanos' && nHuerfanos > 0 ? ` (${nHuerfanos})` : ''}
            </button>
          ))}
        </div>
        <span className="text-xs font-semibold text-[#7FA7B4]">{lista.length} de {contactos.length}</span>
      </div>

      {cargando ? <p className="py-10 text-center text-[#7FA7B4]">Cargando…</p> : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          {/* Listado */}
          <div className="card overflow-hidden p-0">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <tbody>
                  {lista.length === 0 && (
                    <tr><td className="px-5 py-8 text-center text-[#7FA7B4]">
                      {contactos.length === 0 ? 'Sin contactos. ¿Has ejecutado las migraciones v48 y v56?' : 'Ninguno con ese filtro.'}
                    </td></tr>
                  )}
                  {lista.map((c) => {
                    const emps = empresasDe(c.id);
                    const s = semaforoContacto(c, emps.length);
                    return (
                      <tr key={c.id} onClick={() => seleccionar(c.id)}
                        className={`cursor-pointer border-b border-[#1E5468]/60 last:border-0 ${String(sel) === String(c.id) ? 'bg-[#12454A]' : 'hover:bg-[#10394A]'}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${s.color === 'rojo' ? 'bg-red-500' : 'bg-emerald-400'}`}
                              title={s.motivos.join(' · ') || 'Ficha completa'} />
                            <span className="font-bold text-[#EAF4F7]">{c.nombre} {c.apellidos || ''}</span>
                            {c.consentimiento_marketing && <span className="chip bg-emerald-500/15 !px-1.5 !py-0 text-[9px] text-emerald-300">RGPD</span>}
                          </div>
                          <div className="ml-4 text-xs text-[#7FA7B4]">
                            {emailValido(c.email) ? c.email : <span className="font-bold text-red-300">sin email válido</span>}
                            {' · '}
                            {emps.length
                              ? emps.map((x) => x.e.nombre).join(' · ')
                              : <span className="font-bold text-red-300">sin empresa</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detalle / formulario */}
          <div>
            {form ? (
              <div className="card space-y-3">
                <h3 className="text-lg font-extrabold text-[#EAF4F7]">{form.id ? 'Editar contacto' : 'Nuevo contacto'}</h3>

                <div className="flex gap-2">
                  <label className="block flex-1 text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Nombre*
                    <input className="input !mt-1" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
                  <label className="block flex-1 text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Apellidos
                    <input className="input !mt-1" value={form.apellidos || ''} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} /></label>
                </div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Cargo
                  <input className="input !mt-1" value={form.cargo || ''} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></label>
                <div className="flex gap-2">
                  <label className="block flex-1 text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Email*
                    <input className={`input !mt-1 ${form.email && !emailValido(form.email) ? '!border-red-500/60' : ''}`}
                      value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </label>
                  <label className="block flex-1 text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Teléfono
                    <input className="input !mt-1" value={form.telefono || ''} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></label>
                </div>
                {form.email && !emailValido(form.email) && (
                  <p className="text-xs font-bold text-red-300">Ese email no tiene forma válida.</p>
                )}

                {/* Empresa obligatoria en el alta */}
                {!form.id && (
                  <div className="space-y-2 rounded-xl border border-brand-verde/40 bg-[#0B2E3D] p-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-brand-verdeTexto">Empresa a la que pertenece*</p>
                    <select className="input" value={form._empresa_id}
                      onChange={(e) => setForm({ ...form, _empresa_id: e.target.value })}>
                      <option value="">— elige una empresa —</option>
                      {[...empresas].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
                        .map((e) => <option key={e.id} value={e.id}>{e.nombre}{e.cif ? ` · ${e.cif}` : ''}</option>)}
                    </select>
                    <select className="input" value={form._rol}
                      onChange={(e) => setForm({ ...form, _rol: e.target.value })}>
                      <option value="secundario">{ROL_LABEL.secundario}</option>
                      {ROLES_CONTACTO.map((r) => <option key={r.k} value={r.k}>{r.label}</option>)}
                    </select>
                    <p className="text-xs text-[#7FA7B4]">
                      Ningún contacto puede quedar sin empresa. Si la empresa aún no existe, créala primero en «Empresas».
                    </p>
                  </div>
                )}

                <label className="flex items-start gap-2 rounded-xl bg-white/5 p-3 text-sm font-semibold text-[#9FC0CB]">
                  <input type="checkbox" className="mt-0.5" checked={!!form.consentimiento_marketing}
                    onChange={(e) => setForm({ ...form, consentimiento_marketing: e.target.checked, _teniaConsent: form.consentimiento_marketing })} />
                  <span>Ha dado su <strong className="text-[#EAF4F7]">consentimiento</strong> para comunicaciones comerciales (RGPD). Necesario para Brevo.</span>
                </label>

                <div className="flex justify-end gap-2">
                  <button onClick={() => setForm(null)} className="btn-ghost !px-4 !py-2 text-sm">Cancelar</button>
                  <button onClick={guardar} className="btn-orange !px-4 !py-2 text-sm">Guardar</button>
                </div>
              </div>
            ) : contacto ? (
              (() => {
                const emps = empresasDe(contacto.id);
                const s = semaforoContacto(contacto, emps.length);
                return (
                  <div className="card space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.color === 'rojo' ? 'bg-red-500' : 'bg-emerald-400'}`} />
                          <h3 className="text-lg font-extrabold text-[#EAF4F7]">{contacto.nombre} {contacto.apellidos || ''}</h3>
                        </div>
                        {contacto.cargo && <p className="text-sm font-semibold text-[#9FC0CB]">{contacto.cargo}</p>}
                        <p className="text-sm text-[#7FA7B4]">
                          {emailValido(contacto.email) ? contacto.email : <span className="font-bold text-red-300">sin email válido</span>}
                          {contacto.telefono ? ` · ${contacto.telefono}` : ''}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {contacto.consentimiento_marketing
                            ? <span className="chip bg-emerald-500/15 text-emerald-300">✓ Consentimiento RGPD</span>
                            : <span className="chip bg-white/5 text-[#7FA7B4]">Sin consentimiento</span>}
                          {contacto.brevo_sincronizado_en && <span className="chip bg-brand-verde/15 text-brand-verdeTexto">En Brevo</span>}
                        </div>
                      </div>
                      {puedeEditar && (
                        <div className="flex shrink-0 gap-2">
                          <button onClick={() => setForm({ ...contacto, _teniaConsent: contacto.consentimiento_marketing })}
                            className="btn-ghost !px-3 !py-1.5 text-xs">✎ Editar</button>
                          {puedeBorrar && (
                            <button onClick={() => borrar(contacto)}
                              className="rounded-xl border border-red-500/40 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/10">🗑</button>
                          )}
                        </div>
                      )}
                    </div>

                    {s.motivos.length > 0 && (
                      <ul className="space-y-0.5 rounded-xl bg-red-500/10 p-3 text-xs font-bold text-red-300">
                        {s.motivos.map((m) => <li key={m}>· {m}</li>)}
                      </ul>
                    )}

                    {puedeEditar && (
                      <div className="rounded-xl border border-[#1E5468] p-3">
                        <button onClick={() => sincronizarBrevo(contacto)}
                          disabled={sync || !emailValido(contacto.email) || !contacto.consentimiento_marketing}
                          className="btn-orange !px-4 !py-2 text-sm disabled:opacity-40">
                          {sync ? 'Enviando…' : '✉ Enviar a Brevo (doble opt-in)'}
                        </button>
                        {(!emailValido(contacto.email) || !contacto.consentimiento_marketing) && (
                          <p className="mt-2 text-xs font-semibold text-[#7FA7B4]">
                            {!emailValido(contacto.email) ? 'Necesita un email válido. ' : ''}
                            {!contacto.consentimiento_marketing ? 'Necesita el consentimiento RGPD.' : ''}
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <h4 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-[#9FC0CB]">
                        Empresas ({emps.length})
                      </h4>
                      {emps.length === 0 && (
                        <p className="rounded-xl bg-red-500/10 p-3 text-sm font-bold text-red-300">
                          No pertenece a ninguna empresa. Asígnalo desde la ficha de la empresa.
                        </p>
                      )}
                      <div className="space-y-2">
                        {emps.map(({ e, vincs }) => (
                          <button key={e.id} onClick={() => navigate({ pathname: '../empresas', search: `?e=${e.id}` })}
                            className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-[#1E5468] bg-[#0D3242] p-2.5 text-left hover:border-brand-verde">
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-[#EAF4F7]">{e.nombre}</span>
                              <span className="ml-2 text-xs text-[#7FA7B4]">{e.cif || 'sin CIF'}</span>
                            </div>
                            {/* Todos los roles que ocupa en ESTA empresa. Antes se
                                repetía la empresa entera por cada uno. */}
                            <span className="flex flex-wrap gap-1">
                              {vincs.map((v) => (
                                <span key={v.id}
                                  className={`chip !px-2 !py-0 text-[10px] ${
                                    v.principal ? 'bg-brand-orange/15 text-brand-orange' : 'bg-brand-verde/15 text-brand-verdeTexto'}`}>
                                  {v.principal ? '★ ' : ''}{ROL_LABEL[v.rol] || 'Secundario'}
                                </span>
                              ))}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="card flex h-full items-center justify-center py-16 text-center text-sm text-[#7FA7B4]">
                Selecciona un contacto para ver su ficha y sus empresas.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
