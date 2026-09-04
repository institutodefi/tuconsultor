import { useState, useMemo } from 'react';
import { insertRow, updateRow, deleteRow } from '../../lib/data.js';
import { ROLES_CONTACTO, ROL_LABEL, emailValido } from '../../lib/crm.js';

// ════════════════════════════════════════════════════════════════════════════
// Contactos de una empresa: tres roles nombrados + bloque de secundarios.
//
// Sincronización: NO hay copia de datos. El contacto vive en la tabla
// `contactos` (la misma que alimenta la pestaña Contactos) y aquí solo se
// gestiona el vínculo `empresa_contactos` con su rol. Crear un contacto desde
// esta ficha lo hace aparecer en Contactos al instante, y viceversa.
//
// El email es OBLIGATORIO para crear o vincular un contacto.
// ════════════════════════════════════════════════════════════════════════════

const VACIO = { nombre: '', apellidos: '', cargo: '', email: '', telefono: '', consentimiento_marketing: false };

export default function ContactosEmpresa({ empresa, contactos, vinculos, puedeEditar, onCambio, onAbrirContacto, desnudo = false }) {
  const [asignando, setAsignando] = useState(null);   // rol al que se está asignando
  const [modo, setModo] = useState('buscar');         // buscar | crear
  const [busqueda, setBusqueda] = useState('');
  const [nuevo, setNuevo] = useState({ ...VACIO });
  const [error, setError] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const mios = useMemo(() => vinculos
    .filter((v) => String(v.empresa_id) === String(empresa.id))
    .map((v) => ({ vinc: v, c: contactos.find((c) => String(c.id) === String(v.contacto_id)) }))
    .filter((x) => x.c), [vinculos, contactos, empresa.id]);

  const porRol = (rol) => mios.find((x) => x.vinc.rol === rol);
  // Directivo admite VARIOS desde la migración v98: una empresa puede tener
  // dirección general, dirección de calidad y responsable del sistema, y las
  // tres son interlocutoras. Antes solo cabía una y las demás caían a
  // «secundario», donde se mezclaban con contactos sueltos.
  const directivos = mios
    .filter((x) => x.vinc.rol === 'directivo')
    // El principal primero: es quien firma y quien va a los documentos.
    .sort((a, b) => (b.vinc.principal ? 1 : 0) - (a.vinc.principal ? 1 : 0));
  const secundarios = mios.filter((x) => x.vinc.rol === 'secundario');

  const candidatos = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    const yaEstan = new Set(mios.map((x) => String(x.c.id)));
    return contactos
      .filter((c) => !yaEstan.has(String(c.id)))
      .filter((c) => !t || [c.nombre, c.apellidos, c.email, c.cargo].filter(Boolean).join(' ').toLowerCase().includes(t))
      .sort((a, b) => `${a.nombre} ${a.apellidos || ''}`.localeCompare(`${b.nombre} ${b.apellidos || ''}`))
      .slice(0, 40);
  }, [contactos, mios, busqueda]);

  function abrir(rol) {
    setAsignando(rol); setModo('buscar'); setBusqueda(''); setNuevo({ ...VACIO }); setError(null);
  }
  function cerrar() { setAsignando(null); setError(null); }

  // ── Vincular un contacto YA existente con este rol ────────────────────────
  async function vincular(contacto) {
    if (!emailValido(contacto.email)) {
      setError(`«${contacto.nombre}» no tiene un email válido. Edítalo en Contactos antes de asignarlo: el email es obligatorio.`);
      return;
    }
    setOcupado(true);
    try {
      // Facturación y proyecto siguen siendo únicos: si ya estaban ocupados, el
      // anterior pasa a secundario. Directivo ya no, así que no se degrada a
      // nadie al añadir otro.
      const ROLES_UNICOS = ['facturacion', 'proyecto'];
      const previo = ROLES_UNICOS.includes(asignando) ? porRol(asignando) : null;
      if (previo) await updateRow('empresa_contactos', previo.vinc.id, { rol: 'secundario', principal: false });

      const yaVinculado = mios.find((x) => String(x.c.id) === String(contacto.id));
      if (yaVinculado) {
        await updateRow('empresa_contactos', yaVinculado.vinc.id, { rol: asignando });
      } else {
        await insertRow('empresa_contactos', {
          empresa_id: empresa.id,
          contacto_id: contacto.id,
          rol: asignando,
          // Solo hay un principal por empresa (índice único en la base). El
          // primer directivo lo es; los siguientes se añaden sin marcar y se
          // asciende a mano con «hacer principal».
          principal: asignando === 'directivo' && directivos.length === 0,
          cargo: contacto.cargo || null,
        });
      }
      cerrar(); onCambio && onCambio();
    } catch (e) {
      setError('No se pudo vincular: ' + (e.message || ''));
    } finally { setOcupado(false); }
  }

  // ── Crear contacto nuevo y vincularlo con este rol ────────────────────────
  async function crearYVincular() {
    if (!nuevo.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!emailValido(nuevo.email)) { setError('El email es obligatorio y debe ser válido.'); return; }

    // ¿ese email ya existe en el CRM? entonces se reutiliza, no se duplica
    const existente = contactos.find((c) => (c.email || '').trim().toLowerCase() === nuevo.email.trim().toLowerCase());
    if (existente) {
      setError(`Ese email ya es de «${existente.nombre} ${existente.apellidos || ''}». Se vinculará ese contacto en lugar de crear uno nuevo.`);
      await vincular(existente);
      return;
    }

    setOcupado(true);
    try {
      const creado = await insertRow('contactos', {
        nombre: nuevo.nombre.trim(),
        apellidos: nuevo.apellidos?.trim() || null,
        cargo: nuevo.cargo?.trim() || null,
        email: nuevo.email.trim(),
        telefono: nuevo.telefono?.trim() || null,
        consentimiento_marketing: !!nuevo.consentimiento_marketing,
        consentimiento_fecha: nuevo.consentimiento_marketing ? new Date().toISOString() : null,
      });
      if (!creado?.id) throw new Error('el contacto se creó pero no se pudo recuperar su id; recarga la ficha.');
      const previoUnico = ['facturacion', 'proyecto'].includes(asignando) ? porRol(asignando) : null;
      if (previoUnico) await updateRow('empresa_contactos', previoUnico.vinc.id, { rol: 'secundario', principal: false });
      await insertRow('empresa_contactos', {
        empresa_id: empresa.id,
        contacto_id: creado.id,
        rol: asignando,
        principal: asignando === 'directivo' && directivos.length === 0,
        cargo: nuevo.cargo?.trim() || null,
      });
      cerrar(); onCambio && onCambio();
    } catch (e) {
      setError('No se pudo crear: ' + (e.message || ''));
    } finally { setOcupado(false); }
  }

  async function quitar(x) {
    if (!window.confirm(`¿Quitar a ${x.c.nombre} de ${empresa.nombre}?\n\nEl contacto seguirá existiendo en la pestaña Contactos, pero si no le queda ninguna empresa quedará marcado en rojo.`)) return;
    try { await deleteRow('empresa_contactos', x.vinc.id); onCambio && onCambio(); }
    catch { setError('No se pudo quitar.'); }
  }

  /** MOVER: la persona cambia de rol y deja libre el anterior. */
  async function cambiarRol(x, rol) {
    if (rol === x.vinc.rol) return;
    try {
      // Si ya ocupa ese rol por otra vía, mover sería duplicar: se avisa.
      const yaLoTiene = vinculos.some((v) =>
        String(v.contacto_id) === String(x.c.id) && v.rol === rol && v.id !== x.vinc.id);
      if (yaLoTiene) {
        setError(`${x.c.nombre} ya figura como ${etiquetaRol(rol).toLowerCase()} en esta empresa.`);
        return;
      }
      // Facturación y proyecto siguen siendo únicos: quien los ocupara pasa a
      // secundario. Directivo admite varios, así que no se desplaza a nadie.
      if (['facturacion', 'proyecto'].includes(rol)) {
        const previo = porRol(rol);
        if (previo && previo.vinc.id !== x.vinc.id) {
          await updateRow('empresa_contactos', previo.vinc.id, { rol: 'secundario', principal: false });
        }
      }
      // Solo se hace principal si aún no hay ninguno: un ascenso a directivo no
      // debe destronar al que ya firmaba los documentos.
      const hayPrincipal = directivos.some((d) => d.vinc.principal && d.vinc.id !== x.vinc.id);
      await updateRow('empresa_contactos', x.vinc.id,
        { rol, principal: rol === 'directivo' && !hayPrincipal });
      onCambio && onCambio();
    } catch (e) { setError('No se pudo cambiar el rol: ' + (e.message || '')); }
  }

  /** COPIAR: la misma persona pasa a ocupar TAMBIÉN otro rol, sin dejar el suyo.
      En una pyme lo normal es que quien manda sea también quien firma facturas. */
  async function copiarARol(x, rol) {
    try {
      const yaLoTiene = vinculos.some((v) =>
        String(v.contacto_id) === String(x.c.id) && v.rol === rol);
      if (yaLoTiene) {
        setError(`${x.c.nombre} ya figura como ${etiquetaRol(rol).toLowerCase()}.`);
        return;
      }
      if (['facturacion', 'proyecto'].includes(rol)) {
        const previo = porRol(rol);
        if (previo) await updateRow('empresa_contactos', previo.vinc.id, { rol: 'secundario', principal: false });
      }
      await insertRow('empresa_contactos', {
        empresa_id: empresa.id, contacto_id: x.c.id, rol,
        principal: false,          // el principal sigue siendo el que ya lo era
        cargo: x.vinc.cargo || null,
      });
      onCambio && onCambio();
    } catch (e) { setError('No se pudo copiar: ' + (e.message || '')); }
  }

  const etiquetaRol = (k) =>
    k === 'secundario' ? 'Secundario' : (ROLES_CONTACTO.find((r) => r.k === k)?.corto || k);

  // ── Tarjeta de un contacto asignado ──────────────────────────────────────
  // OJO: función invocada, no componente. Si se declara como componente dentro
  // del render, React lo trata como un tipo nuevo en cada pulsación, remonta
  // los inputs y se pierde el foco y el valor a medio escribir.
  /** Marca a un directivo como principal y desmarca al anterior.
      La base solo admite uno por empresa (índice único de v69), así que hay que
      quitar el anterior ANTES de poner el nuevo o el insert falla. */
  async function hacerPrincipal(x) {
    try {
      const actual = directivos.find((d) => d.vinc.principal);
      if (actual && actual.vinc.id !== x.vinc.id) {
        await updateRow('empresa_contactos', actual.vinc.id, { principal: false });
      }
      await updateRow('empresa_contactos', x.vinc.id, { principal: true });
      onCambio && onCambio();
    } catch (e) { setError('No se pudo cambiar el principal: ' + (e.message || '')); }
  }

  const tarjeta = (x, compacta) => {
    const malEmail = !emailValido(x.c.email);
    return (
      <div className={`rounded-xl border bg-[#0D3242] p-3 ${malEmail ? 'border-red-500/50' : 'border-[#1E5468]'}`}>
        <div className="flex items-start justify-between gap-2">
          <button onClick={() => onAbrirContacto && onAbrirContacto(x.c.id)} className="min-w-0 flex-1 text-left">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-[#EAF4F7]">{x.c.nombre} {x.c.apellidos || ''}</span>
              {/* Con varios directivos hay que ver de un vistazo cuál es el que
                  sale en los documentos y en la sincronización con Brevo. */}
              {x.vinc.principal && (
                <span className="chip bg-brand-orange/20 !px-1.5 !py-0 text-[9px] font-extrabold text-brand-orange"
                  title="Aparece en documentos y en Brevo">★ PRINCIPAL</span>
              )}
              {x.c.consentimiento_marketing && <span className="chip bg-emerald-500/15 !px-1.5 !py-0 text-[9px] text-emerald-300">RGPD</span>}
              {x.c.brevo_sincronizado_en && <span className="chip bg-brand-verde/15 !px-1.5 !py-0 text-[9px] text-brand-verdeTexto">Brevo</span>}
            </div>
            {x.c.cargo && <p className="text-xs font-semibold text-[#9FC0CB]">{x.c.cargo}</p>}
            <p className={`text-xs ${malEmail ? 'font-bold text-red-300' : 'text-[#7FA7B4]'}`}>
              {malEmail ? '⚠ sin email válido — obligatorio' : x.c.email}
              {x.c.telefono ? ` · ${x.c.telefono}` : ''}
            </p>
          </button>
          {puedeEditar && (
            <div className="flex shrink-0 items-center gap-1">
              {compacta && (
                <select value={x.vinc.rol} onChange={(e) => cambiarRol(x, e.target.value)}
                  className="input !w-32 !py-1 text-[11px]" aria-label={`Mover a ${x.c.nombre} de rol`}>
                  <option value="secundario">Secundario</option>
                  {ROLES_CONTACTO.map((r) => <option key={r.k} value={r.k}>{r.corto}</option>)}
                </select>
              )}
              {/* Copiar a otro rol sin dejar el actual */}
              <select value="" onChange={(e) => e.target.value && copiarARol(x, e.target.value)}
                className="input !w-24 !py-1 text-[11px]" aria-label={`Copiar a ${x.c.nombre} en otro rol`}
                title="La misma persona puede ocupar varios roles">
                <option value="">+ copiar…</option>
                {[...ROLES_CONTACTO.map((r) => [r.k, r.corto]), ['secundario', 'Secundario']]
                  .filter(([k]) => k !== x.vinc.rol && !vinculos.some((v) => String(v.contacto_id) === String(x.c.id) && v.rol === k))
                  .map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              {x.vinc.rol === 'directivo' && !x.vinc.principal && (
                <button onClick={() => hacerPrincipal(x)}
                  className="whitespace-nowrap rounded-full border border-[#1E5468] px-2 py-1 text-[10.5px] font-bold text-[#9FC0CB] hover:border-brand-orange hover:text-brand-orange"
                  title="Pasa a ser quien figura en documentos y en Brevo">
                  hacer principal
                </button>
              )}
              <button onClick={() => quitar(x)} className="px-1 text-xs text-[#7FA7B4] hover:text-red-400" title="Quitar de la empresa">✕</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Selector (buscar existente / crear nuevo) ────────────────────────────
  const selector = () => (
    <div className="space-y-3 rounded-xl border border-brand-verde/40 bg-[#0B2E3D] p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold uppercase tracking-wide text-brand-verdeTexto">
          {ROL_LABEL[asignando]}
        </p>
        <button onClick={cerrar} className="text-xs font-bold text-[#7FA7B4] hover:text-[#EAF4F7]">cerrar</button>
      </div>

      <div className="flex overflow-hidden rounded-xl border border-[#1E5468] text-xs font-bold">
        {[['buscar', 'Contacto existente'], ['crear', 'Crear nuevo']].map(([k, l]) => (
          <button key={k} onClick={() => { setModo(k); setError(null); }}
            className={`flex-1 px-3 py-2 ${modo === k ? 'bg-brand-verde text-[#061F2B]' : 'text-[#9FC0CB]'}`}>{l}</button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-500/10 p-2 text-xs font-bold text-red-300">{error}</p>}

      {modo === 'buscar' ? (
        <>
          <input className="input !py-2 text-sm" value={busqueda} placeholder="Buscar por nombre o email…"
            onChange={(e) => setBusqueda(e.target.value)} autoFocus />
          <div className="max-h-52 space-y-1 overflow-y-auto">
            {candidatos.length === 0 && (
              <p className="p-2 text-xs text-[#7FA7B4]">
                {contactos.length === 0 ? 'No hay contactos en el CRM todavía.' : 'Ningún contacto libre coincide. Créalo en la otra pestaña.'}
              </p>
            )}
            {candidatos.map((c) => {
              const malEmail = !emailValido(c.email);
              return (
                <button key={c.id} onClick={() => vincular(c)} disabled={ocupado}
                  className="block w-full rounded-lg px-2 py-1.5 text-left hover:bg-[#10394A] disabled:opacity-40">
                  <span className="text-sm font-semibold text-[#EAF4F7]">{c.nombre} {c.apellidos || ''}</span>
                  <span className={`ml-2 text-xs ${malEmail ? 'font-bold text-red-300' : 'text-[#7FA7B4]'}`}>
                    {malEmail ? 'sin email' : c.email}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input className="input !py-2 text-sm" placeholder="Nombre*" value={nuevo.nombre}
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} autoFocus />
            <input className="input !py-2 text-sm" placeholder="Apellidos" value={nuevo.apellidos}
              onChange={(e) => setNuevo({ ...nuevo, apellidos: e.target.value })} />
          </div>
          <input className="input !py-2 text-sm" placeholder="Cargo" value={nuevo.cargo}
            onChange={(e) => setNuevo({ ...nuevo, cargo: e.target.value })} />
          <div className="flex gap-2">
            <input className={`input !py-2 text-sm ${nuevo.email && !emailValido(nuevo.email) ? '!border-red-500/60' : ''}`}
              placeholder="Email* (obligatorio)" value={nuevo.email}
              onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} />
            <input className="input !py-2 text-sm" placeholder="Teléfono" value={nuevo.telefono}
              onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })} />
          </div>
          <label className="flex items-start gap-2 rounded-lg bg-white/5 p-2 text-xs font-semibold text-[#9FC0CB]">
            <input type="checkbox" className="mt-0.5" checked={!!nuevo.consentimiento_marketing}
              onChange={(e) => setNuevo({ ...nuevo, consentimiento_marketing: e.target.checked })} />
            <span>Consiente recibir comunicaciones comerciales (RGPD). Requisito para enviarlo a Brevo.</span>
          </label>
          <div className="flex justify-end">
            <button onClick={crearYVincular} disabled={ocupado} className="btn-orange !px-4 !py-2 text-sm disabled:opacity-40">
              {ocupado ? 'Creando…' : 'Crear y asignar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={desnudo ? 'space-y-2.5' : 'card space-y-4'}>
      {!desnudo && (
        <div>
          <h4 className="text-sm font-extrabold uppercase tracking-wide text-[#9FC0CB]">Contactos de la empresa</h4>
          <p className="mt-0.5 text-xs text-[#7FA7B4]">
            Los mismos registros que la pestaña Contactos: aquí solo se les asigna su papel en esta empresa.
          </p>
        </div>
      )}

      {/* ── Directivos: varios ── */}
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">
            <span className="text-brand-verdeTexto">★</span> Contactos directivos ({directivos.length})
          </p>
          {puedeEditar && directivos.length > 0 && (
            <button onClick={() => abrir('directivo')} className="text-xs font-bold text-brand-verdeTexto hover:underline">
              + añadir otro
            </button>
          )}
        </div>
        {directivos.length === 0 ? (
          puedeEditar ? (
            <button onClick={() => abrir('directivo')}
              className="w-full rounded-xl border border-dashed border-[#1E5468] p-3 text-left text-sm font-semibold text-[#7FA7B4] hover:border-brand-verde hover:text-[#EAF4F7]">
              + asignar directivo
            </button>
          ) : <p className="rounded-xl border border-dashed border-[#1E5468] p-3 text-sm text-[#7FA7B4]">sin asignar</p>
        ) : (
          <div className="space-y-2">
            {directivos.map((x) => <div key={x.vinc.id}>{tarjeta(x, true)}</div>)}
          </div>
        )}
        {asignando === 'directivo' && <div className="mt-2">{selector()}</div>}
        {directivos.length > 1 && !directivos.some((x) => x.vinc.principal) && (
          <p className="mt-1.5 text-[11px] font-bold text-amber-200">
            Ninguno está marcado como principal. El principal es quien aparece en los documentos.
          </p>
        )}
      </div>

      {/* Roles únicos: facturación y proyecto */}
      <div className="space-y-2">
        {ROLES_CONTACTO.filter((r) => r.k !== 'directivo').map((r) => {
          const x = porRol(r.k);
          return (
            <div key={r.k}>
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">
                <span className="text-brand-verdeTexto">{r.icono}</span> {r.label}
              </p>
              {x ? tarjeta(x) : puedeEditar ? (
                <button onClick={() => abrir(r.k)}
                  className="w-full rounded-xl border border-dashed border-[#1E5468] p-3 text-left text-sm font-semibold text-[#7FA7B4] hover:border-brand-verde hover:text-[#EAF4F7]">
                  + asignar {r.corto.toLowerCase()}
                </button>
              ) : (
                <p className="rounded-xl border border-dashed border-[#1E5468] p-3 text-sm text-[#7FA7B4]">sin asignar</p>
              )}
              {asignando === r.k && <div className="mt-2">{selector()}</div>}
            </div>
          );
        })}
      </div>

      {/* Bloque de secundarios */}
      <div className="border-t border-[#1E5468] pt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">
            Contactos secundarios ({secundarios.length})
          </p>
          {puedeEditar && (
            <button onClick={() => abrir('secundario')} className="text-xs font-bold text-brand-verdeTexto hover:underline">
              + añadir
            </button>
          )}
        </div>
        {secundarios.length === 0 && <p className="text-xs text-[#7FA7B4]">Ninguno.</p>}
        <div className="space-y-2">
          {secundarios.map((x) => <div key={x.vinc.id}>{tarjeta(x, true)}</div>)}
        </div>
        {asignando === 'secundario' && <div className="mt-2">{selector()}</div>}
      </div>
    </div>
  );
}
