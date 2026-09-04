// ════════════════════════════════════════════════════════════════════════════
// Puente entre `empresas` (CRM) y `clientes` (operativa)
//
// Conviven dos tablas para lo mismo:
//   · `empresas`  → el CRM actual, con `es_cliente` / `es_proveedor`. Es la que
//                   se mantiene al día y la que ve el equipo comercial.
//   · `clientes`  → la operativa antigua. De ella cuelgan `proyectos_cliente`,
//                   las tareas y la agenda.
//
// El resultado es que las pantallas que listaban `clientes` enseñaban una lista
// distinta de la de la pestaña Empresas: empresas dadas de alta como cliente en
// el CRM no aparecían al crear un proyecto, y al revés.
//
// Aquí se resuelve: se listan siempre las EMPRESAS marcadas como cliente, y
// cuando hace falta colgar algo de `clientes` se busca su ficha por CIF y, si
// no existe, se crea. Así el equipo trabaja contra una sola lista.
// ════════════════════════════════════════════════════════════════════════════

import { normalizarCif } from './crm.js';

/** Nombre de empresa comparable: sin forma jurídica, acentos ni puntuación. */
export function normalizarNombre(s) {
  return String(s || '')
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,]/g, ' ')
    .replace(/\b(S\s*L\s*U?|S\s*A\s*U?|SOCIEDAD LIMITADA|SOCIEDAD ANONIMA|SLU|SAU|SL|SA)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Empresas del CRM que son cliente, ordenadas por nombre. */
export function empresasCliente(empresas = []) {
  return empresas
    .filter((e) => e.es_cliente)
    .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'));
}

/** Ficha de `clientes` que corresponde a una empresa del CRM, o null. */
export function buscarCliente(empresa, clientes = []) {
  if (!empresa) return null;
  const cif = normalizarCif(empresa.cif);
  if (cif) {
    const porCif = clientes.find((c) => normalizarCif(c.cif) === cif);
    if (porCif) return porCif;
  }
  const nom = normalizarNombre(empresa.nombre);
  if (!nom) return null;
  return clientes.find((c) => normalizarNombre(c.empresa) === nom) || null;
}

/**
 * Devuelve el id de `clientes` de una empresa, creando la ficha si no existe.
 *
 * Crear la ficha al vuelo es deliberado: la alternativa es un mensaje de error
 * pidiendo que se dé de alta el cliente en otra pantalla, y eso obliga a
 * abandonar lo que se estaba haciendo para rellenar datos que ya están en el
 * CRM.
 *
 * @returns {Promise<{id: string, creada: boolean}>}
 */
export async function asegurarCliente(empresa, clientes = []) {
  const existente = buscarCliente(empresa, clientes);
  if (existente) return { id: existente.id, creada: false };

  // Import dinámico: así este módulo se puede cargar (y probar) sin arrastrar
  // el cliente de Supabase, que necesita el entorno de Vite para resolverse.
  const { insertRow } = await import('./data.js');
  const fila = await insertRow('clientes', {
    empresa: empresa.nombre,
    cif: empresa.cif || null,
    email: empresa.email || null,
    telefono: empresa.telefono || null,
  });
  if (!fila?.id) throw new Error('No se pudo crear la ficha de cliente.');
  return { id: fila.id, creada: true };
}
