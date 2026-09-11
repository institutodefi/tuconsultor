// ════════════════════════════════════════════════════════════════════════════
// CONSENTIMIENTO RGPD · pedirlo, aceptarlo y dejar prueba (v135)
//
// Acciones (POST, JSON):
//   enviar    {contacto_id}                 · equipo · manda el correo con el enlace personal (Brevo)
//   enlace    {contacto_id}                 · equipo · devuelve el enlace, para copiarlo o mandarlo a mano
//   registrar {contacto_id, canal, nota, marketing} · equipo · anota un consentimiento dado por otra vía
//   ver       {token}                       · público · qué se va a aceptar y a nombre de quién
//   aceptar   {token, datos, marketing}     · público · registra la aceptación (IP y navegador incluidos)
//
// Público quiere decir sin sesión: quien recibe el enlace no es usuario de la
// app. El token es la clave; sin él no se ve ni se acepta nada.
// ════════════════════════════════════════════════════════════════════════════
import { RGPD_VERSION, RGPD_TEXTO, RGPD_CASILLAS } from '../../app/src/lib/rgpd.js';

const env = (n) => process.env[n] || '';
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
const SITE = () => env('SITE_URL') || 'https://consultify.tuconsultor.com';
const REMITENTE = () => env('BREVO_SENDER_EMAIL') || 'hola@tuconsultor.com';

async function sb(path, { method = 'GET', body, headers = {} } = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  return fetch(`${env('SUPABASE_URL')}${path}`, {
    method, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}
const leer = async (path) => { const r = await sb(path); return r.ok ? r.json() : []; };

async function quienLlama(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const u = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, { headers: { apikey: env('SUPABASE_ANON_KEY') || env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: `Bearer ${token}` } });
  if (!u.ok) return null;
  const { id } = await u.json();
  if (!id) return null;
  const p = await leer(`/rest/v1/perfiles?id=eq.${id}&select=id,rol,activo,nombre`);
  const perfil = p?.[0];
  if (!perfil || perfil.activo === false || !['superadmin', 'admin', 'director', 'consultor', 'gestion'].includes(perfil.rol)) return null;
  return perfil;
}

async function contactoConToken(id) {
  const c = (await leer(`/rest/v1/contactos?id=eq.${id}&select=id,nombre,apellidos,email,consentimiento_token,consentimiento_marketing,consentimiento_fecha,rgpd_aceptado,rgpd_fecha`))?.[0];
  if (!c) return null;
  if (!c.consentimiento_token) {
    const up = await sb(`/rest/v1/contactos?id=eq.${id}`, { method: 'PATCH', body: { consentimiento_token: crypto.randomUUID() }, headers: { Prefer: 'return=representation' } });
    if (up.ok) return (await up.json())?.[0] || c;
  }
  return c;
}

async function empresaDe(contactoId) {
  const v = await leer(`/rest/v1/empresa_contactos?contacto_id=eq.${contactoId}&select=empresa_id,principal&order=principal.desc&limit=1`);
  if (!v?.[0]) return null;
  return (await leer(`/rest/v1/empresas?id=eq.${v[0].empresa_id}&select=id,nombre,nombre_comercial`))?.[0] || null;
}

async function enviarCorreo({ email, nombre, enlace, remitenteNombre }) {
  const apiKey = env('BREVO_API_KEY');
  if (!apiKey) return { ok: false, motivo: 'Falta BREVO_API_KEY en Netlify.' };
  const saludo = nombre ? `Hola ${String(nombre).split(' ')[0]},` : 'Hola,';
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0C1424;font-size:15px;line-height:1.7">
      <p>${saludo}</p>
      <p>Para poder seguir en contacto contigo y gestionar nuestra relación profesional necesitamos que confirmes cómo tratamos tus datos. Es un minuto:</p>
      <p style="margin:22px 0"><a href="${enlace}" style="background:#F39C30;color:#0C1424;font-weight:bold;padding:12px 22px;border-radius:10px;text-decoration:none">Revisar y aceptar</a></p>
      <p style="color:#4B5A70;font-size:13px">Si el botón no funciona, copia este enlace en el navegador:<br><a href="${enlace}" style="color:#1B4F66">${enlace}</a></p>
      <p>En esa página verás quién trata tus datos, para qué y cómo ejercer tus derechos. Podrás marcar aparte si quieres recibir información nuestra.</p>
      <p style="margin-top:20px">Gracias,<br><strong>${remitenteNombre || 'El equipo de TuConsultor'}</strong><br>TuConsultor</p>
      <p style="color:#8896AD;font-size:12px;margin-top:20px">Instituto de Excelencia Europea S.L. · CIF B87093076 · Alcorcón (Madrid)</p>
    </div>`;
  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: { name: 'TuConsultor', email: REMITENTE() }, to: [{ email, name: nombre || email }], replyTo: { email: 'hola@tuconsultor.com', name: 'TuConsultor' }, subject: 'Protección de datos · confirma cómo tratamos tus datos', htmlContent: html }),
  });
  return resp.ok ? { ok: true } : { ok: false, motivo: `Brevo HTTP ${resp.status}` };
}

async function registrarAceptacion(contacto, { canal, datos = true, marketing = false, ip = null, ua = null, nota = null, por = null }) {
  const ahora = new Date().toISOString();
  const patch = { rgpd_aceptado: !!datos, rgpd_fecha: datos ? ahora : null };
  if (marketing) { patch.consentimiento_marketing = true; patch.consentimiento_fecha = ahora; }
  const up = await sb(`/rest/v1/contactos?id=eq.${contacto.id}`, { method: 'PATCH', body: patch, headers: { Prefer: 'return=minimal' } });
  if (!up.ok) {
    // Sin las columnas de la v126/v135 se registra lo que se pueda.
    await sb(`/rest/v1/contactos?id=eq.${contacto.id}`, { method: 'PATCH', body: marketing ? { consentimiento_marketing: true, consentimiento_fecha: ahora } : {}, headers: { Prefer: 'return=minimal' } });
  }
  await sb('/rest/v1/consentimientos_rgpd', { method: 'POST', body: { contacto_id: contacto.id, canal, acepta_datos: !!datos, acepta_marketing: !!marketing, texto_version: RGPD_VERSION, ip, user_agent: ua, nota, registrado_por: por }, headers: { Prefer: 'return=minimal' } });
  return { ok: true, fecha: ahora };
}

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido' }, 405);
  if (!env('SUPABASE_URL') || !env('SUPABASE_SERVICE_ROLE_KEY')) return json({ ok: false, error: 'Backend no configurado.' }, 500);
  let body = {};
  try { body = await req.json(); } catch { body = {}; }
  const { action } = body;

  // ── Público: ver y aceptar por token ──
  if (action === 'ver' || action === 'aceptar') {
    const token = String(body.token || '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(token)) return json({ ok: false, error: 'Enlace no válido.' }, 400);
    const c = (await leer(`/rest/v1/contactos?consentimiento_token=eq.${token}&select=id,nombre,apellidos,email,consentimiento_marketing,rgpd_aceptado,rgpd_fecha`))?.[0];
    if (!c) return json({ ok: false, error: 'Este enlace no corresponde a ningún contacto o ya no es válido.' }, 404);
    const empresa = await empresaDe(c.id);
    if (action === 'ver') {
      return json({ ok: true, nombre: `${c.nombre || ''} ${c.apellidos || ''}`.trim(), email: c.email, empresa: empresa?.nombre_comercial || empresa?.nombre || null, yaAceptado: !!c.rgpd_aceptado, fecha: c.rgpd_fecha, marketing: !!c.consentimiento_marketing, texto: RGPD_TEXTO, casillas: RGPD_CASILLAS, version: RGPD_VERSION });
    }
    if (!body.datos) return json({ ok: false, error: 'Para continuar hay que aceptar el tratamiento de los datos.' }, 400);
    const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || null;
    const ua = req.headers.get('user-agent') || null;
    const r = await registrarAceptacion(c, { canal: 'enlace', datos: true, marketing: !!body.marketing, ip, ua });
    return json({ ok: true, fecha: r.fecha });
  }

  // ── Equipo ──
  const quien = await quienLlama(req);
  if (!quien) return json({ ok: false, error: 'Sesión no válida.' }, 401);
  const { contacto_id } = body;
  if (!contacto_id) return json({ ok: false, error: 'Falta el contacto.' }, 400);
  const c = await contactoConToken(contacto_id);
  if (!c) return json({ ok: false, error: 'Contacto no encontrado.' }, 404);
  if (!c.consentimiento_token) return json({ ok: false, error: 'El contacto no tiene enlace de consentimiento: falta aplicar la migración v135.' }, 500);
  const enlace = `${SITE()}/app/consentimiento?t=${c.consentimiento_token}`;

  if (action === 'enlace') return json({ ok: true, enlace, email: c.email });
  if (action === 'enviar') {
    if (!c.email) return json({ ok: false, error: 'El contacto no tiene correo.' }, 400);
    const r = await enviarCorreo({ email: c.email, nombre: c.nombre, enlace, remitenteNombre: quien.nombre });
    if (!r.ok) return json({ ok: false, error: `No se pudo enviar: ${r.motivo}`, enlace }, 502);
    return json({ ok: true, enlace, email: c.email });
  }
  if (action === 'registrar') {
    const canal = ['formulario', 'verbal', 'oferta'].includes(body.canal) ? body.canal : 'formulario';
    const r = await registrarAceptacion(c, { canal, datos: true, marketing: !!body.marketing, nota: body.nota || null, por: quien.id });
    return json({ ok: true, fecha: r.fecha });
  }
  return json({ ok: false, error: 'Acción no reconocida.' }, 400);
};

export const config = { path: '/api/consentimiento' };
