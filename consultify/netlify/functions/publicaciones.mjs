// ════════════════════════════════════════════════════════════════════════════
// PUBLICACIONES EN REDES · /api/publicaciones (v139)
//
// La web es la fuente única del calendario. Esta función es lo que usa Make:
//   GET  ?accion=pendientes&max=10       → filas que toca publicar ahora (hora de Madrid)
//   POST {accion:'marcar', id, ok, ref, error}  → resultado de publicar una fila
//   POST {accion:'sincronizar'}          → vuelca los CSV de la web en la tabla (también lo hace el cron cada noche)
//   GET  ?accion=estado                  → resumen (pendientes hoy, últimas publicadas, errores)
//
// Quién puede llamar: Make con el token (PUBLICACIONES_TOKEN, en cabecera
// `x-publicaciones-token` o en ?token=) o el equipo con su sesión de Órbita.
// ════════════════════════════════════════════════════════════════════════════
import { sb, sincronizarDesdeWeb } from './publicaciones-lib.mjs';

const env = (n) => process.env[n] || '';
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function esEquipo(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const u = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, { headers: { apikey: env('SUPABASE_ANON_KEY') || env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: `Bearer ${token}` } });
  if (!u.ok) return false;
  const { id } = await u.json();
  const r = await sb(`/rest/v1/perfiles?id=eq.${id}&select=rol,activo`);
  const p = r.ok ? (await r.json())?.[0] : null;
  return !!p && p.activo !== false && ['superadmin', 'admin', 'director', 'consultor', 'gestion'].includes(p.rol);
}

function tokenOk(req, url) {
  const esperado = env('PUBLICACIONES_TOKEN');
  if (!esperado) return false;
  const dado = req.headers.get('x-publicaciones-token') || url.searchParams.get('token') || '';
  return dado === esperado;
}

export default async (req) => {
  if (!env('SUPABASE_URL') || !env('SUPABASE_SERVICE_ROLE_KEY')) return json({ ok: false, error: 'Backend no configurado.' }, 500);
  const url = new URL(req.url);
  let body = {};
  if (req.method === 'POST') { try { body = await req.json(); } catch { body = {}; } }
  const accion = body.accion || url.searchParams.get('accion') || '';

  // ── Pública: los enlaces de los últimos días, para /enlaces/ (la «bio» de Instagram) ──
  if (accion === 'enlaces') {
    const desde = new Date(Date.now() - 10 * 864e5).toISOString().slice(0, 10);
    const r = await sb(`/rest/v1/publicaciones?red=eq.instagram&fecha=gte.${desde}&fecha=not.is.null&select=id,fecha,hora,texto,imagen_url,enlace,campana,publicado_en&order=fecha.desc,hora.desc&limit=40`);
    const filas = r.ok ? await r.json() : [];
    const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
    const vistos = new Set(); const out = [];
    for (const f of filas) {
      if (f.fecha > hoy || !f.enlace) continue;               // lo de mañana no se enseña
      const clave = `${f.fecha}|${f.enlace}`; if (vistos.has(clave)) continue; vistos.add(clave);
      out.push({ fecha: f.fecha, titulo: String(f.texto || '').split('\n')[0].replace(/^[^\p{L}\p{N}]+/u, '').trim(), enlace: f.enlace.replace(/\?utm_[^#]*/, ''), imagen: f.imagen_url, campana: f.campana });
      if (out.length >= 8) break;
    }
    return new Response(JSON.stringify({ ok: true, hoy, enlaces: out }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600', 'Access-Control-Allow-Origin': '*' } });
  }

  const autorizado = tokenOk(req, url) || await esEquipo(req);
  if (!autorizado) return json({ ok: false, error: env('PUBLICACIONES_TOKEN') ? 'No autorizado.' : 'Falta PUBLICACIONES_TOKEN en Netlify.' }, 401);

  if (accion === 'pendientes') {
    const max = Math.max(1, Math.min(50, Number(url.searchParams.get('max') || body.max || 10)));
    const r = await sb('/rest/v1/rpc/publicaciones_pendientes', { method: 'POST', body: { p_max: max } });
    if (!r.ok) return json({ ok: false, error: `No se pudieron leer las pendientes (${r.status}). ¿Está aplicada la v139?` }, 502);
    // Los reels de Orbita esperan a que los vídeos estén en el bucket: hasta que
    // PUBLICAR_REELS=1 en Netlify no se entregan (y no se cuentan como intento).
    const filas = (await r.json()).filter((f) => f.red !== 'instagram_reel' || env('PUBLICAR_REELS') === '1');
    // Se anota el intento al entregarlas: si Make se cae a medias, no se repite la misma fila sin límite.
    for (const f of filas) await sb(`/rest/v1/publicaciones?id=eq.${encodeURIComponent(f.id)}`, { method: 'PATCH', body: { intentos: (f.intentos || 0) + 1 }, headers: { Prefer: 'return=minimal' } }).catch(() => {});
    return json({ ok: true, n: filas.length, pendientes: filas.map((f) => ({ id: f.id, red: f.red, texto: f.texto || '', imagen_url: f.imagen_url || '', enlace: f.enlace || '', video_url: f.video_url || '', titulo: f.titulo || '', campana: f.campana, fecha: f.fecha, hora: f.hora })) });
  }

  if (accion === 'marcar') {
    const id = String(body.id || '').trim();
    if (!id) return json({ ok: false, error: 'Falta id.' }, 400);
    const ok = body.ok === true || body.ok === 'true' || body.ok === 1 || body.ok === '1';
    const patch = ok
      ? { publicado_en: new Date().toISOString(), publicado_ref: body.ref ? String(body.ref).slice(0, 200) : null, error: null }
      : { error: String(body.error || 'error sin detalle').slice(0, 1000) };
    const r = await sb(`/rest/v1/publicaciones?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: patch, headers: { Prefer: 'return=representation' } });
    if (!r.ok) return json({ ok: false, error: `No se pudo marcar (${r.status}).` }, 502);
    const fila = (await r.json())?.[0];
    if (!fila) return json({ ok: false, error: `No existe la publicación ${id}.` }, 404);
    return json({ ok: true, id, publicado_en: fila.publicado_en, error: fila.error });
  }

  if (accion === 'sincronizar') {
    const r = await sincronizarDesdeWeb();
    return json({ ok: r.ok, ...r });
  }

  if (accion === 'estado') {
    const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
    const [pend, ult, err, tot] = await Promise.all([
      sb('/rest/v1/rpc/publicaciones_pendientes', { method: 'POST', body: { p_max: 50 } }).then((r) => (r.ok ? r.json() : [])),
      sb('/rest/v1/publicaciones?publicado_en=not.is.null&select=id,red,campana,publicado_en,fecha,hora&order=publicado_en.desc&limit=10').then((r) => (r.ok ? r.json() : [])),
      sb('/rest/v1/publicaciones?error=not.is.null&publicado_en=is.null&select=id,red,campana,fecha,hora,error,intentos&order=fecha.desc&limit=20').then((r) => (r.ok ? r.json() : [])),
      sb('/rest/v1/publicaciones?select=id&limit=1', { headers: { Prefer: 'count=exact' } }).then((r) => Number((r.headers.get('content-range') || '').split('/')[1] || 0)),
    ]);
    return json({ ok: true, hoy, total: tot, pendientes_ahora: pend.length, ultimas: ult, errores: err, token_configurado: !!env('PUBLICACIONES_TOKEN') });
  }

  return json({ ok: false, error: 'Acción no reconocida (pendientes, marcar, sincronizar, estado).' }, 400);
};

export const config = { path: '/api/publicaciones' };
