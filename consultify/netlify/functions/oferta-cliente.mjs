// ════════════════════════════════════════════════════════════════════════════
// LA OFERTA DESDE EL CORREO · ver, aceptar o rechazar con el enlace (v138)
//
// El correo al cliente lleva /app/oferta?t=<token>. Quien lo abre no tiene
// sesión: el token es la clave. Acciones (POST, JSON), todas públicas por token:
//   ver       {token}                       · la oferta, su estado y si el correo tiene cuenta en Órbita
//   entrar    {token}                       · si el correo tiene cuenta: un token de un solo uso para entrar sin contraseña
//   aceptar   {token, rgpd, marketing}      · acepta (queda IP y navegador); registra el RGPD si lo marca
//   rechazar  {token, motivo}               · rechaza con motivo
//   acceso    {token}                       · tras aceptar: alta en la cuenta de cliente e invitación al portal
//
// Lo que decide el cliente pasa por `cambiar_estado_oferta` con actor
// «cliente», igual que desde el portal: una sola regla de transiciones.
// ════════════════════════════════════════════════════════════════════════════
import { NORMA_BY_ID } from '../../app/src/lib/calcEngine.js';
import { RGPD_VERSION, RGPD_TEXTO, RGPD_CASILLAS } from '../../app/src/lib/rgpd.js';
import { limpiarFila } from '../../app/src/lib/capitalizar.js';
import { sincronizarContactoBrevo } from './brevo-contacto.mjs';

const env = (n) => process.env[n] || '';
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
const SITE = () => env('SITE_URL') || 'https://consultify.tuconsultor.com';
const REMITENTE = () => env('BREVO_SENDER_EMAIL') || 'hola@tuconsultor.com';
const COPIA_INTERNA = () => env('OFERTA_COPIA_EMAIL') || 'hola@tuconsultor.com';
const low = (v) => String(v ?? '').trim().toLowerCase();

async function sb(path, { method = 'GET', body, headers = {} } = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  return fetch(`${env('SUPABASE_URL')}${path}`, {
    method, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}
const leer = async (path) => { const r = await sb(path); return r.ok ? r.json() : []; };

const CAMPOS = 'id,numero_oferta,empresa,nombre,contacto_nombre,contacto_apellidos,email,cif,normas,modelo,precio,tipo,meses,notas_oferta,url_pdf,estado,fecha_emision,valida_hasta,fecha_inicio,fecha_fin,forma_pago,comercial,motivo_rechazo,aceptada_en,rechazada_en,contacto_id,empresa_id,emisora_id,sedes,token_acceso';

async function ofertaPorToken(token) {
  if (!/^[0-9a-f-]{36}$/i.test(String(token || ''))) return null;
  return (await leer(`/rest/v1/presupuestos?token_acceso=eq.${token}&select=${CAMPOS}`))?.[0] || null;
}

function caducada(o) {
  if (o.estado === 'caducada') return true;
  if (o.estado !== 'emitida' || !o.valida_hasta) return false;
  return new Date(o.valida_hasta) < new Date(new Date().toISOString().slice(0, 10));
}

async function tieneCuenta(email) {
  if (!email) return false;
  const p = await leer(`/rest/v1/perfiles?email=eq.${encodeURIComponent(low(email))}&select=id,activo&limit=1`);
  return !!p?.[0] && p[0].activo !== false;
}

/** El contacto de la oferta: por id o, si no, por correo. */
async function contactoDe(o) {
  if (o.contacto_id) {
    const c = (await leer(`/rest/v1/contactos?id=eq.${o.contacto_id}&select=id,email,nombre,rgpd_aceptado,rgpd_fecha,consentimiento_marketing`))?.[0];
    if (c) return c;
  }
  if (o.email) return (await leer(`/rest/v1/contactos?email=eq.${encodeURIComponent(low(o.email))}&select=id,email,nombre,rgpd_aceptado,rgpd_fecha,consentimiento_marketing&limit=1`))?.[0] || null;
  return null;
}

async function registrarRgpd(contacto, { marketing, ip, ua, nota }) {
  const ahora = new Date().toISOString();
  const patch = { rgpd_aceptado: true, rgpd_fecha: ahora };
  if (marketing) { patch.consentimiento_marketing = true; patch.consentimiento_fecha = ahora; }
  await sb(`/rest/v1/contactos?id=eq.${contacto.id}`, { method: 'PATCH', body: patch, headers: { Prefer: 'return=minimal' } });
  await sb('/rest/v1/consentimientos_rgpd', { method: 'POST', body: { contacto_id: contacto.id, canal: 'oferta', acepta_datos: true, acepta_marketing: !!marketing, texto_version: RGPD_VERSION, ip, user_agent: ua, nota }, headers: { Prefer: 'return=minimal' } });
  return sincronizarContactoBrevo(contacto.id);
}

function vista(o, extra = {}) {
  const normas = (Array.isArray(o.normas) ? o.normas : []).map((n) => NORMA_BY_ID?.[n]?.nombre || String(n));
  return {
    id: o.id, numero: o.numero_oferta, empresa: o.empresa, contacto: o.nombre || `${o.contacto_nombre || ''} ${o.contacto_apellidos || ''}`.trim(), email: o.email,
    normas, modelo: o.modelo, precio: o.precio, tipo: o.tipo, meses: o.meses, notas: o.notas_oferta, url_pdf: o.url_pdf,
    estado: caducada(o) ? 'caducada' : o.estado, fecha_emision: o.fecha_emision, valida_hasta: o.valida_hasta, fecha_inicio: o.fecha_inicio, fecha_fin: o.fecha_fin,
    forma_pago: o.forma_pago, comercial: o.comercial, aceptada_en: o.aceptada_en, rechazada_en: o.rechazada_en, motivo_rechazo: o.motivo_rechazo,
    ...extra,
  };
}

async function avisarEquipo(o, { decision, motivo, ip }) {
  const apiKey = env('BREVO_API_KEY');
  if (!apiKey) return;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0C1424;font-size:14px;line-height:1.6">
      <h2 style="color:#061B45;margin:0 0 6px">Oferta ${o.numero_oferta || ''} · ${decision === 'aceptada' ? 'ACEPTADA' : 'rechazada'} por el cliente</h2>
      <p style="color:#5B6B86;margin:0 0 12px">Desde el enlace del correo · ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}${ip ? ` · IP ${ip}` : ''}</p>
      <table cellpadding="6" style="border-collapse:collapse;font-size:14px">
        <tr><td style="color:#5B6B86">Cliente</td><td><strong>${o.empresa || '—'}</strong></td></tr>
        <tr><td style="color:#5B6B86">Persona</td><td>${o.nombre || '—'} · ${o.email || ''}</td></tr>
        <tr><td style="color:#5B6B86">Modelo</td><td>${o.modelo || '—'}</td></tr>
        <tr><td style="color:#5B6B86">Importe</td><td><strong>${Number(o.precio || 0).toLocaleString('es-ES')} €${o.tipo === 'mes' ? '/mes' : ''}</strong></td></tr>
        ${motivo ? `<tr><td style="color:#5B6B86">Motivo</td><td>${motivo}</td></tr>` : ''}
        <tr><td style="color:#5B6B86">Comercial</td><td>${o.comercial || 'Alejandro'}</td></tr>
      </table>
      <p style="margin:14px 0 0"><a href="${SITE()}/app/consultores/ofertas" style="color:#F5A623;font-weight:bold">Abrir en Órbita</a>${decision === 'aceptada' ? ' · toca preparar el contrato' : ''}</p>
    </div>`;
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: { name: 'Consultify · Ofertas', email: REMITENTE() }, to: [{ email: COPIA_INTERNA(), name: 'TuConsultor' }], subject: `${decision === 'aceptada' ? '✓ Aceptada' : '✗ Rechazada'} · Oferta ${o.numero_oferta || ''} · ${o.empresa || ''}`, htmlContent: html }),
  }).catch(() => {});
}

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido' }, 405);
  if (!env('SUPABASE_URL') || !env('SUPABASE_SERVICE_ROLE_KEY')) return json({ ok: false, error: 'Backend no configurado.' }, 500);
  let body = {};
  try { body = await req.json(); } catch { body = {}; }
  const { action } = body;
  const o = await ofertaPorToken(body.token);
  if (!o) return json({ ok: false, error: 'Este enlace no corresponde a ninguna oferta o ya no es válido.' }, 404);
  const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || null;
  const ua = req.headers.get('user-agent') || null;

  if (action === 'ver') {
    const [cuenta, contacto] = await Promise.all([tieneCuenta(o.email), contactoDe(o)]);
    return json({ ok: true, oferta: vista(o), tieneCuenta: cuenta, rgpd: { aceptado: !!contacto?.rgpd_aceptado, marketing: !!contacto?.consentimiento_marketing, texto: RGPD_TEXTO, casillas: RGPD_CASILLAS, version: RGPD_VERSION } });
  }

  // ── Entrar sin contraseña: solo si el correo ya tiene cuenta ──
  if (action === 'entrar') {
    if (!o.email || !(await tieneCuenta(o.email))) return json({ ok: false, error: 'Ese correo no tiene cuenta en Órbita.' }, 404);
    const r = await sb('/auth/v1/admin/generate_link', { method: 'POST', body: { type: 'magiclink', email: low(o.email) } });
    if (!r.ok) return json({ ok: false, error: 'No se pudo preparar el acceso.' }, 502);
    const j = await r.json();
    const hashed = j?.hashed_token || j?.properties?.hashed_token;
    if (!hashed) return json({ ok: false, error: 'No se pudo preparar el acceso.' }, 502);
    return json({ ok: true, token_hash: hashed, email: low(o.email), oferta_id: o.id });
  }

  // ── Aceptar o rechazar ──
  if (action === 'aceptar' || action === 'rechazar') {
    const estadoActual = caducada(o) ? 'caducada' : o.estado;
    if (estadoActual !== 'emitida') {
      const msg = estadoActual === 'aceptada' ? 'Esta oferta ya está aceptada.' : estadoActual === 'rechazada' ? 'Esta oferta ya fue rechazada.' : estadoActual === 'caducada' ? 'Esta oferta ha caducado. Pídenos una nueva y te la enviamos al momento.' : 'Esta oferta todavía no está emitida.';
      return json({ ok: false, error: msg, estado: estadoActual }, 409);
    }
    const nuevo = action === 'aceptar' ? 'aceptada' : 'rechazada';
    const motivo = action === 'rechazar' ? String(body.motivo || '').trim() : null;
    if (nuevo === 'rechazada' && !motivo) return json({ ok: false, error: 'Para rechazar cuéntanos brevemente por qué: nos ayuda a mejorar.' }, 400);
    const r = await sb('/rest/v1/rpc/cambiar_estado_oferta', { method: 'POST', body: { p_id: o.id, p_estado: nuevo, p_motivo: motivo, p_actor: 'cliente' } });
    const res = r.ok ? await r.json() : null;
    if (!res || res.ok === false) return json({ ok: false, error: res?.error || 'No se pudo registrar la decisión.' }, 502);
    await sb(`/rest/v1/presupuestos?id=eq.${o.id}`, { method: 'PATCH', body: { decidida_por_enlace: true, ...(nuevo === 'aceptada' ? { aceptada_ip: ip, aceptada_user_agent: ua } : {}) }, headers: { Prefer: 'return=minimal' } }).catch(() => {});

    // RGPD marcado en la misma pantalla: queda registrado con canal «oferta».
    let rgpd = null;
    if (body.rgpd) {
      const contacto = await contactoDe(o);
      if (contacto) rgpd = await registrarRgpd(contacto, { marketing: !!body.marketing, ip, ua, nota: `Al ${nuevo === 'aceptada' ? 'aceptar' : 'responder'} la oferta ${o.numero_oferta || ''} por el enlace` });
    }
    await avisarEquipo(o, { decision: nuevo, motivo, ip });
    return json({ ok: true, estado: nuevo, fecha: new Date().toISOString(), rgpd: rgpd ? (rgpd.ok ? 'ok' : rgpd.motivo) : null, tieneCuenta: await tieneCuenta(o.email) });
  }

  // ── Acceso al portal tras aceptar: cuenta de cliente + invitación ──
  if (action === 'acceso') {
    if (o.estado !== 'aceptada') return json({ ok: false, error: 'El acceso al portal se da con la oferta aceptada.' }, 409);
    const correo = low(o.email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return json({ ok: false, error: 'La oferta no tiene un correo válido.' }, 400);
    const cif = String(o.cif || '').toUpperCase().replace(/[\s.\-]/g, '');
    if (!cif) return json({ ok: false, error: 'La oferta no tiene CIF: escríbenos y te damos el acceso a mano.' }, 400);
    let cliente = (await leer(`/rest/v1/clientes?select=id,empresa,cif&cif=ilike.${encodeURIComponent(cif)}&limit=1`))?.[0] || null;
    if (!cliente) {
      const ins = await sb('/rest/v1/clientes', { method: 'POST', body: limpiarFila('clientes', { empresa: o.empresa || cif, cif, email: correo, contacto: o.nombre || null }), headers: { Prefer: 'return=representation' } });
      cliente = ins.ok ? (await ins.json())?.[0] : null;
      if (!cliente) return json({ ok: false, error: 'No se pudo crear la ficha de cliente.' }, 502);
    }
    const ya = (await leer(`/rest/v1/cliente_usuarios?cliente_id=eq.${cliente.id}&email=eq.${encodeURIComponent(correo)}&select=id&limit=1`))?.[0];
    if (!ya) await sb('/rest/v1/cliente_usuarios', { method: 'POST', body: { cliente_id: cliente.id, email: correo, nombre: o.nombre || null, rol_cuenta: 'admin' }, headers: { Prefer: 'return=minimal' } });
    if (await tieneCuenta(correo)) return json({ ok: true, resultado: 'ya_tenia_cuenta', email: correo });
    const nombre = limpiarFila('perfiles', { nombre: o.contacto_nombre || String(o.nombre || '').split(' ')[0] || '' }).nombre || '';
    const inv = await sb('/auth/v1/invite', { method: 'POST', body: { email: correo, data: { nombre, rol: 'cliente' }, redirect_to: `${SITE()}/app/establecer-password` } });
    if (!inv.ok) {
      const t = await inv.text();
      if (/already|registered/i.test(t)) return json({ ok: true, resultado: 'ya_tenia_cuenta', email: correo });
      return json({ ok: false, error: 'No se pudo enviar la invitación. Escríbenos y te la mandamos a mano.' }, 502);
    }
    const u = await inv.json().catch(() => null);
    if (u?.id) await sb(`/rest/v1/perfiles?id=eq.${u.id}`, { method: 'PATCH', body: { rol: 'cliente', nombre, email: correo, invitado_en: new Date().toISOString(), activo: true }, headers: { Prefer: 'return=minimal' } }).catch(() => {});
    return json({ ok: true, resultado: 'invitada', email: correo });
  }

  return json({ ok: false, error: 'Acción no reconocida.' }, 400);
};

export const config = { path: '/api/oferta-cliente' };
