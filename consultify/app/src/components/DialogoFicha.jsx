import { useEffect, useRef } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// DIÁLOGO DE FICHA
//
// La ficha completa encima del listado, sin perder de vista dónde estabas.
//
// Cuidado con los detalles que se olvidan y hacen que un diálogo sea molesto:
// se cierra con Escape, se puede cerrar pulsando fuera, y al abrirse lleva el
// foco dentro. Sin eso, quien navega con teclado se queda atrapado detrás.
// ════════════════════════════════════════════════════════════════════════════

export default function DialogoFicha({ titulo, subtitulo, onCerrar, children, ancho = '820px' }) {
  const caja = useRef(null);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onCerrar && onCerrar(); };
    document.addEventListener('keydown', esc);
    // El foco entra en el diálogo: si se queda fuera, el tabulador recorre lo
    // que hay detrás y quien usa teclado no llega a los campos.
    const t = setTimeout(() => caja.current?.focus?.(), 40);
    // Se bloquea el desplazamiento del fondo mientras está abierto.
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      clearTimeout(t);
      document.body.style.overflow = antes;
    };
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-[9500] flex items-start justify-center overflow-auto bg-black/55 p-4 sm:p-8"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar && onCerrar(); }}>
      <div ref={caja} tabIndex={-1} role="dialog" aria-modal="true" aria-label={titulo}
        style={{ maxWidth: ancho }}
        className="w-full rounded-2xl border-[1.5px] border-[#1E5468] bg-[#0A2B3A] shadow-2xl outline-none">
        <div className="flex items-start justify-between gap-3 border-b border-[#1E5468] px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="truncate text-[17px] font-extrabold text-[#EAF4F7]">{titulo}</h2>
            {subtitulo && <p className="mt-0.5 truncate text-[12px] text-[#7FA7B4]">{subtitulo}</p>}
          </div>
          <button onClick={onCerrar} aria-label="Cerrar"
            className="shrink-0 rounded-lg px-2 py-1 text-[18px] font-bold text-[#7FA7B4] transition hover:bg-white/5 hover:text-[#EAF4F7]">
            ×
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
