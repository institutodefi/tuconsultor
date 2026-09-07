// ════════════════════════════════════════════════════════════════════════════
// SUBTAREAS · la checklist de cada tarea
//
// En el catálogo (Sistemas de gestión) una tarea lleva su definición y sus
// subtareas: [{texto}]. Al volcarse a un proyecto, la tarea del proyecto se
// las lleva como checklist: [{texto, hecha, fecha}]. Cuando el catálogo cambia
// y se «lleva a los proyectos abiertos», se mezclan: lo que ya estaba marcado
// sigue marcado, lo nuevo entra sin marcar y lo que desaparece del catálogo
// solo se conserva si ya estaba hecho (es historia, no se borra).
//
// Funciones puras: se prueban desde Node (scripts/test-subtareas.mjs).
// ════════════════════════════════════════════════════════════════════════════

const S = (v) => String(v ?? '').trim();
const norm = (t) => S(t).toLowerCase().replace(/\s+/g, ' ');

/** Lista limpia de subtareas a partir de lo que venga (texto, array, JSON…). */
export function normalizarSubtareas(v) {
  let arr = v;
  if (typeof v === 'string') { try { arr = JSON.parse(v); } catch { arr = v.split('\n'); } }
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => {
    if (typeof x === 'string') return { texto: S(x), hecha: false, fecha: null };
    return { texto: S(x?.texto ?? x?.titulo ?? ''), hecha: !!x?.hecha, fecha: x?.fecha || null };
  }).filter((x) => x.texto);
}

/** Lo que se guarda en el catálogo: solo el texto, sin estado. */
export const subtareasCatalogo = (v) => normalizarSubtareas(v).map((x) => ({ texto: x.texto }));

/** Lo que nace en el proyecto: todo sin marcar. */
export const subtareasNuevas = (v) => normalizarSubtareas(v).map((x) => ({ texto: x.texto, hecha: false, fecha: null }));

/**
 * Mezcla la checklist de una tarea de proyecto con la lista nueva del catálogo.
 * Orden del catálogo; conserva `hecha` y `fecha` de las que coinciden por
 * texto; las que ya no están en el catálogo se conservan al final solo si
 * estaban hechas.
 */
export function mezclarSubtareas(actuales, delCatalogo) {
  const act = normalizarSubtareas(actuales);
  const cat = normalizarSubtareas(delCatalogo);
  const porTexto = new Map(act.map((x) => [norm(x.texto), x]));
  const usadas = new Set();
  const out = cat.map((c) => {
    const k = norm(c.texto); usadas.add(k);
    const prev = porTexto.get(k);
    return { texto: c.texto, hecha: !!prev?.hecha, fecha: prev?.hecha ? (prev.fecha || null) : null };
  });
  for (const a of act) if (!usadas.has(norm(a.texto)) && a.hecha) out.push({ texto: a.texto, hecha: true, fecha: a.fecha || null });
  return out;
}

/** Marca o desmarca la subtarea `i`. */
export function marcarSubtarea(lista, i, hecha, hoy = null) {
  return normalizarSubtareas(lista).map((x, j) => (j === i ? { ...x, hecha: !!hecha, fecha: hecha ? (hoy || x.fecha || null) : null } : x));
}

/** Avance de la checklist. */
export function progresoChecklist(lista) {
  const l = normalizarSubtareas(lista);
  const hechas = l.filter((x) => x.hecha).length;
  return { hechas, total: l.length, pct: l.length ? Math.round((hechas / l.length) * 100) : null, completa: l.length > 0 && hechas === l.length };
}

/** Descripción corta: «2/5» o «—» si no hay checklist. */
export const etiquetaChecklist = (lista) => { const p = progresoChecklist(lista); return p.total ? `${p.hechas}/${p.total}` : ''; };
