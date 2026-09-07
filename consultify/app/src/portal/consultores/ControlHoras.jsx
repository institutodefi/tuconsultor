import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listTable } from '../../lib/data.js';
import { useAuth } from '../../lib/auth.jsx';
import { getFestivos, getVacacionesTodas, getTareasInternas, MESES, TIPO_BY_ID } from '../../lib/agenda.js';
import { cargarReglas } from '../../lib/reglasComerciales.js';
import { controlHoras, VEREDICTO } from '../../lib/controlHoras.js';

// ════════════════════════════════════════════════════════════════════════════
// CONTROL DE HORAS · ¿a quién le cabe otro proyecto?
//
// Una ficha por consultor con sus proyectos y, por cada uno, las horas
// comprometidas, programadas, ejecutadas y pendientes. Debajo, el total y la
// capacidad: el 70 % de su jornada mensual va a proyectos, el 10 % a gestión
// y coordinación y el 20 % a procesos internos.
//
// El veredicto sale de comparar la carga mensual que exigen los proyectos
// vivos (pendientes ÷ meses que quedan) con la capacidad de producción del
// mes. Los números se calculan en lib/controlHoras.js; aquí solo se pintan.
// ════════════════════════════════════════════════════════════════════════════

const h1 = (n) => `${(Math.round((Number(n) || 0) * 10) / 10).toLocaleString('es-ES')} h`;
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);
const fmtF = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' }) : '—');

/** Barra de una bolsa del mes: programado sobre capacidad, con lo hecho dentro. */
function Bolsa({ etq, corto, datos, color }) {
  const p = Math.min(100, pct(datos.programadas, datos.capacidad));
  const e = Math.min(100, pct(datos.ejecutadas, datos.capacidad));
  const pasado = datos.programadas > datos.capacidad + 0.05;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
        <span className="truncate font-bold text-[#CFE3E9]"><span className="mr-1 rounded bg-[#0D3242] px-1 text-[9.5px] text-[#9FC0CB]">{corto}</span>{etq}</span>
        <span className={`whitespace-nowrap font-bold ${pasado ? 'text-red-300' : 'text-[#9FC0CB]'}`}>
          {h1(datos.programadas)} <span className="font-medium text-[#7FA7B4]">/ {h1(datos.capacidad)}</span>
        </span>
      </div>
      <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-[#0D3242]">
        <div className="absolute inset-y-0 left-0 rounded-full opacity-45" style={{ width: `${p}%`, background: pasado ? '#DC2626' : color }} />
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${e}%`, background: pasado ? '#DC2626' : color }} title={`${h1(datos.ejecutadas)} hechas`} />
      </div>
    </div>
  );
}

function Cifra({ etq, v, sub, tono = 'text-[#EAF4F7]' }) {
  return (
    <div className="rounded-xl border border-[#1E5468] bg-[#0D3242] px-3 py-2">
      <p className={`text-lg font-extrabold leading-none ${tono}`}>{v}</p>
      <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{etq}</p>
      {sub && <p className="mt-0.5 text-[10.5px] text-[#7FA7B4]">{sub}</p>}
    </div>
  );
}

export default function ControlHoras() {
  const { user, role } = useAuth();
  const verTodos = ['superadmin', 'admin', 'director'].includes(role);
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);
  const [abiertos, setAbiertos] = useState(new Set());
  const [soloConCarga, setSoloConCarga] = useState(false);

  useEffect(() => {
    let vivo = true;
    const year = new Date().getFullYear();
    (async () => {
      try {
        // El reparto 70/10/20 puede venir de la BD; se carga antes de calcular.
        await cargarReglas().catch(() => {});
        const [consultores, proyectos, equipo, tareas, sesiones, clientes, empresas, festivos, vacaciones, internas] = await Promise.all([
          listTable('consultores').catch(() => []),
          listTable('proyectos_cliente').catch(() => []),
          listTable('proyecto_equipo').catch(() => []),
          listTable('cliente_tareas').catch(() => []),
          listTable('tarea_sesiones').catch(() => []),
          listTable('clientes').catch(() => []),
          listTable('empresas').catch(() => []),
          getFestivos(year).catch(() => []),
          getVacacionesTodas(year).catch(() => []),
          // Si la v116 no está aplicada aún, la tabla no existe: se sigue sin ella.
          getTareasInternas().catch(() => []),
        ]);
        if (vivo) setD({ consultores, proyectos, equipo, tareas, sesiones, clientes, empresas, festivos, vacaciones, internas });
      } catch (e) { if (vivo) setError(e?.message || String(e)); }
    })();
    return () => { vivo = false; };
  }, []);

  const r = useMemo(() => (d ? controlHoras(d) : null), [d]);

  const filas = useMemo(() => {
    if (!r) return [];
    let f = r.consultores;
    // Consultoría ve su propia ficha; quien reparte trabajo, todas.
    if (!verTodos) f = f.filter((c) => String(c.id) === String(user?.id));
    if (soloConCarga) f = f.filter((c) => c.proyectos.length);
    return f;
  }, [r, verTodos, user?.id, soloConCarga]);

  const resumen = useMemo(() => {
    if (!r) return null;
    const cs = verTodos ? r.consultores : filas;
    const suma = (fn) => cs.reduce((a, c) => a + fn(c), 0);
    return {
      n: cs.length,
      capacidad: suma((c) => c.mes.produccion.capacidad),
      carga: suma((c) => c.total.cargaMensual),
      pendientes: suma((c) => c.total.pendientes),
      entran: cs.filter((c) => c.veredicto === 'entra').length,
      llenos: cs.filter((c) => c.veredicto === 'lleno').length,
    };
  }, [r, filas, verTodos]);

  const toggle = (id) => setAbiertos((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (error) return <p className="rounded-lg bg-red-500/12 px-3 py-2 text-[12.5px] font-bold text-red-200">{error}</p>;
  if (!r) return <p className="font-semibold text-[#9FC0CB]">Calculando horas…</p>;

  const mesEtq = `${MESES[Number(r.mesActual.slice(5, 7)) - 1]} ${r.mesActual.slice(0, 4)}`;
  const rp = r.reparto;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Agendas</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#EAF4F7]">Control de horas</h1>
          <p className="mt-1 max-w-3xl text-sm text-[#9FC0CB]">
            Por consultor: sus proyectos, las horas comprometidas, programadas, ejecutadas y pendientes, y si le cabe otro proyecto.
            La jornada se reparte {Math.round(rp.produccion * 100)} % a proyectos, {Math.round(rp.gestion * 100)} % a gestión y coordinación
            y {Math.round(rp.proceso_interno * 100)} % a procesos internos.
          </p>
        </div>
        {verTodos && (
          <label className="flex items-center gap-2 text-[12px] font-bold text-[#9FC0CB]">
            <input type="checkbox" checked={soloConCarga} onChange={(e) => setSoloConCarga(e.target.checked)} />
            Solo con proyectos
          </label>
        )}
      </div>

      {/* ── Resumen del equipo ── */}
      {resumen && verTodos && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Cifra etq="Consultores" v={resumen.n} sub="activos" />
          <Cifra etq={`Capacidad · ${mesEtq}`} v={h1(resumen.capacidad)} sub={`${Math.round(rp.produccion * 100)} % de la jornada, en proyectos`} />
          <Cifra etq="Carga mensual exigida" v={h1(resumen.carga)} sub="pendientes ÷ meses que quedan"
            tono={resumen.carga > resumen.capacidad ? 'text-red-300' : 'text-[#EAF4F7]'} />
          <Cifra etq="Pendiente total" v={h1(resumen.pendientes)} sub="comprometido y aún no hecho" />
          <Cifra etq="Les entra otro proyecto" v={`${resumen.entran} / ${resumen.n}`}
            sub={resumen.llenos ? `${resumen.llenos} sin capacidad` : 'nadie saturado'}
            tono={resumen.entran ? 'text-emerald-300' : 'text-amber-200'} />
        </div>
      )}

      {r.sinEquipo.length > 0 && verTodos && (
        <div className="rounded-xl border border-amber-300/40 bg-amber-400/10 px-3 py-2.5 text-[12px] text-amber-100">
          <p className="font-extrabold">{r.sinEquipo.length === 1 ? 'Un proyecto sin equipo' : `${r.sinEquipo.length} proyectos sin equipo`}: sus horas no cuentan en nadie.</p>
          <p className="mt-0.5 text-amber-100/80">
            {r.sinEquipo.map((p) => `${p.codigo || p.nombre} (${h1(p.horas)})`).join(' · ')}. Asigna el equipo en <Link to="../proyectos" className="font-bold underline">Proyectos</Link>.
          </p>
        </div>
      )}

      {/* ── Una ficha por consultor ── */}
      {filas.length === 0 && (
        <p className="card py-6 text-center text-[12.5px] text-[#7FA7B4]">
          {verTodos ? 'No hay consultores activos.' : 'No encontramos tu ficha de consultor. Pide que asocien tu correo en Accesos.'}
        </p>
      )}

      {filas.map((c) => {
        const V = VEREDICTO[c.veredicto];
        const abierto = abiertos.has(c.id) || !verTodos || filas.length <= 3;
        return (
          <div key={c.id} className="card !p-0 overflow-hidden">
            {/* Cabecera: quién, veredicto y las cuatro cifras */}
            <button onClick={() => toggle(c.id)} className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#0D3242]/60">
              <div className="min-w-0">
                <p className="text-[15px] font-extrabold text-[#EAF4F7]">
                  {c.nombre}
                  {c.nivel && <span className="chip ml-2 bg-[#0D3242] text-[#9FC0CB]">{c.nivel}</span>}
                  <span className="chip ml-1 bg-[#0D3242] text-[#9FC0CB]">jornada {c.pctJornada}%</span>
                </p>
                <p className="mt-0.5 text-[11.5px] text-[#7FA7B4]">
                  {c.proyectos.length} proyecto{c.proyectos.length === 1 ? '' : 's'} · {mesEtq}: {c.mes.laborables} días laborables
                  {c.mes.diasVacaciones ? ` (${c.mes.diasVacaciones} de vacaciones)` : ''} · {h1(c.mes.jornada)} de jornada
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-lg border px-2.5 py-1 text-[12px] font-extrabold ${V.fondo} ${V.tono}`}>
                  {V.etq}
                </span>
                <span className="text-[11.5px] font-bold text-[#9FC0CB]">
                  {c.margenMensual >= 0 ? `${h1(c.margenMensual)} libres al mes` : `${h1(-c.margenMensual)} de más al mes`}
                  {c.veredicto === 'entra' && r.proyectoTipico ? ` · caben ${c.cabenProyectos} como los actuales` : ''}
                </span>
                <span className="text-[#7FA7B4]">{abierto ? '▾' : '▸'}</span>
              </div>
            </button>

            {abierto && (
              <div className="space-y-4 border-t border-[#153F52] px-4 pb-4 pt-3">
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                  <Cifra etq="Comprometidas" v={h1(c.total.comprometidas)} sub="del catálogo, lo vendido" />
                  <Cifra etq="Programadas" v={h1(c.total.programadas)} sub="sesiones en agenda" />
                  <Cifra etq="Ejecutadas" v={h1(c.total.ejecutadas)} sub="sesiones cerradas" tono="text-emerald-300" />
                  <Cifra etq="Pendientes" v={h1(c.total.pendientes)} sub="por hacer" tono="text-brand-orange" />
                  <Cifra etq="Carga al mes" v={h1(c.total.cargaMensual)} sub="pendientes ÷ meses que quedan"
                    tono={c.total.cargaMensual > c.mes.produccion.capacidad ? 'text-red-300' : 'text-[#EAF4F7]'} />
                  <Cifra etq="Capacidad al mes" v={h1(c.mes.produccion.capacidad)} sub={`${Math.round(rp.produccion * 100)} % de ${h1(c.mes.jornada)}`} />
                </div>

                {/* Las tres bolsas del mes */}
                <div>
                  <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{mesEtq} · programado sobre cada bolsa (lo oscuro, ya hecho)</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Bolsa etq={TIPO_BY_ID.produccion.nombre} corto="P" datos={c.mes.produccion} color="#F5A623" />
                    <Bolsa etq={TIPO_BY_ID.gestion.nombre} corto="G" datos={c.mes.gestion} color="#4C6BB4" />
                    <Bolsa etq={TIPO_BY_ID.proceso_interno.nombre} corto="PI" datos={c.mes.proceso_interno} color="#0e7490" />
                  </div>
                  {c.internas.length > 0 && (
                    <p className="mt-1.5 text-[11px] text-[#7FA7B4]">
                      Tareas internas abiertas: {c.internas.filter((t) => t.estado !== 'cerrada').map((t) => `${t.titulo} (${h1(t.programadas)})`).join(' · ')}
                    </p>
                  )}
                </div>

                {/* Proyectos */}
                {c.proyectos.length === 0 ? (
                  <p className="text-[12.5px] text-[#7FA7B4]">Sin proyectos asignados. Toda su capacidad de producción está libre.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-[12px]">
                      <thead>
                        <tr className="text-left text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">
                          <th className="py-1.5 pr-2">Proyecto</th>
                          <th className="py-1.5 pr-2">Papel</th>
                          <th className="py-1.5 pr-2 text-right">Comprom.</th>
                          <th className="py-1.5 pr-2 text-right">Program.</th>
                          <th className="py-1.5 pr-2 text-right">Ejecut.</th>
                          <th className="py-1.5 pr-2 text-right">Pendientes</th>
                          <th className="py-1.5 pr-2 text-right">Sin programar</th>
                          <th className="py-1.5 pr-2 text-right">Fin</th>
                          <th className="py-1.5 pr-2 text-right">h/mes</th>
                          <th className="py-1.5 w-28">Avance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#153F52]">
                        {c.proyectos.map((p) => (
                          <tr key={p.id}>
                            <td className="py-1.5 pr-2">
                              <span className="block font-extrabold text-[#EAF4F7]">{p.cliente}</span>
                              <span className="block text-[10.5px] text-[#7FA7B4]">
                                <code className="text-brand-verdeTexto">{p.codigo}</code>{p.modelo ? ` · ${p.modelo}` : ''}{p.normas?.length ? ` · ${p.normas.join(' ')}` : ''}
                              </span>
                            </td>
                            <td className="py-1.5 pr-2 text-[#9FC0CB]">
                              <span className="capitalize">{p.papel}</span>
                              <span className="block text-[10px] text-[#5E8494]" title="De dónde sale la cifra de comprometidas">{p.reparto}</span>
                            </td>
                            <td className="py-1.5 pr-2 text-right font-bold text-[#EAF4F7]">{h1(p.comprometidas)}</td>
                            <td className="py-1.5 pr-2 text-right text-[#CFE3E9]">{h1(p.programadas)}</td>
                            <td className="py-1.5 pr-2 text-right text-emerald-300">{h1(p.ejecutadas)}</td>
                            <td className="py-1.5 pr-2 text-right font-bold text-brand-orange">{h1(p.pendientes)}</td>
                            <td className={`py-1.5 pr-2 text-right ${p.sinProgramar > 0 ? 'text-amber-200' : 'text-[#7FA7B4]'}`}>{h1(p.sinProgramar)}</td>
                            <td className="whitespace-nowrap py-1.5 pr-2 text-right text-[#9FC0CB]">
                              {fmtF(p.fechaFin)}
                              <span className="block text-[10px] text-[#5E8494]">{p.mesesRestantes} mes{p.mesesRestantes === 1 ? '' : 'es'}</span>
                            </td>
                            <td className="py-1.5 pr-2 text-right">
                              <span className={`font-bold ${p.cargaMensual > p.ritmoPrevisto * 1.25 ? 'text-red-300' : 'text-[#EAF4F7]'}`}>{h1(p.cargaMensual)}</span>
                              <span className="block text-[10px] text-[#5E8494]" title="Ritmo previsto al vender: comprometidas ÷ duración">previsto {h1(p.ritmoPrevisto)}</span>
                            </td>
                            <td className="py-1.5">
                              {p.avancePct == null ? <span className="text-[10.5px] text-[#5E8494]">sin horas</span> : (
                                <div className="flex items-center gap-1.5">
                                  <div className="h-1.5 flex-1 rounded-full bg-[#0D3242]">
                                    <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${p.avancePct}%` }} />
                                  </div>
                                  <span className="w-8 text-right text-[10.5px] font-bold text-[#9FC0CB]">{p.avancePct}%</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-extrabold text-[#EAF4F7]">
                          <td className="pt-2 pr-2" colSpan={2}>Total</td>
                          <td className="pt-2 pr-2 text-right">{h1(c.total.comprometidas)}</td>
                          <td className="pt-2 pr-2 text-right">{h1(c.total.programadas)}</td>
                          <td className="pt-2 pr-2 text-right text-emerald-300">{h1(c.total.ejecutadas)}</td>
                          <td className="pt-2 pr-2 text-right text-brand-orange">{h1(c.total.pendientes)}</td>
                          <td className="pt-2 pr-2 text-right">{h1(c.total.sinProgramar)}</td>
                          <td className="pt-2 pr-2" />
                          <td className={`pt-2 pr-2 text-right ${c.total.cargaMensual > c.mes.produccion.capacidad ? 'text-red-300' : ''}`}>{h1(c.total.cargaMensual)}</td>
                          <td className="pt-2 text-[10.5px] font-bold text-[#9FC0CB]">de {h1(c.mes.produccion.capacidad)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Hasta el fin de los proyectos vivos: ¿cabe todo lo pendiente? */}
                <p className="text-[11.5px] text-[#7FA7B4]">
                  Hasta {fmtF(c.horizonte.hasta)} ({c.horizonte.meses} meses) tiene <b className="text-[#CFE3E9]">{h1(c.horizonte.capacidadProduccion)}</b> de capacidad de producción
                  frente a <b className="text-[#CFE3E9]">{h1(c.horizonte.pendientes)}</b> pendientes:{' '}
                  <b className={c.horizonte.margen >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                    {c.horizonte.margen >= 0 ? `${h1(c.horizonte.margen)} libres` : `faltan ${h1(-c.horizonte.margen)}`}
                  </b>.
                </p>
              </div>
            )}
          </div>
        );
      })}

      <p className="text-[11px] text-[#5E8494]">
        Comprometidas: horas del catálogo de las tareas del proyecto que le tocan (las de una tarea con consultor asignado son suyas; el resto se reparte entre quienes ejecutan el proyecto, en proporción a sus horas asignadas o a partes iguales).
        Programadas: sesiones en agenda. Ejecutadas: sesiones cerradas. Pendientes: comprometidas − ejecutadas.
        Capacidad: días laborables del mes × horas de convenio × % de jornada, menos vacaciones.
      </p>
    </div>
  );
}
