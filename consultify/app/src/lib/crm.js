// ════════════════════════════════════════════════════════════════════════════
// CRM · reglas de negocio compartidas (Empresas ↔ Contactos)
//
// Regla dura del modelo: ni empresa sin contacto, ni contacto sin empresa.
// No se puede forzar por clave ajena (la relación es N:M), así que se permite
// guardar y se marca con SEMÁFORO ROJO hasta que se complete.
// ════════════════════════════════════════════════════════════════════════════

/** Los tres roles nombrados de la ficha. El resto van al bloque de secundarios. */
export const ROLES_CONTACTO = [
  { k: 'directivo',   label: 'Contacto directivo principal', corto: 'Directivo',   icono: '★' },
  { k: 'facturacion', label: 'Contacto de facturación',      corto: 'Facturación', icono: '€' },
  { k: 'proyecto',    label: 'Contacto de proyecto',         corto: 'Proyecto',    icono: '◆' },
];
export const ROL_LABEL = Object.fromEntries(
  [...ROLES_CONTACTO.map((r) => [r.k, r.label]), ['secundario', 'Contacto secundario']],
);

export const ESTADOS_COMERCIALES = [
  { k: 'potencial', label: 'Potencial' },
  { k: 'activo',    label: 'Activo' },
  { k: 'inactivo',  label: 'Inactivo' },
  { k: 'perdido',   label: 'Perdido' },
];

export const ESTADOS_HOMOLOGACION = [
  { k: 'pendiente', label: 'Pendiente',  tono: 'ambar' },
  { k: 'aportado',  label: 'Aportado',   tono: 'azul' },
  { k: 'validado',  label: 'Validado',   tono: 'verde' },
  { k: 'caducado',  label: 'Caducado',   tono: 'rojo' },
  { k: 'no_aplica', label: 'No aplica',  tono: 'gris' },
];

// ── Email ───────────────────────────────────────────────────────────────────
export const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());

// ── NIF · CIF · NIE ─────────────────────────────────────────────────────────
export const normalizarCif = (s) => String(s || '').toUpperCase().replace(/[\s\-.]/g, '');

// ── Identificadores fiscales de la UE ──────────────────────────────────────
// El prefijo de país NO se quita: en una empresa portuguesa o francesa forma
// parte del identificador y tirarlo lo deja inservible. En una española es
// opcional —«B84867670» y «ESB84867670» son la misma empresa—, así que se
// acepta con prefijo y sin él, pero se valida el dígito de control español.
//
// Del resto de países se comprueba el FORMATO, no el dígito de control: cada
// uno tiene su algoritmo y fingir que se validan sería peor que no hacerlo,
// porque daría por bueno lo que no se ha comprobado.
const FORMATO_VAT = {
  AT: /^U\d{8}$/,           BE: /^0\d{9}$/,        BG: /^\d{9,10}$/,
  CY: /^\d{8}[A-Z]$/,       CZ: /^\d{8,10}$/,      DE: /^\d{9}$/,
  DK: /^\d{8}$/,            EE: /^\d{9}$/,         EL: /^\d{9}$/,
  FI: /^\d{8}$/,            FR: /^[A-Z0-9]{2}\d{9}$/, HR: /^\d{11}$/,
  HU: /^\d{8}$/,            IE: /^[\dA-Z+*]{8,9}$/, IT: /^\d{11}$/,
  LT: /^(\d{9}|\d{12})$/,   LU: /^\d{8}$/,         LV: /^\d{11}$/,
  MT: /^\d{8}$/,            NL: /^\d{9}B\d{2}$/,   PL: /^\d{10}$/,
  PT: /^\d{9}$/,            RO: /^\d{2,10}$/,      SE: /^\d{12}$/,
  SI: /^\d{8}$/,            SK: /^\d{10}$/,
  // Fuera de la UE, los más habituales aquí.
  GB: /^(\d{9}|\d{12}|(GD|HA)\d{3})$/, CH: /^E\d{9}$/, NO: /^\d{9}(MVA)?$/,
};

export const PAISES_VAT = Object.keys(FORMATO_VAT).concat('ES').sort();

/** Nombre del país a partir del prefijo, para poder decirlo en pantalla. */
export const PAIS_DE = {
  AT: 'Austria', BE: 'Bélgica', BG: 'Bulgaria', CY: 'Chipre', CZ: 'Chequia',
  DE: 'Alemania', DK: 'Dinamarca', EE: 'Estonia', EL: 'Grecia', ES: 'España',
  FI: 'Finlandia', FR: 'Francia', HR: 'Croacia', HU: 'Hungría', IE: 'Irlanda',
  IT: 'Italia', LT: 'Lituania', LU: 'Luxemburgo', LV: 'Letonia', MT: 'Malta',
  NL: 'Países Bajos', PL: 'Polonia', PT: 'Portugal', RO: 'Rumanía',
  SE: 'Suecia', SI: 'Eslovenia', SK: 'Eslovaquia',
  GB: 'Reino Unido', CH: 'Suiza', NO: 'Noruega',
};

/**
 * Valida un identificador fiscal español y devuelve
 * { valido, tipo, mensaje }. Replica el aviso «CIF correcto» de Holded.
 */
export function validarCif(entrada) {
  const v = normalizarCif(entrada);
  if (!v) return { valido: null, tipo: null, mensaje: '' };

  // ── Con prefijo de país ──
  const m = /^([A-Z]{2})([A-Z0-9]+)$/.exec(v);
  if (m && (m[1] === 'ES' || FORMATO_VAT[m[1]])) {
    const [, pais, resto] = m;

    if (pais === 'ES') {
      // Española con prefijo: se valida el CIF de verdad, dígito incluido.
      const r = validarCif(resto);
      return { ...r, tipo: r.tipo ? `${r.tipo} · VAT ES` : 'VAT ES', pais: 'ES',
               mensaje: r.valido ? `${r.mensaje} (con prefijo ES)` : r.mensaje };
    }

    const ok = FORMATO_VAT[pais].test(resto);
    return {
      valido: ok, tipo: `VAT ${pais}`, pais,
      // Se dice claramente que NO se ha comprobado el dígito: dar por bueno lo
      // que no se ha validado es peor que avisar.
      mensaje: ok
        ? `Formato correcto de ${PAIS_DE[pais] || pais}. El dígito de control no se comprueba aquí: verifícalo en VIES.`
        : `No encaja con el formato de ${PAIS_DE[pais] || pais}.`,
    };
  }

  if (!/^[A-Z0-9]{9}$/.test(v)) return { valido: false, tipo: null, mensaje: 'Debe tener 9 caracteres' };

  const LETRAS_NIF = 'TRWAGMYFPDXBNJZSQVHLCKE';

  // NIF de persona física: 8 dígitos + letra de control
  if (/^\d{8}[A-Z]$/.test(v)) {
    const ok = LETRAS_NIF[Number(v.slice(0, 8)) % 23] === v[8];
    return { valido: ok, tipo: 'NIF', mensaje: ok ? 'NIF correcto' : 'La letra de control no cuadra' };
  }

  // NIE: X/Y/Z + 7 dígitos + letra
  if (/^[XYZ]\d{7}[A-Z]$/.test(v)) {
    const num = String('XYZ'.indexOf(v[0])) + v.slice(1, 8);
    const ok = LETRAS_NIF[Number(num) % 23] === v[8];
    return { valido: ok, tipo: 'NIE', mensaje: ok ? 'NIE correcto' : 'La letra de control no cuadra' };
  }

  // CIF de persona jurídica: letra + 7 dígitos + control (dígito o letra)
  if (/^[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J]$/.test(v)) {
    const inicial = v[0];
    const cuerpo = v.slice(1, 8);
    let suma = 0;
    for (let i = 0; i < 7; i++) {
      const d = Number(cuerpo[i]);
      if (i % 2 === 0) {                 // posiciones impares (1.ª, 3.ª…): se duplican
        const doble = d * 2;
        suma += doble > 9 ? doble - 9 : doble;
      } else suma += d;
    }
    const resto = suma % 10;
    const digito = resto === 0 ? 0 : 10 - resto;
    const letra = 'JABCDEFGHI'[digito];
    const control = v[8];

    // Entidades que SIEMPRE llevan letra de control / siempre dígito / ambas
    const soloLetra = 'KPQRSNW'.includes(inicial);
    const soloDigito = 'ABEH'.includes(inicial);
    const ok = soloLetra ? control === letra
             : soloDigito ? control === String(digito)
             : (control === letra || control === String(digito));
    return { valido: ok, tipo: 'CIF', mensaje: ok ? 'CIF correcto' : 'El dígito de control no cuadra' };
  }

  return { valido: false, tipo: null, mensaje: 'Formato no reconocido como NIF, CIF o NIE' };
}

// ── Semáforo de integridad de la ficha ──────────────────────────────────────
/**
 * @param empresa       fila de `empresas`
 * @param vinculos      filas de `empresa_contactos` de ESA empresa, con {rol}
 * @param contactos     contactos resueltos de esa empresa
 * @returns { color: 'rojo'|'ambar'|'verde', motivos: string[] }
 */
export function semaforoEmpresa(empresa, vinculos = [], contactos = []) {
  const rojos = [], ambares = [];

  if (vinculos.length === 0) rojos.push('Sin ningún contacto');
  const sinEmail = contactos.filter((c) => !emailValido(c?.email));
  if (sinEmail.length) rojos.push(`${sinEmail.length} contacto(s) sin email válido`);

  const roles = new Set(vinculos.map((v) => v.rol));
  if (vinculos.length > 0) {
    if (!roles.has('directivo')) ambares.push('Falta el contacto directivo principal');
    if (empresa?.es_cliente && !roles.has('facturacion')) ambares.push('Falta el contacto de facturación');
    if (empresa?.es_cliente && !roles.has('proyecto')) ambares.push('Falta el contacto de proyecto');
  }
  if (!empresa?.es_cliente && !empresa?.es_proveedor) ambares.push('No está marcada como cliente ni como proveedor');
  if (!empresa?.cif) ambares.push('Sin CIF');
  else if (validarCif(empresa.cif).valido === false) ambares.push('El CIF no es válido');

  if (rojos.length) return { color: 'rojo', motivos: [...rojos, ...ambares] };
  if (ambares.length) return { color: 'ambar', motivos: ambares };
  return { color: 'verde', motivos: [] };
}

/** Semáforo del contacto: rojo si no tiene empresa o no tiene email. */
export function semaforoContacto(contacto, nEmpresas) {
  const motivos = [];
  if (!nEmpresas) motivos.push('Sin empresa');
  if (!emailValido(contacto?.email)) motivos.push('Sin email válido');
  return { color: motivos.length ? 'rojo' : 'verde', motivos };
}

// ── Árbol del grupo empresarial ─────────────────────────────────────────────
/** Sube por la cadena de matrices hasta la cabecera del grupo (con corte anti-bucle). */
export function raizDelGrupo(empresas, id) {
  const porId = new Map(empresas.map((e) => [String(e.id), e]));
  let actual = porId.get(String(id));
  const vistos = new Set();
  while (actual?.empresa_matriz_id && !vistos.has(String(actual.id))) {
    vistos.add(String(actual.id));
    const padre = porId.get(String(actual.empresa_matriz_id));
    if (!padre) break;
    actual = padre;
  }
  return actual || null;
}

/** Construye el árbol {…empresa, hijos:[]} desde una raíz. */
export function arbolGrupo(empresas, raizId) {
  const porId = new Map(empresas.map((e) => [String(e.id), e]));
  const hijosDe = new Map();
  for (const e of empresas) {
    if (!e.empresa_matriz_id) continue;
    const k = String(e.empresa_matriz_id);
    if (!hijosDe.has(k)) hijosDe.set(k, []);
    hijosDe.get(k).push(e);
  }
  const construir = (id, profundidad = 0, vistos = new Set()) => {
    const e = porId.get(String(id));
    if (!e || vistos.has(String(id)) || profundidad > 12) return null;
    vistos.add(String(id));
    const hijos = (hijosDe.get(String(id)) || [])
      .slice()
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
      .map((h) => construir(h.id, profundidad + 1, vistos))
      .filter(Boolean);
    return { ...e, hijos };
  };
  return construir(raizId);
}

/** Nº total de empresas del grupo (para saber si merece la pena pintar el gráfico). */
export function tamanoGrupo(nodo) {
  if (!nodo) return 0;
  return 1 + (nodo.hijos || []).reduce((n, h) => n + tamanoGrupo(h), 0);
}

/** Candidatas a matriz: cualquier empresa salvo ella misma y sus descendientes. */
export function candidatasMatriz(empresas, id) {
  const arbol = arbolGrupo(empresas, id);
  const prohibidos = new Set();
  const recorrer = (n) => { if (!n) return; prohibidos.add(String(n.id)); (n.hijos || []).forEach(recorrer); };
  recorrer(arbol);
  return empresas
    .filter((e) => !prohibidos.has(String(e.id)))
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
}

/**
 * Cómo se llama una empresa EN PANTALLA.
 *
 * En los listados y previsualizaciones manda el nombre comercial: es el que el
 * equipo reconoce y por el que pregunta el cliente. La razón social —«GRUPO
 * ANDES HOLDING, S.L.»— solo hace falta en documentos y datos fiscales, y en
 * una lista larga estorba, porque varias empresas del mismo grupo empiezan
 * igual y no se distinguen hasta el final del nombre.
 *
 * Si no hay nombre comercial, se cae a la razón social: siempre hay algo que
 * mostrar.
 */
export const nombreVisible = (e) => e?.nombre_comercial?.trim() || e?.nombre || '';

/** Razón social, cuando de verdad hace falta (documentos, fiscal). */
export const razonSocial = (e) => e?.nombre || '';

/** ¿Merece la pena enseñar las dos? Solo si difieren. */
export const tieneComercialDistinto = (e) =>
  !!e?.nombre_comercial?.trim() && e.nombre_comercial.trim() !== e?.nombre;
