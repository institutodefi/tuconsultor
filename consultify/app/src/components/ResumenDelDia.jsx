import { useEffect, useState } from 'react';
import { supabase, DEMO } from '../lib/supabase.js';
import { listTable } from '../lib/data.js';
import { getTareasInternas } from '../lib/agenda.js';
import { datosResumen, resumenLocal, aISO } from '../lib/resumenDia.js';

// ════════════════════════════════════════════════════════════════════════════
// RESUMEN DEL DÍA · lo primero que se lee al entrar
//
// Una vez al día, la IA escribe qué hay que hacer hoy, esta semana, lo que se
// arrastra y los pasos (subtareas) por cerrar. El resto de entradas del día
// se lee el mismo texto (lo guarda la función en resumenes_dia). «Volver a
// escribir» lo pide de nuevo. En demo se escribe aquí mismo, sin IA.
// ════════════════════════════════════════════════════════════════════════════

const hora = (iso) => (iso ? new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '');

/** Markdown mínimo: **negrita**, líneas con «- » como lista, párrafos. */
function Texto({ texto }) {
  const bloques = String(texto || '').split(/\n{2,}/);
  const inline = (s) => s.split(/(\*\*[^*]+\*\*)/g).map((x, i) => (x.startsWith('**') ? <b key={i} className="text-[#EAF4F7]">{x.slice(2, -2)}</b> : x));
  return (
    <div className="space-y-2 text-[13px] leading-relaxed text-[#DFF1F5]">
      {bloques.map((b, i) => {
        const lineas = b.split('\n').filter((l) => l.trim());
        const esLista = lineas.length > 0 && lineas.every((l) => /^\s*[-•]\s+/.test(l));
        if (esLista) return <ul key={i} className="ml-4 list-disc space-y-0.5">{lineas.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-•]\s+/, ''))}</li>)}</ul>;
        return <p key={i}>{lineas.map((l, j) => <span key={j}>{inline(l)}{j < lineas.length - 1 ? <br /> : null}</span>)}</p>;
      })}
    </div>
  );
}

export default function ResumenDelDia({ user, nombre = '' }) {
  const [r, setR] = useState(null);       // {texto, creado, cacheado, sinIA, aviso}
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  async function pedir(forzar = false) {
    setCargando(true); setError(null);
    try {
      if (DEMO) {
        const [ss, ts, ti, ps, eq, cl] = await Promise.all([
          listTable('tarea_sesiones').catch(() => []), listTable('cliente_tareas').catch(() => []), getTareasInternas().catch(() => []),
          listTable('proyectos_cliente').catch(() => []), listTable('proyecto_equipo').catch(() => []), listTable('clientes').catch(() => []),
        ]);
        // En demo el usuario es «demo»: se resume lo de la primera consultora.
        const perfilId = eq.length ? eq[0].perfil_id : user?.id;
        const d = datosResumen({ perfilId, hoy: aISO(new Date()), sesiones: ss, tareas: ts, internas: ti, proyectos: ps, equipo: eq, clientes: cl });
        await new Promise((x) => setTimeout(x, 300));
        setR({ texto: resumenLocal(d, nombre), creado: new Date().toISOString(), cacheado: false, sinIA: true, datos: d.totales });
        return;
      }
      const { data } = await supabase.auth.getSession();
      const resp = await fetch('/api/resumen-dia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data?.session?.access_token || ''}` },
        body: JSON.stringify({ forzar, hoy: aISO(new Date()) }),
      });
      const j = await resp.json().catch(() => null);
      if (!j?.ok) throw new Error(j?.error || `Sin respuesta (${resp.status})`);
      setR(j);
    } catch (e) { setError(String(e?.message || e)); }
    finally { setCargando(false); }
  }
  useEffect(() => { pedir(false); }, [user?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="card border-brand-orange/30">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-extrabold text-[#EAF4F7]">✦ Tu día, resumido</h3>
        <div className="flex items-center gap-2 text-[11px] text-[#7FA7B4]">
          {r?.creado && <span>{r.cacheado ? 'Escrito hoy a las' : 'Escrito a las'} {hora(r.creado)}{r.sinIA ? ' · sin IA' : ''}</span>}
          <button type="button" onClick={() => pedir(true)} disabled={cargando} className="font-bold text-brand-orange hover:underline disabled:opacity-50">{cargando ? 'Escribiendo…' : 'Volver a escribir'}</button>
        </div>
      </div>
      {cargando && !r && <p className="mt-2 text-[12.5px] text-[#9FC0CB]">Leyendo tus sesiones, tareas y pasos pendientes…</p>}
      {error && <p className="mt-2 text-[12px] font-bold text-red-300">No se pudo escribir el resumen: {error}{/resumenes_dia/i.test(error) ? ' Falta aplicar la migración v131.' : ''}</p>}
      {r?.aviso && !error && <p className="mt-2 text-[11px] text-amber-100">{r.aviso} Se ha escrito sin IA.</p>}
      {r && <div className="mt-2"><Texto texto={r.texto} /></div>}
    </section>
  );
}
