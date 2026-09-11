import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase, DEMO } from '../lib/supabase.js';
import { useAuth } from '../lib/auth.jsx';
import { RGPD_TEXTO, RGPD_CASILLAS } from '../lib/rgpd.js';
import { LEYENDA_IMPUESTOS, SUFIJO_SIN_IMPUESTOS } from '../lib/impuestos.js';
import { eurES } from '../lib/formato.js';

// ════════════════════════════════════════════════════════════════════════════
// LA OFERTA DESDE EL CORREO · página pública que abre el cliente (v138)
//
// Llega desde el botón «Ver y aceptar la oferta» del correo, con su enlace
// personal (/oferta?t=…). Dos caminos:
//   · Si su correo ya tiene cuenta en Órbita, entra solo (enlace mágico de un
//     solo uso) y aterriza en «Mis presupuestos» con la oferta destacada.
//   · Si no, la ve aquí como invitado: importe, normas, PDF, y la acepta o
//     la rechaza con motivo. Si no había aceptado el RGPD, lo acepta aquí.
//     Al aceptar puede pedir el acceso al portal: se le crea la cuenta y le
//     llega la invitación.
// ════════════════════════════════════════════════════════════════════════════

async function llamar(payload) {
  const r = await fetch('/api/oferta-cliente', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return r.json().catch(() => ({ ok: false, error: `Sin respuesta (${r.status})` }));
}
const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-ES') : '');
const eur = (n) => eurES(n, 0);

const DEMO_OFERTA = { ok: true, oferta: { id: 'demo', numero: 'OFE-2026-042', empresa: 'Industrias Norte, S.L.', contacto: 'María López', email: 'maria@industriasnorte.es', normas: ['ISO 9001', 'ISO 14001'], modelo: 'Implantación', precio: 8900, tipo: 'proyecto', notas: null, url_pdf: null, estado: 'emitida', fecha_emision: new Date().toISOString().slice(0, 10), valida_hasta: null, fecha_inicio: null, comercial: 'Alejandro' }, tieneCuenta: false, rgpd: { aceptado: false, marketing: false } };

export default function OfertaCliente() {
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  const nav = useNavigate();
  const { user, role } = useAuth();
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const [entrando, setEntrando] = useState(false);
  const [rgpd, setRgpd] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [hecho, setHecho] = useState(null);      // {estado, tieneCuenta}
  const [acceso, setAcceso] = useState(null);    // resultado de pedir acceso
  const intentado = useRef(false);

  useEffect(() => {
    if (!token) { setError('Falta el enlace personal. Usa el botón del correo que te hemos enviado.'); return; }
    if (DEMO) { setD(DEMO_OFERTA); return; }
    llamar({ action: 'ver', token }).then((j) => { if (j.ok) setD(j); else setError(j.error || 'Enlace no válido.'); });
  }, [token]);

  // Con sesión de cliente ya abierta, su sitio es el portal.
  useEffect(() => {
    if (d?.ok && user && role === 'cliente' && !DEMO) nav(`/clientes/presupuestos?oferta=${d.oferta.id}`, { replace: true });
  }, [d, user, role, nav]);

  // Autologin: el correo tiene cuenta → entra sin contraseña y va al portal.
  useEffect(() => {
    if (!d?.ok || !d.tieneCuenta || user || DEMO || intentado.current || !supabase) return;
    intentado.current = true;
    (async () => {
      setEntrando(true);
      try {
        const j = await llamar({ action: 'entrar', token });
        if (!j.ok) throw new Error(j.error);
        const { error: e } = await supabase.auth.verifyOtp({ token_hash: j.token_hash, type: 'magiclink' });
        if (e) throw e;
        nav(`/clientes/presupuestos?oferta=${d.oferta.id}`, { replace: true });
      } catch {
        // Si no se puede entrar (enlace ya usado, cuenta desactivada…), la ve como invitado.
        setEntrando(false);
      }
    })();
  }, [d, user, token, nav]);

  async function decidir(estado) {
    setOcupado(true); setError(null);
    try {
      if (estado === 'rechazada' && !motivo.trim()) { setError('Cuéntanos brevemente por qué: nos ayuda a mejorar.'); return; }
      if (!d.rgpd.aceptado && !rgpd) { setError('Para continuar marca la casilla de protección de datos.'); return; }
      if (DEMO) { setHecho({ estado, tieneCuenta: false }); return; }
      const j = await llamar({ action: estado === 'aceptada' ? 'aceptar' : 'rechazar', token, motivo: motivo.trim() || null, rgpd: !d.rgpd.aceptado && rgpd, marketing });
      if (!j.ok) throw new Error(j.error);
      setHecho({ estado, tieneCuenta: !!j.tieneCuenta });
    } catch (e) { setError(String(e?.message || e)); }
    finally { setOcupado(false); }
  }
  async function pedirAcceso() {
    setOcupado(true); setError(null);
    try {
      if (DEMO) { setAcceso('invitada'); return; }
      const j = await llamar({ action: 'acceso', token });
      if (!j.ok) throw new Error(j.error);
      setAcceso(j.resultado);
    } catch (e) { setError(String(e?.message || e)); }
    finally { setOcupado(false); }
  }

  const o = d?.oferta;
  const estado = hecho?.estado || o?.estado;
  const decidible = estado === 'emitida';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <p className="eyebrow">TuConsultor · Tu propuesta</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#EAF4F7]">{o ? `Oferta ${o.numero || ''}` : 'Tu propuesta'}</h1>
      {o && <p className="mt-2 text-[13.5px] text-[#9FC0CB]">Para <b className="text-[#EAF4F7]">{o.contacto || o.email}</b>{o.empresa ? <> · {o.empresa}</> : null}{o.fecha_emision ? <> · emitida el {fecha(o.fecha_emision)}</> : null}</p>}

      {error && <p className="mt-4 rounded-xl bg-red-500/12 px-3 py-2 text-[13px] font-bold text-red-200">{error}</p>}
      {entrando && <p className="mt-4 text-[13px] font-bold text-[#9FC0CB]">Tu correo ya tiene cuenta en Órbita: entrando…</p>}

      {!o && !error && <p className="mt-5 text-[13px] text-[#7FA7B4]">Cargando…</p>}

      {o && !entrando && (
        <>
          <div className="card mt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-orange">{o.modelo}{o.normas?.length ? ` · ${o.normas.join(' + ')}` : ''}</p>
                <p className="mt-1 text-2xl font-extrabold text-[#EAF4F7]">
                  {eur(o.precio)}<span className="ml-1 text-[12px] font-bold text-[#7FA7B4]">{o.tipo === 'mes' ? `/mes · ${SUFIJO_SIN_IMPUESTOS}` : SUFIJO_SIN_IMPUESTOS}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-[#7FA7B4]">{LEYENDA_IMPUESTOS}{o.valida_hasta ? ` · Válida hasta el ${fecha(o.valida_hasta)}` : ''}</p>
              </div>
              {o.url_pdf && <a href={o.url_pdf} target="_blank" rel="noopener" className="btn-ghost !px-3 !py-1.5 text-[12.5px]">📄 Ver la propuesta (PDF)</a>}
            </div>
            {o.notas && <p className="mt-3 whitespace-pre-line rounded-lg bg-[#0D3242] px-3 py-2 text-[12.5px] leading-relaxed text-[#B9D2DA]">{o.notas}</p>}
            {(o.fecha_inicio || o.fecha_fin) && <p className="mt-2 text-[12px] text-[#9FC0CB]">{o.fecha_inicio ? `Inicio previsto: ${fecha(o.fecha_inicio)}` : ''}{o.fecha_fin ? ` · Fin: ${fecha(o.fecha_fin)}` : ''}</p>}
          </div>

          {hecho ? (
            <div className="card mt-4">
              {hecho.estado === 'aceptada' ? (
                <>
                  <p className="text-[15px] font-extrabold text-emerald-300">✓ Oferta aceptada</p>
                  <p className="mt-1 text-[13px] text-[#CFE3E9]">Gracias. Queda registrada con fecha de hoy. Preparamos el contrato y te escribimos con los siguientes pasos.</p>
                  <div className="mt-3 rounded-lg bg-[#0D3242] px-3 py-2.5">
                    {acceso ? (
                      <p className="text-[12.5px] text-[#CFE3E9]">{acceso === 'invitada' ? `Te hemos enviado la invitación a ${o.email}: pon tu contraseña y entrarás en tu portal.` : 'Ya tienes cuenta: entra con tu correo y contraseña.'} <Link to="/acceso" className="font-bold text-brand-orange underline">Ir a Órbita</Link></p>
                    ) : hecho.tieneCuenta ? (
                      <p className="text-[12.5px] text-[#CFE3E9]">Tienes cuenta en Órbita: allí verás el contrato, los documentos y el avance del proyecto. <Link to="/acceso" className="font-bold text-brand-orange underline">Entrar</Link></p>
                    ) : (
                      <>
                        <p className="text-[12.5px] text-[#CFE3E9]">¿Quieres acceso a tu portal de cliente? Verás el contrato, los documentos y el avance del proyecto.</p>
                        <button type="button" onClick={pedirAcceso} disabled={ocupado} className="btn-orange mt-2 !px-4 !py-1.5 text-[12.5px] disabled:opacity-50">{ocupado ? 'Un momento…' : 'Quiero acceso al portal'}</button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[15px] font-extrabold text-[#EAF4F7]">Gracias por decírnoslo</p>
                  <p className="mt-1 text-[13px] text-[#CFE3E9]">Lo tendremos en cuenta. Si cambia algo, escríbenos a <a className="text-brand-orange underline" href="mailto:hola@tuconsultor.com">hola@tuconsultor.com</a>.</p>
                </>
              )}
            </div>
          ) : decidible ? (
            <div className="card mt-4 space-y-3">
              {!d.rgpd.aceptado && (
                <div className="space-y-2">
                  <details className="text-[12px] text-[#9FC0CB]">
                    <summary className="cursor-pointer font-bold text-[#CFE3E9]">Cómo tratamos tus datos</summary>
                    <div className="mt-2 space-y-1.5 leading-relaxed">{(d.rgpd.texto || RGPD_TEXTO).map((p, i) => <p key={i}>{p}</p>)}</div>
                  </details>
                  <label className="flex items-start gap-2.5 text-[12.5px] text-[#EAF4F7]"><input type="checkbox" className="mt-1" checked={rgpd} onChange={(e) => setRgpd(e.target.checked)} /><span>{(d.rgpd.casillas || RGPD_CASILLAS).datos} <span className="text-brand-orange">*</span></span></label>
                  <label className="flex items-start gap-2.5 text-[12.5px] text-[#CFE3E9]"><input type="checkbox" className="mt-1" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} /><span>{(d.rgpd.casillas || RGPD_CASILLAS).marketing}</span></label>
                </div>
              )}
              {!rechazando ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => decidir('aceptada')} disabled={ocupado} className="btn-orange !px-5 !py-2 text-[14px] disabled:opacity-50">{ocupado ? 'Registrando…' : 'Aceptar la oferta'}</button>
                  <button type="button" onClick={() => setRechazando(true)} disabled={ocupado} className="btn-ghost !px-5 !py-2 text-[14px] disabled:opacity-50">No me encaja</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block"><span className="label">¿Qué cambiarías? Nos ayuda a mejorar</span>
                    <textarea className="input min-h-[80px]" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Precio, plazos, alcance, otra empresa…" /></label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => decidir('rechazada')} disabled={ocupado} className="btn-ghost !px-4 !py-1.5 text-[13px] disabled:opacity-50">{ocupado ? 'Registrando…' : 'Enviar y rechazar'}</button>
                    <button type="button" onClick={() => setRechazando(false)} className="text-[12px] font-bold text-[#7FA7B4]">volver</button>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-[#7FA7B4]">Aceptar aquí tiene el mismo efecto que aceptarla desde tu portal: queda registrado con fecha y a continuación te enviamos el contrato.</p>
            </div>
          ) : (
            <div className="card mt-4">
              <p className="text-[14px] font-extrabold text-[#EAF4F7]">
                {estado === 'aceptada' ? `✓ Aceptada${o.aceptada_en ? ` el ${fecha(o.aceptada_en)}` : ''}` : estado === 'rechazada' ? `Rechazada${o.rechazada_en ? ` el ${fecha(o.rechazada_en)}` : ''}` : estado === 'caducada' ? 'Esta oferta ha caducado' : 'Esta oferta todavía no está emitida'}
              </p>
              <p className="mt-1 text-[12.5px] text-[#9FC0CB]">{estado === 'caducada' ? 'Pídenos una nueva y te la enviamos al momento: ' : 'Cualquier duda, '}<a className="text-brand-orange underline" href="mailto:hola@tuconsultor.com">hola@tuconsultor.com</a>.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
