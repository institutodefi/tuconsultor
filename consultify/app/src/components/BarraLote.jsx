// ════════════════════════════════════════════════════════════════════════════
// BARRA DE ACCIONES EN LOTE
//
// Aparece solo cuando hay algo marcado. Una barra permanente con los botones
// apagados es ruido en cada visita a la pantalla, y acaba por no verse cuando
// de verdad hace falta.
//
// Va pegada arriba (`sticky`) porque en una lista larga se marca al final y los
// botones tienen que seguir a mano sin subir hasta la cabecera.
// ════════════════════════════════════════════════════════════════════════════

export function BarraLote({ n, onLimpiar, children }) {
  if (!n) return null;
  return (
    <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-brand-orange/50 bg-[#10394A] px-3 py-2 shadow-lg">
      <span className="text-[12.5px] font-extrabold text-brand-orange">
        {n} marcado{n === 1 ? '' : 's'}
      </span>
      {children}
      <button onClick={onLimpiar}
        className="ml-auto text-[11.5px] font-bold text-[#7FA7B4] hover:text-[#EAF4F7]">
        Quitar selección
      </button>
    </div>
  );
}

/** Botón de la barra. `peligro` lo pinta en rojo: eliminar no se pulsa por error. */
export function BotonLote({ onClick, peligro = false, children, ...resto }) {
  return (
    <button
      onClick={onClick}
      {...resto}
      className={peligro
        ? 'rounded-full border border-red-500/40 px-2.5 py-1 text-[11.5px] font-bold text-red-300 transition hover:bg-red-500/10'
        : 'btn-ghost !px-2.5 !py-1 text-[11.5px]'}
    >
      {children}
    </button>
  );
}

/**
 * Informe del lote: progreso mientras corre y resultado al terminar.
 *
 * Los fallos se listan uno a uno con su motivo. Un «3 de 40 fallaron» sin decir
 * cuáles obliga a revisar los cuarenta a mano.
 */
export function InformeLote({ estado, onCerrar, nombreDe = (f) => f.nombre || f.empresa || f.id }) {
  if (!estado) return null;
  const conFallos = estado.fallos.length > 0;
  return (
    <div className={`rounded-xl px-3 py-2 text-[12.5px] font-bold ${
      conFallos ? 'bg-amber-400/10 text-amber-200' : 'bg-emerald-500/10 text-emerald-300'}`}>
      {estado.trabajando ? (
        `Procesando ${estado.hechos} de ${estado.total}…`
      ) : (
        <>
          {estado.hechos} de {estado.total} {estado.accion}.
          {conFallos && (
            <ul className="mt-1 space-y-0.5 font-medium">
              {estado.fallos.slice(0, 6).map(({ fila, error }, i) => (
                <li key={fila?.id || i}>· {nombreDe(fila)}: {error}</li>
              ))}
              {estado.fallos.length > 6 && <li>· y {estado.fallos.length - 6} más</li>}
            </ul>
          )}
          <button onClick={onCerrar} className="ml-2 underline">cerrar</button>
        </>
      )}
    </div>
  );
}

/** Casilla de cabecera: marca o desmarca todo lo visible. */
export function CasillaTodos({ marcado, onCambio }) {
  return (
    <input type="checkbox" checked={marcado} onChange={onCambio}
      aria-label="Marcar todos los visibles" />
  );
}
