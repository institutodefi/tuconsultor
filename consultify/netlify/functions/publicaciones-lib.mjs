// ════════════════════════════════════════════════════════════════════════════
// PUBLICACIONES · lo que comparten la API y el cron (v139)
//   · parsear el CSV del calendario (comillas dobles, saltos de línea dentro del texto)
//   · volcarlo en Supabase por id sin pisar lo publicado
// ════════════════════════════════════════════════════════════════════════════

export const WEB = process.env.WEB_URL || 'https://www.tuconsultor.com';
const env = (n) => process.env[n] || '';

export async function sb(path, { method = 'GET', body, headers = {} } = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  return fetch(`${env('SUPABASE_URL')}${path}`, {
    method, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** CSV RFC 4180: campos entre comillas pueden llevar comas, comillas dobladas y saltos de línea. */
export function parsearCsv(texto) {
  const filas = []; let fila = []; let campo = ''; let enComillas = false;
  const s = String(texto || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (enComillas) {
      if (c === '"') { if (s[i + 1] === '"') { campo += '"'; i++; } else enComillas = false; }
      else campo += c;
    } else if (c === '"') enComillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      fila.push(campo); campo = ''; filas.push(fila); fila = [];
    } else campo += c;
  }
  if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
  if (!filas.length) return [];
  const cab = filas[0].map((h) => h.trim());
  return filas.slice(1).filter((f) => f.some((v) => v !== '')).map((f) => Object.fromEntries(cab.map((h, i) => [h, f[i] ?? ''])));
}

const fechaIso = (dmy) => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(dmy || '').trim()); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null; };
const horaSql = (h) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(h || '').trim()); return m ? `${m[1].padStart(2, '0')}:${m[2]}:00` : null; };

export function campanaDe(r) {
  const id = String(r.id || '');
  if (/^PV/i.test(id)) return 'premios';
  if (/^R\d/i.test(id) || /reel/.test(r.red || '')) return 'reels';
  if (/utm_campaign=orbita-ventajas/.test(r.texto || '') || /\/orbita\/V\d\d[A-Z]_/.test(r.imagen_url || '')) return 'orbita-ventajas';
  if (/\/orbita\//.test(r.enlace || '')) return 'orbita';
  if (/\/blog\//.test(r.enlace || '')) return 'blog';
  return 'otros';
}

/** Fila del CSV → fila de la tabla (solo columnas de contenido: lo publicado no se toca). */
export function filaTabla(r) {
  return {
    id: String(r.id).trim(), fecha: fechaIso(r.fecha), hora: horaSql(r.hora), red: String(r.red || '').trim().toLowerCase(),
    texto: r.texto || null, imagen_url: r.imagen_url || null, enlace: r.enlace || null,
    video_url: r.video_url || null, titulo: r.titulo || null, campana: campanaDe(r), origen: 'csv',
  };
}

/** Descarga los dos CSV de la web y los vuelca. Devuelve el resumen. */
export async function sincronizarDesdeWeb({ url = WEB } = {}) {
  const fuentes = [`${url}/data/calendario_publicacion.csv`, `${url}/data/calendario_reels.csv`];
  const filas = [];
  const errores = [];
  for (const f of fuentes) {
    try {
      const r = await fetch(f, { headers: { 'Cache-Control': 'no-cache' } });
      if (!r.ok) { errores.push(`${f}: HTTP ${r.status}`); continue; }
      filas.push(...parsearCsv(await r.text()).map(filaTabla).filter((x) => x.id && x.red));
    } catch (e) { errores.push(`${f}: ${String(e?.message || e)}`); }
  }
  let subidas = 0;
  for (let i = 0; i < filas.length; i += 200) {
    const lote = filas.slice(i, i + 200);
    const r = await sb('/rest/v1/publicaciones?on_conflict=id', { method: 'POST', body: lote, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
    if (!r.ok) errores.push(`lote ${i}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
    else subidas += lote.length;
  }
  return { ok: errores.length === 0, filas: filas.length, subidas, errores };
}
