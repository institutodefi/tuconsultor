import { supabase, DEMO } from './supabase.js';

// ════════════════════════════════════════════════════════════════════════════
// REGISTRO DE ACCESOS
//
// Deja rastro de quién entra y qué toca. Es requisito del ENS (op.exp.8) y de
// la ISO 27001 (A.8.15), así que conviene tenerlo en casa antes de venderlo.
//
// Dos reglas de diseño:
//   · NUNCA rompe la acción principal. Si el registro falla, se traga el error:
//     que no se pueda anotar una entrada no puede impedir entrar.
//   · No guarda datos que no hacen falta. Sin IP —el navegador no la conoce y
//     pedirla a un tercero sería ceder datos—, sin contenido de los registros,
//     solo qué se hizo y sobre qué.
// ════════════════════════════════════════════════════════════════════════════

const ACCIONES = ['entrada', 'salida', 'entrada_fallida', 'crear', 'editar', 'borrar', 'exportar', 'ver'];

/** Navegador, recortado: sirve para distinguir dispositivos, no para perfilar. */
function agente() {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  return ua.slice(0, 180);
}

/**
 * Anota una línea en el registro.
 * @param {string} accion  una de ACCIONES
 * @param {object} datos   { entidad, entidad_id, detalle, email, perfil_id }
 */
export async function registrar(accion, datos = {}) {
  if (DEMO || !supabase) return;
  if (!ACCIONES.includes(accion)) return;
  try {
    let perfilId = datos.perfil_id;
    let email = datos.email;
    if (perfilId === undefined || email === undefined) {
      const { data } = await supabase.auth.getSession();
      const u = data?.session?.user;
      if (perfilId === undefined) perfilId = u?.id || null;
      if (email === undefined) email = u?.email || null;
    }
    await supabase.from('registro_accesos').insert({
      perfil_id: perfilId || null,
      email: email || null,
      accion,
      entidad: datos.entidad || null,
      entidad_id: datos.entidad_id ? String(datos.entidad_id) : null,
      detalle: datos.detalle || null,
      agente: agente(),
    });
  } catch (e) {
    // Silencio intencionado: el registro nunca debe tumbar la operación.
  }
}

/** Etiquetas legibles de cada acción. */
export const ACCION_LABEL = {
  entrada: 'Entrada',
  salida: 'Salida',
  entrada_fallida: 'Entrada fallida',
  crear: 'Alta',
  editar: 'Modificación',
  borrar: 'Baja',
  exportar: 'Exportación',
  ver: 'Consulta',
};

export const ACCION_TONO = {
  entrada: 'bg-emerald-500/15 text-emerald-300',
  salida: 'bg-white/8 text-[#9FC0CB]',
  entrada_fallida: 'bg-red-500/15 text-red-300',
  crear: 'bg-brand-verde/15 text-brand-verdeTexto',
  editar: 'bg-brand-orange/15 text-brand-orange',
  borrar: 'bg-red-500/15 text-red-300',
  exportar: 'bg-sky-400/15 text-sky-300',
  ver: 'bg-white/8 text-[#9FC0CB]',
};
