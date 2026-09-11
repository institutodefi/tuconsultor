import { useMemo, useState } from 'react';
import { arbolGrupo, raizDelGrupo, tamanoGrupo, nombreVisible } from '../lib/crm.js';
import { updateRow, explicarErrorBd } from '../lib/data.js';

// ════════════════════════════════════════════════════════════════════════════
// Organigrama del grupo empresarial (SVG, sin dependencias).
// Layout tipo «tidy tree»: las hojas ocupan carriles fijos y cada padre se
// centra sobre sus hijos.
//
// ARRASTRAR Y SOLTAR (quien puede editar):
//   · una caja sobre otra → pasa a ser filial de esa (empresa_matriz_id);
//   · una caja sobre «Sacar del grupo» → deja de colgar de nadie;
//   · una empresa de la lista lateral («Añadir al grupo») sobre una caja →
//     entra en el grupo como filial de esa caja.
// No se puede colgar una empresa de sí misma ni de una de sus filiales (se
// crearía un bucle): esas cajas se apagan mientras se arrastra. Cada gesto
// guarda en la base al soltar; no hay botón de guardar.
// ════════════════════════════════════════════════════════════════════════════

// Cajas pequeñas: un grupo de seis empresas tiene que caber en la ficha sin
// convertirse en un póster. El SVG se pinta a su tamaño natural (no se estira
// al ancho de la tarjeta) y, si no cabe, se desplaza en horizontal.
const ANCHO = 150, ALTO = 44, HUECO_X = 14, HUECO_Y = 80, MARGEN = 10;
const S = (v) => String(v ?? '');

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

/** Ids de una empresa y todas sus filiales (donde NO se puede colgar). */
export function descendientes(empresas, id) {
  const out = new Set([S(id)]);
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (const e of empresas) if (e.empresa_matriz_id && out.has(S(e.empresa_matriz_id)) && !out.has(S(e.id))) { out.add(S(e.id)); cambio = true; }
  }
  return out;
}

export default function OrganigramaGrupo({ empresas, empresaId, onSeleccionar, desnudo = false, puedeEditar = false, onCambio }) {
  const [arrastrando, setArrastrando] = useState(null);   // id de la empresa que se mueve
  const [sobre, setSobre] = useState(null);               // id de la caja bajo el cursor ('__fuera' = sacar)
  const [busca, setBusca] = useState('');
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const datos = useMemo(() => {
    const raiz = raizDelGrupo(empresas, empresaId);
    if (!raiz) return null;
    const arbol = arbolGrupo(empresas, raiz.id);
    if (!arbol) return null;
    return { raiz, ...aplanar(arbol), total: tamanoGrupo(arbol) };
  }, [empresas, empresaId]);

  const enGrupo = useMemo(() => new Set((datos?.nodos || []).map((n) => S(n.id))), [datos]);
  const prohibidas = useMemo(() => (arrastrando ? descendientes(empresas, arrastrando) : new Set()), [empresas, arrastrando]);
  const fuera = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return empresas.filter((e) => !enGrupo.has(S(e.id)))
      .filter((e) => !t || `${e.nombre} ${e.nombre_comercial || ''} ${e.cif || ''}`.toLowerCase().includes(t))
      .sort((a, b) => nombreVisible(a).localeCompare(nombreVisible(b), 'es')).slice(0, 25);
  }, [empresas, enGrupo, busca]);

  if (!datos) return null;
  // Sin grupo y sin permiso para crearlo: nada que enseñar.
  if (datos.total < 2 && !puedeEditar) return null;

  const alturaTotal = Math.max(...datos.nodos.map((n) => n.y)) + ALTO;
  const vbW = datos.ancho + MARGEN * 2;
  const vbH = alturaTotal + MARGEN * 2;
  const nombreDe = (id) => { const e = empresas.find((x) => S(x.id) === S(id)); return e ? nombreVisible(e) : '—'; };

  async function colgar(hijoId, matrizId) {
    if (!puedeEditar || !hijoId) return;
    if (matrizId && (S(matrizId) === S(hijoId) || descendientes(empresas, hijoId).has(S(matrizId)))) { setMsg({ err: true, t: 'Una empresa no puede colgar de sí misma ni de una de sus filiales.' }); return; }
    const hijo = empresas.find((e) => S(e.id) === S(hijoId));
    if (!hijo) return;
    if (S(hijo.empresa_matriz_id || '') === S(matrizId || '')) return;   // nada que cambiar
    setOcupado(true); setMsg(null);
    try {
      await updateRow('empresas', hijo.id, { empresa_matriz_id: matrizId || null });
      const fin = (t) => (t.endsWith('.') ? t : `${t}.`);
      setMsg({ err: false, t: fin(matrizId ? `${nombreVisible(hijo)} ahora es filial de ${nombreDe(matrizId)}` : `${nombreVisible(hijo)} ya no cuelga de nadie`) });
      onCambio?.();
    } catch (e) { setMsg({ err: true, t: explicarErrorBd(e, 'empresas') }); }
    finally { setOcupado(false); }
  }

  const empezar = (e, id) => {
    if (!puedeEditar || ocupado) return;
    setArrastrando(S(id)); e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', S(id)); } catch { /* Safari */ }
  };
  const terminar = () => { setArrastrando(null); setSobre(null); };
  const puedeSoltarEn = (id) => !!arrastrando && !prohibidas.has(S(id));
  const soltar = (e, id) => { e.preventDefault(); const h = arrastrando; terminar(); if (h && !descendientes(empresas, h).has(S(id))) colgar(h, id); };

  return (
    <div className={desnudo ? '' : 'card'}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">
          Estructura del grupo
          <span className="ml-2 font-bold normal-case tracking-normal text-[#9FC0CB]">{datos.raiz.nombre} · {datos.total} {datos.total === 1 ? 'empresa' : 'empresas'}</span>
        </p>
        <span className="text-[10.5px] text-[#5E8494]">{puedeEditar ? 'Arrastra una caja sobre otra para colgarla de ella · pulsa para abrir la ficha' : 'Pulsa una caja para abrir su ficha'}</span>
      </div>
      {msg && <p className={`mb-2 text-[11.5px] font-bold ${msg.err ? 'text-red-300' : 'text-emerald-300'}`}>{msg.t}</p>}

      <div className={`grid gap-2 ${puedeEditar ? 'lg:grid-cols-[1fr_220px]' : ''}`}>
        <div className="overflow-x-auto rounded-xl border border-[#153F52] bg-[#0A2634] p-2">
          {/* Las líneas van en SVG; las cajas son HTML encima, porque el
              arrastrar/soltar del navegador no funciona sobre elementos SVG. */}
          <div className="relative mx-auto" style={{ width: vbW, height: vbH }} role="img" aria-label={`Organigrama del grupo ${datos.raiz.nombre}`}>
            <svg viewBox={`0 0 ${vbW} ${vbH}`} width={vbW} height={vbH} className="absolute inset-0" style={{ pointerEvents: 'none' }}>
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
                  return <path key={`l-${n.id}`} d={d} opacity={arrastrando === S(n.id) ? 0.3 : 1} />;
                })}
              </g>
            </svg>

            {datos.nodos.map((n) => {
              const actual = S(n.id) === S(empresaId);
              const esRaiz = !n.padre;
              const moviendo = arrastrando === S(n.id);
              const destino = sobre === S(n.id) && puedeSoltarEn(n.id);
              const apagada = !!arrastrando && prohibidas.has(S(n.id));
              return (
                <div
                  key={n.id}
                  className={`absolute select-none rounded-[9px] border px-3 py-1.5 transition-colors ${destino ? 'border-2 border-dashed border-brand-orange bg-[#3A2A0C]' : actual ? 'border-[1.5px] border-[#4FD9DE] bg-gradient-to-b from-[#15505A] to-[#10424A]' : esRaiz ? 'border-brand-orange bg-gradient-to-b from-[#123C4D] to-[#0D3242]' : 'border-[#22566A] bg-gradient-to-b from-[#123C4D] to-[#0D3242]'}`}
                  style={{ left: n.x + MARGEN, top: n.y + MARGEN, width: ANCHO, height: ALTO, opacity: apagada ? 0.35 : moviendo ? 0.6 : 1, cursor: puedeEditar ? 'grab' : actual ? 'default' : 'pointer' }}
                  title={`${n.nombre}${n.cif ? ` · ${n.cif}` : ''}${esRaiz ? ' · matriz' : ''}${puedeEditar ? ' · arrastra para recolocar' : ''}`}
                  onClick={() => !arrastrando && onSeleccionar && !actual && onSeleccionar(n.id)}
                  draggable={puedeEditar && !ocupado}
                  onDragStart={(e) => empezar(e, n.id)}
                  onDragEnd={terminar}
                  onDragOver={(e) => { if (puedeSoltarEn(n.id)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (sobre !== S(n.id)) setSobre(S(n.id)); } }}
                  onDragLeave={() => { if (sobre === S(n.id)) setSobre(null); }}
                  onDrop={(e) => soltar(e, n.id)}
                >
                  {(esRaiz || actual) && <span className="absolute left-0 top-0 h-full w-1 rounded-l-[9px]" style={{ background: actual ? '#4FD9DE' : '#F99001' }} />}
                  <span className="block truncate text-[11px] font-bold leading-tight text-[#EAF4F7]">{n.nombre}</span>
                  <span className="block truncate text-[9px] leading-tight text-[#7FA7B4]">
                    {destino ? 'Soltar aquí: pasa a ser filial' : `${esRaiz ? 'Matriz' : 'Filial'}${n.cif ? ` · ${n.cif}` : ''}${n.es_proveedor ? ' · proveedor' : ''}`}
                  </span>
                  {actual && <span className="absolute right-2 top-2 h-[7px] w-[7px] rounded-full bg-[#4FD9DE]" title="Esta ficha" />}
                </div>
              );
            })}
          </div>

          {/* Zona para sacar del grupo: solo aparece mientras se arrastra una filial. */}
          {puedeEditar && arrastrando && S(datos.raiz.id) !== arrastrando && enGrupo.has(arrastrando) && (
            <div
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (sobre !== '__fuera') setSobre('__fuera'); }}
              onDragLeave={() => { if (sobre === '__fuera') setSobre(null); }}
              onDrop={(e) => { e.preventDefault(); const h = arrastrando; terminar(); colgar(h, null); }}
              className={`mt-2 rounded-lg border border-dashed px-3 py-2 text-center text-[11.5px] font-bold transition ${sobre === '__fuera' ? 'border-red-400 bg-red-500/15 text-red-200' : 'border-[#1E5468] text-[#9FC0CB]'}`}>
              ⤴ Sacar del grupo (deja de colgar de nadie)
            </div>
          )}
        </div>

        {/* Lista para añadir empresas al grupo arrastrándolas sobre una caja. */}
        {puedeEditar && (
          <div className="rounded-xl border border-[#153F52] bg-[#0B2E3D] p-2">
            <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Añadir al grupo</p>
            <p className="mt-0.5 text-[10.5px] text-[#5E8494]">Arrastra una empresa de aquí sobre la caja de la que debe colgar.</p>
            <input className="input mt-1.5 !py-1 !text-[11.5px]" placeholder="Buscar empresa…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <ul className="mt-1.5 max-h-56 space-y-1 overflow-y-auto">
              {fuera.length === 0 && <li className="text-[11px] text-[#7FA7B4]">{busca ? 'Nada con ese nombre.' : 'Todas las empresas están en este grupo.'}</li>}
              {fuera.map((e) => (
                <li key={e.id} draggable={!ocupado} onDragStart={(ev) => empezar(ev, e.id)} onDragEnd={terminar}
                  className={`cursor-grab rounded-lg border px-2 py-1 text-[11.5px] active:cursor-grabbing ${arrastrando === S(e.id) ? 'border-brand-orange bg-brand-orange/15' : 'border-[#1E5468] bg-[#0D3242] hover:border-brand-orange/60'}`}
                  title="Arrastra sobre una caja del organigrama">
                  <span className="block truncate font-bold text-[#EAF4F7]">{nombreVisible(e)}</span>
                  <span className="block truncate text-[10.5px] text-[#7FA7B4]">{e.cif || 'sin CIF'}{e.empresa_matriz_id ? ' · en otro grupo' : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
