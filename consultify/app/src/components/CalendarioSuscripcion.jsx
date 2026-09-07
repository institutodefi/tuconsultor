import { useEffect, useState } from 'react';
import { listTable, updateRow } from '../lib/data.js';

// ════════════════════════════════════════════════════════════════════════════
// MI CALENDARIO EN OUTLOOK, GOOGLE O APPLE
//
// Cada consultor tiene un enlace de calendario propio (.ics suscribible) con
// un token suyo. Lo añade una vez a Outlook y el calendario se actualiza
// solo con cada sesión que se programe o cambie en Órbita: proyectos,
// gestión, procesos internos y las convocatorias de otros.
//
// El token vive en perfiles.feed_token (v123). Regenerarlo invalida el
// enlace anterior: es lo que se hace si se ha compartido por error.
// ════════════════════════════════════════════════════════════════════════════

const nuevoToken = () => (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/-/g, '');

export default function CalendarioSuscripcion({ perfilId }) {
  const [token, setToken] = useState(null);      // null: cargando · '': sin generar
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!perfilId) return;
    listTable('perfiles').then((ps) => {
      const p = (ps || []).find((x) => String(x.id) === String(perfilId));
      setToken(p?.feed_token || '');
    }).catch(() => setToken(''));
  }, [perfilId]);

  const origen = typeof window !== 'undefined' ? window.location.origin : '';
  const urlHttps = token ? `${origen}/api/agenda-feed?c=${perfilId}&t=${token}` : '';
  const urlWebcal = urlHttps.replace(/^https?:\/\//, 'webcal://');
  const urlDescarga = urlHttps ? `${urlHttps}&download=1` : '';

  async function generar(regenerar = false) {
    if (regenerar && !window.confirm('Se generará un enlace nuevo y el anterior dejará de funcionar. Tendrás que volver a suscribirte en Outlook. ¿Seguimos?')) return;
    setOcupado(true); setMsg(null);
    const t = nuevoToken();
    try { await updateRow('perfiles', perfilId, { feed_token: t }); setToken(t); setMsg(regenerar ? 'Enlace regenerado. El anterior ya no vale.' : 'Enlace listo.'); }
    catch (e) { setMsg(/feed_token/i.test(String(e?.message || e)) ? 'Falta aplicar la migración v123 (perfiles.feed_token).' : `No se pudo guardar: ${e?.message || e}`); }
    finally { setOcupado(false); }
  }

  async function copiar(texto, etq) {
    try { await navigator.clipboard.writeText(texto); setMsg(`${etq} copiado. Pégalo en tu calendario.`); }
    catch { setMsg('No se pudo copiar: selecciona el enlace y cópialo a mano.'); }
  }

  if (!perfilId) return null;

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={() => setAbierto((v) => !v)} className="text-left">
          <h2 className="text-sm font-extrabold text-[#EAF4F7]">{abierto ? '▾' : '▸'} Mi calendario en Outlook, Google o Apple</h2>
          <p className="mt-0.5 text-[11.5px] text-[#7FA7B4]">Un enlace que se actualiza solo con cada sesión que se programe en Órbita: proyectos, gestión, procesos internos y a lo que te convoquen.</p>
        </button>
        {token === '' && <button onClick={() => generar(false)} disabled={ocupado} className="btn-orange !px-3 !py-1.5 text-[12.5px] disabled:opacity-50">Generar mi enlace</button>}
      </div>

      {abierto && (
        token === null ? <p className="mt-3 text-[12px] text-[#7FA7B4]">Cargando…</p>
        : token === '' ? (
          <p className="mt-3 text-[12.5px] text-[#9FC0CB]">Todavía no tienes enlace. Pulsa «Generar mi enlace» y te damos la dirección para suscribirte.</p>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-[#1E5468] bg-[#0D3242] p-3">
              <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#9FC0CB]">Suscripción (se actualiza sola)</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <input readOnly className="input min-w-0 flex-1 !py-1.5 !text-[12px]" value={urlHttps} onFocus={(e) => e.target.select()} />
                <button onClick={() => copiar(urlHttps, 'Enlace')} className="btn-orange !px-3 !py-1.5 text-[12px]">Copiar enlace</button>
                <a href={urlWebcal} className="btn-ghost !px-3 !py-1.5 text-[12px]" title="Abre directamente la app de calendario (Apple, Outlook de escritorio)">Abrir en mi calendario</a>
              </div>
              <div className="mt-2 grid gap-2 text-[11.5px] leading-snug text-[#B9D2DA] sm:grid-cols-3">
                <p><b className="text-[#EAF4F7]">Outlook (web o nuevo):</b> Calendario → Agregar calendario → Suscribirse desde Internet → pega el enlace → nombre «Órbita» → Importar.</p>
                <p><b className="text-[#EAF4F7]">Outlook clásico:</b> Inicio → Agregar calendario → Desde Internet → pega el enlace.</p>
                <p><b className="text-[#EAF4F7]">Google Calendar:</b> Otros calendarios → + → Desde URL → pega el enlace.</p>
              </div>
              <p className="mt-2 text-[10.5px] text-[#7FA7B4]">Outlook y Google vuelven a leer el enlace cada 1–3 horas. Las sesiones hechas aparecen como «libre» para no bloquear el hueco. Trata el enlace como una contraseña: quien lo tenga ve tu agenda.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a href={urlDescarga} className="btn-ghost !px-3 !py-1.5 text-[12px]" download>↓ Descargar .ics de una vez</a>
              <button onClick={() => generar(true)} disabled={ocupado} className="text-[11.5px] font-bold text-[#7FA7B4] hover:text-red-300 disabled:opacity-50">Regenerar el enlace (invalida el anterior)</button>
            </div>
          </div>
        )
      )}
      {msg && <p className="mt-2 text-[12px] font-bold text-[#9FC0CB]">{msg}</p>}
    </section>
  );
}
