import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listTable } from '../lib/data.js';
import { mismoModelo } from '../lib/calcEngine.js';

// ════════════════════════════════════════════════════════════════════════════
// PANEL DE GESTIÓN · el estado de la casa en una pantalla
//
// Cuatro preguntas, en el orden en que se hacen:
//
//   1 · ¿Cuánto hay vivo?          cartera: ofertas, contratos, MRR
//   2 · ¿Cómo van los proyectos?   horas comprometidas, programadas, hechas
//   3 · ¿Cómo está el equipo?      carga por persona, semana a semana
//   4 · ¿Qué está en riesgo?       vencimientos, sin programar, sin cerrar
//
// Todo sale de las mismas tablas que usa el resto de la aplicación: no hay
// cifras precalculadas que puedan quedarse viejas. Cada vez que se abre, se
// recalcula.
// ════════════════════════════════════════════════════════════════════════════

const eur = (n) => `${Math.round(Number(n) || 0).toLocaleString('es-ES')} €`;
const h1 = (n) => `${Math.round((Number(n) || 0) * 10) / 10} h`;
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

const dias = (f) => {
  if (!f) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${String(f).slice(0, 10)}T12:00:00`) - hoy) / 86400000);
};
const hoyISO = () => new Date().toISOString().slice(0, 10);

const Cifra = ({ v, etq, pie, tono = 'text-[#EAF4F7]', a }) => {
  const cuerpo = (
    <>
      <p className={`text-xl font-extrabold leading-none ${tono}`}>{v}</p>
      <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{etq}</p>
      {pie && <p className="mt-0.5 text-[10.5px] text-[#7FA7B4]">{pie}</p>}
    </>
  );
  const cls = 'rounded-xl border border-[#1E5468] bg-[#0D3242] px-3 py-2.5 block';
  return a
    ? <Link to={a} className={`${cls} transition hover:border-brand-orange/50`}>{cuerpo}</Link>
    : <div className={cls}>{cuerpo}</div>;
};

export default function PanelGestion() {
  const [d, setD] = useState(null);
  const [cargado, setCargado] = useState(null);

  const cargar = async () => {
    const t = [
      'empresas', 'clientes', 'presupuestos', 'contratos', 'proyectos_cliente',
      'cliente_tareas', 'tarea_sesiones', 'tareas_catalogo', 'proyecto_equipo',
      'perfiles', 'contactos',
    ];
    const r = await Promise.all(t.map((x) => listTable(x).catch(() => [])));
    setD(Object.fromEntries(t.map((k, i) => [k, r[i] || []])));
    setCargado(new Date());
  };
  useEffect(() => { cargar(); }, []);

  const m = useMemo(() => {
    if (!d) return null;
    const norm = (s) => String(s || '').toUpperCase().replace(/[\s.-]/g, '');
    const hoy = hoyISO();

    // ── 1 · Cartera ──
    const ofertas = d.presupuestos;
    const aceptadas = ofertas.filter((o) => o.estado === 'aceptada');
    const emitidas = ofertas.filter((o) => (o.estado || 'emitida') === 'emitida');
    const rechazadas = ofertas.filter((o) => o.estado === 'rechazada');
    const resueltas = aceptadas.length + rechazadas.length;
    const contratos = d.contratos.filter((c) => c.estado === 'firmado');
    // MRR: la suma de las cuotas de lo que está vivo. Solo recurrentes: una
    // implantación no se repite el mes que viene.
    const mrr = aceptadas.filter((o) => o.tipo === 'mes')
      .reduce((a, o) => a + (Number(o.precio) || 0), 0);
    const enJuego = emitidas.reduce((a, o) => a + (Number(o.precio) || 0), 0);

    // ── 2 · Proyectos y horas ──
    const teoricasDe = (t) => {
      const c = (t.catalogo_id && d.tareas_catalogo.find((x) => String(x.id) === String(t.catalogo_id)))
        || d.tareas_catalogo.find((x) => String(x.norma_id) === String(t.norma_id)
          && mismoModelo(x.modelo, t.modelo)
          && String(x.subproceso || '') === String(t.subproceso || ''));
      const n = Number(c?.horas_base) || 0;
      return n > 0 ? n : (Number(t.horas) || 0);
    };
    const proyectos = d.proyectos_cliente;
    const activos = proyectos.filter((p) => (p.estado || 'activo') === 'activo');
    const vivas = d.tarea_sesiones.filter((s) => s.estado !== 'anulada');
    const porTarea = {};
    for (const s of vivas) (porTarea[String(s.cliente_tarea_id)] ||= []).push(s);

    const teo = d.cliente_tareas.reduce((a, t) => a + teoricasDe(t), 0);
    const prog = vivas.reduce((a, s) => a + (Number(s.horas) || 0), 0);
    const ejec = vivas.filter((s) => s.estado === 'hecha').reduce((a, s) => a + (Number(s.horas) || 0), 0);
    const sinProgramar = d.cliente_tareas.filter((t) => !(porTarea[String(t.id)] || []).length).length;

    // ── 3 · Equipo ──
    const equipo = d.perfiles
      .filter((p) => ['consultor', 'director', 'admin', 'superadmin'].includes(p.rol) && p.activo !== false);
    const en30 = new Date(); en30.setDate(en30.getDate() + 30);
    const lim30 = en30.toISOString().slice(0, 10);

    const carga = equipo.map((p) => {
      const suyas = vivas.filter((s) => String(s.consultor_id) === String(p.id));
      const prox = suyas.filter((s) => {
        const f = String(s.fecha).slice(0, 10);
        return f >= hoy && f <= lim30;
      });
      const atras = suyas.filter((s) => String(s.fecha).slice(0, 10) < hoy && s.estado !== 'hecha');
      return {
        id: p.id,
        nombre: `${p.nombre || ''} ${p.apellidos || ''}`.trim() || p.email,
        nivel: p.nivel,
        proyectos: new Set(d.proyecto_equipo
          .filter((e) => String(e.perfil_id) === String(p.id))
          .map((e) => String(e.proyecto_id))).size,
        h30: Math.round(prox.reduce((a, s) => a + (Number(s.horas) || 0), 0) * 10) / 10,
        nAtras: atras.length,
        hAtras: Math.round(atras.reduce((a, s) => a + (Number(s.horas) || 0), 0) * 10) / 10,
        hechas: Math.round(suyas.filter((s) => s.estado === 'hecha')
          .reduce((a, s) => a + (Number(s.horas) || 0), 0) * 10) / 10,
      };
    }).sort((a, b) => b.h30 - a.h30);

    const sinAsignar = vivas.filter((s) => !s.consultor_id).length;

    // ── 4 · Riesgos ──
    const conCliente = (p) => {
      const cl = d.clientes.find((c) => String(c.id) === String(p.cliente_id));
      const e = cl?.cif ? d.empresas.find((x) => norm(x.cif) === norm(cl.cif)) : null;
      return e?.nombre_comercial?.trim() || e?.nombre || cl?.empresa || '—';
    };
    const vencen = activos
      .filter((p) => p.fecha_limite && dias(p.fecha_limite) <= 60)
      .map((p) => {
        const ts = d.cliente_tareas.filter((t) => String(t.proyecto_id) === String(p.id));
        const pend = ts.filter((t) => {
          const ss = porTarea[String(t.id)] || [];
          return !ss.length || !ss.every((s) => s.estado === 'hecha');
        }).length;
        return { ...p, cliente: conCliente(p), d: dias(p.fecha_limite), pend, n: ts.length };
      })
      .sort((a, b) => a.d - b.d);

    const atrasadas = vivas.filter((s) => String(s.fecha).slice(0, 10) < hoy && s.estado !== 'hecha');
    const sinEquipo = activos.filter((p) =>
      !d.proyecto_equipo.some((e) => String(e.proyecto_id) === String(p.id))).length;
    const sinOferta = activos.filter((p) => !p.oferta_id && !p.contrato_id).length;

    return {
      // cartera
      ofertas: ofertas.length, emitidas: emitidas.length, aceptadas: aceptadas.length,
      tasa: resueltas ? Math.round((aceptadas.length / resueltas) * 100) : null,
      contratos: contratos.length, mrr, enJuego,
      // clientes
      empresas: d.empresas.length,
      clientes: d.empresas.filter((e) => e.es_cliente).length,
      contactos: d.contactos.length,
      // proyectos
      proyectos: proyectos.length, activos: activos.length,
      tareas: d.cliente_tareas.length, teo, prog, ejec, sinProgramar,
      // equipo
      carga, nEquipo: equipo.length, sinAsignar,
      // riesgo
      vencen, atrasadas: atrasadas.length,
      hAtrasadas: Math.round(atrasadas.reduce((a, s) => a + (Number(s.horas) || 0), 0) * 10) / 10,
      sinEquipo, sinOferta,
    };
  }, [d]);

  if (!m) return <p className="text-[12.5px] text-[#7FA7B4]">Cargando panel…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-extrabold text-[#EAF4F7]">Estado de la casa</h2>
        <button onClick={cargar} className="text-[11.5px] font-bold text-[#7FA7B4] hover:text-brand-orange">
          ↻ actualizar
          {cargado && <span className="ml-1 font-normal">· {cargado.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>}
        </button>
      </div>

      {/* ── 1 · Cartera ── */}
      <div>
        <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-brand-orange">Cartera</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Cifra v={eur(m.mrr)} etq="MRR" pie="cuotas vivas" tono="text-brand-orange" />
          <Cifra v={eur(m.enJuego)} etq="En juego" pie={`${m.emitidas} ofertas emitidas`} a="/consultores/ofertas" />
          <Cifra v={m.aceptadas} etq="Aceptadas" pie={m.tasa != null ? `${m.tasa}% de acierto` : 'sin resolver'} tono="text-emerald-300" />
          <Cifra v={m.contratos} etq="Contratos" pie="firmados" />
          <Cifra v={m.clientes} etq="Clientes" pie={`${m.empresas} empresas`} a="/consultores/empresas" />
          <Cifra v={m.contactos} etq="Contactos" pie="en el CRM" a="/consultores/contactos" />
        </div>
      </div>

      {/* ── 2 · Proyectos ── */}
      <div>
        <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-brand-orange">Proyectos y horas</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Cifra v={m.activos} etq="Activos" pie={`${m.proyectos} en total`} a="/consultores/proyectos" />
          <Cifra v={m.tareas} etq="Tareas" pie={`${m.sinProgramar} sin programar`} />
          <Cifra v={h1(m.teo)} etq="Comprometidas" pie="del catálogo" />
          <Cifra v={h1(m.prog)} etq="Programadas" pie={`${pct(m.prog, m.teo)}%`} tono="text-brand-orange" />
          <Cifra v={h1(m.ejec)} etq="Ejecutadas" pie={`${pct(m.ejec, m.teo)}%`} tono="text-emerald-300" />
          <Cifra v={h1(m.teo - m.prog)} etq="Sin planificar" pie="quedan por agendar"
            tono={m.teo - m.prog > 0 ? 'text-amber-200' : 'text-emerald-300'} />
        </div>
      </div>

      {/* ── 3 · Equipo ── */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-brand-orange">
            Carga del equipo · próximos 30 días
          </p>
          {m.sinAsignar > 0 && (
            <p className="text-[11.5px] font-bold text-amber-200">{m.sinAsignar} sesiones sin responsable</p>
          )}
        </div>
        <div className="card !p-3">
          <ul className="divide-y divide-[#153F52]">
            {m.carga.map((c) => {
              // 120 h en 30 días es una jornada llena a 6 h/día. Por encima,
              // esa persona no va a llegar y hay que moverlo antes, no después.
              const p = Math.min(100, Math.round((c.h30 / 120) * 100));
              return (
                <li key={c.id} className="py-2">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-[#EAF4F7]">
                      {c.nombre}
                      {c.nivel && <span className="ml-1.5 font-normal text-[#7FA7B4]">{c.nivel}</span>}
                    </span>
                    {c.nAtras > 0 && (
                      <span className="chip !px-1.5 !py-0 bg-red-500/15 text-[10px] font-extrabold text-red-300">
                        {c.nAtras} sin cerrar
                      </span>
                    )}
                    <span className="text-[11.5px] text-[#7FA7B4]">{c.proyectos} proyectos</span>
                    <span className="whitespace-nowrap text-[11.5px] font-bold text-brand-orange">{h1(c.h30)}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#0B2E3D]">
                    <div className={`h-full rounded-full ${p >= 100 ? 'bg-red-400' : p > 75 ? 'bg-amber-300' : 'bg-brand-orange/60'}`}
                      style={{ width: `${p}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[10.5px] text-[#5E8494]">
            La barra llena son 120 h en 30 días, una jornada completa a 6 h al día.
          </p>
        </div>
      </div>

      {/* ── 4 · Riesgos ── */}
      <div>
        <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-brand-orange">Qué hay que mirar</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Cifra v={m.atrasadas} etq="Sesiones sin cerrar" pie={`${h1(m.hAtrasadas)} ya pasadas`}
            tono={m.atrasadas ? 'text-red-300' : 'text-emerald-300'} />
          <Cifra v={m.sinProgramar} etq="Tareas sin agendar" pie="ninguna sesión"
            tono={m.sinProgramar ? 'text-amber-200' : 'text-emerald-300'} />
          <Cifra v={m.sinEquipo} etq="Proyectos sin equipo" pie="nadie los ve"
            tono={m.sinEquipo ? 'text-amber-200' : 'text-emerald-300'} />
          <Cifra v={m.sinOferta} etq="Proyectos sin oferta" pie="sin alcance pactado"
            tono={m.sinOferta ? 'text-amber-200' : 'text-emerald-300'} />
        </div>

        {m.vencen.length > 0 && (
          <div className="card mt-2 !p-3">
            <p className="mb-1.5 text-[12.5px] font-extrabold text-[#EAF4F7]">
              Certificaciones a menos de 60 días ({m.vencen.length})
            </p>
            <ul className="divide-y divide-[#153F52]">
              {m.vencen.map((p) => (
                <li key={p.id} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 py-1.5">
                  <span className={`chip !px-1.5 !py-0 text-[10px] font-extrabold ${
                    p.d < 0 ? 'bg-red-500/20 text-red-200'
                      : p.d <= 30 ? 'bg-red-500/15 text-red-300' : 'bg-amber-400/15 text-amber-200'}`}>
                    {p.d < 0 ? `vencido ${-p.d} d` : `${p.d} d`}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-[#EAF4F7]">{p.cliente}</span>
                  <span className="truncate text-[11.5px] text-[#7FA7B4]">{p.nombre}</span>
                  <span className={`whitespace-nowrap text-[11.5px] font-bold ${p.pend ? 'text-amber-200' : 'text-emerald-300'}`}>
                    {p.pend ? `${p.pend} de ${p.n} pendientes` : 'todo hecho'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
