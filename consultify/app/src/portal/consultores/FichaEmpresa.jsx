import { useState, useMemo, useEffect, useRef } from 'react';
import { insertRow, updateRow, deleteRow, holdedFn, brevoFn } from '../../lib/data.js';
import {
  validarCif, normalizarCif, emailValido, semaforoEmpresa,
  candidatasMatriz, ESTADOS_COMERCIALES,
} from '../../lib/crm.js';
import OrganigramaGrupo from '../../components/OrganigramaGrupo.jsx';
import ContactosEmpresa from './ContactosEmpresa.jsx';
import HomologacionProveedor from './HomologacionProveedor.jsx';

// ════════════════════════════════════════════════════════════════════════════
// Ficha de empresa (una sola entidad para cliente / proveedor / potencial).
//
//  · Cliente y Proveedor son dos interruptores independientes: se pueden dar
//    los dos a la vez.
//  · Si es cliente, puede tener EMPRESA MATRIZ; si la tiene, se pinta el
//    organigrama del grupo.
//  · Al teclear el CIF se consulta Holded y se autocompleta todo lo que haya
//    allí (incluidas sus personas de contacto), y se puede empujar a Brevo.
//  · Si es proveedor, aparecen sus condiciones de homologación.
// ════════════════════════════════════════════════════════════════════════════

const CAMPOS_FISCALES = [
  ['nombre',           'Nombre / razón social', true],
  ['nombre_comercial', 'Nombre comercial',      false],
  ['direccion',        'Dirección',             false],
  ['poblacion',        'Población',             false],
  ['cp',               'Código postal',         false],
  ['provincia',        'Provincia',             false],
  ['pais',             'País',                  false],
  ['email',            'Email de la empresa',   false],
  ['telefono',         'Teléfono',              false],
  ['web',              'Website',               false],
];

const SEM = {
  rojo:  { clase: 'bg-red-500',      chip: 'bg-red-500/15 text-red-300',           texto: 'Incompleta' },
  ambar: { clase: 'bg-brand-orange', chip: 'bg-brand-orange/15 text-brand-orange', texto: 'Revisar' },
  verde: { clase: 'bg-emerald-400',  chip: 'bg-emerald-500/15 text-emerald-300',   texto: 'Completa' },
};

function CampoTexto({ label, obligatorio, valor, onCambio }) {
  return (
    <label className="block text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">
      {label}{obligatorio && <span className="text-brand-orange">*</span>}
      <input className="input !mt-1" value={valor || ''} onChange={(e) => onCambio(e.target.value)} />
    </label>
  );
}

export default function FichaEmpresa({
  empresa, empresas, contactos, vinculos,
  puedeEditar, puedeBorrar, onCambio, onSeleccionar, onCerrar, onAbrirContacto,
}) {
  const esNueva = !empresa?.id;
  const [form, setForm] = useState(null);           // null = modo lectura
  const [msg, setMsg] = useState(null);
  const [holded, setHolded] = useState({ estado: 'inactivo' }); // inactivo|buscando|encontrado|no|error
  const [diag, setDiag] = useState(null); // resultado de "probar conexión" con Holded

  // Diagnóstico de conexión: prueba las dos APIs de Holded con su autenticación
  // correcta y dice cuál responde. Evita adivinar cuando sale un 403.
  async function probarHolded() {
    setDiag({ cargando: true });
    try { setDiag(await holdedFn({ action: 'diagnostico' })); }
    catch (e) { setDiag({ ok: false, conclusion: `No se pudo contactar con la función: ${e?.message || e}` }); }
  }
  const [brevoOcupado, setBrevoOcupado] = useState(false);

  // Al abrir una empresa nueva, entra directamente en edición.
  // reciénGuardada evita que el efecto borre el mensaje de confirmación cuando
  // el alta pasa de borrador (sin id) a ficha guardada (con id).
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

  // ── Holded: buscar por CIF y autocompletar ────────────────────────────────
  async function traerDeHolded(cifBuscado) {
    const v = normalizarCif(cifBuscado ?? vista.cif);
    if (!v) { setMsg({ err: true, t: 'Escribe primero el CIF.' }); return; }
    setHolded({ estado: 'buscando' });
    const r = await holdedFn({ action: 'buscar_empresa', cif: v });
    if (!r?.ok) { setHolded({ estado: 'error', error: r?.error || 'error' }); return; }
    if (!r.encontrado) { setHolded({ estado: 'no' }); return; }

    const d = r.empresa || {};
    // Solo se rellena lo que esté vacío en el formulario: nunca se pisa lo escrito a mano.
    setForm((f) => {
      const base = { ...(f || vista) };
      const poner = (k, val) => { if (val && !String(base[k] || '').trim()) base[k] = val; };
      poner('nombre', d.nombre);
      poner('nombre_comercial', d.nombre_comercial);
      poner('email', d.email);
      poner('telefono', d.telefono);
      poner('movil', d.movil);
      poner('web', d.web);
      poner('direccion', d.direccion);
      poner('poblacion', d.poblacion);
      poner('cp', d.cp);
      poner('provincia', d.provincia);
      poner('pais', d.pais);
      poner('vat_id', d.vat_id);
      poner('notas', d.notas);
      base.cif = d.cif || v;
      if (d.es_cliente) base.es_cliente = true;
      if (d.es_proveedor) base.es_proveedor = true;
      base.holded_id = r.holded_id || base.holded_id;
      base._holded_crudo = r.crudo || null;
      base._holded_contactos = d.contactos || [];
      return base;
    });
    setHolded({ estado: 'encontrado', personas: d.contactos || [], holded_id: r.holded_id });
  }

  // ── Guardar ───────────────────────────────────────────────────────────────
  async function guardar() {
    if (!form.nombre?.trim()) { setMsg({ err: true, t: 'El nombre es obligatorio.' }); return; }
    if (form.email && !emailValido(form.email)) { setMsg({ err: true, t: 'El email de la empresa no es válido.' }); return; }

    const payload = {
      nombre: form.nombre.trim(),
      nombre_comercial: form.nombre_comercial?.trim() || null,
      cif: form.cif ? normalizarCif(form.cif) : null,
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
      // La matriz solo tiene sentido en clientes
      empresa_matriz_id: form.es_cliente ? (form.empresa_matriz_id || null) : null,
      holded_id: form.holded_id || null,
      holded_datos: form._holded_crudo || form.holded_datos || null,
      holded_sincronizado_en: form._holded_crudo ? new Date().toISOString() : (form.holded_sincronizado_en || null),
      updated_at: new Date().toISOString(),
    };

    try {
      let id = form.id;
      if (id) {
        await updateRow('empresas', id, payload);
      } else {
        const creada = await insertRow('empresas', payload);
        id = creada?.id;
      }

      // Personas de contacto traídas de Holded: se crean y vinculan si el email es válido
      let importados = 0, saltados = 0;
      const personas = form._holded_contactos || [];
      if (id && personas.length) {
        for (let i = 0; i < personas.length; i++) {
          const p = personas[i];
          if (!emailValido(p.email)) { saltados++; continue; }
          const ya = contactos.find((c) => (c.email || '').trim().toLowerCase() === p.email.trim().toLowerCase());
          let contactoId = ya?.id;
          if (!contactoId) {
            const nuevo = await insertRow('contactos', {
              nombre: p.nombre || p.email,
              cargo: p.cargo || null,
              email: p.email.trim(),
              telefono: p.telefono || null,
              consentimiento_marketing: false,
            });
            contactoId = nuevo?.id;
          }
          if (!contactoId) { saltados++; continue; }
          try {
            await insertRow('empresa_contactos', {
              empresa_id: id, contacto_id: contactoId,
              rol: i === 0 ? 'directivo' : 'secundario',
              principal: i === 0, cargo: p.cargo || null,
            });
            importados++;
          } catch { saltados++; }   // ya vinculado o rol ocupado
        }
      }

      recienGuardada.current = true;
      setForm(null);
      const extra = importados ? ` · ${importados} contacto(s) importados de Holded` : '';
      const aviso = saltados ? ` · ${saltados} sin email válido, no importados` : '';
      setMsg({ t: `Empresa guardada${extra}${aviso}.` });
      // Se espera la recarga ANTES de seleccionar: si no, la empresa recién
      // creada todavía no está en la lista, la ficha se desmonta un instante y
      // se pierde el mensaje de confirmación.
      if (onCambio) await onCambio(id);
      if (!form.id && id) onSeleccionar && onSeleccionar(id);
    } catch (e) {
      setMsg({ err: true, t: 'No se pudo guardar: ' + (e.message || '') });
    }
  }

  async function borrar() {
    if (!window.confirm(`¿Eliminar «${empresa.nombre}»?\n\nSus contactos NO se borran, quedan sin empresa (semáforo rojo). Si es matriz de otras, sus filiales quedan sueltas.`)) return;
    try { await deleteRow('empresas', empresa.id); onCerrar && onCerrar(); onCambio && onCambio(); }
    catch { setMsg({ err: true, t: 'No se pudo eliminar.' }); }
  }

  // ── Brevo: sube los contactos de esta empresa ─────────────────────────────
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
        if (r?.ok) {
          ok++;
          await updateRow('contactos', x.c.id, { brevo_sincronizado_en: new Date().toISOString() });
        } else err++;
      } catch { err++; }
    }
    if (ok) await updateRow('empresas', empresa.id, { brevo_sincronizado_en: new Date().toISOString() }).catch(() => {});
    setMsg({
      err: ok === 0,
      t: `Brevo: ${ok} contacto(s) enviados${err ? ` · ${err} con error` : ''}${sinConsent ? ` · ${sinConsent} omitidos sin consentimiento` : ''}. Recibirán el email de doble opt-in.`,
    });
    setBrevoOcupado(false); onCambio && onCambio();
  }

  // ══════════════════ MODO EDICIÓN ══════════════════
  if (form) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-extrabold text-[#EAF4F7]">{form.id ? 'Editar empresa' : 'Nueva empresa'}</h3>
          <button onClick={() => (form.id ? setForm(null) : onCerrar && onCerrar())} className="btn-ghost !px-3 !py-1.5 text-xs">
            {form.id ? 'Cancelar' : '← Volver al listado'}
          </button>
        </div>

        {msg && (
          <div className={`rounded-xl p-3 text-sm font-bold ${msg.err ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'}`}
            onClick={() => setMsg(null)}>{msg.t}</div>
        )}

        {/* CIF + Holded */}
        <div className="card space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="block text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">
              NIF / CIF de la empresa
              <input
                className={`input !mt-1 ${cif.valido === false ? '!border-red-500/60' : cif.valido ? '!border-emerald-500/50' : ''}`}
                value={form.cif || ''} placeholder="B12345678"
                onChange={(e) => { setForm({ ...form, cif: e.target.value.toUpperCase() }); setHolded({ estado: 'inactivo' }); }}
                onBlur={(e) => { const v = validarCif(e.target.value); if (v.valido && holded.estado === 'inactivo') traerDeHolded(e.target.value); }}
              />
            </label>
            <div className="flex items-end">
              <button onClick={() => traerDeHolded()} disabled={holded.estado === 'buscando'}
                className="btn-ghost !px-4 !py-2.5 text-sm disabled:opacity-40">
                {holded.estado === 'buscando' ? 'Buscando…' : '⇩ Traer de Holded'}
              </button>
            </div>
          </div>

          {cif.mensaje && (
            <p className={`text-xs font-bold ${cif.valido ? 'text-emerald-300' : 'text-red-300'}`}>
              {cif.valido ? `✓ ${cif.mensaje}` : `⚠ ${cif.mensaje}`}
            </p>
          )}
          {holded.estado === 'encontrado' && (
            <p className="rounded-xl bg-emerald-500/10 p-2.5 text-xs font-bold text-emerald-300">
              ✓ Encontrada en Holded. Campos vacíos rellenados
              {holded.personas?.length ? ` · ${holded.personas.length} persona(s) de contacto se importarán al guardar` : ''}.
            </p>
          )}
          {holded.estado === 'no' && (
            <p className="rounded-xl bg-brand-orange/10 p-2.5 text-xs font-bold text-brand-orange">
              No hay ningún contacto con ese CIF en Holded. Rellena la ficha a mano.
            </p>
          )}
          {holded.estado === 'error' && (
            <div className="space-y-2">
              <p className="rounded-xl bg-red-500/10 p-2.5 text-xs font-bold text-red-300">Holded: {holded.error}</p>
              <button onClick={probarHolded} disabled={diag?.cargando}
                className="rounded-lg border border-[#1E5468] px-3 py-1.5 text-xs font-bold text-[#9FC0CB] hover:border-brand-verde hover:text-[#EAF4F7]">
                {diag?.cargando ? 'Probando…' : 'Probar conexión con Holded'}
              </button>
            </div>
          )}
          {diag && !diag.cargando && (
            <div className="space-y-1.5 rounded-xl bg-[#0D3242] p-3 text-[11.5px] leading-snug text-[#B9D2DA]">
              <p className="font-bold text-[#EAF4F7]">{diag.conclusion || diag.error}</p>
              {diag.pruebas?.map((pr, i) => (
                <p key={i}>
                  <span className={pr.ok ? 'text-emerald-300' : 'text-red-300'}>{pr.ok ? '✓' : '✗'}</span>{' '}
                  <b>{pr.api}</b> · HTTP {pr.http}
                  {pr.respuesta_holded ? <> · respuesta de Holded: <code className="text-[#EAF4F7]">{pr.respuesta_holded}</code></> : (pr.motivo ? ` · ${pr.motivo}` : '')}
                </p>
              ))}
              {diag.huella_v2?.configurada && (
                <p className="text-[#7FA7B4]">
                  Clave v2: {diag.huella_v2.longitud} caracteres · {diag.huella_v2.empieza}…{diag.huella_v2.acaba}
                  {diag.huella_v2.espacios_alrededor && <b className="text-red-300"> · ¡tiene espacios alrededor!</b>}
                  {diag.huella_v2.salto_de_linea && <b className="text-red-300"> · ¡tiene un salto de línea!</b>}
                  {diag.huella_v2.comillas && <b className="text-red-300"> · ¡está entre comillas!</b>}
                  {diag.huella_v2.caracteres_raros && <b className="text-red-300"> · contiene caracteres extraños</b>}
                </p>
              )}
              {diag.claves_distintas && diag.huella_v1?.configurada && (
                <p className="text-[#7FA7B4]">
                  Clave v1: {diag.huella_v1.longitud} caracteres · {diag.huella_v1.empieza}…{diag.huella_v1.acaba}
                  {(diag.huella_v1.espacios_alrededor || diag.huella_v1.salto_de_linea || diag.huella_v1.comillas) && <b className="text-red-300"> · formato sospechoso</b>}
                </p>
              )}
              {diag.pruebas && (
                <p className="text-[#7FA7B4]">
                  Claves configuradas en Netlify: v2 {diag.clave_v2_configurada ? 'sí' : 'no'} ·
                  v1 {diag.clave_v1_configurada ? 'sí' : 'no'}
                  {diag.claves_distintas ? ' (distintas)' : ' (la misma para las dos)'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Qué es esta empresa */}
        <div className="card space-y-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Esta empresa es…</p>
          <div className="flex flex-wrap gap-2">
            {[['es_cliente', 'Cliente'], ['es_proveedor', 'Proveedor']].map(([k, l]) => (
              <button key={k} onClick={() => setForm({ ...form, [k]: !form[k] })}
                className={`rounded-xl border px-5 py-2.5 text-sm font-bold transition ${
                  form[k] ? 'border-brand-verde bg-brand-verde text-[#061F2B]' : 'border-[#1E5468] text-[#9FC0CB] hover:border-brand-verde/60'}`}>
                {form[k] ? '✓ ' : ''}{l}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#7FA7B4]">Se pueden marcar los dos. Pulsa para activar o desactivar.</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Estado comercial
              <select className="input !mt-1" value={form.estado_comercial || 'potencial'}
                onChange={(e) => setForm({ ...form, estado_comercial: e.target.value })}>
                {ESTADOS_COMERCIALES.map((e) => <option key={e.k} value={e.k}>{e.label}</option>)}
              </select>
            </label>

            {form.es_cliente && (
              <label className="block text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Empresa matriz
                <select className="input !mt-1" value={form.empresa_matriz_id || ''}
                  onChange={(e) => setForm({ ...form, empresa_matriz_id: e.target.value || null })}>
                  <option value="">— ninguna (es matriz o independiente) —</option>
                  {matrices.map((e) => <option key={e.id} value={e.id}>{e.nombre}{e.cif ? ` · ${e.cif}` : ''}</option>)}
                </select>
              </label>
            )}
          </div>
          {form.es_cliente && form.empresa_matriz_id && (
            <p className="text-xs text-brand-verdeTexto">Al guardar se dibujará el organigrama del grupo.</p>
          )}
        </div>

        {/* Datos fiscales */}
        <div className="card grid gap-3 sm:grid-cols-2">
          {CAMPOS_FISCALES.map(([k, label, ob]) => (
            <CampoTexto key={k} label={label} obligatorio={ob} valor={form[k]}
              onCambio={(v) => setForm((f) => ({ ...f, [k]: v }))} />
          ))}
          <CampoTexto label="Identificación VAT" valor={form.vat_id}
            onCambio={(v) => setForm((f) => ({ ...f, vat_id: v }))} />
          <label className="block text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4] sm:col-span-2">Notas
            <textarea rows={3} className="input !mt-1" value={form.notas || ''}
              onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={() => (form.id ? setForm(null) : onCerrar && onCerrar())} className="btn-ghost !px-4 !py-2 text-sm">Cancelar</button>
          <button onClick={guardar} className="btn-orange !px-5 !py-2 text-sm">
            {form.id ? 'Guardar cambios' : 'Crear empresa'}
          </button>
        </div>
        {!form.id && (
          <p className="text-right text-xs text-[#7FA7B4]">
            Se guardará aunque no tenga contactos: quedará con semáforo rojo hasta que le asignes al menos uno.
          </p>
        )}
      </div>
    );
  }

  // ══════════════════ MODO LECTURA ══════════════════
  const s = SEM[semaforo.color];
  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <button onClick={onCerrar} className="mb-2 text-xs font-bold text-[#7FA7B4] hover:text-[#EAF4F7]">← Todas las empresas</button>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.clase}`} title={s.texto} />
              <h3 className="text-xl font-extrabold text-[#EAF4F7]">{empresa.nombre}</h3>
              {empresa.nombre_comercial && <span className="text-sm text-[#7FA7B4]">«{empresa.nombre_comercial}»</span>}
            </div>
            <p className="mt-1 text-sm text-[#9FC0CB]">
              {empresa.cif || 'sin CIF'}
              {empresa.cif && validarCif(empresa.cif).valido && <span className="ml-1 text-emerald-300">✓</span>}
              {matriz && <> · filial de <button onClick={() => onSeleccionar(matriz.id)} className="font-bold text-brand-verdeTexto hover:underline">{matriz.nombre}</button></>}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {empresa.es_cliente && <span className="chip bg-brand-orange/15 text-brand-orange">Cliente</span>}
              {empresa.es_proveedor && <span className="chip bg-brand-verde/15 text-brand-verdeTexto">Proveedor</span>}
              <span className="chip bg-white/5 text-[#9FC0CB]">
                {ESTADOS_COMERCIALES.find((e) => e.k === empresa.estado_comercial)?.label || 'Potencial'}
              </span>
              <span className={`chip ${s.chip}`}>{s.texto}</span>
              {empresa.holded_id && <span className="chip bg-white/5 text-[#7FA7B4]">En Holded</span>}
              {empresa.brevo_sincronizado_en && <span className="chip bg-white/5 text-[#7FA7B4]">En Brevo</span>}
            </div>
          </div>

          {puedeEditar && (
            <div className="flex shrink-0 flex-wrap gap-2">
              <button onClick={() => setForm({ ...empresa })} className="btn-ghost !px-3 !py-1.5 text-xs">✎ Editar</button>
              <button onClick={enviarABrevo} disabled={brevoOcupado} className="btn-ghost !px-3 !py-1.5 text-xs disabled:opacity-40">
                {brevoOcupado ? 'Enviando…' : '✉ Brevo'}
              </button>
              {puedeBorrar && (
                <button onClick={borrar} className="rounded-xl border border-red-500/40 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/10">🗑</button>
              )}
            </div>
          )}
        </div>

        {semaforo.motivos.length > 0 && (
          <ul className={`mt-3 space-y-0.5 rounded-xl p-3 text-xs font-semibold ${semaforo.color === 'rojo' ? 'bg-red-500/10 text-red-300' : 'bg-brand-orange/10 text-brand-orange'}`}>
            {semaforo.motivos.map((m) => <li key={m}>· {m}</li>)}
          </ul>
        )}

        {msg && (
          <div className={`mt-3 rounded-xl p-3 text-sm font-bold ${msg.err ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'}`}
            onClick={() => setMsg(null)}>{msg.t}</div>
        )}

        {/* Datos */}
        <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-[#1E5468] pt-4 text-sm sm:grid-cols-2">
          {[
            ['Dirección', [empresa.direccion, [empresa.cp, empresa.poblacion].filter(Boolean).join(' '), empresa.provincia, empresa.pais].filter(Boolean).join(', ')],
            ['Email', empresa.email],
            ['Teléfono', [empresa.telefono, empresa.movil].filter(Boolean).join(' · ')],
            ['Website', empresa.web],
            ['VAT', empresa.vat_id],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="shrink-0 text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{k}</dt>
              <dd className="min-w-0 break-words text-[#EAF4F7]">
                {k === 'Website' ? <a href={/^https?:/.test(v) ? v : `https://${v}`} target="_blank" rel="noreferrer" className="text-brand-verdeTexto hover:underline">{v}</a> : v}
              </dd>
            </div>
          ))}
        </dl>
        {empresa.notas && <p className="mt-3 whitespace-pre-line rounded-xl bg-[#0D3242] p-3 text-sm text-[#CFE3E9]">{empresa.notas}</p>}
      </div>

      {/* Organigrama del grupo (solo si hay grupo) */}
      <OrganigramaGrupo empresas={empresas} empresaId={empresa.id} onSeleccionar={onSeleccionar} />

      {/* Contactos por rol */}
      <ContactosEmpresa
        empresa={empresa} contactos={contactos} vinculos={vinculos}
        puedeEditar={puedeEditar} onCambio={onCambio} onAbrirContacto={onAbrirContacto}
      />

      {/* Homologación: solo proveedores */}
      {empresa.es_proveedor && (
        <HomologacionProveedor empresa={empresa} puedeEditar={puedeEditar} onCambio={onCambio} />
      )}
      {!empresa.es_proveedor && (
        <p className="text-xs text-[#7FA7B4]">
          Marca esta empresa como <strong>Proveedor</strong> para gestionar sus condiciones de homologación.
        </p>
      )}
    </div>
  );
}
