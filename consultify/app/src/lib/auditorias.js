// ════════════════════════════════════════════════════════════════════════════
// AUDITORÍAS EXTERNAS · cuándo toca la siguiente
//
// Un certificado obliga a pasar auditoría externa cada año: las de
// seguimiento en los aniversarios de la certificación, y la de renovación al
// vencer la validez (normalmente a los tres años). Así que la PRÓXIMA se
// estima como el siguiente aniversario de la fecha de certificación —cada
// 365 días— que quede por delante, sin pasar de la fecha de validez.
//
// Si el proyecto tiene fecha de auditoría externa programada, manda esa: la
// estimación es para saber cuándo hay que tenerla programada, no para
// sustituirla.
//
// Semáforo (días hasta la fecha que mande):
//   rojo      30 días o menos, o ya pasada
//   ambar     90 días o menos (tres meses)
//   verde     más de 90 días
//   gris      sin certificado (no hay de dónde estimar) → «sin programar»
//
// Funciones puras: se prueban desde Node (scripts/test-auditorias.mjs).
// ════════════════════════════════════════════════════════════════════════════

export const DIAS_ROJO = 30;
export const DIAS_AMBAR = 90;
export const PERIODO_DIAS = 365;

const S = (v) => String(v ?? '');
const aFecha = (f) => {
  if (!f) return null;
  const d = new Date(`${S(f).slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};
export const aISO = (d) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null);
const sumarDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/** Días enteros desde `hoy` (ISO) hasta `fecha` (ISO). Negativo si ya pasó. */
export function diasHasta(fecha, hoy) {
  const a = aFecha(hoy), b = aFecha(fecha);
  if (!a || !b) return null;
  a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
}

/**
 * Próxima auditoría que exige un certificado, a partir de hoy.
 *
 * @returns {{fecha: string|null, tipo: 'seguimiento'|'renovacion'|'caducado'|null}}
 *   caducado: la validez ya pasó y no hay nada que estimar hacia delante.
 */
export function proximaAuditoriaDeCertificado(cert, hoy) {
  const h = aFecha(hoy);
  const cer = aFecha(cert?.fecha_certificacion);
  const val = aFecha(cert?.fecha_validez);
  if (!h) return { fecha: null, tipo: null };
  if (val && val < h) return { fecha: aISO(val), tipo: 'caducado' };
  if (!cer) {
    // Sin fecha de certificación solo se sabe cuándo vence: esa es la próxima.
    return val ? { fecha: aISO(val), tipo: 'renovacion' } : { fecha: null, tipo: null };
  }
  // Siguiente aniversario (cada 365 días) por delante de hoy.
  let f = sumarDias(cer, PERIODO_DIAS);
  while (f < h) f = sumarDias(f, PERIODO_DIAS);
  if (val && f >= val) return { fecha: aISO(val), tipo: 'renovacion' };
  return { fecha: aISO(f), tipo: 'seguimiento' };
}

export const semaforoDias = (dias) => (dias == null ? 'gris' : dias <= DIAS_ROJO ? 'rojo' : dias <= DIAS_AMBAR ? 'ambar' : 'verde');

/**
 * Estado de auditoría externa de un proyecto.
 *
 * @param proyecto      fila de proyectos_cliente (normas, fecha_auditoria_externa, cliente_id)
 * @param certificados  certificados del cliente (todas sus filas)
 * @param hoy           ISO
 */
export function estadoAuditoriaProyecto(proyecto, certificados = [], hoy) {
  const normas = (proyecto?.normas || []).map(S);
  const delProyecto = certificados.filter((c) => S(c.cliente_id) === S(proyecto?.cliente_id)
    && (!normas.length || normas.includes(S(c.norma)) || S(c.proyecto_id) === S(proyecto?.id)));

  // La estimación más exigente: el certificado cuya próxima auditoría cae antes.
  let estimada = null, certificado = null, tipo = null;
  for (const c of delProyecto) {
    const p = proximaAuditoriaDeCertificado(c, hoy);
    if (!p.fecha) continue;
    if (!estimada || p.fecha < estimada) { estimada = p.fecha; certificado = c; tipo = p.tipo; }
  }

  const programada = proyecto?.fecha_auditoria_externa ? S(proyecto.fecha_auditoria_externa).slice(0, 10) : null;
  const manda = programada || estimada;
  const dias = manda ? diasHasta(manda, hoy) : null;
  const color = tipo === 'caducado' ? 'rojo' : semaforoDias(dias);

  let texto;
  if (tipo === 'caducado') texto = `Certificado ${certificado?.norma || ''} caducado el ${fmt(estimada)}`.replace(/\s+/g, ' ');
  else if (programada) texto = dias < 0 ? `Auditoría programada el ${fmt(programada)}, ya pasada: registra el resultado` : `Auditoría externa el ${fmt(programada)} · ${dias} día${dias === 1 ? '' : 's'}`;
  else if (estimada) texto = `Sin programar · toca antes del ${fmt(estimada)} (${dias < 0 ? `${-dias} días de retraso` : `${dias} día${dias === 1 ? '' : 's'}`})`;
  else texto = 'Sin programar · sin certificado registrado';

  return {
    proyectoId: proyecto?.id, programada, estimada, tipo, certificado, dias, color, texto,
    sinProgramar: !programada,
    sinCertificado: !delProyecto.length,
  };
}

export const fmt = (iso) => (iso ? aFecha(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export const TONO = {
  rojo: { chip: 'bg-red-500/20 text-red-200 border-red-400/50', punto: '#EF4444', etq: 'Menos de 30 días' },
  ambar: { chip: 'bg-amber-400/20 text-amber-100 border-amber-300/50', punto: '#F5A623', etq: 'Menos de 3 meses' },
  verde: { chip: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40', punto: '#22C55E', etq: 'En plazo' },
  gris: { chip: 'bg-[#123F52] text-[#9FC0CB] border-[#1E5468]', punto: '#5E8494', etq: 'Sin datos' },
};
