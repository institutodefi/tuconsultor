import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listTable, updateRow } from '../../lib/data.js';
import { useAuth } from '../../lib/auth.jsx';
import { can } from '../../lib/permisos.js';
import { proximaAuditoriaDeCertificado, diasHasta, semaforoDias, fmt, TONO, aISO, DIAS_AMBAR, DIAS_ROJO } from '../../lib/auditorias.js';
import { NORMA_BY_ID } from '../../lib/calcEngine.js';

// ════════════════════════════════════════════════════════════════════════════
// PLANIFICACIÓN DE AUDITORÍAS EXTERNAS
//
// Una fila por certificado vivo: cliente · norma · entidad · validez · próxima
// auditoría estimada (seguimiento anual o renovación al vencer) · fecha
// programada en el proyecto · semáforo. Los clientes con proyecto vivo pero
// sin certificado registrado también salen, para que no se pierdan: no hay de
// dónde estimar y hay que darlos de alta en su ficha.
//
// La fecha programada vive en el proyecto (proyectos_cliente.fecha_auditoria_
// externa) y se puede poner aquí mismo. Debajo, el calendario por meses de lo
// que viene, para repartir la carga de auditorías del año.
// ════════════════════════════════════════════════════════════════════════════

const ORDEN = { rojo: 0, ambar: 1, gris: 2, verde: 3 };
const VIVO = (p) => !['cerrado', 'cancelado', 'finalizado'].includes(String(p.estado || '').toLowerCase());
const S = (v) => String(v ?? '');
const TIPO = { seguimiento: 'Seguimiento', renovacion: 'Renovación', caducado: 'Caducado' };
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export default function PlanAuditorias() {
  const { role } = useAuth();
  const puedeEditar = can.esEquipo(role);
  const [d, setD] = useState(null);
  const [guardando, setGuardando] = useState(null);
  const [filtro, setFiltro] = useState('todas');   // todas | avisos | sin
  const [q, setQ] = useState('');

  const cargar = async () => {
    const [proyectos, certs, clientes, empresas] = await Promise.all([
      listTable('proyectos_cliente').catch(() => []),
      listTable('cliente_certificados').catch(() => null),
      listTable('clientes').catch(() => []),
      listTable('empresas').catch(() => []),
    ]);
    setD({ proyectos, certs, clientes, empresas });
  };
  useEffect(() => { cargar(); }, []);

  const hoy = aISO(new Date());

  const filas = useMemo(() => {
    if (!d) return [];
    const cif = (x) => S(x).toUpperCase().replace(/[\s.-]/g, '');
    const empresaPorCif = Object.fromEntries((d.empresas || []).filter((e) => e.cif).map((e) => [cif(e.cif), e]));
    const clientePorId = Object.fromEntries((d.clientes || []).map((c) => [S(c.id), c]));
    const datosCliente = (clienteId) => {
      const c = clientePorId[S(clienteId)];
      const e = c?.cif ? empresaPorCif[cif(c.cif)] : null;
      return { nombre: e?.nombre_comercial || e?.nombre || c?.empresa || '—', empresaId: e?.id || null };
    };
    const vivos = (d.proyectos || []).filter(VIVO);
    // El proyecto que «lleva» un certificado: el enlazado, o el vivo del mismo
    // cliente que incluya la norma. De él sale la fecha programada.
    const proyectoDe = (c) => vivos.find((p) => S(p.id) === S(c.proyecto_id))
      || vivos.find((p) => S(p.cliente_id) === S(c.cliente_id) && (p.normas || []).map(S).includes(S(c.norma)))
      || null;

    const out = (d.certs || []).map((c) => {
      const p = proyectoDe(c);
      const prox = proximaAuditoriaDeCertificado(c, hoy);
      const programada = p?.fecha_auditoria_externa ? S(p.fecha_auditoria_externa).slice(0, 10) : null;
      const manda = programada || prox.fecha;
      const dias = manda ? diasHasta(manda, hoy) : null;
      const color = prox.tipo === 'caducado' ? 'rojo' : semaforoDias(dias);
      return { key: `c-${c.id}`, cert: c, proyecto: p, ...datosCliente(c.cliente_id), norma: S(c.norma), entidad: c.entidad || '—', validez: c.fecha_validez || null, prox, programada, manda, dias, color, sinCertificado: false };
    });

    // Proyectos vivos cuya norma no tiene certificado registrado en el cliente.
    for (const p of vivos) {
      for (const n of (p.normas || []).map(S)) {
        const tiene = (d.certs || []).some((c) => S(c.cliente_id) === S(p.cliente_id) && (S(c.norma) === n || S(c.proyecto_id) === S(p.id)));
        if (tiene) continue;
        const programada = p.fecha_auditoria_externa ? S(p.fecha_auditoria_externa).slice(0, 10) : null;
        const dias = programada ? diasHasta(programada, hoy) : null;
        out.push({ key: `p-${p.id}-${n}`, cert: null, proyecto: p, ...datosCliente(p.cliente_id), norma: n, entidad: '—', validez: null, prox: { fecha: null, tipo: null }, programada, manda: programada, dias, color: programada ? semaforoDias(dias) : 'gris', sinCertificado: true });
      }
    }
    return out.sort((a, b) => ORDEN[a.color] - ORDEN[b.color] || (a.dias ?? 1e9) - (b.dias ?? 1e9) || a.nombre.localeCompare(b.nombre));
  }, [d, hoy]);

  const visibles = filas.filter((f) => {
    if (filtro === 'avisos' && !(f.color === 'rojo' || f.color === 'ambar')) return false;
    if (filtro === 'sin' && !(f.sinCertificado || !f.programada)) return false;
    if (q.trim()) {
      const t = `${f.nombre} ${f.norma} ${NORMA_BY_ID[f.norma]?.nombre || ''} ${f.entidad}`.toLowerCase();
      if (!t.includes(q.trim().toLowerCase())) return false;
    }
    return true;
  });

  const n = (col) => filas.filter((f) => f.color === col).length;
  const nSinProg = filas.filter((f) => !f.programada && !f.sinCertificado).length;
  const nSinCert = filas.filter((f) => f.sinCertificado).length;

  // Calendario: lo que manda (programada o estimada) agrupado por mes, doce
  // meses desde hoy.
  const calendario = useMemo(() => {
    const ini = new Date(`${hoy}T12:00:00`); ini.setDate(1);
    const meses = [];
    for (let i = 0; i < 12; i++) {
      const m = new Date(ini); m.setMonth(ini.getMonth() + i);
      const clave = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
      meses.push({ clave, etq: `${MESES[m.getMonth()]} ${String(m.getFullYear()).slice(2)}`, filas: filas.filter((f) => f.manda && f.manda.slice(0, 7) === clave) });
    }
    const atrasadas = filas.filter((f) => f.manda && f.manda < hoy);
    return { meses, atrasadas };
  }, [filas, hoy]);

  async function programar(f, fecha) {
    if (!f.proyecto) return;
    setGuardando(f.key);
    try { await updateRow('proyectos_cliente', f.proyecto.id, { fecha_auditoria_externa: fecha || null }); await cargar(); }
    catch { /* la ficha del proyecto enseña el error completo */ }
    finally { setGuardando(null); }
  }

  function exportarCsv() {
    const cab = ['Cliente', 'Norma', 'Entidad', 'Nº certificado', 'Certificación', 'Validez', 'Próxima estimada', 'Tipo', 'Programada', 'Días', 'Estado'];
    const lineas = visibles.map((f) => [f.nombre, NORMA_BY_ID[f.norma]?.nombre || f.norma, f.entidad, f.cert?.numero || '', f.cert?.fecha_certificacion || '', f.validez || '', f.prox.fecha || '', TIPO[f.prox.tipo] || '', f.programada || '', f.dias ?? '', TONO[f.color].etq]);
    const csv = [cab, ...lineas].map((l) => l.map((v) => `"${S(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `auditorias-externas-${hoy}.csv`;
    a.click();
  }

  if (!d) return <p className="text-[12.5px] text-[#7FA7B4]">Cargando auditorías…</p>;

  const nombreNorma = (id) => NORMA_BY_ID[id]?.nombre || id;
  const enlaceCliente = (f) => (f.empresaId ? `/consultores/empresas?e=${f.empresaId}` : '/consultores/empresas?filtro=cliente');

  return (
    <div className="space-y-4">
      {d.certs === null && (
        <p className="rounded-xl border border-dashed border-amber-300/50 bg-amber-400/10 px-3 py-2 text-[12.5px] text-amber-100">
          Falta aplicar la migración v118 en la base de datos: sin la tabla de certificados solo se ven las fechas programadas en los proyectos.
        </p>
      )}

      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-extrabold text-[#EAF4F7]">Planificación de auditorías externas</h2>
            <p className="mt-1 text-[11.5px] text-[#7FA7B4]">
              Cada certificado pasa auditoría externa cada año: seguimiento en los aniversarios de la certificación y renovación al vencer la validez.
              Ámbar a {DIAS_AMBAR} días, rojo a {DIAS_ROJO} o pasada. La fecha programada se guarda en el proyecto.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
            {n('rojo') > 0 && <span className={`chip border !px-2 !py-0.5 ${TONO.rojo.chip}`}>{n('rojo')} a menos de {DIAS_ROJO} días</span>}
            {n('ambar') > 0 && <span className={`chip border !px-2 !py-0.5 ${TONO.ambar.chip}`}>{n('ambar')} a menos de 3 meses</span>}
            {n('verde') > 0 && <span className={`chip border !px-2 !py-0.5 ${TONO.verde.chip}`}>{n('verde')} en plazo</span>}
            {nSinProg > 0 && <span className={`chip border !px-2 !py-0.5 ${TONO.gris.chip}`}>{nSinProg} sin programar</span>}
            {nSinCert > 0 && <span className={`chip border !px-2 !py-0.5 ${TONO.gris.chip}`}>{nSinCert} sin certificado</span>}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-[#0D3242] p-0.5 text-[11.5px] font-bold">
            {[['todas', `Todas (${filas.length})`], ['avisos', `Avisos (${n('rojo') + n('ambar')})`], ['sin', `Sin programar (${nSinProg + nSinCert})`]].map(([k, etq]) => (
              <button key={k} onClick={() => setFiltro(k)}
                className={`rounded-md px-2.5 py-1 transition ${filtro === k ? 'bg-brand-orange text-[#0B2A38]' : 'text-[#9FC0CB] hover:text-[#EAF4F7]'}`}>{etq}</button>
            ))}
          </div>
          <input className="input !w-[220px] !py-1 !text-[12px]" placeholder="Buscar cliente, norma, entidad…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button onClick={exportarCsv} className="btn-ghost ml-auto !px-3 !py-1 text-[12px]">↓ CSV</button>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[960px] text-[12.5px]">
            <thead>
              <tr className="text-left text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">
                <th className="py-1.5 pr-2 w-4"></th>
                <th className="py-1.5 pr-2">Cliente</th>
                <th className="py-1.5 pr-2">Norma</th>
                <th className="py-1.5 pr-2">Entidad</th>
                <th className="py-1.5 pr-2">Validez</th>
                <th className="py-1.5 pr-2">Auditoría estimada</th>
                <th className="py-1.5 pr-2">Programada</th>
                <th className="py-1.5">Aviso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#153F52]">
              {visibles.map((f) => {
                const T = TONO[f.color];
                const tono = f.color === 'rojo' ? 'text-red-200' : f.color === 'ambar' ? 'text-amber-100' : f.color === 'verde' ? 'text-emerald-200' : 'text-[#9FC0CB]';
                return (
                  <tr key={f.key} className="align-top">
                    <td className="py-2 pr-2"><span className="mt-1 block h-2.5 w-2.5 rounded-full" style={{ background: T.punto }} title={T.etq} /></td>
                    <td className="py-2 pr-2">
                      <Link to={enlaceCliente(f)} className="font-extrabold text-[#EAF4F7] hover:text-brand-orange hover:underline">{f.nombre}</Link>
                      {f.proyecto && (
                        <Link to={`/consultores/proyectos/${f.proyecto.id}`} className="block truncate text-[10.5px] text-[#7FA7B4] hover:text-brand-orange" title={f.proyecto.nombre}>
                          {f.proyecto.codigo || f.proyecto.nombre}
                        </Link>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-[#CFE3E9]">
                      {nombreNorma(f.norma)}
                      {f.cert?.numero && <span className="block text-[10.5px] text-[#7FA7B4]">nº {f.cert.numero}</span>}
                    </td>
                    <td className="py-2 pr-2 text-[#CFE3E9]">{f.entidad}</td>
                    <td className="py-2 pr-2 text-[#CFE3E9]">
                      {f.validez ? fmt(f.validez) : <span className="text-[#7FA7B4]">—</span>}
                      {f.cert?.fecha_certificacion && <span className="block text-[10.5px] text-[#7FA7B4]">cert. {fmt(f.cert.fecha_certificacion)}</span>}
                    </td>
                    <td className="py-2 pr-2">
                      {f.sinCertificado ? (
                        <Link to={enlaceCliente(f)} className="text-[#9FC0CB] hover:text-brand-orange hover:underline">Sin certificado registrado · añadirlo en la ficha</Link>
                      ) : f.prox.fecha ? (
                        <>
                          <span className={`font-bold ${f.prox.tipo === 'caducado' ? 'text-red-200' : 'text-[#EAF4F7]'}`}>{TIPO[f.prox.tipo]} · {fmt(f.prox.fecha)}</span>
                          {!f.programada && f.dias != null && (
                            <span className={`block text-[10.5px] ${tono}`}>{f.dias < 0 ? `${-f.dias} días de retraso` : `en ${f.dias} día${f.dias === 1 ? '' : 's'}`}</span>
                          )}
                        </>
                      ) : <span className="text-[#7FA7B4]">Sin fechas en el certificado</span>}
                    </td>
                    <td className="py-2 pr-2">
                      {puedeEditar && f.proyecto ? (
                        <input type="date" className="input !w-[150px] !px-2 !py-1 !text-[11.5px]"
                          value={f.programada || ''} disabled={guardando === f.key}
                          title="Fecha de la auditoría externa programada (se guarda en el proyecto)"
                          onChange={(e) => programar(f, e.target.value)} />
                      ) : f.programada ? <span className="text-[#EAF4F7]">{fmt(f.programada)}</span>
                        : <span className="text-[#7FA7B4]" title={f.proyecto ? '' : 'Sin proyecto vivo donde programarla'}>Sin programar</span>}
                      {f.programada && f.dias != null && (
                        <span className={`block text-[10.5px] ${tono}`}>{f.dias < 0 ? `pasada hace ${-f.dias} días` : `en ${f.dias} día${f.dias === 1 ? '' : 's'}`}</span>
                      )}
                    </td>
                    <td className="py-2">
                      <span className={`chip border !px-2 !py-0.5 text-[10.5px] font-extrabold ${T.chip}`}>
                        {f.sinCertificado && !f.programada ? 'Sin certificado' : !f.programada && f.prox.tipo !== 'caducado' ? `Sin programar · ${T.etq.toLowerCase()}` : T.etq}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!visibles.length && <tr><td colSpan={8} className="py-4 text-center text-[#7FA7B4]">{filas.length ? 'Nada con ese filtro.' : 'Sin certificados ni proyectos vivos.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="text-[14px] font-extrabold text-[#EAF4F7]">Calendario · próximos doce meses</h3>
        <p className="mt-1 text-[11.5px] text-[#7FA7B4]">Cada auditoría en el mes que manda: la programada si la hay, la estimada si no. Para ver dónde se amontonan y repartir el año.</p>
        {calendario.atrasadas.length > 0 && (
          <div className="mt-3 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-[12px]">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-red-200">Pasadas sin resolver · {calendario.atrasadas.length}</p>
            <ul className="mt-1 space-y-0.5">
              {calendario.atrasadas.map((f) => <li key={f.key} className="text-red-100">{f.nombre} · {nombreNorma(f.norma)} · {fmt(f.manda)}</li>)}
            </ul>
          </div>
        )}
        <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {calendario.meses.map((m) => (
            <div key={m.clave} className={`rounded-xl border px-2.5 py-2 ${m.filas.length ? 'border-[#1E5468] bg-[#0D3242]' : 'border-[#153F52] bg-transparent'}`}>
              <p className="flex items-baseline justify-between text-[10.5px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">
                <span>{m.etq}</span>{m.filas.length > 0 && <span className="text-[#EAF4F7]">{m.filas.length}</span>}
              </p>
              <ul className="mt-1 space-y-1">
                {m.filas.map((f) => (
                  <li key={f.key} className="flex items-start gap-1.5 text-[11px] leading-tight">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: TONO[f.color].punto }} />
                    <span className="min-w-0">
                      <span className="block truncate font-bold text-[#EAF4F7]" title={f.nombre}>{f.nombre}</span>
                      <span className="block text-[#9FC0CB]">{f.norma} · {fmt(f.manda).slice(0, 6)}{f.programada ? '' : ' · est.'}</span>
                    </span>
                  </li>
                ))}
                {!m.filas.length && <li className="text-[10.5px] text-[#3F6B7C]">—</li>}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
