// ════════════════════════════════════════════════════════════════════════════
// OUTLOOK · lo común a las tres funciones (empujar, avisos, suscripciones)
//
// Habla con Microsoft Graph con credenciales de aplicación: un registro en
// Entra ID con permiso Calendars.ReadWrite de APLICACIÓN, consentido por el
// administrador del tenant. No hay usuario delante, así que no hay refresh
// tokens que caduquen ni nadie a quien volver a pedirle permiso.
//
// ⚠ Ese permiso alcanza, por defecto, TODOS los buzones del tenant. Hay que
// acotarlo con una Application Access Policy a un grupo con solo el equipo
// (está explicado en docs/OUTLOOK.md). Este código no puede imponerlo: lo
// único que hace por su parte es no tocar más buzones que los de los perfiles
// con `outlook_sync` activo.
//
// Variables de entorno (Netlify):
//   MS_TENANT_ID · MS_CLIENT_ID · MS_CLIENT_SECRET   → el registro de Entra ID
//   OUTLOOK_CLIENT_STATE                             → secreto compartido que
//       viaja en cada aviso; si no coincide, el aviso se tira.
//   OUTLOOK_WEBHOOK_URL                              → URL pública de los avisos
//   VITE_SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY    → ya existentes
// ════════════════════════════════════════════════════════════════════════════

const GRAPH = 'https://graph.microsoft.com/v1.0';

// El identificador con el que marcamos NUESTROS eventos. Va como propiedad
// extendida del evento, así que sobrevive a que el usuario le cambie el
// título, lo mueva de carpeta o lo reenvíe. Es la única forma fiable de
// distinguir «esto lo puso Órbita» de «esto es una reunión suya».
export const PROP_SESION = 'String {9f6b0d5a-6a0b-4a5e-9b3a-0c3a5d2e7f10} Name OrbitaSesionId';

export const ZONA = 'Romance Standard Time';   // Europe/Madrid, en el dialecto de Windows

// ── Configuración ───────────────────────────────────────────────────────────
export function config() {
  const c = {
    tenant: process.env.MS_TENANT_ID,
    clientId: process.env.MS_CLIENT_ID,
    secret: process.env.MS_CLIENT_SECRET,
    clientState: process.env.OUTLOOK_CLIENT_STATE,
    webhook: process.env.OUTLOOK_WEBHOOK_URL || 'https://consultify.tuconsultor.com/api/outlook-avisos',
    sbUrl: process.env.VITE_SUPABASE_URL,
    sbKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE,
  };
  c.listo = !!(c.tenant && c.clientId && c.secret && c.sbUrl && c.sbKey);
  return c;
}

// ── Token de Graph (client credentials), con caché en memoria ───────────────
// La función se reutiliza entre invocaciones mientras el contenedor viva, así
// que cachear evita pedir un token por cada sesión que se empuja.
let tokenCache = { valor: null, caduca: 0 };

export async function tokenGraph() {
  const c = config();
  if (tokenCache.valor && Date.now() < tokenCache.caduca) return tokenCache.valor;
  const cuerpo = new URLSearchParams({
    client_id: c.clientId,
    client_secret: c.secret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });
  const r = await fetch(`https://login.microsoftonline.com/${c.tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: cuerpo,
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error(`token de Graph: ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  // Un minuto de margen: mejor pedir uno de más que usar uno recién caducado.
  tokenCache = { valor: j.access_token, caduca: Date.now() + ((j.expires_in || 3600) - 60) * 1000 };
  return tokenCache.valor;
}

// ── Llamada a Graph, con reintento educado ──────────────────────────────────
// Graph limita por buzón y responde 429 con Retry-After. Ignorarlo es la forma
// más rápida de que te limiten más. Tres intentos y se rinde.
export async function graph(ruta, { method = 'GET', body, headers = {}, intento = 0 } = {}) {
  const t = await tokenGraph();
  const r = await fetch(ruta.startsWith('http') ? ruta : `${GRAPH}${ruta}`, {
    method,
    headers: {
      Authorization: `Bearer ${t}`,
      'Content-Type': 'application/json',
      Prefer: `outlook.timezone="${ZONA}"`,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if ((r.status === 429 || r.status === 503) && intento < 3) {
    const espera = Number(r.headers.get('Retry-After') || 2);
    await new Promise((res) => setTimeout(res, Math.min(espera, 20) * 1000));
    return graph(ruta, { method, body, headers, intento: intento + 1 });
  }
  if (r.status === 204) return { ok: true, status: 204, datos: null };
  let datos = null;
  try { datos = await r.json(); } catch { /* 404 de borrado, por ejemplo */ }
  return { ok: r.ok, status: r.status, datos };
}

// ── Supabase por REST (sin SDK: una dependencia menos en la función) ────────
export async function sb(ruta, { method = 'GET', body, prefer } = {}) {
  const c = config();
  const r = await fetch(`${c.sbUrl}/rest/v1/${ruta}`, {
    method,
    headers: {
      apikey: c.sbKey,
      Authorization: `Bearer ${c.sbKey}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`supabase ${ruta} → ${r.status} ${(await r.text()).slice(0, 200)}`);
  if (r.status === 204) return null;
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}

export async function anotar(fila) {
  // La bitácora nunca puede tumbar una sincronización: si falla, se calla.
  try { await sb('outlook_bitacora', { method: 'POST', body: [fila], prefer: 'return=minimal' }); } catch { /* nada */ }
}

// ── Sesión → evento de Outlook ──────────────────────────────────────────────
// `dateTime` sin zona y `timeZone` aparte: así Outlook coloca la hora en hora
// española y no se mueve sola dos veces al año.
const hhmm = (h) => String(h || '09:00').slice(0, 5);

export function eventoDeSesion(s, { titulo, descripcion, urlOrbita }) {
  return {
    subject: titulo,
    body: {
      contentType: 'HTML',
      content: `${descripcion || ''}<br /><br /><a href="${urlOrbita}">Abrir en Órbita</a>`
        + '<br /><small>Sesión sincronizada desde Órbita.PMTools. Si la mueves o la cancelas aquí, se actualiza allí.</small>',
    },
    start: { dateTime: `${String(s.fecha).slice(0, 10)}T${hhmm(s.hora_inicio)}:00`, timeZone: ZONA },
    end: { dateTime: `${String(s.fecha).slice(0, 10)}T${hhmm(s.hora_fin)}:00`, timeZone: ZONA },
    // Las sesiones ya hechas no bloquean el hueco: el trabajo está hecho y la
    // agenda de la semana que viene no tiene por qué parecer llena.
    showAs: s.estado === 'hecha' ? 'free' : 'busy',
    categories: ['Órbita'],
    singleValueExtendedProperties: [{ id: PROP_SESION, value: s.id }],
  };
}

/** El id de sesión que lleva escondido un evento, si es nuestro. */
export function sesionDeEvento(ev) {
  const props = ev?.singleValueExtendedProperties || [];
  const p = props.find((x) => x.id === PROP_SESION || String(x.id).endsWith('Name OrbitaSesionId'));
  return p?.value || null;
}

/** El buzón de una persona: el explícito si lo hay, y si no su correo. */
export const buzonDe = (p) => (p?.outlook_upn || p?.email || '').trim().toLowerCase();
