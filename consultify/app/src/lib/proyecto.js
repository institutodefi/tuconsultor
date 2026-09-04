// ════════════════════════════════════════════════════════════════════════════
// CARACTERÍSTICAS DEL PROYECTO
//
// Tres atributos que describen el encargo y sobre los que pueden condicionarse
// las reglas comerciales:
//
//   1 · Complejidad      alta / media / baja
//   2 · Equipo consultor estimado, con un tope de 3 personas
//   3 · Sedes o alcances
//
// Ninguno cambia el precio por su cuenta: son CONDICIONES. Si quieres que la
// complejidad alta encarezca un 20 %, se crea una regla comercial que lo diga.
// Así el criterio queda escrito, con fecha y responsable, en vez de escondido
// en una fórmula.
//
// La única excepción es el equipo: si se indica su composición, la tarifa deja
// de ser la del nivel de la norma y pasa a ser la media ponderada del equipo
// real. Eso no es una decisión comercial, es aritmética de coste.
// ════════════════════════════════════════════════════════════════════════════

export const COMPLEJIDADES = [
  { k: 'baja',  label: 'Baja',  ayuda: 'Un solo centro, procesos sencillos, documentación existente y al día.' },
  { k: 'media', label: 'Media', ayuda: 'Varias áreas implicadas, algo de documentación previa, sector sin exigencias singulares.' },
  { k: 'alta',  label: 'Alta',  ayuda: 'Sector regulado, varias sedes o turnos, sin sistema previo, o con exigencias de cliente o de licitación.' },
];
export const COMPLEJIDAD = Object.fromEntries(COMPLEJIDADES.map((c) => [c.k, c]));

// Perfiles del equipo. El orden es de mayor a menor tarifa.
export const PERFILES = [
  { k: 'Senior', label: 'Senior', tarifa: 75 },
  { k: 'J3',     label: 'J3',     tarifa: 55 },
  { k: 'J2',     label: 'J2',     tarifa: 40 },
  { k: 'J1',     label: 'J1',     tarifa: 30 },
];
export const PERFIL = Object.fromEntries(PERFILES.map((p) => [p.k, p]));

/** Tope de personas del equipo estimado. */
export const MAX_EQUIPO = 3;

export const EQUIPO_VACIO = () => ({ Senior: 0, J3: 0, J2: 0, J1: 0 });

/** Personas totales del equipo. */
export const totalEquipo = (eq) => PERFILES.reduce((a, p) => a + (Number(eq?.[p.k]) || 0), 0);

/** ¿Cabe una persona más? */
export const cabeMas = (eq) => totalEquipo(eq) < MAX_EQUIPO;

/** Perfiles presentes, para condicionar reglas. */
export const perfilesDe = (eq) => PERFILES.filter((p) => (Number(eq?.[p.k]) || 0) > 0).map((p) => p.k);

/**
 * Tarifa media ponderada del equipo. Devuelve null si no hay equipo definido,
 * y entonces el motor sigue usando la tarifa del nivel de cada norma.
 */
export function tarifaEquipo(eq) {
  const n = totalEquipo(eq);
  if (!n) return null;
  const coste = PERFILES.reduce((a, p) => a + (Number(eq[p.k]) || 0) * p.tarifa, 0);
  return Math.round((coste / n) * 100) / 100;
}

/** Descripción legible del equipo, para la oferta y para la traza. */
export function describirEquipo(eq) {
  const partes = PERFILES
    .filter((p) => (Number(eq?.[p.k]) || 0) > 0)
    .map((p) => `${eq[p.k]} ${p.label}${eq[p.k] > 1 ? 's' : ''}`);
  if (!partes.length) return 'sin definir';
  return `${partes.join(' + ')} · ${tarifaEquipo(eq)} €/h de media`;
}

/** Validación del equipo. Devuelve array de errores (vacío = correcto). */
export function validarEquipo(eq) {
  const e = [];
  const n = totalEquipo(eq);
  if (n > MAX_EQUIPO) e.push(`El equipo estimado no puede pasar de ${MAX_EQUIPO} personas (ahora hay ${n}).`);
  for (const p of PERFILES) {
    const v = Number(eq?.[p.k]) || 0;
    if (v < 0 || !Number.isInteger(v)) e.push(`El número de ${p.label} tiene que ser un entero positivo.`);
  }
  return e;
}

/** Sedes: siempre al menos una. */
export const normalizarSedes = (n) => Math.max(1, parseInt(n, 10) || 1);
