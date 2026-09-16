import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { validarPassword, mensajePassword } from '../lib/password.js';
import { esGratuito, esInterno, listaInternos } from '../lib/dominios.js';
import { supabase } from '../lib/supabase.js';

function CampoPassword({ id, label, value, onChange, required, autoComplete, error }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative">
        <input id={id} type={visible ? 'text' : 'password'} required={required} autoComplete={autoComplete}
          className={`input pr-12 ${error ? '!border-red-400 focus:!ring-red-200' : ''}`} value={value} onChange={onChange} />
        <button type="button" onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#7FA7B4] transition hover:text-[#CFE3E9]">
          {visible ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {error && <p className="mt-1 text-xs font-bold text-red-300">{error}</p>}
    </div>
  );
}

// Tarjeta de acceso reutilizable (consultores | clientes)
function PanelAcceso({ acento, titulo, subtitulo, icono, children, footer }) {
  const ring = acento === 'navy' ? 'border-navy-800/15' : 'border-brand-orange/30';
  const head = acento === 'navy' ? 'text-[#EAF4F7]' : 'text-[#F9A83A]';
  const chip = acento === 'navy' ? 'bg-navy-800 text-white' : 'bg-brand-orange text-[#EAF4F7]';
  return (
    <div className={`card flex flex-col border ${ring}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${chip}`}>{icono}</span>
        <div>
          <h2 className={`text-lg font-extrabold ${head}`}>{titulo}</h2>
          <p className="text-xs font-semibold text-[#9FC0CB]">{subtitulo}</p>
        </div>
      </div>
      {children}
      {footer}
    </div>
  );
}


export default function Acceso() {
  const { login, register, demo, user, role } = useAuth();
  const nav = useNavigate();

  // Con sesión ya iniciada, esta pantalla no pinta nada: al panel que
  // corresponda. Antes se quedaba aquí pidiendo credenciales a quien ya estaba
  // dentro, con su propio correo visible en la barra lateral.
  useEffect(() => {
    if (!user) return;
    const esCliente = role === 'cliente';
    nav(esCliente ? '/clientes' : '/consultores', { replace: true });
  }, [user, role, nav]);

  // Estado consultores (solo login)
  const [c, setC] = useState({ email: '', password: '' });
  const [cMsg, setCMsg] = useState(null);
  const [cBusy, setCBusy] = useState(false);

  // ── Lo que trae la URL al llegar desde un correo (v143) ──
  // · Un enlace de invitación o de contraseña válido llega con un token en el
  //   hash (`type=invite` / `type=recovery`): su sitio es «crea tu contraseña»,
  //   no esta pantalla (si Supabase no tiene permitida esa URL de vuelta, cae
  //   aquí y, con sesión, se entraba sin contraseña).
  // · Uno caducado llega con `error_code=otp_expired`: se dice claro y se
  //   ofrece pedir otro. Antes solo salía «email o contraseña incorrectos».
  const [enlace, setEnlace] = useState(null);   // { caducado: bool, texto }
  useEffect(() => {
    const h = String(window.location.hash || '');
    if (!h) return;
    const q = new URLSearchParams(h.replace(/^#/, ''));
    const tipo = q.get('type');
    if (q.get('access_token') && (tipo === 'invite' || tipo === 'recovery' || tipo === 'signup')) { nav('/establecer-password' + h, { replace: true }); return; }
    if (q.get('error') || q.get('error_code')) {
      const cod = q.get('error_code') || '';
      setEnlace({ caducado: /expired|otp/i.test(cod) || /expired/i.test(q.get('error_description') || ''), texto: q.get('error_description') || cod });
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [nav]);

  // ── El código del correo (v143) ──
  // El correo de invitación trae un código de un solo uso «por si el botón no
  // funciona» y decía «introdúcelo en /app/acceso», pero aquí no había dónde.
  const [conCodigo, setConCodigo] = useState(false);
  const [codigo, setCodigo] = useState('');
  async function entrarConCodigo(e) {
    e.preventDefault(); setCBusy(true); setCMsg(null);
    try {
      if (!supabase) throw new Error('Sin conexión con el servicio de acceso.');
      const email = c.email.trim().toLowerCase(); const token = codigo.replace(/\s+/g, '');
      if (!email || !token) throw new Error('Escribe tu correo y el código del correo.');
      // El código vale para el tipo de correo que lo trajo: se prueban en orden.
      let ok = false, ultimo = null;
      for (const type of ['invite', 'recovery', 'magiclink', 'email', 'signup']) {
        const { error } = await supabase.auth.verifyOtp({ email, token, type });
        if (!error) { ok = true; break; }
        ultimo = error;
      }
      if (!ok) throw new Error(/expired|invalid/i.test(ultimo?.message || '') ? 'El código no es válido o ha caducado. Pide un enlace nuevo aquí abajo.' : (ultimo?.message || 'No se pudo entrar con el código.'));
      nav('/establecer-password', { replace: true });
    } catch (err) { setCMsg(err.message || 'No se pudo entrar con el código.'); }
    finally { setCBusy(false); }
  }

  // ── Pedir un enlace nuevo (invitación caducada u olvido de contraseña) ──
  const [pidiendo, setPidiendo] = useState(false);
  const [pedido, setPedido] = useState(null);
  async function pedirEnlace() {
    const email = c.email.trim().toLowerCase();
    if (!email) { setCMsg('Escribe tu correo y vuelve a pulsar.'); return; }
    setPidiendo(true); setCMsg(null); setPedido(null);
    try {
      const r = await fetch('/api/acceso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'reenviar', email }) });
      const j = await r.json().catch(() => ({ ok: false, error: `Sin respuesta (${r.status})` }));
      if (!j.ok) throw new Error(j.error);
      setPedido(j.mensaje || 'Enviado.');
    } catch (err) { setCMsg(err.message || 'No se pudo pedir el enlace.'); }
    finally { setPidiendo(false); }
  }

  // Estado clientes (login + registro)
  const [modo, setModo] = useState('login');
  const [k, setK] = useState({ email: '', password: '', password2: '', nombre: '', empresa: '' });
  const [kMsg, setKMsg] = useState(null);
  const [kBusy, setKBusy] = useState(false);

  const registro = modo === 'register';
  const pwVal = validarPassword(k.password);
  const passCorta = registro && k.password.length > 0 && !pwVal.ok;
  const noCoinciden = registro && k.password2.length > 0 && k.password !== k.password2;
  const registroInvalido = registro && (!pwVal.ok || k.password !== k.password2);

  const ROLES_EQUIPO = ['director', 'consultor', 'admin', 'superadmin', 'gestion'];

  async function loginConsultor(e) {
    e.preventDefault(); setCBusy(true); setCMsg(null);
    try {
      const { role } = await login(c.email, c.password);
      if (ROLES_EQUIPO.includes(role)) nav('/consultores');
      else { setCMsg('Esta cuenta no es de equipo. Usa el acceso de clientes.'); }
    } catch (err) {
      setCMsg(err.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos.' : (err.message || 'No se pudo entrar.'));
    } finally { setCBusy(false); }
  }

  async function submitCliente(e) {
    e.preventDefault();
    if (registroInvalido && !demo) return;
    setKBusy(true); setKMsg(null);
    try {
      if (modo === 'login') {
        const { role } = await login(k.email, k.password);
        nav(ROLES_EQUIPO.includes(role) ? '/consultores' : '/clientes');
      } else {
        if (esGratuito(k.email)) {
          setKMsg({ ok: false, text: 'Para registrarte hace falta un correo profesional (el dominio de tu empresa). Si solo tienes Gmail, Hotmail u otro genérico, pide a tu consultor que te invite: puede darte acceso con ese correo.' });
          setKBusy(false); return;
        }
        if (esInterno(k.email)) {
          setKMsg({ ok: false, text: `Las cuentas ${listaInternos()} son de equipo: entra directamente con tu contraseña, sin registro.` });
          setKBusy(false); return;
        }
        const r = await register(k.email, k.password, k.nombre, k.empresa);
        if (r.needsConfirm) setKMsg({ ok: true, text: 'Cuenta creada. Revisa tu email para confirmar el acceso.' });
        else nav('/clientes');
      }
    } catch (err) {
      setKMsg({ ok: false, text: err.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos.' : (err.message || 'No se pudo completar.') });
    } finally { setKBusy(false); }
  }

  const iconoConsultor = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  );
  const iconoCliente = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8 text-center">
        <img src="/app/marca/orbita-vertical-anim.svg" alt="Orbita.PMTools" className="tc-logo-animado mx-auto mb-3 h-24 w-auto" />
        <h1 className="font-orbita text-2xl font-extrabold text-[#EAF4F7]">El ecosistema digital de TuConsultor</h1>
        <p className="mt-1 text-sm font-medium text-[#9FC0CB]">Elige tu tipo de acceso.</p>
        {demo && (
          <p className="mx-auto mt-3 max-w-xl rounded-xl bg-brand-verde/10 p-3 text-xs font-semibold text-brand-verdeTexto">
            Modo demo (sin Supabase): cualquier email entra. Usa un email con «consultify» para la zona de consultores.
          </p>
        )}
      </div>

      <div className="grid items-start gap-6 md:grid-cols-2">
        {/* ─── CONSULTORES ─── */}
        <PanelAcceso acento="navy" titulo="Consultores" subtitulo="Equipo y administración" icono={iconoConsultor}
          footer={<p className="mt-4 text-center text-xs font-medium text-[#9FC0CB]">¿Sin cuenta de consultoría? La crea la administración desde la zona de equipo.</p>}>
          {enlace && (
            <div className="mb-4 rounded-xl border border-brand-orange/50 bg-brand-orange/10 px-3 py-2.5 text-[12.5px] leading-relaxed text-[#EAF4F7]">
              <p className="font-extrabold text-brand-orange">{enlace.caducado ? 'El enlace del correo ha caducado o ya se usó' : 'El enlace del correo no es válido'}</p>
              <p className="mt-1 text-[#CFE3E9]">Los enlaces de invitación y de contraseña valen una sola vez y durante un tiempo limitado. Escribe tu correo y pulsa <b>«Pedir un enlace nuevo»</b>: te llega otro al momento. El código de ocho cifras del correo <b>no es tu contraseña</b>: se usa en «Tengo un código del correo».</p>
            </div>
          )}
          <form onSubmit={conCodigo ? entrarConCodigo : loginConsultor} className="space-y-4">
            <div><label className="label" htmlFor="c-email">Email corporativo</label><input id="c-email" type="email" required className="input" autoComplete="email" value={c.email} onChange={e => setC({ ...c, email: e.target.value })} /></div>
            {conCodigo ? (
              <div>
                <label className="label" htmlFor="c-codigo">Código del correo</label>
                <input id="c-codigo" className="input tracking-[0.2em]" inputMode="numeric" autoComplete="one-time-code" placeholder="12345678" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
                <p className="mt-1 text-[11px] text-[#7FA7B4]">El de «o usa este código» del correo de invitación o de contraseña. Vale una vez; si ha caducado, pide un enlace nuevo.</p>
              </div>
            ) : (
              <CampoPassword id="c-pass" label="Contraseña" value={c.password} onChange={e => setC({ ...c, password: e.target.value })} required={!demo} autoComplete="current-password" />
            )}
            {cMsg && <p className="text-sm font-bold text-red-300">{cMsg}</p>}
            {pedido && <p className="text-sm font-bold text-emerald-300">{pedido}</p>}
            <button disabled={cBusy} className="btn-primary w-full">{cBusy ? 'Un momento…' : conCodigo ? 'Entrar con el código' : 'Entrar como consultor'}</button>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12px] font-bold">
              <button type="button" onClick={() => { setConCodigo((v) => !v); setCMsg(null); }} className="text-[#9FC0CB] hover:text-[#EAF4F7]">{conCodigo ? 'Entrar con contraseña' : 'Tengo un código del correo'}</button>
              <button type="button" onClick={pedirEnlace} disabled={pidiendo} className="text-brand-orange hover:underline disabled:opacity-50" title="Invitación caducada o contraseña olvidada: te llega un enlace nuevo al correo">{pidiendo ? 'Enviando…' : 'Pedir un enlace nuevo'}</button>
            </div>
          </form>
        </PanelAcceso>

        {/* ─── CLIENTES ─── */}
        <PanelAcceso acento="orange" titulo="Clientes" subtitulo={registro ? 'Crear cuenta para seguir tus servicios' : 'Seguimiento de servicios y presupuestos'} icono={iconoCliente}
          footer={
            <button onClick={() => { setModo(m => m === 'login' ? 'register' : 'login'); setKMsg(null); setK(p => ({ ...p, password: '', password2: '' })); }}
              className="mt-4 w-full text-center text-sm font-bold text-[#F9A83A] hover:underline">
              {registro ? '¿Ya tienes cuenta? Entrar' : '¿Aún no tienes cuenta? Crear cuenta de cliente'}
            </button>
          }>
          <form onSubmit={submitCliente} className="space-y-4">
            {registro && (
              <>
                <div><label className="label" htmlFor="k-nombre">Nombre</label><input id="k-nombre" required className="input" autoComplete="name" value={k.nombre} onChange={e => setK({ ...k, nombre: e.target.value })} /></div>
                <div><label className="label" htmlFor="k-empresa">Empresa</label><input id="k-empresa" required className="input" autoComplete="organization" value={k.empresa} onChange={e => setK({ ...k, empresa: e.target.value })} /></div>
              </>
            )}
            <div><label className="label" htmlFor="k-email">Email</label><input id="k-email" type="email" required className="input" autoComplete="email" value={k.email} onChange={e => setK({ ...k, email: e.target.value })} /></div>
            <CampoPassword id="k-pass" label="Contraseña" value={k.password} onChange={e => setK({ ...k, password: e.target.value })} required={!demo} autoComplete={registro ? 'new-password' : 'current-password'} error={passCorta ? mensajePassword(k.password) : null} />
            {registro && <CampoPassword id="k-pass2" label="Confirmar contraseña" value={k.password2} onChange={e => setK({ ...k, password2: e.target.value })} required={!demo} autoComplete="new-password" error={noCoinciden ? 'Las contraseñas no coinciden.' : null} />}
            {kMsg && <p className={`text-sm font-bold ${kMsg.ok ? 'text-green-700' : 'text-red-300'}`}>{kMsg.text}</p>}
            <button disabled={kBusy || (registroInvalido && !demo)} className="btn-orange w-full">{kBusy ? 'Un momento…' : registro ? 'Crear cuenta' : 'Entrar como cliente'}</button>
          </form>
        </PanelAcceso>
      </div>
    </div>
  );
}
