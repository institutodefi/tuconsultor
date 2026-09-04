import { Component } from 'react';
import { SELLO } from '../version.js';

// ════════════════════════════════════════════════════════════════════════════
// BARRERA DE ERRORES
//
// Sin esto, cualquier error de render deja la aplicación EN BLANCO: React
// desmonta el árbol entero y no queda nada en pantalla ni pista de qué pasó.
// Para quien lo sufre, «no funciona» y punto; para quien lo arregla, adivinar.
//
// Con la barrera, un fallo en una pantalla deja el resto en pie y muestra el
// error con el detalle necesario para arreglarlo: mensaje, componente donde
// ocurrió y ruta. Y un botón para copiarlo, porque transcribir a mano un
// «Cannot read properties of undefined» es cómo se pierden los detalles.
//
// Se pone en dos alturas: alrededor de toda la app y alrededor del contenido de
// cada portal. La de dentro es la que importa, porque deja el menú funcionando
// y permite irse a otra pantalla sin recargar.
// ════════════════════════════════════════════════════════════════════════════

export default class BarreraErrores extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, pila: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ pila: info?.componentStack || null });
    // También a la consola: quien tenga las herramientas abiertas lo verá con
    // el stack completo y los enlaces al código.
    console.error('[Consultify] Error de render:', error, info);
  }

  informe() {
    const { error, pila } = this.state;
    return [
      `Error: ${error?.message || error}`,
      // La versión, lo primero después del error: sin ella no se sabe si el
      // fallo viene de código ya corregido o de código nuevo.
      `Versión: ${SELLO}`,
      `Ruta: ${window.location.pathname}${window.location.search}`,
      `Navegador: ${navigator.userAgent}`,
      `Fecha: ${new Date().toISOString()}`,
      pila ? `\nComponentes:${pila}` : '',
      error?.stack ? `\nPila:\n${error.stack}` : '',
    ].join('\n');
  }

  render() {
    const { error, pila } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="mx-auto max-w-2xl space-y-3 p-6">
        <div className="rounded-2xl border-[1.5px] border-red-400/50 bg-red-500/10 p-5">
          <h2 className="text-lg font-extrabold text-red-200">Esta pantalla ha fallado</h2>
          <p className="mt-1 text-[13px] text-[#DFF1F5]">
            El resto de la aplicación sigue funcionando: puedes cambiar de pantalla desde el menú.
          </p>
          <p className="mt-1 text-[11.5px] font-bold text-[#7FA7B4]">{SELLO}</p>

          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-[#0A2B3A] p-3 text-[12px] leading-relaxed text-red-200">
            {error?.message || String(error)}
          </pre>

          {pila && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[12px] font-bold text-[#9FC0CB]">
                Dónde ha ocurrido
              </summary>
              <pre className="mt-1.5 max-h-52 overflow-auto whitespace-pre-wrap rounded-xl bg-[#0A2B3A] p-3 text-[11px] leading-relaxed text-[#9FC0CB]">
                {pila.trim()}
              </pre>
            </details>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => navigator.clipboard?.writeText(this.informe())}
              className="btn-orange !px-4 !py-1.5 text-[13px]"
            >
              Copiar el informe
            </button>
            <button
              onClick={() => this.setState({ error: null, pila: null })}
              className="btn-ghost !px-4 !py-1.5 text-[13px]"
            >
              Reintentar
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-ghost !px-4 !py-1.5 text-[13px]"
            >
              Recargar
            </button>
          </div>
        </div>
      </div>
    );
  }
}
