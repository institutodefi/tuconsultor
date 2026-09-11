// ════════════════════════════════════════════════════════════════════════════
// COPIAR CONTACTOS ENTRE EMPRESAS
//
// En un grupo, las mismas personas llevan varias sociedades: quien firma en la
// matriz firma en la filial. Copiar es VINCULAR el mismo contacto (misma fila
// de `contactos`) a la otra empresa con el mismo rol; no se duplica la persona.
// Facturación y proyecto son únicos por empresa: si en el destino ya hay
// alguien, el copiado entra como secundario. Directivo admite varios; el
// principal solo se copia si el destino no tiene ninguno.
// ════════════════════════════════════════════════════════════════════════════
import { insertRow } from './data.js';

const S = (v) => String(v ?? '');
const UNICOS = ['facturacion', 'proyecto'];

/** Empresas del mismo grupo que `empresa` (matriz, filiales y hermanas), la matriz primero. */
export function empresasDelGrupo(empresa, empresas = []) {
  if (!empresa?.id) return [];
  const id = S(empresa.id);
  const matrizId = S(empresa.empresa_matriz_id || '');
  const raiz = matrizId || id;
  const del = empresas.filter((e) => S(e.id) !== id && (S(e.id) === raiz || S(e.empresa_matriz_id) === raiz || S(e.empresa_matriz_id) === id));
  return del.sort((a, b) => (S(a.id) === matrizId ? -1 : S(b.id) === matrizId ? 1 : S(a.nombre).localeCompare(S(b.nombre), 'es')));
}

/**
 * Qué vínculos se crearían al copiar los contactos de `origenId` a `destinoId`.
 * @returns [{ contacto_id, rol, principal, cargo, motivo? }]
 */
export function planCopia(origenId, destinoId, vinculos = []) {
  const deOrigen = vinculos.filter((v) => S(v.empresa_id) === S(origenId));
  const deDestino = vinculos.filter((v) => S(v.empresa_id) === S(destinoId));
  const yaTiene = new Set(deDestino.map((v) => `${S(v.contacto_id)}|${v.rol}`));
  const yaVinculado = new Set(deDestino.map((v) => S(v.contacto_id)));
  const ocupados = new Set(deDestino.map((v) => v.rol).filter((r) => UNICOS.includes(r)));
  const hayPrincipal = deDestino.some((v) => v.principal);
  const out = [];
  for (const v of deOrigen) {
    if (yaTiene.has(`${S(v.contacto_id)}|${v.rol}`)) continue;           // ya está con ese rol
    if (yaVinculado.has(S(v.contacto_id)) && v.rol === 'secundario') continue; // ya está, con otro rol mejor
    let rol = v.rol || 'secundario';
    let motivo = null;
    if (UNICOS.includes(rol) && ocupados.has(rol)) { rol = 'secundario'; motivo = `en el destino ya hay ${v.rol}`; }
    else if (UNICOS.includes(rol)) ocupados.add(rol);
    const principal = !!v.principal && rol === 'directivo' && !hayPrincipal && !out.some((x) => x.principal);
    out.push({ contacto_id: v.contacto_id, rol, principal, cargo: v.cargo || null, motivo });
    yaVinculado.add(S(v.contacto_id));
  }
  return out;
}

/** Crea los vínculos del plan en la base. Devuelve cuántos y los fallos. */
export async function copiarContactos(origenId, destinoId, vinculos = []) {
  const plan = planCopia(origenId, destinoId, vinculos);
  let hechos = 0; const fallos = [];
  for (const p of plan) {
    try {
      await insertRow('empresa_contactos', { empresa_id: destinoId, contacto_id: p.contacto_id, rol: p.rol, principal: p.principal, cargo: p.cargo });
      hechos++;
    } catch (e) { fallos.push(`${p.contacto_id}: ${e?.message || e}`); }
  }
  return { hechos, fallos, plan };
}
