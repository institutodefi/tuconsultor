import { Fragment, useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DialogoFicha from '../../components/DialogoFicha.jsx';
import { BarraLote, BotonLote, InformeLote, CasillaTodos } from '../../components/BarraLote.jsx';
import { useLote, exportarCSV, copiarCorreos } from '../../lib/lote.js';
import { listTable, insertRow, updateRow, deleteRow, brevoFn , explicarErrorBd } from '../../lib/data.js';
import { useAuth } from '../../lib/auth.jsx';
import { emailValido, semaforoContacto, ROLES_CONTACTO, ROL_LABEL , nombreVisible } from '../../lib/crm.js';

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
  nombre: '', apellidos: '', cargo: '', email: '', telefono: '', movil: '',
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
  // Fila desplegada para ver la ficha sin salir de la tabla.
  const [abierta, setAbierta] = useState(null);

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

  // ── Acciones en lote ──────────────────────────────────────────────────────
  // La mecánica vive en `lib/lote.js`, compartida con las demás listas.
  const lote = useLote(lista, cargar);

  const loteConsentimiento = (valor) => lote.ejecutar(
    valor ? 'con consentimiento concedido' : 'con consentimiento retirado',
    (c) => updateRow('contactos', c.id, {
      consentimiento_marketing: valor,
      // La fecha solo se pone al conceder: al retirar se conserva, porque es la
      // prueba de cuándo se tuvo y hay que poder demostrarla.
      ...(valor && !c.consentimiento_marketing ? { consentimiento_fecha: new Date().toISOString() } : {}),
    }),
  );

  const loteBrevo = () => lote.ejecutar('enviados a Brevo', async (c) => {
    if (!emailValido(c.email)) throw new Error('sin email válido');
    if (!c.consentimiento_marketing) throw new Error('sin consentimiento RGPD');
    // Mismo payload que el envío individual: si aquí se manda otra cosa, unos
    // contactos llegan a Brevo con empresa y otros sin ella.
    const emps = empresasDe(c.id);
    const ppal = (emps.find((x) => x.vinc.rol === 'directivo') || emps[0])?.e;
    const r = await brevoFn({ action: 'sincronizar_cliente', cliente: {
      email: c.email, contacto: c.nombre, contacto_apellidos: c.apellidos,
      empresa: ppal?.nombre || '', cif: ppal?.cif || '', cargo: c.cargo || '',
      telefono: c.movil || c.telefono || '', web: ppal?.web || '',
      tipo: ppal?.es_proveedor && !ppal?.es_cliente ? 'Proveedor'
          : ppal?.estado_comercial === 'potencial' ? 'Potencial' : 'Cliente',
    } });
    if (!r?.ok) throw new Error(r?.error || 'error de Brevo');
    await updateRow('contactos', c.id, {
      brevo_sincronizado_en: new Date().toISOString(), brevo_id: r.id || c.brevo_id,
    });
  });

  const loteBorrar = () => lote.ejecutarConAviso(
    'eliminados',
    `Se van a eliminar ${lote.nMarcados} contacto(s). Esta acción no se puede deshacer.`,
    (c) => deleteRow('contactos', c.id),
  );

  async function loteCopiarCorreos() {
    const r = await copiarCorreos(lote.seleccionados);
    setMsg(r.ok
      ? { t: `${r.n} correo(s) copiados al portapapeles.` }
      : { err: true, t: r.error || 'Ninguno de los marcados tiene email válido.' });
  }

  const loteCSV = () => exportarCSV(
    lote.seleccionados.length ? lote.seleccionados : lista,
    [
      ['Nombre', (c) => c.nombre], ['Apellidos', (c) => c.apellidos], ['Cargo', (c) => c.cargo],
      ['Email', (c) => c.email], ['Móvil', (c) => c.movil], ['Teléfono', (c) => c.telefono],
      ['Empresa', (c) => empresasDe(c.id).map((x) => nombreVisible(x.e)).join(' · ')],
      ['Consentimiento', (c) => (c.consentimiento_marketing ? 'sí' : 'no')],
    ],
    'contactos',
  );

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
        movil: form.movil?.trim() || null,
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
          // Tras un ALTA se vuelve al listado, igual que en empresas: es donde
          // se comprueba que el contacto está. Dejar abierta su ficha obliga a
          // cerrarla a mano para ver si consta.
          seleccionar(null);
        }
      }
      setForm(null); cargar();
    } catch (e) {
      setMsg({ err: true, t: 'No se pudo guardar: ' + explicarErrorBd(e, 'contactos') });
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

      {/* ── Barra de acciones en lote ──
          Aparece solo con algo marcado: una barra permanente con los botones
          apagados es ruido en cada visita. */}
      <BarraLote n={lote.nMarcados} onLimpiar={lote.limpiar}>
        <BotonLote onClick={loteCopiarCorreos}>Copiar correos</BotonLote>
        <BotonLote onClick={loteCSV}>Exportar CSV</BotonLote>
        {puedeEditar && <>
          <BotonLote onClick={() => loteConsentimiento(true)}>Dar consentimiento</BotonLote>
          <BotonLote onClick={() => loteConsentimiento(false)}>Retirar</BotonLote>
          <BotonLote onClick={loteBrevo}>Enviar a Brevo</BotonLote>
        </>}
        {puedeBorrar && <BotonLote onClick={loteBorrar} peligro>Eliminar</BotonLote>}
      </BarraLote>

      <InformeLote estado={lote.estado} onCerrar={lote.cerrarEstado}
        nombreDe={(c) => `${c.nombre} ${c.apellidos || ''}`.trim()} />

      {cargando ? <p className="py-10 text-center text-[#7FA7B4]">Cargando…</p> : (
        <div className="overflow-x-auto rounded-2xl border border-[#1E5468]">
          <table className="w-full min-w-[420px] text-[13px]">
            <thead>
              <tr className="border-b border-[#1E5468] bg-[#0D3242] text-left text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-[#7FA7B4]">
                <th className="w-9 px-2 py-1.5">
                  <CasillaTodos marcado={lote.todosMarcados} onCambio={lote.alternarTodos} />
                </th>
                <th className="px-2 py-1.5">Nombre</th>
                <th className="hidden px-2 py-1.5 sm:table-cell">Correo</th>
                <th className="px-2 py-1.5">Móvil</th>
                <th className="hidden px-2 py-1.5 md:table-cell">Empresa</th>
                <th className="w-16 px-2 py-1.5 text-right">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#153F52]">
              {lista.map((c) => {
                const emps = empresasDe(c.id);
                const st = semaforoContacto(c, emps.length);
                const marcado = lote.marcados.has(String(c.id));
                const desplegada = String(abierta) === String(c.id);
                return (
                  <Fragment key={c.id}>
                    <tr className={marcado ? 'bg-brand-orange/[0.07]' : desplegada ? 'bg-white/[0.04]' : undefined}>
                      <td className="px-2 py-1">
                        <input type="checkbox" checked={marcado} onChange={() => lote.alternar(c.id)}
                          aria-label={`Marcar ${c.nombre}`} />
                      </td>
                      <td className="px-2 py-1">
                        <button onClick={() => setAbierta(desplegada ? null : c.id)}
                          className="flex w-full items-center gap-1.5 text-left">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${st.color === 'rojo' ? 'bg-red-500' : 'bg-emerald-400'}`}
                            title={st.motivos.join(' · ') || 'Ficha completa'} />
                          <span className="min-w-0">
                            <span className="block truncate font-bold text-[#EAF4F7]">{c.nombre} {c.apellidos || ''}</span>
                            {/* En móvil, correo y empresa se ocultan como
                                columna pero aparecen aquí: ocultar un dato sin
                                dejarlo a mano es peor que la tabla ancha. */}
                            <span className="block truncate text-[11px] text-[#7FA7B4] sm:hidden">
                              {emailValido(c.email) ? c.email : 'sin correo'}
                            </span>
                            <span className="block truncate text-[11px] text-[#7FA7B4] md:hidden">
                              {emps.length ? emps.map((x) => nombreVisible(x.e)).join(' · ') : 'sin empresa'}
                            </span>
                          </span>
                          {c.consentimiento_marketing && (
                            <span className="chip !px-1 !py-0 bg-emerald-500/15 text-[9px] text-emerald-300">RGPD</span>
                          )}
                        </button>
                      </td>
                      <td className="hidden px-2 py-1 text-[#9FC0CB] sm:table-cell">
                        {emailValido(c.email)
                          ? <a href={`mailto:${c.email}`} className="block truncate hover:text-brand-orange">{c.email}</a>
                          : <span className="font-bold text-red-300">sin correo</span>}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-[#9FC0CB]">
                        {c.movil || c.telefono
                          ? <a href={`tel:${(c.movil || c.telefono).replace(/\s/g, '')}`} className="hover:text-brand-orange">{c.movil || c.telefono}</a>
                          : <span className="text-[#5E8494]">—</span>}
                      </td>
                      <td className="hidden px-2 py-1 text-[#B9D2DA] md:table-cell">
                        {emps.length
                          ? <span className="block truncate" title={emps.map((x) => nombreVisible(x.e)).join(' · ')}>
                              {emps.map((x) => nombreVisible(x.e)).join(' · ')}</span>
                          : <span className="font-bold text-red-300">sin empresa</span>}
                      </td>
                      <td className="px-2 py-1 text-right">
                        <button onClick={() => setAbierta(desplegada ? null : c.id)}
                          className="text-[11px] font-bold text-[#7FA7B4] hover:text-brand-orange"
                          aria-expanded={desplegada}>
                          {desplegada ? 'Cerrar ▲' : 'Abrir ▼'}
                        </button>
                      </td>
                    </tr>

                    {/* Edición desplegada bajo su propia fila: se ve a quién se
                        está editando sin perder de vista el resto de la lista. */}
                    {desplegada && (
                      <tr className="bg-[#0B2E3D]">
                        <td colSpan={6} className="px-3 py-3">
                          <FichaContacto
                            contacto={c} empresas={emps} puedeEditar={puedeEditar} puedeBorrar={puedeBorrar}
                            sync={sync}
                            onEditar={() => setForm({ ...c, _teniaConsent: c.consentimiento_marketing })}
                            onBorrar={() => borrar(c)}
                            onBrevo={() => sincronizarBrevo(c)}
                            onEmpresa={(e) => navigate({ pathname: '../empresas', search: `?e=${e.id}` })}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!lista.length && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-[#7FA7B4]">
                  {contactos.length === 0 ? 'Sin contactos todavía.' : 'Ninguno con ese filtro.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Alta y edición en diálogo: encima de la lista, sin empujar la tabla
          hacia abajo ni obligar a buscar dónde ha aparecido el formulario. */}
      {form && (
        <DialogoFicha
          titulo={form.id ? 'Editar contacto' : 'Nuevo contacto'}
          subtitulo={form.id ? `${form.nombre} ${form.apellidos || ''}`.trim() : 'Todo contacto necesita empresa y correo'}
          onCerrar={() => setForm(null)}
          haycambios
          ancho="760px"
          pie={<>
            <button onClick={() => setForm(null)} className="btn-ghost !px-4 !py-1.5 text-[13px]">Cancelar</button>
            <button onClick={guardar} className="btn-orange !px-4 !py-1.5 text-[13px]">Guardar</button>
          </>}
        >
          <FormContacto form={form} setForm={setForm} empresas={empresas} />
        </DialogoFicha>
      )}
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// Ficha desplegada bajo la fila del contacto
// ════════════════════════════════════════════════════════════════════════════
function FichaContacto({ contacto, empresas, puedeEditar, puedeBorrar, sync, onEditar, onBorrar, onBrevo, onEmpresa }) {
  const s = semaforoContacto(contacto, empresas.length);
  const puedeBrevo = emailValido(contacto.email) && contacto.consentimiento_marketing;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 text-[12.5px]">
          <p className="font-extrabold text-[#EAF4F7]">
            {contacto.nombre} {contacto.apellidos || ''}
            {contacto.cargo && <span className="ml-2 font-semibold text-[#9FC0CB]">{contacto.cargo}</span>}
          </p>
          <p className="mt-0.5 text-[#7FA7B4]">
            {emailValido(contacto.email) ? contacto.email : <span className="font-bold text-red-300">sin email válido</span>}
            {contacto.movil ? ` · móvil ${contacto.movil}` : ''}
            {contacto.telefono ? ` · tel. ${contacto.telefono}` : ''}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {contacto.consentimiento_marketing
              ? <span className="chip !py-0 bg-emerald-500/15 text-[10px] text-emerald-300">✓ Consentimiento RGPD</span>
              : <span className="chip !py-0 bg-white/5 text-[10px] text-[#7FA7B4]">Sin consentimiento</span>}
            {contacto.brevo_sincronizado_en && <span className="chip !py-0 bg-brand-verde/15 text-[10px] text-brand-verdeTexto">En Brevo</span>}
          </div>
        </div>
        {puedeEditar && (
          <div className="flex shrink-0 flex-wrap gap-1.5">
            <button onClick={onEditar} className="btn-ghost !px-2.5 !py-1 text-[11.5px]">✎ Editar</button>
            <button onClick={onBrevo} disabled={sync || !puedeBrevo}
              title={puedeBrevo ? 'Alta con doble opt-in' : 'Necesita email válido y consentimiento RGPD'}
              className="btn-ghost !px-2.5 !py-1 text-[11.5px] disabled:opacity-40">
              {sync ? 'Enviando…' : '✉ Brevo'}
            </button>
            {puedeBorrar && (
              <button onClick={onBorrar}
                className="rounded-full border border-red-500/40 px-2.5 py-1 text-[11.5px] font-bold text-red-300 hover:bg-red-500/10">
                Eliminar
              </button>
            )}
          </div>
        )}
      </div>

      {s.motivos.length > 0 && (
        <ul className="space-y-0.5 rounded-lg bg-red-500/10 px-2.5 py-2 text-[11.5px] font-bold text-red-300">
          {s.motivos.map((m) => <li key={m}>· {m}</li>)}
        </ul>
      )}

      <div>
        <p className="label !mb-1.5">Empresas ({empresas.length})</p>
        {empresas.length === 0 ? (
          <p className="rounded-lg bg-red-500/10 px-2.5 py-2 text-[11.5px] font-bold text-red-300">
            No pertenece a ninguna empresa. Asígnalo desde la ficha de la empresa.
          </p>
        ) : (
          <div className="space-y-1.5">
            {empresas.map(({ e, vincs }) => (
              <button key={e.id} onClick={() => onEmpresa(e)}
                className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-[#1E5468] bg-[#0D3242] px-2.5 py-1.5 text-left hover:border-brand-verde">
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-[#EAF4F7]">{nombreVisible(e)}</span>
                <span className="text-[11px] text-[#7FA7B4]">{e.cif || 'sin CIF'}</span>
                <span className="flex flex-wrap gap-1">
                  {vincs.map((v) => (
                    <span key={v.id} className={`chip !px-1.5 !py-0 text-[9.5px] ${
                      v.principal ? 'bg-brand-orange/15 text-brand-orange' : 'bg-brand-verde/15 text-brand-verdeTexto'}`}>
                      {v.principal ? '★ ' : ''}{ROL_LABEL[v.rol] || 'Secundario'}
                    </span>
                  ))}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Alta y edición de contacto
// ════════════════════════════════════════════════════════════════════════════
function FormContacto({ form, setForm, empresas }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="space-y-3">
      <div className="form-grid">
        <div className="campo"><label className="label" htmlFor="ct-nombre">Nombre*</label>
          <input id="ct-nombre" className="input" value={form.nombre} onChange={set('nombre')} /></div>
        <div className="campo"><label className="label" htmlFor="ct-apellidos">Apellidos</label>
          <input id="ct-apellidos" className="input" value={form.apellidos || ''} onChange={set('apellidos')} /></div>
        <div className="campo"><label className="label" htmlFor="ct-cargo">Cargo</label>
          <input id="ct-cargo" className="input" value={form.cargo || ''} onChange={set('cargo')} /></div>
        <div className="campo"><label className="label" htmlFor="ct-email">Correo*</label>
          <input id="ct-email" type="email" value={form.email || ''} onChange={set('email')}
            className={`input ${form.email && !emailValido(form.email) ? '!border-red-500/60' : ''}`} />
          {form.email && !emailValido(form.email) && (
            <p className="campo-nota !text-red-300">Ese correo no tiene forma válida.</p>
          )}
        </div>
        <div className="campo"><label className="label" htmlFor="ct-movil">Móvil</label>
          <input id="ct-movil" type="tel" className="input" value={form.movil || ''} onChange={set('movil')} />
          <p className="campo-nota">El de la persona, para avisos urgentes.</p></div>
        <div className="campo"><label className="label" htmlFor="ct-tel">Teléfono</label>
          <input id="ct-tel" type="tel" className="input" value={form.telefono || ''} onChange={set('telefono')} />
          <p className="campo-nota">Fijo o centralita.</p></div>
      </div>

      {!form.id && (
        <div className="space-y-2 rounded-xl border border-brand-verde/40 bg-[#0B2E3D] p-3">
          <p className="label !mb-0 text-brand-verdeTexto">Empresa a la que pertenece*</p>
          <div className="form-grid-3">
            <select className="input" value={form._empresa_id} onChange={set('_empresa_id')}>
              <option value="">— elige una empresa —</option>
              {[...empresas].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
                .map((e) => <option key={e.id} value={e.id}>{e.nombre}{e.cif ? ` · ${e.cif}` : ''}</option>)}
            </select>
            <select className="input" value={form._rol} onChange={set('_rol')}>
              <option value="secundario">{ROL_LABEL.secundario}</option>
              {ROLES_CONTACTO.map((r) => <option key={r.k} value={r.k}>{r.label}</option>)}
            </select>
          </div>
          <p className="text-[11.5px] text-[#7FA7B4]">
            Ningún contacto puede quedar sin empresa. Si aún no existe, créala antes en «Empresas».
          </p>
        </div>
      )}

      <label className="flex items-start gap-2 rounded-xl bg-white/5 p-2.5 text-[12.5px] font-semibold text-[#9FC0CB]">
        <input type="checkbox" className="mt-0.5" checked={!!form.consentimiento_marketing}
          onChange={(e) => setForm({ ...form, consentimiento_marketing: e.target.checked, _teniaConsent: form.consentimiento_marketing })} />
        <span>Ha dado su <strong className="text-[#EAF4F7]">consentimiento</strong> para comunicaciones comerciales (RGPD). Necesario para Brevo.</span>
      </label>
    </div>
  );
}
