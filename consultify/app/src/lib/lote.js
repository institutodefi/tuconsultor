import { useCallback, useMemo, useState } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// SELECCIÓN MÚLTIPLE Y ACCIONES EN LOTE
//
// Nació dentro de Contactos y lo necesitan también Empresas, Clientes, Leads y
// las demás listas. Aquí está una sola vez, con las decisiones que costó tomar
// y que conviene no volver a discutir en cada pantalla:
//
//   · Las acciones se ejecutan UNA A UNA contra la base, no en bloque. Es más
//     lento, pero si falla el registro 7 de 40 los seis primeros quedan hechos
//     y el informe dice cuáles fallaron y por qué. Un `update ... in (...)` que
//     revienta a medias deja el lote en un estado que nadie sabe leer.
//
//   · «Marcar todos» marca SOLO lo que se está viendo. Con un filtro puesto,
//     que se llevara por delante registros fuera de pantalla sería una sorpresa
//     muy desagradable con un botón de eliminar al lado.
//
//   · La selección se limpia al terminar: dejarla puesta invita a repetir la
//     acción sin querer sobre las mismas filas.
// ════════════════════════════════════════════════════════════════════════════

/**
 * @param {object[]} visibles  filas que se están mostrando, ya filtradas
 * @param {function} recargar  se llama al terminar un lote
 */
export function useLote(visibles = [], recargar) {
  const [marcados, setMarcados] = useState(() => new Set());
  const [estado, setEstado] = useState(null);   // progreso y resultado

  const seleccionados = useMemo(
    () => visibles.filter((x) => marcados.has(String(x.id))),
    [visibles, marcados],
  );

  const alternar = useCallback((id) => setMarcados((s) => {
    const n = new Set(s); const k = String(id);
    if (n.has(k)) n.delete(k); else n.add(k);
    return n;
  }), []);

  const todosMarcados = visibles.length > 0 && seleccionados.length === visibles.length;

  const alternarTodos = useCallback(() => {
    setMarcados(todosMarcados ? new Set() : new Set(visibles.map((x) => String(x.id))));
  }, [todosMarcados, visibles]);

  const limpiar = useCallback(() => setMarcados(new Set()), []);

  /**
   * Ejecuta `fn` sobre cada seleccionado.
   * @param {string} accion  cómo se llama en el informe: «eliminados», «enviados»…
   * @param {function} fn    recibe la fila; lanzar un Error marca ese registro como fallido
   */
  const ejecutar = useCallback(async (accion, fn) => {
    const filas = visibles.filter((x) => marcados.has(String(x.id)));
    if (!filas.length) return;
    const fallos = [];
    let hechos = 0;
    setEstado({ trabajando: true, hechos: 0, total: filas.length, fallos: [] });
    for (const fila of filas) {
      try { await fn(fila); hechos += 1; }
      catch (e) { fallos.push({ fila, error: e?.message || String(e) }); }
      setEstado({ trabajando: true, hechos, total: filas.length, fallos: [...fallos] });
    }
    setEstado({ trabajando: false, hechos, total: filas.length, fallos, accion });
    setMarcados(new Set());
    await recargar?.();
  }, [visibles, marcados, recargar]);

  /** Pide confirmación antes de una acción irreversible. */
  const ejecutarConAviso = useCallback((accion, aviso, fn) => {
    if (!window.confirm(aviso)) return;
    return ejecutar(accion, fn);
  }, [ejecutar]);

  return {
    marcados, seleccionados, alternar, alternarTodos, todosMarcados, limpiar,
    ejecutar, ejecutarConAviso,
    estado, cerrarEstado: () => setEstado(null),
    hayMarcados: marcados.size > 0,
    nMarcados: marcados.size,
  };
}

/** Exporta filas a CSV. Con BOM: sin él Excel destroza los acentos. */
export function exportarCSV(filas, columnas, nombreBase = 'export') {
  if (!filas?.length) return false;
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const cab = columnas.map(([etq]) => esc(etq)).join(';');
  const cuerpo = filas.map((f) => columnas.map(([, leer]) => esc(leer(f))).join(';'));
  const csv = '\uFEFF' + [cab, ...cuerpo].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombreBase}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

/** Copia al portapapeles los correos válidos de las filas dadas. */
export async function copiarCorreos(filas, leerEmail = (f) => f.email) {
  const correos = [...new Set(
    filas.map(leerEmail).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim())),
  )];
  if (!correos.length) return { ok: false, n: 0 };
  try {
    await navigator.clipboard.writeText(correos.join('; '));
    return { ok: true, n: correos.length };
  } catch {
    return { ok: false, n: correos.length, error: 'El navegador no dejó copiar.' };
  }
}
