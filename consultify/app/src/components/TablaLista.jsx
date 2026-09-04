import { useEffect, useMemo, useState } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// TABLA DE LISTADO · una sola para empresas, contactos, clientes y proyectos
//
// Filas compactas con columnas fijas, paginación de 10 · 25 · 50 · todos, y al
// pulsar una fila se abre su ficha.
//
// Una sola implementación y no cuatro parecidas: cuando cada listado tiene la
// suya, un arreglo hay que hacerlo cuatro veces y a la tercera se olvida.
//
// La paginación importa más de lo que parece: con 400 contactos, pintarlos
// todos hace que la pantalla tarde y que buscar a ojo sea imposible.
// ════════════════════════════════════════════════════════════════════════════

const TAMANOS = [10, 25, 50, 0];   // 0 = todos
const etiquetaTam = (n) => (n === 0 ? 'Todos' : String(n));

export default function TablaLista({
  columnas,          // [{ k, etq, ancho?, clase?, pinta? }]
  filas,             // objetos ya filtrados
  onFila,            // qué hacer al pulsar una
  vacio = 'Sin resultados.',
  idDe = (f) => f.id,
  destacada,         // id de la fila seleccionada
}) {
  const [tam, setTam] = useState(25);
  const [pag, setPag] = useState(0);

  // Al cambiar el filtro de arriba, volver a la primera página: quedarse en la
  // séptima de una lista que ahora tiene dos deja la pantalla en blanco.
  useEffect(() => { setPag(0); }, [filas.length]);

  const total = filas.length;
  const porPag = tam === 0 ? total || 1 : tam;
  const paginas = Math.max(1, Math.ceil(total / porPag));
  const actual = Math.min(pag, paginas - 1);
  const visibles = useMemo(
    () => (tam === 0 ? filas : filas.slice(actual * porPag, actual * porPag + porPag)),
    [filas, actual, porPag, tam],
  );

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-[#1E5468]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[#1E5468] bg-[#0D3242]">
              {columnas.map((c) => (
                <th key={c.k} style={c.ancho ? { width: c.ancho } : undefined}
                  className="px-3 py-2 text-[10.5px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">
                  {c.etq}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr><td colSpan={columnas.length} className="px-3 py-8 text-center text-[12.5px] text-[#7FA7B4]">{vacio}</td></tr>
            )}
            {visibles.map((f) => {
              const id = idDe(f);
              return (
                <tr key={id} onClick={() => onFila && onFila(f)}
                  tabIndex={0} role="button"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFila && onFila(f); } }}
                  className={`cursor-pointer border-b border-[#153F52] transition last:border-0 hover:bg-[#10394A] focus-visible:bg-[#10394A] focus-visible:outline-none ${
                    String(destacada) === String(id) ? 'bg-brand-orange/10' : ''}`}>
                  {columnas.map((c) => (
                    <td key={c.k} className={`px-3 py-2 align-middle text-[12.5px] ${c.clase || 'text-[#EAF4F7]'}`}>
                      {c.pinta ? c.pinta(f) : (f[c.k] ?? <span className="text-[#5E8494]">—</span>)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación: el número total va siempre, aunque quepa todo en una
          página. Saber cuántos hay es la mitad de la información. */}
      <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#9FC0CB]">
        <span>
          {total === 0 ? 'Sin registros'
            : tam === 0 ? `${total} registro${total === 1 ? '' : 's'}`
            : `${actual * porPag + 1}–${Math.min((actual + 1) * porPag, total)} de ${total}`}
        </span>

        <span className="flex items-center gap-1">
          Ver
          {TAMANOS.map((n) => (
            <button key={n} onClick={() => { setTam(n); setPag(0); }}
              className={`rounded px-1.5 py-0.5 font-bold transition ${
                tam === n ? 'bg-brand-orange/20 text-brand-orange' : 'text-[#7FA7B4] hover:text-[#EAF4F7]'}`}>
              {etiquetaTam(n)}
            </button>
          ))}
        </span>

        {paginas > 1 && (
          <span className="ml-auto flex items-center gap-1">
            <button onClick={() => setPag(Math.max(0, actual - 1))} disabled={actual === 0}
              className="rounded px-2 py-0.5 font-bold text-[#9FC0CB] transition hover:text-[#EAF4F7] disabled:opacity-30">←</button>
            <span className="px-1">{actual + 1} / {paginas}</span>
            <button onClick={() => setPag(Math.min(paginas - 1, actual + 1))} disabled={actual >= paginas - 1}
              className="rounded px-2 py-0.5 font-bold text-[#9FC0CB] transition hover:text-[#EAF4F7] disabled:opacity-30">→</button>
          </span>
        )}
      </div>
    </div>
  );
}
