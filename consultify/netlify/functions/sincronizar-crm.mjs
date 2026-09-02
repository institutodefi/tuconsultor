// ════════════════════════════════════════════════════════════════════════════
// SINCRONIZACIÓN DE IDA Y VUELTA · Holded ↔ CRM ↔ Brevo
//
// Tres sistemas y una regla de prioridad, que es lo que decide todo:
//
//   · HOLDED manda en lo FISCAL. Razón social, CIF, dirección de facturación:
//     ahí es donde se factura de verdad, así que ahí está el dato bueno.
//   · EL CRM manda en lo COMERCIAL. Estado, notas, quién lleva la cuenta,
//     asignaciones: eso solo vive aquí.
//   · BREVO no manda en nada. Es destino, no origen. Lo único que sube desde
//     Brevo es la BAJA: si alguien se dio de baja allí, aquí se respeta.
//
// Esa última regla es la importante. Traer datos de Brevo al CRM permitiría
// que un formulario público sobrescribiera la ficha fiscal de un cliente.
//
// Listas de Brevo:
//   #7  pendientes de confirmar (antes del doble consentimiento)
//   #9  confirmados
//   #10 empresas
// ════════════════════════════════════════════════════════════════════════════

const LISTA_PENDIENTES = 7;
const LISTA_CONFIRMADOS = 9;
const LISTA_EMPRESAS = 10;

const limpioCif = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const norm = (v) => (v === undefined || v === null || v === '' ? null : String(v).trim());

/** Campos fiscales: los que manda Holded. */
const FISCALES = ['nombre', 'cif', 'direccion', 'poblacion', 'cp', 'provincia', 'pais', 'vat_id'];
/** Campos comerciales: los que manda el CRM y Holded no debe pisar. */
const COMERCIALES = ['estado_comercial', 'notas', 'es_cliente', 'es_proveedor', 'empresa_matriz_id'];

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const holdedKey = process.env.HOLDED_API_KEY;
  const brevoKey = process.env.BREVO_API_KEY;
  if (!base || !key) return Response.json({ ok: false, error: 'Falta la configuración de Supabase.' }, { status: 500 });

  const sb = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const informe = { holded: { leidas: 0, creadas: 0, actualizadas: 0, sin_cambios: 0 },
                    brevo: { subidas: 0, bajas: 0 }, conflictos: [], errores: [] };

  /**
   * Traduce un fallo de Holded a algo accionable.
   *
   * «Holded devolvió 400» no dice nada: hay que leer el cuerpo, que sí trae el
   * motivo, y explicar qué significa cada código en ESTA integración concreta.
   * Sin esto, el único camino era ir probando.
   */
  async function explicarHolded(r) {
    let detalle = '';
    try {
      const t = await r.text();
      try {
        const j = JSON.parse(t);
        detalle = j.message || j.error || j.info || t;
      } catch { detalle = t; }
    } catch { /* sin cuerpo */ }
    detalle = String(detalle).slice(0, 300).trim();

    const pistas = {
      400: 'Petición rechazada. Suele ser una clave de la API v2 usada contra la v1: '
         + 'en Holded, Configuración → Desarrolladores → Credenciales, hay que crear la '
         + 'clave desde «Api Keys v1», no la general.',
      401: 'Clave no válida o caducada. Genera una nueva en Holded y actualiza '
         + 'HOLDED_API_KEY en Netlify.',
      403: 'La clave no tiene permiso sobre Contactos. Al crearla se eligen los '
         + 'permisos: hace falta el de Contactos en lectura.',
      404: 'Endpoint no encontrado: puede que Holded haya retirado esa versión.',
      429: 'Demasiadas peticiones seguidas. Espera unos minutos y repite.',
    };
    return `Holded devolvió ${r.status}. ${pistas[r.status] || ''}${detalle ? ` Respuesta: ${detalle}` : ''}`.trim();
  }

  try {
    const { modo = 'completo' } = await req.json().catch(() => ({}));

    // ══════════ 0 · COMPROBAR CONEXIONES ══════════
    // Modo aparte que solo prueba las claves, sin escribir nada. Lanzar la
    // sincronización completa para descubrir que una clave no vale mueve datos
    // por medio y tarda; esto responde en un segundo.
    if (modo === 'probar') {
      const prueba = { holded: null, brevo: null };

      if (!holdedKey) prueba.holded = 'Falta HOLDED_API_KEY en las variables de Netlify.';
      else {
        const r = await fetch('https://api.holded.com/api/invoicing/v1/contacts', {
          headers: { key: holdedKey, Accept: 'application/json' },
        });
        if (r.ok) {
          const c = await r.json().catch(() => []);
          prueba.holded = `OK · ${Array.isArray(c) ? c.length : 0} contactos accesibles`;
        } else prueba.holded = await explicarHolded(r);
      }

      if (!brevoKey) prueba.brevo = 'Falta BREVO_API_KEY en las variables de Netlify.';
      else {
        const r = await fetch('https://api.brevo.com/v3/account', {
          headers: { 'api-key': brevoKey, Accept: 'application/json' },
        });
        if (r.ok) {
          const a = await r.json().catch(() => ({}));
          prueba.brevo = `OK · cuenta ${a.email || a.companyName || 'conectada'}`;
        } else prueba.brevo = `Brevo devolvió ${r.status}. Revisa BREVO_API_KEY.`;
      }

      return new Response(JSON.stringify({ ok: true, prueba }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ══════════ 1 · HOLDED → CRM ══════════
    // Solo lo fiscal. Lo comercial del CRM no se toca.
    if (holdedKey && modo !== 'solo-brevo') {
      const r = await fetch('https://api.holded.com/api/invoicing/v1/contacts', {
        headers: { key: holdedKey, Accept: 'application/json' },   // v1 usa `key`, no Bearer
      });
      if (!r.ok) {
        informe.errores.push(await explicarHolded(r));
      } else {
        const contactos = await r.json();
        informe.holded.leidas = Array.isArray(contactos) ? contactos.length : 0;

        // Las empresas del CRM, indexadas por CIF.
        const q = await fetch(`${base}/rest/v1/empresas?select=*`, { headers: sb });
        const empresas = q.ok ? await q.json() : [];
        const porCif = new Map(empresas.filter((e) => e.cif).map((e) => [limpioCif(e.cif), e]));

        for (const h of (Array.isArray(contactos) ? contactos : [])) {
          const cif = limpioCif(h.code || h.vatnumber);
          if (!cif) continue;                       // sin CIF no hay forma de casar
          const actual = porCif.get(cif);

          const fiscal = {
            nombre: norm(h.name),
            cif: norm(h.code || h.vatnumber),
            direccion: norm(h.billAddress?.address),
            poblacion: norm(h.billAddress?.city),
            cp: norm(h.billAddress?.postalCode),
            provincia: norm(h.billAddress?.province),
            pais: norm(h.billAddress?.country) || 'España',
            vat_id: norm(h.vatnumber),
            holded_id: norm(h.id),
            holded_sincronizado_en: new Date().toISOString(),
          };

          if (!actual) {
            const ins = await fetch(`${base}/rest/v1/empresas`, {
              method: 'POST', headers: { ...sb, Prefer: 'return=minimal' },
              body: JSON.stringify({ ...fiscal, es_cliente: true, estado_comercial: 'potencial', origen: 'holded' }),
            });
            if (ins.ok) informe.holded.creadas += 1;
            else informe.errores.push(`No se pudo crear ${fiscal.nombre}`);
            continue;
          }

          // Qué cambia de verdad. Si no cambia nada, no se toca la fila: así el
          // `updated_at` sigue diciendo cuándo cambió algo de verdad.
          const cambios = {};
          for (const c of FISCALES) {
            if (fiscal[c] && norm(actual[c]) !== fiscal[c]) cambios[c] = fiscal[c];
          }
          if (!Object.keys(cambios).length) { informe.holded.sin_cambios += 1; continue; }

          // Si el CRM tocó lo fiscal DESPUÉS de la última sincronización, hay
          // conflicto: gana Holded, pero queda anotado para poder revisarlo.
          const tocadoAqui = actual.updated_at && actual.holded_sincronizado_en
            && new Date(actual.updated_at) > new Date(actual.holded_sincronizado_en);
          if (tocadoAqui) {
            informe.conflictos.push({
              empresa: actual.nombre, cif: actual.cif,
              campos: Object.keys(cambios),
              nota: 'Cambiado aquí después de la última sincronización. Ha ganado Holded.',
            });
          }

          const upd = await fetch(`${base}/rest/v1/empresas?id=eq.${actual.id}`, {
            method: 'PATCH', headers: { ...sb, Prefer: 'return=minimal' },
            body: JSON.stringify({ ...cambios, holded_id: fiscal.holded_id,
                                   holded_sincronizado_en: fiscal.holded_sincronizado_en }),
          });
          if (upd.ok) informe.holded.actualizadas += 1;
        }
      }
    }

    // ══════════ 2 · CRM → HOLDED ══════════
    // Empresas del CRM que Holded no conoce. Lo comercial NO se sube: a Holded
    // no le sirve y ensuciaría su ficha.
    if (holdedKey && modo === 'completo') {
      const q = await fetch(`${base}/rest/v1/empresas?holded_id=is.null&cif=not.is.null&select=*`, { headers: sb });
      const nuevas = q.ok ? await q.json() : [];
      for (const e of nuevas.slice(0, 50)) {           // por tandas, para no agotar la cuota
        const cuerpo = {
          name: e.nombre, code: e.cif, type: e.es_proveedor ? 'supplier' : 'client',
          email: e.email || undefined, phone: e.telefono || undefined,
          billAddress: {
            address: e.direccion || undefined, city: e.poblacion || undefined,
            postalCode: e.cp || undefined, province: e.provincia || undefined,
            country: e.pais || 'España',
          },
        };
        const r = await fetch('https://api.holded.com/api/invoicing/v1/contacts', {
          method: 'POST', headers: { key: holdedKey, 'Content-Type': 'application/json' },
          body: JSON.stringify(cuerpo),
        });
        if (r.ok) {
          const d = await r.json().catch(() => ({}));
          if (d?.id) {
            await fetch(`${base}/rest/v1/empresas?id=eq.${e.id}`, {
              method: 'PATCH', headers: { ...sb, Prefer: 'return=minimal' },
              body: JSON.stringify({ holded_id: d.id, holded_sincronizado_en: new Date().toISOString() }),
            });
          }
        } else {
          // Antes se ignoraba en silencio: la sincronización decía «10 empresas»
          // aunque Holded las hubiera rechazado todas. Un fallo por empresa se
          // registra con su nombre, que es lo que permite corregirlo.
          const motivo = await explicarHolded(r);
          if (informe.errores.length < 10) informe.errores.push(`${e.nombre}: ${motivo}`);
          else if (informe.errores.length === 10) informe.errores.push('… y más errores del mismo tipo.');
        }
      }
    }

    // ══════════ 3 · CRM → BREVO ══════════
    // Los contactos van a la lista que les corresponde según su consentimiento.
    // Quien no lo ha dado va a la #7 y NO recibe comercial hasta confirmarlo.
    if (brevoKey && modo !== 'solo-holded') {
      const q = await fetch(`${base}/rest/v1/contactos?select=*,empresa_contactos(empresa_id)`, { headers: sb });
      const contactos = q.ok ? await q.json() : [];
      const qe = await fetch(`${base}/rest/v1/empresas?select=id,nombre,cif`, { headers: sb });
      const empresas = qe.ok ? await qe.json() : [];
      const nombreEmpresa = new Map(empresas.map((e) => [String(e.id), e.nombre]));

      for (const c of contactos) {
        if (!c.email) continue;
        const confirmado = !!c.consentimiento_marketing;
        const lista = confirmado ? LISTA_CONFIRMADOS : LISTA_PENDIENTES;
        const empId = c.empresa_contactos?.[0]?.empresa_id;

        const r = await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: c.email, updateEnabled: true,
            listIds: [lista],
            // Sacarlo de la otra lista: si confirma, deja de estar pendiente.
            unlinkListIds: [confirmado ? LISTA_PENDIENTES : LISTA_CONFIRMADOS],
            attributes: {
              NOMBRE: c.nombre || '', APELLIDOS: c.apellidos || '',
              CARGO: c.cargo || '', SMS: c.movil || c.telefono || '',
              EMPRESA: empId ? (nombreEmpresa.get(String(empId)) || '') : '',
              DOI_PENDIENTE: !confirmado,
            },
          }),
        });
        if (r.ok || r.status === 204) informe.brevo.subidas += 1;
      }

      // ── Brevo → CRM: SOLO las bajas ──
      // Es lo único que Brevo puede decirnos que aquí no sabemos, y respetarlo
      // no es opcional: alguien pidió no recibir más.
      const rb = await fetch(`https://api.brevo.com/v3/contacts?limit=500&modifiedSince=${
        new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)}`, {
        headers: { 'api-key': brevoKey, Accept: 'application/json' },
      });
      if (rb.ok) {
        const { contacts = [] } = await rb.json();
        for (const b of contacts) {
          if (!b.emailBlacklisted) continue;
          const upd = await fetch(`${base}/rest/v1/contactos?email=eq.${encodeURIComponent(b.email)}`, {
            method: 'PATCH', headers: { ...sb, Prefer: 'return=minimal' },
            body: JSON.stringify({ consentimiento_marketing: false }),
          });
          if (upd.ok) informe.brevo.bajas += 1;
        }
      }
    }

    // ══════════ 4 · Empresas a la lista #10 ══════════
    //
    // Brevo identifica cada contacto por su CORREO: una empresa sin correo no
    // puede subirse, y por eso la lista #10 seguía a cero. No es un fallo del
    // código, es cómo funciona Brevo.
    //
    // Cuando la empresa no tiene correo propio pero sí un contacto principal
    // con correo, se usa ÉSE y se marca que representa a la empresa. Es lo
    // razonable: a una empresa no se le escribe, se le escribe a alguien.
    if (brevoKey && modo === 'completo') {
      const q = await fetch(`${base}/rest/v1/empresas?select=id,nombre,cif,email,telefono,web`, { headers: sb });
      const empresas = q.ok ? await q.json() : [];
      const qv = await fetch(`${base}/rest/v1/empresa_contactos?select=empresa_id,contacto_id,principal,rol`, { headers: sb });
      const vinculos = qv.ok ? await qv.json() : [];
      const qc = await fetch(`${base}/rest/v1/contactos?select=id,email,nombre,apellidos`, { headers: sb });
      const contactos = qc.ok ? await qc.json() : [];

      informe.brevo.empresas_sin_correo = [];

      for (const e of empresas) {
        let correo = (e.email || '').trim();
        let via = 'propio';

        if (!correo) {
          const suyos = vinculos.filter((v) => String(v.empresa_id) === String(e.id));
          const pref = suyos.find((v) => v.principal) || suyos.find((v) => v.rol === 'directivo') || suyos[0];
          const c = pref && contactos.find((x) => String(x.id) === String(pref.contacto_id));
          if (c?.email) { correo = c.email.trim(); via = 'contacto principal'; }
        }

        if (!correo) { informe.brevo.empresas_sin_correo.push(e.nombre); continue; }

        const r = await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST', headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: correo, updateEnabled: true, listIds: [LISTA_EMPRESAS],
            attributes: {
              EMPRESA: e.nombre || '', CIF: e.cif || '',
              TELEFONO: e.telefono || '', WEB: e.web || '',
              ES_EMPRESA: true, CORREO_VIA: via,
            },
          }),
        }).catch(() => null);
        if (r && (r.ok || r.status === 204)) informe.brevo.empresas = (informe.brevo.empresas || 0) + 1;
      }
    }

    return Response.json({ ok: true, informe });
  } catch (e) {
    informe.errores.push(e?.message || String(e));
    return Response.json({ ok: false, informe, error: e?.message || String(e) }, { status: 500 });
  }
};
