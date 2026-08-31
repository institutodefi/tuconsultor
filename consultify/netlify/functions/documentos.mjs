// ════════════════════════════════════════════════════════════════════════════
// DOCUMENTOS DEL CLIENTE · subida, enlace firmado y lectura por IA
//
// Tres acciones:
//   subir     guarda el fichero en el bucket privado y crea la fila
//   enlace    devuelve una URL firmada y caduca para descargarlo
//   analizar  pide a Claude que lea el documento y extraiga lo que importa
//
// Por qué el bucket es PRIVADO y se firma cada descarga: aquí hay escrituras,
// pólizas y certificados. En el bucket 'ofertas' la lectura es pública porque
// esos PDF se envían por correo de todas formas; un certificado con el CIF y el
// domicilio del cliente, no.
//
// La NOTA de la IA es interna. La función la escribe con service_role y la
// política de `documento_notas` solo deja leerla al equipo: aunque el portal
// del cliente pidiera la tabla entera, no la recibiría.
// ════════════════════════════════════════════════════════════════════════════

const DEPOSITO = 'documentos';
const MODELO = 'claude-sonnet-4-6';

// Lo que se acepta. Se limita a propósito: un ejecutable o un archivo comprimido
// en un expediente de cliente no tiene explicación, y ampliar la lista es más
// fácil que retirar un fichero que no debió subirse.
const TIPOS_OK = [
  'application/pdf',
  'image/png', 'image/jpeg', 'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];
const TAMANO_MAX = 20 * 1024 * 1024;   // 20 MB

const json = (b, s = 200) => new Response(JSON.stringify(b), {
  status: s, headers: { 'Content-Type': 'application/json' },
});

const env = (n) => process.env[n] || '';

async function sb(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const base = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const r = await fetch(`${base}${path}`, {
    method,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`,
      ...(raw ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: raw ? body : (body ? JSON.stringify(body) : undefined),
  });
  return r;
}

/** Comprueba el token de quien llama y devuelve su perfil. */
async function quienLlama(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const base = env('SUPABASE_URL');
  const anon = env('SUPABASE_ANON_KEY');
  const u = await fetch(`${base}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: `Bearer ${token}` },
  });
  if (!u.ok) return null;
  const { id } = await u.json();
  if (!id) return null;
  const p = await sb(`/rest/v1/perfiles?id=eq.${id}&select=id,rol,activo`);
  const perfil = p.ok ? (await p.json())?.[0] : null;
  return perfil?.activo ? perfil : { id, rol: 'cliente', activo: true };
}

const ES_EQUIPO = (rol) => ['superadmin', 'admin', 'director', 'consultor', 'gestion'].includes(rol);

// ── Lo que se le pide a la IA ───────────────────────────────────────────────
//
// El objetivo NO es describir el documento, es sacar los datos que cuesta
// encontrar: el alcance literal de un certificado, sus sedes, el CIF que
// aparece de verdad (que a veces no coincide con el del CRM) y las fechas de
// validez. Por eso se pide JSON y no prosa.
const INSTRUCCIONES = `Eres un consultor de sistemas de gestión revisando un documento de un cliente.

Extrae SOLO lo que aparezca literalmente en el documento. Si un dato no está, deja el campo en null: es mucho más útil un hueco que una suposición, porque estos datos se usan para verificar el expediente.

Devuelve EXCLUSIVAMENTE un objeto JSON, sin texto alrededor ni bloques de código, con esta forma:

{
  "tipo": "certificado|auditoria|escritura|poder|politica|organigrama|licencia|seguro|otro",
  "resumen": "Dos o tres frases: qué es y para qué sirve en el expediente.",
  "norma": "9001 | 14001 | 45001 | 27001 | ENS | EFQM | ... o null",
  "emisor": "entidad certificadora o quien emite, o null",
  "razon_social": "la razón social tal y como figura, o null",
  "cif": "el CIF/NIF que aparece, o null",
  "alcance": "el alcance CERTIFICADO, literal, o null",
  "sedes": ["direcciones o centros que se citen"],
  "valido_desde": "AAAA-MM-DD o null",
  "valido_hasta": "AAAA-MM-DD o null",
  "numero": "número de certificado o expediente, o null",
  "avisos": ["cosas que convenga mirar: caducado, alcance distinto del esperado, CIF que no cuadra..."],
  "confianza": "alta|media|baja"
}

Sobre la confianza: "alta" si el documento se lee bien y los datos son inequívocos; "media" si hay que interpretar algo; "baja" si está borroso, incompleto o no es lo que parece.`;

async function analizarConIA(base64, mime, nombre) {
  const clave = env('ANTHROPIC_API_KEY');
  if (!clave) {
    return { error: 'Falta ANTHROPIC_API_KEY en las variables de Netlify.' };
  }

  // Los PDF van como documento; las imágenes, como imagen. Word no lo lee el
  // modelo directamente: se dice en vez de fingir un análisis.
  let contenido;
  if (mime === 'application/pdf') {
    contenido = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } };
  } else if (mime.startsWith('image/')) {
    contenido = { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } };
  } else {
    return { error: 'Solo se pueden leer PDF e imágenes. Convierte el documento a PDF para analizarlo.' };
  }

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': clave,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [contenido, { type: 'text', text: `${INSTRUCCIONES}\n\nNombre del fichero: ${nombre}` }],
      }],
    }),
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    return { error: `La IA no respondió (${r.status}). ${t.slice(0, 200)}` };
  }

  const j = await r.json();
  const texto = (j.content || []).filter((x) => x.type === 'text').map((x) => x.text).join('\n');

  // El modelo puede envolver el JSON en ```json pese a lo pedido.
  const limpio = texto.replace(/```json|```/g, '').trim();
  try {
    return { datos: JSON.parse(limpio), modelo: MODELO };
  } catch {
    // Si no se puede leer como JSON, se guarda el texto: media nota es mejor
    // que ninguna, y así se ve qué devolvió.
    return { datos: { resumen: limpio.slice(0, 2000), confianza: 'baja' }, modelo: MODELO };
  }
}

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido' }, 405);

  const quien = await quienLlama(req);
  if (!quien) return json({ ok: false, error: 'Sesión no válida.' }, 401);

  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'Cuerpo no válido' }, 400); }
  const { action } = body;

  // ── SUBIR ────────────────────────────────────────────────────────────────
  if (action === 'subir') {
    const { cliente_id, proyecto_id, titulo, tipo, descripcion, nombre, mime, base64 } = body;
    if (!cliente_id || !titulo || !base64) return json({ ok: false, error: 'Faltan datos.' }, 400);
    if (!TIPOS_OK.includes(mime)) {
      return json({ ok: false, error: `Tipo de archivo no admitido (${mime}). Se aceptan PDF, imágenes y Word.` }, 400);
    }
    const bytes = Buffer.from(base64, 'base64');
    if (bytes.length > TAMANO_MAX) {
      return json({ ok: false, error: `El archivo pesa ${(bytes.length / 1048576).toFixed(1)} MB y el máximo son 20 MB.` }, 400);
    }

    const limpio = String(nombre || 'documento').replace(/[^\w.\-]/g, '_').slice(0, 60);
    const ruta = `${cliente_id}/${Date.now()}_${limpio}`;

    const sub = await sb(`/storage/v1/object/${DEPOSITO}/${ruta}`, {
      method: 'POST', raw: true, body: bytes,
      headers: { 'Content-Type': mime || 'application/octet-stream', 'x-upsert': 'true' },
    });
    if (!sub.ok) {
      const t = await sub.text().catch(() => '');
      return json({ ok: false, error: `No se pudo guardar el archivo: ${t.slice(0, 200)}` }, 502);
    }

    const fila = {
      cliente_id, proyecto_id: proyecto_id || null,
      titulo, tipo: tipo || 'otro', descripcion: descripcion || null,
      ruta, nombre_fichero: nombre || null, mime, tamano: bytes.length,
      subido_por: quien.id,
      subido_por_cliente: !ES_EQUIPO(quien.rol),
    };
    const ins = await sb('/rest/v1/cliente_documentos', {
      method: 'POST', body: fila, headers: { Prefer: 'return=representation' },
    });
    if (!ins.ok) {
      const t = await ins.text().catch(() => '');
      return json({ ok: false, error: `Archivo guardado pero no registrado: ${t.slice(0, 200)}` }, 502);
    }
    const doc = (await ins.json())?.[0];
    return json({ ok: true, documento: doc });
  }

  // ── ENLACE FIRMADO ───────────────────────────────────────────────────────
  if (action === 'enlace') {
    const { documento_id } = body;
    if (!documento_id) return json({ ok: false, error: 'Falta el documento.' }, 400);

    const q = await sb(`/rest/v1/cliente_documentos?id=eq.${documento_id}&select=ruta,cliente_id,nombre_fichero`);
    const doc = q.ok ? (await q.json())?.[0] : null;
    if (!doc) return json({ ok: false, error: 'Documento no encontrado.' }, 404);

    // Si no es del equipo, se comprueba que el documento sea suyo. La política
    // de la tabla ya lo haría, pero aquí se usa service_role —que la ignora—,
    // así que hay que comprobarlo a mano.
    if (!ES_EQUIPO(quien.rol)) {
      const c = await sb(`/rest/v1/clientes?id=eq.${doc.cliente_id}&select=user_id`);
      const cli = c.ok ? (await c.json())?.[0] : null;
      if (!cli || String(cli.user_id) !== String(quien.id)) {
        return json({ ok: false, error: 'Ese documento no es tuyo.' }, 403);
      }
    }

    // Una hora: suficiente para abrirlo o descargarlo, poco para que un enlace
    // reenviado siga sirviendo indefinidamente.
    const f = await sb(`/storage/v1/object/sign/${DEPOSITO}/${doc.ruta}`, {
      method: 'POST', body: { expiresIn: 3600 },
    });
    if (!f.ok) return json({ ok: false, error: 'No se pudo firmar el enlace.' }, 502);
    const { signedURL } = await f.json();
    return json({ ok: true, url: `${env('SUPABASE_URL')}/storage/v1${signedURL}`, nombre: doc.nombre_fichero });
  }

  // ── ANALIZAR ─────────────────────────────────────────────────────────────
  if (action === 'analizar') {
    // La nota es interna: solo el equipo la pide y solo el equipo la ve.
    if (!ES_EQUIPO(quien.rol)) return json({ ok: false, error: 'Solo el equipo puede analizar documentos.' }, 403);

    const { documento_id } = body;
    const q = await sb(`/rest/v1/cliente_documentos?id=eq.${documento_id}&select=*`);
    const doc = q.ok ? (await q.json())?.[0] : null;
    if (!doc) return json({ ok: false, error: 'Documento no encontrado.' }, 404);

    const d = await sb(`/storage/v1/object/${DEPOSITO}/${doc.ruta}`);
    if (!d.ok) return json({ ok: false, error: 'No se pudo leer el archivo.' }, 502);
    const base64 = Buffer.from(await d.arrayBuffer()).toString('base64');

    const r = await analizarConIA(base64, doc.mime, doc.nombre_fichero || doc.titulo);
    if (r.error) return json({ ok: false, error: r.error }, 502);

    const datos = r.datos || {};
    const nota = {
      documento_id,
      resumen: datos.resumen || null,
      datos,
      modelo: r.modelo,
      confianza: ['alta', 'media', 'baja'].includes(datos.confianza) ? datos.confianza : 'media',
      revisada: false,
    };
    // Una nota por documento: si se reanaliza, se sustituye.
    await sb(`/rest/v1/documento_notas?documento_id=eq.${documento_id}`, { method: 'DELETE' });
    const ins = await sb('/rest/v1/documento_notas', {
      method: 'POST', body: nota, headers: { Prefer: 'return=representation' },
    });
    if (!ins.ok) {
      const t = await ins.text().catch(() => '');
      return json({ ok: false, error: `No se pudo guardar la nota: ${t.slice(0, 200)}` }, 502);
    }

    // Los datos que la IA ha sacado y el documento no tenía, se proponen: NO se
    // escriben solos. Una fecha de caducidad mal leída activaría avisos falsos.
    const propuestas = {};
    for (const [campoDoc, campoIA] of [['norma', 'norma'], ['emisor', 'emisor'],
      ['valido_desde', 'valido_desde'], ['valido_hasta', 'valido_hasta']]) {
      if (!doc[campoDoc] && datos[campoIA]) propuestas[campoDoc] = datos[campoIA];
    }

    return json({ ok: true, nota: (await ins.json())?.[0], propuestas });
  }

  return json({ ok: false, error: 'Acción no reconocida.' }, 400);
};

export const config = { path: '/api/documentos' };
