// ════════════════════════════════════════════════════════════════════════════
// GENERAR EL CONTRATO DE UNA OFERTA ACEPTADA
//
// Crea el contrato si no existe —la base solo lo permite desde una oferta
// aceptada—, produce el PDF y lo guarda. Devuelve la dirección del documento.
// ════════════════════════════════════════════════════════════════════════════

import { generarPDFContrato } from './documento-contrato.mjs';

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return Response.json({ ok: false, error: 'Falta la configuración de Supabase.' }, { status: 500 });

  const cab = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  try {
    const body = await req.json();
    const { presupuesto_id } = body;
    if (!presupuesto_id) return Response.json({ ok: false, error: 'Falta la oferta.' }, { status: 400 });

    // 1 · Crear el contrato. La función comprueba que la oferta esté aceptada.
    const rpc = await fetch(`${base}/rest/v1/rpc/contrato_desde_oferta`, {
      method: 'POST', headers: cab, body: JSON.stringify({ p_presupuesto_id: presupuesto_id }),
    });
    const r = await rpc.json();
    if (!rpc.ok || r?.ok === false) {
      return Response.json({ ok: false, error: r?.error || 'No se pudo crear el contrato.' }, { status: 400 });
    }

    // 2 · Leerlo entero, ya congelado.
    const q = await fetch(`${base}/rest/v1/contratos?id=eq.${r.contrato_id}&select=*`, { headers: cab });
    const [contrato] = await q.json();
    if (!contrato) return Response.json({ ok: false, error: 'El contrato no se pudo leer.' }, { status: 500 });

    // 3 · El PDF.
    const pdf = await generarPDFContrato(contrato);
    const ruta = `contratos/${contrato.numero}.pdf`;
    const sub = await fetch(`${base}/storage/v1/object/documentos/${ruta}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/pdf', 'x-upsert': 'true' },
      body: pdf,
    });
    let url_pdf = null;
    if (sub.ok) {
      url_pdf = `${base}/storage/v1/object/public/documentos/${ruta}`;
      await fetch(`${base}/rest/v1/contratos?id=eq.${contrato.id}`, {
        method: 'PATCH', headers: { ...cab, Prefer: 'return=minimal' },
        body: JSON.stringify({ url_pdf }),
      });
    }

    return Response.json({
      ok: true, contrato_id: contrato.id, numero: contrato.numero,
      ya_existia: !!r.ya_existia, url_pdf,
    });
  } catch (e) {
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
};
