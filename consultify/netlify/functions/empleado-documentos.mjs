// ════════════════════════════════════════════════════════════════════════════
// DOCUMENTOS DEL EMPLEADO · nóminas, contratos, formación
//
// Mismo patrón que `documentos.mjs` —bucket privado, enlaces firmados— pero con
// reglas de acceso más estrictas, porque aquí hay nóminas.
//
//   subir    solo Administración. Ni siquiera la propia persona sube su nómina:
//            la emite la empresa, y permitir que cada uno cargue las suyas
//            abriría la puerta a versiones que no coinciden con las emitidas.
//   enlace   la persona puede descargar LAS SUYAS; Administración, todas.
//   borrar   solo Administración.
//
// Dirección de proyecto queda fuera a propósito: lleva equipos, pero la
// retribución de sus compañeros no es asunto suyo. Meterla en su alcance por
// comodidad es como se filtran estas cosas.
// ════════════════════════════════════════════════════════════════════════════

const DEPOSITO = 'empleados';
const TAMANO_MAX = 15 * 1024 * 1024;
const TIPOS_OK = [
  'application/pdf',
  'image/png', 'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const json = (b, s = 200) => new Response(JSON.stringify(b), {
  status: s, headers: { 'Content-Type': 'application/json' },
});
const env = (n) => process.env[n] || '';

async function sb(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  return fetch(`${env('SUPABASE_URL')}${path}`, {
    method,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`,
      ...(raw ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: raw ? body : (body ? JSON.stringify(body) : undefined),
  });
}

async function quienLlama(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const u = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, {
    headers: { apikey: env('SUPABASE_ANON_KEY'), Authorization: `Bearer ${token}` },
  });
  if (!u.ok) return null;
  const { id } = await u.json();
  if (!id) return null;
  const p = await sb(`/rest/v1/perfiles?id=eq.${id}&select=id,rol,activo`);
  const perfil = p.ok ? (await p.json())?.[0] : null;
  return perfil?.activo ? perfil : null;
}

/** Solo Administración gestiona documentación laboral. */
const ES_RRHH = (rol) => ['superadmin', 'admin'].includes(rol);

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido' }, 405);

  const quien = await quienLlama(req);
  if (!quien) return json({ ok: false, error: 'Sesión no válida.' }, 401);

  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'Cuerpo no válido' }, 400); }
  const { action } = body;

  // ── SUBIR ────────────────────────────────────────────────────────────────
  if (action === 'subir') {
    if (!ES_RRHH(quien.rol)) {
      return json({ ok: false, error: 'Solo Administración puede subir documentación laboral.' }, 403);
    }
    const { perfil_id, tipo, titulo, periodo, notas, nombre, mime, base64 } = body;
    if (!perfil_id || !titulo || !base64) return json({ ok: false, error: 'Faltan datos.' }, 400);
    if (!TIPOS_OK.includes(mime)) {
      return json({ ok: false, error: 'Se aceptan PDF, imagen y Word.' }, 400);
    }
    const bytes = Buffer.from(base64, 'base64');
    if (bytes.length > TAMANO_MAX) {
      return json({ ok: false, error: `Máximo 15 MB; este pesa ${(bytes.length / 1048576).toFixed(1)}.` }, 400);
    }

    const limpio = String(nombre || 'documento').replace(/[^\w.\-]/g, '_').slice(0, 60);
    const ruta = `${perfil_id}/${Date.now()}_${limpio}`;
    const sub = await sb(`/storage/v1/object/${DEPOSITO}/${ruta}`, {
      method: 'POST', raw: true, body: bytes,
      headers: { 'Content-Type': mime || 'application/octet-stream', 'x-upsert': 'true' },
    });
    if (!sub.ok) {
      const t = await sub.text().catch(() => '');
      return json({ ok: false, error: `No se pudo guardar: ${t.slice(0, 200)}` }, 502);
    }

    const ins = await sb('/rest/v1/empleado_documentos', {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: {
        perfil_id, tipo: tipo || 'nomina', titulo,
        periodo: periodo || null, notas: notas || null,
        ruta, nombre_fichero: nombre || null, mime, tamano: bytes.length,
        subido_por: quien.id,
      },
    });
    if (!ins.ok) {
      const t = await ins.text().catch(() => '');
      return json({ ok: false, error: `Archivo guardado pero no registrado: ${t.slice(0, 200)}` }, 502);
    }
    return json({ ok: true, documento: (await ins.json())?.[0] });
  }

  // ── ENLACE FIRMADO ───────────────────────────────────────────────────────
  if (action === 'enlace') {
    const { documento_id } = body;
    const q = await sb(`/rest/v1/empleado_documentos?id=eq.${documento_id}&select=ruta,perfil_id,nombre_fichero`);
    const doc = q.ok ? (await q.json())?.[0] : null;
    if (!doc) return json({ ok: false, error: 'Documento no encontrado.' }, 404);

    // Aquí se usa service_role, que se salta RLS: la comprobación de que el
    // documento es tuyo hay que hacerla a mano, o cualquiera con un id podría
    // descargar la nómina de otro.
    if (!ES_RRHH(quien.rol) && String(doc.perfil_id) !== String(quien.id)) {
      return json({ ok: false, error: 'Ese documento no es tuyo.' }, 403);
    }

    // Diez minutos: una nómina no necesita un enlace que siga vivo una hora
    // después de haberla abierto.
    const f = await sb(`/storage/v1/object/sign/${DEPOSITO}/${doc.ruta}`, {
      method: 'POST', body: { expiresIn: 600 },
    });
    if (!f.ok) return json({ ok: false, error: 'No se pudo firmar el enlace.' }, 502);
    const { signedURL } = await f.json();
    return json({ ok: true, url: `${env('SUPABASE_URL')}/storage/v1${signedURL}`, nombre: doc.nombre_fichero });
  }

  // ── BORRAR ───────────────────────────────────────────────────────────────
  if (action === 'borrar') {
    if (!ES_RRHH(quien.rol)) return json({ ok: false, error: 'Solo Administración.' }, 403);
    const { documento_id } = body;
    const q = await sb(`/rest/v1/empleado_documentos?id=eq.${documento_id}&select=ruta`);
    const doc = q.ok ? (await q.json())?.[0] : null;
    if (doc?.ruta) await sb(`/storage/v1/object/${DEPOSITO}/${doc.ruta}`, { method: 'DELETE' });
    await sb(`/rest/v1/empleado_documentos?id=eq.${documento_id}`, { method: 'DELETE' });
    return json({ ok: true });
  }

  return json({ ok: false, error: 'Acción no reconocida.' }, 400);
};

export const config = { path: '/api/empleado-documentos' };
