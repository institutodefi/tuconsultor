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

/**
 * Valida un identificador fiscal español y devuelve
 * { valido, tipo, mensaje }. Replica el aviso «CIF correcto» de Holded.
 */
export function validarCif(entrada) {
  const v = normalizarCif(entrada);
  if (!v) return { valido: null, tipo: null, mensaje: '' };
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
