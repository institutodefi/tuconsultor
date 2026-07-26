import { useMemo } from 'react';
import { arbolGrupo, raizDelGrupo, tamanoGrupo } from '../lib/crm.js';

// ════════════════════════════════════════════════════════════════════════════
// Organigrama del grupo empresarial (SVG, sin dependencias).
// Se pinta solo cuando la empresa seleccionada tiene matriz o filiales.
// Layout tipo «tidy tree»: las hojas ocupan carriles fijos y cada padre se
// centra sobre sus hijos.
// ════════════════════════════════════════════════════════════════════════════

const ANCHO = 196, ALTO = 58, HUECO_X = 22, HUECO_Y = 74, MARGEN = 16;

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

export default function OrganigramaGrupo({ empresas, empresaId, onSeleccionar }) {
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
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-extrabold uppercase tracking-wide text-[#9FC0CB]">Estructura del grupo</h4>
          <p className="mt-0.5 text-xs text-[#7FA7B4]">
            Cabecera: <strong className="text-[#EAF4F7]">{datos.raiz.nombre}</strong> · {datos.total} empresas
          </p>
        </div>
        <span className="chip bg-brand-verde/15 text-brand-verdeTexto">Matriz → filiales</span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${vbW} ${vbH}`}
          width="100%"
          style={{ minWidth: Math.min(vbW, 620), maxHeight: 520 }}
          role="img"
          aria-label={`Organigrama del grupo ${datos.raiz.nombre}`}
        >
          {/* Conectores: salida vertical del padre, tramo horizontal, entrada al hijo */}
          <g stroke="#1E5468" strokeWidth="1.5" fill="none">
            {datos.nodos.filter((n) => n.padre).map((n) => {
              const y0 = n.padre.cy + MARGEN;
              const y1 = n.y + MARGEN;
              const medio = y0 + (y1 - y0) / 2;
              return (
                <path
                  key={`l-${n.id}`}
                  d={`M ${n.padre.cx + MARGEN} ${y0} V ${medio} H ${n.cx + MARGEN} V ${y1}`}
                />
              );
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
                <rect
                  width={ANCHO} height={ALTO} rx="12"
                  fill={actual ? '#12454A' : '#0D3242'}
                  stroke={actual ? '#1FA1A6' : esRaiz ? '#F99001' : '#1E5468'}
                  strokeWidth={actual ? 2 : 1.5}
                />
                <text x="14" y="23" fontSize="12.5" fontWeight="700" fill="#EAF4F7">
                  {recortar(n.nombre, 24)}
                </text>
                <text x="14" y="41" fontSize="10.5" fill="#7FA7B4">
                  {n.cif || 'sin CIF'}
                  {n.es_proveedor ? ' · proveedor' : ''}
                </text>
                {esRaiz && (
                  <text x={ANCHO - 12} y="16" fontSize="8.5" fontWeight="800" fill="#F99001" textAnchor="end">
                    MATRIZ
                  </text>
                )}
                {actual && (
                  <text x={ANCHO - 12} y={ALTO - 10} fontSize="8.5" fontWeight="800" fill="#4FD9DE" textAnchor="end">
                    ESTA FICHA
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-2 text-[11px] text-[#7FA7B4]">Pulsa cualquier caja para abrir esa ficha.</p>
    </div>
  );
}
