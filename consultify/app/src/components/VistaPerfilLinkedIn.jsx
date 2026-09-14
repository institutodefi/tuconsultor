import { useEffect, useState } from 'react';
import { supabase, DEMO } from '../lib/supabase.js';
import { updateRow } from '../lib/data.js';

// ════════════════════════════════════════════════════════════════════════════
// PERFIL DE LINKEDIN ASOCIADO · abrir, copiar, previsualizar y traer la foto
//
// Debajo de la ficha del contacto, cuando tiene `linkedin_url`:
//   · Abrir ↗ · ⧉ Copiar (el enlace al portapapeles) · Vista previa
//   · La vista previa la trae /api/perfil-linkedin: primero las etiquetas
//     Open Graph de la página pública (título, descripción y foto); si LinkedIn
//     no las sirve al servidor, un resumen de la IA (sin foto).
//   · «Usar esta foto en la ficha» copia la foto pública al depósito de
//     imágenes y la pone en `contactos.foto_url`. Lo decide quien lo pulsa.
// ════════════════════════════════════════════════════════════════════════════

async function llamar(payload) {
  const { data } = await supabase.auth.getSession();
  const r = await fetch('/api/perfil-linkedin', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data?.session?.access_token || ''}` }, body: JSON.stringify(payload) });
  return r.json().catch(() => ({ ok: false, error: `Sin respuesta (${r.status})` }));
}

const FOTO_DEMO = (inicial) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#1B5D72"/><circle cx="100" cy="78" r="38" fill="#EAF4F7"/><ellipse cx="100" cy="170" rx="62" ry="44" fill="#EAF4F7"/><text x="100" y="196" text-anchor="middle" font-family="Arial" font-size="14" fill="#0A2B3A">${inicial}</text></svg>`)}`;

export async function copiarTexto(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch {
    try { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch { return false; }
  }
}

export default function VistaPerfilLinkedIn({ contacto, puedeEditar = true, onCambio, onPatch }) {
  const url = contacto?.linkedin_url || '';
  const [vista, setVista] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [foto, setFoto] = useState(null);   // 'guardando' | 'hecha'
  useEffect(() => { setVista(null); setError(null); setFoto(null); }, [url]);
  if (!url) return null;

  async function copiar() { if (await copiarTexto(url)) { setCopiado(true); setTimeout(() => setCopiado(false), 1500); } else setError('No se pudo copiar: selecciona el enlace y cópialo a mano.'); }

  async function previsualizar() {
    if (vista) { setVista(null); return; }
    setOcupado(true); setError(null);
    try {
      const j = DEMO
        ? { ok: true, titulo: `${contacto.nombre} ${contacto.apellidos || ''} · ${contacto.cargo || 'Directora General'} en Grupo Andes`.trim(), descripcion: 'Perfil público de ejemplo: veinte años en gestión de calidad y sistemas de gestión, ahora en dirección general. Madrid.', foto: FOTO_DEMO((contacto.nombre || '?').charAt(0)), origen: 'linkedin' }
        : await llamar({ accion: 'vista', url });
      if (!j.ok) throw new Error(j.error);
      setVista(j);
    } catch (e) { setError(String(e?.message || e)); }
    finally { setOcupado(false); }
  }

  async function usarFoto() {
    if (!vista?.foto) return;
    setFoto('guardando'); setError(null);
    try {
      let patch;
      if (DEMO) { patch = { foto_url: vista.foto }; await updateRow('contactos', contacto.id, patch); }
      else { const j = await llamar({ accion: 'foto', url, foto: vista.foto, contacto_id: contacto.id }); if (!j.ok) throw new Error(j.error); patch = { foto_url: j.foto_url, fuente_datos: j.fuente_datos }; }
      setFoto('hecha'); onCambio?.(); onPatch?.(patch);
    } catch (e) { setError(String(e?.message || e)); setFoto(null); }
  }

  const yaEsLaFoto = foto === 'hecha' || (vista?.foto && contacto.foto_url && contacto.foto_url.includes('linkedin-'));
  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-bold">
        <span className="text-[#7FA7B4]">Perfil de LinkedIn:</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#9FC0CB] hover:text-[#EAF4F7]" title={url}>Abrir ↗</a>
        <button type="button" onClick={copiar} className="text-[#9FC0CB] hover:text-[#EAF4F7]" title="Copiar el enlace al portapapeles">{copiado ? '✓ Copiado' : '⧉ Copiar URL'}</button>
        <button type="button" onClick={previsualizar} disabled={ocupado} className="text-[#9FC0CB] hover:text-[#EAF4F7] disabled:opacity-50" title="Ver lo que publica ese perfil (título, resumen y foto) sin salir de aquí">{ocupado ? 'Leyendo…' : vista ? 'Ocultar vista previa' : '◉ Vista previa'}</button>
      </div>
      {error && <p className="mt-1 text-[11.5px] font-bold text-red-300">{error}</p>}
      {vista && (
        <div className="mt-1.5 flex flex-wrap items-start gap-3 rounded-xl border border-[#1E5468] bg-[#0B2E3D] p-2.5 text-[12px]">
          {vista.foto
            ? <img src={vista.foto} alt="" className="h-16 w-16 shrink-0 rounded-full border border-[#1E5468] object-cover" />
            : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#1E5468] bg-[#0D3242] text-[11px] font-bold text-[#7FA7B4]">sin foto</span>}
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-[#EAF4F7]">{vista.titulo}</p>
            {vista.descripcion && <p className="mt-0.5 text-[#CFE3E9]">{vista.descripcion}</p>}
            <p className="mt-1 truncate text-[10.5px] text-[#7FA7B4]">
              {vista.origen === 'ia' ? 'LinkedIn no sirve la página al servidor: esto es lo que la IA encuentra publicado (sin foto). ' : 'Leído de la página pública del perfil. '}
              <a href={url} target="_blank" rel="noopener noreferrer" className="underline">{url.replace(/^https?:\/\/(www\.)?/, '')}</a>
            </p>
            {puedeEditar && vista.foto && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {yaEsLaFoto
                  ? <span className="text-[11px] font-bold text-emerald-300">✓ Es la foto de la ficha.</span>
                  : <button type="button" onClick={usarFoto} disabled={foto === 'guardando'} className="btn-orange !px-2.5 !py-0.5 text-[11px] disabled:opacity-40">{foto === 'guardando' ? 'Guardando…' : contacto.foto_url ? 'Sustituir la foto de la ficha por esta' : 'Usar esta foto en la ficha'}</button>}
                <span className="text-[10.5px] text-[#7FA7B4]">Se copia al depósito de imágenes y queda anotado en la fuente.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
