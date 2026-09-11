import { useState } from 'react';
import { supabase, DEMO } from '../../lib/supabase.js';
import { updateRow, insertRow, brevoFn } from '../../lib/data.js';
import { emailValido } from '../../lib/crm.js';
import ImagenSubible from '../../components/ImagenSubible.jsx';

// ════════════════════════════════════════════════════════════════════════════
// EDITAR MIS DATOS · zona de clientes
//
// Quien entra tiene derecho a corregir lo suyo sin escribir un correo pidiendo
// que se lo cambiemos. Dos bloques: sus datos de contacto y su contraseña.
//
// Al guardar se sincroniza con Brevo, pero SOLO si tiene consentimiento dado.
// Actualizar en Brevo a quien no lo dio es tratar sus datos para una finalidad
// que no aceptó.
// ════════════════════════════════════════════════════════════════════════════

// ⚠ FUERA del componente, a propósito.
//
// Definirlo dentro hace que React lo trate como un tipo NUEVO en cada
// renderizado: desmonta el <input> y monta otro, así que el campo pierde el
// foco tras cada letra y escribir se vuelve imposible. Es un fallo que parece
// magia negra y siempre es esto.
function Campo({ id, etq, tipo = 'text', v, set }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{etq}</label>
      <input id={id} type={tipo} className="input !py-1.5 !text-[13px]"
        value={v} onChange={(e) => set(e.target.value)} />
    </div>
  );
}

export default function MisDatosCliente({ contacto, empresa, email, onGuardado }) {
  const [f, setF] = useState({
    nombre: contacto?.nombre || '',
    apellidos: contacto?.apellidos || '',
    cargo: contacto?.cargo || '',
    telefono: contacto?.telefono || '',
    movil: contacto?.movil || '',
  });
  const [msg, setMsg] = useState(null);
  const [guardando, setGuardando] = useState(false);
  // RGPD: quien guarda sus datos acepta el tratamiento. Si ya lo aceptó, se
  // enseña la fecha y no se vuelve a pedir.
  const [rgpd, setRgpd] = useState(!!contacto?.rgpd_aceptado);

  // Contraseña, aparte
  const [pw, setPw] = useState({ nueva: '', repetir: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [pwBusy, setPwBusy] = useState(false);

  async function guardar() {
    if (!f.nombre.trim()) { setMsg({ err: true, t: 'El nombre no puede quedar vacío.' }); return; }
    if (!rgpd) { setMsg({ err: true, t: 'Para guardar hace falta aceptar el tratamiento de tus datos (RGPD).' }); return; }
    setGuardando(true); setMsg(null);
    try {
      const datos = {
        nombre: f.nombre.trim(), apellidos: f.apellidos.trim() || null,
        cargo: f.cargo.trim() || null,
        telefono: f.telefono.trim() || null, movil: f.movil.trim() || null,
      };
      if (!contacto?.rgpd_aceptado) { datos.rgpd_aceptado = true; datos.rgpd_fecha = new Date().toISOString(); }
      if (contacto?.id) await updateRow('contactos', contacto.id, datos);
      else await insertRow('contactos', { ...datos, email });

      // Brevo solo con consentimiento. Sin él, no se toca.
      if (contacto?.consentimiento_marketing) {
        try {
          await brevoFn({
            accion: 'contacto', email,
            attributes: {
              NOMBRE: datos.nombre, APELLIDOS: datos.apellidos || '',
              CARGO: datos.cargo || '', SMS: datos.movil || '',
              EMPRESA: empresa?.empresa || empresa?.nombre || '',
            },
          });
        } catch { /* que falle Brevo no puede impedir guardar en el CRM */ }
      }

      setMsg({ err: false, t: contacto?.consentimiento_marketing
        ? 'Datos guardados y sincronizados.'
        : 'Datos guardados.' });
      onGuardado && onGuardado();
    } catch (e) {
      const m = String(e?.message || e);
      setMsg({ err: true, t: `No se pudo guardar: ${m}${/rgpd_/i.test(m) ? ' Falta aplicar la migración v126 (contactos del cliente y RGPD).' : /row-level security|policy/i.test(m) ? ' Falta aplicar la migración v126, que permite al cliente corregir su propia ficha.' : ''}` });
    } finally { setGuardando(false); }
  }

  async function cambiarPassword() {
    if (pw.nueva.length < 8) { setPwMsg({ err: true, t: 'La contraseña necesita al menos 8 caracteres.' }); return; }
    if (pw.nueva !== pw.repetir) { setPwMsg({ err: true, t: 'Las dos contraseñas no coinciden.' }); return; }
    setPwBusy(true); setPwMsg(null);
    try {
      if (DEMO) { setPwMsg({ err: false, t: 'En modo demostración no se cambia de verdad.' }); return; }
      const { error } = await supabase.auth.updateUser({ password: pw.nueva });
      if (error) throw error;
      setPw({ nueva: '', repetir: '' });
      setPwMsg({ err: false, t: 'Contraseña cambiada. La próxima vez entra con la nueva.' });
    } catch (e) {
      setPwMsg({ err: true, t: `No se pudo cambiar: ${e?.message || e}` });
    } finally { setPwBusy(false); }
  }

  return (
    <div className="space-y-4">
      <section className="card">
        <div className="flex items-start gap-3">
          {contacto?.id && (
            <ImagenSubible tabla="contactos" id={contacto.id} campo="foto_url" valor={contacto.foto_url} tamano={56}
              inicial={(f.nombre || email || '?').charAt(0)} titulo="Tu foto" onCambio={() => onGuardado?.()} />
          )}
          <div>
            <h2 className="text-sm font-extrabold text-[#EAF4F7]">Tus datos</h2>
            <p className="mt-1 text-[11.5px] text-[#7FA7B4]">
              Son los mismos que tiene tu consultor en su ficha de contacto: lo que corrijas aquí lo ve al momento. El correo es el de tu cuenta y no se cambia desde aquí: escríbenos si necesitas otro.
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Campo id="md-nombre" etq="Nombre" v={f.nombre} set={(x) => setF({ ...f, nombre: x })} />
          <Campo id="md-apellidos" etq="Apellidos" v={f.apellidos} set={(x) => setF({ ...f, apellidos: x })} />
          <div>
            <label className="label" htmlFor="md-email">Correo</label>
            <input id="md-email" className="input !py-1.5 !text-[13px] opacity-60" value={email || ''} disabled />
          </div>
          <Campo id="md-cargo" etq="Cargo" v={f.cargo} set={(x) => setF({ ...f, cargo: x })} />
          <Campo id="md-tel" etq="Teléfono" tipo="tel" v={f.telefono} set={(x) => setF({ ...f, telefono: x })} />
          <Campo id="md-movil" etq="Móvil" tipo="tel" v={f.movil} set={(x) => setF({ ...f, movil: x })} />
        </div>

        <div className="mt-3 rounded-lg border border-[#1E5468] bg-[#0B2E3D] px-3 py-2">
          {contacto?.rgpd_aceptado ? (
            <p className="text-[11.5px] text-[#9FC0CB]">✓ Tratamiento de datos (RGPD) aceptado{contacto.rgpd_fecha ? ` el ${new Date(contacto.rgpd_fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}. <a href="/legal/privacidad.html" target="_blank" rel="noreferrer" className="font-bold text-brand-orange hover:underline">Política de privacidad</a></p>
          ) : (
            <label className="flex items-start gap-2 text-[12px] text-[#EAF4F7]">
              <input type="checkbox" className="mt-0.5" checked={rgpd} onChange={(e) => setRgpd(e.target.checked)} />
              <span>He leído la política de privacidad y acepto que TuConsultor trate mis datos de contacto para la prestación del servicio (RGPD y LOPDGDD). <a href="/legal/privacidad.html" target="_blank" rel="noreferrer" className="font-bold text-brand-orange hover:underline">Leer la política</a></span>
            </label>
          )}
        </div>
        {msg && (
          <p role={msg.err ? 'alert' : 'status'}
            className={`mt-3 rounded-lg px-3 py-2 text-[12.5px] font-bold ${msg.err ? 'bg-red-500/12 text-red-200' : 'bg-emerald-500/12 text-emerald-200'}`}>
            {msg.t}
          </p>
        )}

        <button onClick={guardar} disabled={guardando} className="btn-orange mt-3 !px-4 !py-1.5 text-xs disabled:opacity-50">
          {guardando ? 'Guardando…' : 'Guardar mis datos'}
        </button>
      </section>

      <section className="card">
        <h2 className="text-sm font-extrabold text-[#EAF4F7]">Cambiar la contraseña</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="md-pw1">Nueva contraseña</label>
            <input id="md-pw1" type="password" autoComplete="new-password" className="input !py-1.5 !text-[13px]"
              value={pw.nueva} onChange={(e) => setPw({ ...pw, nueva: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="md-pw2">Repítela</label>
            <input id="md-pw2" type="password" autoComplete="new-password" className="input !py-1.5 !text-[13px]"
              value={pw.repetir} onChange={(e) => setPw({ ...pw, repetir: e.target.value })} />
          </div>
        </div>
        {pwMsg && (
          <p role={pwMsg.err ? 'alert' : 'status'}
            className={`mt-3 rounded-lg px-3 py-2 text-[12.5px] font-bold ${pwMsg.err ? 'bg-red-500/12 text-red-200' : 'bg-emerald-500/12 text-emerald-200'}`}>
            {pwMsg.t}
          </p>
        )}
        <button onClick={cambiarPassword} disabled={pwBusy} className="btn-ghost mt-3 !px-4 !py-1.5 text-xs disabled:opacity-50">
          {pwBusy ? 'Cambiando…' : 'Cambiar contraseña'}
        </button>
      </section>
    </div>
  );
}
