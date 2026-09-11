import { useState } from 'react';
import DialogoFicha from './DialogoFicha.jsx';
import { supabase, DEMO } from '../lib/supabase.js';
import { nombreVisible } from '../lib/crm.js';

// ════════════════════════════════════════════════════════════════════════════
// BUSCAR EN LINKEDIN / LA WEB Y AÑADIR AL CRM (v140)
//
// Se escribe un nombre y una empresa (o la URL del perfil) y la IA busca en
// fuentes públicas la información profesional. Lo que devuelve es una
// propuesta: se revisa, se elige la empresa del CRM y se abre el formulario
// de alta ya relleno. Nada se guarda sin pasar por ahí.
//
// Lo que NO hace, a propósito: teléfonos personales, direcciones, nada
// privado; ni extracciones masivas. Y deja rastro: origen «ia-web» y la
// fuente, porque a esa persona hay que informarle (art. 14 RGPD).
// ════════════════════════════════════════════════════════════════════════════

async function llamar(payload) {
  const { data } = await supabase.auth.getSession();
  const r = await fetch('/api/buscar-contacto', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data?.session?.access_token || ''}` }, body: JSON.stringify(payload) });
  return r.json().catch(() => ({ ok: false, error: `Sin respuesta (${r.status})` }));
}

const DEMO_PROPUESTA = { encontrado: true, confianza: 'alta', nombre: 'Marta', apellidos: 'Ferrer Soler', cargo: 'Directora General', email: '', empresa: 'Grupo Andes', empresa_web: 'https://grupoandes.example', ciudad: 'Madrid', linkedin_url: 'https://www.linkedin.com/in/marta-ferrer-ejemplo', resumen: 'Directora general de Grupo Andes desde 2021; antes responsable de calidad en el sector industrial.', fuentes: ['https://www.linkedin.com/in/marta-ferrer-ejemplo', 'https://grupoandes.example/equipo'], candidatos: [], fuente_datos: 'Búsqueda IA en fuentes públicas (demo)' };

export default function BuscadorContactoIA({ empresas = [], onCerrar, onAnadir }) {
  const [nombre, setNombre] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [url, setUrl] = useState('');
  const [pista, setPista] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);
  const [p, setP] = useState(null);
  const [empresaId, setEmpresaId] = useState('');
  const [rol, setRol] = useState('directivo');

  async function buscar() {
    if (!nombre.trim() && !url.trim()) { setError('Escribe el nombre o pega la URL del perfil.'); return; }
    setOcupado(true); setError(null); setP(null);
    try {
      const j = DEMO ? { ok: true, propuesta: { ...DEMO_PROPUESTA, nombre: nombre.split(' ')[0] || DEMO_PROPUESTA.nombre } } : await llamar({ nombre, empresa, linkedin_url: url, pista });
      if (!j.ok) throw new Error(j.error);
      setP(j.propuesta);
      // Si la empresa propuesta ya está en el CRM, se preselecciona.
      const nom = (j.propuesta.empresa || empresa).toLowerCase();
      const e = empresas.find((x) => nom && (String(x.nombre || '').toLowerCase().includes(nom) || String(x.nombre_comercial || '').toLowerCase() === nom || nom.includes(String(x.nombre_comercial || 'ø').toLowerCase())));
      if (e) setEmpresaId(String(e.id));
    } catch (e) { setError(String(e?.message || e)); }
    finally { setOcupado(false); }
  }
  function usar(c) { setP({ ...p, nombre: c.nombre?.split(' ')[0] || p.nombre, apellidos: c.nombre?.split(' ').slice(1).join(' ') || p.apellidos, cargo: c.cargo || p.cargo, empresa: c.empresa || p.empresa, linkedin_url: c.linkedin_url || p.linkedin_url }); }

  return (
    <DialogoFicha titulo="✦ Buscar en LinkedIn y añadir" subtitulo="Información profesional pública. Lo que salga se revisa antes de guardarlo." onCerrar={onCerrar} ancho="720px"
      pie={<>
        <button onClick={onCerrar} className="btn-ghost !px-4 !py-1.5 text-[13px]">Cerrar</button>
        {p?.encontrado && <button onClick={() => onAnadir({ nombre: p.nombre, apellidos: p.apellidos, cargo: p.cargo, email: p.email, linkedin_url: p.linkedin_url, fuente_datos: p.fuente_datos, notas: p.resumen ? `${p.resumen}${p.fuentes?.length ? `\nFuentes: ${p.fuentes.join(' · ')}` : ''}` : null, _empresa_id: empresaId, _rol: rol })} disabled={!empresaId} title={empresaId ? '' : 'Elige la empresa del CRM a la que pertenece'} className="btn-orange !px-4 !py-1.5 text-[13px] disabled:opacity-50">Añadir al CRM →</button>}
      </>}>
      <div className="space-y-3 text-[12.5px]">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block"><span className="label">Nombre y apellidos</span><input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Marta Ferrer" autoFocus /></label>
          <label className="block"><span className="label">Empresa (si la sabes)</span><input className="input" value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Grupo Andes" /></label>
          <label className="block"><span className="label">URL de LinkedIn (opcional)</span><input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.linkedin.com/in/…" /></label>
          <label className="block"><span className="label">Pistas (opcional)</span><input className="input" value={pista} onChange={(e) => setPista(e.target.value)} placeholder="responsable de calidad, Valencia…" /></label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={buscar} disabled={ocupado} className="btn-orange !px-4 !py-1.5 text-[13px] disabled:opacity-50">{ocupado ? 'Buscando…' : '✦ Buscar'}</button>
          <span className="text-[11px] text-[#7FA7B4]">Busca en fuentes públicas (perfil de LinkedIn, web de la empresa). Solo datos profesionales.</span>
        </div>
        {error && <p className="rounded-lg bg-red-500/12 px-3 py-2 font-bold text-red-200">{error}</p>}

        {p && (
          <div className="space-y-3 rounded-xl border border-[#1E5468] bg-[#0B2E3D] p-3">
            {!p.encontrado ? (
              <p className="text-[#CFE3E9]">No se ha encontrado nada fiable. {p.resumen}</p>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[14px] font-extrabold text-[#EAF4F7]">{p.nombre} {p.apellidos}{p.cargo ? <span className="ml-2 font-semibold text-[#9FC0CB]">{p.cargo}</span> : null}</p>
                    <p className="text-[#9FC0CB]">{p.empresa || '—'}{p.ciudad ? ` · ${p.ciudad}` : ''}{p.email ? ` · ${p.email}` : ''}</p>
                    {p.linkedin_url && <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-bold text-brand-orange hover:underline">Ver perfil de LinkedIn ↗</a>}
                  </div>
                  <span className={`chip !px-2 !py-0 text-[10px] ${p.confianza === 'alta' ? 'bg-emerald-500/15 text-emerald-300' : p.confianza === 'media' ? 'bg-amber-400/15 text-amber-200' : 'bg-red-500/15 text-red-300'}`}>confianza {p.confianza}</span>
                </div>
                {p.resumen && <p className="text-[#CFE3E9]">{p.resumen}</p>}
                {p.fuentes?.length > 0 && <p className="text-[11px] text-[#7FA7B4]">Fuentes: {p.fuentes.map((f, i) => <a key={i} href={f} target="_blank" rel="noopener noreferrer" className="mr-2 underline hover:text-[#EAF4F7]">{new URL(f).hostname}</a>)}</p>}
                {p.candidatos?.length > 0 && (
                  <div>
                    <p className="label !mb-1">¿No es esta persona? Otras coincidencias</p>
                    <div className="flex flex-wrap gap-1.5">
                      {p.candidatos.map((c, i) => <button key={i} type="button" onClick={() => usar(c)} className="btn-ghost !px-2 !py-0.5 text-[11px]">{c.nombre}{c.cargo ? ` · ${c.cargo}` : ''}{c.empresa ? ` · ${c.empresa}` : ''}</button>)}
                    </div>
                  </div>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block"><span className="label">Empresa del CRM a la que pertenece *</span>
                    <select className="input" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
                      <option value="">— elige una empresa —</option>
                      {[...empresas].sort((a, b) => nombreVisible(a).localeCompare(nombreVisible(b), 'es')).map((e) => <option key={e.id} value={String(e.id)}>{nombreVisible(e)}{e.cif ? ` · ${e.cif}` : ''}</option>)}
                    </select>
                    {!empresaId && p.empresa && <span className="campo-nota">«{p.empresa}» no está en el CRM: créala antes en Empresas o elige otra.</span>}
                  </label>
                  <label className="block"><span className="label">Rol en la empresa</span>
                    <select className="input" value={rol} onChange={(e) => setRol(e.target.value)}>
                      <option value="directivo">Directivo</option><option value="proyecto">Proyecto</option><option value="facturacion">Facturación</option><option value="secundario">Secundario</option>
                    </select>
                  </label>
                </div>
                <p className="rounded-lg bg-amber-400/10 px-2.5 py-2 text-[11.5px] text-amber-100">Esta persona no nos ha dado sus datos: salen de fuentes públicas. Quedará con origen «Buscado con IA» y la fuente, y hay que informarle de que los tenemos y de dónde salen en el primer contacto o antes de un mes (art. 14 RGPD). La ficha lo recuerda hasta que se marque como informada.</p>
              </>
            )}
          </div>
        )}
      </div>
    </DialogoFicha>
  );
}
