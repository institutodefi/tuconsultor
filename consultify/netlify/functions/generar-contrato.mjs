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
    const { presupuesto_id, contrato_id, regenerar } = body;

    // Regenerar el PDF de un contrato que ya existe: el documento se rehace con
    // lo que quedó congelado, así que sale idéntico. Sirve cuando la subida
    // falló la primera vez o cuando se perdió el archivo.
    if (contrato_id && regenerar) {
      const q0 = await fetch(`${base}/rest/v1/contratos?id=eq.${contrato_id}&select=*`, { headers: cab });
      const [c0] = await q0.json();
      if (!c0) return Response.json({ ok: false, error: 'El contrato no existe.' }, { status: 404 });
      const pdf0 = await generarPDFContrato(c0);
      const ruta0 = `contratos/${c0.numero}.pdf`;
      const s0 = await fetch(`${base}/storage/v1/object/ofertas/${ruta0}`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/pdf', 'x-upsert': 'true' },
        body: pdf0,
      });
      if (!s0.ok) {
        const d0 = await s0.text().catch(() => '');
        return Response.json({ ok: false, error: `No se pudo guardar el PDF (${s0.status}). ${d0.slice(0, 160)}` }, { status: 502 });
      }
      const url0 = `${base}/storage/v1/object/public/ofertas/${ruta0}`;
      await fetch(`${base}/rest/v1/contratos?id=eq.${c0.id}`, {
        method: 'PATCH', headers: { ...cab, Prefer: 'return=minimal' },
        body: JSON.stringify({ url_pdf: url0 }),
      });
      return Response.json({ ok: true, contrato_id: c0.id, numero: c0.numero, url_pdf: url0, regenerado: true });
    }

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

    // El mismo depósito que las ofertas. Antes usaba uno llamado «documentos»
    // que no existe, así que la subida fallaba, `url_pdf` quedaba a null y el
    // contrato se creaba sin documento — sin decir nada, porque el fallo no se
    // comprobaba.
    const DEPOSITO = 'ofertas';
    const sub = await fetch(`${base}/storage/v1/object/${DEPOSITO}/${ruta}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/pdf', 'x-upsert': 'true' },
      body: pdf,
    });

    let url_pdf = null;
    let aviso = null;
    if (sub.ok) {
      url_pdf = `${base}/storage/v1/object/public/${DEPOSITO}/${ruta}`;
      await fetch(`${base}/rest/v1/contratos?id=eq.${contrato.id}`, {
        method: 'PATCH', headers: { ...cab, Prefer: 'return=minimal' },
        body: JSON.stringify({ url_pdf }),
      });
    } else {
      // Un contrato sin PDF es un contrato que nadie puede firmar: se dice.
      const detalle = await sub.text().catch(() => '');
      aviso = `El contrato ${contrato.numero} se ha creado, pero el PDF no se pudo guardar `
            + `(depósito «${DEPOSITO}», ${sub.status}). ${detalle.slice(0, 160)}`;
    }

    return Response.json({
      ok: true, contrato_id: contrato.id, numero: contrato.numero,
      ya_existia: !!r.ya_existia, url_pdf, aviso,
    });
  } catch (e) {
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
};
