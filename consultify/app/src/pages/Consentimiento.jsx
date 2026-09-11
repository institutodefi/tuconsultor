import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEMO } from '../lib/supabase.js';
import { RGPD_TEXTO, RGPD_CASILLAS } from '../lib/rgpd.js';

// ════════════════════════════════════════════════════════════════════════════
// CONSENTIMIENTO RGPD · página pública que abre el contacto desde su enlace
//
// Sin sesión: el token del enlace es la clave. Enseña quién trata los datos,
// para qué y cómo ejercer derechos, y dos casillas: la del tratamiento
// (necesaria) y la de comunicaciones comerciales (opcional). Al aceptar
// queda registrado con fecha, versión del texto, IP y navegador (v135).
// ════════════════════════════════════════════════════════════════════════════

async function llamar(payload) {
  const r = await fetch('/api/consentimiento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return r.json().catch(() => ({ ok: false, error: `Sin respuesta (${r.status})` }));
}

export default function Consentimiento() {
  const [params] = useSearchParams();
  const token = params.get('t') || '';
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const [datos, setDatos] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [hecho, setHecho] = useState(null);

  useEffect(() => {
    if (!token) { setError('Falta el enlace personal. Usa el que te hemos enviado por correo.'); return; }
    if (DEMO) { setD({ nombre: 'María López', empresa: 'Industrias Norte', email: 'maria@industriasnorte.es', texto: RGPD_TEXTO, casillas: RGPD_CASILLAS }); return; }
    llamar({ action: 'ver', token }).then((j) => { if (j.ok) setD(j); else setError(j.error || 'Enlace no válido.'); });
  }, [token]);

  async function aceptar() {
    if (!datos) { setError('Para continuar marca la primera casilla.'); return; }
    setOcupado(true); setError(null);
    try {
      if (DEMO) { setHecho(new Date().toISOString()); return; }
      const j = await llamar({ action: 'aceptar', token, datos: true, marketing });
      if (!j.ok) throw new Error(j.error);
      setHecho(j.fecha);
    } catch (e) { setError(String(e?.message || e)); }
    finally { setOcupado(false); }
  }

  const texto = d?.texto || RGPD_TEXTO;
  const casillas = d?.casillas || RGPD_CASILLAS;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <p className="eyebrow">TuConsultor · Protección de datos</p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#EAF4F7]">Cómo tratamos tus datos</h1>
      {d && (
        <p className="mt-2 text-[13.5px] text-[#9FC0CB]">
          Para <b className="text-[#EAF4F7]">{d.nombre || d.email}</b>{d.empresa ? <> · {d.empresa}</> : null}{d.email ? <> · {d.email}</> : null}
        </p>
      )}

      {error && <p className="mt-4 rounded-xl bg-red-500/12 px-3 py-2 text-[13px] font-bold text-red-200">{error}</p>}

      {(hecho || d?.yaAceptado) && !error ? (
        <div className="card mt-5">
          <p className="text-[15px] font-extrabold text-emerald-300">✓ Consentimiento registrado</p>
          <p className="mt-1 text-[13px] text-[#CFE3E9]">
            {hecho ? 'Gracias. Queda registrado con fecha de hoy.' : `Ya lo aceptaste el ${new Date(d.fecha).toLocaleDateString('es-ES')}.`} Puedes retirarlo o ejercer tus derechos en cualquier momento escribiendo a <a className="text-brand-orange underline" href="mailto:hola@tuconsultor.com">hola@tuconsultor.com</a>.
          </p>
        </div>
      ) : d ? (
        <>
          <div className="card mt-5 space-y-2 text-[13px] leading-relaxed text-[#DFF1F5]">
            {texto.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <div className="card mt-4 space-y-3">
            <label className="flex items-start gap-2.5 text-[13px] text-[#EAF4F7]">
              <input type="checkbox" className="mt-1" checked={datos} onChange={(e) => setDatos(e.target.checked)} />
              <span>{casillas.datos} <span className="text-brand-orange">*</span></span>
            </label>
            <label className="flex items-start gap-2.5 text-[13px] text-[#CFE3E9]">
              <input type="checkbox" className="mt-1" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
              <span>{casillas.marketing}</span>
            </label>
            <button type="button" onClick={aceptar} disabled={ocupado || !datos} className="btn-orange !px-5 !py-2 text-[14px] disabled:opacity-50">
              {ocupado ? 'Registrando…' : 'Aceptar'}
            </button>
          </div>
        </>
      ) : !error ? <p className="mt-5 text-[13px] text-[#7FA7B4]">Cargando…</p> : null}
    </div>
  );
}
