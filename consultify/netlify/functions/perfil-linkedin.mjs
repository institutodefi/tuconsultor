// ════════════════════════════════════════════════════════════════════════════
// VISTA PREVIA DE UN PERFIL DE LINKEDIN Y MIGRACIÓN DE SU FOTO · /api/perfil-linkedin
//
//   accion=vista  { url }                 → { titulo, descripcion, foto, origen }
//   accion=foto   { url, foto, contacto_id } → descarga la foto pública, la deja en
//                                            el depósito «imagenes» y la pone en
//                                            contactos.foto_url
//
// Cómo se consigue la vista previa, en orden:
//   1. Se pide la página pública del perfil y se leen sus etiquetas Open Graph
//      (og:title, og:description, og:image). Es lo mismo que hace cualquier
//      mensajería al pegar un enlace. LinkedIn a veces no la sirve a servidores
//      (muro de acceso, código 999): entonces no hay foto.
//   2. Si no hay etiquetas, la IA busca en la web lo que ese perfil publica y
//      devuelve título y resumen (sin foto).
//
// Límites: solo perfiles (linkedin.com/in/…) y solo fotos servidas por
// LinkedIn (licdn.com). No se entra con cuenta ni se hace nada masivo.
// Quien pulsa «usar esta foto» decide; aquí no se guarda nada solo.
// ════════════════════════════════════════════════════════════════════════════

const env = (n) => process.env[n] || '';
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
const MODELO = env('MODELO_CONTACTOS') || env('MODELO_DOCUMENTOS') || 'claude-sonnet-5';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

async function quienLlama(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const u = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, { headers: { apikey: env('SUPABASE_ANON_KEY') || key, Authorization: `Bearer ${token}` } });
  if (!u.ok) return null;
  const { id } = await u.json();
  const p = await fetch(`${env('SUPABASE_URL')}/rest/v1/perfiles?id=eq.${id}&select=id,rol,activo,nombre`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  const perfil = p.ok ? (await p.json())?.[0] : null;
  if (!perfil || perfil.activo === false || !['superadmin', 'admin', 'gestion', 'consultor'].includes(perfil.rol)) return null;
  return perfil;
}

/** Solo perfiles personales de LinkedIn, en cualquier dominio de país. */
export function urlPerfil(u) {
  const t = String(u || '').trim().replace(/^(?!https?:\/\/)/, 'https://');
  return /^https?:\/\/([a-z0-9-]+\.)*linkedin\.com\/in\/[^\s?#]+/i.test(t) ? t.split(/[?#]/)[0].replace(/\/?$/, '/') : '';
}
const esFotoLinkedIn = (u) => /^https:\/\/([a-z0-9-]+\.)*licdn\.com\//i.test(String(u || ''));

const desHtml = (s) => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));

/** Lee una etiqueta <meta property="og:x" content="…"> en cualquier orden de atributos. */
export function meta(html, prop) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0] || '';
  const c = tag.match(/content=["']([^"']*)["']/i)?.[1];
  return c ? desHtml(c) : '';
}

/** Vista previa por Open Graph. Devuelve null si LinkedIn no sirve la página. */
export async function vistaOg(url) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.7' }, redirect: 'follow', signal: ctrl.signal });
    if (!r.ok) return null;
    if (/authwall|\/login|\/checkpoint/i.test(r.url)) return null;
    const html = (await r.text()).slice(0, 400000);
    const titulo = meta(html, 'og:title').replace(/\s*[|·-]\s*LinkedIn\s*$/i, '').trim();
    const descripcion = meta(html, 'og:description').trim();
    let foto = meta(html, 'og:image');
    // La imagen genérica de LinkedIn (static.licdn.com) no es la foto de la persona.
    if (!esFotoLinkedIn(foto) || /static\.licdn\.com/i.test(foto)) foto = '';
    if (!titulo || /^linkedin$/i.test(titulo) || /authwall/i.test(html.slice(0, 3000))) return null;
    return { titulo, descripcion, foto, origen: 'linkedin' };
  } catch { return null; }
  finally { clearTimeout(t); }
}

/** Vista previa por la IA (sin foto): qué publica ese perfil. */
async function vistaIa(url, clave) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': clave, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODELO, max_tokens: 600,
      system: 'Te dan la URL de un perfil público de LinkedIn. Busca en la web qué publica ese perfil (nombre, cargo actual, empresa, ciudad) y responde SOLO con un JSON {"titulo":"Nombre · Cargo en Empresa","descripcion":"dos frases con lo profesional y público","ciudad":""}. Solo datos profesionales públicos, nada privado. Si no encuentras nada fiable: {"titulo":"","descripcion":"no se ha podido leer el perfil"}. En español, sin bloques de código.',
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2 }],
      messages: [{ role: 'user', content: url }],
    }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  const texto = (j.content || []).filter((x) => x.type === 'text').map((x) => x.text).join('\n').replace(/```json|```/g, '');
  const m = texto.match(/\{[\s\S]*\}/);
  try { const d = JSON.parse(m ? m[0] : texto); return d.titulo ? { titulo: String(d.titulo).slice(0, 160), descripcion: String(d.descripcion || '').slice(0, 500), foto: '', origen: 'ia' } : null; } catch { return null; }
}

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido' }, 405);
  const quien = await quienLlama(req);
  if (!quien) return json({ ok: false, error: 'Solo el equipo puede previsualizar perfiles.' }, 401);
  let body = {};
  try { body = await req.json(); } catch { body = {}; }
  const url = urlPerfil(body.url);
  if (!url) return json({ ok: false, error: 'Eso no es la URL de un perfil de LinkedIn (linkedin.com/in/…).' }, 400);

  if (body.accion === 'foto') {
    const foto = String(body.foto || '');
    const id = String(body.contacto_id || '');
    if (!esFotoLinkedIn(foto) || !/^[0-9a-f-]{36}$/i.test(id)) return json({ ok: false, error: 'Falta la foto (de LinkedIn) o el contacto.' }, 400);
    const r = await fetch(foto, { headers: { 'User-Agent': UA, Referer: url } });
    if (!r.ok) return json({ ok: false, error: `LinkedIn no ha servido la foto (${r.status}). Descárgala y súbela desde la ficha.` }, 502);
    const mime = (r.headers.get('content-type') || 'image/jpeg').split(';')[0];
    if (!/^image\//.test(mime)) return json({ ok: false, error: 'Lo que devuelve LinkedIn no es una imagen.' }, 502);
    const bytes = new Uint8Array(await r.arrayBuffer());
    if (bytes.length > 5 * 1024 * 1024) return json({ ok: false, error: 'La foto pesa más de 5 MB.' }, 413);
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const ruta = `contactos/${id}/linkedin-${Date.now()}.${ext}`;
    const key = env('SUPABASE_SERVICE_ROLE_KEY'); const base = env('SUPABASE_URL');
    const up = await fetch(`${base}/storage/v1/object/imagenes/${ruta}`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': mime, 'x-upsert': 'true' }, body: bytes });
    if (!up.ok) return json({ ok: false, error: `No se pudo guardar la foto (${up.status}). ¿Está aplicada la migración v134 (depósito «imagenes»)?` }, 502);
    const foto_url = `${base}/storage/v1/object/public/imagenes/${ruta}`;
    const actual = await fetch(`${base}/rest/v1/contactos?id=eq.${id}&select=fuente_datos`, { headers: { apikey: key, Authorization: `Bearer ${key}` } }).then((x) => (x.ok ? x.json() : [])).then((x) => x?.[0]?.fuente_datos || '').catch(() => '');
    const nota = `Foto: perfil público de LinkedIn (${new Date().toLocaleDateString('es-ES')}) por ${quien.nombre || 'equipo'}`;
    const patch = { foto_url, fuente_datos: actual ? `${actual} · ${nota}` : nota };
    const pa = await fetch(`${base}/rest/v1/contactos?id=eq.${id}`, { method: 'PATCH', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
    if (!pa.ok) return json({ ok: false, error: `La foto está guardada pero la ficha no se actualizó (${pa.status}).` }, 502);
    return json({ ok: true, foto_url, fuente_datos: patch.fuente_datos });
  }

  // accion=vista (por defecto)
  let vista = await vistaOg(url);
  if (!vista) {
    const clave = env('ANTHROPIC_API_KEY');
    vista = clave ? await vistaIa(url, clave) : null;
  }
  if (!vista) return json({ ok: false, error: 'LinkedIn no deja leer ese perfil desde el servidor y la IA no ha encontrado nada público. Ábrelo con el enlace.' }, 502);
  return json({ ok: true, url, ...vista });
};

export const config = { path: '/api/perfil-linkedin' };
