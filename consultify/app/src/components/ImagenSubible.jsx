import { useRef, useState } from 'react';
import { supabase, DEMO } from '../lib/supabase.js';
import { updateRow, explicarErrorBd } from '../lib/data.js';

// ════════════════════════════════════════════════════════════════════════════
// IMAGEN SUBIBLE · foto de una persona o logo de una empresa
//
// Se pulsa la imagen (o el hueco con la inicial), se elige un fichero, se
// reduce en el navegador a 512 px como mucho y se guarda en el depósito
// público `imagenes` (migración v134). La URL queda en la columna que se
// diga (`perfiles.foto_url`, `contactos.foto_url`, `empresas.logo_url`) y
// la fila se actualiza aquí mismo: no depende del formulario de alrededor.
//
// En demo la imagen se guarda como data-URL en la fila en memoria.
// ════════════════════════════════════════════════════════════════════════════

const LADO_MAX = 512;

/** Reduce la imagen en un canvas. PNG se conserva (logos con transparencia); el resto va a JPEG. */
async function reducir(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('No se pudo leer la imagen.')); i.src = url; });
    const esc = Math.min(1, LADO_MAX / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * esc)), h = Math.max(1, Math.round(img.height * esc));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    const png = file.type === 'image/png' || file.type === 'image/svg+xml';
    const mime = png ? 'image/png' : 'image/jpeg';
    const blob = await new Promise((res) => c.toBlob(res, mime, 0.86));
    if (!blob) throw new Error('No se pudo procesar la imagen.');
    return { blob, mime, ext: png ? 'png' : 'jpg' };
  } finally { URL.revokeObjectURL(url); }
}

const aDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error('No se pudo leer.')); r.readAsDataURL(blob); });

/**
 * @param tabla    'perfiles' | 'contactos' | 'empresas'
 * @param id       fila
 * @param campo    'foto_url' | 'logo_url'
 * @param valor    URL actual (o null)
 * @param inicial  letra para el hueco
 * @param forma    'circulo' (personas) | 'cuadrado' (logos)
 * @param tamano   px
 * @param editable si false, solo se enseña
 * @param onCambio (url) => void, tras guardar
 * @param guardar  opcional: async (url) => void, en vez de updateRow (p. ej. mi propio perfil)
 */
export default function ImagenSubible({ tabla, id, campo = 'foto_url', valor = null, inicial = '?', forma = 'circulo', tamano = 64, editable = true, onCambio, guardar, titulo }) {
  const input = useRef(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);
  const [local, setLocal] = useState(null);   // URL recién guardada, por si el padre tarda en refrescar
  const src = local || valor || null;
  const redondo = forma === 'circulo' ? 'rounded-full' : 'rounded-xl';

  async function elegir(e) {
    const f = e.target.files?.[0];
    if (input.current) input.current.value = '';
    if (!f) return;
    if (!/^image\//.test(f.type)) { setError('Elige una imagen (JPG, PNG o WebP).'); return; }
    setOcupado(true); setError(null);
    try {
      const { blob, mime, ext } = await reducir(f);
      let url;
      if (DEMO || !supabase) {
        url = await aDataUrl(blob);
      } else {
        const ruta = `${tabla}/${id}/${Date.now()}.${ext}`;
        const { error: e1 } = await supabase.storage.from('imagenes').upload(ruta, blob, { contentType: mime, upsert: true });
        if (e1) throw new Error(/bucket|Bucket/.test(e1.message) ? `${e1.message}. Falta aplicar la migración v134 (depósito «imagenes»).` : e1.message);
        url = supabase.storage.from('imagenes').getPublicUrl(ruta).data.publicUrl;
      }
      if (guardar) await guardar(url);
      else await updateRow(tabla, id, { [campo]: url });
      setLocal(url);
      onCambio?.(url);
    } catch (e2) {
      setError(explicarErrorBd(e2, tabla) + (/foto_url|logo_url/.test(String(e2?.message || e2)) ? ' Falta aplicar la migración v134.' : ''));
    } finally { setOcupado(false); }
  }

  async function quitar() {
    if (!window.confirm('¿Quitar la imagen?')) return;
    setOcupado(true); setError(null);
    try {
      if (guardar) await guardar(null); else await updateRow(tabla, id, { [campo]: null });
      setLocal(null); onCambio?.(null);
    } catch (e2) { setError(explicarErrorBd(e2, tabla)); }
    finally { setOcupado(false); }
  }

  const estilo = { width: tamano, height: tamano };
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <button type="button" disabled={!editable || ocupado} onClick={() => editable && input.current?.click()}
        title={editable ? (titulo || 'Cambiar imagen') : undefined}
        className={`group relative overflow-hidden border border-[#1E5468] bg-[#0D3242] ${redondo} ${editable ? 'cursor-pointer hover:border-brand-orange' : 'cursor-default'}`} style={estilo}>
        {src
          ? <img src={src} alt="" className={`h-full w-full ${forma === 'circulo' ? 'object-cover' : 'object-contain p-1'}`} />
          : <span className="flex h-full w-full items-center justify-center font-extrabold text-brand-verdeTexto" style={{ fontSize: Math.max(12, tamano / 2.6) }}>{String(inicial || '?').slice(0, 2).toUpperCase()}</span>}
        {editable && (
          <span className="absolute inset-x-0 bottom-0 bg-[#061F2B]/80 py-0.5 text-center text-[9.5px] font-bold text-[#EAF4F7] opacity-0 transition group-hover:opacity-100">
            {ocupado ? '…' : (src ? 'cambiar' : 'subir')}
          </span>
        )}
      </button>
      {editable && <input ref={input} type="file" accept="image/*" className="hidden" onChange={elegir} />}
      {editable && src && !ocupado && (
        <button type="button" onClick={quitar} className="text-[10px] font-bold text-[#7FA7B4] hover:text-red-300">quitar</button>
      )}
      {error && <p className="max-w-[220px] text-center text-[10.5px] font-bold text-red-300">{error}</p>}
    </div>
  );
}

/** Solo lectura: foto o inicial, para listas. */
export function Avatar({ src, inicial = '?', tamano = 28, forma = 'circulo', className = '' }) {
  const redondo = forma === 'circulo' ? 'rounded-full' : 'rounded-lg';
  return src
    ? <img src={src} alt="" className={`shrink-0 border border-[#1E5468] bg-[#0D3242] ${redondo} ${forma === 'circulo' ? 'object-cover' : 'object-contain p-0.5'} ${className}`} style={{ width: tamano, height: tamano }} />
    : <span className={`inline-flex shrink-0 items-center justify-center border border-[#1E5468] bg-[#0D3242] font-extrabold text-brand-verdeTexto ${redondo} ${className}`} style={{ width: tamano, height: tamano, fontSize: Math.max(10, tamano / 2.6) }}>{String(inicial || '?').slice(0, 2).toUpperCase()}</span>;
}
