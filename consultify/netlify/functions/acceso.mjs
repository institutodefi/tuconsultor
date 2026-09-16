// ════════════════════════════════════════════════════════════════════════════
// ACCESO · reenviar la invitación o el enlace de contraseña · /api/acceso
//
// Lo que pasó (v143): una persona recibió la invitación, la abrió al día
// siguiente y el enlace había caducado; probó el código del correo como
// contraseña y, claro, «email o contraseña incorrectos». Se quedó fuera sin
// que nadie pudiera hacer nada desde la pantalla.
//
// Aquí, sin sesión y solo con el correo, se pide un enlace nuevo:
//   · cuenta invitada que nunca creó contraseña → se reenvía la invitación;
//   · cuenta ya confirmada → correo de restablecer contraseña.
// Solo para correos que existen en `perfiles`; la respuesta es la misma en
// todos los casos para no revelar quién tiene cuenta. GoTrue limita el ritmo.
// ════════════════════════════════════════════════════════════════════════════
const env = (n) => process.env[n] || '';
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
const SITE = () => env('SITE_URL') || 'https://consultify.tuconsultor.com';
const GENERICO = 'Si ese correo tiene cuenta, en un par de minutos te llega un enlace nuevo. Mira también la carpeta de spam.';

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido' }, 405);
  const base = env('SUPABASE_URL'); const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !key) return json({ ok: false, error: 'Backend sin configurar' }, 500);
  let body = {};
  try { body = await req.json(); } catch { body = {}; }
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: 'Escribe tu correo.' }, 400);
  if (body.accion !== 'reenviar') return json({ ok: false, error: 'Acción no válida' }, 400);

  const H = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const destino = `${SITE()}/app/establecer-password`;
  try {
    const p = await fetch(`${base}/rest/v1/perfiles?email=eq.${encodeURIComponent(email)}&select=id,activo&limit=1`, { headers: H }).then((r) => (r.ok ? r.json() : []));
    const perfil = p?.[0];
    if (!perfil || perfil.activo === false) return json({ ok: true, mensaje: GENERICO });
    const u = await fetch(`${base}/auth/v1/admin/users/${perfil.id}`, { headers: H }).then((r) => (r.ok ? r.json() : null));
    const confirmada = !!(u?.email_confirmed_at || u?.confirmed_at);
    let r;
    if (!confirmada) {
      // Invitada y sin contraseña: GoTrue reenvía la invitación a una cuenta
      // que existe pero no está confirmada.
      r = await fetch(`${base}/auth/v1/invite`, { method: 'POST', headers: H, body: JSON.stringify({ email, redirect_to: destino }) });
      if (!r.ok) {
        // Si por lo que sea no deja reinvitar, el correo de contraseña también sirve.
        r = await fetch(`${base}/auth/v1/recover?redirect_to=${encodeURIComponent(destino)}`, { method: 'POST', headers: H, body: JSON.stringify({ email }) });
      }
    } else {
      r = await fetch(`${base}/auth/v1/recover?redirect_to=${encodeURIComponent(destino)}`, { method: 'POST', headers: H, body: JSON.stringify({ email }) });
    }
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      if (/rate|limit|429/i.test(t) || r.status === 429) return json({ ok: false, error: 'Se ha pedido hace muy poco: espera un minuto y vuelve a intentarlo.' }, 429);
      return json({ ok: false, error: 'No se pudo enviar el enlace. Escribe a hola@tuconsultor.com y te lo reenviamos a mano.' }, 502);
    }
    return json({ ok: true, mensaje: GENERICO, tipo: confirmada ? 'recuperacion' : 'invitacion' });
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
};

export const config = { path: '/api/acceso' };
