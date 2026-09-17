// ════════════════════════════════════════════════════════════════════════════
// OUTLOOK → ÓRBITA · los avisos de cambio (webhook de Microsoft Graph)
//
// Graph llama aquí cuando alguien toca un evento de un calendario suscrito.
// Dos cosas que esta función tiene que hacer bien o no funciona nada:
//
//   1 · El apretón de manos. Al crear la suscripción, Graph llama con
//       ?validationToken=… y espera ese mismo texto, en claro, con 200, en
//       menos de 10 segundos. Si no, la suscripción no llega a existir.
//
//   2 · Contestar rápido. Graph reintenta lo que no se conteste, y un reintento
//       sobre un cambio ya aplicado es otra escritura. Se responde 202 y se
//       procesa lo mínimo.
//
// Qué se ignora, a propósito:
//   · Los eventos que no son nuestros (no llevan la propiedad OrbitaSesionId).
//     El permiso alcanza al calendario entero: sus reuniones no nos importan.
//   · Los avisos de nuestra propia escritura, que se reconocen porque el
//     changeKey es el que guardamos al escribir. Sin esto, cada empujón
//     provocaría un aviso que provocaría otro empujón.
//   · Los avisos con un clientState que no cuadra: cualquiera puede llamar a
//     esta URL, es pública.
// ════════════════════════════════════════════════════════════════════════════

import { config, graph, sb, anotar, sesionDeEvento, buzonDe, PROP_SESION } from './outlook-lib.mjs';

const SELECT = 'id,changeKey,subject,start,end,isCancelled,lastModifiedDateTime';
const EXPAND = `singleValueExtendedProperties($filter=id eq '${PROP_SESION}')`;

const horasEntre = (ini, fin) => Math.max(0, Math.round(((new Date(fin) - new Date(ini)) / 36e5) * 100) / 100);

/** Marca la sesión como anulada sin borrar la fila. */
async function anular(sesion, motivo) {
  await sb(`tarea_sesiones?id=eq.${sesion.id}`, {
    method: 'PATCH', prefer: 'return=minimal',
    body: { estado: 'anulada', outlook_event_id: null, outlook_change_key: null, outlook_estado: null, outlook_sincronizado: new Date().toISOString() },
  });
  await anotar({ direccion: 'a_orbita', sesion_id: sesion.id, consultor_id: sesion.consultor_id, accion: 'borrar', resultado: 'ok', detalle: motivo });
}

async function procesar(aviso, c) {
  // ¿De quién es esta suscripción?
  const [susc] = await sb(`outlook_suscripciones?subscription_id=eq.${encodeURIComponent(aviso.subscriptionId || '')}&select=consultor_id,client_state`) || [];
  const esperado = susc?.client_state || c.clientState;
  if (esperado && aviso.clientState !== esperado) {
    await anotar({ direccion: 'a_orbita', accion: 'ignorar', resultado: 'omitido', detalle: 'clientState no coincide' });
    return;
  }
  const eventId = aviso.resourceData?.id || String(aviso.resource || '').split('/').pop();
  if (!eventId) return;

  const [sesion] = await sb(`tarea_sesiones?outlook_event_id=eq.${encodeURIComponent(eventId)}&select=*`) || [];

  // Borrado: el evento ya no existe, así que no se puede consultar. Lo único
  // que tenemos es el id, y con él la sesión.
  if (aviso.changeType === 'deleted') {
    if (sesion) await anular(sesion, 'borrado en Outlook');
    return;
  }

  const [perfil] = susc?.consultor_id
    ? await sb(`perfiles?id=eq.${susc.consultor_id}&select=id,email,outlook_upn`) || []
    : [];
  const buzon = buzonDe(perfil) || String(aviso.resource || '').match(/Users\/([^/]+)/i)?.[1];
  if (!buzon) return;

  const r = await graph(`/users/${encodeURIComponent(buzon)}/events/${eventId}?$select=${SELECT}&$expand=${encodeURIComponent(EXPAND)}`);
  if (!r.ok) {
    // 404 justo después de un borrado: ya está tratado arriba en el caso normal.
    if (r.status === 404 && sesion) await anular(sesion, 'el evento ya no está en Outlook');
    return;
  }
  const ev = r.datos;

  // ¿Es nuestro? Si no lleva la marca, es una reunión suya y no se toca.
  const sesionId = sesionDeEvento(ev);
  if (!sesionId) return;

  const fila = sesion || (await sb(`tarea_sesiones?id=eq.${sesionId}&select=*`) || [])[0];
  if (!fila) return;

  // Este aviso es el eco de nuestra propia escritura.
  if (ev.changeKey && ev.changeKey === fila.outlook_change_key) return;

  if (ev.isCancelled) { await anular(fila, 'cancelado en Outlook'); return; }

  // Gana el último cambio: si la sesión se tocó en Órbita después de este
  // cambio en Outlook, no se pisa; ya la arreglará el siguiente empujón.
  const cambioOutlook = new Date(ev.lastModifiedDateTime);
  if (fila.actualizado && new Date(fila.actualizado) > cambioOutlook) {
    await anotar({ direccion: 'a_orbita', sesion_id: fila.id, consultor_id: fila.consultor_id, accion: 'ignorar', resultado: 'omitido', detalle: 'Órbita se tocó después' });
    return;
  }

  const fecha = String(ev.start?.dateTime || '').slice(0, 10);
  const hIni = String(ev.start?.dateTime || '').slice(11, 16);
  const hFin = String(ev.end?.dateTime || '').slice(11, 16);
  if (!fecha || !hIni || !hFin) return;

  const cambia = fecha !== String(fila.fecha).slice(0, 10)
    || hIni !== String(fila.hora_inicio).slice(0, 5)
    || hFin !== String(fila.hora_fin).slice(0, 5);
  if (!cambia) return;

  await sb(`tarea_sesiones?id=eq.${fila.id}`, {
    method: 'PATCH', prefer: 'return=minimal',
    body: {
      fecha, hora_inicio: hIni, hora_fin: hFin,
      horas: horasEntre(ev.start.dateTime, ev.end.dateTime),
      // Se guarda el changeKey de ESTE cambio para no volver a procesarlo, y
      // se da por sincronizada: el empujón siguiente no la va a deshacer.
      outlook_change_key: ev.changeKey,
      outlook_estado: 'ok',
      outlook_sincronizado: new Date().toISOString(),
    },
  });
  await anotar({
    direccion: 'a_orbita', sesion_id: fila.id, consultor_id: fila.consultor_id, accion: 'mover', resultado: 'ok',
    detalle: `${String(fila.fecha).slice(0, 10)} ${String(fila.hora_inicio).slice(0, 5)} → ${fecha} ${hIni}`,
  });
}

export default async (req) => {
  const url = new URL(req.url);

  // 1 · Apretón de manos. Antes que nada y sin tocar la base de datos.
  const validacion = url.searchParams.get('validationToken');
  if (validacion) {
    return new Response(validacion, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const c = config();
  if (!c.listo) return new Response('', { status: 202 });

  let cuerpo = {};
  try { cuerpo = await req.json(); } catch { return new Response('', { status: 202 }); }
  const avisos = Array.isArray(cuerpo.value) ? cuerpo.value : [];

  for (const a of avisos) {
    try { await procesar(a, c); }
    catch (e) { await anotar({ direccion: 'a_orbita', accion: 'procesar', resultado: 'error', detalle: String(e.message).slice(0, 300) }); }
  }
  // 202 siempre: un error nuestro no debe hacer que Graph reintente en bucle.
  return new Response('', { status: 202 });
};
