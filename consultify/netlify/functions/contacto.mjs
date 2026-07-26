// /api/contacto · Formulario de contacto de los productos (web tuconsultor)
// Envía el mensaje por Brevo transaccional a hola@tuconsultor.com y da de alta
// el contacto (con consentimiento) en la lista de leads.
export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return Response.json({ ok: false, error: 'BREVO_API_KEY no configurada' }, { status: 500 });
  let b; try { b = await req.json(); } catch { return Response.json({ ok: false, error: 'JSON inválido' }, { status: 400 }); }
  if (b.web) return Response.json({ ok: true }); // honeypot
  const { nombre = '', email = '', empresa = '', mensaje = '', producto = '', origen = '', necesidad = '', tamano = '', plazo = '', acepta_privacidad = '', acepta_comercial = '' } = b;
  if (acepta_privacidad !== 'si') return Response.json({ ok: false, error: 'Debes aceptar la Política de Privacidad' }, { status: 400 });
  if (!email || !mensaje) return Response.json({ ok: false, error: 'Faltan email o mensaje' }, { status: 400 });

  const destino = process.env.BREVO_SENDER_EMAIL || 'hola@tuconsultor.com';
  const html = `<h2>Contacto desde la web</h2>
    <p><b>Producto:</b> ${producto || '—'} · <b>Página:</b> ${origen || '—'}</p>
    <p><b>Nombre:</b> ${nombre} · <b>Empresa:</b> ${empresa} (${tamano || '?'} personas)</p>\n    <p><b>Necesidad:</b> ${necesidad || '—'} · <b>Plazo:</b> ${plazo || '—'} · <b>Comercial:</b> ${acepta_comercial === 'si' ? 'SÍ' : 'no'}</p>
    <p><b>Email:</b> ${email}</p><hr/><p>${String(mensaje).slice(0, 4000)}</p>`;
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { email: destino, name: 'Web TuConsultor' },
      to: [{ email: destino }], replyTo: { email },
      subject: `[Web] Contacto · ${producto || 'general'} · ${nombre || email}`,
      htmlContent: html,
    }),
  });
  if (!r.ok) return Response.json({ ok: false, error: 'No se pudo enviar' }, { status: 502 });
  // alta del contacto (sin bloquear la respuesta si falla)
  try {
    await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST', headers: { 'api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ email, updateEnabled: true,
        attributes: { NOMBRE: nombre, EMPRESA: empresa, ORIGEN: 'contacto-web', PRODUCTO: producto, NECESIDAD: necesidad, TAMANO: tamano, PLAZO: plazo, CONSENTIMIENTO_COMERCIAL: acepta_comercial === 'si' } }),
    }).then(async (rc) => {
      if (!rc.ok) {
        // si algún atributo no existe en Brevo, reintenta solo con el email
        await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST', headers: { 'api-key': apiKey, 'content-type': 'application/json' },
          body: JSON.stringify({ email, updateEnabled: true }),
        });
      }
    });
  } catch {}
  // Lead a Orbita.PMTool (Supabase) — no bloquea la respuesta si falla
  try {
    const SB = process.env.SUPABASE_URL;
    const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
    if (SB && SRK) {
      await fetch(`${SB}/rest/v1/leads`, {
        method: 'POST',
        headers: { apikey: SRK, Authorization: `Bearer ${SRK}`, 'content-type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ nombre, email, empresa, telefono: b.telefono || '', producto, necesidad, tamano, plazo,
          mensaje: String(mensaje).slice(0, 2000), origen, consentimiento_comercial: acepta_comercial === 'si' }),
      });
    }
  } catch {}
  return Response.json({ ok: true });
};
