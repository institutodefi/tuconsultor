import { useMemo, useState } from 'react';
import { rangoGantt, posicionEn, procesosDe, ESTADOS_TAREA, aISO } from '../lib/zonaCliente.js';

// ════════════════════════════════════════════════════════════════════════════
// GANTT DEL PROYECTO
//
// Una barra por tarea entre su inicio y su fin (sesiones programadas, o la
// fecha estimada), agrupadas por proceso del mapa, con el color de su estado
// y la línea de hoy. Sirve para el cliente (su proyecto) y para el equipo
// (la misma vista, desde la ficha).
//
// Hecho con divs posicionados en porcentaje: se adapta al ancho y no hace
// falta ninguna librería.
// ════════════════════════════════════════════════════════════════════════════

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const etqMes = (clave) => { const [a, m] = clave.split('-'); return `${MESES[Number(m) - 1]} ${a.slice(2)}`; };
const fmt = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '—');

export default function GanttProyecto({ filas = [], proyecto = null, nombreDe = () => null, hoy = aISO(new Date()), compacto = false, onAbrir = null }) {
  const [abiertos, setAbiertos] = useState(null);   // null: todos abiertos
  const rango = useMemo(() => rangoGantt(filas, proyecto), [filas, proyecto]);
  const procesos = useMemo(() => procesosDe(filas), [filas]);
  const posHoy = posicionEn(rango, hoy);
  const estaAbierto = (k) => (abiertos ? abiertos.has(k) : true);
  const alternar = (k) => setAbiertos((a) => { const s = new Set(a || procesos.map((p) => p.codigo)); if (s.has(k)) s.delete(k); else s.add(k); return s; });

  if (!rango || !filas.length) return <p className="text-[12.5px] text-[#7FA7B4]">Todavía no hay tareas con fechas que pintar.</p>;

  const ANCHO_ETQ = compacto ? 200 : 300;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        {/* Cabecera de meses */}
        <div className="flex border-b border-[#1E5468]">
          <div style={{ width: ANCHO_ETQ }} className="shrink-0 px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Tarea</div>
          <div className="relative flex-1">
            <div className="flex">
              {rango.meses.map((m) => (
                <div key={m.clave} style={{ width: `${(m.dias / rango.totalDias) * 100}%` }}
                  className="border-l border-[#153F52] px-1 py-1.5 text-center text-[10px] font-extrabold uppercase tracking-wide text-[#9FC0CB]">
                  {etqMes(m.clave)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {procesos.map((pr) => (
          <div key={pr.codigo}>
            {/* Fila del proceso */}
            <div className="flex items-center border-b border-[#153F52] bg-[#0D3242]">
              <button onClick={() => alternar(pr.codigo)} style={{ width: ANCHO_ETQ }} className="flex shrink-0 items-center gap-1.5 px-2 py-1.5 text-left">
                <span className="text-[10px] text-[#7FA7B4]">{estaAbierto(pr.codigo) ? '▾' : '▸'}</span>
                <span className="truncate text-[11.5px] font-extrabold text-[#EAF4F7]" title={pr.nombre}>{pr.codigo} · {pr.nombre}</span>
                <span className="ml-auto shrink-0 text-[10px] font-bold text-[#7FA7B4]">{pr.pct} %</span>
              </button>
              <div className="relative h-7 flex-1">
                {posHoy != null && <span className="absolute top-0 h-full w-px bg-brand-orange/70" style={{ left: `${posHoy * 100}%` }} />}
                {(() => {
                  const ini = pr.tareas.map((t) => t.inicio).filter(Boolean).sort()[0];
                  const fin = pr.tareas.map((t) => t.fin).filter(Boolean).sort().slice(-1)[0];
                  if (!ini || !fin) return null;
                  const a = posicionEn(rango, ini), b = posicionEn(rango, fin);
                  return (
                    <span className="absolute top-2.5 h-2 rounded-full bg-white/15" style={{ left: `${a * 100}%`, width: `${Math.max(0.6, (b - a) * 100)}%` }}>
                      <span className="block h-full rounded-full bg-[#9FC0CB]/60" style={{ width: `${pr.pct}%` }} />
                    </span>
                  );
                })()}
              </div>
            </div>

            {estaAbierto(pr.codigo) && pr.tareas.map((t) => {
              const E = ESTADOS_TAREA[t.estado] || ESTADOS_TAREA.pendiente;
              const a = posicionEn(rango, t.inicio), b = posicionEn(rango, t.fin);
              const resp = nombreDe(t.responsableId);
              return (
                <div key={t.id} className="flex items-center border-b border-[#0F3646] hover:bg-white/[0.03]">
                  <div style={{ width: ANCHO_ETQ }} className="shrink-0 px-2 py-1">
                    <button onClick={() => onAbrir?.(t)} className={`block w-full truncate text-left text-[11.5px] ${onAbrir ? 'hover:text-brand-orange' : ''} text-[#DFF1F5]`} title={`${t.codigo ? `${t.codigo} · ` : ''}${t.titulo}`}>
                      <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: E.color }} />
                      {t.codigo && <code className="mr-1 text-[10.5px] font-bold text-brand-verdeTexto">{t.codigo}</code>}
                      {t.subproceso && !t.titulo.toUpperCase().startsWith(t.subproceso.replace(' ', '')) && !t.titulo.toUpperCase().startsWith(t.subproceso) && <span className="mr-1 text-[10px] font-bold text-[#9FC0CB]">{t.subproceso}</span>}
                      {t.titulo}
                    </button>
                    {!compacto && <span className="block truncate pl-3 text-[10px] text-[#7FA7B4]">{resp || 'sin responsable'}{t.horas ? ` · ${t.horas} h` : ''}</span>}
                  </div>
                  <div className={`relative flex-1 ${compacto ? 'h-6' : 'h-8'}`}>
                    {posHoy != null && <span className="absolute top-0 h-full w-px bg-brand-orange/40" style={{ left: `${posHoy * 100}%` }} />}
                    {a != null && b != null && (
                      <span title={`${fmt(t.inicio)} → ${fmt(t.fin)} · ${E.etq} · ${t.pct} %`}
                        className="absolute top-1/2 h-3.5 -translate-y-1/2 overflow-hidden rounded-md border"
                        style={{ left: `${a * 100}%`, width: `${Math.max(0.8, (b - a) * 100)}%`, borderColor: E.color, background: `${E.color}33` }}>
                        <span className="block h-full" style={{ width: `${t.pct}%`, background: E.color }} />
                      </span>
                    )}
                    {a == null && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[#5E8494]">sin fecha</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div className="mt-2 flex flex-wrap gap-3 px-2 text-[10.5px] text-[#9FC0CB]">
          {Object.entries(ESTADOS_TAREA).map(([k, e]) => (
            <span key={k} className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: e.color }} />{e.etq}</span>
          ))}
          <span className="flex items-center gap-1"><span className="inline-block h-3 w-px bg-brand-orange" />hoy</span>
        </div>
      </div>
    </div>
  );
}
