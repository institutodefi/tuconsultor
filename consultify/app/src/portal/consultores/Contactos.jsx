import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DialogoFicha from '../../components/DialogoFicha.jsx';
import ImagenSubible, { Avatar } from '../../components/ImagenSubible.jsx';
import ConsentimientoRgpd from '../../components/ConsentimientoRgpd.jsx';
import { BarraLote, BotonLote, InformeLote, CasillaTodos } from '../../components/BarraLote.jsx';
import { useLote, exportarCSV, copiarCorreos } from '../../lib/lote.js';
import { listTable, insertRow, updateRow, deleteRow, brevoFn , explicarErrorBd } from '../../lib/data.js';
import { useAuth } from '../../lib/auth.jsx';
import { emailValido, semaforoContacto, ROLES_CONTACTO, ROL_LABEL , nombreVisible } from '../../lib/crm.js';
import { puedeEditarContactos } from '../../lib/crm.js';
import { linkWhatsApp } from '../../lib/telefono.js';
import BuscadorContactoIA from '../../components/BuscadorContactoIA.jsx';
import AsociarLinkedIn from '../../components/AsociarLinkedIn.jsx';

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
  ['consent',    'Con comunicaciones'],
  ['rgpd',       'RGPD aceptado'],
  ['sin_rgpd',   'RGPD pendiente'],
  ['brevo',      'En Brevo'],
  ['sin_revisar', 'Sin revisar'],
  ['huerfanos',  'Sin empresa o sin email'],
];
const ROLES_FILTRO = [['', 'Rol: todos'], ['directivo', 'Directivo'], ['facturacion', 'Facturación'], ['proyecto', 'Proyecto'], ['secundario', 'Secundario'], ['principal', 'Principal de su empresa']];
const ORIGENES = [['', 'Origen: todos'], ['manual', 'Manual'], ['calculadora', 'Pidió oferta (web)'], ['holded', 'Holded'], ['importacion', 'Importación'], ['web', 'Web'], ['ia-web', 'Buscado con IA (LinkedIn/web)']];
const TAMANOS = [10, 25, 50, 100, 0];   // 0 = todos
const leerTamano = () => { try { const g = localStorage.getItem('contactos_por_pagina'); if (g === null) return 25; const v = Number(g); return TAMANOS.includes(v) ? v : 25; } catch { return 25; } };
const ORDENES = [['nombre', 'Nombre'], ['apellidos', 'Apellidos'], ['empresa', 'Empresa'], ['cargo', 'Cargo'], ['email', 'Correo'], ['reciente', 'Última modificación'], ['creado', 'Fecha de alta']];
const SS = (v) => String(v ?? '');

export default function Contactos() {
  const { role, demo } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const puedeEditar = puedeEditarContactos(role);
  const puedeBorrar = ['superadmin', 'admin'].includes(role);

  const [contactos, setContactos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [vinculos, setVinculos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState(FILTROS.some(([k]) => k === params.get('filtro')) ? params.get('filtro') : 'todos');
  const [empresaFiltro, setEmpresaFiltro] = useState('');
  const [rolFiltro, setRolFiltro] = useState('');
  const [origenFiltro, setOrigenFiltro] = useState('');
  const [orden, setOrden] = useState('nombre');
  const [desc, setDesc] = useState(false);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const [sync, setSync] = useState(false);
  // Paginación (v279ap): 10 · 25 · 50 · 100 · todos, recordado en el navegador.
  const [porPagina, setPorPagina] = useState(leerTamano);
  const [pagina, setPagina] = useState(1);
  const [buscadorIA, setBuscadorIA] = useState(false);
  const { perfil } = useAuth();

  const sel = params.get('c');
  const seleccionar = (id) => { setForm(null); if (id) setParams({ c: String(id) }); else setParams({}); };
  // Al pinchar en un contacto se abre su ficha en un popup, con la edición dentro.
  const abrir = (c) => setForm({ ...c, _teniaConsent: c.consentimiento_marketing });

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
    const empresaDe = (id) => empresas.find((e) => String(e.id) === String(id));
    const vincsDe = (c) => vinculos.filter((v) => String(v.contacto_id) === String(c.id));
    const nombresEmpresa = (c) => vincsDe(c).map((v) => empresaDe(v.empresa_id)).filter(Boolean).map((e) => `${e.nombre} ${e.nombre_comercial || ''} ${e.cif || ''}`).join(' ');
    return contactos.filter((c) => {
      const vs = vincsDe(c);
      const n = vs.length;
      if (filtro === 'consent' && !c.consentimiento_marketing) return false;
      if (filtro === 'rgpd' && !c.rgpd_aceptado) return false;
      if (filtro === 'sin_rgpd' && c.rgpd_aceptado) return false;
      if (filtro === 'brevo' && !c.brevo_sincronizado_en) return false;
      if (filtro === 'sin_revisar' && c.revisado !== false) return false;
      if (filtro === 'huerfanos' && n > 0 && emailValido(c.email)) return false;
      if (empresaFiltro && !vs.some((v) => String(v.empresa_id) === empresaFiltro)) return false;
      if (rolFiltro === 'principal' && !vs.some((v) => v.principal)) return false;
      if (rolFiltro && rolFiltro !== 'principal' && !vs.some((v) => v.rol === rolFiltro)) return false;
      if (origenFiltro && (c.origen || 'manual') !== origenFiltro) return false;
      if (!t) return true;
      return [c.nombre, c.apellidos, c.email, c.telefono, c.movil, c.cargo, c.notas, nombresEmpresa(c)].filter(Boolean).join(' ').toLowerCase().includes(t);
    }).sort((a, b) => {
      const emp = (c) => { const v = vincsDe(c).sort((x, y) => (y.principal ? 1 : 0) - (x.principal ? 1 : 0))[0]; const e = v && empresaDe(v.empresa_id); return e ? nombreVisible(e) : ''; };
      let r = 0;
      if (orden === 'nombre') r = `${SS(a.nombre)} ${SS(a.apellidos)}`.localeCompare(`${SS(b.nombre)} ${SS(b.apellidos)}`, 'es');
      else if (orden === 'apellidos') r = `${SS(a.apellidos)} ${SS(a.nombre)}`.localeCompare(`${SS(b.apellidos)} ${SS(b.nombre)}`, 'es');
      else if (orden === 'empresa') r = emp(a).localeCompare(emp(b), 'es') || SS(a.nombre).localeCompare(SS(b.nombre), 'es');
      else if (orden === 'cargo') r = SS(a.cargo).localeCompare(SS(b.cargo), 'es') || SS(a.nombre).localeCompare(SS(b.nombre), 'es');
      else if (orden === 'email') r = SS(a.email).localeCompare(SS(b.email), 'es');
      else if (orden === 'reciente') r = SS(a.updated_at || a.creado).localeCompare(SS(b.updated_at || b.creado));
      else if (orden === 'creado') r = SS(a.creado).localeCompare(SS(b.creado));
      return desc ? -r : r;
    });
  }, [contactos, vinculos, empresas, q, filtro, empresaFiltro, rolFiltro, origenFiltro, orden, desc]);
  const cabecera = (k, etq, cls = '') => (
    <th className={`px-2 py-1 ${cls}`}>
      <button type="button" onClick={() => { if (orden === k) setDesc(!desc); else { setOrden(k); setDesc(false); } }}
        className={`inline-flex items-center gap-1 uppercase hover:text-[#EAF4F7] ${orden === k ? 'text-[#EAF4F7]' : ''}`} title="Ordenar">
        {etq}{orden === k ? <span className="text-brand-orange">{desc ? '▼' : '▲'}</span> : null}
      </button>
    </th>
  );

  // Enlace directo (?c=id, desde ofertas o empresas): se abre el popup de ese contacto.
  useEffect(() => {
    if (!sel || cargando) return;
    const c = contactos.find((x) => String(x.id) === String(sel));
    if (c) abrir(c);
  }, [sel, cargando]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPagina(1); }, [q, filtro, empresaFiltro, rolFiltro, origenFiltro, orden, desc, porPagina]);
  const totalPaginas = porPagina ? Math.max(1, Math.ceil(lista.length / porPagina)) : 1;
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = porPagina ? lista.slice((paginaActual - 1) * porPagina, paginaActual * porPagina) : lista;
  const cambiarTamano = (n) => { setPorPagina(n); try { localStorage.setItem('contactos_por_pagina', String(n)); } catch { /* sin almacenamiento */ } };
  const mensajeWA = (c) => `Hola ${c.nombre || ''}, soy ${perfil?.nombre || 'del equipo'} de TuConsultor.`;
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
        linkedin_url: form.linkedin_url?.trim() || null,
      };
      if (form.consentimiento_marketing && !form._teniaConsent) payload.consentimiento_fecha = new Date().toISOString();
      if (form.origen === 'ia-web') { payload.origen = 'ia-web'; payload.fuente_datos = form.fuente_datos?.trim() || null; payload.notas = form.notas || null; payload.revisado = true; }
      if (form._informado) payload.informado_art14_en = new Date().toISOString();

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
            <button onClick={sincronizarTodos} disabled={sync} className="btn-ghost !px-3 !py-1.5 text-xs disabled:opacity-40">
              {sync ? 'Enviando…' : '✉ Sincronizar todos'}
            </button>
            <button onClick={() => setBuscadorIA(true)} className="btn-ghost !px-3 !py-1.5 text-xs" title="Busca en LinkedIn y en la web la información profesional pública de una persona y la añade al CRM">✦ Buscar en LinkedIn</button>
            <button onClick={() => { setForm({ ...VACIO }); setParams({}); }} className="btn-orange !px-3 !py-1.5 text-xs">+ Nuevo contacto</button>
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
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: nombre, correo, teléfono, cargo, empresa, CIF, notas…" className="input max-w-sm !py-1.5 !text-[12.5px]" />
        <div className="flex flex-wrap overflow-hidden rounded-xl border border-[#1E5468] text-[11.5px] font-bold">
          {FILTROS.map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)}
              className={`px-2.5 py-1.5 ${filtro === k ? 'bg-brand-verde text-[#061F2B]' : 'text-[#9FC0CB] hover:text-[#EAF4F7]'}`}>
              {l}{k === 'huerfanos' && nHuerfanos > 0 ? ` (${nHuerfanos})` : ''}
            </button>
          ))}
        </div>
        <select value={empresaFiltro} onChange={(e) => setEmpresaFiltro(e.target.value)} className="input !w-auto max-w-[220px] !py-1.5 !text-[12px]" title="Empresa">
          <option value="">Empresa: todas</option>
          {[...empresas].sort((a, b) => nombreVisible(a).localeCompare(nombreVisible(b), 'es')).map((e) => <option key={e.id} value={String(e.id)}>{nombreVisible(e)}</option>)}
        </select>
        <select value={rolFiltro} onChange={(e) => setRolFiltro(e.target.value)} className="input !w-auto !py-1.5 !text-[12px]" title="Rol en su empresa">
          {ROLES_FILTRO.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select value={origenFiltro} onChange={(e) => setOrigenFiltro(e.target.value)} className="input !w-auto !py-1.5 !text-[12px]" title="De dónde salió la ficha">
          {ORIGENES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select value={`${orden}${desc ? ':d' : ''}`} onChange={(e) => { const [k, d] = e.target.value.split(':'); setOrden(k); setDesc(d === 'd'); }} className="input !w-auto !py-1.5 !text-[12px]" title="Orden">
          {ORDENES.flatMap(([k, l]) => [<option key={k} value={k}>{l} ▲</option>, <option key={`${k}:d`} value={`${k}:d`}>{l} ▼</option>])}
        </select>
        {(q || filtro !== 'todos' || empresaFiltro || rolFiltro || origenFiltro) && (
          <button type="button" onClick={() => { setQ(''); setFiltro('todos'); setEmpresaFiltro(''); setRolFiltro(''); setOrigenFiltro(''); }} className="text-[11.5px] font-bold text-[#7FA7B4] hover:text-[#EAF4F7]">limpiar</button>
        )}
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
        <>
        {/* Tabla estrecha y fija (v279ap): cada columna con su ancho máximo, texto
            de 12 px y filas bajas. En pantallas pequeñas se ocultan columnas y el
            dato pasa debajo del nombre; nunca desaparece. Pinchar en la persona
            abre su ficha en un popup. */}
        <div className="mx-auto w-full max-w-[1180px] overflow-hidden rounded-2xl border border-[#1E5468]">
          <table className="w-full table-fixed text-[12px]">
            <thead>
              <tr className="border-b border-[#1E5468] bg-[#0D3242] text-left text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-[#7FA7B4]">
                <th className="w-7 px-1.5 py-1">
                  <CasillaTodos marcado={lote.todosMarcados} onCambio={lote.alternarTodos} />
                </th>
                {cabecera('nombre', 'Nombre')}
                {cabecera('cargo', 'Cargo', 'hidden w-[130px] xl:table-cell')}
                {cabecera('email', 'Correo', 'hidden w-[200px] sm:table-cell')}
                <th className="w-[118px] px-2 py-1">Móvil</th>
                {cabecera('empresa', 'Empresa', 'hidden w-[170px] md:table-cell')}
                <th className="hidden w-[110px] px-2 py-1 2xl:table-cell">RGPD</th>
                <th className="w-9 px-2 py-1 text-right"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#153F52]">
              {visibles.map((c) => {
                const emps = empresasDe(c.id);
                const st = semaforoContacto(c, emps.length);
                const marcado = lote.marcados.has(String(c.id));
                const wa = c.movil ? linkWhatsApp(c.movil, mensajeWA(c)) : '';
                return (
                  <tr key={c.id} className={`${marcado ? 'bg-brand-orange/[0.07]' : ''} hover:bg-white/[0.035]`}>
                    <td className="px-1.5 py-0.5 align-middle">
                      <input type="checkbox" checked={marcado} onChange={() => lote.alternar(c.id)} aria-label={`Marcar ${c.nombre}`} />
                    </td>
                    <td className="px-2 py-0.5 align-middle">
                      <button onClick={() => abrir(c)} className="flex w-full min-w-0 items-center gap-1.5 text-left" title="Abrir la ficha">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${st.color === 'rojo' ? 'bg-red-500' : 'bg-emerald-400'}`} title={st.motivos.join(' · ') || 'Ficha completa'} />
                        <Avatar src={c.foto_url} inicial={(c.nombre || '?').charAt(0)} tamano={20} />
                        <span className="min-w-0">
                          <span className="block truncate font-bold leading-tight text-[#EAF4F7] hover:text-brand-orange">{c.nombre} {c.apellidos || ''}{c.revisado === false && <span className="ml-1.5 text-[9px] font-extrabold uppercase text-amber-200">sin revisar</span>}</span>
                          <span className="block truncate text-[10.5px] leading-tight text-[#7FA7B4] xl:hidden">{c.cargo || ''}</span>
                          <span className="block truncate text-[10.5px] leading-tight text-[#7FA7B4] sm:hidden">{emailValido(c.email) ? c.email : 'sin correo'}</span>
                          <span className="block truncate text-[10.5px] leading-tight text-[#7FA7B4] md:hidden">{emps.length ? emps.map((x) => nombreVisible(x.e)).join(' · ') : 'sin empresa'}</span>
                        </span>
                      </button>
                    </td>
                    <td className="hidden px-2 py-0.5 align-middle text-[#9FC0CB] xl:table-cell"><span className="block truncate" title={c.cargo || ''}>{c.cargo || <span className="text-[#5E8494]">—</span>}</span></td>
                    <td className="hidden px-2 py-0.5 align-middle text-[#9FC0CB] sm:table-cell">
                      {emailValido(c.email)
                        ? <a href={`mailto:${c.email}`} className="block truncate hover:text-brand-orange" title={c.email}>{c.email}</a>
                        : <span className="font-bold text-red-300">sin correo</span>}
                    </td>
                    <td className="whitespace-nowrap px-2 py-0.5 align-middle text-[#9FC0CB]">
                      {c.movil || c.telefono
                        ? <span className="inline-flex items-center gap-1.5">
                            <a href={`tel:${(c.movil || c.telefono).replace(/\s/g, '')}`} className="hover:text-brand-orange">{c.movil || c.telefono}</a>
                            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" title="Escribir por WhatsApp" aria-label="WhatsApp" className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#25D366]/15 text-[11px] text-[#5EE29A] hover:bg-[#25D366]/30">
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 12 12 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>
                            </a>}
                          </span>
                        : <span className="text-[#5E8494]">—</span>}
                    </td>
                    <td className="hidden px-2 py-0.5 align-middle text-[#B9D2DA] md:table-cell">
                      {emps.length
                        ? <span className="block truncate" title={emps.map((x) => nombreVisible(x.e)).join(' · ')}>{emps.map((x) => nombreVisible(x.e)).join(' · ')}</span>
                        : <span className="font-bold text-red-300">sin empresa</span>}
                    </td>
                    <td className="hidden px-2 py-0.5 align-middle 2xl:table-cell">
                      <span className="flex flex-wrap gap-1">
                        {c.rgpd_aceptado ? <span className="chip !px-1.5 !py-0 bg-emerald-500/15 text-[9px] text-emerald-300" title="Aceptó el tratamiento de datos">✓ RGPD</span> : <span className="chip !px-1.5 !py-0 bg-amber-400/15 text-[9px] text-amber-200">pendiente</span>}
                        {c.consentimiento_marketing && <span className="chip !px-1.5 !py-0 bg-emerald-500/15 text-[9px] text-emerald-300" title="Acepta comunicaciones">✓ com.</span>}
                        {c.brevo_sincronizado_en && <span className="chip !px-1.5 !py-0 bg-brand-verde/15 text-[9px] text-brand-verdeTexto">Brevo</span>}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-0.5 text-right align-middle">
                      <button onClick={() => abrir(c)} className="text-[11px] font-bold text-[#7FA7B4] hover:text-brand-orange" title={puedeEditar ? 'Editar' : 'Ver ficha'}>{puedeEditar ? '✎' : '👁'}</button>
                    </td>
                  </tr>
                );
              })}
              {!lista.length && (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-[#7FA7B4]">
                  {contactos.length === 0 ? 'Sin contactos todavía.' : 'Ninguno con ese filtro.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Paginación */}
        <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-2 text-[11.5px] text-[#7FA7B4]">
          <span className="inline-flex items-center gap-1">
            Ver
            {TAMANOS.map((n) => (
              <button key={n} type="button" onClick={() => cambiarTamano(n)} className={`rounded px-1.5 py-0.5 font-bold ${porPagina === n ? 'bg-brand-orange text-[#0A2B3A]' : 'hover:text-[#EAF4F7]'}`}>{n || 'todos'}</button>
            ))}
            <span className="ml-2">{lista.length ? `${porPagina ? (paginaActual - 1) * porPagina + 1 : 1}–${porPagina ? Math.min(paginaActual * porPagina, lista.length) : lista.length} de ${lista.length}` : '0'}</span>
          </span>
          {totalPaginas > 1 && (
            <span className="inline-flex items-center gap-1">
              <button type="button" onClick={() => setPagina(Math.max(1, paginaActual - 1))} disabled={paginaActual === 1} className="rounded px-1.5 py-0.5 font-bold hover:text-[#EAF4F7] disabled:opacity-30">‹</button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).filter((n) => n === 1 || n === totalPaginas || Math.abs(n - paginaActual) <= 2).reduce((acc, n, i, arr) => { if (i && n - arr[i - 1] > 1) acc.push('…'); acc.push(n); return acc; }, []).map((n, i) => (
                n === '…' ? <span key={`e${i}`} className="px-1">…</span>
                : <button key={n} type="button" onClick={() => setPagina(n)} className={`rounded px-1.5 py-0.5 font-bold ${n === paginaActual ? 'bg-white/10 text-[#EAF4F7]' : 'hover:text-[#EAF4F7]'}`}>{n}</button>
              ))}
              <button type="button" onClick={() => setPagina(Math.min(totalPaginas, paginaActual + 1))} disabled={paginaActual === totalPaginas} className="rounded px-1.5 py-0.5 font-bold hover:text-[#EAF4F7] disabled:opacity-30">›</button>
            </span>
          )}
        </div>
        </>
      )}

      {/* Alta y edición en diálogo: encima de la lista, sin empujar la tabla
          hacia abajo ni obligar a buscar dónde ha aparecido el formulario. */}
      {form && (
        <DialogoFicha
          titulo={form.id ? (puedeEditar ? 'Contacto' : 'Ficha del contacto') : 'Nuevo contacto'}
          subtitulo={form.id ? `${form.nombre} ${form.apellidos || ''}`.trim() : form.origen === 'ia-web' ? 'Propuesto por la búsqueda con IA: revisa los datos antes de guardar' : 'Todo contacto necesita empresa y correo'}
          onCerrar={() => { setForm(null); if (sel) setParams({}); }}
          haycambios
          ancho="800px"
          pie={<>
            <button onClick={() => { setForm(null); if (sel) setParams({}); }} className="btn-ghost !px-4 !py-1.5 text-[13px]">{puedeEditar ? 'Cancelar' : 'Cerrar'}</button>
            {puedeEditar && <button onClick={guardar} className="btn-orange !px-4 !py-1.5 text-[13px]">Guardar</button>}
          </>}
        >
          {form.id && (() => {
            const c = contactos.find((x) => String(x.id) === String(form.id)) || form;
            return (
              <div className="mb-3 border-b border-[#1E5468] pb-3">
                <FichaContacto
                  contacto={c} empresas={empresasDe(c.id)} puedeEditar={puedeEditar} puedeBorrar={puedeBorrar} sync={sync}
                  onBorrar={() => { setForm(null); borrar(c); }}
                  onBrevo={() => sincronizarBrevo(c)}
                  onEmpresa={(e) => { setForm(null); navigate({ pathname: '../empresas', search: `?e=${e.id}` }); }}
                  onRecargar={cargar}
                  whatsapp={c.movil ? linkWhatsApp(c.movil, mensajeWA(c)) : ''}
                />
              </div>
            );
          })()}
          {puedeEditar ? <FormContacto form={form} setForm={setForm} empresas={empresas} /> : null}
        </DialogoFicha>
      )}

      {buscadorIA && (
        <BuscadorContactoIA
          empresas={empresas}
          onCerrar={() => setBuscadorIA(false)}
          onAnadir={(p) => { setBuscadorIA(false); setForm({ ...VACIO, ...p, _empresa_id: p._empresa_id || '', _rol: p._rol || 'secundario', origen: 'ia-web' }); }}
        />
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// Ficha desplegada bajo la fila del contacto
// ════════════════════════════════════════════════════════════════════════════
function FichaContacto({ contacto, empresas, puedeEditar, puedeBorrar, sync, onBorrar, onBrevo, onEmpresa, onRecargar, whatsapp = '' }) {
  const s = semaforoContacto(contacto, empresas.length);
  const puedeBrevo = emailValido(contacto.email) && contacto.consentimiento_marketing;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3 text-[12.5px]">
          <ImagenSubible tabla="contactos" id={contacto.id} campo="foto_url" valor={contacto.foto_url} tamano={56}
            inicial={(contacto.nombre || '?').charAt(0)} editable={!!puedeEditar} titulo="Foto del contacto" onCambio={() => onRecargar?.()} />
          <div className="min-w-0">
          <p className="font-extrabold text-[#EAF4F7]">
            {contacto.nombre} {contacto.apellidos || ''}
            {contacto.cargo && <span className="ml-2 font-semibold text-[#9FC0CB]">{contacto.cargo}</span>}
          </p>
          <p className="mt-0.5 text-[#7FA7B4]">
            {emailValido(contacto.email) ? <a href={`mailto:${contacto.email}`} className="hover:text-brand-orange">{contacto.email}</a> : <span className="font-bold text-red-300">sin email válido</span>}
            {contacto.movil ? <> · móvil <a href={`tel:${contacto.movil.replace(/\s/g, '')}`} className="hover:text-brand-orange">{contacto.movil}</a></> : ''}
            {contacto.telefono ? ` · tel. ${contacto.telefono}` : ''}
            {whatsapp && <> · <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="font-bold text-[#5EE29A] hover:underline">WhatsApp</a></>}
            {contacto.linkedin_url && <> · <a href={contacto.linkedin_url} target="_blank" rel="noopener noreferrer" className="font-bold text-[#9FC0CB] hover:text-[#EAF4F7]">LinkedIn</a></>}
          </p>
          {contacto.origen === 'ia-web' && (
            <p className="mt-1 text-[11px] text-amber-200">Datos obtenidos de fuentes públicas (LinkedIn/web){contacto.fuente_datos ? `: ${contacto.fuente_datos}` : ''}. {contacto.informado_art14_en ? `Informado el ${new Date(contacto.informado_art14_en).toLocaleDateString('es-ES')}.` : 'Pendiente de informarle (art. 14 RGPD, en el primer contacto o antes de un mes).'}</p>
          )}
          <div className="mt-1.5">
            <ConsentimientoRgpd contacto={contacto} puedeEditar={!!puedeEditar} onCambio={onRecargar} compacto />
            {contacto.brevo_sincronizado_en && <span className="chip mt-1 !py-0 bg-brand-verde/15 text-[10px] text-brand-verdeTexto">En Brevo</span>}
          </div>
          {/* Hasta cinco perfiles de LinkedIn por afinidad; se asocia el que sea a mano (v140). */}
          <AsociarLinkedIn contacto={contacto} empresa={empresas[0] ? nombreVisible(empresas[0].e) : ''} puedeEditar={!!puedeEditar} onCambio={onRecargar} />
          </div>
        </div>
        {puedeEditar && (
          <div className="flex shrink-0 flex-wrap gap-1.5">
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
        <div className="campo"><label className="label" htmlFor="ct-linkedin">LinkedIn</label>
          <input id="ct-linkedin" type="url" className="input" placeholder="https://www.linkedin.com/in/…" value={form.linkedin_url || ''} onChange={set('linkedin_url')} /></div>
        {form.origen === 'ia-web' && (
          <div className="campo"><label className="label">Fuente de los datos</label>
            <input className="input" value={form.fuente_datos || ''} onChange={set('fuente_datos')} />
            <p className="campo-nota">Obtenidos de fuentes públicas: hay que informar a la persona (art. 14 RGPD) en el primer contacto o antes de un mes.</p></div>
        )}
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

      {form.origen === 'ia-web' && !form.informado_art14_en && (
        <label className="flex items-start gap-2 rounded-xl bg-amber-400/10 p-2.5 text-[12.5px] font-semibold text-amber-100">
          <input type="checkbox" className="mt-0.5" checked={!!form._informado} onChange={(e) => setForm({ ...form, _informado: e.target.checked })} />
          <span>Ya le he informado de que tenemos sus datos y de dónde salen (art. 14 RGPD).</span>
        </label>
      )}
      <label className="flex items-start gap-2 rounded-xl bg-white/5 p-2.5 text-[12.5px] font-semibold text-[#9FC0CB]">
        <input type="checkbox" className="mt-0.5" checked={!!form.consentimiento_marketing}
          onChange={(e) => setForm({ ...form, consentimiento_marketing: e.target.checked, _teniaConsent: form.consentimiento_marketing })} />
        <span>Ha dado su <strong className="text-[#EAF4F7]">consentimiento</strong> para comunicaciones comerciales (RGPD). Necesario para Brevo.</span>
      </label>
    </div>
  );
}
