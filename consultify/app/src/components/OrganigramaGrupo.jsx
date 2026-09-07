import { useMemo } from 'react';
import { arbolGrupo, raizDelGrupo, tamanoGrupo } from '../lib/crm.js';

// ════════════════════════════════════════════════════════════════════════════
// Organigrama del grupo empresarial (SVG, sin dependencias).
// Se pinta solo cuando la empresa seleccionada tiene matriz o filiales.
// Layout tipo «tidy tree»: las hojas ocupan carriles fijos y cada padre se
// centra sobre sus hijos.
// ════════════════════════════════════════════════════════════════════════════

// Cajas pequeñas: un grupo de seis empresas tiene que caber en la ficha sin
// convertirse en un póster. El SVG se pinta a su tamaño natural (no se estira
// al ancho de la tarjeta) y, si no cabe, se desplaza en horizontal.
const ANCHO = 150, ALTO = 44, HUECO_X = 14, HUECO_Y = 80, MARGEN = 10;

function medir(nodo) {
  if (!nodo.hijos?.length) return { ...nodo, ancho: ANCHO };
  const hijos = nodo.hijos.map(medir);
  const ancho = Math.max(
    ANCHO,
    hijos.reduce((s, h) => s + h.ancho, 0) + HUECO_X * (hijos.length - 1),
  );
  return { ...nodo, hijos, ancho };
}

// Recolecta todos los nodos con su posición y la de su padre (para las líneas).
function aplanar(nodo) {
  const medido = medir(nodo);
  const out = [];
  const rec = (n, x, y, padre) => {
    const cx = x + n.ancho / 2;
    out.push({ ...n, hijos: undefined, x: cx - ANCHO / 2, y, cx, padre });
    if (n.hijos?.length) {
      const total = n.hijos.reduce((s, h) => s + h.ancho, 0) + HUECO_X * (n.hijos.length - 1);
      let cursor = cx - total / 2;
      for (const h of n.hijos) {
        rec(h, cursor, y + HUECO_Y, { cx, cy: y + ALTO });
        cursor += h.ancho + HUECO_X;
      }
    }
  };
  rec(medido, 0, 0, null);
  return { nodos: out, ancho: medido.ancho };
}

const recortar = (s, n) => (String(s || '').length > n ? String(s).slice(0, n - 1) + '…' : String(s || ''));

export default function OrganigramaGrupo({ empresas, empresaId, onSeleccionar, desnudo = false }) {
  const datos = useMemo(() => {
    const raiz = raizDelGrupo(empresas, empresaId);
    if (!raiz) return null;
    const arbol = arbolGrupo(empresas, raiz.id);
    if (!arbol || tamanoGrupo(arbol) < 2) return null;   // una sola empresa: no hay grupo que dibujar
    return { raiz, ...aplanar(arbol), total: tamanoGrupo(arbol) };
  }, [empresas, empresaId]);

  if (!datos) return null;

  const alturaTotal = Math.max(...datos.nodos.map((n) => n.y)) + ALTO;
  const vbW = datos.ancho + MARGEN * 2;
  const vbH = alturaTotal + MARGEN * 2;

  return (
    <div className={desnudo ? '' : 'card'}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">
          Estructura del grupo
          <span className="ml-2 font-bold normal-case tracking-normal text-[#9FC0CB]">{datos.raiz.nombre} · {datos.total} empresas</span>
        </p>
        <span className="text-[10.5px] text-[#5E8494]">Pulsa una caja para abrir su ficha</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#153F52] bg-[#0A2634] p-2">
        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          width={vbW}
          height={vbH}
          style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
          role="img"
          aria-label={`Organigrama del grupo ${datos.raiz.nombre}`}
        >
          <defs>
            <linearGradient id="og-caja" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#123C4D" />
              <stop offset="1" stopColor="#0D3242" />
            </linearGradient>
            <linearGradient id="og-actual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#15505A" />
              <stop offset="1" stopColor="#10424A" />
            </linearGradient>
          </defs>

          {/* Conectores con esquinas suaves: del padre baja, gira y entra al hijo */}
          <g stroke="#2B6478" strokeWidth="1.25" fill="none" strokeLinecap="round">
            {datos.nodos.filter((n) => n.padre).map((n) => {
              const x0 = n.padre.cx + MARGEN, y0 = n.padre.cy + MARGEN;
              const x1 = n.cx + MARGEN, y1 = n.y + MARGEN;
              const medio = y0 + (y1 - y0) / 2;
              const r = Math.min(8, Math.abs(x1 - x0) / 2);
              const dir = x1 > x0 ? 1 : -1;
              const d = Math.abs(x1 - x0) < 1
                ? `M ${x0} ${y0} V ${y1}`
                : `M ${x0} ${y0} V ${medio - r} Q ${x0} ${medio} ${x0 + dir * r} ${medio} H ${x1 - dir * r} Q ${x1} ${medio} ${x1} ${medio + r} V ${y1}`;
              return <path key={`l-${n.id}`} d={d} />;
            })}
          </g>

          {/* Cajas */}
          {datos.nodos.map((n) => {
            const actual = String(n.id) === String(empresaId);
            const esRaiz = !n.padre;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x + MARGEN}, ${n.y + MARGEN})`}
                onClick={() => onSeleccionar && !actual && onSeleccionar(n.id)}
                style={{ cursor: actual ? 'default' : 'pointer' }}
              >
                <title>{`${n.nombre}${n.cif ? ` · ${n.cif}` : ''}${esRaiz ? ' · matriz' : ''}`}</title>
                <rect
                  width={ANCHO} height={ALTO} rx="9"
                  fill={actual ? 'url(#og-actual)' : 'url(#og-caja)'}
                  stroke={actual ? '#4FD9DE' : esRaiz ? '#F99001' : '#22566A'}
                  strokeWidth={actual ? 1.5 : 1}
                />
                {/* Banda de color a la izquierda: naranja la matriz, verde la ficha abierta */}
                {(esRaiz || actual) && (
                  <rect x="0" y="0" width="4" height={ALTO} rx="2" fill={actual ? '#4FD9DE' : '#F99001'} />
                )}
                <text x="12" y="18" fontSize="11" fontWeight="700" fill="#EAF4F7">
                  {recortar(n.nombre, 19)}
                </text>
                <text x="12" y="33" fontSize="9" fill="#7FA7B4">
                  {esRaiz ? 'Matriz' : 'Filial'}{n.cif ? ` · ${n.cif}` : ''}{n.es_proveedor ? ' · proveedor' : ''}
                </text>
                {actual && (
                  <circle cx={ANCHO - 11} cy="11" r="3.5" fill="#4FD9DE">
                    <title>Esta ficha</title>
                  </circle>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
