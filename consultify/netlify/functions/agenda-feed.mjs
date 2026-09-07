// netlify/functions/agenda-feed.mjs
// Calendario iCalendar (.ics) de un consultor, SUSCRIBIBLE y descargable.
//
// · Suscripción (Outlook, Google, Apple): la persona añade la URL una vez y su
//   calendario se actualiza solo. Outlook y Google vuelven a leerla cada
//   1–3 h; Apple según lo que elija la persona.
// · Descarga (&download=1): un .ics de una vez, para importar.
//
// URL: /api/agenda-feed?c=<perfil_id>&t=<token>[&download=1]
//   c → id del perfil (perfiles.id: es el consultor_id de las sesiones)
//   t → token de esa persona (perfiles.feed_token, v123). Se genera y se
//       regenera desde Órbita (Mi agenda). Mientras no exista, se acepta
//       el token global AGENDA_FEED_TOKEN si está configurado.
//
// Qué lleva: todas las sesiones no anuladas de la persona, de proyectos de
// cliente (cliente_tareas) y de gestión / procesos internos (tareas_internas,
// v116), con quién más está convocado (convocatoria_id, v123). Las hechas se
// marcan como «libre» para que Outlook no bloquee ese hueco.
//
// Horas en Europe/Madrid con su VTIMEZONE: antes se emitían como UTC y el
// calendario las movía una o dos horas.
//
// Variables de entorno en Netlify: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE
// (o SUPABASE_SERVICE_ROLE_KEY) y, opcional, AGENDA_FEED_TOKEN.

const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
// Fecha y hora locales (sin Z): con TZID=Europe/Madrid el calendario las sitúa bien.
const local = (fechaISO, horaHHMM) => `${String(fechaISO).slice(0, 10).replace(/-/g, '')}T${String(horaHHMM || '09:00').slice(0, 5).replace(':', '')}00`;
const ahoraUTC = () => { const d = new Date(); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`; };
// Las líneas del .ics no pasan de 75 octetos: se pliegan con CRLF + espacio.
const plegar = (l) => { const out = []; let s = l; while (Buffer.byteLength(s, 'utf8') > 73) { let i = 73; while (Buffer.byteLength(s.slice(0, i), 'utf8') > 73) i--; out.push(s.slice(0, i)); s = ' ' + s.slice(i); } out.push(s); return out.join('\r\n'); };

const VTIMEZONE = [
  'BEGIN:VTIMEZONE', 'TZID:Europe/Madrid', 'X-LIC-LOCATION:Europe/Madrid',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE',
];
const TIPO_INTERNA = { gestion: 'Gestión y coordinación', proceso_interno: 'Proceso interno' };

export default async (req) => {
  const url = new URL(req.url);
  const perfilId = url.searchParams.get('c');
  const token = url.searchParams.get('t');
  const descarga = url.searchParams.get('download') === '1';
  if (!perfilId || !token) return new Response('Faltan parámetros', { status: 400 });
  if (!/^[0-9a-f-]{8,}$/i.test(perfilId)) return new Response('Parámetro c no válido', { status: 400 });

  const base = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!base || !key) return new Response('Backend sin configurar', { status: 500 });
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const leer = async (ruta) => { const r = await fetch(`${base}/rest/v1/${ruta}`, { headers }); const j = await r.json(); return Array.isArray(j) ? j : []; };

  // Quién es, y su token.
  const [perfil] = await leer(`perfiles?id=eq.${perfilId}&select=id,nombre,apellidos,email,feed_token`);
  if (!perfil) return new Response('No encontrado', { status: 404 });
  const tokenOk = (perfil.feed_token && token === perfil.feed_token) || (process.env.AGENDA_FEED_TOKEN && token === process.env.AGENDA_FEED_TOKEN);
  if (!tokenOk) return new Response('No autorizado', { status: 401 });
  const nombre = `${perfil.nombre || ''} ${perfil.apellidos || ''}`.trim() || perfil.email || 'Consultor';

  // Sesiones de la persona (proyectos e internas), sin las anuladas.
  const sesiones = await leer(`tarea_sesiones?consultor_id=eq.${perfilId}&estado=neq.anulada&select=*&order=fecha,hora_inicio`);

  // Títulos de las tareas de cliente y de las internas, y los proyectos.
  const idsCT = [...new Set(sesiones.map((s) => s.cliente_tarea_id).filter(Boolean))];
  const idsTI = [...new Set(sesiones.map((s) => s.tarea_interna_id).filter(Boolean))];
  const tareasCT = idsCT.length ? await leer(`cliente_tareas?id=in.(${idsCT.join(',')})&select=id,titulo,codigo,norma_id,proyecto_id,subproceso`) : [];
  const tareasTI = idsTI.length ? await leer(`tareas_internas?id=in.(${idsTI.join(',')})&select=id,titulo,tipo,descripcion`) : [];
  const idsP = [...new Set(tareasCT.map((t) => t.proyecto_id).filter(Boolean))];
  const proyectos = idsP.length ? await leer(`proyectos_cliente?id=in.(${idsP.join(',')})&select=id,nombre,codigo,cliente_id`) : [];
  const idsC = [...new Set(proyectos.map((p) => p.cliente_id).filter(Boolean))];
  const clientes = idsC.length ? await leer(`clientes?id=in.(${idsC.join(',')})&select=id,empresa`) : [];
  const porId = (arr) => Object.fromEntries(arr.map((x) => [String(x.id), x]));
  const CT = porId(tareasCT), TI = porId(tareasTI), P = porId(proyectos), C = porId(clientes);

  // Quién más está convocado en cada convocatoria.
  const idsConv = [...new Set(sesiones.map((s) => s.convocatoria_id).filter(Boolean))];
  const otras = idsConv.length ? await leer(`tarea_sesiones?convocatoria_id=in.(${idsConv.join(',')})&estado=neq.anulada&select=id,convocatoria_id,consultor_id`) : [];
  const idsPersonas = [...new Set(otras.map((x) => x.consultor_id).filter((x) => x && String(x) !== String(perfilId)))];
  const personas = idsPersonas.length ? await leer(`perfiles?id=in.(${idsPersonas.join(',')})&select=id,nombre,apellidos,email`) : [];
  const nombreDe = (id) => { const p = personas.find((x) => String(x.id) === String(id)); return p ? `${p.nombre || ''} ${p.apellidos || ''}`.trim() || p.email : null; };

  const eventos = sesiones.map((s) => {
    const ct = CT[String(s.cliente_tarea_id)];
    const ti = TI[String(s.tarea_interna_id)];
    const proy = ct ? P[String(ct.proyecto_id)] : null;
    const cli = proy ? C[String(proy.cliente_id)] : null;
    let titulo, cat;
    const desc = [];
    if (ct) {
      titulo = [cli?.empresa, ct.titulo || ct.subproceso].filter(Boolean).join(' · ') || 'Tarea de proyecto';
      cat = 'Proyecto';
      desc.push(ct.codigo ? `Tarea ${ct.codigo}` : null, ct.norma_id ? `Norma ${ct.norma_id}` : null, proy ? `Proyecto ${proy.codigo || proy.nombre || ''}` : null);
    } else if (ti) {
      titulo = `${TIPO_INTERNA[ti.tipo] || 'Interna'} · ${ti.titulo || ''}`.trim();
      cat = TIPO_INTERNA[ti.tipo] || 'Interna';
      desc.push(ti.descripcion || null);
    } else { titulo = 'Sesión'; cat = 'Sesión'; }
    const convocados = otras.filter((x) => x.convocatoria_id === s.convocatoria_id && x.id !== s.id).map((x) => nombreDe(x.consultor_id)).filter(Boolean);
    if (convocados.length) desc.push(`Con: ${convocados.join(', ')}`);
    desc.push(s.notas || null, `${Number(s.horas) || 0} h`, s.estado === 'hecha' ? 'Hecha' : 'Programada');
    const ini = local(s.fecha, s.hora_inicio), fin = local(s.fecha, s.hora_fin);
    return [
      'BEGIN:VEVENT',
      `UID:${s.id}@orbita.tuconsultor.com`,
      `DTSTAMP:${ahoraUTC()}`,
      `DTSTART;TZID=Europe/Madrid:${ini}`,
      `DTEND;TZID=Europe/Madrid:${fin > ini ? fin : ini}`,
      plegar(`SUMMARY:${esc((s.estado === 'hecha' ? '✓ ' : '') + titulo)}`),
      plegar(`DESCRIPTION:${esc(desc.filter(Boolean).join('\n'))}`),
      `CATEGORIES:${esc(cat)}`,
      s.estado === 'hecha' ? 'TRANSP:TRANSPARENT' : 'TRANSP:OPAQUE',
      'STATUS:CONFIRMED',
      `LAST-MODIFIED:${ahoraUTC()}`,
      'END:VEVENT',
    ].join('\r\n');
  });

  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TuConsultor//Órbita agenda//ES',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    plegar(`X-WR-CALNAME:Órbita · ${esc(nombre)}`),
    'X-WR-TIMEZONE:Europe/Madrid',
    // Cada cuánto vuelve a mirar el calendario suscrito.
    'X-PUBLISHED-TTL:PT1H', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    ...VTIMEZONE,
    ...eventos,
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n';

  const h = {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Cache-Control': 'private, max-age=300',
  };
  if (descarga) h['Content-Disposition'] = `attachment; filename="orbita-agenda-${(perfil.nombre || 'consultor').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics"`;
  return new Response(ics, { status: 200, headers: h });
};
