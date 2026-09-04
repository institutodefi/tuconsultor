// /api/indexnow · Notificación push de URLs a los buscadores que soportan IndexNow
// (Bing, Yandex, Naver, Seznam y, por extensión, DuckDuckGo y Yahoo, que usan el
// índice de Bing). Google NO participa en el protocolo: para Google el canal
// siguen siendo el sitemap y Search Console.
//
// ── Cómo se dispara ────────────────────────────────────────────────────────
// A) Automático tras cada despliegue:
//    Netlify → Site configuration → Notifications → Outgoing webhook
//    Evento: "Deploy succeeded"  ·  URL: https://www.tuconsultor.com/api/indexnow
//    (Netlify manda un POST con el JSON del deploy; aquí se ignora el cuerpo.)
//
// B) Manual, para forzar el envío de URLs concretas:
//    curl -X POST https://www.tuconsultor.com/api/indexnow \
//      -H "content-type: application/json" \
//      -H "x-indexnow-token: $INDEXNOW_TOKEN" \
//      -d '{"urls":["https://www.tuconsultor.com/areas/sostenibilidad/iso-20121.html"]}'
//
// ── Variables de entorno ───────────────────────────────────────────────────
//   INDEXNOW_KEY    clave hospedada en https://www.tuconsultor.com/<clave>.txt
//   INDEXNOW_TOKEN  (opcional) secreto para los envíos manuales con lista propia
//
// ── Criterio de envío ──────────────────────────────────────────────────────
// Sin lista explícita, lee sitemap.xml y envía SOLO las URLs cuyo <lastmod>
// coincide con la fecha más reciente del sitemap, es decir, lo que ha cambiado
// en esta versión. IndexNow penaliza el envío repetido de URLs sin cambios.

const HOST = 'www.tuconsultor.com';
const SITEMAP = `https://${HOST}/sitemap.xml`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_URLS = 10000;

async function urlsCambiadas() {
  const r = await fetch(SITEMAP, { headers: { 'user-agent': 'tuconsultor-indexnow' } });
  if (!r.ok) throw new Error(`sitemap ${r.status}`);
  const xml = await r.text();

  const entradas = [];
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = m[1].match(/<loc>([^<]+)<\/loc>/)?.[1];
    const mod = m[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
    if (loc) entradas.push({ loc: loc.trim(), mod: (mod || '').slice(0, 10) });
  }
  if (!entradas.length) return [];

  const ultima = entradas.reduce((a, e) => (e.mod > a ? e.mod : a), '');
  if (!ultima) return entradas.map((e) => e.loc).slice(0, MAX_URLS);
  return entradas.filter((e) => e.mod === ultima).map((e) => e.loc).slice(0, MAX_URLS);
}

export default async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const key = process.env.INDEXNOW_KEY;
  if (!key) return Response.json({ ok: false, error: 'INDEXNOW_KEY no configurada' }, { status: 500 });

  let urls = null;
  if (req.method === 'POST') {
    let cuerpo = {};
    try { cuerpo = await req.json(); } catch { /* webhook de Netlify o cuerpo vacío */ }
    if (Array.isArray(cuerpo?.urls) && cuerpo.urls.length) {
      // Lista explícita: exige token, para que nadie pueda usar el endpoint de altavoz.
      const token = process.env.INDEXNOW_TOKEN;
      if (!token || req.headers.get('x-indexnow-token') !== token) {
        return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 });
      }
      urls = cuerpo.urls
        .map((u) => String(u).trim())
        .filter((u) => u.startsWith(`https://${HOST}/`))
        .slice(0, MAX_URLS);
      if (!urls.length) return Response.json({ ok: false, error: 'Ninguna URL válida del dominio' }, { status: 400 });
    }
  }

  try {
    if (!urls) urls = await urlsCambiadas();
  } catch (e) {
    return Response.json({ ok: false, error: `No se pudo leer el sitemap: ${e.message}` }, { status: 502 });
  }

  if (!urls.length) return Response.json({ ok: true, enviadas: 0, nota: 'Nada nuevo que notificar' });

  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key,
      keyLocation: `https://${HOST}/${key}.txt`,
      urlList: urls,
    }),
  });

  // 200 = aceptado · 202 = aceptado, clave pendiente de validar
  const ok = r.status === 200 || r.status === 202;
  return Response.json(
    { ok, estado: r.status, enviadas: urls.length, muestra: urls.slice(0, 5) },
    { status: ok ? 200 : 502 },
  );
};
