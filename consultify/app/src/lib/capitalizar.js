// ════════════════════════════════════════════════════════════════════════════
// MAYÚSCULAS Y MINÚSCULAS · cómo se escriben los nombres en la base (v137)
//
// Holded manda las razones sociales en mayúsculas, la calculadora deja lo que
// teclea quien pide la oferta («rafa», «NOMBRE DE LA EMPRESA») y a mano cada
// uno escribe como le sale. Aquí se decide una forma y se aplica siempre:
//   · Un texto escrito TODO en mayúsculas o todo en minúsculas se pasa a
//     «Nombre Propio». Si viene mezclado se respeta: alguien lo escribió así.
//   · Formas jurídicas (SL, S.A., SLU, SLL…) y siglas (CECE, HUFA, CNSE, BC)
//     siguen en mayúsculas. Sigla = palabra sin vocales, de dos letras, o de
//     la lista de conocidas.
//   · Partículas (de, del, la, y, para…) en minúscula salvo al principio.
//   · Las tildes que se pierden al escribir en mayúsculas se recuperan para
//     las palabras más habituales (Fundación, Formación, Málaga, García…).
//   · Correos en minúsculas; CIF y VAT en mayúsculas.
// La misma función vale para razones sociales, personas, cargos y direcciones.
// ════════════════════════════════════════════════════════════════════════════

const S = (v) => String(v ?? '');

export const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'al', 'y', 'e', 'o', 'u', 'a', 'en', 'con', 'sin', 'por', 'para', 'sobre', 'entre', 'da', 'do', 'das', 'dos', 'des', 'di', 'du', 'van', 'von', 'le', 'les', 'der', 'the', 'of', 'and', 'i', 'els', 'ses']);

// Formas jurídicas, con o sin puntos, con punto final o sin él.
const FORMA_JURIDICA = /^(s\.?l\.?(u|l|p|n\.?e)?|s\.?a\.?(u|t|s)?|s\.?c\.?(p|a)?|s\.?coop(\.| |$).*|s\.?r\.?l\.?|a\.?i\.?e|u\.?t\.?e|c\.?b|s\.?l\.?l|ltd|llc|gmbh|inc|plc|b\.?v|s\.?p\.?a|s\.?a\.?s|ag|sl|sa|slu|sll|sau)\.?$/i;

export const SIGLAS = new Set(['cece', 'cnse', 'huf', 'hut', 'hufa', 'huic', 'hujg', 'alef', 'cip', 'adf', 'evm', 'ainia', 'isabial', 'fgupm', 'fue', 'ceg', 'apramp', 'iee', 'upm', 'uned', 'ucm', 'uam', 'urjc', 'uc3m', 'iso', 'une', 'efqm', 'ong', 'tic', 'ceip', 'ies', 'cra', 'usa', 'uk', 'eu', 'ue', 'once', 'sepe', 'inem', 'aenor', 'enac', 'fp', 'pyme', 'pymes', 'ceo', 'cfo', 'coo', 'cto', 'cio', 'rrhh', 'sig', 'it', 'ti', 'idi', 'ute', 'aie', 'ave', 'renfe', 'adif', 'aemet', 'csic', 'isciii', 'dgt', 'sas', 'sms', 'sermas', 'sergas', 'osakidetza', 'ico', 'bbva', 'ibm', 'sap', 'erp', 'crm', 'ocde', 'onu', 'otan', 'ceoe', 'cepyme', 'ugt', 'ccoo', 'ampa', 'afa', 'apa', 'oti', 'rtve', 'ute']);

// Palabras habituales que pierden la tilde al escribirse en mayúsculas.
const TILDES = ['Fundación', 'Asociación', 'Federación', 'Confederación', 'Formación', 'Gestión', 'Innovación', 'Comunicación', 'Investigación', 'Distribución', 'Tasación', 'Atención', 'Prevención', 'Reinserción', 'Promoción', 'Educación', 'Protección', 'Producción', 'Construcción', 'Instalación', 'Administración', 'Organización', 'Certificación', 'Consultoría', 'Auditoría', 'Ingeniería', 'Asesoría', 'Tutorías', 'Tutoría', 'Energía', 'Tecnología', 'Tecnologías', 'Tecnológica', 'Tecnológico', 'Politécnica', 'Politécnico', 'Autónomo', 'Autónoma', 'Térmicos', 'Térmica', 'Informática', 'Informático', 'Pública', 'Público', 'Técnico', 'Técnica', 'Pedagógico', 'Pedagógica', 'Económica', 'Económico', 'Eléctrica', 'Eléctrico', 'Mecánica', 'Mecánico', 'Química', 'Químico', 'Farmacéutica', 'Farmacéutico', 'Logística', 'Médica', 'Médico', 'Clínica', 'Clínico', 'Compañía', 'Vía', 'Jardín', 'Polígono', 'Avenida', 'Número', 'Área', 'Ámbito', 'Académica', 'Académico', 'Análisis', 'Diseño', 'Máquinas', 'Óptica', 'Química',
  'Génova', 'Málaga', 'Alcorcón', 'Leganés', 'Móstoles', 'Cádiz', 'Córdoba', 'Ávila', 'León', 'Castellón', 'Almería', 'Jaén', 'Gijón', 'Mérida', 'Alcalá', 'Torrejón', 'Aragón', 'Cataluña', 'Alicante', 'Alacant', 'Guía', 'Sebastián', 'Padrón', 'Marqués', 'Ensenada', 'Alcobendas', 'Pozuelo', 'Alarcón', 'Alcalá', 'Sanlúcar', 'Logroño', 'Bárbara', 'Cáceres', 'Asturias', 'Andalucía', 'Canarias', 'Coruña', 'Ourense', 'Vic', 'Tarragona', 'Girona', 'Lleida', 'Sabadell', 'Barberà', 'Terrassa', 'Mataró', 'Badalona', 'Cornellà', 'Vitoria', 'Vizcaya', 'Guipúzcoa', 'Álava', 'Rioja', 'Ávila', 'Perú', 'México', 'Panamá', 'Bogotá', 'Turquía', 'Hungría', 'Rumanía', 'Bélgica', 'Canadá', 'Japón', 'Túnez', 'Líbano', 'Irán', 'Mondéjar', 'Alcázar', 'Almansa', 'Aragón', 'Ávila', 'Sao', 'Amazonas', 'Ramón', 'Simón', 'Ángel', 'Ángela', 'Andrés', 'Jesús', 'Rubén', 'Óscar', 'Inés', 'Belén', 'Sofía', 'Lucía', 'María', 'Víctor', 'Adrián', 'César', 'Raúl', 'Joaquín', 'Agustín', 'Martín', 'Félix', 'Fátima', 'Mónica', 'Verónica', 'Hernán', 'José', 'Julián', 'Tomás', 'Nicolás', 'Sebastián', 'Germán', 'Ismael', 'Iván', 'Rocío', 'Noelia', 'Elías', 'Matías', 'Darío', 'Ainhoa', 'Aarón',
  'García', 'Rodríguez', 'Martínez', 'Fernández', 'López', 'González', 'Pérez', 'Sánchez', 'Gómez', 'Jiménez', 'Hernández', 'Álvarez', 'Domínguez', 'Vázquez', 'Gutiérrez', 'Ramírez', 'Suárez', 'Núñez', 'Ibáñez', 'Benítez', 'Galán', 'Millán', 'Díaz', 'Méndez', 'Márquez', 'Muñoz', 'Estévez', 'Yáñez', 'Sáez', 'Sáenz', 'Bermúdez', 'Cortés', 'Guzmán', 'Román', 'Beltrán', 'Durán', 'Terán', 'Chávez', 'Ordóñez', 'Vélez', 'Téllez', 'Peláez', 'Gálvez', 'Narváez', 'Enríquez', 'Valdés', 'Solís', 'Cañete', 'Piñeiro', 'Muñiz', 'Expósito', 'Trías'];
const quitarTildes = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const TILDE_POR_CLAVE = new Map(TILDES.map((p) => [quitarTildes(p).toLowerCase(), p]));

const ABREVIATURAS = new Set(['av', 'avda', 'iz', 'izq', 'izda', 'dcha', 'dr', 'dra', 'pl', 'pza', 'ctra', 'urb', 'esc', 'bl', 'blq', 'pta', 'loc', 'km', 'num', 'apdo', 'ed', 'edif', 'pol', 'cl', 'pº', 'nº', 'sr', 'sra', 'srta', 'lic', 'ing', 'prof']);

const tieneVocal = (p) => /[aeiouáéíóúü]/i.test(p);
const esRomano = (p) => /^x{0,3}(ix|iv|v?i{0,3})$/i.test(p) && p.length >= 2;   // II … XXXIX («Alfonso XII», «Juan XXIII»)

// Una palabra en mayúsculas → cómo debe quedar (sin las partículas: eso se
// decide fuera porque depende de la posición).
function palabra(p, { esInicio }) {
  if (!p) return p;
  if (/\d/.test(p)) return p.toUpperCase();                                    // «3ª», «9», «I+D+I», «S/N»
  const baja = p.toLowerCase();
  if (FORMA_JURIDICA.test(p)) return p.toUpperCase();
  if (PARTICULAS.has(baja)) return esInicio ? baja.charAt(0).toUpperCase() + baja.slice(1) : baja;
  if (SIGLAS.has(baja.replace(/\.$/, ''))) return p.toUpperCase();
  if (/[&+]/.test(p)) return p.toUpperCase();                                    // M&E, I+D+I
  if (ABREVIATURAS.has(baja)) return baja.charAt(0).toUpperCase() + baja.slice(1);
  if (!tieneVocal(p)) return p.toUpperCase();                                    // BC, CNSE, HUJG, S/N
  if (esRomano(p) && !esInicio) return p.toUpperCase();
  if (p.length <= 2) return p.toUpperCase();                                     // IF, RM, BS
  const conTilde = TILDE_POR_CLAVE.get(quitarTildes(baja));
  if (conTilde) return conTilde;
  // -ción / -sión: la tilde se pierde en mayúsculas y la regla es general.
  const base = baja.length > 5 && !/[áéíóú]/.test(baja) ? baja.replace(/([cs])ion$/, '$1ión') : baja;
  // O'Donnell, D'Angelo
  return base.charAt(0).toUpperCase() + base.slice(1).replace(/'(\p{L})(?=\p{L})/gu, (m, l) => `'${l.toUpperCase()}`);
}

/**
 * «ACADEMIA AXON S.L.» → «Academia Axon S.L.», «rafa galobi» → «Rafa Galobi».
 * Un texto ya mezclado («Fundación CNSE», «BCD M&E») se devuelve tal cual,
 * solo recortado: quien lo escribió así sabía lo que hacía.
 */
export function capitalizar(texto) {
  const t = S(texto).trim().replace(/\s+/g, ' ');
  if (!t) return t;
  const letras = t.replace(/[^\p{L}]/gu, '');
  if (!letras) return t;
  const todoMayus = letras === letras.toUpperCase();
  const todoMinus = letras === letras.toLowerCase();
  if (!todoMayus && !todoMinus) return t;
  let primera = true;
  // Se capitaliza cada tramo de letras; separadores («-», «/», «(», «.», «,»…) se conservan.
  return t.replace(/[\p{L}\p{N}ªº&+']+/gu, (tramo) => {
    const r = palabra(tramo, { esInicio: primera });
    primera = false;
    return r;
  });
}

/** Un nombre de persona: lo mismo, pero una palabra suelta de ≤2 letras («Jo») no se toma por sigla. */
export const capitalizarPersona = (t) => capitalizar(t);

/** Nombre comercial o marca: solo se toca si son varias palabras en mayúsculas («GRUPO COREMSA»); «AXON» o «CECE» se quedan. */
export function capitalizarMarca(texto) {
  const t = S(texto).trim().replace(/\s+/g, ' ');
  if (!t) return t;
  if (!/\s/.test(t) && t === t.toUpperCase()) return t;
  return capitalizar(t);
}

export const emailLimpio = (v) => S(v).trim().toLowerCase() || null;
export const cifLimpio = (v) => S(v).trim().toUpperCase().replace(/[\s.\-]/g, '') || null;
export const vatLimpio = (v) => S(v).trim().toUpperCase().replace(/\s/g, '') || null;

// ── Qué campo de cada tabla se limpia con qué regla ──
const REGLAS = {
  empresas: { nombre: capitalizar, nombre_comercial: capitalizarMarca, direccion: capitalizar, poblacion: capitalizar, provincia: capitalizar, email: emailLimpio, cif: cifLimpio, vat_id: vatLimpio },
  contactos: { nombre: capitalizarPersona, apellidos: capitalizarPersona, cargo: capitalizar, email: emailLimpio },
  clientes: { empresa: capitalizar, nombre_comercial: capitalizarMarca, contacto: capitalizarPersona, contacto_apellidos: capitalizarPersona, representante: capitalizarPersona, direccion: capitalizar, poblacion: capitalizar, provincia: capitalizar, email: emailLimpio, cif: cifLimpio, vat_id: vatLimpio },
  presupuestos: { empresa: capitalizar, nombre: capitalizarPersona, contacto_nombre: capitalizarPersona, contacto_apellidos: capitalizarPersona, cargo: capitalizar, email: emailLimpio, cif: cifLimpio },
  perfiles: { nombre: capitalizarPersona, apellidos: capitalizarPersona, email: emailLimpio },
};
export const TABLAS_LIMPIAS = Object.keys(REGLAS);

/** Aplica las reglas de la tabla a los campos presentes en la fila (los ausentes no se tocan). */
export function limpiarFila(tabla, fila) {
  const reglas = REGLAS[tabla];
  if (!reglas || !fila) return fila;
  const out = { ...fila };
  for (const [campo, fn] of Object.entries(reglas)) {
    if (!(campo in out) || out[campo] == null || typeof out[campo] !== 'string') continue;
    const v = fn(out[campo]);
    out[campo] = v === '' ? null : v;
  }
  return out;
}

/** Qué cambiaría en una fila: [campo, antes, después] solo de los que cambian. */
export function cambiosFila(tabla, fila) {
  const nueva = limpiarFila(tabla, fila);
  return Object.keys(REGLAS[tabla] || {}).filter((k) => fila[k] != null && nueva[k] !== fila[k]).map((k) => [k, fila[k], nueva[k]]);
}
