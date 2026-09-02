import { useEffect, useMemo, useState } from 'react';
import { listTable } from '../lib/data.js';
import { useAuth } from '../lib/auth.jsx';
import SesionesTarea from '../portal/consultores/SesionesTarea.jsx';

// ════════════════════════════════════════════════════════════════════════════
// MIS SESIONES
//
// Lo que esta persona tiene programado, con su franja horaria. Se puede abrir
// cada tarea desde aquí: se ve una sesión y se quiere cambiar el nombre o
// añadir otra, y tener que ir a Proyectos, buscar el proyecto y luego la tarea
// es un viaje que nadie hace —así que el dato se queda sin corregir—.
// ════════════════════════════════════════════════════════════════════════════

const fmtDia = (iso) => new Date(`${iso}T00:00:00`)
  .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function MisSesiones({ dias = 21 }) {
  const { user } = useAuth();
  const [datos, setDatos] = useState(null);
  const [abierta, setAbierta] = useState(null);

  const cargar = async () => {
    const [ss, ct] = await Promise.all([
      listTable('tarea_sesiones').catch(() => []),
      listTable('cliente_tareas').catch(() => []),
    ]);
    setDatos({ ss: ss || [], ct: ct || [] });
  };
  useEffect(() => { if (user?.id) cargar(); }, [user?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  const { porDia, atrasadas } = useMemo(() => {
    if (!datos) return { porDia: {}, atrasadas: [] };
    const porTarea = Object.fromEntries(datos.ct.map((t) => [String(t.id), t]));
    const hoy = hoyISO();
    const tope = new Date(); tope.setDate(tope.getDate() + dias);
    const limite = `${tope.getFullYear()}-${String(tope.getMonth() + 1).padStart(2, '0')}-${String(tope.getDate()).padStart(2, '0')}`;

    const mias = datos.ss
      .filter((s) => String(s.consultor_id) === String(user?.id) && s.estado !== 'anulada')
      .map((s) => ({ ...s, tarea: porTarea[String(s.cliente_tarea_id)] || null }));

    const m = {};
    for (const s of mias) {
      const d = String(s.fecha).slice(0, 10);
      if (d < hoy || d > limite) continue;
      (m[d] = m[d] || []).push(s);
    }
    for (const d of Object.keys(m)) {
      m[d].sort((a, b) => String(a.hora_inicio).localeCompare(String(b.hora_inicio)));
    }
    return {
      porDia: m,
      // Lo que ya pasó y sigue abierto: es lo primero que hay que resolver.
      atrasadas: mias.filter((s) => String(s.fecha).slice(0, 10) < hoy && s.estado !== 'hecha')
        .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))),
    };
  }, [datos, user?.id, dias]);

  const horasDe = (l) => Math.round(l.reduce((a, s) => a + (Number(s.horas) || 0), 0) * 10) / 10;

  const Fila = ({ s, atrasada }) => (
    <li className={`flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-1.5 ${
      atrasada ? 'bg-red-500/[0.08]'
        : s.estado === 'hecha' ? 'bg-emerald-500/[0.08]' : 'bg-[#0D3242]'}`}>
      <span className="whitespace-nowrap text-[11.5px] font-extrabold text-brand-orange">
        {String(s.hora_inicio).slice(0, 5)}–{String(s.hora_fin).slice(0, 5)}
      </span>
      <span className="whitespace-nowrap text-[10.5px] font-bold text-[#7FA7B4]">{s.horas} h</span>
      {s.tarea?.codigo && (
        <code className="text-[11px] font-extrabold tracking-wide text-brand-verdeTexto">{s.tarea.codigo}</code>
      )}
      <button onClick={() => s.tarea && setAbierta(s.tarea)} disabled={!s.tarea}
        className="min-w-0 flex-1 truncate text-left text-[12px] text-[#DFF1F5] hover:text-brand-orange hover:underline disabled:hover:text-[#DFF1F5]"
        title="Abrir la tarea">
        {s.tarea?.titulo || 'Tarea'}
      </button>
      {s.tarea?.norma_id && <span className="chip !px-1.5 !py-0 text-[9.5px]">{s.tarea.norma_id}</span>}
      {s.estado === 'hecha' && <span className="text-[10.5px] font-bold text-emerald-300">hecha</span>}
      {atrasada && <span className="text-[10.5px] font-bold text-red-300">sin cerrar</span>}
    </li>
  );

  if (!datos) return <p className="text-[12.5px] text-[#7FA7B4]">Cargando agenda…</p>;

  const hayAlgo = Object.keys(porDia).length || atrasadas.length;
  if (!hayAlgo) {
    return (
      <div className="card">
        <h3 className="text-[15px] font-extrabold text-[#EAF4F7]">Mis sesiones</h3>
        <p className="mt-1.5 text-[13px] text-[#9FC0CB]">
          Nada programado. Las sesiones se crean desde el calendario de cada tarea, en su proyecto.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {atrasadas.length > 0 && (
        <div className="card !p-3">
          <p className="mb-1.5 text-[12.5px] font-extrabold text-red-200">
            {atrasadas.length} sesión{atrasadas.length === 1 ? '' : 'es'} sin cerrar · {horasDe(atrasadas)} h
          </p>
          <ul className="space-y-1">
            {atrasadas.slice(0, 8).map((s) => <Fila key={s.id} s={s} atrasada />)}
          </ul>
        </div>
      )}

      {Object.entries(porDia).sort(([a], [b]) => a.localeCompare(b)).map(([dia, ss]) => (
        <div key={dia} className="card !p-3">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <p className="text-[12.5px] font-extrabold text-[#EAF4F7]">{fmtDia(dia)}</p>
            <p className="text-[11px] font-bold text-[#7FA7B4]">
              {horasDe(ss)} h · {ss.length} sesión{ss.length === 1 ? '' : 'es'}
            </p>
          </div>
          <ul className="space-y-1">{ss.map((s) => <Fila key={s.id} s={s} />)}</ul>
        </div>
      ))}

      {abierta && (
        <SesionesTarea
          tarea={{
            id: abierta.id, titulo: abierta.titulo, codigo: abierta.codigo,
            horas_teoricas: abierta.horas, subproceso: abierta.subproceso,
          }}
          contexto={{ norma: abierta.norma_id }}
          proyectoId={abierta.proyecto_id}
          campoTarea="cliente_tarea_id"
          editable
          onCerrar={() => setAbierta(null)}
          onGuardado={cargar}
        />
      )}
    </div>
  );
}
