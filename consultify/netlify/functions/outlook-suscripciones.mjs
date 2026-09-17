// ════════════════════════════════════════════════════════════════════════════
// OUTLOOK · alta y renovación de las suscripciones de cambios
//
// Sin suscripción no hay avisos, y sin avisos la sincronización es de ida.
// Las de calendario caducan a los 4.230 minutos (poco menos de tres días), así
// que esto corre a diario: renueva las que viven y crea las que faltan.
//
// Se ejecuta programada (netlify.toml) y también a mano:
//   POST /api/outlook-suscripciones  { consultor_id }   → solo esa persona
//   POST /api/outlook-suscripciones  { baja: true, consultor_id } → la quita
//
// La URL de avisos tiene que ser pública y contestar el apretón de manos en
// menos de 10 s. Si Graph no la valida, el alta falla aquí con el motivo, y
// queda escrito en `outlook_suscripciones.ultimo_error`.
// ════════════════════════════════════════════════════════════════════════════

import { config, graph, sb, buzonDe } from './outlook-lib.mjs';

const MINUTOS = 4200;   // por debajo del máximo de Graph (4230), con margen
const caducidad = () => new Date(Date.now() + MINUTOS * 60000).toISOString();

const secreto = () => (globalThis.crypto?.randomUUID?.() || String(Date.now())).replace(/-/g, '');

async function alta(perfil, c) {
  const buzon = buzonDe(perfil);
  if (!buzon) return { id: perfil.id, error: 'sin buzón' };

  const [previa] = await sb(`outlook_suscripciones?consultor_id=eq.${perfil.id}&select=*`) || [];
  const estado = previa?.client_state || c.clientState || secreto();

  // Si ya hay una viva, se renueva: crear otra duplicaría los avisos.
  if (previa?.subscription_id && previa.expira && new Date(previa.expira) > new Date()) {
    const r = await graph(`/subscriptions/${previa.subscription_id}`, {
      method: 'PATCH', body: { expirationDateTime: caducidad() },
    });
    if (r.ok) {
      await sb(`outlook_suscripciones?consultor_id=eq.${perfil.id}`, {
        method: 'PATCH', prefer: 'return=minimal',
        body: { expira: r.datos?.expirationDateTime || caducidad(), ultimo_error: null, actualizado: new Date().toISOString() },
      });
      return { id: perfil.id, accion: 'renovada' };
    }
    // Si la renovación falla (caducó de verdad, se borró en el tenant), se cae
    // al alta de abajo en vez de dejar a la persona sin avisos.
  }

  const recurso = `/users/${buzon}/events`;
  const r = await graph('/subscriptions', {
    method: 'POST',
    body: {
      changeType: 'created,updated,deleted',
      notificationUrl: c.webhook,
      resource: recurso,
      expirationDateTime: caducidad(),
      clientState: estado,
      latestSupportedTlsVersion: 'v1_2',
    },
  });
  if (!r.ok) {
    const detalle = `${r.status} ${JSON.stringify(r.datos || {}).slice(0, 300)}`;
    await sb('outlook_suscripciones', {
      method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
      body: [{ consultor_id: perfil.id, recurso, client_state: estado, ultimo_error: detalle, actualizado: new Date().toISOString() }],
    });
    return { id: perfil.id, error: detalle };
  }
  await sb('outlook_suscripciones', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: [{
      consultor_id: perfil.id,
      subscription_id: r.datos.id,
      recurso,
      client_state: estado,
      expira: r.datos.expirationDateTime,
      ultimo_error: null,
      actualizado: new Date().toISOString(),
    }],
  });
  return { id: perfil.id, accion: 'creada' };
}

async function baja(perfil) {
  const [previa] = await sb(`outlook_suscripciones?consultor_id=eq.${perfil.id}&select=*`) || [];
  if (previa?.subscription_id) await graph(`/subscriptions/${previa.subscription_id}`, { method: 'DELETE' });
  await sb(`outlook_suscripciones?consultor_id=eq.${perfil.id}`, { method: 'DELETE', prefer: 'return=minimal' });
  return { id: perfil.id, accion: 'dada de baja' };
}

export default async (req) => {
  const c = config();
  if (!c.listo) return Response.json({ ok: false, error: 'Outlook sin configurar' }, { status: 503 });

  let peticion = {};
  if (req.method === 'POST') { try { peticion = await req.json(); } catch { /* programada */ } }

  const filtro = peticion.consultor_id
    ? `id=eq.${peticion.consultor_id}`
    : 'outlook_sync=is.true&activo=is.true';
  const perfiles = await sb(`perfiles?${filtro}&select=id,email,outlook_upn,outlook_sync`) || [];

  const resultado = [];
  for (const p of perfiles) {
    try {
      // Quien ya no sincroniza se da de baja: dejar la suscripción viva sería
      // seguir recibiendo avisos de un calendario que ya no nos incumbe.
      resultado.push(peticion.baja || p.outlook_sync === false ? await baja(p) : await alta(p, c));
    } catch (e) {
      resultado.push({ id: p.id, error: String(e.message).slice(0, 200) });
    }
  }
  return Response.json({ ok: true, resultado });
};
