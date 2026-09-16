// ════════════════════════════════════════════════════════════════════════════
// CATÁLOGO VIVO DE TAREAS · el Anexo I sale de la base, no de un fichero
//
// El Anexo I de las ofertas se montaba con `catalogoAnexo.js`, una copia
// estática con once normas. La base tiene muchas más —los planes de igualdad y
// de diversidad, entre ellas—, así que una oferta de plan de diversidad salía
// con el Anexo I vacío: el cliente veía un precio sin ver el trabajo.
//
// Aquí se lee `tareas_catalogo` una sola vez por sesión y se reparte a quien lo
// pida. Si la lectura falla, se devuelve null y quien llame se queda con el
// fichero estático como respaldo: mejor un anexo antiguo que ninguno.
// ════════════════════════════════════════════════════════════════════════════

import { supabase, DEMO } from './supabase.js';
import { listTable } from './data.js';

// Solo las columnas que el anexo necesita. La tabla pasa de mil seiscientas
// filas y trae `subtareas` en JSON: pedirla entera para agrupar cuatro campos
// es cargar medio megabyte por nada.
const CAMPOS = 'norma_id,modelo,proceso,subproceso,titulo,orden';
// Se lee la VISTA, no la tabla. `tareas_catalogo` está cerrada por RLS a los
// roles internos —ahí están las horas base y las definiciones—, y el visitante
// de la web también tiene que ver su Anexo I en pantalla antes de recibir el
// PDF. La vista expone solo lo que el anexo imprime.
const TABLA = 'anexo_catalogo';
const PAGINA = 1000;   // tope de PostgREST: por encima, corta sin avisar

let promesa = null;

async function leer() {
  if (DEMO || !supabase) return listTable('tareas_catalogo');
  const todas = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabase.from(TABLA).select(CAMPOS)
      .order('norma_id', { ascending: true }).order('orden', { ascending: true })
      .range(desde, desde + PAGINA - 1);
    if (error) throw error;
    todas.push(...(data || []));
    if (!data || data.length < PAGINA) return todas;
  }
}

/** Filas de `tareas_catalogo`, cacheadas. `null` si no se pudieron leer. */
export function cargarCatalogoVivo() {
  if (!promesa) {
    promesa = leer()
      .then((filas) => (Array.isArray(filas) && filas.length ? filas : null))
      .catch(() => null);
  }
  return promesa;
}

/** Para las pruebas y para forzar una relectura tras tocar el catálogo. */
export function olvidarCatalogoVivo() { promesa = null; }
