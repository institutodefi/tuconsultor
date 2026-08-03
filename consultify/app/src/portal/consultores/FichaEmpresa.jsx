import { useState, useMemo, useEffect, useRef } from 'react';
import { insertRow, updateRow, deleteRow, holdedFn, brevoFn } from '../../lib/data.js';
import {
  validarCif, normalizarCif, emailValido, semaforoEmpresa,
  candidatasMatriz, ESTADOS_COMERCIALES,
} from '../../lib/crm.js';
import OrganigramaGrupo from '../../components/OrganigramaGrupo.jsx';
import ContactosEmpresa from './ContactosEmpresa.jsx';
import HomologacionProveedor from './HomologacionProveedor.jsx';
import HomologacionNormas from './HomologacionNormas.jsx';
import { diagnosticarCrm } from '../../lib/diagnosticoCrm.js';
import ContactosAlta from './ContactosAlta.jsx';

// ════════════════════════════════════════════════════════════════════════════
// Ficha de empresa (una sola entidad para cliente / proveedor / potencial).
//
//  · El CIF es el DATO CLAVE: obligatorio, validado y único. Es la llave con
//    la que se cruza con Holded, así que no se admite empresa sin él.
//  · Cliente y Proveedor son interruptores independientes: pueden ir los dos.
//  · Los contactos por rol se ven SIEMPRE y abiertos: es lo que se consulta.
//  · Todo lo demás va en cajas plegables para que la ficha entre de una pantalla.
// ════════════════════════════════════════════════════════════════════════════

// [clave, etiqueta, obligatorio, columnas que ocupa]
const CAMPOS_FISCALES = [
  ['nombre',           'Nombre / razón social', true,  2],
  ['nombre_comercial', 'Nombre comercial',      false, 1],
  ['direccion',        'Dirección',             false, 2],
  ['cp',               'C. postal',             false, 1],
  ['poblacion',        'Población',             false, 1],
  ['provincia',        'Provincia',             false, 1],
  ['pais',             'País',                  false, 1],
  ['email',            'Email',                 false, 1],
  ['telefono',         'Teléfono',              false, 1],
  ['movil',            'Móvil',                 false, 1],
  ['web',              'Website',               false, 1],
  ['vat_id',           'Identificación VAT',    false, 1],
];

const SEM = {
  rojo:  { clase: 'bg-red-500',      chip: 'bg-red-500/15 text-red-300',           texto: 'Incompleta' },
  ambar: { clase: 'bg-brand-orange', chip: 'bg-brand-orange/15 text-brand-orange', texto: 'Revisar' },
  verde: { clase: 'bg-emerald-400',  chip: 'bg-emerald-500/15 text-emerald-300',   texto: 'Completa' },
};

// ── Caja plegable compacta ──────────────────────────────────────────────────
function Caja({ titulo, resumen, insignia, abiertaPorDefecto = false, children }) {
  const [abierta, setAbierta] = useState(abiertaPorDefecto);
  return (
    <section className="overflow-hidden rounded-xl border border-[#1E5468] bg-[#10394A]">
      <button onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-[#12455A]">
        <span className={`shrink-0 text-[9px] text-[#7FA7B4] transition-transform ${abierta ? 'rotate-90' : ''}`}>▶</span>
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#9FC0CB]">{titulo}</span>
        {insignia}
        {!abierta && resumen && <span className="ml-auto truncate pl-2 text-[11px] text-[#7FA7B4]">{resumen}</span>}
      </button>
      {abierta && <div className="border-t border-[#1E5468] p-3">{children}</div>}
    </section>
  );
}

function Campo({ label, obligatorio, valor, onCambio, ancho = 1, tono }) {
  return (
    <label className={`block ${ancho === 2 ? 'sm:col-span-2' : ''}`}>
      <span className="mb-0.5 block text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">
        {label}{obligatorio && <span className="text-brand-orange">*</span>}
      </span>
      <input className={`input !py-1.5 !px-2.5 !text-[13px] ${tono || ''}`}
        value={valor || ''} onChange={(e) => onCambio(e.target.value)} />
    </label>
  );
}

export default function FichaEmpresa({
  empresa, empresas, contactos, vinculos,
  puedeEditar, puedeBorrar, onCambio, onSeleccionar, onCerrar, onAbrirContacto,
}) {
  const esNueva = !empresa?.id;
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const [holded, setHolded] = useState({ estado: 'inactivo' });
  const [diag, setDiag] = useState(null);
  const [brevoOcupado, setBrevoOcupado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const cajaAviso = useRef(null);          // para llevar el foco al error
  const [diagAuto, setDiagAuto] = useState(null);  // diagnóstico lanzado al fallar
  const [contactosNuevos, setContactosNuevos] = useState([]);   // contactos apuntados durante el alta

  // Empresa NUEVA: llega `{}` sin id, así que hay que abrir el formulario sola.
  // Sin esto la pantalla se quedaba en modo lectura de una empresa vacía: no
  // había nada que rellenar y por eso no se podían crear a mano.
  useEffect(() => {
    if (empresa && !empresa.id && form === null) {
      setForm({ es_cliente: true, es_proveedor: false, estado_comercial: 'potencial', pais: 'España' });
    }
  }, [empresa, form]);

  // Un fallo al guardar no puede quedarse en un mensajito que se pierde: se
  // lleva la vista al aviso y se anuncia a los lectores de pantalla.
  function fallar(texto, extra = {}) {
    setMsg({ err: true, t: texto, ...extra });
    setTimeout(() => {
      cajaAviso.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cajaAviso.current?.focus?.();
    }, 50);
  }

  // ── Comprobar en VIES ──
  // La validación local dice si el número está bien FORMADO. VIES dice si está
  // OPERATIVO, que es lo que hace falta antes de facturar sin IVA.
  const [vies, setVies] = useState(null);
  async function comprobarVies() {
    const id = normalizarCif(vista.vat_id || vista.cif);
    if (!id) { setVies({ estado: 'error', motivo: 'Escribe primero el identificador.' }); return; }
    setVies({ estado: 'consultando' });
    try {
      const r = await fetch('/api/validar-vies', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificador: id }),
      });
      const j = await r.json();
      setVies({ estado: 'hecho', ...j });
    } catch (e) {
      setVies({ estado: 'hecho', comprobado: false, motivo: `No se pudo consultar: ${e?.message || e}` });
    }
  }

  async function probarHolded() {
    setDiag({ cargando: true });
    try { setDiag(await holdedFn({ action: 'diagnostico' })); }
    catch (e) { setDiag({ ok: false, conclusion: `No se pudo contactar con la función: ${e?.message || e}` }); }
  }

  const recienGuardada = useRef(false);
  useEffect(() => {
    setForm(esNueva ? { pais: 'España', es_cliente: true, es_proveedor: false, estado_comercial: 'potencial', ...empresa } : null);
    if (recienGuardada.current) recienGuardada.current = false;
    else setMsg(null);
    setHolded({ estado: 'inactivo' });
  }, [empresa?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const mios = useMemo(() => vinculos
    .filter((v) => String(v.empresa_id) === String(empresa?.id))
    .map((v) => ({ vinc: v, c: contactos.find((c) => String(c.id) === String(v.contacto_id)) }))
    .filter((x) => x.c), [vinculos, contactos, empresa?.id]);

  // Personas DISTINTAS, no vínculos. Desde la v69 una persona puede ocupar
  // varios roles en la misma empresa, así que contar vínculos decía «3
  // contactos» cuando hay uno con tres cargos.
  const cuantasPersonas = useMemo(
    () => new Set(mios.map((x) => String(x.c.id))).size, [mios]);

  const semaforo = useMemo(
    () => semaforoEmpresa(empresa, mios.map((x) => x.vinc), mios.map((x) => x.c)),
    [empresa, mios],
  );

  const vista = form || empresa || {};
  const cif = validarCif(vista.cif);
  const matrices = useMemo(() => candidatasMatriz(empresas, empresa?.id), [empresas, empresa?.id]);
  const matriz = empresa?.empresa_matriz_id
    ? empresas.find((e) => String(e.id) === String(empresa.empresa_matriz_id))
    : null;

  // El CIF es clave: no puede repetirse en otra empresa.
  const duplicada = useMemo(() => {
    const v = normalizarCif(vista.cif);
    if (!v) return null;
    return empresas.find((e) => normalizarCif(e.cif) === v && String(e.id) !== String(vista.id)) || null;
  }, [empresas, vista.cif, vista.id]);

  async function traerDeHolded(cifBuscado) {
    const v = normalizarCif(cifBuscado ?? vista.cif);
    if (!v) { setMsg({ err: true, t: 'Escribe primero el CIF.' }); return; }
    setHolded({ estado: 'buscando' });
    const r = await holdedFn({ action: 'buscar_empresa', cif: v, nombre: vista.nombre });
    if (!r?.ok) { setHolded({ estado: 'error', error: r?.error || 'error' }); return; }
    if (!r.encontrado) {
      // Sin coincidencia de CIF pero sí de nombre: se ofrece, no se aplica.
      // Dar por buena una empresa con otro CIF sería mezclar dos fichas.
      if (r.porNombre) {
        setHolded({ estado: 'candidato', candidato: r, holded_id: r.holded_id });
        return;
      }
      setHolded({ estado: 'no' });
      return;
    }

    const d = r.empresa || {};
    const CAMPOS = ['nombre', 'nombre_comercial', 'email', 'telefono', 'movil', 'web',
                    'direccion', 'poblacion', 'cp', 'provincia', 'pais', 'vat_id', 'notas'];

    // Antes esto solo rellenaba huecos: en una empresa que YA tenía datos no
    // cambiaba nada, el formulario quedaba igual y guardar no hacía nada
    // visible. Ahora se separan los huecos de las DIFERENCIAS, se rellenan los
    // primeros y se preguntan las segundas: sobrescribir sin avisar sería peor.
    const actual = form || vista;
    const huecos = [];
    const diferencias = [];
    for (const k of CAMPOS) {
      const nuevo = d[k];
      if (!nuevo) continue;
      const tenia = String(actual[k] || '').trim();
      if (!tenia) huecos.push(k);
      else if (tenia !== String(nuevo).trim()) diferencias.push({ campo: k, aqui: tenia, alli: String(nuevo).trim() });
    }

    setForm((f) => {
      const base = { ...(f || vista) };
      for (const k of huecos) base[k] = d[k];
      base.cif = d.cif || v;
      if (d.es_cliente) base.es_cliente = true;
      if (d.es_proveedor) base.es_proveedor = true;
      base.holded_id = r.holded_id || base.holded_id;
      base._holded_crudo = r.crudo || null;
      base._holded_contactos = d.contactos || [];
      return base;
    });
    setHolded({ estado: 'encontrado', personas: d.contactos || [], holded_id: r.holded_id,
                huecos: huecos.length, diferencias, deHolded: d });
  }

  /** Aceptar el candidato encontrado por nombre, cuando el CIF no coincidía. */
  function usarCandidato() {
    const r = holded.candidato;
    if (!r) return;
    const d = r.empresa || {};
    setForm((f) => {
      const base = { ...(f || vista) };
      for (const k of ['nombre', 'nombre_comercial', 'email', 'telefono', 'movil', 'web',
                       'direccion', 'poblacion', 'cp', 'provincia', 'pais', 'vat_id']) {
        if (d[k] && !String(base[k] || '').trim()) base[k] = d[k];
      }
      base.holded_id = r.holded_id || base.holded_id;
      base._holded_crudo = r.crudo || null;
      base._holded_contactos = d.contactos || [];
      return base;
    });
    setHolded({ estado: 'encontrado', personas: d.contactos || [], holded_id: r.holded_id,
                diferencias: [], deHolded: d });
  }

  /** Traer de Holded un campo concreto, cuando difiere de lo que hay aquí. */
  function aceptarDeHolded(campo) {
    setForm((f) => ({ ...(f || vista), [campo]: holded.deHolded?.[campo] }));
    setHolded((h) => ({ ...h, diferencias: (h.diferencias || []).filter((x) => x.campo !== campo) }));
  }

  function aceptarTodoDeHolded() {
    setForm((f) => {
      const base = { ...(f || vista) };
      for (const x of (holded.diferencias || [])) base[x.campo] = x.alli;
      return base;
    });
    setHolded((h) => ({ ...h, diferencias: [] }));
  }

  const [rastro, setRastro] = useState(null);

  async function guardar() {
    const pasos = [];
    const anota = (t, ok = true, extra) => {
      pasos.push({ t, ok, extra });
      setRastro([...pasos]);
    };
    anota(`Pulsado. Empresa ${form?.id ? `existente ${String(form.id).slice(0, 8)}` : 'NUEVA'}`);
    // El CIF va primero: es la llave de la ficha y de la sincronización con Holded.
    const cifNorm = normalizarCif(form.cif);
    anota(`CIF normalizado: «${cifNorm || '(vacío)'}»`, !!cifNorm);
    if (!cifNorm) { fallar('El CIF es obligatorio: es el dato con el que se identifica la empresa y se cruza con Holded.'); return; }
    // El motivo, literal. «No es válido» sin decir por qué obliga a adivinar, y
    // con un CIF traído de Holded el problema suele ser el formato, no el dato.
    const chequeo = validarCif(cifNorm);
    anota(`Validación del CIF: ${chequeo.valido ? 'correcto' : chequeo.mensaje || 'no válido'}`, !!chequeo.valido);
    if (!chequeo.valido) {
      fallar(`El CIF «${cifNorm}» no es válido${chequeo.mensaje ? `: ${chequeo.mensaje}` : '. Revisa la letra de control.'}`);
      return;
    }
    anota(duplicada ? `CIF duplicado con «${duplicada.nombre}»` : 'CIF no duplicado', !duplicada);
    if (duplicada) { fallar(`Ese CIF ya está en «${duplicada.nombre}».`, { irA: duplicada.id }); return; }
    anota(`Nombre: «${(form.nombre || '').slice(0, 40) || '(vacío)'}»`, !!form.nombre?.trim());
    if (!form.nombre?.trim()) { fallar('Falta el nombre o razón social.'); return; }
    anota(`Correo: ${form.email ? (emailValido(form.email) ? 'válido' : 'NO válido') : 'sin correo'}`,
          !form.email || emailValido(form.email));
    if (form.email && !emailValido(form.email)) { fallar('El email de la empresa no es válido.'); return; }

    const payload = {
      nombre: form.nombre.trim(),
      nombre_comercial: form.nombre_comercial?.trim() || null,
      cif: cifNorm,
      vat_id: form.vat_id?.trim() || null,
      es_cliente: !!form.es_cliente,
      es_proveedor: !!form.es_proveedor,
      estado_comercial: form.estado_comercial || 'potencial',
      direccion: form.direccion?.trim() || null,
      poblacion: form.poblacion?.trim() || null,
      cp: form.cp?.trim() || null,
      provincia: form.provincia?.trim() || null,
      pais: form.pais?.trim() || 'España',
      email: form.email?.trim() || null,
      telefono: form.telefono?.trim() || null,
      movil: form.movil?.trim() || null,
      web: form.web?.trim() || null,
      notas: form.notas?.trim() || null,
      empresa_matriz_id: form.es_cliente ? (form.empresa_matriz_id || null) : null,
      holded_id: form.holded_id || null,
      holded_datos: form._holded_crudo || form.holded_datos || null,
      holded_sincronizado_en: form._holded_crudo ? new Date().toISOString() : (form.holded_sincronizado_en || null),
      updated_at: new Date().toISOString(),
    };

    setGuardando(true);
    try {
      let id = form.id;
      anota(`Enviando ${id ? 'UPDATE' : 'INSERT'} con ${Object.keys(payload).length} campos…`);
      if (id) await updateRow('empresas', id, payload);
      else id = (await insertRow('empresas', payload))?.id;
      anota(`Guardado en la base ✓ (id ${String(id).slice(0, 8)})`);

      // Contactos apuntados durante el alta: se crean ahora, con la empresa ya
      // existente. Si uno falla, se anota y se sigue: no se pierde la empresa
      // ni el resto de contactos por un correo repetido.
      let altas = 0; const fallidos = [];
      if (id && contactosNuevos.length) {
        for (const c of contactosNuevos) {
          try {
            let contactoId = contactos.find((x) => (x.email || '').toLowerCase() === c.email)?.id;
            if (!contactoId) {
              contactoId = (await insertRow('contactos', {
                nombre: c.nombre, apellidos: c.apellidos || null,
                email: c.email, movil: c.movil || null,
              }))?.id;
            }
            if (contactoId) {
              await insertRow('empresa_contactos', {
                empresa_id: id, contacto_id: contactoId, rol: c.rol,
                principal: c.rol === 'directivo',
              });
              altas++;
            }
          } catch (e) {
            fallidos.push(`${c.email}: ${e?.message || e}`);
          }
        }
        setContactosNuevos([]);
      }

      // Personas de contacto traídas de Holded: se crean y vinculan si el email es válido.
      let importados = 0, saltados = 0;
      const personas = form._holded_contactos || [];
      if (id && personas.length) {
        for (let i = 0; i < personas.length; i++) {
          const p = personas[i];
          if (!emailValido(p.email)) { saltados++; continue; }
          const ya = contactos.find((c) => (c.email || '').trim().toLowerCase() === p.email.trim().toLowerCase());
          let contactoId = ya?.id;
          if (!contactoId) {
            contactoId = (await insertRow('contactos', {
              nombre: p.nombre || p.email, cargo: p.cargo || null,
              email: p.email.trim(), telefono: p.telefono || null,
              consentimiento_marketing: false,
            }))?.id;
          }
          if (!contactoId) { saltados++; continue; }
          try {
            await insertRow('empresa_contactos', {
              empresa_id: id, contacto_id: contactoId,
              rol: i === 0 ? 'directivo' : 'secundario',
              principal: i === 0, cargo: p.cargo || null,
            });
            importados++;
          } catch { saltados++; }
        }
      }

      recienGuardada.current = true;
      setForm(null);
      const extra = importados ? ` · ${importados} contacto(s) importados de Holded` : '';
      const aviso = saltados ? ` · ${saltados} sin email válido, no importados` : '';
      setMsg({ t: `Empresa guardada.${altas ? ` ${altas} contacto${altas === 1 ? '' : 's'} creado${altas === 1 ? '' : 's'}.` : ' Asígnale ahora sus contactos.'}${fallidos.length ? ` No se pudo con: ${fallidos.join(' · ')}` : ''}` });
      if (onCambio) await onCambio(id);
      if (!form.id && id) onSeleccionar && onSeleccionar(id);
    } catch (e) {
      // El motivo real de la base de datos, sin adornos. Y como un mensaje suelto
      // no ha bastado las veces anteriores, se lanza además el diagnóstico: así
      // el motivo y la causa aparecen juntos sin tener que ir a buscarlos.
      const m = e?.message || e?.details || e?.hint || String(e);
      const cod = e?.code ? ` [${e.code}]` : '';
      setRastro((r) => [...(r || []), { t: `ERROR${cod}: ${m}`, ok: false }]);
      fallar(`No se pudo guardar${cod}: ${m}`);
      setDiagAuto({ cargando: true });
      diagnosticarCrm()
        .then((d) => setDiagAuto(d))
        .catch((x) => setDiagAuto({ conclusion: `El diagnóstico también falló: ${x?.message || x}` }));
    } finally { setGuardando(false); }
  }

  async function borrar() {
    if (!window.confirm(`¿Eliminar «${empresa.nombre}»?\n\nSus contactos NO se borran, quedan sin empresa (semáforo rojo). Si es matriz de otras, sus filiales quedan sueltas.`)) return;
    try { await deleteRow('empresas', empresa.id); onCerrar && onCerrar(); onCambio && onCambio(); }
    catch { setMsg({ err: true, t: 'No se pudo eliminar.' }); }
  }

  async function enviarABrevo() {
    const elegibles = mios.filter((x) => emailValido(x.c.email) && x.c.consentimiento_marketing);
    const sinConsent = mios.filter((x) => emailValido(x.c.email) && !x.c.consentimiento_marketing).length;
    if (!elegibles.length) {
      setMsg({ err: true, t: `Ningún contacto con email y consentimiento RGPD${sinConsent ? ` (${sinConsent} sin consentimiento)` : ''}.` });
      return;
    }
    setBrevoOcupado(true);
    let ok = 0, err = 0;
    const tipo = empresa.es_cliente && empresa.estado_comercial === 'potencial' ? 'Potencial'
               : empresa.es_cliente ? 'Cliente' : 'Proveedor';
    for (const x of elegibles) {
      try {
        const r = await brevoFn({ action: 'sincronizar_cliente', cliente: {
          email: x.c.email, contacto: x.c.nombre, contacto_apellidos: x.c.apellidos,
          empresa: empresa.nombre, cif: empresa.cif || '', telefono: x.c.telefono || empresa.telefono || '',
          cargo: x.c.cargo || '', web: empresa.web || '', tipo,
        } });
        if (r?.ok) { ok++; await updateRow('contactos', x.c.id, { brevo_sincronizado_en: new Date().toISOString() }); }
        else err++;
      } catch { err++; }
    }
    if (ok) await updateRow('empresas', empresa.id, { brevo_sincronizado_en: new Date().toISOString() }).catch(() => {});
    setMsg({
      err: ok === 0,
      t: `Brevo: ${ok} contacto(s) enviados${err ? ` · ${err} con error` : ''}${sinConsent ? ` · ${sinConsent} omitidos sin consentimiento` : ''}.`,
    });
    setBrevoOcupado(false); onCambio && onCambio();
  }

  const aviso = msg ? (
    <div ref={cajaAviso} tabIndex={-1} role={msg.err ? 'alert' : 'status'}
      className={`sticky top-0 z-20 rounded-lg px-3 py-2.5 text-[12.5px] font-bold shadow-lg outline-none ${msg.err ? 'bg-[#3B1518] text-red-200 ring-1 ring-red-500/60' : 'bg-[#123A2C] text-emerald-200 ring-1 ring-emerald-500/40'}`}>
      <button onClick={() => setMsg(null)} className="float-right pl-2 text-[#7FA7B4] hover:text-white">×</button>
      {msg.t}
      {msg.irA && (
        <button onClick={() => { setMsg(null); onSeleccionar && onSeleccionar(msg.irA); }}
          className="ml-2 underline hover:text-white">abrir esa ficha</button>
      )}
      {diagAuto && (
        <div className="mt-2 space-y-1 rounded-lg bg-[#0D3242] p-2.5 text-[11.5px] font-medium text-[#B9D2DA]">
          {diagAuto.cargando ? <p>Comprobando la base de datos…</p> : (
            <>
              <p className="font-bold text-[#EAF4F7]">{diagAuto.conclusion}</p>
              {diagAuto.perfil?.fila && (
                <p>Tu perfil: rol <b className="text-[#EAF4F7]">{diagAuto.perfil.fila.rol}</b>, activo{' '}
                  <b className={diagAuto.perfil.fila.activo === true ? 'text-emerald-300' : 'text-red-300'}>
                    {String(diagAuto.perfil.fila.activo)}</b></p>
              )}
              {Object.entries(diagAuto.tablas || {}).map(([t, x]) => (
                <p key={t}><b className="text-[#EAF4F7]">{t}</b>: escritura{' '}
                  <span className={x.escritura?.ok ? 'text-emerald-300' : 'text-red-300'}>
                    {x.escritura?.ok ? 'ok' : `${x.escritura?.code || ''} ${x.escritura?.message || 'no'}`}</span>
                  {x.columnasAusentes?.length > 0 && <> · faltan: <code className="text-red-300">{x.columnasAusentes.join(', ')}</code></>}
                </p>
              ))}
              {(diagAuto.problemas || []).map((pr, i) => <p key={i} className="text-red-300">· {pr}</p>)}
            </>
          )}
        </div>
      )}
    </div>
  ) : null;

  const resumenDireccion = [vista.direccion, [vista.cp, vista.poblacion].filter(Boolean).join(' '), vista.provincia]
    .filter(Boolean).join(', ');

  // ══════════════════ EDICIÓN ══════════════════
  if (form) {
    return (
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-extrabold text-[#EAF4F7]">{form.id ? 'Editar empresa' : 'Nueva empresa'}</h3>
          <button onClick={() => (form.id ? setForm(null) : onCerrar && onCerrar())}
            className="text-[11px] font-bold text-[#7FA7B4] hover:text-[#EAF4F7]">
            {form.id ? 'Cancelar' : '← Volver al listado'}
          </button>
        </div>

        {aviso}

        {/* CIF · dato clave, siempre a la vista */}
        <div className="rounded-xl border border-[#1E5468] bg-[#10394A] p-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[180px] flex-1">
              <span className="mb-0.5 block text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">
                NIF / CIF <span className="text-brand-orange">*</span>
                <span className="ml-1 font-bold normal-case tracking-normal text-[#5E8A99]">— dato clave, único</span>
              </span>
              <input
                className={`input !py-1.5 !px-2.5 !text-[13px] font-bold ${
                  duplicada || cif.valido === false ? '!border-red-500/60' : cif.valido ? '!border-emerald-500/50' : ''}`}
                value={form.cif || ''} placeholder="B12345678"
                onChange={(e) => { setForm({ ...form, cif: e.target.value.toUpperCase() }); setHolded({ estado: 'inactivo' }); }}
                onBlur={(e) => { const v = validarCif(e.target.value); if (v.valido && !duplicada && holded.estado === 'inactivo') traerDeHolded(e.target.value); }}
              />
            </label>
            <button onClick={() => traerDeHolded()} disabled={holded.estado === 'buscando'}
              className="btn-ghost !px-3 !py-1.5 text-[11px] disabled:opacity-40">
              {holded.estado === 'buscando' ? 'Buscando…' : '⇩ Holded'}
            </button>
          </div>

          <div className="mt-1.5 space-y-1 text-[11.5px] font-bold">
            {duplicada && (
              <p className="text-red-300">
                ⚠ Ya existe con este CIF: «{duplicada.nombre}».
                <button onClick={() => onSeleccionar && onSeleccionar(duplicada.id)} className="ml-1 underline">abrir</button>
              </p>
            )}
            {/* VIES: comprobar que el número existe, no solo que esté bien escrito */}
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <button type="button" onClick={comprobarVies} disabled={vies?.estado === 'consultando'}
                className="btn-ghost !px-2.5 !py-1 text-[11px] disabled:opacity-50">
                {vies?.estado === 'consultando' ? 'Consultando VIES…' : 'Comprobar en VIES'}
              </button>
              {vies?.estado === 'hecho' && (
                <span className={`text-[11.5px] font-bold ${
                  vies.valido === true ? 'text-emerald-300'
                    : vies.valido === false ? 'text-red-300' : 'text-[#9FC0CB]'}`}>
                  {vies.valido === true ? '✓' : vies.valido === false ? '⚠' : 'ℹ'} {vies.motivo}
                  {vies.nombre && <span className="ml-1 font-normal text-[#9FC0CB]">· {vies.nombre}</span>}
                </span>
              )}
            </div>
            {vies?.estado === 'hecho' && vies.nombre && vies.nombre !== vista.nombre && (
              <button type="button" onClick={() => setForm((f) => ({ ...(f || vista), nombre: vies.nombre }))}
                className="mt-1 text-[11px] font-bold text-brand-orange hover:underline">
                Usar «{vies.nombre}» como razón social
              </button>
            )}

            {!duplicada && cif.mensaje && (
              <p className={cif.valido ? 'text-emerald-300' : 'text-red-300'}>{cif.valido ? '✓' : '⚠'} {cif.mensaje}</p>
            )}
            {holded.estado === 'candidato' && (
              <div className="mt-2 rounded-xl border border-brand-orange/40 bg-brand-orange/8 p-3">
                <p className="text-[12.5px] font-extrabold text-brand-orange">
                  En Holded no hay nadie con ese CIF, pero sí con un nombre parecido
                </p>
                <p className="mt-1 text-[12.5px] text-[#EAF4F7]">{holded.candidato?.nombre_holded}</p>
                <p className="text-[11.5px] text-[#9FC0CB]">
                  CIF en Holded: <b className="text-brand-orange">{holded.candidato?.cif_holded || 'sin CIF'}</b>
                  {' · '}aquí: <b>{normalizarCif(vista.cif)}</b>
                </p>
                <p className="mt-1.5 text-[11px] leading-snug text-[#7FA7B4]">
                  Si son la misma empresa, es que el CIF está distinto en un sitio. Compruébalo antes:
                  vincular dos empresas distintas mezcla sus facturas.
                </p>
                <button type="button" onClick={usarCandidato} className="btn-ghost mt-2 !px-3 !py-1 text-[11.5px]">
                  Sí, es la misma: traer sus datos
                </button>
              </div>
            )}

            {/* Lo que Holded dice distinto: se enseña y se decide, campo a campo. */}
            {holded.estado === 'encontrado' && holded.diferencias?.length > 0 && (
              <div className="mt-2 rounded-xl border border-brand-orange/40 bg-brand-orange/8 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12.5px] font-extrabold text-brand-orange">
                    Holded tiene {holded.diferencias.length} dato{holded.diferencias.length === 1 ? '' : 's'} distinto{holded.diferencias.length === 1 ? '' : 's'}
                  </p>
                  <button type="button" onClick={aceptarTodoDeHolded}
                    className="btn-ghost !px-2.5 !py-1 text-[11px]">Traerlos todos</button>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {holded.diferencias.map((x) => (
                    <li key={x.campo} className="rounded-lg bg-[#0D3242] px-2.5 py-2">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{x.campo.replace('_', ' ')}</p>
                      <p className="mt-0.5 text-[12px] text-[#9FC0CB]">Aquí: <span className="text-[#EAF4F7]">{x.aqui}</span></p>
                      <p className="text-[12px] text-[#9FC0CB]">Holded: <span className="text-brand-orange">{x.alli}</span></p>
                      <button type="button" onClick={() => aceptarDeHolded(x.campo)}
                        className="mt-1 text-[11px] font-bold text-brand-orange hover:underline">Usar el de Holded</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {holded.estado === 'encontrado' && (
              <p className="text-emerald-300">
                ✓ En Holded, campos vacíos rellenados
                {holded.personas?.length ? ` · ${holded.personas.length} contacto(s) se importarán al guardar` : ''}.
              </p>
            )}
            {holded.estado === 'no' && <p className="text-brand-orange">Sin coincidencia en Holded. Rellena a mano.</p>}
            {holded.estado === 'error' && (
              <>
                <p className="text-red-300">Holded: {holded.error}</p>
                <button onClick={probarHolded} disabled={diag?.cargando}
                  className="rounded border border-[#1E5468] px-2 py-1 text-[11px] text-[#9FC0CB] hover:border-brand-verde">
                  {diag?.cargando ? 'Probando…' : 'Probar conexión'}
                </button>
              </>
            )}
          </div>

          {diag && !diag.cargando && (
            <div className="mt-2 space-y-1 rounded-lg bg-[#0D3242] p-2 text-[11px] leading-snug text-[#B9D2DA]">
              <p className="font-bold text-[#EAF4F7]">{diag.conclusion || diag.error}</p>
              {diag.pruebas?.map((pr, i) => (
                <p key={i}>
                  <span className={pr.ok ? 'text-emerald-300' : 'text-red-300'}>{pr.ok ? '✓' : '✗'}</span>{' '}
                  <b>{pr.api}</b> · HTTP {pr.http}
                  {pr.respuesta_holded ? ` · ${pr.respuesta_holded}` : (pr.motivo ? ` · ${pr.motivo}` : '')}
                </p>
              ))}
              {diag.huella_v2?.configurada && (
                <p className="text-[#7FA7B4]">
                  Clave v2: {diag.huella_v2.longitud} car. · {diag.huella_v2.empieza}…{diag.huella_v2.acaba}
                  {diag.huella_v2.espacios_alrededor && <b className="text-red-300"> · espacios alrededor</b>}
                  {diag.huella_v2.salto_de_linea && <b className="text-red-300"> · salto de línea</b>}
                  {diag.huella_v2.comillas && <b className="text-red-300"> · entre comillas</b>}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Tipo y clasificación */}
        <div className="rounded-xl border border-[#1E5468] bg-[#10394A] p-3">
          <div className="flex flex-wrap items-center gap-2">
            {[['es_cliente', 'Cliente'], ['es_proveedor', 'Proveedor']].map(([k, l]) => (
              <button key={k} onClick={() => setForm({ ...form, [k]: !form[k] })}
                className={`rounded-lg border px-3 py-1.5 text-[13px] font-bold transition ${
                  form[k] ? 'border-brand-verde bg-brand-verde text-[#061F2B]' : 'border-[#1E5468] text-[#9FC0CB] hover:border-brand-verde/60'}`}>
                {form[k] ? '✓ ' : ''}{l}
              </button>
            ))}
            <span className="text-[11px] text-[#7FA7B4]">se pueden marcar los dos</span>
          </div>

          {/* El estado comercial describe la relación de VENTA: en un proveedor
                    puro no significa nada y ensucia los informes de clientes. */}
              {form.es_cliente && (
              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="mb-0.5 block text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Estado comercial</span>
              <select className="input !py-1.5 !px-2.5 !text-[13px]" value={form.estado_comercial || 'potencial'}
                onChange={(e) => setForm({ ...form, estado_comercial: e.target.value })}>
                {ESTADOS_COMERCIALES.map((e) => <option key={e.k} value={e.k}>{e.label}</option>)}
              </select>
            </label>
            {form.es_cliente && (
              <label className="block">
                <span className="mb-0.5 block text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Empresa matriz</span>
                <select className="input !py-1.5 !px-2.5 !text-[13px]" value={form.empresa_matriz_id || ''}
                  onChange={(e) => setForm({ ...form, empresa_matriz_id: e.target.value || null })}>
                  <option value="">— ninguna —</option>
                  {matrices.map((e) => <option key={e.id} value={e.id}>{e.nombre}{e.cif ? ` · ${e.cif}` : ''}</option>)}
                </select>
              </label>
            )}
          </div>
              )}
        </div>

        {/* Datos fiscales · se abre solo si falta el nombre */}
        <Caja titulo="Datos fiscales y de contacto" abiertaPorDefecto={!form.nombre?.trim()}
          resumen={[form.nombre, resumenDireccion].filter(Boolean).join(' · ') || 'sin rellenar'}
          insignia={!form.nombre?.trim()
            ? <span className="chip !px-1.5 !py-0 bg-red-500/15 text-[10px] text-red-300">falta el nombre</span>
            : null}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CAMPOS_FISCALES.map(([k, label, ob, ancho]) => (
              <Campo key={k} label={label} obligatorio={ob} ancho={ancho} valor={form[k]}
                tono={ob && !form[k]?.trim() ? '!border-red-500/50' : ''}
                onCambio={(v) => setForm((f) => ({ ...f, [k]: v }))} />
            ))}
            <label className="block sm:col-span-2 lg:col-span-3">
              <span className="mb-0.5 block text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Notas</span>
              <textarea rows={2} className="input !py-1.5 !px-2.5 !text-[13px]" value={form.notas || ''}
                onChange={(e) => setForm({ ...form, notas: e.target.value })} />
            </label>
          </div>
        </Caja>

        {/* Contactos · visibles también editando */}
        {form.id ? (
          <Caja titulo="Contactos de la empresa" abiertaPorDefecto
            insignia={<span className={`chip !px-1.5 !py-0 text-[10px] ${mios.length ? 'bg-white/5 text-[#9FC0CB]' : 'bg-red-500/15 text-red-300'}`}>{cuantasPersonas || 'ninguno'}</span>}>
            <ContactosEmpresa
              empresa={empresa} contactos={contactos} vinculos={vinculos}
              puedeEditar={puedeEditar} onCambio={onCambio} onAbrirContacto={onAbrirContacto} desnudo
            />
          </Caja>
        ) : (
          <Caja titulo="Contactos de la empresa" abiertaPorDefecto
            insignia={<span className={`chip !px-1.5 !py-0 text-[10px] ${contactosNuevos.length ? 'bg-brand-verde/15 text-brand-verdeTexto' : 'bg-white/5 text-[#9FC0CB]'}`}>
              {contactosNuevos.length || 'ninguno'}</span>}>
            <ContactosAlta lista={contactosNuevos} setLista={setContactosNuevos} />
          </Caja>
        )}

        {/* Barra de guardado · el aviso también AQUÍ, junto al botón */}
        <div className="sticky bottom-0 z-40 space-y-2 rounded-xl bg-[#0A2B3A]/95 py-2 backdrop-blur">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="mr-auto text-[11px] text-[#7FA7B4]">Obligatorios: CIF y nombre. Los contactos son opcionales: se pueden añadir después.</span>
            {/* Qué ha pasado al pulsar guardar, paso a paso. */}
            {rastro && (
              <div className="mr-auto max-w-lg rounded-lg bg-[#0D3242] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Qué ha pasado</p>
                  <button type="button" onClick={() => setRastro(null)}
                    className="text-[11px] font-bold text-[#7FA7B4] hover:text-[#EAF4F7]">Ocultar</button>
                </div>
                <ol className="mt-1 space-y-0.5">
                  {rastro.map((x, i) => (
                    <li key={i} className={`text-[11.5px] leading-snug ${x.ok ? 'text-[#9FC0CB]' : 'font-bold text-red-300'}`}>
                      {x.ok ? '✓' : '✗'} {x.t}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Qué impide guardar, en vivo. Cinco comprobaciones que hasta ahora
                solo se veían al pulsar y una a una. */}
            {(() => {
              const cn = normalizarCif(form.cif);
              const ch = validarCif(cn);
              const problemas = [
                !cn && 'Falta el CIF',
                cn && ch.valido === false && `Identificador no válido: ${ch.mensaje || 'revisa la letra de control'}`,
                duplicada && `Ese CIF ya está en «${duplicada.nombre}»`,
                !form.nombre?.trim() && 'Falta el nombre o razón social',
                form.email && !emailValido(form.email) && 'El correo de la empresa no es válido',
              ].filter(Boolean);
              if (!problemas.length) return null;
              return (
                <p className="mr-auto max-w-md text-[11.5px] font-bold leading-snug text-red-300">
                  No se puede guardar: {problemas.join(' · ')}
                </p>
              );
            })()}
            <button onClick={() => (form.id ? setForm(null) : onCerrar && onCerrar())} className="btn-ghost !px-3 !py-1.5 text-[11px]">Cancelar</button>
            <button onClick={guardar} disabled={guardando} className="btn-orange !px-4 !py-1.5 text-[11px] disabled:opacity-40">
              {guardando ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Crear empresa'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════ LECTURA ══════════════════
  const s = SEM[semaforo.color];
  const tieneGrupo = !!(empresa.empresa_matriz_id || empresas.some((e) => String(e.empresa_matriz_id) === String(empresa.id)));

  return (
    <div className="space-y-2.5">
      {/* Cabecera compacta */}
      <div className="rounded-xl border border-[#1E5468] bg-[#10394A] p-3">
        <button onClick={onCerrar} className="mb-1.5 text-[11px] font-bold text-[#7FA7B4] hover:text-[#EAF4F7]">← Todas las empresas</button>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`h-2 w-2 shrink-0 rounded-full ${s.clase}`} title={s.texto} />
              <h3 className="text-base font-extrabold text-[#EAF4F7]">{empresa.nombre}</h3>
              {empresa.nombre_comercial && <span className="text-[12px] text-[#7FA7B4]">«{empresa.nombre_comercial}»</span>}
            </div>
            <p className="mt-0.5 text-[12px] text-[#9FC0CB]">
              <b className="text-[#EAF4F7]">{empresa.cif || 'SIN CIF'}</b>
              {empresa.cif && validarCif(empresa.cif).valido && <span className="ml-1 text-emerald-300">✓</span>}
              {matriz && <> · filial de <button onClick={() => onSeleccionar(matriz.id)} className="font-bold text-brand-verdeTexto hover:underline">{matriz.nombre}</button></>}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {empresa.es_cliente && <span className="chip !px-2 !py-0 bg-brand-orange/15 text-[10px] text-brand-orange">Cliente</span>}
              {empresa.es_proveedor && <span className="chip !px-2 !py-0 bg-brand-verde/15 text-[10px] text-brand-verdeTexto">Proveedor</span>}
              <span className="chip !px-2 !py-0 bg-white/5 text-[10px] text-[#9FC0CB]">
                {ESTADOS_COMERCIALES.find((e) => e.k === empresa.estado_comercial)?.label || 'Potencial'}
              </span>
              <span className={`chip !px-2 !py-0 text-[10px] ${s.chip}`}>{s.texto}</span>
              {empresa.holded_id && <span className="chip !px-2 !py-0 bg-white/5 text-[10px] text-[#7FA7B4]">Holded</span>}
              {empresa.brevo_sincronizado_en && <span className="chip !px-2 !py-0 bg-white/5 text-[10px] text-[#7FA7B4]">Brevo</span>}
            </div>
          </div>
          {puedeEditar && (
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <button onClick={() => setForm({ ...empresa })} className="btn-ghost !px-2.5 !py-1 text-[11px]">✎ Editar</button>
              <button onClick={enviarABrevo} disabled={brevoOcupado} className="btn-ghost !px-2.5 !py-1 text-[11px] disabled:opacity-40">
                {brevoOcupado ? '…' : '✉ Brevo'}
              </button>
              {puedeBorrar && (
                <button onClick={borrar} className="rounded-lg border border-red-500/40 px-2 py-1 text-[11px] font-bold text-red-300 hover:bg-red-500/10">🗑</button>
              )}
            </div>
          )}
        </div>

        {semaforo.motivos.length > 0 && (
          <ul className={`mt-2 space-y-0.5 rounded-lg p-2 text-[11.5px] font-semibold ${semaforo.color === 'rojo' ? 'bg-red-500/10 text-red-300' : 'bg-brand-orange/10 text-brand-orange'}`}>
            {semaforo.motivos.map((m) => <li key={m}>· {m}</li>)}
          </ul>
        )}
        {msg && <div className="mt-2">{aviso}</div>}
      </div>

      {/* Contactos primero y abierto */}
      <Caja titulo="Contactos de la empresa" abiertaPorDefecto
        insignia={<span className={`chip !px-1.5 !py-0 text-[10px] ${mios.length ? 'bg-white/5 text-[#9FC0CB]' : 'bg-red-500/15 text-red-300'}`}>{cuantasPersonas || 'ninguno'}</span>}>
        <ContactosEmpresa
          empresa={empresa} contactos={contactos} vinculos={vinculos}
          puedeEditar={puedeEditar} onCambio={onCambio} onAbrirContacto={onAbrirContacto} desnudo
        />
      </Caja>

      {/* Datos fiscales · plegado */}
      <Caja titulo="Datos fiscales y de contacto" resumen={resumenDireccion || empresa.email || 'sin datos'}>
        <dl className="grid gap-x-5 gap-y-1.5 text-[13px] sm:grid-cols-2">
          {[
            ['Dirección', [empresa.direccion, [empresa.cp, empresa.poblacion].filter(Boolean).join(' '), empresa.provincia, empresa.pais].filter(Boolean).join(', ')],
            ['Email', empresa.email],
            ['Teléfono', [empresa.telefono, empresa.movil].filter(Boolean).join(' · ')],
            ['Website', empresa.web],
            ['VAT', empresa.vat_id],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{k}</dt>
              <dd className="min-w-0 break-words text-[#EAF4F7]">
                {k === 'Website'
                  ? <a href={/^https?:/.test(v) ? v : `https://${v}`} target="_blank" rel="noreferrer" className="text-brand-verdeTexto hover:underline">{v}</a>
                  : v}
              </dd>
            </div>
          ))}
        </dl>
        {empresa.notas && <p className="mt-2 whitespace-pre-line rounded-lg bg-[#0D3242] p-2 text-[12.5px] text-[#CFE3E9]">{empresa.notas}</p>}
      </Caja>

      {/* Grupo · solo si lo hay */}
      {tieneGrupo && (
        <Caja titulo="Estructura del grupo" resumen={matriz ? `filial de ${matriz.nombre}` : 'es matriz'}>
          <OrganigramaGrupo empresas={empresas} empresaId={empresa.id} onSeleccionar={onSeleccionar} desnudo />
        </Caja>
      )}

      {/* Homologación · solo proveedores */}
      {/* Se abre SOLA en un proveedor: si está marcada como tal, la homologación
          es lo que hay que hacer con ella, no algo escondido tras un desplegable. */}
      {empresa.es_proveedor ? (
        <Caja titulo="Homologación por normas" abiertaPorDefecto
          insignia={<span className="chip !px-1.5 !py-0 bg-brand-orange/15 text-[10px] text-brand-orange">proveedor</span>}>
          <HomologacionNormas empresa={empresa} puedeEditar={puedeEditar} />
        </Caja>
      ) : (
        <p className="text-[11px] text-[#7FA7B4]">
          Márcala como <strong>Proveedor</strong> para gestionar sus condiciones de homologación.
        </p>
      )}
    </div>
  );
}
