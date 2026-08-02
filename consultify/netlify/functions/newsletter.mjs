// /api/newsletter · Suscripción a la newsletter (doble opt-in vía Brevo)
export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return Response.json({ ok: false, error: 'BREVO_API_KEY no configurada' }, { status: 500 });
  let b; try { b = await req.json(); } catch { return Response.json({ ok: false, error: 'JSON inválido' }, { status: 400 }); }
  if (b.web) return Response.json({ ok: true }); // honeypot
  const email = (b.email || '').trim();
  if (!email || !email.includes('@')) return Response.json({ ok: false, error: 'Email no válido' }, { status: 400 });
  const listaDoi = Number(process.env.BREVO_LIST_DOI_ID || 0);
  const lista = Number(process.env.BREVO_LIST_ID || 0);
  const plantillaDoi = Number(process.env.BREVO_DOI_TEMPLATE_ID || 0);

  if (plantillaDoi && listaDoi) {
    // ── Doble opt-in OFICIAL: Brevo envía el email de confirmación con la plantilla
    //    y solo añade el contacto a la lista cuando pulsa el enlace. ──
    const r = await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
      method: 'POST', headers: { 'api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        templateId: plantillaDoi,
        includeListIds: [listaDoi],
        redirectionUrl: 'https://www.tuconsultor.com/suscripcion-confirmada.html',
        attributes: { ORIGEN: 'newsletter-web', PRODUCTO: b.producto || '' },
      }),
    });
    if (!r.ok && r.status !== 204) {
      const d = await r.json().catch(() => ({}));
      // si los atributos no existen en Brevo, reintenta sin ellos
      const r2 = await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
        method: 'POST', headers: { 'api-key': apiKey, 'content-type': 'application/json' },
        body: JSON.stringify({ email, templateId: plantillaDoi, includeListIds: [listaDoi],
          redirectionUrl: 'https://www.tuconsultor.com/suscripcion-confirmada.html' }),
      });
      if (!r2.ok && r2.status !== 204) return Response.json({ ok: false, error: 'No se pudo iniciar la confirmación' }, { status: 502 });
    }
    return Response.json({ ok: true, doi: true });
  }

  // ── Sin plantilla DOI configurada: alta directa (comportamiento anterior) ──
  const listIds = listaDoi ? [listaDoi] : (lista ? [lista] : []);
  const r = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST', headers: { 'api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ email, updateEnabled: true, listIds,
      attributes: { ORIGEN: 'newsletter-web', PRODUCTO: b.producto || '' } }),
  });
  if (!r.ok && r.status !== 204) {
    const d = await r.json().catch(() => ({}));
    if (d.code !== 'duplicate_parameter') return Response.json({ ok: false, error: 'No se pudo suscribir' }, { status: 502 });
  }
  return Response.json({ ok: true });
};
