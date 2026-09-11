import { useState } from 'react';
import { supabase, DEMO } from '../lib/supabase.js';
import { updateRow } from '../lib/data.js';
import { CANALES_CONSENTIMIENTO, enlaceConsentimiento } from '../lib/rgpd.js';

// ════════════════════════════════════════════════════════════════════════════
// CONSENTIMIENTO RGPD DE UN CONTACTO · la ayuda para «pasarle el RGPD»
//
// Estado (aceptado / marketing / pendiente) y tres formas de conseguirlo:
//   · Enviar por correo el enlace personal (Brevo): lo acepta en la web.
//   · Copiar el enlace, para mandarlo por WhatsApp o desde el correo propio.
//   · Registrarlo a mano si ya lo dio por otra vía (formulario, verbal).
// Todo pasa por /api/consentimiento (v135), que deja la prueba.
// ════════════════════════════════════════════════════════════════════════════

async function llamar(payload) {
  const { data } = await supabase.auth.getSession();
  const r = await fetch('/api/consentimiento', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data?.session?.access_token || ''}` },
    body: JSON.stringify(payload),
  });
  return r.json().catch(() => ({ ok: false, error: `Sin respuesta (${r.status})` }));
}

const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-ES') : '');

export default function ConsentimientoRgpd({ contacto, puedeEditar = true, onCambio, compacto = false }) {
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [canal, setCanal] = useState('formulario');
  const [marketing, setMarketing] = useState(false);
  const [nota, setNota] = useState('');
  if (!contacto?.id) return null;
  const aceptado = !!contacto.rgpd_aceptado;
  const mk = !!contacto.consentimiento_marketing;

  async function enviar() {
    if (!contacto.email) { setMsg({ err: true, t: 'El contacto no tiene correo.' }); return; }
    setOcupado(true); setMsg(null);
    try {
      if (DEMO) { setMsg({ err: false, t: `(demo) Se enviaría a ${contacto.email} el enlace ${enlaceConsentimiento('demo-token')}` }); return; }
      const j = await llamar({ action: 'enviar', contacto_id: contacto.id });
      if (!j.ok) throw new Error(j.error);
      setMsg({ err: false, t: `Enviado a ${j.email}. Cuando lo acepte quedará registrado aquí.` });
    } catch (e) { setMsg({ err: true, t: String(e?.message || e) }); }
    finally { setOcupado(false); }
  }
  async function copiar() {
    setOcupado(true); setMsg(null);
    try {
      const enlace = DEMO ? enlaceConsentimiento('demo-token') : (await llamar({ action: 'enlace', contacto_id: contacto.id }));
      const url = typeof enlace === 'string' ? enlace : (enlace.ok ? enlace.enlace : null);
      if (!url) throw new Error(enlace.error || 'Sin enlace.');
      await navigator.clipboard?.writeText(url);
      setMsg({ err: false, t: `Enlace copiado: ${url}` });
    } catch (e) { setMsg({ err: true, t: String(e?.message || e) }); }
    finally { setOcupado(false); }
  }
  async function registrar() {
    setOcupado(true); setMsg(null);
    try {
      if (DEMO) {
        await updateRow('contactos', contacto.id, { rgpd_aceptado: true, rgpd_fecha: new Date().toISOString(), ...(marketing ? { consentimiento_marketing: true, consentimiento_fecha: new Date().toISOString() } : {}) });
      } else {
        const j = await llamar({ action: 'registrar', contacto_id: contacto.id, canal, marketing, nota: nota.trim() || null });
        if (!j.ok) throw new Error(j.error);
      }
      setMsg({ err: false, t: 'Consentimiento registrado.' }); setRegistrando(false); onCambio?.();
    } catch (e) { setMsg({ err: true, t: String(e?.message || e) }); }
    finally { setOcupado(false); }
  }

  return (
    <div className={compacto ? 'space-y-1' : 'space-y-1.5'}>
      <div className="flex flex-wrap items-center gap-1.5">
        {aceptado
          ? <span className="chip !px-2 !py-0 bg-emerald-500/15 text-[10px] text-emerald-300" title={`Aceptó el tratamiento de datos${contacto.rgpd_fecha ? ` el ${fecha(contacto.rgpd_fecha)}` : ''}`}>✓ RGPD {contacto.rgpd_fecha ? fecha(contacto.rgpd_fecha) : ''}</span>
          : <span className="chip !px-2 !py-0 bg-amber-400/15 text-[10px] text-amber-200">RGPD pendiente</span>}
        {mk
          ? <span className="chip !px-2 !py-0 bg-emerald-500/15 text-[10px] text-emerald-300" title={contacto.consentimiento_fecha ? `Desde ${fecha(contacto.consentimiento_fecha)}` : ''}>✓ Comunicaciones</span>
          : <span className="chip !px-2 !py-0 bg-white/5 text-[10px] text-[#7FA7B4]">Sin comunicaciones</span>}
        {puedeEditar && (
          <span className="ml-1 flex flex-wrap gap-1.5">
            <button type="button" onClick={enviar} disabled={ocupado} className="text-[11px] font-bold text-brand-orange hover:underline disabled:opacity-50" title="Le llega un correo con su enlace personal para aceptar">✉ Pedir por correo</button>
            <button type="button" onClick={copiar} disabled={ocupado} className="text-[11px] font-bold text-[#9FC0CB] hover:text-[#EAF4F7] disabled:opacity-50" title="Para mandarlo por WhatsApp o desde tu correo">⧉ Copiar enlace</button>
            <button type="button" onClick={() => setRegistrando((v) => !v)} disabled={ocupado} className="text-[11px] font-bold text-[#9FC0CB] hover:text-[#EAF4F7] disabled:opacity-50" title="Ya lo dio por otra vía: se anota con fecha y canal">✎ Registrar</button>
          </span>
        )}
      </div>
      {registrando && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[#0B2E3D] px-2.5 py-2 text-[11.5px]">
          <select className="input !w-auto !py-1 !text-[11.5px]" value={canal} onChange={(e) => setCanal(e.target.value)}>
            {CANALES_CONSENTIMIENTO.filter(([k]) => k !== 'enlace').map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <label className="flex items-center gap-1 text-[#CFE3E9]"><input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} /> también comunicaciones</label>
          <input className="input !w-56 !py-1 !text-[11.5px]" placeholder="Nota (p. ej. «correo del 3/9»)" value={nota} onChange={(e) => setNota(e.target.value)} />
          <button type="button" onClick={registrar} disabled={ocupado} className="btn-orange !px-2.5 !py-1 text-[11.5px] disabled:opacity-50">Guardar</button>
          <button type="button" onClick={() => setRegistrando(false)} className="text-[11px] font-bold text-[#7FA7B4]">cancelar</button>
        </div>
      )}
      {msg && <p className={`break-all text-[11.5px] font-bold ${msg.err ? 'text-red-300' : 'text-emerald-300'}`}>{msg.t}</p>}
    </div>
  );
}
