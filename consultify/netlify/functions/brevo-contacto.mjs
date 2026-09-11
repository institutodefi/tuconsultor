// ════════════════════════════════════════════════════════════════════════════
// BREVO · un contacto del CRM a la lista que le toca (v138)
//
// Una sola función para todos los momentos en que cambia el consentimiento:
// la sincronización completa (sincronizar-crm), aceptar el enlace RGPD
// (consentimiento), pedir una oferta en la web o aceptarla desde el correo
// (generar-oferta, oferta-cliente). Antes solo lo hacía la sincronización, así
// que quien aceptaba el RGPD hoy no estaba en Brevo hasta que alguien pulsara
// «Sincronizar».
//
// Listas: #9 confirmados (consentimiento de comunicaciones), #7 pendientes
// (todos los demás: reciben solo lo operativo, nunca comercial).
// ════════════════════════════════════════════════════════════════════════════

export const LISTA_PENDIENTES = 7;
export const LISTA_CONFIRMADOS = 9;
export const LISTA_EMPRESAS = 10;

/**
 * Sube (o actualiza) un contacto en Brevo según su consentimiento.
 * @param {object} c  fila de `contactos` (email, nombre, apellidos, cargo, movil, telefono, consentimiento_marketing, rgpd_aceptado)
 * @param {object} o  { apiKey, empresa: nombre de la empresa, extra: atributos adicionales }
 * @returns {{ok:boolean, lista?:number, motivo?:string}}
 */
export async function subirContactoBrevo(c, { apiKey = process.env.BREVO_API_KEY, empresa = '', extra = {} } = {}) {
  if (!apiKey) return { ok: false, motivo: 'sin BREVO_API_KEY' };
  if (!c?.email) return { ok: false, motivo: 'sin correo' };
  const confirmado = !!c.consentimiento_marketing;
  const lista = confirmado ? LISTA_CONFIRMADOS : LISTA_PENDIENTES;
  const r = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      email: String(c.email).trim().toLowerCase(), updateEnabled: true,
      listIds: [lista],
      // Sacarlo de la otra lista: si confirma, deja de estar pendiente.
      unlinkListIds: [confirmado ? LISTA_PENDIENTES : LISTA_CONFIRMADOS],
      attributes: {
        NOMBRE: c.nombre || '', APELLIDOS: c.apellidos || '',
        CARGO: c.cargo || '', SMS: c.movil || c.telefono || '',
        EMPRESA: empresa || '',
        DOI_PENDIENTE: !confirmado,
        CONSENT_RGPD: !!c.rgpd_aceptado,
        CONSENT_MARKETING: confirmado,
        ...(c.rgpd_fecha ? { FECHA_CONSENT: String(c.rgpd_fecha).slice(0, 10) } : {}),
        ...extra,
      },
    }),
  });
  if (r.ok || r.status === 204) return { ok: true, lista };
  let motivo = `Brevo HTTP ${r.status}`;
  try { const j = await r.json(); if (j?.message) motivo += ` · ${j.message}`; } catch { /* sin cuerpo */ }
  return { ok: false, motivo };
}

/**
 * Lee el contacto y su empresa principal de Supabase y lo sube a Brevo.
 * Para llamarlo justo después de registrar un consentimiento. Nunca lanza.
 */
export async function sincronizarContactoBrevo(contactoId, { supabaseUrl = process.env.SUPABASE_URL, serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY, apiKey = process.env.BREVO_API_KEY, extra = {} } = {}) {
  try {
    if (!contactoId || !supabaseUrl || !serviceKey) return { ok: false, motivo: 'sin datos' };
    const h = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const rc = await fetch(`${supabaseUrl}/rest/v1/contactos?id=eq.${contactoId}&select=id,email,nombre,apellidos,cargo,movil,telefono,consentimiento_marketing,rgpd_aceptado,rgpd_fecha`, { headers: h });
    const c = rc.ok ? (await rc.json())?.[0] : null;
    if (!c) return { ok: false, motivo: 'contacto no encontrado' };
    let empresa = '';
    const rv = await fetch(`${supabaseUrl}/rest/v1/empresa_contactos?contacto_id=eq.${contactoId}&select=empresa_id,principal&order=principal.desc&limit=1`, { headers: h });
    const v = rv.ok ? (await rv.json())?.[0] : null;
    if (v?.empresa_id) {
      const re = await fetch(`${supabaseUrl}/rest/v1/empresas?id=eq.${v.empresa_id}&select=nombre,nombre_comercial`, { headers: h });
      const e = re.ok ? (await re.json())?.[0] : null;
      empresa = e?.nombre_comercial || e?.nombre || '';
    }
    return await subirContactoBrevo(c, { apiKey, empresa, extra });
  } catch (e) {
    return { ok: false, motivo: String(e?.message || e) };
  }
}
