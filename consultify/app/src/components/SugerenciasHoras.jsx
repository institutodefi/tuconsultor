import { useEffect, useMemo, useState } from 'react';
import { listTable, updateRow } from '../lib/data.js';
import { useAuth } from '../lib/auth.jsx';
import { can } from '../lib/permisos.js';
import { aprender, comunes } from '../lib/aprendizajeHoras.js';
import { numeroES } from '../lib/formato.js';

// ════════════════════════════════════════════════════════════════════════════
// LO QUE DICEN TUS PROYECTOS · sugerencias sobre las horas del catálogo
//
// Colgado del informe de rentabilidad, porque es la misma pregunta vista por
// el otro lado: el informe dice si una oferta encaja con el precio; esto dice
// si las horas con las que se calculó ese precio se parecen a la realidad.
//
// No es un modelo que adivine: es aritmética sobre vuestros propios datos, y
// cada sugerencia enseña de cuántos casos sale. Una sugerencia sin muestra es
// una opinión, y una opinión no debería mover el precio de nada.
//
// Cuando todavía no hay tareas cerradas con horas imputadas, se dice. Una
// lista vacía sin explicación se lee como «todo bien», y no es lo mismo «no
// hay desviaciones» que «no hay con qué medirlas».
// ════════════════════════════════════════════════════════════════════════════

const pct = (x) => `${x > 0 ? '+' : '−'}${Math.abs(Math.round(x * 100))} %`;
const CONFIANZA = {
  alta:  { etq: 'muestra sólida',   color: 'text-emerald-300' },
  media: { etq: 'muestra corta',    color: 'text-amber-200' },
  baja:  { etq: 'muy pocos casos',  color: 'text-[#9FC0CB]' },
};

export default function SugerenciasHoras({ ofertas = [] }) {
  const { role } = useAuth();
  const puedeAplicar = can.editarCatalogoTareas(role);
  const [abierto, setAbierto] = useState(false);
  const [catalogo, setCatalogo] = useState(null);
  const [tareas, setTareas] = useState([]);
  const [msg, setMsg] = useState(null);
  const [aplicando, setAplicando] = useState(null);

  useEffect(() => {
    if (!abierto || catalogo) return;
    Promise.all([listTable('tareas_catalogo').catch(() => []), listTable('cliente_tareas').catch(() => [])])
      .then(([c, t]) => { setCatalogo(c || []); setTareas(t || []); });
  }, [abierto, catalogo]);

  const r = useMemo(() => {
    if (!catalogo) return null;
    const base = aprender({ catalogo, tareasCliente: tareas });
    // Las tareas comunes dependen del alcance de cada oferta: se calculan por
    // oferta y se agregan, quedándose con el mayor ahorro de cada subproceso.
    const porClave = new Map();
    for (const o of ofertas) {
      if (!Array.isArray(o.normas) || o.normas.length < 2) continue;
      for (const c of comunes({ catalogo, normas: o.normas, modelo: o.modelo })) {
        const prev = porClave.get(c.clave);
        if (!prev || c.ahorro > prev.ahorro) porClave.set(c.clave, { ...c, ofertas: 1 });
        else prev.ofertas += 1;
      }
    }
    return { ...base, comunes: [...porClave.values()].sort((a, b) => b.ahorro - a.ahorro) };
  }, [catalogo, tareas, ofertas]);

  async function aplicar(s) {
    if (!puedeAplicar || !s.ids?.length) return;
    setAplicando(s.clave || s.subproceso); setMsg(null);
    try {
      for (const id of s.ids) await updateRow('tareas_catalogo', id, { horas_base: s.sugerido });
      setCatalogo((cs) => cs.map((c) => (s.ids.includes(c.id) ? { ...c, horas_base: s.sugerido } : c)));
      setMsg(`«${s.subproceso}» pasa a ${numeroES(s.sugerido, null)} h en ${s.ids.length} fila(s) del catálogo.`);
    } catch (e) { setMsg(`No se pudo aplicar: ${e?.message || e}`); }
    finally { setAplicando(null); }
  }

  const nada = r && !r.desviaciones.length && !r.comunes.length && !r.dispersion.length;

  return (
    <section className="card mb-4">
      <button onClick={() => setAbierto((v) => !v)} className="text-left">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-brand-orange">
          {abierto ? '▾' : '▸'} Lo que dicen tus proyectos · sugerencias sobre las horas del catálogo
        </h2>
        <p className="mt-0.5 text-[12px] text-[#9FC0CB]">
          {!abierto ? 'Desviaciones entre lo planificado y lo imputado, tareas que se repiten en varias normas y horas descuadradas entre normas.'
            : !r ? 'Leyendo el catálogo y las tareas…'
            : `${r.desviaciones.length} desviación(es) · ${r.comunes.length} tarea(s) común(es) · ${r.dispersion.length} descuadre(s)`}
        </p>
      </button>

      {abierto && r && (
        <div className="mt-3 space-y-4">
          {msg && <p className="rounded-xl bg-brand-orange/10 px-3 py-2 text-[12.5px] font-bold text-brand-orange">{msg}</p>}

          {/* Lo primero, de qué muestra estamos hablando. */}
          <p className="rounded-xl border border-[#1E5468] bg-[#0D3242] px-3 py-2 text-[12px] text-[#9FC0CB]">
            {r.muestra.tareasCerradas
              ? <>Medido sobre <b className="text-[#EAF4F7]">{r.muestra.tareasCerradas}</b> tarea(s) cerradas con horas imputadas, de {r.muestra.tareasCliente} planificadas.</>
              : <>Todavía <b className="text-[#EAF4F7]">no hay tareas cerradas con horas imputadas</b>, así que no se puede comparar lo planificado con lo real: eso empieza a salir cuando el equipo cierre tareas con sus horas. Mientras tanto, lo que sí se puede mirar es el propio catálogo.</>}
          </p>

          {nada && <p className="text-[12.5px] text-[#7FA7B4]">Nada que señalar con los datos de hoy.</p>}

          {r.desviaciones.length > 0 && (
            <div>
              <p className="label">Lo planificado contra lo imputado</p>
              <div className="space-y-1.5">
                {r.desviaciones.slice(0, 12).map((s) => (
                  <Fila key={s.clave} titulo={s.subproceso} sub={s.proceso}
                    cuerpo={<>Plan <b className="text-[#EAF4F7]">{numeroES(s.plan, null)} h</b> · real <b className={s.dif > 0 ? 'text-red-300' : 'text-emerald-300'}>{numeroES(s.real, null)} h</b> <span className={s.dif > 0 ? 'text-red-300' : 'text-emerald-300'}>({pct(s.pct)})</span></>}
                    pie={<><span className={CONFIANZA[s.confianza].color}>{s.casos} caso(s) · {CONFIANZA[s.confianza].etq}</span></>}
                    accion={puedeAplicar && s.confianza !== 'baja' ? { etq: `Poner ${numeroES(s.sugerido, null)} h`, on: () => aplicar(s), ocupado: aplicando === s.clave } : null} />
                ))}
              </div>
            </div>
          )}

          {r.comunes.length > 0 && (
            <div>
              <p className="label">Se hacen una vez y se planifican varias</p>
              <p className="campo-nota mb-1.5">
                La gestión del contexto o la auditoría interna se hacen una sola vez aunque se certifiquen tres normas.
                Si el plan las cuenta tres veces, o sobran horas en la oferta o se regalan en la ejecución. Cuál de las dos, lo decides tú: aquí solo se señala.
              </p>
              <div className="space-y-1.5">
                {r.comunes.slice(0, 12).map((s) => (
                  <Fila key={s.clave} titulo={s.subproceso} sub={s.proceso}
                    cuerpo={<>En <b className="text-[#EAF4F7]">{s.normas.join(', ')}</b> · suman {numeroES(s.suma, null)} h y hacerlas una vez cuesta {numeroES(s.mayor, null)} h</>}
                    pie={<span className="text-brand-orange">diferencia {numeroES(s.ahorro, null)} h</span>} />
                ))}
              </div>
            </div>
          )}

          {r.dispersion.length > 0 && (
            <div>
              <p className="label">El mismo trabajo con horas muy distintas según la norma</p>
              <p className="campo-nota mb-1.5">A veces está justificado. Muchas veces es que una se quedó sin actualizar.</p>
              <div className="space-y-1.5">
                {r.dispersion.slice(0, 10).map((s, i) => (
                  <Fila key={`${s.subproceso}-${s.modelo}-${i}`} titulo={s.subproceso} sub={`${s.proceso} · ${s.modelo}`}
                    cuerpo={<>De <b className="text-[#EAF4F7]">{numeroES(s.min, null)}</b> a <b className="text-[#EAF4F7]">{numeroES(s.max, null)} h</b> en {s.normas} normas · media {numeroES(s.media, null)} h</>}
                    accion={puedeAplicar ? { etq: `Igualar a ${numeroES(s.sugerido, null)} h`, on: () => aplicar({ ...s, clave: `${s.subproceso}|${s.modelo}` }), ocupado: aplicando === `${s.subproceso}|${s.modelo}` } : null} />
                ))}
              </div>
            </div>
          )}

          <p className="text-[10.5px] leading-snug text-[#5E8494]">
            Solo se miran tareas cerradas con horas imputadas: una tarea a medias con pocas horas no dice que se tarde menos, dice que no ha terminado.
            Se ignoran las desviaciones por debajo del 20 %, que son ruido. Aplicar una sugerencia cambia `horas_base` en el catálogo y, con ello, el precio de las ofertas que se emitan a partir de entonces; las ya emitidas no se tocan.
          </p>
        </div>
      )}
    </section>
  );
}

function Fila({ titulo, sub, cuerpo, pie, accion }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[#1E5468] bg-[#0A2B3A] px-3 py-2">
      <div className="min-w-[200px] flex-1">
        <p className="text-[12.5px] font-extrabold leading-tight text-[#EAF4F7]">{titulo}</p>
        {sub && <p className="text-[10.5px] font-semibold text-[#5F8494]">{sub}</p>}
      </div>
      <p className="text-[12px] text-[#9FC0CB]">{cuerpo}</p>
      {pie && <p className="text-[11px] font-bold">{pie}</p>}
      {accion && (
        <button onClick={accion.on} disabled={accion.ocupado}
          className="shrink-0 rounded-lg border border-[#1E5468] px-2.5 py-1 text-[11.5px] font-bold text-[#9FC0CB] transition hover:border-brand-orange hover:text-[#EAF4F7] disabled:opacity-50">
          {accion.ocupado ? 'Aplicando…' : accion.etq}
        </button>
      )}
    </div>
  );
}
