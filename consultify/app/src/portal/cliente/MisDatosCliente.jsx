import { useState } from 'react';
import { supabase, DEMO } from '../../lib/supabase.js';
import { updateRow, insertRow, brevoFn } from '../../lib/data.js';
import { emailValido } from '../../lib/crm.js';

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

  // Contraseña, aparte
  const [pw, setPw] = useState({ nueva: '', repetir: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [pwBusy, setPwBusy] = useState(false);

  async function guardar() {
    if (!f.nombre.trim()) { setMsg({ err: true, t: 'El nombre no puede quedar vacío.' }); return; }
    setGuardando(true); setMsg(null);
    try {
      const datos = {
        nombre: f.nombre.trim(), apellidos: f.apellidos.trim() || null,
        cargo: f.cargo.trim() || null,
        telefono: f.telefono.trim() || null, movil: f.movil.trim() || null,
      };
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
      setMsg({ err: true, t: `No se pudo guardar: ${e?.message || e}` });
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

  const Campo = ({ id, etq, tipo = 'text', v, set }) => (
    <div>
      <label className="label" htmlFor={id}>{etq}</label>
      <input id={id} type={tipo} className="input !py-1.5 !text-[13px]" value={v} onChange={(e) => set(e.target.value)} />
    </div>
  );

  return (
    <div className="space-y-4">
      <section className="card">
        <h2 className="text-sm font-extrabold text-[#EAF4F7]">Tus datos</h2>
        <p className="mt-1 text-[11.5px] text-[#7FA7B4]">
          El correo es el de tu cuenta y no se cambia desde aquí: escríbenos si necesitas otro.
        </p>

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
