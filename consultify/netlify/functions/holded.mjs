// netlify/functions/holded.mjs
// Integración con Holded (facturación). SOLO backend: la API key nunca llega al
// navegador.
//
// ⚠ LAS DOS APIS DE HOLDED NO SE AUTENTICAN IGUAL:
//   · /api/v2/...            → Authorization: Bearer <token>   (API nueva, jun-2026)
//   · /api/invoicing/v1/...  → cabecera  key: <apiKey>         (API clásica)
// Además los tokens son distintos: los de v1 se generan en el banner
// "Go to Api Keys v1" de Ajustes › Desarrolladores › Credenciales. Mandar un
// token de v1 como Bearer (o uno de v2 en la cabecera key) devuelve HTTP 403.
//
// El vínculo Consultify↔Holded se hace por CIF/NIF. En Holded el CIF se guarda en
// el campo `code` del contacto. Buscamos listando contactos y comparando `code`.
//
// Seguridad: el front envía el access_token del usuario; verificamos contra
// Supabase que es del equipo (superadmin/admin/director) antes de operar.
//
// Acciones (body.action):
//   buscar_por_cif {cif}
//   crear {cliente}
//   actualizar {holded_id, cliente}
//   sincronizar {cliente}   → busca por CIF; vincula/actualiza o crea
//
// Variables de entorno (Netlify, SIN prefijo VITE_):
//   HOLDED_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const HOLDED_BASE = 'https://api.holded.com/api/v2';
// Endpoint alternativo (API invoicing v1, muy usado). Si el v2 no devuelve
// contactos, probamos este. Su auth también admite Bearer y la cabecera key.
const HOLDED_BASE_INV = 'https://api.holded.com/api/invoicing/v1';

// Clave por API. Si solo hay una configurada, se usa para las dos y ya avisará
// el diagnóstico de cuál falla.
const CLAVE_V2 = () => process.env.HOLDED_API_KEY || process.env.HOLDED_API_KEY_V2 || '';
const CLAVE_V1 = () => process.env.HOLDED_API_KEY_V1 || process.env.HOLDED_API_KEY || '';

// Cabeceras de autenticación según el endpoint al que vamos.
function cabeceras(base) {
  const comunes = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (base === HOLDED_BASE_INV) return { ...comunes, key: CLAVE_V1() };
  return { ...comunes, Authorization: `Bearer ${CLAVE_V2()}` };
}

// Huella de una clave: lo justo para diagnosticar sin revelar el secreto.
// Nunca devuelve la clave completa: solo longitud, extremos y anomalías.
function huella(clave) {
  const c = String(clave || '');
  if (!c) return { configurada: false };
  return {
    configurada: true,
    longitud: c.length,
    empieza: c.slice(0, 4),
    acaba: c.slice(-4),
    // Anomalías típicas al pegar el valor en el panel de Netlify:
    espacios_alrededor: c !== c.trim(),
    salto_de_linea: /[\r\n]/.test(c),
    comillas: /^["']|["']$/.test(c),
    caracteres_raros: /[^A-Za-z0-9._\-]/.test(c.trim()),
    solo_hex: /^[a-f0-9]+$/i.test(c.trim()),
  };
}

// Mensaje legible a partir de la respuesta de error de Holded.
function motivo(status, data) {
  const propio = data && typeof data === 'object'
    ? (data.message || data.error || data.info || null)
    : (typeof data === 'string' && data.trim() ? data.trim().slice(0, 200) : null);
  if (status === 403) {
    return propio
      ? `Holded rechaza la clave (403): ${propio}`
      : 'Holded rechaza la clave (403). Suele ser una de tres: el token no corresponde a esa API '
        + '(v1 usa la cabecera "key", v2 usa Bearer), el token no tiene el permiso de contactos, o está caducado.';
  }
  if (status === 401) return propio || 'Holded no reconoce la clave (401): revisa HOLDED_API_KEY en Netlify.';
  if (status === 429) return 'Holded ha limitado las peticiones (429). Espera un minuto y reinténtalo.';
  return propio || `Holded ha respondido HTTP ${status}.`;
}
const ROLES_OK = ['superadmin', 'admin', 'director'];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

// Verifica el token del llamante contra Supabase y comprueba que es de equipo.
async function autorizar(token) {
  if (!token) return null;
  const SUPA = process.env.SUPABASE_URL, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ru = await fetch(`${SUPA}/auth/v1/user`, { headers: { apikey: SERVICE, Authorization: `Bearer ${token}` } });
  if (!ru.ok) return null;
  const u = await ru.json();
  if (!u?.id) return null;
  const rp = await fetch(`${SUPA}/rest/v1/perfiles?id=eq.${u.id}&select=rol,activo`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
  });
  const perfil = (await rp.json())?.[0];
  if (!perfil || !perfil.activo || !ROLES_OK.includes(perfil.rol)) return null;
  return { id: u.id, ...perfil };
}

// Llama a la API v2 de Holded (auth Bearer, confirmada para esta cuenta).
async function holded(path, { method = 'GET', body, base = HOLDED_BASE } = {}) {
  let r;
  try {
    r = await fetch(`${base}${path}`, {
      method,
      headers: cabeceras(base),
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    return { ok: false, status: 0, data: `No se pudo contactar con Holded: ${e.message}` };
  }
  const txt = await r.text();
  let data; try { data = JSON.parse(txt); } catch { data = txt; }
  const holdedError = data && typeof data === 'object' && (data.status === 0 || data.error);
  return { ok: r.ok && !holdedError, status: r.status, data };
}

const norm = (s) => String(s || '').toUpperCase().replace(/[\s\-.]/g, '');

// Extrae el array de contactos de la respuesta (v2 pagina con {data:[...]}).
function listaContactos(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;   // formato v2 real: {items, cursor, has_more}
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.contacts)) return data.contacts;
  return [];
}

// El CIF va en `code` (confirmado en la respuesta real de la v2). Comprobamos
// también las variantes con guion bajo por robustez.
// Todos los campos donde Holded puede llevar el CIF, según versión de API y
// cómo se haya dado de alta el contacto.
//
// OJO: hay que comparar contra TODOS, no quedarse con el primero que venga
// relleno. Si el contacto tiene un código interno en `code` (tipo CL-0001) y el
// CIF real en `vat_number`, devolver solo `code` hace que la búsqueda no
// encuentre nunca al cliente aunque esté ahí. `trade_name` se excluye a
// propósito: es el nombre comercial, nunca un CIF, y venía tapando al resto.
const cifsDe = (x) => {
  const cands = [x?.code, x?.vat_number, x?.vatnumber, x?.vatNumber, x?.taxNumber, x?.tax_number,
                 x?.custom_id, x?.customId, x?.nif, x?.cif];
  return cands.map(norm).filter(Boolean);
};

// Primer CIF encontrado (solo para mostrar/registrar, no para comparar).
const cifDe = (x) => cifsDe(x)[0] || '';

// ¿Este contacto de Holded corresponde al CIF que buscamos?
// El prefijo de país es opcional: la misma empresa puede estar aquí como
// «G28826055» y en Holded como «ESG28826055». Comparar con igualdad exacta hacía
// que no se encontrara y pareciera que Holded no la tenía.
const sinPrefijo = (v) => String(v || '').replace(/^[A-Z]{2}(?=[A-Z0-9]{8,})/, '');

const coincideCif = (x, objetivo) => {
  if (!objetivo) return false;
  const o = norm(objetivo);
  const oSin = sinPrefijo(o);
  return cifsDe(x).some((c) => c === o || sinPrefijo(c) === oSin);
};

/** Compara nombres ignorando forma societaria, acentos y palabras vacías. */
const claveNombre = (v) => String(v || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/\b(S\.?L\.?U?|S\.?A\.?|SLU|SCP|SCCL|AIE|UTE|FUNDACION|ASOCIACION)\b/g, ' ')
  .replace(/\b(DE|DEL|LA|LAS|EL|LOS|Y|PARA|POR|CON|EN)\b/g, ' ')
  .replace(/[^A-Z0-9 ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// Mapea un contacto de Holded a los campos de cliente de Consultify (para autocompletar).
function deContactoHolded(x) {
  return {
    empresa: x?.name || '',
    email: x?.email || '',
    telefono: x?.phone || x?.mobile || '',
    contacto: x?.contactPersons?.[0]?.name || x?.contact_persons?.[0]?.name || '',
    cif_matriz: norm(x?.code || x?.vat_number || ''),
  };
}

// ── Mapeo COMPLETO Holded → ficha de empresa del CRM ────────────────────────
// Holded guarda la dirección en billAddress y la web en socialNetworks.website.
// Extraemos todo lo aprovechable; lo que no venga se queda vacío y se rellena
// a mano en la ficha.
function deEmpresaHolded(x) {
  const dir = x?.billAddress || x?.bill_address || x?.address || {};
  const web = x?.socialNetworks?.website || x?.socialNetworks?.web || x?.website || x?.web || '';
  const personas = x?.contactPersons || x?.contact_persons || x?.persons || [];
  const tipo = String(x?.type || '').toLowerCase();

  return {
    nombre: x?.name || '',
    nombre_comercial: x?.tradeName || x?.trade_name || '',
    cif: norm(x?.code || x?.vatnumber || x?.vat_number || ''),
    vat_id: x?.vatnumber || x?.vat_number || '',
    email: x?.email || '',
    telefono: x?.phone ? String(x.phone) : '',
    movil: x?.mobile ? String(x.mobile) : '',
    web: web ? String(web) : '',
    direccion: dir?.address || dir?.street || '',
    poblacion: dir?.city || '',
    cp: dir?.postalCode || dir?.postal_code || dir?.zip || '',
    provincia: dir?.province || dir?.state || '',
    pais: dir?.country || 'España',
    es_cliente: x?.clientRecord != null || tipo === 'client' || tipo === 'lead',
    es_proveedor: x?.supplierRecord != null || tipo === 'supplier' || tipo === 'provider',
    tags: Array.isArray(x?.tags) ? x.tags.filter(Boolean).map(String) : [],
    notas: x?.notes || x?.note || '',
    // Personas de contacto que Holded tenga colgando del contacto
    contactos: (Array.isArray(personas) ? personas : [])
      .map((p) => ({
        nombre: p?.name || p?.firstName || '',
        email: p?.email || '',
        telefono: p?.phone ? String(p.phone) : (p?.mobile ? String(p.mobile) : ''),
        cargo: p?.job || p?.position || p?.role || '',
      }))
      .filter((p) => p.nombre || p.email),
  };
}

// Mapea un cliente de Consultify al formato de contacto de Holded v2.
// El CIF va en `code`. Solo enviamos campos con valor.
function aContactoHolded(c) {
  const out = { name: c.empresa || c.nombre || '', type: 'client' };
  const code = norm(c.cif || c.cif_matriz || '');
  if (code) out.code = code;
  if (c.email) out.email = c.email;
  if (c.telefono) out.phone = String(c.telefono);
  return out;
}

// Recorre todas las páginas de contactos buscando uno cuyo CIF coincida.
async function buscarContactoPorCif(cif, nombre) {
  const objetivo = norm(cif);
  const claveObj = claveNombre(nombre);
  // Si no se encuentra por CIF, se guarda el mejor candidato por nombre para
  // ofrecerlo: es mucho más útil que un «no encontrado» seco.
  let porNombre = null;
  // La v2 pagina por cursor: respuesta {items, cursor, has_more}.
  let cursor = null;
  for (let i = 0; i < 100; i++) { // hasta 100 lotes (cubre miles de contactos)
    const q = cursor ? `/contacts?limit=100&cursor=${encodeURIComponent(cursor)}` : '/contacts?limit=100';
    const r = await holded(q);
    if (!r.ok) return { error: r };
    const lista = listaContactos(r.data);
    if (lista.length === 0) break;
    const match = lista.find((x) => coincideCif(x, objetivo));
    if (match) return { match, base: HOLDED_BASE };

    // Candidato por nombre, por si el CIF está distinto en Holded.
    if (claveObj && !porNombre) {
      porNombre = lista.find((x) => {
        const k = claveNombre(x?.name);
        return k && (k === claveObj || k.includes(claveObj) || claveObj.includes(k));
      }) || null;
    }
    // ¿hay más páginas?
    const hayMas = r.data?.has_more === true && r.data?.cursor;
    if (!hayMas) break;
    cursor = r.data.cursor;
  }
  // Sin coincidencia de CIF: se devuelve el candidato por nombre, marcado como
  // tal para que la interfaz pregunte en vez de dar por bueno.
  return { match: null, porNombre, base: HOLDED_BASE };
}

// Calcula el semáforo de cobros de un contacto de Holded a partir de sus facturas.
// Devuelve { estado, vencidas, pendientes, importe_vencido }.
//   rojo = alguna factura vencida sin pagar
//   amarillo = facturas pendientes de pago pero no vencidas aún
//   verde = todo pagado / sin facturas
async function estadoCobrosDeContacto(holdedId, opts = {}) {
  const ahora = Math.floor(Date.now() / 1000);
  let cursor = null, vencidas = 0, pendientes = 0, importeVencido = 0, huboError = false;
  let muestraFactura = null; // para diagnóstico
  for (let i = 0; i < 50; i++) {
    const q = `/invoices?contactId=${encodeURIComponent(holdedId)}&limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const r = await holded(q);
    if (!r.ok) { huboError = true; break; }
    const lista = listaContactos(r.data);
    if (lista.length === 0) break;
    if (!muestraFactura && lista[0]) muestraFactura = lista[0];
    for (const f of lista) {
      const pendiente = Number(f.pending ?? f.amountDue ?? f.pending_amount ?? f.pendingAmount ?? f.pendingamount ?? 0);
      const total = Number(f.total ?? f.amount ?? 0);

      // --- ¿Está PAGADA? Solo si lo dice explícitamente o no queda nada pendiente. ---
      const stRaw = f.status ?? f.statusText ?? f.state ?? '';
      const st = String(stRaw).toLowerCase();
      const pagadaExplicita = st.includes('pagad') || st.includes('cobrad') || st.includes('paid')
        || f.paid === true || f.isPaid === true || f.pagada === true;
      const sinPendiente = (pendiente === 0 && total > 0);
      if (pagadaExplicita || sinPendiente) continue;

      // --- ¿Está VENCIDA? Se comprueba PRIMERO (prioridad rojo). ---
      const vencidaTexto = st.includes('venc') || st.includes('overdue') || st.includes('expired') || st.includes('atrasad');
      const dueRaw = f.dueDate ?? f.due_date ?? f.expirationDate ?? f.duedate ?? f.dueDateFormatted ?? null;
      let dueSeg = 0;
      if (dueRaw != null && dueRaw !== '') {
        if (typeof dueRaw === 'number') dueSeg = dueRaw > 1e12 ? Math.floor(dueRaw / 1000) : dueRaw;
        else { const t = Date.parse(dueRaw); if (!isNaN(t)) dueSeg = Math.floor(t / 1000); }
      }
      const vencidaFecha = dueSeg > 0 && dueSeg < ahora;

      if (vencidaTexto || vencidaFecha) { vencidas++; importeVencido += (pendiente || total || 0); }
      else pendientes++;
    }
    const hayMas = r.data?.has_more === true && r.data?.cursor;
    if (!hayMas) break;
    cursor = r.data.cursor;
  }
  let estado = 'verde';
  if (vencidas > 0) estado = 'rojo';
  else if (pendientes > 0) estado = 'amarillo';
  const out = { estado, vencidas, pendientes, importe_vencido: Math.round(importeVencido * 100) / 100, error: huboError };
  if (opts.diagnostico && muestraFactura) {
    out.campos_factura = Object.keys(muestraFactura);
    try { out.muestra_factura = JSON.stringify(muestraFactura).slice(0, 1200); } catch { /* noop */ }
  }
  return out;
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!process.env.HOLDED_API_KEY) {
    return json({ ok: false, error: 'Falta la variable HOLDED_API_KEY en Netlify.' }, 500);
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ ok: false, error: 'Backend Supabase no configurado.' }, 500);
  }

  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const caller = await autorizar(token);
  if (!caller) return json({ ok: false, error: 'No autorizado.' }, 403);

  let body;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'JSON inválido' }, 400); }
  const { action } = body;

  try {
    // ── Diagnóstico de conexión ──
    // Prueba las dos APIs con su autenticación correcta y dice cuál responde.
    // Sirve para saber, sin adivinar, qué tipo de token hay configurado.
    if (action === 'diagnostico') {
      const pruebas = [];
      for (const [nombre, base, auth] of [
        ['API v2 (Bearer)', HOLDED_BASE, 'Authorization: Bearer'],
        ['API invoicing v1 (cabecera key)', HOLDED_BASE_INV, 'key'],
      ]) {
        const r = await holded('/contacts?page=1&limit=1', { base });
        pruebas.push({
          api: nombre,
          autenticacion: auth,
          http: r.status,
          ok: r.ok,
          contactos: r.ok && Array.isArray(r.data) ? r.data.length : null,
          motivo: r.ok ? null : motivo(r.status, r.data),
          // Respuesta literal de Holded, recortada: es la pista más fiable.
          respuesta_holded: r.ok ? null : (typeof r.data === 'string'
            ? r.data.slice(0, 160)
            : JSON.stringify(r.data || null).slice(0, 160)),
        });
      }
      const funciona = pruebas.find((p) => p.ok);
      return json({
        ok: true,
        clave_v2_configurada: !!CLAVE_V2(),
        clave_v1_configurada: !!CLAVE_V1(),
        claves_distintas: CLAVE_V1() !== CLAVE_V2(),
        huella_v2: huella(CLAVE_V2()),
        huella_v1: huella(CLAVE_V1()),
        pruebas,
        conclusion: funciona
          ? `Conexión correcta por ${funciona.api}.`
          : 'Ninguna de las dos APIs acepta la clave. Genera un token nuevo en Holded '
            + '(Ajustes › Desarrolladores › Credenciales) con permiso de contactos y facturas, '
            + 'y ponlo en HOLDED_API_KEY si es de la v2, o en HOLDED_API_KEY_V1 si lo has sacado del banner "Api Keys v1".',
      });
    }

    // Estado de cobros de UN cliente (por CIF): consulta Holded en vivo.
    if (action === 'estado_cobros') {
      const cif = norm(body.cif);
      if (!cif) return json({ ok: false, error: 'CIF vacío' }, 400);
      const res = await buscarContactoPorCif(cif);
      if (res.error) return json({ ok: false, error: motivo(res.error.status, res.error.data), detalle: res.error.data }, 502);
      if (!res.match) return json({ ok: true, estado: null, sin_contacto: true });
      const est = await estadoCobrosDeContacto(res.match.id, { diagnostico: !!body.diagnostico });
      return json({ ok: true, holded_id: res.match.id, ...est });
    }

    // Refresca el estado de cobros de TODOS los clientes con CIF y lo guarda en la BD.
    // Pensado para el scheduler diario (o botón manual). Usa service_role para escribir.
    if (action === 'refrescar_cobros') {
      const SUPA = process.env.SUPABASE_URL, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
      // Traer clientes con CIF (paginado alto).
      const rc = await fetch(`${SUPA}/rest/v1/clientes?select=id,cif_matriz,holded_id&or=(cif_matriz.not.is.null,holded_id.not.is.null)&limit=2000`, {
        headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` },
      });
      if (!rc.ok) return json({ ok: false, error: 'No se pudieron leer los clientes.' }, 502);
      const clientes = await rc.json();
      let actualizados = 0, errores = 0;
      const ahoraISO = new Date().toISOString();
      for (const c of clientes) {
        try {
          let holdedId = c.holded_id;
          if (!holdedId && c.cif_matriz) {
            const res = await buscarContactoPorCif(norm(c.cif_matriz));
            holdedId = res.match?.id || null;
          }
          if (!holdedId) continue;
          const est = await estadoCobrosDeContacto(holdedId);
          if (est.error) { errores++; continue; }
          await fetch(`${SUPA}/rest/v1/clientes?id=eq.${c.id}`, {
            method: 'PATCH',
            headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify({
              estado_cobros: est.estado,
              cobros_actualizado_en: ahoraISO,
              cobros_detalle: { vencidas: est.vencidas, pendientes: est.pendientes, importe_vencido: est.importe_vencido },
              holded_id: holdedId,
            }),
          });
          actualizados++;
        } catch { errores++; }
      }
      return json({ ok: true, actualizados, errores, total: clientes.length });
    }

    if (action === 'buscar_por_cif') {
      const cif = norm(body.cif);
      if (!cif) return json({ ok: false, error: 'CIF vacío' }, 400);
      const res = await buscarContactoPorCif(cif);
      if (res.error) return json({ ok: false, error: motivo(res.error.status, res.error.data), detalle: res.error.data }, 502);
      return json({ ok: true, encontrado: !!res.match, contacto: res.match || null });
    }

    // Busca por CIF y, si existe, devuelve los datos listos para autocompletar el cliente.
    if (action === 'buscar_datos') {
      const cif = norm(body.cif);
      if (!cif) return json({ ok: false, error: 'CIF vacío' }, 400);
      const res = await buscarContactoPorCif(cif);
      if (res.error) return json({ ok: false, error: motivo(res.error.status, res.error.data), detalle: res.error.data }, 502);
      if (!res.match) {
        // Diagnóstico: devolvemos la respuesta CRUDA de Holded para ver su estructura
        // real y saber de dónde extraer la lista de contactos.
        let diagnostico = null;
        if (body.diagnostico) {
          const pruebas = [];
          for (const [nombre, base] of [['v2', HOLDED_BASE], ['invoicing_v1', HOLDED_BASE_INV]]) {
            const r0 = await holded('/contacts?page=1&limit=100', { base });
            const raw = r0.data;
            let muestraRaw;
            try { muestraRaw = JSON.stringify(raw).slice(0, 300); } catch { muestraRaw = String(raw).slice(0, 300); }
            pruebas.push({
              endpoint: nombre,
              http_status: r0.status,
              ok: r0.ok,
              es_array: Array.isArray(raw),
              longitud: Array.isArray(raw) ? raw.length : (Array.isArray(raw?.data) ? raw.data.length : null),
              claves: (raw && typeof raw === 'object' && !Array.isArray(raw)) ? Object.keys(raw) : [],
              muestra: muestraRaw,
            });
          }
          diagnostico = pruebas;
        }
        return json({ ok: true, encontrado: false, diagnostico });
      }
      return json({ ok: true, encontrado: true, holded_id: res.match.id, datos: deContactoHolded(res.match) });
    }

    // Ficha COMPLETA de empresa a partir del CIF (para el alta en el CRM).
    // Devuelve además las personas de contacto que Holded tenga registradas.
    if (action === 'buscar_empresa') {
      const cif = norm(body.cif);
      if (!cif) return json({ ok: false, error: 'CIF vacío' }, 400);
      const res = await buscarContactoPorCif(cif, body.nombre);
      if (res.error) return json({ ok: false, error: motivo(res.error.status, res.error.data), detalle: res.error.data }, 502);
      if (!res.match) {
        // Nada por CIF, pero quizá sí por nombre: se ofrece, sin darlo por bueno.
        if (res.porNombre) {
          return json({
            ok: true, encontrado: false, porNombre: true,
            holded_id: res.porNombre.id,
            nombre_holded: res.porNombre.name,
            cif_holded: cifDe(res.porNombre),
            empresa: deEmpresaHolded(res.porNombre),
            crudo: res.porNombre,
          });
        }
        return json({ ok: true, encontrado: false });
      }
      return json({
        ok: true,
        encontrado: true,
        holded_id: res.match.id,
        empresa: deEmpresaHolded(res.match),
        crudo: res.match,          // se guarda en empresas.holded_datos (auditoría)
      });
    }

    if (action === 'crear') {
      const payload = aContactoHolded(body.cliente || {});
      if (!payload.code) return json({ ok: false, error: 'El cliente no tiene CIF; no se puede crear en Holded.' }, 400);
      const r = await holded('/contacts', { method: 'POST', body: payload });
      if (!r.ok) return json({ ok: false, error: `No se pudo crear en Holded (HTTP ${r.status})`, detalle: r.data }, 502);
      const id = r.data?.id || r.data?.contactId || null;
      return json({ ok: true, holded_id: id, respuesta: r.data });
    }

    if (action === 'actualizar') {
      const { holded_id } = body;
      if (!holded_id) return json({ ok: false, error: 'Falta holded_id' }, 400);
      const payload = aContactoHolded(body.cliente || {});
      const r = await holded(`/contacts/${holded_id}`, { method: 'PUT', body: payload });
      if (!r.ok) return json({ ok: false, error: `No se pudo actualizar en Holded (HTTP ${r.status})`, detalle: r.data }, 502);
      return json({ ok: true, respuesta: r.data });
    }

    if (action === 'sincronizar') {
      const c = body.cliente || {};
      const cif = norm(c.cif || c.cif_matriz);
      if (!cif) return json({ ok: false, error: 'El cliente no tiene CIF.' }, 400);

      const res = await buscarContactoPorCif(cif);
      if (res.error) return json({ ok: false, error: motivo(res.error.status, res.error.data), detalle: res.error.data }, 502);

      const base = res.base || HOLDED_BASE; // usar el endpoint que respondió con datos
      const payload = aContactoHolded(c);
      if (res.match) {
        const ru = await holded(`/contacts/${res.match.id}`, { method: 'PUT', body: payload, base });
        if (!ru.ok) return json({ ok: false, error: `No se pudo actualizar en Holded (HTTP ${ru.status})`, detalle: ru.data }, 502);
        return json({ ok: true, holded_id: res.match.id, accion: 'vinculado_actualizado' });
      } else {
        const rc = await holded('/contacts', { method: 'POST', body: payload, base });
        if (!rc.ok) return json({ ok: false, error: `No se pudo crear en Holded (HTTP ${rc.status})`, detalle: rc.data }, 502);
        const id = rc.data?.id || rc.data?.contactId || null;
        return json({ ok: true, holded_id: id, accion: 'creado' });
      }
    }

    return json({ ok: false, error: 'Acción desconocida' }, 400);
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
};

export const config = { path: '/.netlify/functions/holded' };
