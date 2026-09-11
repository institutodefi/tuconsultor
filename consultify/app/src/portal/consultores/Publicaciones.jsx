import { useEffect, useMemo, useState } from 'react';
import { listTable } from '../../lib/data.js';
import { supabase, DEMO } from '../../lib/supabase.js';

// ════════════════════════════════════════════════════════════════════════════
// PUBLICACIONES EN REDES · lo que va a salir, lo que salió y lo que falló (v139)
//
// La fuente es el calendario del repo (web/data/*.csv), que cada noche se
// vuelca en la tabla `publicaciones`. Make publica por /api/publicaciones y
// marca el resultado. Aquí se ve todo eso sin abrir Make ni ninguna hoja.
// ════════════════════════════════════════════════════════════════════════════

const REDES = { linkedin: 'LinkedIn empresa', linkedin_alejandro: 'LinkedIn Alejandro', instagram: 'Instagram', instagram_reel: 'Reel', linkedin_video: 'LinkedIn vídeo' };
const CAMPANAS = { 'orbita-ventajas': 'Orbita · ventajas', orbita: 'Orbita (anterior)', blog: 'Blog', premios: 'Premios Vanguardistas', reels: 'Reels', otros: 'Otros' };
const hoyMadrid = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
const fmt = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' }) : '—');
const fmtHora = (h) => (h ? String(h).slice(0, 5) : '');

async function llamarApi(payload) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token || '';
  const r = await fetch('/api/publicaciones', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  return r.json().catch(() => ({ ok: false, error: `Sin respuesta (${r.status})` }));
}

const DEMO_FILAS = (() => {
  const out = []; const hoy = new Date();
  for (let i = -3; i < 8; i++) {
    const d = new Date(hoy); d.setDate(d.getDate() + i); const f = d.toISOString().slice(0, 10);
    out.push({ id: `d${i}a`, fecha: f, hora: '08:45:00', red: 'linkedin_alejandro', campana: 'orbita-ventajas', texto: 'Las normas y los procesos en un solo portal.\n\nLlevo veinte años viendo sistemas repartidos en carpetas…', imagen_url: '/social-img/orbita/V01A_linkedin.png', publicado_en: i < 0 ? f + 'T07:46:00Z' : null, error: null, intentos: i < 0 ? 1 : 0 });
    out.push({ id: `d${i}b`, fecha: f, hora: '19:00:00', red: 'linkedin', campana: 'orbita-ventajas', texto: 'Las normas y los procesos en un solo portal.', imagen_url: '/social-img/orbita/V01A_linkedin.png', publicado_en: i < 0 ? f + 'T18:01:00Z' : null, error: i === -1 ? 'LinkedIn: image download failed (HTTP 404)' : null, intentos: i < 0 ? 1 : 0 });
    out.push({ id: `d${i}c`, fecha: f, hora: '19:00:00', red: 'instagram', campana: 'orbita-ventajas', texto: '🧭 Las normas y los procesos en un solo portal.', imagen_url: '/social-img/orbita/V01A_instagram.png', publicado_en: i < 0 ? f + 'T18:02:00Z' : null, error: null, intentos: i < 0 ? 1 : 0 });
  }
  out[4].publicado_en = null;
  return out;
})();

export default function Publicaciones() {
  const [filas, setFilas] = useState(null);
  const [campana, setCampana] = useState('');
  const [red, setRed] = useState('');
  const [estado, setEstado] = useState('proximas');   // proximas | publicadas | errores | todas
  const [abierta, setAbierta] = useState(null);
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [estadoApi, setEstadoApi] = useState(null);

  const cargar = async () => {
    if (DEMO) { setFilas(DEMO_FILAS); return; }
    try { setFilas(await listTable('publicaciones')); } catch (e) { setFilas([]); setMsg({ err: true, t: /publicaciones/.test(String(e?.message)) ? 'Falta aplicar la migración v139 (tabla publicaciones).' : String(e?.message || e) }); }
  };
  useEffect(() => { cargar(); }, []);

  const hoy = hoyMadrid();
  const resumen = useMemo(() => {
    if (!filas) return null;
    const conFecha = filas.filter((f) => f.fecha);
    const semana = new Date(); semana.setDate(semana.getDate() - 7); const s7 = semana.toISOString();
    return {
      hoy: conFecha.filter((f) => f.fecha === hoy).length,
      hoyHechas: conFecha.filter((f) => f.fecha === hoy && f.publicado_en).length,
      programadas: conFecha.filter((f) => f.fecha >= hoy && !f.publicado_en).length,
      publicadas7: filas.filter((f) => f.publicado_en && f.publicado_en >= s7).length,
      errores: filas.filter((f) => f.error && !f.publicado_en).length,
      atrasadas: conFecha.filter((f) => f.fecha < hoy && !f.publicado_en && !f.error).length,
      ultimaFecha: conFecha.reduce((m, f) => (f.fecha > m ? f.fecha : m), ''),
    };
  }, [filas, hoy]);

  const lista = useMemo(() => {
    if (!filas) return [];
    let l = filas.filter((f) => (!campana || f.campana === campana) && (!red || f.red === red));
    if (estado === 'proximas') l = l.filter((f) => f.fecha && f.fecha >= hoy && !f.publicado_en);
    if (estado === 'publicadas') l = l.filter((f) => f.publicado_en);
    if (estado === 'errores') l = l.filter((f) => f.error && !f.publicado_en);
    if (estado === 'atrasadas') l = l.filter((f) => f.fecha && f.fecha < hoy && !f.publicado_en);
    const asc = estado === 'proximas' || estado === 'atrasadas';
    l.sort((a, b) => { const ka = `${a.fecha || '9999'} ${a.hora || ''}`; const kb = `${b.fecha || '9999'} ${b.hora || ''}`; return asc ? ka.localeCompare(kb) : kb.localeCompare(ka); });
    return l.slice(0, 300);
  }, [filas, campana, red, estado, hoy]);

  async function sincronizar() {
    setOcupado(true); setMsg(null);
    try {
      if (DEMO) { setMsg({ err: false, t: '(demo) Se descargarían los CSV de la web y se volcarían en la base.' }); return; }
      const j = await llamarApi({ accion: 'sincronizar' });
      if (!j.ok) throw new Error(j.error || (j.errores || []).join(' · ') || 'No se pudo sincronizar.');
      setMsg({ err: false, t: `Calendario volcado: ${j.subidas} filas (la base conserva lo ya publicado).` });
      await cargar();
    } catch (e) { setMsg({ err: true, t: String(e?.message || e) }); }
    finally { setOcupado(false); }
  }
  async function verEstado() {
    setOcupado(true); setMsg(null);
    try {
      if (DEMO) { setEstadoApi({ token_configurado: true, pendientes_ahora: 0, total: DEMO_FILAS.length }); return; }
      const j = await llamarApi({ accion: 'estado' });
      if (!j.ok) throw new Error(j.error);
      setEstadoApi(j);
    } catch (e) { setMsg({ err: true, t: String(e?.message || e) }); }
    finally { setOcupado(false); }
  }

  const chip = (f) => f.publicado_en
    ? <span className="chip !px-2 !py-0 bg-emerald-500/15 text-[10px] text-emerald-300" title={new Date(f.publicado_en).toLocaleString('es-ES')}>✓ publicada</span>
    : f.error ? <span className="chip !px-2 !py-0 bg-red-500/15 text-[10px] text-red-300" title={f.error}>✗ error{f.intentos >= 3 ? ' · agotada' : ` · ${f.intentos || 0}/3`}</span>
    : f.fecha && f.fecha < hoy ? <span className="chip !px-2 !py-0 bg-amber-400/15 text-[10px] text-amber-200">atrasada</span>
    : f.fecha ? <span className="chip !px-2 !py-0 bg-white/5 text-[10px] text-[#9FC0CB]">programada</span>
    : <span className="chip !px-2 !py-0 bg-white/5 text-[10px] text-[#7FA7B4]">sin fecha</span>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Comercial</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#EAF4F7]">Publicaciones en redes</h1>
          <p className="mt-1 text-sm font-medium text-[#9FC0CB]">El calendario vive en la web (<code className="text-[12px]">web/data/calendario_publicacion.csv</code>); cada noche se vuelca aquí y Make publica lo que toca cada 15 minutos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={verEstado} disabled={ocupado} className="btn-ghost !px-3 !py-2 text-xs disabled:opacity-50">⚙ Estado del publicador</button>
          <button onClick={sincronizar} disabled={ocupado} className="btn-orange !px-3 !py-2 text-xs disabled:opacity-50">{ocupado ? '…' : '⇣ Volcar el calendario ahora'}</button>
        </div>
      </div>
      {DEMO && <div className="rounded-xl bg-brand-orange/10 p-3 text-xs font-semibold text-brand-orange">Modo demo: datos de ejemplo.</div>}
      {msg && <p className={`rounded-xl px-3 py-2 text-[12.5px] font-bold ${msg.err ? 'bg-red-500/12 text-red-200' : 'bg-emerald-500/12 text-emerald-200'}`}>{msg.t}</p>}
      {estadoApi && (
        <div className="rounded-xl border border-[#1E5468] bg-[#0D3242] p-3 text-[12px] text-[#CFE3E9]">
          <p className="font-bold">Publicador: {estadoApi.token_configurado ? 'token configurado' : <span className="text-amber-200">falta PUBLICACIONES_TOKEN en Netlify</span>} · {estadoApi.total} filas en la base · {estadoApi.pendientes_ahora} pendientes ahora mismo</p>
          {estadoApi.ultimas?.length > 0 && <p className="mt-1 text-[#9FC0CB]">Última publicada: {estadoApi.ultimas[0].id} ({REDES[estadoApi.ultimas[0].red] || estadoApi.ultimas[0].red}) · {new Date(estadoApi.ultimas[0].publicado_en).toLocaleString('es-ES')}</p>}
          {estadoApi.errores?.length > 0 && <p className="mt-1 text-red-200">{estadoApi.errores.length} con error: {estadoApi.errores.slice(0, 3).map((e) => `${e.id} (${e.error?.slice(0, 60)})`).join(' · ')}</p>}
        </div>
      )}

      {resumen && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[['Hoy', `${resumen.hoyHechas}/${resumen.hoy}`, 'publicadas de las de hoy'], ['Programadas', resumen.programadas, 'de hoy en adelante'], ['Últimos 7 días', resumen.publicadas7, 'publicadas'], ['Con error', resumen.errores, 'sin publicar', resumen.errores ? 'text-red-300' : ''], ['Atrasadas', resumen.atrasadas, 'pasadas y sin publicar', resumen.atrasadas ? 'text-amber-200' : ''], ['Calendario hasta', fmt(resumen.ultimaFecha), 'última fecha programada']].map(([l, v, s, c]) => (
            <div key={l} className="card !p-3"><p className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#7FA7B4]">{l}</p><p className={`mt-0.5 text-xl font-extrabold text-[#EAF4F7] ${c || ''}`}>{v}</p><p className="text-[11px] text-[#7FA7B4]">{s}</p></div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl bg-[#0D3242] p-1">
          {[['proximas', 'Próximas'], ['publicadas', 'Publicadas'], ['errores', 'Errores'], ['atrasadas', 'Atrasadas'], ['todas', 'Todas']].map(([k, l]) => (
            <button key={k} onClick={() => setEstado(k)} className={`rounded-lg px-3 py-1 text-[12px] font-bold ${estado === k ? 'bg-brand-orange text-[#0A2B3A]' : 'text-[#9FC0CB] hover:text-[#EAF4F7]'}`}>{l}</button>
          ))}
        </div>
        <select className="input !w-auto !py-1 !text-[12px]" value={campana} onChange={(e) => setCampana(e.target.value)}><option value="">Campaña: todas</option>{Object.entries(CAMPANAS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select className="input !w-auto !py-1 !text-[12px]" value={red} onChange={(e) => setRed(e.target.value)}><option value="">Red: todas</option>{Object.entries(REDES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <span className="text-[12px] text-[#7FA7B4]">{lista.length}{lista.length === 300 ? '+' : ''} filas</span>
      </div>

      {!filas ? <p className="text-[13px] text-[#9FC0CB]">Cargando…</p> : (
        <div className="overflow-x-auto rounded-xl border border-[#1E5468]">
          <table className="w-full text-[12px]">
            <thead className="bg-[#0D3242] text-[10.5px] font-extrabold uppercase tracking-wider text-[#7FA7B4]"><tr><th className="px-2 py-1.5 text-left">Cuándo</th><th className="px-2 py-1.5 text-left">Red</th><th className="px-2 py-1.5 text-left">Campaña</th><th className="px-2 py-1.5 text-left">Texto</th><th className="px-2 py-1.5 text-left">Estado</th></tr></thead>
            <tbody>
              {lista.map((f) => (
                <tr key={f.id} onClick={() => setAbierta(abierta === f.id ? null : f.id)} className={`cursor-pointer border-t border-[#1E5468]/60 align-top hover:bg-white/5 ${f.fecha === hoy ? 'bg-brand-orange/5' : ''}`}>
                  <td className="whitespace-nowrap px-2 py-1.5 text-[#CFE3E9]">{fmt(f.fecha)} {fmtHora(f.hora)}<span className="ml-1 text-[10px] text-[#7FA7B4]">#{f.id}</span></td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-[#CFE3E9]">{REDES[f.red] || f.red}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-[#9FC0CB]">{CAMPANAS[f.campana] || f.campana}</td>
                  <td className="px-2 py-1.5 text-[#EAF4F7]">
                    {abierta === f.id ? (
                      <div className="flex flex-wrap gap-3">
                        {f.imagen_url && <img src={f.imagen_url} alt="" className="h-28 rounded-lg" />}
                        <pre className="max-w-xl whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-[#CFE3E9]">{f.texto}</pre>
                        {f.error && <p className="w-full text-[11.5px] text-red-300">Error: {f.error}</p>}
                        {f.publicado_ref && <p className="w-full text-[11px] text-[#7FA7B4]">Ref. en la red: {f.publicado_ref}</p>}
                      </div>
                    ) : <span className="line-clamp-2">{(f.texto || '').split('\n')[0]}</span>}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5">{chip(f)}</td>
                </tr>
              ))}
              {!lista.length && <tr><td colSpan={5} className="px-3 py-4 text-center text-[#7FA7B4]">Nada que mostrar con estos filtros.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
