import { useState } from 'react';
import { supabase, DEMO } from '../lib/supabase.js';
import { updateRow } from '../lib/data.js';

// ════════════════════════════════════════════════════════════════════════════
// ASOCIAR EL PERFIL DE LINKEDIN A UN CONTACTO QUE YA EXISTE (v140)
//
// En la ficha: «✦ Buscar en LinkedIn» usa los datos del contacto (nombre,
// apellidos, empresa, cargo) y la IA devuelve hasta cinco candidatos
// ordenados por afinidad, cada uno con el motivo. Se elige uno a mano y se
// guarda su perfil (y el cargo, si la ficha no lo tenía). Nada se asocia
// solo: la decisión es de quien mira la lista.
// ════════════════════════════════════════════════════════════════════════════

async function llamar(payload) {
  const { data } = await supabase.auth.getSession();
  const r = await fetch('/api/buscar-contacto', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data?.session?.access_token || ''}` }, body: JSON.stringify(payload) });
  return r.json().catch(() => ({ ok: false, error: `Sin respuesta (${r.status})` }));
}

const DEMO_CANDIDATOS = (n) => [
  { nombre: `${n} (perfil 1)`, cargo: 'Directora General', empresa: 'Grupo Andes', ciudad: 'Madrid', linkedin_url: 'https://www.linkedin.com/in/ejemplo-1', afinidad: 92, motivo: 'Mismo nombre, misma empresa y cargo coherente.' },
  { nombre: `${n} (perfil 2)`, cargo: 'Responsable de Calidad', empresa: 'Andes Ingeniería', ciudad: 'Valencia', linkedin_url: 'https://www.linkedin.com/in/ejemplo-2', afinidad: 61, motivo: 'Mismo nombre, empresa del mismo grupo.' },
  { nombre: `${n} (perfil 3)`, cargo: 'Consultora', empresa: 'Otra empresa', ciudad: 'Sevilla', linkedin_url: 'https://www.linkedin.com/in/ejemplo-3', afinidad: 28, motivo: 'Solo coincide el nombre.' },
];

export default function AsociarLinkedIn({ contacto, empresa = '', puedeEditar = true, onCambio }) {
  const [abierto, setAbierto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);
  const [candidatos, setCandidatos] = useState(null);
  const [asociando, setAsociando] = useState(null);
  const [hecho, setHecho] = useState(null);
  if (!contacto?.id || !puedeEditar) return null;
  const nombreCompleto = `${contacto.nombre || ''} ${contacto.apellidos || ''}`.trim();

  async function buscar() {
    setOcupado(true); setError(null); setCandidatos(null); setHecho(null); setAbierto(true);
    try {
      const j = DEMO ? { ok: true, propuesta: { candidatos: DEMO_CANDIDATOS(nombreCompleto) } } : await llamar({ nombre: nombreCompleto, empresa, pista: [contacto.cargo, contacto.email ? `correo ${contacto.email}` : ''].filter(Boolean).join(', ') });
      if (!j.ok) throw new Error(j.error);
      const lista = (j.propuesta.candidatos || []).slice(0, 5);
      // Si la IA dio la principal fuera de la lista, se añade la primera.
      if (!lista.length && j.propuesta.encontrado && j.propuesta.linkedin_url) lista.push({ nombre: `${j.propuesta.nombre} ${j.propuesta.apellidos}`.trim(), cargo: j.propuesta.cargo, empresa: j.propuesta.empresa, ciudad: j.propuesta.ciudad, linkedin_url: j.propuesta.linkedin_url, afinidad: j.propuesta.confianza === 'alta' ? 85 : 55, motivo: j.propuesta.resumen });
      setCandidatos(lista);
      if (!lista.length) setError('No se ha encontrado ningún perfil que encaje. Prueba desde «Buscar en LinkedIn» con más pistas.');
    } catch (e) { setError(String(e?.message || e)); }
    finally { setOcupado(false); }
  }
  async function asociar(c) {
    setAsociando(c.linkedin_url || c.nombre); setError(null);
    try {
      const patch = { linkedin_url: c.linkedin_url || null };
      if (!contacto.cargo && c.cargo) patch.cargo = c.cargo;
      if (!contacto.fuente_datos) patch.fuente_datos = `Perfil de LinkedIn asociado por búsqueda IA (${new Date().toLocaleDateString('es-ES')}): ${c.linkedin_url || c.nombre}`;
      await updateRow('contactos', contacto.id, patch);
      setHecho(c); setCandidatos(null); onCambio?.();
    } catch (e) { setError(String(e?.message || e)); }
    finally { setAsociando(null); }
  }

  const color = (a) => (a >= 75 ? 'bg-emerald-400' : a >= 45 ? 'bg-amber-300' : 'bg-red-400');

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={buscar} disabled={ocupado} className="btn-ghost !px-2.5 !py-1 text-[11.5px] disabled:opacity-50" title="Busca en LinkedIn y la web con el nombre, la empresa y el cargo de esta ficha y propone hasta cinco perfiles">
          {ocupado ? 'Buscando…' : contacto.linkedin_url ? '✦ Buscar otro perfil en LinkedIn' : '✦ Buscar su perfil en LinkedIn'}
        </button>
        {contacto.linkedin_url && !abierto && <a href={contacto.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[11.5px] font-bold text-[#9FC0CB] hover:text-[#EAF4F7]">Perfil asociado ↗</a>}
        {abierto && !ocupado && <button type="button" onClick={() => { setAbierto(false); setCandidatos(null); }} className="text-[11px] font-bold text-[#7FA7B4]">cerrar</button>}
      </div>
      {error && <p className="mt-1.5 text-[11.5px] font-bold text-red-300">{error}</p>}
      {hecho && <p className="mt-1.5 text-[11.5px] font-bold text-emerald-300">Perfil asociado: {hecho.nombre}{hecho.cargo ? ` · ${hecho.cargo}` : ''}. <a href={hecho.linkedin_url} target="_blank" rel="noopener noreferrer" className="underline">Abrir ↗</a></p>}
      {candidatos && candidatos.length > 0 && (
        <div className="mt-2 space-y-1.5 rounded-xl border border-[#1E5468] bg-[#0B2E3D] p-2.5">
          <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#7FA7B4]">Candidatos por afinidad · elige el que sea</p>
          {candidatos.map((c, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-[12px]">
              <span className="w-10 shrink-0 text-right font-extrabold text-[#EAF4F7]">{c.afinidad}%</span>
              <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-white/10"><span className={`block h-full ${color(c.afinidad)}`} style={{ width: `${c.afinidad}%` }} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-[#EAF4F7]">{c.nombre}{c.cargo ? <span className="ml-1.5 font-semibold text-[#9FC0CB]">{c.cargo}</span> : null}</span>
                <span className="block truncate text-[11px] text-[#7FA7B4]">{[c.empresa, c.ciudad].filter(Boolean).join(' · ')}{c.motivo ? ` — ${c.motivo}` : ''}</span>
              </span>
              {c.linkedin_url && <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-[#9FC0CB] hover:text-[#EAF4F7]">ver ↗</a>}
              <button type="button" onClick={() => asociar(c)} disabled={!!asociando || !c.linkedin_url} title={c.linkedin_url ? 'Guardar este perfil en la ficha' : 'Sin URL de perfil'} className="btn-orange !px-2.5 !py-0.5 text-[11px] disabled:opacity-40">{asociando === (c.linkedin_url || c.nombre) ? '…' : 'Asociar'}</button>
            </div>
          ))}
          <p className="text-[10.5px] text-[#7FA7B4]">Solo se guarda el enlace al perfil público (y el cargo si la ficha no lo tenía). Los datos de contacto no cambian.</p>
        </div>
      )}
    </div>
  );
}
