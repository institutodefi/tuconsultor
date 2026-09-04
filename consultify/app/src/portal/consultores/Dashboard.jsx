import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { listTable } from '../../lib/data.js';
import { supabase } from '../../lib/supabase.js';
import { NORMA_BY_ID, fmtEUR, calcular } from '../../lib/calcEngine.js';
import { useAuth } from '../../lib/auth.jsx';
import { NavLink } from 'react-router-dom';
import { ROL_LABEL, ROL_CLIENTE_LABEL, can } from '../../lib/permisos.js';
import MisProyectos from '../../components/MisProyectos.jsx';
import PanelGestion from '../../components/PanelGestion.jsx';

const NAVY = '#0A2A6C', ORANGE = '#F5A623';
const PIE_COLORS = ['#0A2A6C', '#2B4A93', '#4C6BB4', '#7E97CE', '#F5A623'];

export default function Dashboard() {
  const { verEconomico, role, user, demo } = useAuth();
  const [miembros, setMiembros] = useState([]);
  const [consultores, setConsultores] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [ready, setReady] = useState(false);

  const cargar = () => {
    listTable('consultores').then(setConsultores).catch(() => setConsultores([]));
    listTable('proyectos_cliente').then(setProyectos).catch(() => setProyectos([]));
    listTable('clientes').then(setClientes).catch(() => setClientes([]));
    listTable('contactos').then(setContactos).catch(() => setContactos([]));
    listTable('empresas').then(setEmpresas).catch(() => setEmpresas([]));
    listTable('cliente_tareas').then(setTareas).catch(() => setTareas([]));
    if (demo) listTable('clientes').then(cs => setMiembros((cs || []).slice(0, 1).map(c => ({ id: 1, cliente_id: c.id, usuario_id: 'demo', rol_cliente: 'administrador' })))).catch(() => setMiembros([]));
    else listTable('miembros_cliente').then(setMiembros).catch(() => setMiembros([]));
    setReady(true);
  };


  // Qué cuenta cada cifra. Se calcula aquí y no en el marcado para que se vea

  // de un golpe qué se considera «activo» en cada caso.

  const misClientes = useMemo(() => (

    role === 'superadmin' || role === 'admin'

      ? clientes

      : clientes.filter((c) => miembros.some((mm) => mm.cliente_id === c.id && (demo || mm.usuario_id === user?.id)))

  ), [clientes, miembros, role, demo, user]);


  // Contactos vinculados a alguna de esas empresas, sin contar dos veces a

  // quien esté en varias.

  const contactosActivos = useMemo(() => {

    const suyos = new Set(misClientes.map((c) => String(c.cif || '').toUpperCase()).filter(Boolean));

    if (!suyos.size) return contactos.length;

    const ids = new Set(empresas.filter((e) => suyos.has(String(e.cif || '').toUpperCase())).map((e) => String(e.id)));

    return ids.size ? contactos.filter((c) => c.activo !== false).length : contactos.length;

  }, [contactos, empresas, misClientes]);


  // Proyectos vivos: los que no están cerrados ni cancelados.

  const proyectosActivos = useMemo(() => proyectos.filter(

    (p) => !['cerrado', 'cancelado', 'finalizado'].includes(String(p.estado || '').toLowerCase()),

  ).length, [proyectos]);
  // `useEffect(cargar, [])` NO: lo que devuelva `cargar` lo toma React como
  // función de limpieza. Aquí devolvía la promesa de `listTable`, y al
  // desmontar la pantalla React intentaba llamarla: «r is not a function», con
  // el error apareciendo en la pantalla a la que se navegaba, no en esta.
  // Envuelto en una arrow, el efecto no devuelve nada.

  useEffect(() => { cargar(); }, []);

  // Realtime: refresca el dashboard cuando cambian los proyectos (si está disponible).
  useEffect(() => {
    if (!supabase) return;
    try {
      const canal = supabase
        .channel('dash-proyectos')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'proyectos_cliente' }, cargar)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cliente_tareas' }, cargar)
        .subscribe();
      return () => { try { supabase.removeChannel(canal); } catch { /* noop */ } };
    } catch { /* realtime no disponible */ }
  }, []);

  const activos = useMemo(() => proyectos.filter(p => p.estado !== 'cerrado'), [proyectos]);

  // KPIs recalculados desde normas+modelo de cada proyecto (proyectos_cliente
  // no guarda precio; lo derivamos del motor de cálculo).
  const kpis = useMemo(() => {
    let mrr = 0, bolsas = 0;
    for (const p of activos) {
      const r = calcular(p.normas || [], p.modelo);
      if (!r) continue;
      if (r.tipo === 'mes') mrr += r.precioCatalogo || 0;
      else bolsas += r.precioCatalogo || 0;
    }
    return { mrr, arr: mrr * 12, bolsas, nProyectos: activos.length, nClientes: clientes.length };
  }, [activos, clientes]);

  const porModelo = useMemo(() => {
    const m = {};
    for (const p of activos) m[p.modelo] = (m[p.modelo] || 0) + 1;
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [activos]);

  const porNorma = useMemo(() => {
    const m = {};
    for (const p of activos) for (const n of (p.normas || [])) m[n] = (m[n] || 0) + 1;
    return Object.entries(m).map(([id, n]) => ({ name: NORMA_BY_ID[id]?.nombre || id, proyectos: n }))
      .sort((a, b) => b.proyectos - a.proyectos);
  }, [activos]);

  const equipoConsultores = useMemo(() => consultores.filter(c => c.activo && (c.tipo_equipo || 'consultor') === 'consultor'), [consultores]);
  const equipoComercial = useMemo(() => consultores.filter(c => c.activo && c.tipo_equipo === 'gestion' && c.subtipo === 'comercial'), [consultores]);
  const equipoGestion = useMemo(() => consultores.filter(c => c.activo && c.tipo_equipo === 'gestion'), [consultores]);

  const carga = useMemo(() => equipoConsultores.map(c => {
    // Carga real: horas de las tareas de proyecto asignadas a este consultor.
    const suyas = tareas.filter(t => String(t.consultor_id) === String(c.id));
    const horas = suyas.reduce((s, t) => s + (Number(t.horas) || 0), 0);
    const proyectosIds = new Set(suyas.map(t => t.proyecto_id).filter(Boolean));
    const capProd = Math.round(150 * (c.pct_jornada ?? 100) / 100 * 0.7);
    return { ...c, nProyectos: proyectosIds.size, horas, capProd, pct: capProd ? Math.min(100, Math.round(horas / capProd * 100)) : 0 };
  }), [equipoConsultores, tareas]);

  // Selección flexible de qué consultores se ven en la carga.
  const [equipoCargaSel, setEquipoCargaSel] = useState(null);
  useEffect(() => {
    if (equipoCargaSel === null && equipoConsultores.length) {
      setEquipoCargaSel(new Set(equipoConsultores.map(c => String(c.id))));
    }
  }, [equipoConsultores, equipoCargaSel]);
  const cargaVisible = useMemo(() => {
    if (!equipoCargaSel) return carga;
    return carga.filter(c => equipoCargaSel.has(String(c.id)));
  }, [carga, equipoCargaSel]);

  if (!ready) return <p className="font-semibold text-[#9FC0CB]">Cargando…</p>;

  return (
    <div>
      {/* ── Nosotros: rol interno, permisos y clientes activos ── */}
      <div className="card mb-5 !p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow !mb-0">Nosotros</p>
            <span className="chip bg-brand-orange/15 text-brand-orange">{ROL_LABEL[role] || role}</span>
            {role === 'superadmin' && <span className="chip bg-brand-verde/15 text-brand-verdeTexto">Acceso total</span>}
            {can.gestionarEquipo(role) && role !== 'superadmin' && <span className="chip bg-brand-verde/15 text-brand-verdeTexto">Gestión de equipo</span>}
            {verEconomico && <span className="chip bg-sky-500/15 text-sky-300">Ve económico</span>}
          </div>
          {/* Antes esto era una lista de fichas con el nombre de cada cliente:
              ocupaba tres líneas y no decía lo que se mira de un vistazo, que es
              CUÁNTOS hay. Ahora son tres cifras y cada una lleva a su pantalla. */}
          <div className="flex flex-wrap items-stretch gap-2">
            {[
              { n: misClientes.length, etq: 'Clientes activos', to: '../clientes', color: 'text-brand-verdeTexto' },
              { n: contactosActivos, etq: 'Contactos activos', to: '../contactos', color: 'text-[#EAF4F7]' },
              { n: proyectosActivos, etq: 'Proyectos activos', to: '../proyectos/dashboard', color: 'text-brand-orange' },
            ].map((c) => (
              <NavLink key={c.etq} to={c.to}
                className="min-w-[112px] rounded-xl border border-[#1E5468] bg-[#0D3242] px-4 py-2.5 text-center transition hover:border-brand-orange">
                <span className={`block text-2xl font-extrabold leading-none ${c.color}`}>{c.n}</span>
                <span className="mt-1 block text-[10.5px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{c.etq}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-8">
      {/* El estado de la casa: cartera, proyectos, equipo y riesgos. Todo se
          recalcula al abrir, no hay cifras guardadas que envejezcan. */}
      <PanelGestion />

      <MisProyectos />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {verEconomico ? (
          <>
            <Kpi label="MRR (cuotas activas)" value={fmtEUR(kpis.mrr)} sub={`ARR ${fmtEUR(kpis.arr)}`} />
            <Kpi label="Bolsas Apoyo vendidas" value={fmtEUR(kpis.bolsas)} sub="pago único" />
            <Kpi label="Proyectos en cartera" value={kpis.nProyectos} sub={`${kpis.nClientes} clientes`} />
            <Kpi label="Objetivo 2027" value="3 M€" sub={`MRR necesario ≈ ${fmtEUR(250000)}`} accent />
          </>
        ) : (
          <>
            <Kpi label="Proyectos en cartera" value={kpis.nProyectos} sub={`${kpis.nClientes} clientes`} />
            <Kpi label="Consultores activos" value={equipoConsultores.length} sub="equipo de entrega" />
            <Kpi label="Equipo de gestión" value={equipoGestion.length} sub={`${equipoComercial.length} comercial(es)`} />
            <Kpi label="Sistemas activos" value={porNorma.length} sub="normas en cartera" accent />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="font-extrabold">Proyectos por norma</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <BarChart data={porNorma} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="proyectos" fill={NAVY} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3 className="font-extrabold">Mix por modelo</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={porModelo} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3} label={({ name, value }) => `${name} (${value})`}>
                  {porModelo.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-1 text-xs font-medium text-[#9FC0CB]">Objetivo de mezcla: 80 % Relación · 20 % Implicación.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="font-extrabold">Equipo de consultoría <span className="chip ml-1 bg-[#0D3242] text-[#9FC0CB]">{equipoConsultores.length}</span></h3>
          <div className="mt-3 space-y-2">
            {equipoConsultores.map(c => (
              <div key={c.id} className="flex items-center justify-between border-b border-navy-50 pb-2 text-sm last:border-0">
                <span className="font-bold">{c.nombre} {c.apellidos || ''}</span>
                <span className="chip bg-[#0D3242] text-[#B9D2DA]">{c.nivel} · {c.pct_jornada ?? 100}%</span>
              </div>
            ))}
            {!equipoConsultores.length && <p className="text-sm font-medium text-[#9FC0CB]">Sin consultores. Añádelos en Equipo.</p>}
          </div>
        </div>
        <div className="card">
          <h3 className="font-extrabold">Equipo de gestión <span className="chip ml-1 bg-[#0D3242] text-[#9FC0CB]">{equipoGestion.length}</span></h3>
          <div className="mt-3 space-y-2">
            {equipoGestion.map(c => (
              <div key={c.id} className="flex items-center justify-between border-b border-navy-50 pb-2 text-sm last:border-0">
                <span className="font-bold">{c.nombre} {c.apellidos || ''}</span>
                <span className="chip bg-brand-orange/15 text-[#F9A83A] capitalize">{c.subtipo || 'gestión'}</span>
              </div>
            ))}
            {!equipoGestion.length && <p className="text-sm font-medium text-[#9FC0CB]">Sin equipo de gestión. Añádelo en Equipo.</p>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-extrabold">Carga del equipo de consultoría</h3>
          <div className="flex gap-2">
            <button onClick={() => setEquipoCargaSel(new Set(equipoConsultores.map(c => String(c.id))))} className="chip border border-[#1E5468] text-[11px] font-bold text-[#9FC0CB]">Todos</button>
            <button onClick={() => setEquipoCargaSel(new Set())} className="chip border border-[#1E5468] text-[11px] font-bold text-[#9FC0CB]">Ninguno</button>
          </div>
        </div>
        <p className="mt-1 text-xs font-medium text-[#9FC0CB]">Marca los consultores que quieres incluir en la vista de carga.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {equipoConsultores.map(c => {
            const on = equipoCargaSel ? equipoCargaSel.has(String(c.id)) : true;
            return (
              <button key={c.id} onClick={() => setEquipoCargaSel(s => { const n = new Set(s); n.has(String(c.id)) ? n.delete(String(c.id)) : n.add(String(c.id)); return n; })}
                className={`chip border text-xs font-bold ${on ? 'border-brand-orange bg-brand-orange/15 text-[#EAF4F7]' : 'border-[#1E5468] bg-[#10394A] text-[#9FC0CB]'}`}>
                {on ? '✓ ' : ''}{c.nombre}
              </button>
            );
          })}
        </div>
        <div className="mt-4 space-y-4">
          {cargaVisible.map(c => (
            <div key={c.id}>
              <div className="flex items-baseline justify-between text-sm">
                <p className="font-bold">{c.nombre} <span className="chip ml-1 bg-[#0D3242] text-[#9FC0CB]">{c.nivel}</span></p>
                <p className="font-semibold text-[#9FC0CB]">{c.nProyectos} proyectos · ~{c.horas}/{c.capProd} h productivas/mes</p>
              </div>
              <div className="mt-1.5 h-2.5 rounded-full bg-[#0D3242]">
                <div className="h-2.5 rounded-full transition-all" style={{ width: `${c.pct}%`, background: c.pct > 90 ? '#DC2626' : c.pct > 70 ? ORANGE : NAVY }} />
              </div>
            </div>
          ))}
          {!carga.length && <p className="text-sm font-medium text-[#9FC0CB]">Sin consultores activos. Añádelos en la pestaña Equipo.</p>}
        </div>
      </div>
    </div>
    </div>
  );
}

function Kpi({ label, value, sub, accent }) {
  return (
    <div className={`card ${accent ? '!bg-navy-900 !border-navy-900 text-white' : ''}`}>
      <p className={`text-xs font-bold uppercase tracking-wider ${accent ? 'text-brand-orange' : 'text-[#7FA7B4]'}`}>{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight">{value}</p>
      {sub && <p className={`mt-0.5 text-xs font-semibold ${accent ? 'text-white/60' : 'text-[#9FC0CB]'}`}>{sub}</p>}
    </div>
  );
}
