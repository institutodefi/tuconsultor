// ════════════════════════════════════════════════════════════════════════════
// LAS FECHAS DE UN PROYECTO SALEN DE SU OFERTA
//
// Inicio, duración y fecha límite no se teclean: se derivan de lo que se
// ofertó y se firmó. Tecleadas a mano acaban sin coincidir con el contrato, y
// entonces el calendario del equipo trabaja contra unas fechas y el cliente
// espera otras.
//
//   inicio        de la oferta (`fecha_inicio`), o del contrato si el proyecto
//                 nació por esa vía
//   certificación de la oferta (`fecha_certificacion`): la auditoría externa
//   límite        certificación − 15 días. Es la fecha real de trabajo: llegar
//                 el mismo día de la auditoría con las tareas a medias no vale,
//                 hace falta margen para cerrar hallazgos y preparar evidencias
//   duración      del inicio a la certificación, en meses
// ════════════════════════════════════════════════════════════════════════════

/** Días de margen entre el fin del trabajo y la auditoría externa. */
export const DIAS_ANTES_CERTIFICACION = 15;

const aFecha = (f) => {
  if (!f) return null;
  const d = new Date(`${String(f).slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const aISO = (d) => d
  ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  : null;

/** Resta días a una fecha ISO. Formatea en local: `toISOString` retrocede un día en España. */
export function restarDias(iso, dias) {
  const d = aFecha(iso);
  if (!d) return null;
  d.setDate(d.getDate() - dias);
  return aISO(d);
}

/** Meses de calendario entre dos fechas, redondeando hacia arriba. */
export function mesesEntre(desde, hasta) {
  const a = aFecha(desde), b = aFecha(hasta);
  if (!a || !b || b <= a) return null;
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() > a.getDate()) m += 1;      // parte del mes empezado cuenta
  return Math.max(1, m);
}

/**
 * Las fechas efectivas de un proyecto.
 *
 * @param {object} proyecto
 * @param {object} [oferta]   la oferta de la que nace
 * @param {object} [contrato] su contrato, si lo tiene
 * @param {number} [mesesModelo] duración mínima del modelo, para cuando no hay
 *                               fecha de certificación
 */
export function fechasDeProyecto(proyecto, oferta, contrato, mesesModelo = 12) {
  // El contrato manda sobre la oferta cuando existe: es lo firmado.
  const inicio = contrato?.fecha_inicio || oferta?.fecha_inicio || proyecto?.fecha_inicio || null;
  const certificacion = oferta?.fecha_certificacion || proyecto?.fecha_certificacion || null;
  const fin = contrato?.fecha_fin || oferta?.fecha_fin || proyecto?.fecha_fin || null;

  // La fecha límite de trabajo: quince días antes de la auditoría.
  const limite = certificacion
    ? restarDias(certificacion, DIAS_ANTES_CERTIFICACION)
    : (proyecto?.fecha_limite || null);

  // Duración: del inicio a la certificación. Sin certificación, la del modelo.
  const meses = (inicio && certificacion)
    ? mesesEntre(inicio, certificacion)
    : (proyecto?.meses_estimados || mesesModelo);

  return {
    inicio, certificacion, fin, limite, meses,
    // De dónde sale cada una, para poder decirlo en pantalla y no dejar al
    // usuario adivinando por qué un campo no se deja tocar.
    origen: {
      inicio: contrato?.fecha_inicio ? 'contrato' : oferta?.fecha_inicio ? 'oferta' : 'proyecto',
      certificacion: oferta?.fecha_certificacion ? 'oferta' : 'proyecto',
      limite: certificacion ? 'calculada' : 'proyecto',
      meses: (inicio && certificacion) ? 'calculada' : 'modelo',
    },
    // Lo que hay que guardar en `proyectos_cliente` para que el resto de la
    // aplicación —agenda, avisos, semáforos— lea lo mismo.
    patch: {
      fecha_inicio: inicio,
      fecha_fin: fin,
      fecha_limite: limite,
      meses_estimados: meses,
    },
  };
}

/** ¿Difiere lo guardado en el proyecto de lo que dicen oferta y contrato? */
export function hayDesfase(proyecto, calculadas) {
  const campos = ['fecha_inicio', 'fecha_fin', 'fecha_limite', 'meses_estimados'];
  return campos.filter((c) => {
    const a = calculadas.patch[c];
    const b = proyecto?.[c];
    if (a == null) return false;                       // sin dato nuevo, nada que corregir
    if (c === 'meses_estimados') return Number(a) !== Number(b);
    return String(a).slice(0, 10) !== String(b || '').slice(0, 10);
  });
}
