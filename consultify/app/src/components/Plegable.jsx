import { useCallback, useEffect, useState } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// PLEGABLE · una sola manera de plegar cosas en toda la aplicación
//
// Las pantallas habían crecido a base de apilar bloques: la columna del
// generador medía mil setecientos píxeles de alto, el menú del portal pasaba
// de treinta enlaces abiertos a la vez y la fila de accesos de Inicio ocupaba
// dos líneas enteras antes de llegar al contenido. Todo visible siempre es lo
// mismo que nada destacado.
//
// Aquí está el patrón una sola vez: cabecera compacta con título, un resumen a
// la derecha (para no tener que abrir el bloque solo para ver el dato) y una
// flecha. Lo que el usuario abre o cierra se recuerda, porque cada persona
// trabaja mirando cosas distintas y no tiene por qué repetir el gesto cada
// mañana.
// ════════════════════════════════════════════════════════════════════════════

const CLAVE = 'orbita.plegables.v1';

function leerEstado() {
  // Sin localStorage (navegación privada, cookies bloqueadas) todo sigue
  // funcionando: simplemente no se recuerda nada entre visitas.
  try { return JSON.parse(localStorage.getItem(CLAVE) || '{}'); } catch { return {}; }
}

function guardarEstado(id, abierto) {
  try {
    const e = leerEstado();
    e[id] = abierto;
    localStorage.setItem(CLAVE, JSON.stringify(e));
  } catch { /* sin memoria, pero la pantalla funciona igual */ }
}

/**
 * ¿Está abierto este plegable?
 *
 * @param id        identificador estable; sin él no se recuerda nada
 * @param pordefecto valor cuando el usuario todavía no ha decidido
 */
export function usarPlegado(id, pordefecto = true) {
  const [abierto, setAbierto] = useState(() => {
    if (!id) return pordefecto;
    const e = leerEstado();
    return typeof e[id] === 'boolean' ? e[id] : pordefecto;
  });
  const alternar = useCallback(() => {
    setAbierto((v) => {
      if (id) guardarEstado(id, !v);
      return !v;
    });
  }, [id]);
  return [abierto, alternar, setAbierto];
}

/**
 * Bloque plegable.
 *
 * @param titulo     texto de la cabecera
 * @param resumen    dato corto a la derecha, visible también plegado
 * @param id         para recordar el estado entre sesiones
 * @param inicial    abierto o cerrado la primera vez
 * @param tono       'normal' | 'suave' | 'aviso'
 * @param forzado    true/false para abrirlo desde fuera (ignora la memoria)
 */
export default function Plegable({
  titulo, resumen = null, children, id = null, inicial = true,
  tono = 'normal', forzado = null, className = '', denso = false,
}) {
  const [abiertoPropio, alternar, setAbierto] = usarPlegado(id, inicial);
  const abierto = forzado === null ? abiertoPropio : forzado;

  // Cuando algo de fuera decide que debe abrirse (la sección activa del menú,
  // un error que hay que enseñar), se abre y se queda así.
  useEffect(() => { if (forzado === true) setAbierto(true); }, [forzado, setAbierto]);

  const marco = {
    normal: 'border-[#1E5468] bg-[#0D3242]',
    suave:  'border-[#16455A] bg-[#0B2E3D]',
    aviso:  'border-brand-orange/40 bg-brand-orange/[0.07]',
    // Para la columna navy del generador, donde el fondo ya es oscuro y el
    // borde de la paleta del portal no se ve.
    panel:  'border-white/15 bg-white/[0.07]',
  }[tono] || 'border-[#1E5468] bg-[#0D3242]';

  return (
    <section className={`overflow-hidden rounded-xl border ${marco} ${className}`}>
      <button
        type="button"
        onClick={alternar}
        aria-expanded={abierto}
        className={`flex w-full items-center gap-2 text-left transition hover:bg-white/[0.04] ${
          denso ? 'px-2.5 py-1.5' : 'px-3 py-2'}`}
      >
        <span className={`min-w-0 flex-1 font-extrabold uppercase leading-tight tracking-[0.06em] ${
          tono === 'panel' ? 'text-brand-orange' : 'text-[#9FC0CB]'} ${
          denso ? 'text-[9.5px]' : 'text-[10px]'}`}>
          {titulo}
        </span>
        {resumen != null && (
          <span className={`shrink-0 text-[11px] font-bold ${tono === 'panel' ? 'text-white' : 'text-[#EAF4F7]'}`}>{resumen}</span>
        )}
        <svg className={`h-3.5 w-3.5 shrink-0 ${tono === 'panel' ? 'text-white/50' : 'text-[#7FA7B4]'} transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {abierto && (
        <div className={`border-t ${tono === 'panel' ? 'border-white/10' : 'border-white/5'} ${denso ? 'px-2.5 py-2' : 'px-3 py-2.5'}`}>
          {children}
        </div>
      )}
    </section>
  );
}
