// netlify/functions/agenda-feed.mjs
// Feed iCalendar (.ics) SUSCRIBIBLE de la agenda de un consultor.
// El consultor añade esta URL una vez en Google/Outlook/Apple y su
// calendario se actualiza solo (sin re-descargar).
//
// URL: /api/agenda-feed?c=<consultor_id>&t=<token>
//   c → id del consultor
//   t → token simple anti-acceso público (debe coincidir con AGENDA_FEED_TOKEN)
//
// Variables de entorno en Netlify:
//   VITE_SUPABASE_URL        → URL del proyecto Supabase
//   SUPABASE_SERVICE_ROLE    → service role key (solo backend, NUNCA en el front)
//   AGENDA_FEED_TOKEN        → cadena secreta compartida en la URL del feed
//
// Nota de seguridad: el token va en la URL del feed (así funcionan los
// calendarios suscribibles). Usa un token largo y trata la URL como secreta.

const EFICIENCIA = { J1: 1.0, J2: 0.75, J3: 0.5, Senior: 0.4 };
const TIPOS = { produccion: 'Producción / Proyecto', gestion: 'Gestión', coordinacion: 'Coordinación' };

const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

function dt(fechaISO, horaHHMM, addHoras = 0) {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const [hh, mm] = (horaHHMM || '09:00').split(':').map(Number);
  const x = new Date(Date.UTC(y, m - 1, d, hh, mm));
  x.setUTCMinutes(x.getUTCMinutes() + Math.round(addHoras * 60));
  return `${x.getUTCFullYear()}${pad(x.getUTCMonth() + 1)}${pad(x.getUTCDate())}T${pad(x.getUTCHours())}${pad(x.getUTCMinutes())}00Z`;
}

export default async (req) => {
  const url = new URL(req.url);
  const consultorId = url.searchParams.get('c');
  const token = url.searchParams.get('t');

  const FEED_TOKEN = process.env.AGENDA_FEED_TOKEN;
  if (!FEED_TOKEN || token !== FEED_TOKEN) return new Response('No autorizado', { status: 401 });
  if (!consultorId) return new Response('Falta el parámetro c', { status: 400 });

  const base = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!base || !key) return new Response('Backend sin configurar', { status: 500 });

  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  // Quién es. Se busca en `perfiles`: es donde está la cuenta con la que se
  // asignan las sesiones. `consultores` es la tabla antigua y muchas filas no
  // tienen ni correo.
  const pRes = await fetch(`${base}/rest/v1/perfiles?id=eq.${consultorId}&select=nombre,apellidos,nivel`, { headers });
  const pArr = await pRes.json();
  const c = Array.isArray(pArr) && pArr[0] ? pArr[0] : null;
  const nombre = c ? `${c.nombre || ''} ${c.apellidos || ''}`.trim() : 'Consultor';

  // ── Las SESIONES, que es donde están las horas de verdad ──
  // Una tarea puede tener varias sesiones con hora de inicio y fin distintas;
  // el feed antiguo leía `agenda_tareas`, que solo guardaba una fecha por
  // tarea, así que en el calendario faltaba la mitad del trabajo.
  const sRes = await fetch(
    `${base}/rest/v1/tarea_sesiones?consultor_id=eq.${consultorId}`
    + `&estado=neq.anulada&select=*&order=fecha`, { headers });
  const sesiones = await sRes.json();

  // Los títulos de las tareas, para que el evento diga qué es y no un id.
  const idsCT = [...new Set((Array.isArray(sesiones) ? sesiones : [])
    .map((s) => s.cliente_tarea_id).filter(Boolean))];
  let titulos = {};
  if (idsCT.length) {
    const tRes = await fetch(
      `${base}/rest/v1/cliente_tareas?id=in.(${idsCT.join(',')})`
      + '&select=id,titulo,codigo,norma_id,proyecto_id', { headers });
    const arr = await tRes.json();
    if (Array.isArray(arr)) titulos = Object.fromEntries(arr.map((t) => [String(t.id), t]));
  }

  const eventos = (Array.isArray(sesiones) ? sesiones : []).map((s) => {
    const t = titulos[String(s.cliente_tarea_id)] || {};
    const horas = Number(s.horas) || 1;
    const etq = [t.codigo, t.titulo].filter(Boolean).join(' · ') || 'Tarea';
    const desc = [
      t.norma_id ? `Norma ${t.norma_id}` : null,
      s.notas,
      `Responsable: ${nombre}`,
      `${horas} h`,
      s.estado === 'hecha' ? 'Ejecutada' : 'Programada',
    ].filter(Boolean).join(' · ');

    return [
      'BEGIN:VEVENT',
      `UID:${s.id}@consultify.pro`,
      `DTSTAMP:${dt(new Date().toISOString().slice(0, 10), '00:00')}`,
      // Hora de inicio y fin reales, no una duración estimada.
      `DTSTART:${dt(String(s.fecha).slice(0, 10), String(s.hora_inicio).slice(0, 5), 0)}`,
      `DTEND:${dt(String(s.fecha).slice(0, 10), String(s.hora_fin).slice(0, 5), 0)}`,
      `SUMMARY:${esc(etq)}`,
      `DESCRIPTION:${esc(desc)}`,
      // Las ya ejecutadas se marcan como libres: ocupar el calendario con
      // trabajo hecho impide que Outlook proponga ese hueco para otra cosa.
      s.estado === 'hecha' ? 'TRANSP:TRANSPARENT' : 'TRANSP:OPAQUE',
      'STATUS:CONFIRMED',
      'END:VEVENT',
    ].join('\r\n');
  });

  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Consultify//Agenda//ES',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:Consultify · ${esc(nombre)}`,
    // Cada cuánto vuelve a mirar el calendario suscrito. Una hora: las sesiones
    // se programan con días de antelación, no al minuto.
    'X-PUBLISHED-TTL:PT1H', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    `X-WR-TIMEZONE:Europe/Madrid`,
    ...eventos, 'END:VCALENDAR',
  ].join('\r\n');

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=900', // refresco cada 15 min
    },
  });
};
