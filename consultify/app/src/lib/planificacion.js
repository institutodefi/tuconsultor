// ════════════════════════════════════════════════════════════════════════════
// PLANIFICACIÓN POR FECHAS
//
// La oferta deja de pedir «meses» y pide dos fechas: cuándo empieza el proyecto
// y cuándo hay que estar certificado. Los meses salen de ahí.
//
// Es mejor dato: nadie sabe de memoria si su proyecto son ocho meses o diez,
// pero todo el mundo sabe cuándo tiene la auditoría o cuándo vence el pliego.
//
// Y de esas fechas salen dos reglas que hasta ahora se llevaban de cabeza:
//
//  1 · Con menos de 6 meses hasta la certificación NO se puede ofertar
//      Relación, Implicación ni Compromiso. Son modelos de acompañamiento con
//      dedicación mensual: no dan para implantar un sistema desde cero a
//      contrarreloj, y aceptarlo es comprometerse a algo que no se cumple.
//      Para esos plazos: Apoyo o Implantación.
//
//  2 · Los planes y las marcas de garantía solo caben en Apoyo o Implantación.
//      Un plan de igualdad se elabora, se negocia y se registra: no es un
//      sistema de gestión que se «mantenga» con una cuota mensual.
// ════════════════════════════════════════════════════════════════════════════

/** Modelos de acompañamiento recurrente. */
export const MODELOS_RECURRENTES = ['Relación', 'Implicación', 'Compromiso'];

/** Modelos que sirven para ejecutar un proyecto con fecha. */
export const MODELOS_PROYECTO = ['Apoyo', 'Implantación'];

/** Meses mínimos hasta la certificación para poder ofertar un recurrente. */
export const MESES_MINIMOS_RECURRENTE = 6;

/** Identificadores que no son sistemas de gestión certificables. */
const ES_PLAN_O_MARCA = (id) => /^(igualdad|diversidad)(-seg)?$/.test(String(id))
  || String(id) === 'madridexcelente';

const aFecha = (v) => {
  if (!v) return null;
  const d = new Date(`${String(v).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Meses enteros entre dos fechas, redondeando hacia arriba: un proyecto de
 *  7 meses y medio necesita 8 meses de planificación, no 7. */
export function mesesEntre(desde, hasta) {
  const a = aFecha(desde), b = aFecha(hasta);
  if (!a || !b) return null;
  if (b <= a) return 0;
  // Meses de CALENDARIO, no días entre 30,44. Con la media, «del 1 de enero al
  // 1 de julio» salían 7 meses en vez de 6 y un plazo de justo medio año
  // quedaba bloqueado sin motivo.
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;   // aún no ha llegado el día del mes
  return Math.max(0, m);
}

/** Fecha de hoy en formato de campo de fecha. */
export const hoyISO = () => new Date().toISOString().slice(0, 10);

/** Suma meses a una fecha, para proponer una de certificación razonable. */
export function sumarMeses(iso, meses) {
  const d = aFecha(iso) || new Date();
  const r = new Date(d);
  r.setMonth(r.getMonth() + meses);
  return r.toISOString().slice(0, 10);
}

/**
 * Comprueba si la combinación de fechas, modelo y sistemas se sostiene.
 *
 * Devuelve `errores` (impiden ofertar) y `avisos` (dejan seguir pero conviene
 * leerlos). La distinción importa: bloquear por todo acaba en gente buscando
 * cómo saltárselo.
 */
export function validarPlanificacion({ inicio, certificacion, modelo, normas = [] }) {
  const errores = [];
  const avisos = [];
  const meses = mesesEntre(inicio, certificacion);

  const fi = aFecha(inicio), fc = aFecha(certificacion);
  if (fi && fc && fc <= fi) {
    errores.push('La fecha de certificación tiene que ser posterior al inicio del proyecto.');
  }
  if (fi) {
    const hoy = aFecha(hoyISO());
    if (fi < hoy) avisos.push('La fecha de inicio ya ha pasado. ¿Es intencionado?');
  }

  const planes = normas.filter(ES_PLAN_O_MARCA);
  const sistemas = normas.filter((n) => !ES_PLAN_O_MARCA(n));

  // ── Regla 2 · planes y marcas solo en Apoyo o Implantación ──
  if (planes.length && !MODELOS_PROYECTO.includes(modelo)) {
    errores.push(
      `Un plan o una marca de garantía no se contrata en modelo ${modelo}: se elabora y se registra, ` +
      'no se mantiene con cuota mensual. Elige Apoyo o Implantación.',
    );
  }

  // ── Regla 1 · plazo mínimo para los recurrentes ──
  if (MODELOS_RECURRENTES.includes(modelo) && meses != null && meses < MESES_MINIMOS_RECURRENTE) {
    errores.push(
      `Quedan ${meses} ${meses === 1 ? 'mes' : 'meses'} hasta la certificación y el modelo ${modelo} ` +
      `necesita al menos ${MESES_MINIMOS_RECURRENTE}. Con ese plazo, el sistema no llega a la auditoría ` +
      'en condiciones. Para plazos cortos: Apoyo o Implantación.',
    );
  }

  // Avisos de plazo, sin bloquear.
  if (meses != null && MODELOS_PROYECTO.includes(modelo) && sistemas.length) {
    if (meses < 3) {
      avisos.push(`Solo ${meses} ${meses === 1 ? 'mes' : 'meses'} hasta la certificación: es un plazo muy exigente. Conviene avisar al cliente de que el calendario va justo.`);
    } else if (meses > 18) {
      avisos.push(`${meses} meses es un plazo largo para una implantación. ¿La fecha de certificación es correcta?`);
    }
  }
  if (meses != null && sistemas.length > 2 && meses < 9) {
    avisos.push(`${sistemas.length} sistemas en ${meses} meses. Implantar varios a la vez alarga el calendario más de lo que parece.`);
  }

  return { ok: errores.length === 0, errores, avisos, meses };
}

/** Modelos que se pueden elegir con estas fechas y sistemas. */
export function modelosPosibles({ inicio, certificacion, normas = [] }, todos) {
  return todos.filter((m) => validarPlanificacion({ inicio, certificacion, modelo: m, normas }).ok);
}

/** Por qué NO se puede elegir un modelo, en una frase corta para la interfaz. */
export function motivoNoDisponible({ inicio, certificacion, normas = [] }, modelo) {
  const v = validarPlanificacion({ inicio, certificacion, modelo, normas });
  return v.ok ? null : v.errores[0];
}
