// /api/contacto · Formulario de contacto de los productos (web tuconsultor)
// Envía el mensaje por Brevo transaccional a hola@tuconsultor.com y da de alta
// el contacto (con consentimiento) en la lista de leads.
export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return Response.json({ ok: false, error: 'BREVO_API_KEY no configurada' }, { status: 500 });
  let b; try { b = await req.json(); } catch { return Response.json({ ok: false, error: 'JSON inválido' }, { status: 400 }); }
  if (b.web) return Response.json({ ok: true }); // honeypot
  const { nombre = '', email = '', empresa = '', mensaje = '', producto = '', origen = '' } = b;
  if (!email || !mensaje) return Response.json({ ok: false, error: 'Faltan email o mensaje' }, { status: 400 });

  const destino = process.env.BREVO_SENDER_EMAIL || 'hola@tuconsultor.com';
  const html = `<h2>Contacto desde la web</h2>
    <p><b>Producto:</b> ${producto || '—'} · <b>Página:</b> ${origen || '—'}</p>
    <p><b>Nombre:</b> ${nombre} · <b>Empresa:</b> ${empresa}</p>
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
        attributes: { NOMBRE: nombre, EMPRESA: empresa, ORIGEN: 'contacto-web', PRODUCTO: producto } }),
    });
  } catch {}
  return Response.json({ ok: true });
};
