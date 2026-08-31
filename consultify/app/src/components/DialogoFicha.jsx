import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// ════════════════════════════════════════════════════════════════════════════
// DIÁLOGO DE EDICIÓN
//
// Toda la edición del portal se hace aquí: contacto, empresa, proyecto, regla,
// lead… La ficha aparece encima de la lista, sin perder de vista dónde estabas
// ni empujar el contenido hacia abajo.
//
// Los detalles que hacen que un diálogo no sea molesto y que casi siempre se
// olvidan:
//   · Escape cierra.
//   · Pulsar fuera cierra, pero solo si el gesto EMPEZÓ fuera: seleccionar
//     texto dentro y soltar el ratón fuera no debe cerrar el formulario.
//   · El foco entra al abrir y queda ATRAPADO dentro mientras está abierto. Sin
//     esto el tabulador recorre lo de detrás y quien usa teclado se pierde.
//   · Al cerrar, el foco vuelve al elemento que lo abrió.
//   · Si hay cambios sin guardar, se pregunta antes de cerrar.
//   · El fondo no se desplaza, pero el diálogo sí cuando no cabe.
//   · En móvil se ancla abajo, que es donde llega el pulgar.
//
// Se dibuja con `createPortal` directamente sobre `document.body`, no donde se
// escribe en el JSX. Un `position: fixed` deja de referirse a la pantalla y
// pasa a referirse a su ancestro en cuanto ese ancestro tiene `transform`,
// `filter` o `contain`; y una tarjeta con `overflow-hidden` puede recortarlo.
// Con el portal el diálogo no depende de dónde esté montado, hoy ni cuando
// alguien añada una animación a una tarjeta dentro de un año.
//
// Ojo: NO son ventanas emergentes del navegador. Son HTML de la propia página,
// así que el bloqueador de pop-ups no las afecta ni hay nada que autorizar.
// ════════════════════════════════════════════════════════════════════════════

const FOCALIZABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function DialogoFicha({
  titulo,
  subtitulo,
  onCerrar,
  children,
  pie,                  // botonera fija abajo: en formularios largos, Guardar
                        // no debería quedar a tres pantallas de scroll
  ancho = '820px',
  haycambios = false,   // si hay algo sin guardar, se avisa antes de cerrar
}) {
  const caja = useRef(null);
  const origen = useRef(null);
  const gestoDentro = useRef(false);

  // ── Por qué esto va en refs y no en dependencias ──
  // `onCerrar` casi siempre llega como función inline —`onCerrar={() => setForm(null)}`—,
  // así que cambia de identidad en CADA render. Si el efecto de abajo dependiera
  // de ella, se limpiaría y volvería a montarse en cada render: quitaría el foco
  // para devolverlo al origen, programaría otro `setTimeout` para enfocar el
  // primer campo, y esa pelea de foco dejaba la pantalla congelada.
  //
  // Con refs, el efecto corre UNA vez al abrir y otra al cerrar, que es lo que
  // debe hacer, y aun así `cerrar` siempre llama a la versión actual.
  const fnCerrar = useRef(onCerrar);
  const hayCambiosRef = useRef(haycambios);
  fnCerrar.current = onCerrar;
  hayCambiosRef.current = haycambios;

  const cerrar = useCallback(() => {
    if (hayCambiosRef.current && !window.confirm('Hay cambios sin guardar. ¿Cerrar y perderlos?')) return;
    fnCerrar.current?.();
  }, []);

  useEffect(() => {
    origen.current = document.activeElement;

    const teclas = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
      if (e.key !== 'Tab' || !caja.current) return;
      const f = [...caja.current.querySelectorAll(FOCALIZABLES)]
        .filter((el) => el.offsetParent !== null);
      if (!f.length) return;
      const pri = f[0], ult = f[f.length - 1];
      if (e.shiftKey && document.activeElement === pri) { e.preventDefault(); ult.focus(); }
      else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); pri.focus(); }
    };
    document.addEventListener('keydown', teclas);

    // Primer campo del formulario, si lo hay; si no, la propia caja. Aterrizar
    // sobre el botón de cerrar sería el peor sitio posible.
    const t = setTimeout(() => {
      const primero = caja.current?.querySelector('input:not([type="hidden"]), select, textarea');
      (primero || caja.current)?.focus?.();
    }, 40);

    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', teclas);
      clearTimeout(t);
      document.body.style.overflow = antes;
      // Volver al botón que abrió el diálogo, no al principio de la página.
      if (origen.current?.focus) origen.current.focus();
    };
    // Sin dependencias a propósito: ver la nota de arriba.
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <div
      className="fixed inset-0 z-[9500] flex items-end justify-center bg-black/60 backdrop-blur-[2px] sm:items-start sm:p-6 md:p-8"
      onMouseDown={(e) => { gestoDentro.current = e.target !== e.currentTarget; }}
      onMouseUp={(e) => { if (e.target === e.currentTarget && !gestoDentro.current) cerrar(); }}
    >
      <div
        ref={caja}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        style={{ maxWidth: ancho }}
        className="flex max-h-[92vh] w-full flex-col rounded-t-2xl border-[1.5px] border-[#1E5468] bg-[#0A2B3A] shadow-2xl outline-none sm:max-h-[88vh] sm:rounded-2xl"
      >
        {/* Cabecera fija: en un formulario largo, saber qué estás editando no
            debería depender de haber hecho scroll hasta arriba. */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#1E5468] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-extrabold text-[#EAF4F7] sm:text-[17px]">{titulo}</h2>
            {subtitulo && <p className="mt-0.5 truncate text-[11.5px] text-[#7FA7B4]">{subtitulo}</p>}
          </div>
          <button
            onClick={cerrar}
            aria-label="Cerrar"
            className="shrink-0 rounded-lg px-2 py-0.5 text-[20px] font-bold leading-none text-[#7FA7B4] transition hover:bg-white/5 hover:text-[#EAF4F7]"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5 sm:px-5 sm:py-4">{children}</div>

        {pie && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[#1E5468] px-4 py-3 sm:px-5">
            {pie}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
