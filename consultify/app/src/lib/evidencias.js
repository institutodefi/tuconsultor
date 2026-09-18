// ════════════════════════════════════════════════════════════════════════════
// EVIDENCIAS · lo que hay que enseñar cuando llega el auditor
//
// Hermana de `subtareas.js` y a propósito separada de ella: una subtarea es
// trabajo que se hace; una evidencia es un documento que tiene que existir,
// estar vigente y responder a un requisito. Se parecen en la forma —una lista
// que se hereda del catálogo y se marca en el proyecto— y no en lo que
// significan.
//
// En el catálogo:  [{titulo, definicion, requisito, obligatoria}]
// En el cliente:   filas de `cliente_evidencias`, con estado, documento y el
//                  veredicto de la revisión por IA.
//
// Funciones puras, sin React ni Supabase: se prueban desde Node.
// ════════════════════════════════════════════════════════════════════════════

const S = (v) => String(v ?? '').trim();
const norm = (t) => S(t).toLowerCase().replace(/\s+/g, ' ');

/** Lista limpia de evidencias venga como venga (texto, array, JSON). */
export function normalizarEvidencias(v) {
  let arr = v;
  if (typeof v === 'string') { try { arr = JSON.parse(v); } catch { arr = v.split('\n'); } }
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => {
    if (typeof x === 'string') return { titulo: S(x), definicion: '', requisito: '', obligatoria: true };
    return {
      titulo: S(x?.titulo ?? x?.texto ?? ''),
      definicion: S(x?.definicion),
      requisito: S(x?.requisito),
      // Por defecto obligatoria: una evidencia opcional que nadie marcó como
      // opcional es, casi siempre, una evidencia obligatoria mal metida.
      obligatoria: x?.obligatoria === undefined ? true : !!x.obligatoria,
    };
  }).filter((x) => x.titulo);
}

/** Lo que se guarda en el catálogo. */
export const evidenciasCatalogo = (v) => normalizarEvidencias(v);

/** Los estados por los que pasa una evidencia en el cliente. */
export const ESTADOS_EVIDENCIA = [
  { k: 'pendiente', label: 'Pendiente',  color: 'bg-white/10 text-[#9FC0CB]' },
  { k: 'aportada',  label: 'Aportada',   color: 'bg-sky-500/15 text-sky-200' },
  { k: 'validada',  label: 'Validada',   color: 'bg-emerald-500/15 text-emerald-300' },
  { k: 'rechazada', label: 'Rechazada',  color: 'bg-red-500/15 text-red-200' },
  { k: 'no_aplica', label: 'No aplica',  color: 'bg-white/5 text-[#5F8494]' },
];
export const estadoEvidencia = (k) => ESTADOS_EVIDENCIA.find((e) => e.k === k) || ESTADOS_EVIDENCIA[0];

export const VEREDICTOS = {
  cumple:    { label: 'Cumple',     color: 'text-emerald-300' },
  parcial:   { label: 'A medias',   color: 'text-brand-orange' },
  no_cumple: { label: 'No cumple',  color: 'text-red-300' },
};

/**
 * ¿El veredicto de la IA sigue valiendo?
 *
 * Si el documento aportado ya no es el que se revisó, el veredicto es de otra
 * cosa. Enseñarlo como si valiera es peor que no tener veredicto.
 */
export const veredictoAlDia = (ev) =>
  !!ev?.ia_revisado_en && String(ev.ia_documento_id || '') === String(ev.documento_id || '');

/**
 * Mezcla las evidencias del catálogo con las que ya tiene el cliente.
 * Igual que la checklist: manda el orden del catálogo, se conserva el estado
 * de las que coinciden por título, y las que el catálogo ya no pide solo se
 * quedan si tenían algo aportado. Lo aportado no se tira nunca.
 */
export function mezclarEvidencias(actuales, delCatalogo) {
  const act = Array.isArray(actuales) ? actuales : [];
  const cat = normalizarEvidencias(delCatalogo);
  const porTitulo = new Map(act.map((x) => [norm(x.titulo), x]));
  const usadas = new Set();
  const out = cat.map((c, i) => {
    const k = norm(c.titulo); usadas.add(k);
    const prev = porTitulo.get(k);
    return prev
      ? { ...prev, definicion: c.definicion || prev.definicion, requisito: c.requisito || prev.requisito, obligatoria: c.obligatoria, orden: i }
      : { titulo: c.titulo, definicion: c.definicion, requisito: c.requisito, obligatoria: c.obligatoria, estado: 'pendiente', orden: i };
  });
  for (const a of act) {
    if (usadas.has(norm(a.titulo))) continue;
    if (a.documento_id || (a.estado && a.estado !== 'pendiente')) out.push({ ...a, orden: out.length });
  }
  return out;
}

/** Avance: cuántas de las obligatorias están validadas. */
export function progresoEvidencias(lista) {
  const l = Array.isArray(lista) ? lista : [];
  const obligatorias = l.filter((x) => x.obligatoria !== false && x.estado !== 'no_aplica');
  const validadas = obligatorias.filter((x) => x.estado === 'validada').length;
  const aportadas = obligatorias.filter((x) => ['aportada', 'validada'].includes(x.estado)).length;
  return {
    total: obligatorias.length, validadas, aportadas,
    pct: obligatorias.length ? Math.round((validadas / obligatorias.length) * 100) : null,
    completa: obligatorias.length > 0 && validadas === obligatorias.length,
  };
}

export const etiquetaEvidencias = (lista) => {
  const p = progresoEvidencias(lista);
  return p.total ? `${p.validadas}/${p.total}` : '';
};
