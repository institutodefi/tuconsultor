// ═══════════════════════════════════════════════════════════════════════════
// Vencimiento de proyectos · semáforo y fechas
// ---------------------------------------------------------------------------
// Un contrato recurrente dura doce meses y termina. Si nadie mira el calendario,
// la oferta de renovación se emite tarde o no se emite: el cliente se queda sin
// cobertura y nosotros sin el año siguiente.
//
// La regla de negocio (acordada): la oferta de renovación se emite UN MES antes
// del fin de contrato. Por eso el semáforo avisa antes de esa fecha:
//   · 60 días → AMARILLO. Toca preparar la renovación: revisar el alcance,
//               mirar cómo ha ido el año, decidir si cambia la dedicación.
//   · 30 días → ROJO. Ya deberías haberla emitido. Es la fecha límite acordada.
//   · vencido → el contrato terminó y sigue abierto en el sistema.
//
// El mismo umbral está replicado en la vista SQL `v_proyectos_vencimiento`
// (migración v92). Si cambia aquí, cambia allí.
// ═══════════════════════════════════════════════════════════════════════════

export const DIAS_AVISO_AMARILLO = 60;
export const DIAS_AVISO_ROJO = 30;

/** Modelos con contrato recurrente de doce meses. */
export const MODELOS_RECURRENTES = ['Relación', 'Implicación', 'Compromiso'];

/** Estados que cuentan como proyecto vivo. */
export const ESTADOS_ACTIVOS = ['implantación', 'activo'];

/** Días naturales de hoy a `fecha`. Negativo si ya pasó. */
export function diasHasta(fecha) {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const f = new Date(fecha + 'T00:00:00');
  if (Number.isNaN(f.getTime())) return null;
  return Math.round((f - hoy) / 86400000);
}

/** Suma meses a una fecha ISO y devuelve ISO. Respeta fin de mes. */
export function sumarMeses(fechaISO, meses) {
  if (!fechaISO) return '';
  const d = new Date(fechaISO + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return '';
  const dia = d.getDate();
  d.setMonth(d.getMonth() + meses);
  // 31 de enero + 1 mes daría 3 de marzo: se corrige al último día del mes.
  if (d.getDate() < dia) d.setDate(0);
  return d.toISOString().slice(0, 10);
}

/**
 * Fecha de fin por defecto según el modelo. Es la misma regla que aplica el
 * trigger de la base, para que la pantalla enseñe lo que se va a guardar.
 */
export function fechaFinPorDefecto({ modelo, fecha_inicio, fecha_auditoria }) {
  if (!fecha_inicio) return '';
  if (modelo === 'Apoyo') return '';                       // bolsa: no vence
  if (modelo === 'Implantación') return fecha_auditoria || sumarMeses(fecha_inicio, 12);
  return sumarMeses(fecha_inicio, 12);                     // recurrentes
}

/**
 * Semáforo de un proyecto.
 * @returns {{nivel, dias, etiqueta, detalle, orden}} nivel:
 *   'vencido' | 'rojo' | 'amarillo' | 'ok' | 'sin_fecha'
 */
export function semaforo(p) {
  if (!p?.fecha_fin) {
    return { nivel: 'sin_fecha', dias: null, etiqueta: 'Sin fecha de fin',
             detalle: 'Añade la fecha de fin para activar el aviso de renovación.', orden: 3 };
  }
  const dias = diasHasta(p.fecha_fin);
  if (dias < 0) {
    return { nivel: 'vencido', dias, etiqueta: `Vencido hace ${Math.abs(dias)} d`,
             detalle: 'El contrato terminó y el proyecto sigue abierto. Renueva o ciérralo.', orden: 0 };
  }
  if (dias <= DIAS_AVISO_ROJO) {
    return { nivel: 'rojo', dias, etiqueta: `Vence en ${dias} d`,
             detalle: 'La oferta de renovación debería estar ya emitida.', orden: 1 };
  }
  if (dias <= DIAS_AVISO_AMARILLO) {
    return { nivel: 'amarillo', dias, etiqueta: `Vence en ${dias} d`,
             detalle: 'Toca preparar la renovación: revisa alcance y dedicación.', orden: 2 };
  }
  return { nivel: 'ok', dias, etiqueta: `Vence en ${dias} d`, detalle: '', orden: 4 };
}

/** Clases de color por nivel, para chips y bordes. */
export const TONO_SEMAFORO = {
  vencido:   { chip: 'bg-red-500/25 text-red-200 ring-1 ring-red-400/40',   borde: 'border-red-400/60',    punto: 'bg-red-400' },
  rojo:      { chip: 'bg-red-500/18 text-red-200',                          borde: 'border-red-400/45',    punto: 'bg-red-400' },
  amarillo:  { chip: 'bg-amber-400/18 text-amber-200',                      borde: 'border-amber-300/45',  punto: 'bg-amber-300' },
  ok:        { chip: 'bg-[#123F52] text-[#9FC0CB]',                         borde: 'border-[#1E5468]',     punto: 'bg-emerald-400' },
  sin_fecha: { chip: 'bg-[#0D3242] text-[#7FA7B4]',                         borde: 'border-[#1E5468]',     punto: 'bg-[#7FA7B4]' },
};

/** ¿Hay que avisar de renovación? Solo si no se ha emitido ya. */
export function necesitaRenovacion(p) {
  if (p?.renovacion_emitida) return false;
  const s = semaforo(p);
  return s.nivel === 'rojo' || s.nivel === 'amarillo' || s.nivel === 'vencido';
}

/** Proyectos vivos, ordenados por urgencia y luego por fecha de fin. */
export function ordenarPorUrgencia(proyectos = []) {
  return [...proyectos]
    .filter((p) => ESTADOS_ACTIVOS.includes(p.estado))
    .sort((a, b) => {
      const sa = semaforo(a), sb = semaforo(b);
      if (sa.orden !== sb.orden) return sa.orden - sb.orden;
      return String(a.fecha_fin || '9999').localeCompare(String(b.fecha_fin || '9999'));
    });
}

/** Recuento por nivel, para las tarjetas del dashboard. */
export function resumen(proyectos = []) {
  const r = { total: 0, vencido: 0, rojo: 0, amarillo: 0, ok: 0, sin_fecha: 0, renovacionesPendientes: 0 };
  for (const p of proyectos) {
    if (!ESTADOS_ACTIVOS.includes(p.estado)) continue;
    r.total += 1;
    r[semaforo(p).nivel] += 1;
    if (necesitaRenovacion(p)) r.renovacionesPendientes += 1;
  }
  return r;
}

/** dd/mm/aaaa, o guion si no hay fecha. */
export function fmtFecha(f) {
  if (!f) return '—';
  const d = new Date(f + 'T12:00:00');
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-ES');
}
